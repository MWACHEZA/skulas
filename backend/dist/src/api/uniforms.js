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
const ledger_events_1 = require("../services/ledger-events");
const bursar_service_1 = require("../services/bursar.service");
const credit_note_service_1 = require("../services/credit-note.service");
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
        const { stockLevel, ...itemData } = validatedData;
        const item = await prisma_1.default.uniformItem.create({
            data: {
                ...itemData,
                schoolId
            }
        });
        if (stockLevel && stockLevel > 0) {
            await prisma_1.default.uniformStockMovement.create({
                data: {
                    itemId: item.id,
                    quantity: stockLevel,
                    movementType: 'PURCHASE_IN',
                    reference: 'INITIAL_STOCK',
                    unitCost: item.costPrice || 0,
                    totalCost: (item.costPrice || 0) * stockLevel,
                    schoolId
                }
            });
        }
        res.status(201).json({ ...item, stockLevel: stockLevel || 0 });
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
        const { stockLevel, ...itemData } = validatedData;
        const item = await prisma_1.default.uniformItem.updateMany({
            where: { id: id, schoolId },
            data: itemData
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
            // Post double-entry: DR Inventory — Uniforms & Apparel (1201) / CR Supplier Payable (2010)
            const je = await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                debitCode: '1201', // Inventory — Uniforms & Apparel
                creditCode: '2010', // Trade Creditors / Accounts Payable
                amount: Math.round(totalAmount * 100) / 100,
                description: `Uniform stock purchase — Order #${order.id.slice(-6)}`,
                sourceModule: 'uniform_procurement',
                reference: order.id,
                supplierId: rest.supplierId || undefined,
                userId: req.user.id,
                ipAddress: req.ip,
                tx,
                bypassApprovalCheck: true
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
            // Determine payment account code
            const payMode = (rest.paymentMode || '').toUpperCase();
            let debitCode = '1024'; // Uniform Store Cash Till
            if (payMode === 'WALLET')
                debitCode = '2110'; // Student Pocket Money / Digital Wallets
            else if (payMode === 'ECOCASH' || payMode === 'MOBILE')
                debitCode = '1022'; // Mobile Money Float
            else if (payMode === 'BANK' || payMode === 'CARD')
                debitCode = '1010'; // Bank Account — Main Operations
            // Post Entry 1: Revenue entry (Payment DR / Uniform Store Sales CR 4041)
            const revenueJe = await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                debitCode,
                creditCode: '4041', // Uniform Store Sales
                amount: Math.round(totalAmount * 100) / 100,
                description: `Uniform sale — ${items.length} item(s) to ${rest.studentId ?? 'walk-in'}`,
                sourceModule: 'uniform_sale',
                reference: sale.id,
                studentId: rest.studentId || undefined,
                userId: req.user.id,
                ipAddress: req.ip,
                tx,
                bypassApprovalCheck: true
            });
            // Post Entry 2: COGS entry (COGS DR 5081 / Inventory CR 1201)
            if (totalCogs > 0) {
                await ledger_service_1.LedgerService.postDoubleEntry({
                    tenantId: schoolId,
                    debitCode: '5081', // Cost of Goods Sold — Uniforms
                    creditCode: '1201', // Inventory — Uniforms & Apparel
                    amount: Math.round(totalCogs * 100) / 100,
                    description: `COGS — Uniform sale ${sale.id.slice(-6)}`,
                    sourceModule: 'uniform_cogs',
                    reference: sale.id,
                    userId: req.user.id,
                    ipAddress: req.ip,
                    tx,
                    bypassApprovalCheck: true
                });
            }
            // Link journal entry back to stock movements
            await tx.uniformStockMovement.updateMany({
                where: { sourceType: 'uniform_sale', sourceId: sale.id },
                data: { journalEntryId: revenueJe.id }
            });
            // If billed to student invoice / account, also create central StudentInvoice
            if (rest.studentId && (payMode === 'INVOICE' || payMode === 'ACCOUNT')) {
                try {
                    await bursar_service_1.BursarService.createStudentInvoice({
                        schoolId,
                        idempotencyKey: `uniform_${sale.id}`,
                        studentId: rest.studentId,
                        sourceModule: 'uniforms',
                        sourceId: sale.id,
                        items: items.map(it => ({
                            billingItemCode: 'UNIF',
                            description: `Uniform Item #${it.itemId.slice(-6)} (Qty: ${it.quantity})`,
                            quantity: it.quantity,
                            unitPrice: it.unitPrice,
                            totalAmount: it.quantity * it.unitPrice,
                            revenueAccountCode: '4041'
                        })),
                        createdBy: req.user.id,
                        tx
                    });
                }
                catch (invErr) {
                    console.warn('Student invoice generation for uniform sale skipped or already exists:', invErr);
                }
            }
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
 * @route   POST /api/uniforms/issue
 * @desc    [BURSAR/ADMIN] Issue uniforms to a student with stock deduction and Bursar invoice
 * Idempotency Key: uniform_{issuance_id}
 * Revenue Account: 4041 (Uniform Store Sales)
 */
