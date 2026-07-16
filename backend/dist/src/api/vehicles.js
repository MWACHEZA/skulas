import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
// GET all vehicles for user's school
router.get('/', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const vehicles = await prisma.schoolVehicle.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(vehicles);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});
// POST create a vehicle
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, number, model, quantity, yearMade, driverName, driverLicense, driverContact, status, description } = req.body;
        const vehicle = await prisma.schoolVehicle.create({
            data: {
                schoolId,
                name,
                number,
                model,
                quantity: quantity ? parseInt(quantity) : 1,
                yearMade,
                driverName,
                driverLicense,
                driverContact,
                status: status || 'Available',
                description
            }
        });
        // Automatically register as general school asset
        try {
            await prisma.asset.create({
                data: {
                    schoolId,
                    name: `${name} (${number})`,
                    category: 'vehicles',
                    serialNumber: number,
                    condition: 'good',
                    purchaseDate: new Date()
                }
            });
        }
        catch (assetError) {
            console.error('Failed to auto-register vehicle as asset:', assetError);
        }
        res.status(201).json(vehicle);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create vehicle' });
    }
});
// PUT update a vehicle
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const { name, number, model, quantity, yearMade, driverName, driverLicense, driverContact, status, description } = req.body;
        const vehicle = await prisma.schoolVehicle.update({
            where: { id: id, schoolId },
            data: {
                name,
                number,
                model,
                quantity: quantity ? parseInt(quantity) : undefined,
                yearMade,
                driverName,
                driverLicense,
                driverContact,
                status,
                description
            }
        });
        res.json(vehicle);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update vehicle' });
    }
});
// DELETE a vehicle
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        await prisma.schoolVehicle.delete({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete vehicle' });
    }
});
export default router;
//# sourceMappingURL=vehicles.js.map