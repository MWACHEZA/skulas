"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
// GET all transports for user's school including route and vehicle relations
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const transports = await prisma_1.default.schoolTransport.findMany({
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
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, routeId, vehicleId, routeFare, description } = req.body;
        const transport = await prisma_1.default.schoolTransport.create({
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
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const { name, routeId, vehicleId, routeFare, description } = req.body;
        const transport = await prisma_1.default.schoolTransport.update({
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
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        await prisma_1.default.schoolTransport.delete({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete transport assignment' });
    }
});
exports.default = router;
//# sourceMappingURL=transports.js.map