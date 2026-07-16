import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const galleries = await prisma.gallery.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(galleries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch galleries' });
    }
});
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { title, content, createdAt, coverImage, category } = req.body;
        const gallery = await prisma.gallery.create({
            data: {
                title,
                content,
                coverImage,
                category: category || null,
                createdAt: createdAt ? new Date(createdAt) : new Date(),
                schoolId: req.user.schoolId
            }
        });
        res.json(gallery);
    }
    catch (error) {
        console.error('Failed to create gallery:', error);
        res.status(500).json({ error: 'Failed to create gallery' });
    }
});
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, createdAt, coverImage, category } = req.body;
        const updated = await prisma.gallery.update({
            where: {
                id: id,
                schoolId: req.user.schoolId
            },
            data: {
                title,
                content,
                coverImage,
                category: category || null,
                createdAt: createdAt ? new Date(createdAt) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update gallery:', error);
        res.status(500).json({ error: 'Failed to update gallery' });
    }
});
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma.gallery.delete({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete gallery' });
    }
});
export default router;
//# sourceMappingURL=website-settings-galleries.js.map