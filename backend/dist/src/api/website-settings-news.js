import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const news = await prisma.news.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { publishedAt: 'desc' }
        });
        res.json(news);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { title, content, publishedAt, image, category } = req.body;
        const news = await prisma.news.create({
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
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, publishedAt, image, category } = req.body;
        const updated = await prisma.news.update({
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
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma.news.delete({
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
export default router;
//# sourceMappingURL=website-settings-news.js.map