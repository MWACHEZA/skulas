"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const routes = await prisma_1.default.transportRoute.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(routes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transport routes' });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, description } = req.body;
        const route = await prisma_1.default.transportRoute.create({
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
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        await prisma_1.default.transportRoute.delete({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete transport route' });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const { name, description } = req.body;
        const route = await prisma_1.default.transportRoute.update({
            where: { id: id, schoolId },
            data: { name, description }
        });
        res.json(route);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update transport route' });
    }
});
exports.default = router;
//# sourceMappingURL=transport-routes.js.map