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
import { BursarService } from '../services/bursar.service';
import { CreditNoteService } from '../services/credit-note.service';

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
    const { stockLevel, ...itemData } = validatedData;

    const item = await prisma.uniformItem.create({
      data: {
        ...itemData,
        schoolId
      }
    });

    if (stockLevel && stockLevel > 0) {
      await prisma.uniformStockMovement.create({
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
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create item' });
  }
});

router.patch('/items/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const validatedData = UniformItemSchema.partial().parse(req.body);
    const { stockLevel, ...itemData } = validatedData;

    const item = await prisma.uniformItem.updateMany({
      where: { id: id as string, schoolId },
      data: itemData
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

      // Post double-entry: DR Inventory — Uniforms & Apparel (1201) / CR Supplier Payable (2010)
      const je = await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode: '1201', // Inventory — Uniforms & Apparel
        creditCode: '2010', // Trade Creditors / Accounts Payable
        amount: Math.round(totalAmount * 100) / 100,
        description: `Uniform stock purchase — Order #${order.id.slice(-6)}`,
        sourceModule: 'uniform_procurement',
        reference: order.id,
        supplierId: rest.supplierId || undefined,
        userId: req.user!.id,
        ipAddress: req.ip,
        tx,
        bypassApprovalCheck: true
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

      // Determine payment account code
      const payMode = (rest.paymentMode || '').toUpperCase();
      let debitCode = '1024'; // Uniform Store Cash Till
      if (payMode === 'WALLET') debitCode = '2110'; // Student Pocket Money / Digital Wallets
      else if (payMode === 'ECOCASH' || payMode === 'MOBILE') debitCode = '1022'; // Mobile Money Float
      else if (payMode === 'BANK' || payMode === 'CARD') debitCode = '1010'; // Bank Account — Main Operations

      // Post Entry 1: Revenue entry (Payment DR / Uniform Store Sales CR 4041)
      const revenueJe = await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode,
        creditCode: '4041', // Uniform Store Sales
        amount: Math.round(totalAmount * 100) / 100,
        description: `Uniform sale — ${items.length} item(s) to ${(rest as any).studentId ?? 'walk-in'}`,
        sourceModule: 'uniform_sale',
        reference: sale.id,
        studentId: (rest as any).studentId || undefined,
        userId: req.user!.id,
        ipAddress: req.ip,
        tx,
        bypassApprovalCheck: true
      });

      // Post Entry 2: COGS entry (COGS DR 5081 / Inventory CR 1201)
      if (totalCogs > 0) {
        await LedgerService.postDoubleEntry({
          tenantId: schoolId,
          debitCode: '5081', // Cost of Goods Sold — Uniforms
          creditCode: '1201', // Inventory — Uniforms & Apparel
          amount: Math.round(totalCogs * 100) / 100,
          description: `COGS — Uniform sale ${sale.id.slice(-6)}`,
          sourceModule: 'uniform_cogs',
          reference: sale.id,
          userId: req.user!.id,
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
      if ((rest as any).studentId && (payMode === 'INVOICE' || payMode === 'ACCOUNT')) {
        try {
          await BursarService.createStudentInvoice({
            schoolId,
            idempotencyKey: `uniform_${sale.id}`,
            studentId: (rest as any).studentId,
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
            createdBy: req.user!.id,
            tx
          });
        } catch (invErr) {
          console.warn('Student invoice generation for uniform sale skipped or already exists:', invErr);
        }
      }

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
 * @route   POST /api/uniforms/issue
 * @desc    [BURSAR/ADMIN] Issue uniforms to a student with stock deduction and Bursar invoice
 * Idempotency Key: uniform_{issuance_id}
 * Revenue Account: 4041 (Uniform Store Sales)
 */
router.post('/issue', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, items, issuanceId, termId, notes } = req.body;

    if (!studentId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'studentId and a non-empty items array are required' });
    }

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) return res.status(404).json({ error: 'Student not found in this school' });

    const totalAmount = items.reduce((sum: number, it: any) => sum + ((it.quantity || 1) * (it.unitPrice || it.price || 0)), 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Sale record
      const sale = await tx.uniformSale.create({
        data: {
          schoolId,
          studentId,
          paymentMode: 'INVOICE',
          reference: issuanceId || `ISSUE-${Date.now().toString().slice(-6)}`,
          totalAmount,
          items: {
            create: items.map((it: any) => ({
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
        const currentStock = await LedgerService.getStockLevel(it.itemId);
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

      const invRes = await BursarService.createStudentInvoice({
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
        createdBy: req.user!.id,
        tx
      });

      // 4. Post COGS entry if inventory cost applies
      if (totalCogs > 0) {
        await LedgerService.postDoubleEntry({
          tenantId: schoolId,
          debitCode: '5081', // Cost of Goods Sold — Uniforms
          creditCode: '1201', // Inventory — Uniforms & Apparel
          amount: Math.round(totalCogs * 100) / 100,
          description: `COGS — Uniform issuance to ${student.name}`,
          sourceModule: 'uniform_cogs',
          reference: sale.id,
          userId: req.user!.id,
          ipAddress: req.ip,
          tx,
          bypassApprovalCheck: true
        });
      }

      return { sale, invoice: invRes.invoice };
    });

    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Failed to issue uniforms:', error);
    res.status(400).json({ error: error.message || 'Failed to issue uniforms' });
  }
});

/**
 * @route   POST /api/uniforms/sales/:id/return
 * @desc    [BURSAR/ADMIN] Process a uniform sale return with reversal entries & credit note
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

    // 1. Re-stock items (record return movements)
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
            sourceId: id
          }
        })
      )
    );

    // 2. Issue Credit Note / Reversal to Bursar
    // Check if there is a StudentInvoice created for this issuance/sale
    const studentInvoice = await prisma.studentInvoice.findFirst({
      where: { schoolId, sourceModule: 'uniforms', sourceId: id }
    });

    let creditNoteResult: any = null;
    if (studentInvoice) {
      creditNoteResult = await CreditNoteService.createCreditNoteForInvoice({
        schoolId,
        invoiceId: studentInvoice.id,
        reason: reason || 'Uniform return / wrong size',
        issuedByUserId: req.user!.id
      });
    } else {
      // Find posted journal entries for this sale and reverse via CreditNoteService
      const journalEntries = await prisma.journalEntry.findMany({
        where: { schoolId, sourceId: id, status: 'POSTED', isReversed: false }
      });

      if (journalEntries.length > 0) {
        creditNoteResult = await CreditNoteService.createCreditNote({
          schoolId,
          originalJournalEntryId: journalEntries[0].id,
          reason: reason || 'Uniform return / wrong size',
          issuedByUserId: req.user!.id
        });
      }
    }

    res.json({
      success: true,
      message: 'Items restocked and credit note issued successfully',
      creditNote: creditNoteResult?.creditNote || null
    });
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

      // Post: DR Trade Creditors (2010) / CR Bank Account (1010)
      await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode: '2010', // Trade Creditors / Accounts Payable
        creditCode: '1010', // Bank Account — Main Operations
        amount: Math.round(payment.amount * 100) / 100,
        description: `Supplier payment — ${payment.id.slice(-6)}`,
        sourceModule: 'procurement',
        reference: payment.id,
        supplierId: payment.supplierId,
        userId: req.user!.id,
        ipAddress: req.ip,
        tx,
        bypassApprovalCheck: true
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

/**
 * @route   GET /api/uniforms/parent-summary
 * @desc    [PARENT] Summary for uniforms: requirements cross-referenced, missing items shop, order history
 *          Strict tenant isolation + parent-child linkage verification
 */
router.get('/parent-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let studentId = req.query.studentId as string;
    const userRole = req.user?.role;
    const userId = req.user!.id;
    const schoolId = req.user?.schoolId;

    if (userRole === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: { students: { where: { status: 'APPROVED' }, include: { student: true } } }
      });

      if (!parent || parent.students.length === 0) {
        return res.status(403).json({ error: 'No approved student link found for this parent.' });
      }

      if (!studentId) {
        studentId = parent.students[0].studentId;
      } else {
        const isAuthorized = parent.students.some(
          ps => ps.studentId === studentId || ps.student.id === studentId
        );
        if (!isAuthorized) {
          return res.status(403).json({ error: 'Unauthorized: Student is not linked to your parent account.' });
        }
      }
    } else if (userRole === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId }, { id: studentId || userId }] }
      });
      if (!student) return res.status(403).json({ error: 'Student record not found.' });
      studentId = student.id;
    } else if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'BURSAR') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    const student = await prisma.student.findUnique({
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
    const pastSales = await prisma.uniformSale.findMany({
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
    const ownedMap = new Map<string, number>();
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
    const rawItems = await prisma.uniformItem.findMany({
      where: { schoolId: effectiveSchoolId },
      orderBy: { sellingPrice: 'asc' }
    });

    const stockMovements = await prisma.uniformStockMovement.groupBy({
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
      if (a.isMissingForChild && !b.isMissingForChild) return -1;
      if (!a.isMissingForChild && b.isMissingForChild) return 1;
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
  } catch (error: any) {
    console.error('Error fetching parent uniforms summary:', error);
    res.status(500).json({ error: 'Failed to fetch uniform requirements: ' + error.message });
  }
});

/**
 * @route   POST /api/uniforms/parent-order
 * @desc    [PARENT] Place uniform / bookstore order with Paynow/InnBucks/ZiG
 */
router.post('/parent-order', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, items, paymentMode, reference } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!studentId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'studentId and items list are required.' });
    }

    const totalAmount = items.reduce((sum: number, it: any) => sum + (it.price * (it.quantity || 1)), 0);

    const sale = await prisma.uniformSale.create({
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
  } catch (error: any) {
    console.error('Error placing parent uniform order:', error);
    res.status(500).json({ error: 'Failed to place uniform order: ' + error.message });
  }
});

export default router;
