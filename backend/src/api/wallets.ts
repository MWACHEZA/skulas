import { Router } from 'express';
import { PrismaClient } from '../generated/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// Get wallet balance for a student (Parents, Students, Admins)
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Find or create wallet atomically
    let wallet = await prisma.studentWallet.upsert({
      where: { studentId },
      update: {},
      create: { studentId, balance: 0.0 },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    res.json(wallet);
  } catch (error) {
    console.error('Fetch wallet error:', error);
    res.status(500).json({ error: "We're having trouble securely loading your current fee balance right now. Please refresh the page, or contact the Bursar's office if this continues." });
  }
});

// Fund a wallet (Parent Portal)
router.post('/fund', async (req, res) => {
  try {
    const { studentId, amount, paymentMethod } = req.body;
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    // Process transaction within a transaction block
    const updatedWallet = await prisma.$transaction(async (tx) => {
      let wallet = await tx.studentWallet.upsert({
        where: { studentId },
        update: {},
        create: { studentId, balance: 0.0 }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amount,
          type: 'DEPOSIT',
          description: `Deposit via ${paymentMethod || 'Online'}`,
        }
      });

      return tx.studentWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 10 }
        }
      });
    });

    res.json(updatedWallet);
  } catch (error) {
    console.error('Fund wallet error:', error);
    res.status(500).json({ error: 'Failed to fund wallet' });
  }
});

export default router;
