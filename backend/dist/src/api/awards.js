"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
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
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'TEACHER', 'ANCILLARY'), async (req, res) => {
    try {
        const { userId, awardName, gift, amount, date } = req.body;
        if (!userId || !awardName || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const award = await prisma_1.default.award.create({
            data: {
                schoolId: req.user.schoolId,
                userId,
                awardName,
                gift: gift || '',
                amount: amount || 0,
                date: new Date(date)
            }
        });
        res.json(award);
    }
    catch (error) {
        console.error('Error creating award:', error);
        res.status(500).json({ error: 'Failed to create award' });
    }
});
exports.default = router;
//# sourceMappingURL=awards.js.map