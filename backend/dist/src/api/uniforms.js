"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const uniforms_schema_1 = require("../schemas/uniforms.schema");
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const ledger_events_1 = require("../services/ledger-events");
const router = (0, express_1.Router)();
// ═══════════ UNIFORM ITEMS ═══════════
router.get('/items', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const rawItems = await prisma_1.default.uniformItem.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        // Compute stock levels from movements (no more mutable stockLevel field)
        const stockLevels = await prisma_1.default.uniformStockMovement.groupBy({
            by: ['itemId'],
            where: { schoolId },
            _sum: { quantity: true }
        });
        const stockMap = new Map(stockLevels.map(s => [s.itemId, s._sum.quantity ?? 0]));
        const items = rawItems.map(item => ({
            ...item,
            stockLevel: stockMap.get(item.id) ?? 0
        }));
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch uniform items' });
    }
});
router.post('/items', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = uniforms_schema_1.UniformItemSchema.parse(req.body);
        const item = await prisma_1.default.uniformItem.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json({ ...item, stockLevel: 0 });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create item' });
    }
});
router.patch('/items/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = uniforms_schema_1.UniformItemSchema.partial().parse(req.body);
        const item = await prisma_1.default.uniformItem.updateMany({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(item);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update item' });
    }
});
router.delete('/items/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const schoolId = req.user.schoolId;
        // Check stock level before deleting
        const stockLevel = await ledger_service_1.LedgerService.getStockLevel(id);
        if (stockLevel !== 0) {
            return res.status(400).json({
                error: `Cannot delete item with stock balance of ${stockLevel}. Adjust stock to zero first.`
            });
        }
        await prisma_1.default.uniformItem.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
// ═══════════ STOCK ORDERS ═══════════
router.get('/stock-orders', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        let where = { schoolId };
        if (userRole === 'SUPPLIER') {
            const supplier = await prisma_1.default.supplier.findFirst({ where: { userId: req.user.id } });
            if (supplier) {
                where.supplierId = supplier.id;
            }
            else {
                return res.json([]);
            }
        }
        const orders = await prisma_1.default.uniformStockOrder.findMany({
            where,
            include: {
                supplier: { select: { id: true, companyName: true } },
                items: { include: { item: true } }
            },
            orderBy: { orderDate: 'desc' }
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stock orders' });
    }
});
router.post('/stock-orders', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { items, ...rest } = uniforms_schema_1.UniformStockOrderSchema.parse(req.body);
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const result = await prisma_1.default.$transaction(async (tx) => {
            const order = await tx.uniformStockOrder.create({
                data: {
                    ...rest,
                    totalAmount,
                    schoolId,
                    items: {
                        create: items.map(item => ({
                            itemId: item.itemId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                        }))
                    }
                }
            });
            // Record stock movements (replaces direct stockLevel increment)
            for (const item of items) {
                await tx.uniformStockMovement.create({
                    data: {
                        schoolId,
                        itemId: item.itemId,
                        movementType: 'PURCHASE_IN',
                        quantity: item.quantity,
                        unitCost: item.unitPrice,
                        totalCost: item.quantity * item.unitPrice,
                        reference: order.id,
                        sourceType: 'uniform_purchase',
                        sourceId: order.id
                    }
                });
                // Update costPrice on item (last purchase price for COGS)
                await tx.uniformItem.update({
                    where: { id: item.itemId },
                    data: { costPrice: item.unitPrice }
                });
            }
            // Post double-entry: DR Inventory — Uniforms / CR Uniform Supplier Payable
            const inventoryAccountId = await (0, coa_seeder_1.getAccountId)(schoolId, '1300', tx);
            const apAccountId = await (0, coa_seeder_1.getAccountId)(schoolId, '3110', tx);
            const je = await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: new Date(),
                description: `Uniform stock purchase — Order #${order.id.slice(-6)}`,
                sourceType: 'uniform_purchase',
                sourceId: order.id,
                createdByUserId: req.user.id,
                lines: [
                    {
                        accountId: inventoryAccountId,
                        debit: totalAmount,
                        description: `Uniform inventory — ${items.length} item type(s)`
                    },
                    {
                        accountId: apAccountId,
                        credit: totalAmount,
                        description: `Payable to supplier — Order ${order.id.slice(-6)}`
                    }
                ],
                tx
            });
            // Link JE to each stock movement
            await tx.uniformStockMovement.updateMany({
                where: { sourceType: 'uniform_purchase', sourceId: order.id },
                data: { journalEntryId: je.id }
            });
            ledger_events_1.LedgerEvents.broadcast({
                type: 'STOCK_CHANGED',
                schoolId,
                sourceType: 'uniform_purchase',
                sourceId: order.id,
                timestamp: new Date().toISOString()
            });
            return order;
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create stock order' });
    }
});
// ═══════════ SALES ═══════════
router.get('/sales', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        let where = { schoolId };
        if (userRole === 'STUDENT') {
            const student = await prisma_1.default.student.findFirst({ where: { userId: req.user.id } });
            if (student) {
                where.studentId = student.id;
            }
            else {
                return res.json([]);
            }
        }
        else if (userRole === 'PARENT') {
            const parent = await prisma_1.default.parent.findFirst({ where: { userId: req.user.id } });
            if (parent) {
                where.parentId = parent.id;
            }
            else {
                return res.json([]);
            }
        }
        const sales = await prisma_1.default.uniformSale.findMany({
            where,
            include: {
                student: { select: { id: true, name: true } },
                items: { include: { item: true } }
            },
            orderBy: { saleDate: 'desc' }
        });
        res.json(sales);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});
