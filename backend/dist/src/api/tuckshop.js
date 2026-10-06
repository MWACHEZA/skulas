"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const ledger_service_1 = require("../services/ledger.service");
const ledger_events_1 = require("../services/ledger-events");
const till_service_1 = require("../services/till.service");
const fiscal_service_1 = require("../services/fiscal.service");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// ─────────────────────────────────────────────────────────────────────────────
// Helper — map a payment method string to the correct COA code
// ─────────────────────────────────────────────────────────────────────────────
function paymentAccountCode(paymentMethod) {
    switch ((paymentMethod || '').toUpperCase()) {
        case 'WALLET': return '2110'; // Student Pocket Money / Digital Wallets (liability reduced on spend)
        case 'CARD':
        case 'POS': return '1010'; // Bank Account — Main Operations
        case 'MOBILE':
        case 'ECOCASH': return '1022'; // Mobile Money Float (EcoCash / OneMoney)
        case 'BANK': return '1010'; // Bank Account — Main Operations
        case 'CASH':
        default: return '1023'; // Tuckshop Cash Till
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/items  — list all tuckshop inventory items
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const items = await prisma_1.default.tuckshopItem.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(items);
    }
    catch (error) {
        console.error('Fetch tuckshop items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tuckshop/items  — create a new tuckshop item
// ─────────────────────────────────────────────────────────────────────────────
router.post('/items', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { name, category, price, stock } = req.body;
        const item = await prisma_1.default.tuckshopItem.create({
            data: {
                name,
                category,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                schoolId
            }
        });
        res.json(item);
    }
    catch (error) {
        console.error('Create tuckshop item error:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/tuckshop/items/:id  — update / restock an item
// ─────────────────────────────────────────────────────────────────────────────
router.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, stock, addStock, updatedAt } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (category)
            updateData.category = category;
        if (price !== undefined)
            updateData.price = parseFloat(price);
        if (addStock !== undefined) {
            updateData.stock = { increment: parseInt(addStock) };
        }
        else if (stock !== undefined) {
            updateData.stock = parseInt(stock);
        }
        if (updatedAt) {
            const updateResult = await prisma_1.default.tuckshopItem.updateMany({
                where: { id, updatedAt: new Date(updatedAt) },
                data: updateData
            });
            if (updateResult.count === 0) {
                return res.status(409).json({ error: 'Item was updated by another user. Please refresh and try again.' });
            }
            const item = await prisma_1.default.tuckshopItem.findUnique({ where: { id } });
            res.json(item);
        }
        else {
            const item = await prisma_1.default.tuckshopItem.update({
                where: { id },
                data: updateData
            });
            res.json(item);
        }
    }
    catch (error) {
        console.error('Update tuckshop item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tuckshop/sales  — POS checkout
//
// FIX 1: Remove broken `balance` field references — StudentWallet has no balance
//         column. Balance is computed from WalletTransaction.amount via LedgerService.
// FIX 2: Wallet payments now use LedgerService.getWalletBalance() for the check
//         and create a WalletTransaction with a negative amount (PURCHASE) correctly.
// FIX 3: Post a balanced journal entry for every sale:
//         Revenue side:  DR payment account  /  CR 5210 Tuckshop Sales Income
//         COGS side:     DR 6110 COGS Tuckshop  /  CR 1310 Inventory Tuckshop
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sales', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { items, paymentMethod, studentId } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        // ── GUARD: Till session MUST be open to process sales ───────────────────
        const tillSession = await till_service_1.TillService.requireOpenTill(schoolId);
        // ── STEP 1: Wallet balance check (before the DB transaction) ────────────
        if (paymentMethod === 'WALLET') {
            if (!studentId) {
                return res.status(400).json({ error: 'Student ID required for Wallet payment' });
            }
            // Compute balance on-the-fly from WalletTransaction rows — no balance column exists
            const walletBalance = await ledger_service_1.LedgerService.getWalletBalance(studentId);
            if (walletBalance < totalAmount) {
                return res.status(400).json({
                    error: `Insufficient wallet balance. Available: ${walletBalance.toFixed(2)}, Required: ${totalAmount.toFixed(2)}`
                });
            }
        }
        // ── STEP 2: Atomic DB transaction — stock deduction + sale records ───────
        const { createdSales, walletId } = await prisma_1.default.$transaction(async (tx) => {
            let walletId = null;
            // Wallet: deduct via WalletTransaction (negative amount = PURCHASE)
            if (paymentMethod === 'WALLET') {
                const wallet = await tx.studentWallet.findUnique({ where: { studentId } });
                if (!wallet)
                    throw new Error('Student wallet not found. Please contact the Bursar.');
                await tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: -totalAmount, // negative = spend
                        type: 'PURCHASE',
                        description: 'Tuckshop POS Purchase'
                    }
                });
                walletId = wallet.id;
            }
            // Deduct stock and record each sale line
            const createdSales = [];
            for (const item of items) {
                const stockUpdate = await tx.tuckshopItem.updateMany({
                    where: { id: item.itemId, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } }
                });
                if (stockUpdate.count === 0) {
                    const dbItem = await tx.tuckshopItem.findUnique({ where: { id: item.itemId } });
                    throw new Error(`Insufficient stock for "${dbItem?.name ?? item.itemId}". Available: ${dbItem?.stock ?? 0}`);
                }
                const sale = await tx.tuckshopSale.create({
                    data: {
                        itemId: item.itemId,
                        quantity: item.quantity,
                        totalAmount: item.price * item.quantity,
                        schoolId,
                        studentId: studentId || null
                    }
                });
                createdSales.push(sale);
            }
            return { createdSales, walletId };
        });
        // ── STEP 3: Post journal entries & Fiscalise AFTER the transaction commits ───
        const saleSourceId = createdSales[0]?.id ?? schoolId;
        let revEntry = null;
        let fiscalResult = null;
        try {
            const payCode = paymentAccountCode(paymentMethod);
            const vatAmount = Math.round((totalAmount * 15 / 115) * 100) / 100;
            // A) Revenue journal entry with 15% inclusive VAT split
            revEntry = await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                debitCode: payCode,
                creditCode: '4042', // Tuckshop & Canteen Sales
                amount: totalAmount,
                taxCode: 'STANDARD_VAT_15',
                vatCreditCode: '2021', // VAT Output Tax
                vatAmount,
                description: `Tuckshop POS Sale — ${items.length} item(s) via ${paymentMethod || 'Cash'}`,
                sourceModule: 'tuckshop_sale',
                reference: saleSourceId,
                studentId: studentId || undefined,
                userId: req.user?.id,
                ipAddress: req.ip
            });
            // B) Fiscalise with ZIMRA Virtual Fiscal Device
            fiscalResult = await fiscal_service_1.FiscalService.fiscaliseSale({
                schoolId,
                deviceId: tillSession.deviceId,
                grossAmount: totalAmount,
                paymentMethod: paymentMethod || 'CASH',
                items: items.map((it) => ({
                    name: it.name || 'Tuckshop Item',
                    quantity: it.quantity,
                    unitPrice: it.price,
                    totalAmount: it.price * it.quantity,
                    taxCode: 'A'
                })),
                glTransactionId: revEntry?.id
            });
            // C) COGS journal entry
            const totalCost = items.reduce((sum, item) => {
                const costPerUnit = item.costPrice ?? item.price * 0.7;
                return sum + costPerUnit * item.quantity;
            }, 0);
            if (totalCost > 0) {
                await ledger_service_1.LedgerService.postDoubleEntry({
                    tenantId: schoolId,
                    debitCode: '5080', // Cost of Goods Sold — Tuckshop
                    creditCode: '1200', // Inventory — Tuckshop Stock
                    amount: Math.round(totalCost * 100) / 100,
                    description: `Tuckshop COGS — ${items.length} item(s)`,
                    sourceModule: 'tuckshop_cogs',
                    reference: saleSourceId,
                    userId: req.user?.id,
                    ipAddress: req.ip,
                    bypassApprovalCheck: true
                });
            }
            // Broadcast real-time ledger event
            ledger_events_1.LedgerEvents.broadcast({
                type: 'LEDGER_POSTED',
                schoolId,
                sourceType: 'tuckshop_sale',
                sourceId: saleSourceId,
                studentId: studentId || undefined,
                timestamp: new Date().toISOString()
            });
            if (paymentMethod === 'WALLET' && studentId) {
                ledger_events_1.LedgerEvents.broadcast({
                    type: 'WALLET_UPDATED',
                    schoolId,
                    studentId,
                    sourceType: 'tuckshop_sale',
                    sourceId: saleSourceId,
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (ledgerErr) {
            console.error('[Ledger/Fiscal] Tuckshop sale post failed:', ledgerErr);
        }
        res.json({
            success: true,
            sales: createdSales,
            journalEntry: revEntry ? { id: revEntry.id, entryNumber: revEntry.entryNumber } : null,
            fiscalInvoice: fiscalResult
        });
    }
    catch (error) {
        console.error('POS Sale error:', error);
        res.status(400).json({ error: error.message || 'Failed to process sale' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/sales (Full directory for FinanceWallets.tsx)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sales', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing school context' });
        const sales = await prisma_1.default.tuckshopSale.findMany({
            where: { schoolId },
            orderBy: { soldAt: 'desc' },
            take: 200,
            include: {
                item: true
            }
        });
        const studentIds = sales.map(s => s.studentId).filter((id) => Boolean(id));
        const students = studentIds.length > 0
            ? await prisma_1.default.student.findMany({
                where: { id: { in: studentIds } },
                select: { id: true, name: true, studentId: true, user: { select: { name: true, email: true } } }
            })
            : [];
        const studentMap = new Map(students.map(st => [st.id, st]));
        const formatted = sales.map(s => {
            const student = s.studentId ? studentMap.get(s.studentId) : null;
            return {
                id: s.id,
                itemNames: s.item?.name || 'Tuckshop Item',
                totalAmount: s.totalAmount,
                quantity: s.quantity,
                paymentMethod: 'CASH',
                soldAt: s.soldAt,
                studentName: student?.user?.name || student?.name || 'Counter Sale',
                student: student || null
            };
        });
        res.json(formatted);
    }
    catch (error) {
        console.error('Fetch sales error:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/sales/recent
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sales/recent', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const sales = await prisma_1.default.tuckshopSale.findMany({
            where: { schoolId },
            orderBy: { soldAt: 'desc' },
            take: 20,
            include: { item: true }
        });
        res.json(sales);
    }
    catch (error) {
        console.error('Fetch recent sales error:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/reports
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todaySales = await prisma_1.default.tuckshopSale.findMany({
            where: { schoolId, soldAt: { gte: startOfToday } }
        });
        const revenueToday = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
        const itemsSoldToday = todaySales.reduce((acc, s) => acc + s.quantity, 0);
        const allSales = await prisma_1.default.tuckshopSale.findMany({
            where: { schoolId },
            include: { item: true }
        });
        const itemStats = {};
        for (const sale of allSales) {
            if (!itemStats[sale.itemId]) {
                itemStats[sale.itemId] = { name: sale.item.name, units: 0, revenue: 0, stock: sale.item.stock };
            }
            itemStats[sale.itemId].units += sale.quantity;
            itemStats[sale.itemId].revenue += sale.totalAmount;
        }
        const topItems = Object.values(itemStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        res.json({ revenueToday, itemsSoldToday, topItems });
    }
    catch (error) {
        console.error('Fetch tuckshop reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});
exports.default = router;
//# sourceMappingURL=tuckshop.js.map