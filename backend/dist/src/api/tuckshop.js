"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../generated/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.requireAuth);
// Get all inventory items
router.get('/items', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const items = await prisma.tuckshopItem.findMany({
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
// Create a new inventory item
router.post('/items', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { name, category, price, stock } = req.body;
        const item = await prisma.tuckshopItem.create({
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
// Update item (restock or edit)
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
            const updateResult = await prisma.tuckshopItem.updateMany({
                where: { id, updatedAt: new Date(updatedAt) },
                data: updateData
            });
            if (updateResult.count === 0) {
                return res.status(409).json({ error: 'Item was updated by another user. Please refresh and try again.' });
            }
            // Fetch the updated item to return
            const item = await prisma.tuckshopItem.findUnique({ where: { id } });
            res.json(item);
        }
        else {
            const item = await prisma.tuckshopItem.update({
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
// Process a Sale (POS Checkout)
router.post('/sales', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { items, paymentMethod, studentId } = req.body; // items: [{ itemId, quantity, price }]
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const saleResult = await prisma.$transaction(async (tx) => {
            // 1. Process Payment if Wallet is used
            let referenceId = null;
            if (paymentMethod === 'WALLET') {
                if (!studentId)
                    throw new Error('Student ID required for Wallet payment');
                let wallet = await tx.studentWallet.findUnique({ where: { studentId } });
                if (!wallet) {
                    throw new Error('Wallet not found');
                }
                // Deduct from wallet atomically
                const updateResult = await tx.studentWallet.updateMany({
                    where: { studentId, balance: { gte: totalAmount } },
                    data: { balance: { decrement: totalAmount } }
                });
                if (updateResult.count === 0) {
                    throw new Error('Insufficient wallet balance');
                }
                const txRecord = await tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: -totalAmount,
                        type: 'PURCHASE',
                        description: 'Tuckshop / Uniform POS Purchase'
                    }
                });
                referenceId = txRecord.id;
            }
            // 2. Record the Sales and Deduct Inventory
            const createdSales = [];
            for (const item of items) {
                // Deduct stock atomically and strictly fail if insufficient
                const stockUpdate = await tx.tuckshopItem.updateMany({
                    where: { id: item.itemId, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } }
                });
                if (stockUpdate.count === 0) {
                    throw new Error(`Insufficient stock for item ID: ${item.itemId}`);
                }
                // Create sale record
                const sale = await tx.tuckshopSale.create({
                    data: {
                        itemId: item.itemId,
                        quantity: item.quantity,
                        totalAmount: item.price * item.quantity,
                        schoolId,
                        studentId
                    }
                });
                // Link wallet transaction to one of the sale records if using Wallet
                if (referenceId) {
                    await tx.walletTransaction.update({
                        where: { id: referenceId },
                        data: { referenceId: sale.id, referenceType: 'TUCKSHOP_SALE' }
                    });
                    referenceId = null; // Only link to the first item for simplicity, or we could link to a new Receipt model
                }
                createdSales.push(sale);
            }
            return createdSales;
        });
        res.json({ success: true, sales: saleResult });
    }
    catch (error) {
        console.error('POS Sale error:', error);
        res.status(400).json({ error: error.message || 'Failed to process sale' });
    }
});
// Fetch recent sales
router.get('/sales/recent', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const sales = await prisma.tuckshopSale.findMany({
            where: { schoolId },
            orderBy: { soldAt: 'desc' },
            take: 20,
            include: {
                item: true
            }
        });
        res.json(sales);
    }
    catch (error) {
        console.error('Fetch recent sales error:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});
// Fetch reports/analytics
router.get('/reports', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        // Revenue today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todaySales = await prisma.tuckshopSale.findMany({
            where: { schoolId, soldAt: { gte: startOfToday } }
        });
        const revenueToday = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
        const itemsSoldToday = todaySales.reduce((acc, s) => acc + s.quantity, 0);
        // Top performing items
        const allSales = await prisma.tuckshopSale.findMany({
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
        res.json({
            revenueToday,
            itemsSoldToday,
            topItems
        });
    }
    catch (error) {
        console.error('Fetch tuckshop reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});
exports.default = router;
//# sourceMappingURL=tuckshop.js.map