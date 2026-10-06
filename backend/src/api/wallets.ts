import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { LedgerEvents } from '../services/ledger-events';

const router = Router();

router.use(requireAuth);

/**
 * @route   GET /api/wallets
 * @desc    Get all student wallets with balances for the school
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing school context' });

    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        user: { select: { name: true, email: true } },
        wallet: true
      },
      take: 200
    });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { settings: true }
    });
    const schoolSettings = (school?.settings as any) || {};

    const walletList = await Promise.all(students.map(async s => {
      let balance = 0;
      if (s.wallet) {
        balance = await LedgerService.getWalletBalance(s.id);
      }
      const dailyLimit = schoolSettings.dailyWalletLimits?.[s.id] ?? null;
      return {
        id: s.wallet?.id || s.id,
        walletId: s.wallet?.id,
        studentId: s.id,
        studentCode: s.studentId,
        studentName: s.user?.name || s.name || 'Student',
        student: {
          id: s.id,
          studentId: s.studentId,
          name: s.user?.name || s.name,
          user: { name: s.user?.name || s.name }
        },
        balance,
        dailyLimit,
        status: s.status || 'Active'
      };
    }));

    res.json(walletList);
  } catch (error) {
    console.error('Fetch all wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

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

    // Compute this week's spend total (purchases since Monday)
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const weekPurchases = wallet.transactions.filter(
      t => t.type === 'PURCHASE' && new Date(t.createdAt) >= monday
    );
    const weekSpendTotal = Math.round(
      weekPurchases.reduce((sum, t) => sum + Math.abs(t.amount), 0) * 100
    ) / 100;

    // Get daily limit from school settings
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { school: { select: { settings: true } } }
    });
    const schoolSettings = (student?.school?.settings as any) || {};
    const dailyLimit = schoolSettings.dailyWalletLimits?.[studentId] ?? 5.00;

    res.json({
      ...wallet,
      balance,
      dailyLimit,
      weekSpendTotal,
      isLowBalance: balance < 5.00
    });
  } catch (error) {
    console.error('Fetch wallet error:', error);
    res.status(500).json({
      error:
        "We're having trouble securely loading your current fee balance right now. Please refresh the page, or contact the Bursar's office if this continues."
    });
  }
});

/**
 * @route   POST /api/wallets/daily-limit
 * @desc    Set daily wallet spend limit (Parent Portal)
 */
router.post('/daily-limit', async (req: AuthRequest, res) => {
  try {
    const { studentId, dailyLimit } = req.body;
    const limitNum = parseFloat(dailyLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      return res.status(400).json({ error: 'Please enter a valid daily limit (0 or higher)' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true }
    });
    if (!student?.schoolId) return res.status(404).json({ error: 'Student not found' });

    // Authorization guard
    if (req.user?.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
      if (!parent) return res.status(403).json({ error: 'Parent record not found' });
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId, status: 'APPROVED' }
      });
      if (!link) return res.status(403).json({ error: 'Not authorized for this student' });
    }

    const school = await prisma.school.findUnique({
      where: { id: student.schoolId },
      select: { settings: true }
    });
    const settings = (school?.settings as any) || {};
    if (!settings.dailyWalletLimits) {
      settings.dailyWalletLimits = {};
    }
    settings.dailyWalletLimits[studentId] = limitNum;

    await prisma.school.update({
      where: { id: student.schoolId },
      data: { settings }
    });

    res.json({ success: true, dailyLimit: limitNum });
  } catch (error) {
    console.error('Set daily limit error:', error);
    res.status(500).json({ error: 'Failed to update daily limit' });
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
    //   DR Cash/Bank/EcoCash (1020/1010/1022) [amount]
    //   CR 2110 Student Pocket Money / Digital Wallets (Liability) [amount]
    try {
      const debitCode = (() => {
        const pm = (paymentMethod || '').toUpperCase();
        if (pm === 'CASH') return '1020'; // Cash Office Vault
        if (pm === 'ECOCASH' || pm === 'MOBILE' || pm === 'ONEMONEY') return '1022'; // Mobile Money Float
        return '1010'; // Bank Account — Main Operations (Card / Transfer / Online)
      })();

      await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode,
        creditCode: '2110', // Student Pocket Money / Digital Wallets
        amount: Math.round(amount * 100) / 100,
        description: `Wallet deposit — student ${studentId} via ${paymentMethod || 'Online'}`,
        sourceModule: 'wallet_deposit',
        reference: updatedWallet.id,
        studentId,
        userId: req.user?.id,
        ipAddress: req.ip,
        bypassApprovalCheck: true
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
    //   DR 2110 Student Pocket Money / Digital Wallets (reduce liability)
    //   CR 1100 Student Debtors Control (AR) (reduce receivable)
    try {
      await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode: '2110', // Student Pocket Money / Digital Wallets
        creditCode: '1100', // Student Debtors Control (AR)
        amount: Math.round(amount * 100) / 100,
        description: description || `Wallet payment — ${referenceType || 'purchase'}`,
        sourceModule: 'wallet_spend',
        reference: referenceId || studentId,
        studentId,
        userId: req.user?.id,
        ipAddress: req.ip,
        bypassApprovalCheck: true
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

/**
 * @route   POST /api/wallets/:id/topup
 * @desc    Top-up a student wallet from Cash Desk or Admin
 */
router.post('/:id/topup', async (req: AuthRequest, res) => {
  try {
    const targetId = req.params.id as string;
    const { amount, channel } = req.body;
    const topupAmount = parseFloat(amount);
    if (isNaN(topupAmount) || topupAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    // Try finding wallet by id or studentId
    let wallet = await prisma.studentWallet.findFirst({
      where: { OR: [{ id: targetId }, { studentId: targetId }] },
      include: { student: true }
    });

    let studentId = wallet?.studentId;
    if (!wallet) {
      const student = await prisma.student.findUnique({ where: { id: targetId } });
      if (!student) return res.status(404).json({ error: 'Student or wallet not found' });
      studentId = student.id;
      wallet = await prisma.studentWallet.create({
        data: { studentId },
        include: { student: true }
      });
    }

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true }
    });
    const schoolId = student?.schoolId || req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing school context' });

    // Record DEPOSIT transaction
    const tx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: topupAmount,
        type: 'DEPOSIT',
        description: `Top-up via ${channel || 'CASH_DESK'}`
      }
    });

    // Post double-entry to Ledger
    try {
      await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode: channel === 'CASH_DESK' ? '1020' : '1010',
        creditCode: '2110',
        amount: Math.round(topupAmount * 100) / 100,
        description: `Cash desk wallet topup — student ${studentId}`,
        sourceModule: 'wallet_deposit',
        reference: tx.id,
        studentId,
        userId: req.user?.id,
        ipAddress: req.ip,
        bypassApprovalCheck: true
      });
    } catch (e) {
      console.warn('Ledger posting warning on topup:', e);
    }

    const newBalance = await LedgerService.getWalletBalance(studentId!);
    res.json({ success: true, balance: newBalance, transaction: tx });
  } catch (error) {
    console.error('Wallet topup error:', error);
    res.status(500).json({ error: 'Failed to process wallet top-up' });
  }
});

export default router;

