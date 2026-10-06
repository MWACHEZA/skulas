import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// ═══════════ HOSTELS & BOARDING ═══════════

router.get('/hostel-categories', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.hostelCategory.findMany({ where: { schoolId: req.user!.schoolId! } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostel categories' });
  }
});

router.post('/hostel-categories', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.hostelCategory.create({
      data: { ...req.body, schoolId: req.user!.schoolId! }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hostel category' });
  }
});

router.delete('/hostel-categories/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.hostelCategory.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hostel category' });
  }
});

router.get('/hostel-rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.hostelRoom.findMany({ where: { schoolId: req.user!.schoolId! } });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostel rooms' });
  }
});

router.post('/hostel-rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.hostelRoom.create({
      data: {
        ...req.body,
        numberOfBeds: parseInt(req.body.numberOfBeds) || 0,
        cost: parseFloat(req.body.cost) || 0,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hostel room' });
  }
});

router.delete('/hostel-rooms/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.hostelRoom.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hostel room' });
  }
});

router.get('/hostels', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const hostels = await prisma.hostel.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        category: true,
        roomType: true,
        _count: { select: { students: true } }
      }
    });
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostels' });
  }
});

router.post('/hostels', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const hostel = await prisma.hostel.create({
      data: {
        name: req.body.name || req.body.hostelName || 'Hostel',
        categoryId: req.body.categoryId,
        roomId: req.body.roomId,
        capacity: parseInt(req.body.capacity || req.body.intake) || 0,
        location: req.body.location || req.body.address,
        description: req.body.description,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(hostel);
  } catch (error) {
    console.error('Failed to create hostel:', error);
    res.status(500).json({ error: 'Failed to create hostel' });
  }
});

router.delete('/hostels/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.hostel.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hostel' });
  }
});

// Boarding Assignments
router.post('/boarding/assign', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, hostelId } = req.body;
    await prisma.student.update({
      where: { id: studentId },
      data: { hostelId, boardingStatus: 'Boarder' }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign student' });
  }
});

// ═══════════ BOARDING LOGS ═══════════

/**
 * @route   POST /api/ancillary/boarding/log
 * @desc    Record a boarding movement (Sign-out, Sign-in, etc)
 */
router.post('/boarding/log', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { studentId, type, reason } = req.body;
  const schoolId = req.user!.schoolId!;
  const userId = req.user!.id;

  try {
    const log = await prisma.boardingLog.create({
      data: {
        studentId,
        type,
        reason,
        authorizedById: userId,
        schoolId
      }
    });

    // If it's a sign-out, maybe update student status? 
    // For now we just log it.

    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record boarding log' });
  }
});

/**
 * @route   GET /api/ancillary/boarding/logs
 * @desc    Fetch recent boarding movement logs & exeat records
 */
router.get('/boarding/logs', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const logs = await prisma.boardingLog.findMany({
      where: { schoolId },
      include: {
        student: {
          select: { id: true, name: true, studentId: true, hostel: { select: { name: true } } }
        },
        authorizedBy: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch boarding logs error:', error);
    res.status(500).json({ error: 'Failed to fetch boarding logs' });
  }
});

/**
 * @route   PATCH /api/ancillary/boarding/logs/:id/return
 * @desc    Mark a student as returned from exeat / sign-out
 */
router.patch('/boarding/logs/:id/return', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const id = req.params.id as string;
  try {
    const log = await prisma.boardingLog.findFirst({
      where: { id, schoolId }
    });
    if (!log) return res.status(404).json({ error: 'Boarding log not found' });

    const updated = await prisma.boardingLog.update({
      where: { id },
      data: { returnedAt: new Date() }
    });
    res.json(updated);
  } catch (error) {
    console.error('Update boarding return error:', error);
    res.status(500).json({ error: 'Failed to update boarding return' });
  }
});

// ═══════════ VISITOR TRACKING ═══════════

/**
 * @route   GET /api/ancillary/visitors
 * @desc    Get current day's visitors
 */
router.get('/visitors', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const visitors = await prisma.visitorLog.findMany({
      where: { schoolId },
      orderBy: { entryTime: 'desc' }
    });
    res.json(visitors);
  } catch (error) {
    // Note: Prisma might have named it VisitorLog or visitorLog based on schema
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

/**
 * @route   POST /api/ancillary/visitors
 * @desc    Record a new visitor entry
 */
router.post('/visitors', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  const { name, phone, purpose, vehicleReg } = req.body;
  const schoolId = req.user!.schoolId!;
  const guardId = req.user!.id;

  try {
    const visitor = await prisma.visitorLog.create({
      data: { name, phone, purpose, vehicleReg, guardId, schoolId }
    });
    res.json(visitor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record visitor' });
  }
});

// ═══════════ MEAL PLANNING ═══════════

/**
 * @route   GET /api/ancillary/menu/current
 * @desc    Get the menu starting this week
 */
router.get('/menu/current', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.findFirst({
      where: { schoolId, published: true },
      orderBy: { weekStarting: 'desc' }
    });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * @route   POST /api/ancillary/menu
 * @desc    Create/Update a weekly menu
 */
router.post('/menu', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  const { weekStarting, menuData, published } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.create({
      data: {
        weekStarting: new Date(weekStarting),
        menuData,
        published,
        schoolId
      }
    });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save menu' });
  }
});

export default router;

