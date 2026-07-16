import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { PaymentMethodSchema, FeeGroupSchema, RevenueAllocationSchema } from '../schemas/finance.schema';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();

// ═══════════ PAYMENT METHODS ═══════════

router.get('/payment-methods', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const methods = await prisma.paymentMethod.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
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

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_PAYMENT_METHOD',
      entityType: 'PaymentMethod',
      entityId: method.id,
      details: { name: method.name },
      schoolId,
      ipAddress: req.ip
    });

    res.status(201).json(method);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Payment method already exists' });
    }
    res.status(400).json({ error: error.message || 'Failed to create payment method' });
  }
});

router.delete('/payment-methods/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;

    const method = await prisma.paymentMethod.findFirst({
      where: { id, schoolId }
    });

    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await prisma.paymentMethod.deleteMany({
      where: { id, schoolId }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'DELETE_PAYMENT_METHOD',
      entityType: 'PaymentMethod',
      entityId: id,
      details: { name: method.name },
      schoolId,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// ═══════════ REVENUE ALLOCATIONS ═══════════

router.get('/revenue-allocations', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const allocations = await prisma.revenueAllocation.findMany({
      where: { schoolId },
      include: {
        feeGroups: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch revenue allocations' });
  }
});

router.post('/revenue-allocations', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { feeGroupIds, ...rest } = RevenueAllocationSchema.parse(req.body);

    // If making this one active, deactivate others for the same period/year optionally
    // (User can manually toggle, but let's keep it simple for now)

    const allocation = await prisma.revenueAllocation.create({
      data: {
        ...rest,
        schoolId,
        feeGroups: {
          connect: feeGroupIds.map(id => ({ id }))
        }
      },
      include: {
        feeGroups: true
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_REVENUE_ALLOCATION',
      entityType: 'RevenueAllocation',
      entityId: allocation.id,
      details: { name: allocation.name },
      schoolId,
      ipAddress: req.ip
    });

    res.status(201).json(allocation);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create allocation' });
  }
});

router.patch('/revenue-allocations/:id/toggle', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;
    const { isActive } = req.body;

    const allocation = await prisma.revenueAllocation.update({
      where: { id, schoolId },
      data: { isActive }
    });

    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

export default router;
