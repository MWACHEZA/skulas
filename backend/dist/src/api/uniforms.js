import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { UniformItemSchema, UniformStockOrderSchema, UniformSaleSchema, UniformSupplierPaymentSchema } from '../schemas/uniforms.schema';
const router = Router();
// ═══════════ UNIFORM ITEMS ═══════════
router.get('/items', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const items = await prisma.uniformItem.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch uniform items' });
    }
});
router.post('/items', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = UniformItemSchema.parse(req.body);
        const item = await prisma.uniformItem.create({
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
router.patch('/items/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = UniformItemSchema.partial().parse(req.body);
        const item = await prisma.uniformItem.updateMany({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(item);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update item' });
    }
});
router.delete('/items/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma.uniformItem.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
// ═══════════ STOCK ORDERS ═══════════
router.get('/stock-orders', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        let where = { schoolId };
        // If supplier, filter by their supplier ID
        if (userRole === 'SUPPLIER') {
            const supplier = await prisma.supplier.findFirst({ where: { userId: req.user.id } });
            if (supplier) {
                where.supplierId = supplier.id;
            }
            else {
                return res.json([]); // No supplier profile linked
            }
        }
        const orders = await prisma.uniformStockOrder.findMany({
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
router.post('/stock-orders', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { items, ...rest } = UniformStockOrderSchema.parse(req.body);
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const result = await prisma.$transaction(async (tx) => {
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
router.get('/sales', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        let where = { schoolId };
        // Role-based filtering
        if (userRole === 'STUDENT') {
            const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
            if (student) {
                where.studentId = student.id;
            }
            else {
                return res.json([]);
            }
        }
        else if (userRole === 'PARENT') {
            const parent = await prisma.parent.findFirst({ where: { userId: req.user.id } });
            if (parent) {
                where.parentId = parent.id;
            }
            else {
                return res.json([]);
            }
        }
        const sales = await prisma.uniformSale.findMany({
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
router.post('/sales', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { items, ...rest } = UniformSaleSchema.parse(req.body);
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const result = await prisma.$transaction(async (tx) => {
            // Check stock availability
            for (const item of items) {
                const uniformItem = await tx.uniformItem.findUnique({ where: { id: item.itemId } });
                if (!uniformItem || uniformItem.stockLevel < item.quantity) {
                    throw new Error(`Insufficient stock for ${uniformItem?.name || 'item'}`);
                }
            }
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
            // Update stock levels
            for (const item of items) {
                await tx.uniformItem.update({
                    where: { id: item.itemId },
                    data: { stockLevel: { decrement: item.quantity } }
                });
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
router.get('/supplier-payments', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        let where = { schoolId };
        if (userRole === 'SUPPLIER') {
            const supplier = await prisma.supplier.findFirst({ where: { userId: req.user.id } });
            if (supplier) {
                where.supplierId = supplier.id;
            }
            else {
                return res.json([]);
            }
        }
        const payments = await prisma.uniformSupplierPayment.findMany({
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
router.post('/supplier-payments', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = UniformSupplierPaymentSchema.parse(req.body);
        const payment = await prisma.uniformSupplierPayment.create({
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
router.get('/suppliers', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // Fetch suppliers that are linked to this school
        const suppliers = await prisma.supplier.findMany({
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
router.post('/suppliers', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { companyName, contactName, phone, email, address } = req.body;
        const result = await prisma.$transaction(async (tx) => {
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
export default router;
//# sourceMappingURL=uniforms.js.map