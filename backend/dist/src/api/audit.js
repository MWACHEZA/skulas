"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/audit
 * @desc    Get system audit logs for the current school
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const logs = await prisma_1.default.auditLog.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                actor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 logs for performance
        });
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map