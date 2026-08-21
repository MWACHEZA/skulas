import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import {
  UniformItemSchema,
  UniformStockOrderSchema,
  UniformSaleSchema,
  UniformSupplierPaymentSchema
} from '../schemas/uniforms.schema';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { LedgerEvents } from '../services/ledger-events';

const router = Router();

// ═══════════ UNIFORM ITEMS ═══════════

router.get('/items', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rawItems = await prisma.uniformItem.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });

    // Compute stock levels from movements (no more mutable stockLevel field)
    const stockLevels = await prisma.uniformStockMovement.groupBy({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch uniform items' });
  }
});

router.post('/items', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = UniformItemSchema.parse(req.body);

    const item = await prisma.uniformItem.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    res.status(201).json({ ...item, stockLevel: 0 });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create item' });
  }
});

router.patch('/items/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const validatedData = UniformItemSchema.partial().parse(req.body);

    const item = await prisma.uniformItem.updateMany({
      where: { id: id as string, schoolId },
      data: validatedData
    });

    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update item' });
  }
});

router.delete('/items/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;

    // Check stock level before deleting
    const stockLevel = await LedgerService.getStockLevel(id);
    if (stockLevel !== 0) {
      return res.status(400).json({
        error: `Cannot delete item with stock balance of ${stockLevel}. Adjust stock to zero first.`
      });
    }

    await prisma.uniformItem.deleteMany({ where: { id: id as string, schoolId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ═══════════ STOCK ORDERS ═══════════

router.get('/stock-orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userRole = req.user!.role;
    let where: any = { schoolId };

    if (userRole === 'SUPPLIER') {
      const supplier = await prisma.supplier.findFirst({ where: { userId: req.user!.id } });
      if (supplier) {
        where.supplierId = supplier.id;
      } else {
        return res.json([]);
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock orders' });
  }
});

router.post('/stock-orders', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
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
      const inventoryAccountId = await getAccountId(schoolId, '1300', tx as any);
      const apAccountId = await getAccountId(schoolId, '3110', tx as any);

      const je = await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Uniform stock purchase — Order #${order.id.slice(-6)}`,
        sourceType: 'uniform_purchase',
        sourceId: order.id,
        createdByUserId: req.user!.id,
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

      LedgerEvents.broadcast({
        type: 'STOCK_CHANGED',
        schoolId,
        sourceType: 'uniform_purchase',
        sourceId: order.id,
        timestamp: new Date().toISOString()
      });

      return order;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create stock order' });
  }
});

// ═══════════ SALES ═══════════

router.get('/sales', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userRole = req.user!.role;
    let where: any = { schoolId };

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: req.user!.id } });
      if (student) {
        where.studentId = student.id;
      } else {
        return res.json([]);
      }
    } else if (userRole === 'PARENT') {
      const parent = await prisma.parent.findFirst({ where: { userId: req.user!.id } });
      if (parent) {
        where.parentId = parent.id;
      } else {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/sales', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { items, ...rest } = UniformSaleSchema.parse(req.body);

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const result = await prisma.$transaction(async (tx) => {
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
      const cogsLines: { accountId: string; amount: number; description: string }[] = [];

      for (const item of items) {
        // Compute current stock from movements
        const currentStock = await LedgerService.getStockLevel(item.itemId);
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
      const cashAccountId = await getAccountId(schoolId, '1100', tx as any); // Cash on Hand
      const salesIncomeId = await getAccountId(schoolId, '5200', tx as any);  // Uniform Sales Income
      const cogsAccountId = await getAccountId(schoolId, '6100', tx as any);  // COGS — Uniforms
      const inventoryId = await getAccountId(schoolId, '1300', tx as any);    // Inventory — Uniforms

      // Post Entry 1: Revenue entry (Cash DR / Sales Income CR)
      const revenueJe = await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Uniform sale — ${items.length} item(s) to ${(rest as any).studentId ?? 'walk-in'}`,
        sourceType: 'uniform_sale',
        sourceId: sale.id,
        createdByUserId: req.user!.id,
        lines: [
          {
            accountId: cashAccountId,
            debit: totalAmount,
            description: 'Cash received for uniform sale',
            studentId: (rest as any).studentId
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
        await LedgerService.postEntry({
          schoolId,
          date: new Date(),
          description: `COGS — Uniform sale ${sale.id.slice(-6)}`,
          sourceType: 'cogs',
          sourceId: sale.id,
          createdByUserId: req.user!.id,
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

      LedgerEvents.broadcast({
        type: 'STOCK_CHANGED',
        schoolId,
        sourceType: 'uniform_sale',
        sourceId: sale.id,
        timestamp: new Date().toISOString()
      });

      return sale;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record sale' });
  }
});

/**
 * @route   POST /api/uniforms/sales/:id/return
 * @desc    [BURSAR/ADMIN] Process a uniform sale return with reversal entries
 */
router.post('/sales/:id/return', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;
    const { reason } = req.body;

    const sale = await prisma.uniformSale.findFirst({
      where: { id, schoolId },
      include: { items: { include: { item: true } } }
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const journalEntries = await prisma.journalEntry.findMany({
      where: { schoolId, sourceId: id, status: 'POSTED' }
    });

    if (journalEntries.length === 0) {
      return res.status(400).json({ error: 'No journal entries found for this sale' });
    }

    // Reverse all related journal entries
    const reversals = await Promise.all(
      journalEntries.map(je =>
        LedgerService.reverseEntry(je.id, reason || 'Uniform return', req.user!.id)
      )
    );

    // Record return stock movements
    await Promise.all(
      sale.items.map((saleItem: any) =>
        prisma.uniformStockMovement.create({
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
        })
      )
    );

    res.json({ success: true, reversalCount: reversals.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process return' });
  }
});

// ═══════════ SUPPLIER PAYMENTS ═══════════

router.get('/supplier-payments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userRole = req.user!.role;
    let where: any = { schoolId };

    if (userRole === 'SUPPLIER') {
      const supplier = await prisma.supplier.findFirst({ where: { userId: req.user!.id } });
      if (supplier) {
        where.supplierId = supplier.id;
      } else {
        return res.json([]);
      }
    }

    const payments = await prisma.uniformSupplierPayment.findMany({
      where,
      include: { supplier: { select: { id: true, companyName: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supplier payments' });
  }
});

router.post('/supplier-payments', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = UniformSupplierPaymentSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.uniformSupplierPayment.create({
        data: {
          ...validatedData,
          schoolId
        }
      });

      // Post: DR Uniform Supplier Payable / CR Bank Account
      const apAccountId = await getAccountId(schoolId, '3110', tx as any);
      const bankAccountId = await getAccountId(schoolId, '1110', tx as any);

      await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Supplier payment — ${payment.id.slice(-6)}`,
        sourceType: 'expense',
        sourceId: payment.id,
        createdByUserId: req.user!.id,
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
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record payment' });
  }
});

// ═══════════ SUPPLIERS (PROXY TO PROCUREMENT) ═══════════

router.get('/suppliers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const suppliers = await prisma.supplier.findMany({
      where: {
        schools: { some: { schoolId } }
      },
      include: {
        user: true
      }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { companyName, contactName, phone, email, address } = req.body;

    const result = await prisma.$transaction(async (tx) => {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create supplier' });
  }
});

export default router;
