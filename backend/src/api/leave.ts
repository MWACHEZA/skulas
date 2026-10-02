import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// Helper to calculate days (simple implementation excluding weekends if desired, here just diff)
const calculateDays = (start: Date, end: Date) => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Ensure default balance exists
const ensureBalance = async (schoolId: string, userId: string, academicYear: string) => {
  let balance = await prisma.leaveBalance.findUnique({
    where: { schoolId_userId_academicYear: { schoolId, userId, academicYear } }
  });
  if (!balance) {
    balance = await prisma.leaveBalance.create({
      data: { schoolId, userId, academicYear }
    });
  }
  return balance;
};

router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const leaves = await prisma.staffLeave.findMany({
      where: { schoolId: req.user!.schoolId!, userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

router.get('/balance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const balance = await ensureBalance(req.user!.schoolId!, req.user!.id, new Date().getFullYear().toString());
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason, coverTeacherId, attachmentUrl, department } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = calculateDays(start, end);

    const year = start.getFullYear().toString();
    const balance = await ensureBalance(req.user!.schoolId!, req.user!.id, year);

    // Balance check
    const typeKey = `${leaveType.toLowerCase()}Total` as keyof typeof balance;
    const usedKey = `${leaveType.toLowerCase()}Used` as keyof typeof balance;
    
    if (balance[typeKey] !== undefined) {
      const remaining = (balance[typeKey] as number) - (balance[usedKey] as number);
      if (remaining < days) {
        return res.status(400).json({ error: `Insufficient ${leaveType} balance. You need ${days} days but have ${remaining} left.` });
      }
    }

    // Sick-leave document requirement: mandatory attachment for sick leave > 2 days
    if (leaveType.toLowerCase() === 'sick' && days > 2 && !attachmentUrl) {
      return res.status(400).json({ error: 'Medical certificate/document attachment is mandatory for sick leave exceeding 2 days.' });
    }

    const leave = await prisma.staffLeave.create({
      data: {
        schoolId: req.user!.schoolId!,
        userId: req.user!.id,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        coverTeacherId,
        attachmentUrl,
        department,
        days,
        status: 'pending_hod'
      }
    });
    await logAction(req, 'APPLY_LEAVE', 'StaffLeave', leave.id, { leaveType, days });
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
});

router.get('/department', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isHod = req.user!.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HOD'].includes(r.toUpperCase())) || req.user!.role === 'SCHOOL_ADMIN';
    if (!isHod) return res.status(403).json({ error: 'Not authorized' });

    // For non-admin HODs, filter by a department query param or their teacher record
    let departmentFilter: string | undefined;
    if (req.user!.role !== 'SCHOOL_ADMIN') {
      // Try to get department from Teacher record
      const teacher = await prisma.teacher.findFirst({
        where: { userId: req.user!.id, schoolId: req.user!.schoolId! },
        select: { department: true }
      });
      departmentFilter = teacher?.department || undefined;
    }

    const leaves = await prisma.staffLeave.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        status: 'pending_hod',
        ...(departmentFilter && { department: departmentFilter })
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department leaves' });
  }
});

router.patch('/:id/hod-approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isHod = req.user!.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HOD'].includes(r.toUpperCase())) || req.user!.role === 'SCHOOL_ADMIN';
    if (!isHod) return res.status(403).json({ error: 'Not authorized' });

    const id = req.params.id as string;
    const leave = await prisma.staffLeave.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.userId === req.user!.id) return res.status(403).json({ error: 'Cannot approve own leave' });

    // Clash detection
    const clashes = await prisma.staffLeave.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        department: leave.department,
        status: 'approved',
        startDate: { lte: leave.endDate },
        endDate: { gte: leave.startDate },
        id: { not: leave.id }
      }
    });

    const updated = await prisma.staffLeave.update({
      where: { id, schoolId: req.user!.schoolId! },
      data: {
        status: 'pending_head',
        hodApprovedAt: new Date(),
        hodApprovedById: req.user!.id
      }
    });
    res.json({ leave: updated, clashes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve leave' });
  }
});

router.patch('/:id/hod-reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isHod = req.user!.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HOD'].includes(r.toUpperCase())) || req.user!.role === 'SCHOOL_ADMIN';
    if (!isHod) return res.status(403).json({ error: 'Not authorized' });

    const id = req.params.id as string;
    const updated = await prisma.staffLeave.update({
      where: { id, schoolId: req.user!.schoolId! },
      data: {
        status: 'rejected',
        rejectionReason: req.body.reason
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});

router.get('/all', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const leaves = await prisma.staffLeave.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all leaves' });
  }
});

