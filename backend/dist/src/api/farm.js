"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
// All farm routes require authentication
router.use(auth_1.requireAuth);
/**
 * Helper to check if a user has permissions to modify farm data
 */
const canModifyFarm = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.secondaryRoles.includes('Agriculture Teacher') ||
        user.secondaryRoles.includes('Farm Assistant') ||
        user.secondaryRoles.includes('Farm Manager') ||
        user.secondaryRoles.includes('Farm Manager Assistant');
};
// ── LIVESTOCK MONITORS ──
/**
 * @route   GET /api/farm/livestock
 * @desc    Get livestock batches for the school
 */
router.get('/livestock', async (req, res) => {
    try {
        const batches = await prisma_1.default.farmLivestockBatch.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { datePlaced: 'desc' }
        });
        res.json(batches);
    }
    catch (error) {
        console.error('Fetch livestock error:', error);
        res.status(500).json({ error: 'Failed to fetch livestock batches' });
    }
});
/**
 * @route   POST /api/farm/livestock
 * @desc    Create a new livestock batch
 */
router.post('/livestock', async (req, res) => {
    if (!canModifyFarm(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to manage farm projects' });
    }
    const { batchName, type, datePlaced, currentCount, startCount, mortalityRate, status } = req.body;
    if (!batchName || !type || !datePlaced || currentCount === undefined || startCount === undefined) {
        return res.status(400).json({ error: 'Missing required livestock fields' });
    }
    try {
        const batch = await prisma_1.default.farmLivestockBatch.create({
            data: {
                batchName,
                type,
                datePlaced: new Date(datePlaced),
                currentCount: parseInt(currentCount),
                startCount: parseInt(startCount),
                mortalityRate: parseFloat(mortalityRate) || 0.0,
                status: status || 'Maturing',
                schoolId: req.user.schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_FARM_LIVESTOCK', 'FarmLivestockBatch', batch.id, { batchName });
        res.json(batch);
    }
    catch (error) {
        console.error('Create livestock error:', error);
        res.status(500).json({ error: 'Failed to create livestock batch' });
    }
});
// ── CROP CYCLE PLANNER ──
/**
 * @route   GET /api/farm/crops
 * @desc    Get crop cycles for the school
 */
router.get('/crops', async (req, res) => {
    try {
        const crops = await prisma_1.default.farmCropCycle.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { datePlanted: 'desc' }
        });
        res.json(crops);
    }
    catch (error) {
        console.error('Fetch crops error:', error);
        res.status(500).json({ error: 'Failed to fetch crop cycles' });
    }
});
/**
 * @route   POST /api/farm/crops
 * @desc    Create a new crop cycle
 */
router.post('/crops', async (req, res) => {
    if (!canModifyFarm(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to manage farm projects' });
    }
    const { name, type, sector, datePlanted, expectedHarvest, status } = req.body;
    if (!name || !type || !sector || !datePlanted || !expectedHarvest) {
        return res.status(400).json({ error: 'Missing required crop fields' });
    }
    try {
        const crop = await prisma_1.default.farmCropCycle.create({
            data: {
                name,
                type,
                sector,
                datePlanted: new Date(datePlanted),
                expectedHarvest: new Date(expectedHarvest),
                status: status || 'Growing',
                schoolId: req.user.schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_FARM_CROP', 'FarmCropCycle', crop.id, { name });
        res.json(crop);
    }
    catch (error) {
        console.error('Create crop error:', error);
        res.status(500).json({ error: 'Failed to create crop cycle' });
    }
});
// ── FARM INVENTORY ──
/**
 * @route   GET /api/farm/inventory
 * @desc    Get farm inventory items
 */
router.get('/inventory', async (req, res) => {
    try {
        const inventory = await prisma_1.default.farmInventoryItem.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(inventory);
    }
    catch (error) {
        console.error('Fetch farm inventory error:', error);
        res.status(500).json({ error: 'Failed to fetch farm inventory' });
    }
});
/**
 * @route   POST /api/farm/inventory
 * @desc    Add/Request farm inventory item
 */
router.post('/inventory', async (req, res) => {
    if (!canModifyFarm(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to manage farm inventory' });
    }
    const { name, category, quantity, condition } = req.body;
    if (!name || !category || !quantity) {
        return res.status(400).json({ error: 'Missing required inventory fields' });
    }
    try {
        const item = await prisma_1.default.farmInventoryItem.create({
            data: {
                name,
                category,
                quantity,
                condition: condition || 'Good Condition',
                schoolId: req.user.schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_FARM_INVENTORY', 'FarmInventoryItem', item.id, { name });
        res.json(item);
    }
    catch (error) {
        console.error('Create farm inventory error:', error);
        res.status(500).json({ error: 'Failed to add farm inventory item' });
    }
});
exports.default = router;
//# sourceMappingURL=farm.js.map