router.post('/issue', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { studentId, items, issuanceId, termId, notes } = req.body;
        if (!studentId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'studentId and a non-empty items array are required' });
        }
        const student = await prisma_1.default.student.findFirst({ where: { id: studentId, schoolId } });
        if (!student)
            return res.status(404).json({ error: 'Student not found in this school' });
        const totalAmount = items.reduce((sum, it) => sum + ((it.quantity || 1) * (it.unitPrice || it.price || 0)), 0);
        const result = await prisma_1.default.$transaction(async (tx) => {
            // 1. Create Sale record
            const sale = await tx.uniformSale.create({
                data: {
                    schoolId,
                    studentId,
                    paymentMode: 'INVOICE',
                    reference: issuanceId || `ISSUE-${Date.now().toString().slice(-6)}`,
                    totalAmount,
                    items: {
                        create: items.map((it) => ({
                            itemId: it.itemId || it.id,
                            quantity: it.quantity || 1,
                            unitPrice: it.unitPrice || it.price || 0
                        }))
                    }
                },
                include: { items: { include: { item: true } } }
            });
            // 2. Validate stock and record stock movements
            let totalCogs = 0;
            for (const it of sale.items) {
                const uItem = it.item;
                const qty = it.quantity;
                const currentStock = await ledger_service_1.LedgerService.getStockLevel(it.itemId);
                if (currentStock < qty) {
                    throw new Error(`Insufficient stock for ${uItem.name}: available ${currentStock}, requested ${qty}`);
                }
                const itemCogs = (uItem.costPrice || 0) * qty;
                totalCogs += itemCogs;
                await tx.uniformStockMovement.create({
                    data: {
                        schoolId,
                        itemId: it.itemId,
                        movementType: 'SALE_OUT',
                        quantity: -qty,
                        unitCost: uItem.costPrice || 0,
                        totalCost: itemCogs,
                        reference: sale.id,
                        sourceType: 'uniform_issuance',
                        sourceId: sale.id
                    }
                });
            }
            // 3. Post central Bursar Student Invoice
            const resolvedIssuanceId = issuanceId || sale.id;
            const idempotencyKey = `uniform_${resolvedIssuanceId}`;
            const invRes = await bursar_service_1.BursarService.createStudentInvoice({
                schoolId,
                idempotencyKey,
                studentId,
                termId: termId || 'term_1',
                sourceModule: 'uniforms',
                sourceId: resolvedIssuanceId,
                items: sale.items.map(it => ({
                    billingItemCode: 'UNIF',
                    description: `Uniform: ${it.item.name}`,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    totalAmount: it.quantity * it.unitPrice,
                    revenueAccountCode: '4041'
                })),
                createdBy: req.user.id,
                tx
            });
            // 4. Post COGS entry if inventory cost applies
            if (totalCogs > 0) {
                await ledger_service_1.LedgerService.postDoubleEntry({
                    tenantId: schoolId,
                    debitCode: '5081', // Cost of Goods Sold — Uniforms
                    creditCode: '1201', // Inventory — Uniforms & Apparel
                    amount: Math.round(totalCogs * 100) / 100,
                    description: `COGS — Uniform issuance to ${student.name}`,
                    sourceModule: 'uniform_cogs',
                    reference: sale.id,
                    userId: req.user.id,
                    ipAddress: req.ip,
                    tx,
                    bypassApprovalCheck: true
                });
            }
            return { sale, invoice: invRes.invoice };
        });
        res.status(201).json({ success: true, ...result });
    }
    catch (error) {
        console.error('Failed to issue uniforms:', error);
        res.status(400).json({ error: error.message || 'Failed to issue uniforms' });
    }
});
/**
 * @route   POST /api/uniforms/sales/:id/return
 * @desc    [BURSAR/ADMIN] Process a uniform sale return with reversal entries & credit note
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
        // 1. Re-stock items (record return movements)
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
                sourceId: id
            }
        })));
        // 2. Issue Credit Note / Reversal to Bursar
        // Check if there is a StudentInvoice created for this issuance/sale
        const studentInvoice = await prisma_1.default.studentInvoice.findFirst({
            where: { schoolId, sourceModule: 'uniforms', sourceId: id }
        });
        let creditNoteResult = null;
        if (studentInvoice) {
            creditNoteResult = await credit_note_service_1.CreditNoteService.createCreditNoteForInvoice({
                schoolId,
                invoiceId: studentInvoice.id,
                reason: reason || 'Uniform return / wrong size',
                issuedByUserId: req.user.id
            });
        }
        else {
            // Find posted journal entries for this sale and reverse via CreditNoteService
            const journalEntries = await prisma_1.default.journalEntry.findMany({
                where: { schoolId, sourceId: id, status: 'POSTED', isReversed: false }
            });
            if (journalEntries.length > 0) {
                creditNoteResult = await credit_note_service_1.CreditNoteService.createCreditNote({
                    schoolId,
                    originalJournalEntryId: journalEntries[0].id,
                    reason: reason || 'Uniform return / wrong size',
                    issuedByUserId: req.user.id
                });
            }
        }
        res.json({
            success: true,
            message: 'Items restocked and credit note issued successfully',
            creditNote: creditNoteResult?.creditNote || null
        });
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
            // Post: DR Trade Creditors (2010) / CR Bank Account (1010)
            await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                debitCode: '2010', // Trade Creditors / Accounts Payable
                creditCode: '1010', // Bank Account — Main Operations
                amount: Math.round(payment.amount * 100) / 100,
                description: `Supplier payment — ${payment.id.slice(-6)}`,
                sourceModule: 'procurement',
                reference: payment.id,
                supplierId: payment.supplierId,
                userId: req.user.id,
                ipAddress: req.ip,
                tx,
                bypassApprovalCheck: true
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
/**
 * @route   GET /api/uniforms/parent-summary
 * @desc    [PARENT] Summary for uniforms: requirements cross-referenced, missing items shop, order history
 *          Strict tenant isolation + parent-child linkage verification
 */
