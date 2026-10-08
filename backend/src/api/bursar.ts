import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { BursarService } from '../services/bursar.service';
import prisma from '../lib/prisma';
import { logAction } from '../utils/audit';

const router = Router();

// Enforce authentication for all bursar routes
router.use(requireAuth);

/**
 * @route   POST /api/bursar/invoices
 * @desc    [BURSAR/ADMIN] createStudentInvoice() — Central billing function
 *          Idempotent, transactional, double-entry posted to general ledger
 */
router.post('/invoices', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const {
      idempotencyKey,
      studentId,
      termId,
      term,
      year,
      currency,
      sourceModule,
      sourceId,
      dueDate,
      items,
      batchId
    } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey is required' });
    }
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invoice must contain at least one billing item' });
    }

    const result = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey,
      studentId,
      termId,
      term,
      year: year ? parseInt(year) : undefined,
      currency: currency || 'USD',
      sourceModule: sourceModule || 'bulk_billing',
      sourceId,
      dueDate,
      items,
      batchId,
      createdBy: req.user!.id
    });

    res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (error: any) {
    console.error('Create student invoice error:', error);
    res.status(400).json({ error: error.message || 'Failed to create student invoice' });
  }
});

/**
 * @route   GET /api/bursar/invoices
 * @desc    [BURSAR/ADMIN] List student invoices
 */
router.get('/invoices', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, status, sourceModule, term } = req.query;

    const invoices = await prisma.studentInvoice.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId: String(studentId) } : {}),
        ...(status ? { status: String(status) } : {}),
        ...(sourceModule ? { sourceModule: String(sourceModule) } : {}),
        ...(term ? { term: String(term) } : {})
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            boardingStatus: true,
            class: { select: { id: true, name: true } }
          }
        },
        items: true,
        allocations: {
          include: {
            receipt: {
              select: { id: true, receiptNumber: true, paymentMethod: true, createdAt: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    res.json(invoices);
  } catch (error: any) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

/**
 * @route   GET /api/bursar/invoices/:id
 * @desc    [BURSAR/ADMIN] Get single invoice by ID
 */
router.get('/invoices/:id', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;

    const invoice = await prisma.studentInvoice.findFirst({
      where: { id: String(id), schoolId },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            boardingStatus: true,
            class: { select: { id: true, name: true } }
          }
        },
        items: true,
        allocations: {
          include: {
            receipt: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error: any) {
    console.error('Fetch invoice error:', error);
    res.status(500).json({ error: 'Failed to retrieve invoice' });
  }
});

/**
 * @route   POST /api/bursar/receipts
 * @desc    [BURSAR/ADMIN] receivePayment() — Central receipting & payment allocation
 *          Multi-currency (USD/ZiG), optional ZIMRA fiscalisation, double-entry posted
 */
router.post('/receipts', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const {
      idempotencyKey,
      studentId,
      amount,
      paymentCurrency,
      invoiceCurrency,
      exchangeRate,
      paymentMethod,
      fiscalize,
      allocateStrategy,
      specificInvoiceId
    } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey is required' });
    }
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: 'paymentMethod is required' });
    }

    const result = await BursarService.receivePayment({
      schoolId,
      idempotencyKey,
      studentId,
      amount: Number(amount),
      paymentCurrency: paymentCurrency || 'USD',
      invoiceCurrency: invoiceCurrency || 'USD',
      exchangeRate: exchangeRate ? Number(exchangeRate) : 1.0,
      paymentMethod,
      receivedBy: req.user!.id,
      fiscalize: Boolean(fiscalize),
      allocateStrategy: allocateStrategy || 'oldest_first',
      specificInvoiceId
    });

    res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (error: any) {
    console.error('Receive payment error:', error);
    res.status(400).json({ error: error.message || 'Payment processing failed' });
  }
});

/**
 * @route   GET /api/bursar/receipts
 * @desc    [BURSAR/ADMIN] List receipts
 */
router.get('/receipts', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, paymentMethod } = req.query;

    const receipts = await prisma.receipt.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId: String(studentId) } : {}),
        ...(paymentMethod ? { paymentMethod: String(paymentMethod) } : {})
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            class: { select: { id: true, name: true } }
          }
        },
        allocations: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, totalAmount: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    res.json(receipts);
  } catch (error: any) {
    console.error('Fetch receipts error:', error);
    res.status(500).json({ error: 'Failed to retrieve receipts' });
  }
});

/**
 * @route   GET /api/bursar/receipts/:id
 * @desc    [BURSAR/ADMIN] Get receipt by ID for view/print
 */
router.get('/receipts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: { id: String(id), schoolId },
      include: {
        student: {
          include: {
            class: true,
            school: { select: { name: true, code: true, logoUrl: true, address: true, phone: true } }
          }
        },
        allocations: {
          include: {
            invoice: true
          }
        }
      }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error: any) {
    console.error('Fetch receipt error:', error);
    res.status(500).json({ error: 'Failed to retrieve receipt' });
  }
});

