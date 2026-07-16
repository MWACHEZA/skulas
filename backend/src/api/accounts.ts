import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { 
  AccountCategorySchema, 
  LiabilitySchema, 
  IncomeSchema, 
  ExpenseSchema,
  PaymentMethodSchema
} from '../schemas/accounts.schema';

const router = Router();

// ═══════════ CATEGORIES ═══════════

router.get('/categories', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const categories = await prisma.accountCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = AccountCategorySchema.parse(req.body);

    const category = await prisma.accountCategory.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category already exists for this type' });
    }
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
});

router.delete('/categories/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;

    await prisma.accountCategory.deleteMany({
      where: { id: id as string, schoolId }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category. Ensure no records are linked to it.' });
  }
});

// ═══════════ LIABILITIES ═══════════

router.get('/liabilities', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const liabilities = await prisma.liability.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: { date: 'desc' }
    });
    res.json(liabilities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch liabilities' });
  }
});

router.post('/liabilities', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = LiabilitySchema.parse(req.body);

    const liability = await prisma.liability.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    res.status(201).json(liability);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create liability' });
  }
});

router.patch('/liabilities/:id/settle', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const schoolId = req.user!.schoolId!;

    const liability = await prisma.liability.findFirst({
      where: { id: id as string, schoolId }
    });

    if (!liability) return res.status(404).json({ error: 'Liability not found' });

    const newSettled = liability.settled + amount;
    let status = 'Partially Settled';
    if (newSettled >= liability.amount) status = 'Settled';

    const updated = await prisma.liability.updateMany({
      where: { id: id as string, schoolId },
      data: {
        settled: newSettled,
        status
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to settle liability' });
  }
});

router.patch('/liabilities/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const validatedData = LiabilitySchema.partial().parse(req.body);

    const liability = await prisma.liability.updateMany({
      where: { id: id as string, schoolId },
      data: validatedData
    });

    res.json(liability);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update liability' });
  }
});

router.delete('/liabilities/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    await prisma.liability.deleteMany({ where: { id: id as string, schoolId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete liability' });
  }
});

// ═══════════ INCOME ═══════════

router.get('/income', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const incomes = await prisma.income.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: { date: 'desc' }
    });
    res.json(incomes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch income' });
  }
});

router.post('/income', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = IncomeSchema.parse(req.body);

    const income = await prisma.income.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    res.status(201).json(income);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record income' });
  }
});

router.patch('/income/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const validatedData = IncomeSchema.partial().parse(req.body);

    const income = await prisma.income.updateMany({
      where: { id: id as string, schoolId },
      data: validatedData
    });

    res.json(income);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update income' });
  }
});

router.delete('/income/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    await prisma.income.deleteMany({ where: { id: id as string, schoolId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete income' });
  }
});

// ═══════════ EXPENSES ═══════════

router.get('/expenses', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const expenses = await prisma.expense.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/expenses', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = ExpenseSchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    res.status(201).json(expense);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record expense' });
  }
});

router.patch('/expenses/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const validatedData = ExpenseSchema.partial().parse(req.body);

    const expense = await prisma.expense.updateMany({
      where: { id: id as string, schoolId },
      data: validatedData
    });

    res.json(expense);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update expense' });
  }
});

router.delete('/expenses/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    await prisma.expense.deleteMany({ where: { id: id as string, schoolId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// ═══════════ PAYMENT METHODS (BANKING/MOBILE) ═══════════

router.get('/payment-methods', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const methods = await prisma.paymentMethod.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

router.post('/payment-methods', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = PaymentMethodSchema.parse(req.body);

    const method = await prisma.paymentMethod.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    res.status(201).json(method);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create payment method' });
  }
});

router.patch('/payment-methods/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const validatedData = PaymentMethodSchema.partial().parse(req.body);

    const method = await prisma.paymentMethod.updateMany({
      where: { id: id as string, schoolId },
      data: validatedData
    });

    res.json(method);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payment method' });
  }
});

router.delete('/payment-methods/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    await prisma.paymentMethod.deleteMany({ where: { id: id as string, schoolId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

export default router;
