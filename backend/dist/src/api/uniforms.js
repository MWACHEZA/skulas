"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const uniforms_schema_1 = require("../schemas/uniforms.schema");
const router = (0, express_1.Router)();
// ═══════════ UNIFORM ITEMS ═══════════
router.get('/items', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const items = await prisma_1.default.uniformItem.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
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
        res.status(201).json(item);
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
        const { id } = req.params;
        const schoolId = req.user.schoolId;
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
        // If supplier, filter by their supplier ID
        if (userRole === 'SUPPLIER') {
            const supplier = await prisma_1.default.supplier.findFirst({ where: { userId: req.user.id } });
            if (supplier) {
                where.supplierId = supplier.id;
            }
            else {
                return res.json([]); // No supplier profile linked
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
            // Update stock levels
            for (const item of items) {
                await tx.uniformItem.update({
                    where: { id: item.itemId },
                    data: { stockLevel: { increment: item.quantity } }
                });
            }
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
        // Role-based filtering
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
            // Atomically deduct stock — strictly fails if any item has insufficient stock
            for (const item of items) {
                const stockUpdate = await tx.uniformItem.updateMany({
                    where: { id: item.itemId, stockLevel: { gte: item.quantity } },
                    data: { stockLevel: { decrement: item.quantity } }
                });
                if (stockUpdate.count === 0) {
                    const uniformItem = await tx.uniformItem.findFirst({ where: { id: item.itemId } });
                    throw new Error(`Insufficient stock for ${uniformItem?.name || 'item'}`);
                }
            }
            return sale;
        });
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record sale' });
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
        const payment = await prisma_1.default.uniformSupplierPayment.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json(payment);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record payment' });
    }
});
// ═══════════ SUPPLIERS (PROXY TO PROCUREMENT) ═══════════
router.get('/suppliers', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // Fetch suppliers that are linked to this school
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
            // Create supplier (Global)
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
            // Link to school
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