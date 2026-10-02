"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const ledger_service_1 = __importDefault(require("../services/ledger.service"));
const moduleAccess_1 = require("../middleware/moduleAccess");
const router = (0, express_1.Router)();
// All farm routes require authentication
router.use(auth_1.requireAuth);
router.get('/access', (req, res) => {
    const { getModuleAccess } = require('../middleware/moduleAccess');
    const access = getModuleAccess(req.user, 'farm');
    res.json(access);
});
// ── LIVESTOCK MONITORS ──
router.get('/livestock', (0, moduleAccess_1.requireModuleAccess)('farm', 'scoped'), async (req, res) => {
    try {
        const batches = await prisma_1.default.farmLivestockBatch.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { datePlaced: 'desc' }
        });
        res.json(batches);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch livestock batches' });
    }
});
router.post('/livestock', (0, moduleAccess_1.requireModuleAccess)('farm', 'scoped'), async (req, res) => {
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
        res.status(500).json({ error: 'Failed to create livestock batch' });
    }
});
// ── CROP CYCLE PLANNER ──
router.get('/crops', (0, moduleAccess_1.requireModuleAccess)('farm', 'scoped'), async (req, res) => {
    try {
        const crops = await prisma_1.default.farmCropCycle.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { datePlanted: 'desc' }
        });
        res.json(crops);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch crop cycles' });
    }
});
router.post('/crops', (0, moduleAccess_1.requireModuleAccess)('farm', 'scoped'), async (req, res) => {
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
        res.status(500).json({ error: 'Failed to create crop cycle' });
    }
});
// ── FARM INVENTORY ──
router.get('/inventory', (0, moduleAccess_1.requireModuleAccess)('farm', 'scoped'), async (req, res) => {
    try {
        const inventory = await prisma_1.default.farmInventoryItem.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(inventory);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch farm inventory' });
    }
});
router.post('/inventory', (0, moduleAccess_1.requireModuleAccess)('farm', 'scoped'), async (req, res) => {
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
        res.status(500).json({ error: 'Failed to add farm inventory item' });
    }
});
// ── PRODUCE SALES ──
router.post('/sales', (0, moduleAccess_1.requireModuleAccess)('farm', 'full'), async (req, res) => {
    const { itemId, productName, quantitySold, saleAmount } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const farmIncomeCode = '4050'; // Farm/Agricultural Revenue
        // GL Engine
        await ledger_service_1.default.postDoubleEntry({
            tenantId: schoolId,
            debitCode: '1010', // Cash/Bank
            creditCode: farmIncomeCode,
            amount: Number(saleAmount),
            description: `Farm produce sale: ${productName} x${quantitySold}`,
            sourceModule: 'farm_sale',
            reference: `FARM-${Date.now()}`,
            userId: req.user.id
        });
        // Decrement farm inventory: quantity is stored as a String in schema
        // Update the condition to reflect lower stock
        const currentItem = await prisma_1.default.farmInventoryItem.findFirst({ where: { id: itemId, schoolId } });
        if (currentItem) {
            // Parse numeric part from quantity string (e.g. "12 Bags" -> 12), subtract, reformat
            const numericQty = parseFloat(currentItem.quantity) || 0;
            const newQty = Math.max(0, numericQty - Number(quantitySold));
            const unit = currentItem.quantity.replace(/[\d.]+/, '').trim();
            await prisma_1.default.farmInventoryItem.update({
                where: { id: itemId },
                data: {
                    quantity: `${newQty} ${unit}`.trim(),
                    condition: newQty === 0 ? 'Out of Stock' : newQty < 5 ? 'Low Stock' : currentItem.condition
                }
            });
        }
        // Stock movement record — use fields that exist in StockMovement schema
        await prisma_1.default.stockMovement.create({
            data: {
                schoolId,
                module: 'FARM',
                itemId,
                itemName: String(productName),
                direction: 'OUT',
                quantity: Number(quantitySold),
                unitCost: Number(saleAmount) / Number(quantitySold),
                totalCost: Number(saleAmount),
                reference: `FARM-${Date.now()}`
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process farm sale' });
    }
});
exports.default = router;
//# sourceMappingURL=farm.js.map