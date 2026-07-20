import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.use(requireAuth);

/**
 * Helper to check if a user is HOD or Admin and get their managed department IDs
 */
async function getManagedDepartments(req: AuthRequest) {
  const user = req.user!;
  if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
    return { isAdmin: true, isHOD: false, deptIds: [] as string[] };
  }

  // Find departments where this user is HOD
  const depts = await prisma.department.findMany({
    where: { headId: user.id }
  });

  return {
    isAdmin: false,
    isHOD: depts.length > 0,
    deptIds: depts.map(d => d.id) as string[]
  };
}

/**
 * @route   GET /api/schedules/my
 * @desc    Fetch shifts for the current logged-in user
 */
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const shifts = await prisma.shiftAssignment.findMany({
      where: { userId: req.user!.id },
      orderBy: { dayOfWeek: 'asc' }
    });
    res.json(shifts);
  } catch (error) {
    console.error('Fetch my shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch your schedules' });
  }
});

/**
 * @route   GET /api/schedules/staff
 * @desc    Fetch all shifts (Admin) or department-specific shifts (HOD)
 */
router.get('/staff', async (req: AuthRequest, res: Response) => {
  try {
    const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
    if (!isAdmin && !isHOD) {
      return res.status(403).json({ error: 'Access denied. Admins and HODs only.' });
    }

    const schoolId = req.user!.schoolId!;
    const shifts = await prisma.shiftAssignment.findMany({
      where: {
        schoolId,
        ...(isAdmin ? {} : {
          user: {
            departmentId: { in: deptIds }
          }
        })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            secondaryRoles: true,
            dept: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [
        { user: { name: 'asc' } },
        { dayOfWeek: 'asc' }
      ]
    });

    res.json(shifts);
  } catch (error) {
    console.error('Fetch staff shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch staff schedules' });
  }
});

/**
 * @route   POST /api/schedules
 * @desc    Create or update a shift assignment (Admin or HOD)
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  const { userId, dayOfWeek, startTime, endTime, location, task } = req.body;
  if (!userId || dayOfWeek === undefined || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required shift fields' });
  }

  try {
    const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
    if (!isAdmin && !isHOD) {
      return res.status(403).json({ error: 'Unauthorized to assign schedules' });
    }

    // If HOD, target user must be in HOD's department
    if (!isAdmin) {
      const targetUser = await prisma.user.findFirst({
        where: { id: userId },
        select: { departmentId: true }
      });
      if (!targetUser || !targetUser.departmentId || !deptIds.includes(targetUser.departmentId)) {
        return res.status(403).json({ error: 'You can only assign shifts to members of your department' });
      }
    }

    const schoolId = req.user!.schoolId!;
    const shift = await prisma.shiftAssignment.create({
      data: {
        userId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        location,
        task,
        schoolId
      }
    });

    await logAction(req, 'ASSIGN_SHIFT', 'ShiftAssignment', shift.id, { userId, task });
    res.json(shift);
  } catch (error) {
    console.error('Assign shift error:', error);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
});

/**
 * @route   PUT /api/schedules/:id
 * @desc    Update a shift assignment (Admin or HOD)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { userId, dayOfWeek, startTime, endTime, location, task } = req.body;
  if (!userId || dayOfWeek === undefined || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required shift fields' });
  }

  try {
    const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
    if (!isAdmin && !isHOD) {
      return res.status(403).json({ error: 'Unauthorized to update schedules' });
    }

    const existingShift = (await prisma.shiftAssignment.findFirst({
      where: { id: String(req.params.id) },
      include: { user: { select: { departmentId: true } } }
    })) as any;

    if (!existingShift) {
      return res.status(404).json({ error: 'Shift assignment not found' });
    }

    if (!isAdmin) {
      if (!existingShift.user.departmentId || !deptIds.includes(String(existingShift.user.departmentId))) {
        return res.status(403).json({ error: 'You can only update shifts for department members' });
      }
    }

    // Target user must also be in HOD's department (if they changed the user)
    if (!isAdmin && userId !== existingShift.userId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: userId },
        select: { departmentId: true }
      });
      if (!targetUser || !targetUser.departmentId || !deptIds.includes(targetUser.departmentId)) {
        return res.status(403).json({ error: 'You can only assign shifts to members of your department' });
      }
    }

    const shift = await prisma.shiftAssignment.update({
      where: { id: String(req.params.id) },
      data: {
        userId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        location,
        task
      }
    });

    await logAction(req, 'UPDATE_SHIFT', 'ShiftAssignment', shift.id, { userId, task });
    res.json(shift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Failed to update shift assignment' });
  }
});

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a shift assignment
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
    if (!isAdmin && !isHOD) {
      return res.status(403).json({ error: 'Unauthorized to delete shift assignments' });
    }

    const shift = (await prisma.shiftAssignment.findFirst({
      where: { id: String(req.params.id) },
      include: { user: { select: { departmentId: true } } }
    })) as any;

    if (!shift) {
      return res.status(404).json({ error: 'Shift assignment not found' });
    }

    if (!isAdmin) {
      if (!shift.user.departmentId || !deptIds.includes(String(shift.user.departmentId))) {
        return res.status(403).json({ error: 'You can only delete shifts for department members' });
      }
    }

    await prisma.shiftAssignment.delete({ where: { id: String(shift.id) } });
    await logAction(req, 'DELETE_SHIFT', 'ShiftAssignment', shift.id, { task: shift.task });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Failed to delete shift assignment' });
  }
});

export default router;
