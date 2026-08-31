import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { LedgerEvents } from '../services/ledger-events';

const router = Router();

router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// Helper — map a payment method string to the correct COA code
// ─────────────────────────────────────────────────────────────────────────────
function paymentAccountCode(paymentMethod: string): string {
  switch ((paymentMethod || '').toUpperCase()) {
    case 'WALLET':      return '3200'; // Student Deposits (liability reduced on spend)
    case 'CARD':
    case 'POS':         return '1130'; // Card / POS Terminal
    case 'MOBILE':
    case 'ECOCASH':     return '1120'; // Mobile Money Account
    case 'BANK':        return '1110'; // Bank Account (Main)
    case 'CASH':
    default:            return '1100'; // Cash on Hand
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/items  — list all tuckshop inventory items
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const items = await prisma.tuckshopItem.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Fetch tuckshop items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tuckshop/items  — create a new tuckshop item
// ─────────────────────────────────────────────────────────────────────────────
router.post('/items', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

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
  } catch (error) {
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

    const updateData: any = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);

    if (addStock !== undefined) {
      updateData.stock = { increment: parseInt(addStock) };
    } else if (stock !== undefined) {
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
      const item = await prisma.tuckshopItem.findUnique({ where: { id } });
      res.json(item);
    } else {
      const item = await prisma.tuckshopItem.update({
        where: { id },
        data: updateData
      });
      res.json(item);
    }
  } catch (error) {
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
router.post('/sales', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const { items, paymentMethod, studentId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const totalAmount: number = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    // ── STEP 1: Wallet balance check (before the DB transaction) ────────────
    if (paymentMethod === 'WALLET') {
      if (!studentId) {
        return res.status(400).json({ error: 'Student ID required for Wallet payment' });
      }
      // Compute balance on-the-fly from WalletTransaction rows — no balance column exists
      const walletBalance = await LedgerService.getWalletBalance(studentId);
      if (walletBalance < totalAmount) {
        return res.status(400).json({
          error: `Insufficient wallet balance. Available: ${walletBalance.toFixed(2)}, Required: ${totalAmount.toFixed(2)}`
        });
      }
    }

    // ── STEP 2: Atomic DB transaction — stock deduction + sale records ───────
    const { createdSales, walletId } = await prisma.$transaction(async (tx) => {
      let walletId: string | null = null;

      // Wallet: deduct via WalletTransaction (negative amount = PURCHASE)
      if (paymentMethod === 'WALLET') {
        const wallet = await tx.studentWallet.findUnique({ where: { studentId } });
        if (!wallet) throw new Error('Student wallet not found. Please contact the Bursar.');

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -totalAmount,        // negative = spend
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
          throw new Error(
            `Insufficient stock for "${dbItem?.name ?? item.itemId}". Available: ${dbItem?.stock ?? 0}`
          );
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

    // ── STEP 3: Post journal entries AFTER the transaction commits ───────────
    //
    // A) Revenue entry (one entry for the whole basket):
    //    DR  payment account (Cash/Card/Wallet Deposits)   [totalAmount]
    //    CR  5210 Tuckshop / Canteen Sales                 [totalAmount]
    //
    // B) COGS entry per item (or batched — we batch here for simplicity):
    //    DR  6110 COGS — Tuckshop                          [cost amount]
    //    CR  1310 Inventory — Tuckshop                     [cost amount]

    try {
      const payCode = paymentAccountCode(paymentMethod);
      const [payAccountId, salesIncomeId, cogsId, inventoryId] = await Promise.all([
        getAccountId(schoolId, payCode, prisma),
        getAccountId(schoolId, '5210', prisma),
        getAccountId(schoolId, '6110', prisma),
        getAccountId(schoolId, '1310', prisma)
      ]);

      const saleSourceId = createdSales[0]?.id ?? schoolId;

      // A) Revenue journal entry
      await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Tuckshop POS Sale — ${items.length} item(s) via ${paymentMethod || 'Cash'}`,
        sourceType: 'tuckshop_sale',
        sourceId: saleSourceId,
        createdByUserId: req.user?.id,
        lines: [
          {
            accountId: payAccountId,
            debit: totalAmount,
            description: `Payment via ${paymentMethod || 'Cash'}`,
            studentId: studentId || undefined
          },
          {
            accountId: salesIncomeId,
            credit: totalAmount,
            description: 'Tuckshop sales revenue'
          }
        ]
      });

      // B) COGS journal entry — compute total cost from item.cost (if provided) or price as proxy
      //    Best practice: tuckshop items should store a costPrice. We use it if available,
      //    otherwise fall back to 70% of selling price as a default cost estimate.
      const totalCost: number = items.reduce((sum: number, item: any) => {
        const costPerUnit = item.costPrice ?? item.price * 0.7;
        return sum + costPerUnit * item.quantity;
      }, 0);

      if (totalCost > 0) {
        await LedgerService.postEntry({
          schoolId,
          date: new Date(),
          description: `Tuckshop COGS — ${items.length} item(s)`,
          sourceType: 'tuckshop_cogs',
          sourceId: saleSourceId,
          createdByUserId: req.user?.id,
          lines: [
            {
              accountId: cogsId,
              debit: totalCost,
              description: 'Cost of tuckshop goods sold'
            },
            {
              accountId: inventoryId,
              credit: totalCost,
              description: 'Reduce tuckshop inventory at cost'
            }
          ]
        });
      }

      // Broadcast real-time ledger event
      LedgerEvents.broadcast({
        type: 'LEDGER_POSTED',
        schoolId,
        sourceType: 'tuckshop_sale',
        sourceId: saleSourceId,
        studentId: studentId || undefined,
        timestamp: new Date().toISOString()
      });

      // Also broadcast wallet update if paid by wallet
      if (paymentMethod === 'WALLET' && studentId) {
        LedgerEvents.broadcast({
          type: 'WALLET_UPDATED',
          schoolId,
          studentId,
          sourceType: 'tuckshop_sale',
          sourceId: saleSourceId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (ledgerErr) {
      // Ledger failure is logged but does NOT roll back the sale (sale already committed).
      // An admin can post a correcting JE manually via the Accounts module.
      console.error('[Ledger] Tuckshop sale JE failed — sale committed, JE pending:', ledgerErr);
    }

    res.json({ success: true, sales: createdSales });
  } catch (error: any) {
    console.error('POS Sale error:', error);
    res.status(400).json({ error: error.message || 'Failed to process sale' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/sales/recent
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sales/recent', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const sales = await prisma.tuckshopSale.findMany({
      where: { schoolId },
      orderBy: { soldAt: 'desc' },
      take: 20,
      include: { item: true }
    });
    res.json(sales);
  } catch (error) {
    console.error('Fetch recent sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tuckshop/reports
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reports', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySales = await prisma.tuckshopSale.findMany({
      where: { schoolId, soldAt: { gte: startOfToday } }
    });

    const revenueToday = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const itemsSoldToday = todaySales.reduce((acc, s) => acc + s.quantity, 0);

    const allSales = await prisma.tuckshopSale.findMany({
      where: { schoolId },
      include: { item: true }
    });

    const itemStats: Record<string, { name: string; units: number; revenue: number; stock: number }> = {};
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
  } catch (error) {
    console.error('Fetch tuckshop reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router;
