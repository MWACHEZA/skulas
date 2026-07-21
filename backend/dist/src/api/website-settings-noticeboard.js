"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'STUDENT', 'TEACHER', 'PARENT'), async (req, res) => {
    try {
        const noticeboards = await prisma_1.default.noticeboard.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(noticeboards);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch noticeboard' });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { title, content, date } = req.body;
        const noticeboard = await prisma_1.default.noticeboard.create({
            data: {
                title,
                content,
                date: new Date(date),
                schoolId: req.user.schoolId
            }
        });
        res.json(noticeboard);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create noticeboard event' });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.noticeboard.delete({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete noticeboard event' });
    }
});
exports.default = router;
//# sourceMappingURL=website-settings-noticeboard.js.map