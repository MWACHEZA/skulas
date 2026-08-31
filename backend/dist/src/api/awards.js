"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const router = (0, express_1.Router)();
// Get the logged in user's awards
router.get('/my', auth_1.requireAuth, async (req, res) => {
    try {
        const awards = await prisma_1.default.award.findMany({
            where: {
                schoolId: req.user.schoolId,
                userId: req.user.id
            },
            orderBy: { date: 'desc' }
        });
        res.json(awards);
    }
    catch (error) {
        console.error('Error fetching awards:', error);
        res.status(500).json({ error: 'Failed to fetch awards' });
    }
});
// Admin/Teacher/Ancillary endpoint to give an award
// FIX: Post an expense journal entry when a monetary award (amount > 0) is issued:
//   DR  7900 Miscellaneous Expense   [amount]  (awards/recognition cost)
//   CR  1100 Cash on Hand            [amount]  (cash disbursed)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'TEACHER', 'ANCILLARY'), async (req, res) => {
    try {
        const { userId, awardName, gift, amount, date } = req.body;
        const schoolId = req.user.schoolId;
        if (!userId || !awardName || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const awardAmount = parseFloat(amount) || 0;
        const award = await prisma_1.default.award.create({
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
                    (0, coa_seeder_1.getAccountId)(schoolId, '7900', prisma_1.default), // Miscellaneous Expense
                    (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default) // Cash on Hand
                ]);
                await ledger_service_1.LedgerService.postEntry({
                    schoolId,
                    date: new Date(date),
                    description: `Award: ${awardName} — ${gift || 'Cash'} to user ${userId}`,
                    sourceType: 'award_expense',
                    sourceId: award.id,
                    createdByUserId: req.user.id,
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
            }
            catch (ledgerErr) {
                console.error('[Ledger] Award expense JE failed:', ledgerErr);
                // Award record is saved. Admin can post a correcting manual JE via Accounts module.
            }
        }
        res.json(award);
    }
    catch (error) {
        console.error('Error creating award:', error);
        res.status(500).json({ error: 'Failed to create award' });
    }
});
exports.default = router;
//# sourceMappingURL=awards.js.map