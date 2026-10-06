import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// Zimbabwe statutory public holidays defaults
const getZimbabwePublicHolidays = (year: number): Set<string> => {
  return new Set([
    `${year}-01-01`, // New Year's Day
    `${year}-02-21`, // Robert Gabriel Mugabe National Youth Day
    `${year}-04-18`, // Independence Day
    `${year}-05-01`, // Workers' Day
    `${year}-05-25`, // Africa Day
    `${year}-08-10`, // Heroes' Day
    `${year}-08-11`, // Defense Forces Day
    `${year}-12-22`, // National Unity Day
    `${year}-12-25`, // Christmas Day
    `${year}-12-26`, // Boxing Day
  ]);
};

// Working-day calculator: auto-computes leave days excluding weekends and public holidays
export const calculateWorkingDays = (start: Date, end: Date, customHolidays?: Set<string>): number => {
  const year = start.getFullYear();
  const holidays = customHolidays || getZimbabwePublicHolidays(year);
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const finish = new Date(end);
  finish.setHours(0, 0, 0, 0);

  while (cur <= finish) {
    const dayOfWeek = cur.getDay(); // 0 = Sun, 6 = Sat
    const dateStr = cur.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count > 0 ? count : 1;
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

/**
 * GET /api/leave/types
 * Tenant-configurable leave-type catalog with editable defaults
 */
router.get('/types', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { customContent: true, type: true }
  });
  const customTypes = (school?.customContent as any)?.leaveTypes;
  if (customTypes && Array.isArray(customTypes)) {
    return res.json(customTypes);
  }

  // Default statutory & institutional catalog
  const defaults = [
    { code: 'annual', name: 'Annual Leave', defaultDays: 30, paid: true, requiresAttachment: false, description: 'Statutory annual leave (school holidays for teaching staff, 30 days for others)' },
    { code: 'sick', name: 'Sick Leave', defaultDays: 90, paid: true, requiresAttachment: true, attachmentThresholdDays: 2, description: 'Medical recovery (up to 30 days full pay, 60 days half pay)' },
    { code: 'maternity', name: 'Maternity Leave', defaultDays: 98, paid: true, requiresAttachment: true, attachmentThresholdDays: 0, description: '98 days fully paid with minimum 1-year service' },
    { code: 'paternity', name: 'Paternity Leave', defaultDays: 5, paid: true, requiresAttachment: false, description: '5 days paternity leave upon birth of child' },
    { code: 'compassionate', name: 'Compassionate Leave', defaultDays: 5, paid: true, requiresAttachment: false, description: 'Bereavement or critical family emergency' },
    { code: 'study', name: 'Study & Exam Leave', defaultDays: 14, paid: true, requiresAttachment: true, attachmentThresholdDays: 0, description: 'Professional development, degree exams, or academic workshops' },
    { code: 'unpaid', name: 'Unpaid Leave', defaultDays: 365, paid: false, requiresAttachment: false, description: 'Approved leave of absence with pro-rated payroll deduction' },
    { code: 'in_lieu', name: 'Day-Off-in-Lieu', defaultDays: 5, paid: true, requiresAttachment: false, description: 'Compensatory day off for weekend duty or tour oversight' },
    { code: 'special', name: 'Special Leave', defaultDays: 10, paid: true, requiresAttachment: false, description: 'Court witness, sports national representation, or governance duty' }
  ];
  res.json(defaults);
});

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
    const { leaveType, startDate, endDate, reason, coverTeacherId, attachmentUrl, department, dutiesAffected } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = calculateWorkingDays(start, end);

    const year = start.getFullYear().toString();
    const balance = await ensureBalance(req.user!.schoolId!, req.user!.id, year);

    // Balance check
    const typeKey = `${leaveType.toLowerCase()}Total` as keyof typeof balance;
    const usedKey = `${leaveType.toLowerCase()}Used` as keyof typeof balance;
    
    if (balance[typeKey] !== undefined) {
      const remaining = (balance[typeKey] as number) - (balance[usedKey] as number);
      if (remaining < days) {
        return res.status(400).json({ error: `Insufficient ${leaveType} balance. You need ${days} working day(s) but have ${remaining} left.` });
      }
    }

    // Attachment requirement rules:
    const typeLower = (leaveType || '').toLowerCase();
    if (typeLower === 'sick' && days > 2 && !attachmentUrl) {
      return res.status(400).json({ error: 'Medical certificate/document attachment is mandatory for sick leave exceeding 2 days.' });
    }
    if (typeLower === 'maternity' && !attachmentUrl) {
      return res.status(400).json({ error: 'Expected delivery date confirmation / medical scan attachment is required for maternity leave.' });
    }
    if (typeLower === 'study' && !attachmentUrl) {
      return res.status(400).json({ error: 'Enrollment letter or examination schedule attachment is required for study leave.' });
    }

    const formattedReason = dutiesAffected ? `[Duties/Classes Affected: ${dutiesAffected}] ${reason || ''}`.trim() : reason;

    const leave = await prisma.staffLeave.create({
      data: {
        schoolId: req.user!.schoolId!,
        userId: req.user!.id,
        leaveType,
        startDate: start,
        endDate: end,
        reason: formattedReason,
        coverTeacherId: coverTeacherId || null,
        attachmentUrl: attachmentUrl || null,
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
    const leave = await prisma.staffLeave.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    // Check if governance approval is required for long leaves
    const school = await prisma.school.findUnique({
      where: { id: req.user!.schoolId! },
      select: { customContent: true, type: true }
    });
    const govThreshold = (school?.customContent as any)?.governanceLeaveThreshold ?? 14;
    const requiresGovernance = Boolean((school?.customContent as any)?.requireGovernanceLeaveApproval);

    if (requiresGovernance && (leave.days || 1) > govThreshold) {
      const updated = await prisma.staffLeave.update({
        where: { id, schoolId: req.user!.schoolId! },
        data: {
          status: 'pending_governance',
          headApprovedAt: new Date(),
          approvedBy: req.user!.id
        }
      });
      await logAction(req, 'HEAD_APPROVE_LEAVE_PENDING_GOVERNANCE', 'StaffLeave', leave.id, { days: leave.days, threshold: govThreshold });
      return res.json({ leave: updated, pendingGovernance: true });
    }

    const updated = await prisma.staffLeave.update({
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

    await logAction(req, 'HEAD_APPROVE_LEAVE', 'StaffLeave', leave.id, { days: leave.days });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve leave' });
  }
});

router.patch('/:id/governance-approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isGov = req.user!.role === 'SCHOOL_ADMIN' || req.user!.role === 'SUPER_ADMIN' ||
      req.user!.secondaryRoles?.some(r => ['SDC_CHAIR', 'BOARD_CHAIR', 'COUNCIL_CHAIR', 'BURSAR'].includes(r.toUpperCase()));
    if (!isGov) return res.status(403).json({ error: 'Not authorized for governance signoff' });

    const id = req.params.id as string;
    const leave = await prisma.staffLeave.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending_governance') {
      return res.status(400).json({ error: 'Leave application is not awaiting governance approval' });
    }

    const updated = await prisma.staffLeave.update({
      where: { id, schoolId: req.user!.schoolId! },
      data: { status: 'approved', approvedBy: req.user!.id }
    });

    // Update balance
    const year = leave.startDate.getFullYear().toString();
    const usedKey = `${(leave.leaveType || 'annual').toLowerCase()}Used`;
    await prisma.leaveBalance.updateMany({
      where: { schoolId: req.user!.schoolId!, userId: leave.userId, academicYear: year },
      data: { [usedKey]: { increment: leave.days || 1 } }
    });

    await logAction(req, 'GOVERNANCE_APPROVE_LEAVE', 'StaffLeave', leave.id, { days: leave.days });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete governance approval' });
  }
});

router.get('/:id/print-data', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const leave = await prisma.staffLeave.findFirst({
      where: { id, schoolId: req.user!.schoolId! }
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    const [applicant, coverTeacher, hodApprover, school] = await Promise.all([
      prisma.user.findUnique({ where: { id: leave.userId }, select: { name: true, email: true, role: true } }),
      leave.coverTeacherId ? prisma.user.findUnique({ where: { id: leave.coverTeacherId }, select: { name: true, email: true } }) : null,
      leave.hodApprovedById ? prisma.user.findUnique({ where: { id: leave.hodApprovedById }, select: { name: true } }) : null,
      prisma.school.findUnique({ where: { id: req.user!.schoolId! }, select: { name: true, address: true, phone: true } })
    ]);

    res.json({
      leave,
      applicant,
      coverTeacher,
      hodApprover,
      school
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch print data' });
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
      const days = leave.days || calculateWorkingDays(leave.startDate, leave.endDate);

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
