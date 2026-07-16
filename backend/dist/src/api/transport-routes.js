import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
router.get('/', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const routes = await prisma.transportRoute.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(routes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transport routes' });
    }
});
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, description } = req.body;
        const route = await prisma.transportRoute.create({
            data: {
                schoolId,
                name,
                description
            }
        });
        res.status(201).json(route);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create transport route' });
    }
});
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        await prisma.transportRoute.delete({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete transport route' });
    }
});
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const { name, description } = req.body;
        const route = await prisma.transportRoute.update({
            where: { id: id, schoolId },
            data: { name, description }
        });
        res.json(route);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update transport route' });
    }
});
export default router;
//# sourceMappingURL=transport-routes.js.map