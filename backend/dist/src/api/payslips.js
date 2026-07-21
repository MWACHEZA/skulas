"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get the logged in user's payslips (salary stubs)
router.get('/my', auth_1.requireAuth, async (req, res) => {
    try {
        const payslips = await prisma_1.default.salaryStub.findMany({
            where: {
                schoolId: req.user.schoolId,
                userId: req.user.id
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        });
        // We append the month name dynamically for convenience
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mapped = payslips.map(ps => ({
            ...ps,
            period: `${monthNames[ps.month - 1]} ${ps.year}`
        }));
        res.json(mapped);
    }
    catch (error) {
        console.error('Error fetching payslips:', error);
        res.status(500).json({ error: 'Failed to fetch payslips' });
    }
});
exports.default = router;
//# sourceMappingURL=payslips.js.map