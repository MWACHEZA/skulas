"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
// GET all vehicles for user's school
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const vehicles = await prisma_1.default.schoolVehicle.findMany({
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
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, number, model, quantity, yearMade, driverName, driverLicense, driverContact, status, description } = req.body;
        const vehicle = await prisma_1.default.schoolVehicle.create({
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
            await prisma_1.default.asset.create({
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
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const { name, number, model, quantity, yearMade, driverName, driverLicense, driverContact, status, description } = req.body;
        const vehicle = await prisma_1.default.schoolVehicle.update({
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
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        await prisma_1.default.schoolVehicle.delete({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete vehicle' });
    }
});
exports.default = router;
//# sourceMappingURL=vehicles.js.map