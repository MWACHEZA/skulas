import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { LedgerEvents } from '../services/ledger-events';

const router = Router();

router.use(requireAuth);

/**
 * @route   GET /api/wallets/:studentId
 * @desc    Get wallet balance and transactions for a student
 *          Balance is computed on-the-fly: SUM(WalletTransaction.amount)
 *          DEPOSIT = positive, PURCHASE = negative
 */
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Upsert wallet record (no balance field any more)
    const wallet = await prisma.studentWallet.upsert({
      where: { studentId },
      update: {},
      create: { studentId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    // Compute balance from transaction history
    const balance = await LedgerService.getWalletBalance(studentId);

    res.json({ ...wallet, balance });
  } catch (error) {
    console.error('Fetch wallet error:', error);
    res.status(500).json({
      error:
        "We're having trouble securely loading your current fee balance right now. Please refresh the page, or contact the Bursar's office if this continues."
    });
  }
});

/**
 * @route   POST /api/wallets/fund
 * @desc    Fund a student wallet (Parent Portal)
 *          Posts: DR Cash on Hand / CR Student Deposits (Liability)
 */
router.post('/fund', async (req: AuthRequest, res) => {
  try {
    const { studentId, amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const school = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true }
    });

    if (!school?.schoolId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const schoolId = school.schoolId;

    const updatedWallet = await prisma.$transaction(async tx => {
      // Upsert wallet (no balance field)
      const wallet = await tx.studentWallet.upsert({
        where: { studentId },
        update: {},
        create: { studentId }
      });

      // Record the wallet transaction with POSITIVE amount (DEPOSIT)
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amount,  // positive = deposit
          type: 'DEPOSIT',
          description: `Deposit via ${paymentMethod || 'Online'}`
        }
      });

      return wallet;
    });

    // Post ledger entry AFTER the transaction commits:
    //   DR 1100 Cash on Hand         [amount]
    //   CR 3200 Student Deposits     [amount]
    try {
      const [cashId, depositsId] = await Promise.all([
        getAccountId(schoolId, '1100', prisma),
        getAccountId(schoolId, '3200', prisma)
      ]);
      await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Wallet deposit — student ${studentId} via ${paymentMethod || 'Online'}`,
        sourceType: 'wallet_deposit',
        sourceId: updatedWallet.id,
        createdByUserId: req.user?.id,
        lines: [
          { accountId: cashId, debit: amount, description: `Payment via ${paymentMethod || 'Online'}`, studentId },
          { accountId: depositsId, credit: amount, description: 'Student wallet deposit liability', studentId }
        ]
      });

      LedgerEvents.broadcast({
        type: 'WALLET_UPDATED',
        schoolId,
        studentId,
        sourceType: 'wallet_deposit',
        sourceId: updatedWallet.id,
        timestamp: new Date().toISOString()
      });
    } catch (ledgerErr) {
      console.error('[Ledger] Wallet deposit JE failed:', ledgerErr);
    }

    const balance = await LedgerService.getWalletBalance(studentId);
    res.json({ ...updatedWallet, balance });
  } catch (error) {
    console.error('Fund wallet error:', error);
    res.status(500).json({ error: 'Failed to fund wallet' });
  }
});

/**
 * @route   POST /api/wallets/spend
 * @desc    Use wallet balance to pay a fee or make a tuckshop purchase
 *          Posts: DR Student Deposits (reduce liability) / CR Student AR (reduce receivable)
 */
router.post('/spend', async (req: AuthRequest, res) => {
  try {
    const { studentId, amount, referenceId, referenceType, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    // Check balance before spending
    const balance = await LedgerService.getWalletBalance(studentId);
    if (balance < amount) {
      return res.status(400).json({
        error: `Insufficient wallet balance. Available: ${balance.toFixed(2)}, Required: ${Number(amount).toFixed(2)}`
      });
    }

    const school = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true }
    });
    if (!school?.schoolId) return res.status(404).json({ error: 'Student not found' });
    const schoolId = school.schoolId;

    await prisma.$transaction(async tx => {
      const wallet = await tx.studentWallet.findUniqueOrThrow({ where: { studentId } });

      // Record wallet transaction with NEGATIVE amount (PURCHASE)
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount, // negative = spend
          type: 'PURCHASE',
          description: description || 'Wallet payment',
          referenceId,
          referenceType
        }
      });
    });

    // Post ledger entry after commit:
    //   DR 3200 Student Deposits  (reduce liability — deposit used)
    //   CR 1210 Student AR        (reduce receivable — payment applied)
    try {
      const [depositsId, arId] = await Promise.all([
        getAccountId(schoolId, '3200', prisma),
        getAccountId(schoolId, '1210', prisma)
      ]);
      await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: description || `Wallet payment — ${referenceType || 'purchase'}`,
        sourceType: 'wallet_spend',
        sourceId: referenceId || studentId,
        createdByUserId: req.user?.id,
        lines: [
          { accountId: depositsId, debit: amount, description: 'Use wallet deposit', studentId },
          { accountId: arId, credit: amount, description: 'Reduce student AR', studentId }
        ]
      });

      LedgerEvents.broadcast({
        type: 'WALLET_UPDATED',
        schoolId,
        studentId,
        sourceType: 'wallet_spend',
        sourceId: referenceId || studentId,
        timestamp: new Date().toISOString()
      });
    } catch (ledgerErr) {
      console.error('[Ledger] Wallet spend JE failed:', ledgerErr);
    }

    const newBalance = await LedgerService.getWalletBalance(studentId);
    res.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Wallet spend error:', error);
    res.status(500).json({ error: 'Failed to process wallet payment' });
  }
});

export default router;