router.post('/sales', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { items, ...rest } = uniforms_schema_1.UniformSaleSchema.parse(req.body);
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const result = await prisma_1.default.$transaction(async (tx) => {
            const sale = await tx.uniformSale.create({
                data: {
                    ...rest,
                    totalAmount,
                    schoolId,
                    items: {
                        create: items.map(item => ({
                            itemId: item.itemId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                        }))
                    }
                }
            });
            // Process each item: validate stock, record movement, collect COGS data
            let totalCogs = 0;
            const cogsLines = [];
            for (const item of items) {
                // Compute current stock from movements
                const currentStock = await ledger_service_1.LedgerService.getStockLevel(item.itemId);
                if (currentStock < item.quantity) {
                    const uniformItem = await tx.uniformItem.findFirst({ where: { id: item.itemId } });
                    throw new Error(`Insufficient stock for ${uniformItem?.name ?? 'item'}: available ${currentStock}, requested ${item.quantity}`);
                }
                // Get costPrice for COGS calculation
                const uniformItem = await tx.uniformItem.findUniqueOrThrow({ where: { id: item.itemId } });
                const itemCogs = uniformItem.costPrice * item.quantity;
                totalCogs += itemCogs;
                // Record stock movement (replaces direct stockLevel decrement)
                await tx.uniformStockMovement.create({
                    data: {
                        schoolId,
                        itemId: item.itemId,
                        movementType: 'SALE_OUT',
                        quantity: -item.quantity, // negative = out
                        unitCost: uniformItem.costPrice,
                        totalCost: itemCogs,
                        reference: sale.id,
                        sourceType: 'uniform_sale',
                        sourceId: sale.id
                    }
                });
            }
            // Resolve accounts
            const cashAccountId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', tx); // Cash on Hand
            const salesIncomeId = await (0, coa_seeder_1.getAccountId)(schoolId, '5200', tx); // Uniform Sales Income
            const cogsAccountId = await (0, coa_seeder_1.getAccountId)(schoolId, '6100', tx); // COGS — Uniforms
            const inventoryId = await (0, coa_seeder_1.getAccountId)(schoolId, '1300', tx); // Inventory — Uniforms
            // Post Entry 1: Revenue entry (Cash DR / Sales Income CR)
            const revenueJe = await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: new Date(),
                description: `Uniform sale — ${items.length} item(s) to ${rest.studentId ?? 'walk-in'}`,
                sourceType: 'uniform_sale',
                sourceId: sale.id,
                createdByUserId: req.user.id,
                lines: [
                    {
                        accountId: cashAccountId,
                        debit: totalAmount,
                        description: 'Cash received for uniform sale',
                        studentId: rest.studentId
                    },
                    {
                        accountId: salesIncomeId,
                        credit: totalAmount,
                        description: 'Uniform sales revenue'
                    }
                ],
                tx
            });
            // Post Entry 2: COGS entry (COGS DR / Inventory CR)
            if (totalCogs > 0) {
                await ledger_service_1.LedgerService.postEntry({
                    schoolId,
                    date: new Date(),
                    description: `COGS — Uniform sale ${sale.id.slice(-6)}`,
                    sourceType: 'cogs',
                    sourceId: sale.id,
                    createdByUserId: req.user.id,
                    lines: [
                        {
                            accountId: cogsAccountId,
                            debit: totalCogs,
                            description: 'Cost of uniforms sold'
                        },
                        {
                            accountId: inventoryId,
                            credit: totalCogs,
                            description: 'Inventory reduction at cost'
                        }
                    ],
                    tx
                });
            }
            // Link journal entry back to stock movements
            await tx.uniformStockMovement.updateMany({
                where: { sourceType: 'uniform_sale', sourceId: sale.id },
                data: { journalEntryId: revenueJe.id }
            });
            ledger_events_1.LedgerEvents.broadcast({
                type: 'STOCK_CHANGED',
                schoolId,
                sourceType: 'uniform_sale',
                sourceId: sale.id,
                timestamp: new Date().toISOString()
            });
            return sale;
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record sale' });
    }
});
/**
 * @route   POST /api/uniforms/sales/:id/return
 * @desc    [BURSAR/ADMIN] Process a uniform sale return with reversal entries
 */
