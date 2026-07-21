"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const news = await prisma_1.default.news.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { publishedAt: 'desc' }
        });
        res.json(news);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { title, content, publishedAt, image, category } = req.body;
        const news = await prisma_1.default.news.create({
            data: {
                title,
                content,
                image,
                category: category || null,
                author: req.user.name || 'Admin',
                publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
                schoolId: req.user.schoolId
            }
        });
        res.json(news);
    }
    catch (error) {
        console.error('Failed to create news:', error);
        res.status(500).json({ error: 'Failed to create news' });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, publishedAt, image, category } = req.body;
        const updated = await prisma_1.default.news.update({
            where: {
                id: id,
                schoolId: req.user.schoolId
            },
            data: {
                title,
                content,
                image,
                category: category || null,
                publishedAt: publishedAt ? new Date(publishedAt) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update news:', error);
        res.status(500).json({ error: 'Failed to update news' });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.news.delete({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete news' });
    }
});
exports.default = router;
//# sourceMappingURL=website-settings-news.js.map