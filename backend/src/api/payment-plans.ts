import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';

const router = Router();

// Helper to generate installments
function generateInstallments(totalAmount: number, count: number, startDate: Date, planType: string) {
  const installments = [];
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  const remainder = Math.round((totalAmount - (baseAmount * count)) * 100) / 100;
  
  let currentDueDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? baseAmount + remainder : baseAmount;

    installments.push({
      amount: Number(amount.toFixed(2)),
      dueDate: new Date(currentDueDate),
      status: 'PENDING'
    });

    if (planType === 'weekly') {
      currentDueDate.setDate(currentDueDate.getDate() + 7);
    } else if (planType === 'monthly') {
      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    } else {
      currentDueDate.setDate(currentDueDate.getDate() + 14);
    }
  }

  return installments;
}

// 1. Create a payment plan
router.post('/', requireAuth, requireRole('PARENT', 'SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, totalAmount, planType, installmentsCount, startDate } = req.body;

    if (!studentId || !totalAmount || !planType || !installmentsCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const generatedInstallments = generateInstallments(Number(totalAmount), Number(installmentsCount), start, planType);

    const plan = await prisma.paymentPlan.create({
      data: {
        schoolId: req.user!.schoolId!,
        studentId,
        parentUserId: req.user!.role === 'PARENT' ? req.user!.id : undefined,
        totalAmount: Number(totalAmount),
        planType,
        installmentsCount: Number(installmentsCount),
        status: 'ACTIVE',
        installments: {
          create: generatedInstallments
        }
      },
      include: {
        installments: true,
        student: true
      }
    });

    res.json(plan);
  } catch (error) {
    console.error('Error creating payment plan:', error);
    res.status(500).json({ error: 'Failed to create payment plan' });
  }
});

// 2. Fetch all payment plans
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.paymentPlan.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        installments: true,
        student: { select: { name: true, studentId: true, class: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check for default (14 days overdue)
    const today = new Date();
    
    const updatedPlans = await Promise.all(plans.map(async (plan) => {
      if (plan.status !== 'ACTIVE') return plan;

      let isDefaulted = false;
      let overdueUpdated = false;

      const updatedInstallments = await Promise.all(plan.installments.map(async (inst) => {
        if (inst.status === 'PENDING' && today > new Date(inst.dueDate)) {
          const diffTime = Math.abs(today.getTime() - new Date(inst.dueDate).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays > 14) {
            isDefaulted = true;
          }

          const updatedInst = await prisma.paymentPlanInstallment.update({
            where: { id: inst.id },
            data: { status: 'OVERDUE' }
          });
          overdueUpdated = true;
          return updatedInst;
        }
        return inst;
      }));

      if (isDefaulted) {
        const updatedPlan = await prisma.paymentPlan.update({
          where: { id: plan.id },
          data: { status: 'DEFAULTED' },
          include: { installments: true, student: { select: { name: true, studentId: true, class: true } } }
        });
        return updatedPlan;
      }

      if (overdueUpdated) {
        return { ...plan, installments: updatedInstallments };
      }

      return plan;
    }));

    res.json(updatedPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch payment plans' });
  }
});

// 3. Helper for CBT Exam Block
export const isPaymentPlanDefaulted = async (studentId: string): Promise<boolean> => {
  const plan = await prisma.paymentPlan.findFirst({
    where: { 
      studentId, 
      status: 'DEFAULTED' 
    }
  });
  return !!plan;
};

router.get('/defaulted/:studentId', requireAuth, async (req: AuthRequest, res: Response) => {
  const isDefaulted = await isPaymentPlanDefaulted(req.params.studentId as string);
  res.json({ defaulted: isDefaulted });
});