router.post('/sales/:id/return', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const schoolId = req.user.schoolId;
        const { reason } = req.body;
        const sale = await prisma_1.default.uniformSale.findFirst({
            where: { id, schoolId },
            include: { items: { include: { item: true } } }
        });
        if (!sale)
            return res.status(404).json({ error: 'Sale not found' });
        const journalEntries = await prisma_1.default.journalEntry.findMany({
            where: { schoolId, sourceId: id, status: 'POSTED' }
        });
        if (journalEntries.length === 0) {
            return res.status(400).json({ error: 'No journal entries found for this sale' });
        }
        // Reverse all related journal entries
        const reversals = await Promise.all(journalEntries.map(je => ledger_service_1.LedgerService.reverseEntry(je.id, reason || 'Uniform return', req.user.id)));
        // Record return stock movements
        await Promise.all(sale.items.map((saleItem) => prisma_1.default.uniformStockMovement.create({
            data: {
                schoolId,
                itemId: saleItem.itemId,
                movementType: 'RETURN_IN',
                quantity: saleItem.quantity, // positive = back in stock
                unitCost: saleItem.item.costPrice,
                totalCost: saleItem.item.costPrice * saleItem.quantity,
                reference: id,
                sourceType: 'return',
                sourceId: id,
                journalEntryId: reversals[0]?.id
            }
        })));
        res.json({ success: true, reversalCount: reversals.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to process return' });
    }
});
// ═══════════ SUPPLIER PAYMENTS ═══════════
router.get('/supplier-payments', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        let where = { schoolId };
        if (userRole === 'SUPPLIER') {
            const supplier = await prisma_1.default.supplier.findFirst({ where: { userId: req.user.id } });
            if (supplier) {
                where.supplierId = supplier.id;
            }
            else {
                return res.json([]);
            }
        }
        const payments = await prisma_1.default.uniformSupplierPayment.findMany({
            where,
            include: { supplier: { select: { id: true, companyName: true } } },
            orderBy: { date: 'desc' }
        });
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch supplier payments' });
    }
});
router.post('/supplier-payments', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = uniforms_schema_1.UniformSupplierPaymentSchema.parse(req.body);
        const result = await prisma_1.default.$transaction(async (tx) => {
            const payment = await tx.uniformSupplierPayment.create({
                data: {
                    ...validatedData,
                    schoolId
                }
            });
            // Post: DR Uniform Supplier Payable / CR Bank Account
            const apAccountId = await (0, coa_seeder_1.getAccountId)(schoolId, '3110', tx);
            const bankAccountId = await (0, coa_seeder_1.getAccountId)(schoolId, '1110', tx);
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: new Date(),
                description: `Supplier payment — ${payment.id.slice(-6)}`,
                sourceType: 'expense',
                sourceId: payment.id,
                createdByUserId: req.user.id,
                lines: [
                    {
                        accountId: apAccountId,
                        debit: payment.amount,
                        description: 'Settle uniform supplier payable',
                        supplierId: payment.supplierId
                    },
                    {
                        accountId: bankAccountId,
                        credit: payment.amount,
                        description: 'Payment from bank account'
                    }
                ],
                tx
            });
            return payment;
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record payment' });
    }
});
// ═══════════ SUPPLIERS (PROXY TO PROCUREMENT) ═══════════
router.get('/suppliers', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const suppliers = await prisma_1.default.supplier.findMany({
            where: {
                schools: { some: { schoolId } }
            },
            include: {
                user: true
            }
        });
        res.json(suppliers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});
router.post('/suppliers', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { companyName, contactName, phone, email, address } = req.body;
        const result = await prisma_1.default.$transaction(async (tx) => {
            const supplier = await tx.supplier.create({
                data: {
                    globalId: `SUP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    companyName,
                    contactName,
                    phone,
                    email,
                    address
                }
            });
            await tx.schoolSupplier.create({
                data: {
                    schoolId,
                    supplierId: supplier.id,
                    status: 'APPROVED',
                    schoolSpecificId: `VND-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                }
            });
            return supplier;
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create supplier' });
    }
});
exports.default = router;
//# sourceMappingURL=uniforms.js.map