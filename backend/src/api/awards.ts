import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';

const router = Router();

// Get the logged in user's awards
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const awards = await prisma.award.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        userId: req.user!.id
      },
      orderBy: { date: 'desc' }
    });
    res.json(awards);
  } catch (error) {
    console.error('Error fetching awards:', error);
    res.status(500).json({ error: 'Failed to fetch awards' });
  }
});

// Admin/Teacher/Ancillary endpoint to give an award
// FIX: Post an expense journal entry when a monetary award (amount > 0) is issued:
//   DR  7900 Miscellaneous Expense   [amount]  (awards/recognition cost)
//   CR  1100 Cash on Hand            [amount]  (cash disbursed)
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER', 'ANCILLARY'), async (req: AuthRequest, res) => {
  try {
    const { userId, awardName, gift, amount, date } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!userId || !awardName || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const awardAmount = parseFloat(amount) || 0;

    const award = await prisma.award.create({
      data: {
        schoolId,
        userId,
        awardName,
        gift: gift || '',
        amount: awardAmount,
        date: new Date(date)
      }
    });

    // Post expense journal entry only when a cash award amount is specified
    if (awardAmount > 0) {
      try {
        const [expenseId, cashId] = await Promise.all([
          getAccountId(schoolId, '7900', prisma),  // Miscellaneous Expense
          getAccountId(schoolId, '1100', prisma)   // Cash on Hand
        ]);

        await LedgerService.postEntry({
          schoolId,
          date: new Date(date),
          description: `Award: ${awardName} — ${gift || 'Cash'} to user ${userId}`,
          sourceType: 'award_expense',
          sourceId: award.id,
          createdByUserId: req.user!.id,
          lines: [
            {
              accountId: expenseId,
              debit: awardAmount,
              description: `Award expense: ${awardName}`
            },
            {
              accountId: cashId,
              credit: awardAmount,
              description: `Cash disbursed for award: ${awardName}`
            }
          ]
        });
      } catch (ledgerErr) {
        console.error('[Ledger] Award expense JE failed:', ledgerErr);
        // Award record is saved. Admin can post a correcting manual JE via Accounts module.
      }
    }

    res.json(award);
  } catch (error) {
    console.error('Error creating award:', error);
    res.status(500).json({ error: 'Failed to create award' });
  }
});

export default router;