// 4. Pay Installment
router.post('/installments/:id/pay', requireAuth, requireRole('PARENT', 'SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { paymentMethod, reference } = req.body;

    const installment = await prisma.paymentPlanInstallment.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!installment) return res.status(404).json({ error: 'Installment not found' });
    if (installment.status === 'PAID') return res.status(400).json({ error: 'Already paid' });
    if (installment.plan.schoolId !== req.user!.schoolId!) return res.status(403).json({ error: 'Unauthorized' });

    // Mark as paid
    const updatedInst = await prisma.paymentPlanInstallment.update({
      where: { id },
      data: { status: 'PAID' }
    });

    // Post to ledger if LedgerService exists
    try {
      if (LedgerService && LedgerService.postDoubleEntry) {
         await LedgerService.postDoubleEntry({
            tenantId: req.user!.schoolId!,
            amount: installment.amount,
            debitCode: '1010', // Cash / Bank
            creditCode: '1200', // Accounts Receivable (Students)
            sourceModule: 'fees',
            studentId: installment.plan.studentId,
            reference: reference || `Installment payment ${id}`,
            description: `Payment plan installment ${id} for student ${installment.plan.studentId}`,
            userId: req.user!.id,
            date: new Date()
         });
      }
    } catch (e) {
      console.warn('Ledger error on installment pay', e);
    }

    // Check if all paid
    const allInstallments = await prisma.paymentPlanInstallment.findMany({ where: { planId: installment.planId } });
    if (allInstallments.every((i: any) => i.status === 'PAID')) {
      await prisma.paymentPlan.update({
        where: { id: installment.planId },
        data: { status: 'COMPLETED' }
      });
    }

    res.json(updatedInst);
  } catch (error) {
    console.error('Error paying installment:', error);
    res.status(500).json({ error: 'Failed to pay' });
  }
});

// 5. Admin payment plans view (ManagePaymentPlans.tsx)
router.get('/admin', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.paymentPlan.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        installments: { orderBy: { dueDate: 'asc' } },
        student: { select: { id: true, name: true, studentId: true, class: { select: { name: true } } } },
        parentUser: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = plans.map(p => {
      const firstPending = p.installments.find(i => i.status === 'PENDING') || p.installments[0];
      return {
        id: p.id,
        amount: p.totalAmount,
        dueDate: firstPending ? firstPending.dueDate.toISOString() : p.createdAt.toISOString(),
        status: p.status,
        notes: `${p.planType} payment plan (${p.installmentsCount} installments)`,
        createdAt: p.createdAt.toISOString(),
        student: {
          name: p.student?.name || 'Student',
          studentId: p.student?.studentId || p.studentId,
          class: p.student?.class || { name: 'General' }
        },
        parentUser: {
          name: p.parentUser?.name || 'Parent/Guardian',
          email: p.parentUser?.email || ''
        },
        installments: p.installments
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching admin payment plans:', error);
    res.status(500).json({ error: 'Failed to fetch payment plans' });
  }
});

// 6. Update payment plan status
router.patch('/:id/status', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const plan = await prisma.paymentPlan.update({
      where: { id: id as string },
      data: { status }
    });
    res.json(plan);
  } catch (error) {
    console.error('Error updating payment plan status:', error);
    res.status(500).json({ error: 'Failed to update plan status' });
  }
});

// In-memory template store per school with standard default templates
const templatesStore = new Map<string, any[]>([
  ['default', [
    { id: 'tmpl-1', name: 'Three-Term Equal Split', amount: 450, dueDate: null, notes: 'Standard 3-installment termly payment agreement' },
    { id: 'tmpl-2', name: 'Monthly Installment Plan', amount: 150, dueDate: null, notes: 'Monthly recurring plan across academic term' },
    { id: 'tmpl-3', name: 'Boarding & Tuition Bi-Weekly', amount: 300, dueDate: null, notes: 'Bi-weekly residential boarder settlement' }
  ]]
]);

// 7. Get templates
router.get('/templates', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const tmpls = templatesStore.get(schoolId) || templatesStore.get('default') || [];
  res.json(tmpls);
});

// 8. Create or update template
router.post('/templates', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const { id, name, amount, dueDate, notes } = req.body;
  const current = templatesStore.get(schoolId) || [...(templatesStore.get('default') || [])];

  if (id) {
    const idx = current.findIndex(t => t.id === id);
    if (idx !== -1) {
      current[idx] = { id, name, amount: Number(amount), dueDate, notes };
    } else {
      current.push({ id, name, amount: Number(amount), dueDate, notes });
    }
  } else {
    current.push({
      id: `tmpl-${Date.now()}`,
      name,
      amount: Number(amount),
      dueDate,
      notes
    });
  }

  templatesStore.set(schoolId, current);
  res.json({ success: true, templates: current });
});

// 9. Delete template
router.delete('/templates/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const { id } = req.params;
  const current = (templatesStore.get(schoolId) || templatesStore.get('default') || []).filter(t => t.id !== id);
  templatesStore.set(schoolId, current);
  res.json({ success: true, templates: current });
});

export default router;

