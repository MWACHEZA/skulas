import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
// GET all transports for user's school including route and vehicle relations
router.get('/', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const transports = await prisma.schoolTransport.findMany({
            where: { schoolId },
            include: {
                route: true,
                vehicle: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(transports);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transports' });
    }
});
// POST assign a vehicle to a route (create transport)
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, routeId, vehicleId, routeFare, description } = req.body;
        const transport = await prisma.schoolTransport.create({
            data: {
                schoolId,
                name,
                routeId,
                vehicleId,
                routeFare: routeFare ? parseFloat(routeFare) : 0,
                description
            },
            include: {
                route: true,
                vehicle: true
            }
        });
        res.status(201).json(transport);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create transport assignment' });
    }
});
// PUT update transport assignment
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const { name, routeId, vehicleId, routeFare, description } = req.body;
        const transport = await prisma.schoolTransport.update({
            where: { id: id, schoolId },
            data: {
                name,
                routeId,
                vehicleId,
                routeFare: routeFare ? parseFloat(routeFare) : undefined,
                description
            },
            include: {
                route: true,
                vehicle: true
            }
        });
        res.json(transport);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update transport assignment' });
    }
});
// DELETE transport assignment
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        await prisma.schoolTransport.delete({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete transport assignment' });
    }
});
export default router;
//# sourceMappingURL=transports.js.map