/**
 * @route   GET /api/bursar/students-balance
 * @desc    [BURSAR/ADMIN] Get derived student balances (Invoices - Allocations)
 *          Never written directly; strictly derived.
 */
router.get('/students-balance', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const balances = await BursarService.getAllStudentBalances(schoolId);
    res.json(balances);
  } catch (error: any) {
    console.error('Get students balance error:', error);
    res.status(500).json({ error: 'Failed to derive student balances' });
  }
});

/**
 * @route   GET /api/bursar/students-balance/:studentId
 * @desc    [BURSAR/ADMIN/PARENT/STUDENT] Get single student derived balance
 */
router.get('/students-balance/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId } = req.params;

    const balance = await BursarService.getStudentBalance(schoolId, String(studentId));
    res.json(balance);
  } catch (error: any) {
    console.error('Get single student balance error:', error);
    res.status(404).json({ error: error.message || 'Student balance not found' });
  }
});

/**
 * @route   GET /api/bursar/defaulters
 * @desc    [BURSAR/ADMIN] Defaulters Aging: 0-30, 31-60, 61-90, 90+ days
 */
router.get('/defaulters', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const aging = await BursarService.getDefaultersAging(schoolId);
    res.json(aging);
  } catch (error: any) {
    console.error('Get defaulters error:', error);
    res.status(500).json({ error: 'Failed to calculate defaulters aging' });
  }
});

/**
 * @route   POST /api/bursar/bulk-invoices
 * @desc    [BURSAR/ADMIN] Term Bulk Invoicing: executes per-student calls with idempotency keys
 */
router.post('/bulk-invoices', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { batchName, term, year, dueDate, billingItems, studentIds } = req.body;

    if (!batchName || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'batchName and studentIds are required' });
    }
    if (!billingItems || !Array.isArray(billingItems) || billingItems.length === 0) {
      return res.status(400).json({ error: 'billingItems are required' });
    }

    const batchId = `BATCH-${Date.now()}`;
    const results: any[] = [];
    let successCount = 0;
    let duplicateCount = 0;

    for (const studentId of studentIds) {
      const idempotencyKey = `bulk_${batchId}_${studentId}`;
      try {
        const invResult = await BursarService.createStudentInvoice({
          schoolId,
          idempotencyKey,
          studentId,
          term: term || 'Term 1',
          year: year ? parseInt(year) : new Date().getFullYear(),
          sourceModule: 'bulk_billing',
          sourceId: batchId,
          dueDate,
          items: billingItems,
          createdBy: req.user!.id,
          batchId
        });

        if (invResult.isDuplicate) {
          duplicateCount++;
        } else {
          successCount++;
        }
        results.push({ studentId, invoiceNumber: invResult.invoice.invoiceNumber, success: true });
      } catch (stErr: any) {
        results.push({ studentId, error: stErr.message, success: false });
      }
    }

    await logAction(
      req,
      'POST_TERM_BULK_INVOICES',
      'BatchInvoice',
      batchId,
      { batchName, totalStudents: studentIds.length, successCount, duplicateCount }
    );

    res.json({
      batchId,
      batchName,
      totalStudents: studentIds.length,
      successCount,
      duplicateCount,
      details: results
    });
  } catch (error: any) {
    console.error('Bulk invoices error:', error);
    res.status(500).json({ error: error.message || 'Mass billing operation failed' });
  }
});

/**
 * @route   GET /api/bursar/billing-structures
 * @desc    [BURSAR/ADMIN] Get billing structures with module tags & accounts
 */
router.get('/billing-structures', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const structures = await prisma.feeGroup.findMany({
      where: { schoolId },
      include: { classAmounts: { include: { class: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(structures);
  } catch (error: any) {
    console.error('Get billing structures error:', error);
    res.status(500).json({ error: 'Failed to retrieve billing structures' });
  }
});

/**
 * @route   POST /api/bursar/billing-structures
 * @desc    [BURSAR/ADMIN] Create or update a billing structure item
 */
router.post('/billing-structures', requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const {
      name,
      amount,
      year = new Date().getFullYear(),
      billingType = 'Termly',
      itemCode,
      revenueAccountCode = '4010',
      applicableTo = 'ALL',
      frequency = 'TERMLY',
      module = 'core'
    } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({ error: 'Name and amount are required' });
    }

    const structure = await prisma.feeGroup.create({
      data: {
        schoolId,
        name,
        amount: Number(amount),
        year: parseInt(year),
        billingType,
        itemCode: itemCode || null,
        revenueAccountCode,
        applicableTo,
        frequency,
        module
      }
    });

    res.status(201).json(structure);
  } catch (error: any) {
    console.error('Create billing structure error:', error);
    res.status(500).json({ error: error.message || 'Failed to create billing structure' });
  }
});

export default router;