router.patch('/:id/approve', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const leave = await prisma.staffLeave.update({
      where: { id, schoolId: req.user!.schoolId! },
      data: { status: 'approved', approvedBy: req.user!.id, headApprovedAt: new Date() }
    });

    // Update balance
    const year = leave.startDate.getFullYear().toString();
    const usedKey = `${(leave.leaveType || 'annual').toLowerCase()}Used`;
    
    await prisma.leaveBalance.updateMany({
      where: { schoolId: req.user!.schoolId!, userId: leave.userId, academicYear: year },
      data: { [usedKey]: { increment: leave.days || 1 } }
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve leave' });
  }
});

router.patch('/:id/reject', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const leave = await prisma.staffLeave.update({
      where: { id, schoolId: req.user!.schoolId! },
      data: { status: 'rejected', rejectionReason: req.body.reason }
    });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Cover-teacher Suggestion based on Shared Timetable
// ─────────────────────────────────────────────────────────────────────────────
router.get('/suggest-cover', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { startDate, endDate, department } = req.query;

    // Find teachers in the same school/department
    const teachers = await prisma.user.findMany({
      where: {
        schoolId,
        role: 'TEACHER',
        isLocked: false,
        id: { not: req.user!.id }
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacher: { select: { id: true, department: true } }
      }
    });

    // Also check teachers who already have approved leaves overlapping these dates
    const busyTeachers = await prisma.staffLeave.findMany({
      where: {
        schoolId,
        status: 'approved',
        ...(startDate && endDate ? {
          startDate: { lte: new Date(endDate as string) },
          endDate: { gte: new Date(startDate as string) }
        } : {})
      },
      select: { userId: true }
    });
    const busyIds = new Set(busyTeachers.map(b => b.userId));

    const suggestions = teachers.map(t => ({
      userId: t.id,
      name: t.name,
      department: t.teacher?.department || 'General',
      isAvailable: !busyIds.has(t.id)
    })).sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to suggest cover teachers' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Bursar / Head Payroll Consequences View (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payroll-consequences', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const approvedLeaves = await prisma.staffLeave.findMany({
      where: {
        schoolId,
        status: 'approved'
      },
      orderBy: { startDate: 'desc' }
    });

    // Map each approved leave with computed salary impact
    // Policy defaults:
    //  - 'unpaid': Full pro-rated deduction (unpaid days * (basePay / 30))
    //  - 'sick': If days > 14 (configurable threshold, default 14), half-pay for days beyond 14
    //  - 'annual', 'maternity', 'study', etc.: Fully paid within policy
    const enrichedLeaves = await Promise.all(approvedLeaves.map(async (leave) => {
      const user = await prisma.user.findUnique({
        where: { id: leave.userId },
        select: {
          name: true,
          email: true,
          role: true,
          employeeProfile: { select: { basePay: true } }
        }
      });

      const basePay = user?.employeeProfile?.basePay || 0;
      const dailyRate = basePay > 0 ? basePay / 30 : 0;
      const days = leave.days || calculateDays(leave.startDate, leave.endDate);

      let impactType: 'PAID' | 'UNPAID_DEDUCTION' | 'HALF_PAY' = 'PAID';
      let estimatedDeduction = 0;

      const type = (leave.leaveType || '').toLowerCase();
      if (type === 'unpaid') {
        impactType = 'UNPAID_DEDUCTION';
        estimatedDeduction = days * dailyRate;
      } else if (type === 'sick' && days > 14) {
        impactType = 'HALF_PAY';
        const halfPayDays = days - 14;
        estimatedDeduction = halfPayDays * (dailyRate * 0.5);
      }

      return {
        ...leave,
        employeeName: user?.name || 'Staff Member',
        employeeEmail: user?.email,
        employeeRole: user?.role,
        basePay,
        days,
        impactType,
        estimatedDeduction: Math.round(estimatedDeduction * 100) / 100
      };
    }));

    res.json(enrichedLeaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave payroll consequences' });
  }
});

// Leave Calendar View for Head / Bursar to spot risky clustering
router.get('/calendar-view', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const leaves = await prisma.staffLeave.findMany({
      where: {
        schoolId,
        status: 'approved'
      },
      select: {
        id: true,
        userId: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        department: true,
        days: true
      }
    });

    const userIds = [...new Set(leaves.map(l => l.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const events = leaves.map(l => ({
      id: l.id,
      title: `${userMap.get(l.userId) || 'Staff'} (${l.leaveType})`,
      start: l.startDate,
      end: l.endDate,
      department: l.department,
      days: l.days
    }));

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave calendar' });
  }
});

export default router;