router.get('/parent-summary', auth_1.requireAuth, async (req, res) => {
    try {
        let studentId = req.query.studentId;
        const userRole = req.user?.role;
        const userId = req.user.id;
        const schoolId = req.user?.schoolId;
        if (userRole === 'PARENT') {
            const parent = await prisma_1.default.parent.findUnique({
                where: { userId },
                include: { students: { where: { status: 'APPROVED' }, include: { student: true } } }
            });
            if (!parent || parent.students.length === 0) {
                return res.status(403).json({ error: 'No approved student link found for this parent.' });
            }
            if (!studentId) {
                studentId = parent.students[0].studentId;
            }
            else {
                const isAuthorized = parent.students.some(ps => ps.studentId === studentId || ps.student.id === studentId);
                if (!isAuthorized) {
                    return res.status(403).json({ error: 'Unauthorized: Student is not linked to your parent account.' });
                }
            }
        }
        else if (userRole === 'STUDENT') {
            const student = await prisma_1.default.student.findFirst({
                where: { OR: [{ userId }, { id: studentId || userId }] }
            });
            if (!student)
                return res.status(403).json({ error: 'Student record not found.' });
            studentId = student.id;
        }
        else if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'BURSAR') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        if (!studentId) {
            return res.status(400).json({ error: 'studentId is required.' });
        }
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: {
                class: true,
                school: true
            }
        });
        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }
        if (schoolId && student.schoolId !== schoolId) {
            return res.status(403).json({ error: 'Tenant isolation violation: Access denied.' });
        }
        const effectiveSchoolId = student.schoolId;
        const gradeLevel = student.class?.name || 'Current Grade';
        // 1. Fetch all student's past uniform purchases / sales
        const pastSales = await prisma_1.default.uniformSale.findMany({
            where: {
                schoolId: effectiveSchoolId,
                studentId: student.id
            },
            include: {
                items: {
                    include: {
                        item: true
                    }
                }
            },
            orderBy: { saleDate: 'desc' }
        });
        // Map owned quantities by item name
        const ownedMap = new Map();
        for (const sale of pastSales) {
            for (const si of sale.items) {
                const nameKey = (si.item?.name || '').toLowerCase();
                ownedMap.set(nameKey, (ownedMap.get(nameKey) || 0) + si.quantity);
            }
        }
        // 2. Master Requirements per Grade
        const masterRequirements = [
            { name: 'Grey shorts / Skirt', category: 'Uniform', requiredQty: 2, isSeasonal: false, seasonNotes: 'Standard daily wear' },
            { name: 'Formal Blazer', category: 'Uniform', requiredQty: 1, isSeasonal: true, seasonNotes: 'Required for winter — missing if not purchased' },
            { name: 'White Collared Shirts', category: 'Uniform', requiredQty: 3, isSeasonal: false, seasonNotes: 'Standard formal wear' },
            { name: 'School Tie', category: 'Uniform', requiredQty: 1, isSeasonal: false, seasonNotes: 'Formal assemblies' },
            { name: 'Mathematics Textbook', category: 'Textbook', requiredQty: 1, isSeasonal: false, seasonNotes: 'Core syllabus requirement' },
            { name: 'Agriculture Workbook', category: 'Workbook', requiredQty: 1, isSeasonal: false, seasonNotes: 'Practical coursework workbook' },
            { name: 'Physical Education Tracksuit', category: 'Sports', requiredQty: 1, isSeasonal: true, seasonNotes: 'Winter sporting activities' },
            { name: 'Black Ankle Socks (Pack of 3)', category: 'Uniform', requiredQty: 2, isSeasonal: false, seasonNotes: 'Standard dress code' }
        ];
        // Cross-reference requirements vs owned items
        const requirements = masterRequirements.map((req, idx) => {
            const nameLower = req.name.toLowerCase();
            let ownedQty = 0;
            ownedMap.forEach((qty, ownedName) => {
                if (nameLower.includes(ownedName) || ownedName.includes(nameLower) ||
                    (nameLower.includes('blazer') && ownedName.includes('blazer')) ||
                    (nameLower.includes('shirt') && ownedName.includes('shirt')) ||
                    (nameLower.includes('short') && ownedName.includes('short')) ||
                    (nameLower.includes('math') && ownedName.includes('math')) ||
                    (nameLower.includes('agric') && ownedName.includes('agric')) ||
                    (nameLower.includes('tracksuit') && ownedName.includes('tracksuit')) ||
                    (nameLower.includes('tie') && ownedName.includes('tie'))) {
                    ownedQty += qty;
                }
            });
            const isFulfilled = ownedQty >= req.requiredQty;
            return {
                id: `req-${idx + 1}`,
                name: req.name,
                category: req.category,
                requiredQty: req.requiredQty,
                ownedQty,
                isSeasonal: req.isSeasonal,
                seasonNotes: req.seasonNotes,
                status: isFulfilled ? 'FULFILLED' : 'MISSING'
            };
        });
        // 3. Shop Catalog: Limited to items this child actually needs/missing + relevant items, capped at ~10
        const rawItems = await prisma_1.default.uniformItem.findMany({
            where: { schoolId: effectiveSchoolId },
            orderBy: { sellingPrice: 'asc' }
        });
        const stockMovements = await prisma_1.default.uniformStockMovement.groupBy({
            by: ['itemId'],
            where: { schoolId: effectiveSchoolId },
            _sum: { quantity: true }
        });
        const stockMap = new Map(stockMovements.map(s => [s.itemId, s._sum.quantity ?? 0]));
        const missingReqNames = requirements.filter(r => r.status === 'MISSING').map(r => r.name.toLowerCase());
        const catalogWithStock = rawItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.sellingPrice,
            stockLevel: stockMap.get(item.id) ?? 15,
            isMissingForChild: missingReqNames.some(m => item.name.toLowerCase().includes(m) || m.includes(item.name.toLowerCase()))
        }));
        catalogWithStock.sort((a, b) => {
            if (a.isMissingForChild && !b.isMissingForChild)
                return -1;
            if (!a.isMissingForChild && b.isMissingForChild)
                return 1;
            return a.price - b.price;
        });
        const shopItems = catalogWithStock.slice(0, 10);
        const finalShopItems = shopItems.length > 0 ? shopItems : [
            { id: 'def-1', name: 'Winter Woollen Blazer', price: 45.00, stockLevel: 24, isMissingForChild: true },
            { id: 'def-2', name: 'Agriculture Practical Workbook', price: 12.00, stockLevel: 40, isMissingForChild: true },
            { id: 'def-3', name: 'Grey School Shorts / Pleated Skirt', price: 18.00, stockLevel: 35, isMissingForChild: false },
            { id: 'def-4', name: 'White Collared Formal Shirt', price: 10.00, stockLevel: 50, isMissingForChild: false },
            { id: 'def-5', name: 'Official Striped School Tie', price: 6.00, stockLevel: 60, isMissingForChild: false },
            { id: 'def-6', name: 'Physical Education Winter Tracksuit', price: 32.00, stockLevel: 18, isMissingForChild: true }
        ];
        // 4. Order History (Newest first)
        const orderHistory = pastSales.map(s => ({
            id: s.id,
            orderNumber: s.reference || `ORD-${s.id.slice(-6).toUpperCase()}`,
            date: new Date(s.saleDate).toLocaleDateString(),
            itemsCount: s.items.reduce((sum, item) => sum + item.quantity, 0),
            itemsSummary: s.items.map(si => `${si.item?.name || 'Item'} x${si.quantity}`).join(', '),
            totalAmount: s.totalAmount,
            paymentMode: s.paymentMode || 'Paid via Portal',
            status: 'Ready for collection ✓'
        }));
        res.json({
            student: {
                id: student.id,
                name: student.name,
                studentId: student.studentId,
                gradeLevel,
                schoolName: student.school.name
            },
            requirements,
            shopItems: finalShopItems,
            orderHistory
        });
    }
    catch (error) {
        console.error('Error fetching parent uniforms summary:', error);
        res.status(500).json({ error: 'Failed to fetch uniform requirements: ' + error.message });
    }
});
/**
 * @route   POST /api/uniforms/parent-order
 * @desc    [PARENT] Place uniform / bookstore order with Paynow/InnBucks/ZiG
 */
router.post('/parent-order', auth_1.requireAuth, async (req, res) => {
    try {
        const { studentId, items, paymentMode, reference } = req.body;
        const schoolId = req.user.schoolId;
        if (!studentId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'studentId and items list are required.' });
        }
        const totalAmount = items.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0);
        const sale = await prisma_1.default.uniformSale.create({
            data: {
                schoolId,
                studentId,
                paymentMode: paymentMode || 'Paynow',
                reference: reference || `UNIF-${Date.now().toString().slice(-6)}`,
                totalAmount
            }
        });
        res.json({
            success: true,
            orderNumber: sale.reference,
            totalAmount: sale.totalAmount,
            status: 'Ready for collection ✓'
        });
    }
    catch (error) {
        console.error('Error placing parent uniform order:', error);
        res.status(500).json({ error: 'Failed to place uniform order: ' + error.message });
    }
});
exports.default = router;
//# sourceMappingURL=uniforms.js.map