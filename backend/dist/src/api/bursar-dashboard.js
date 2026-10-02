"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/metrics', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // 1. Calculate Expected (Total Fees Assessed)
        const fees = await prisma_1.default.fee.aggregate({
            where: { schoolId },
            _sum: { amount: true, paid: true }
        });
        const expected = fees._sum.amount || 0;
        const collected = fees._sum.paid || 0;
        const outstanding = expected - collected;
        // 2. Wallet metrics
        const walletTransactions = await prisma_1.default.walletTransaction.aggregate({
            where: {
                wallet: { student: { schoolId } },
                type: 'DEPOSIT'
            },
            _sum: { amount: true }
        });
        const walletDeposits = walletTransactions._sum.amount || 0;
        // 3. Journal Entry metrics (Recent revenue)
        const recentJournals = await prisma_1.default.journalEntry.findMany({
            where: { schoolId }, // Filter to all journals since it's the financial log
            orderBy: { date: 'desc' },
            take: 10,
            select: {
                id: true,
                entryNumber: true,
                date: true,
                description: true,
                sourceType: true,
                status: true,
                lines: {
                    select: {
                        id: true,
                        debit: true,
                        credit: true,
                        account: { select: { name: true, type: true } }
                    }
                }
            }
        });
        res.json({
            metrics: {
                expected,
                collected,
                outstanding,
                walletDeposits
            },
            recentTransactions: recentJournals
        });
    }
    catch (error) {
        console.error('Error fetching bursar metrics:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
});
// Enforce boundary: explicit endpoints only for bursar actions
// Avoid discipline/marks
exports.default = router;
//# sourceMappingURL=bursar-dashboard.js.map