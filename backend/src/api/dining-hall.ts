import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// All dining hall routes require authentication
router.use(requireAuth);

/**
 * Helper to check if user has menu management access
 */
const canManageMenu = (user: any) => {
  return user.role === 'SCHOOL_ADMIN' || 
         user.role === 'BURSAR' || 
         user.role === 'ANCILLARY' || 
         user.secondaryRoles.includes('Kitchen Manager') ||
         user.secondaryRoles.includes('Cook');
};

/**
 * Helper to check if user can view student service reports
 */
const canViewReports = (user: any) => {
  return user.role === 'SCHOOL_ADMIN' || 
         user.role === 'TEACHER' || 
         user.role === 'ANCILLARY' ||
         user.secondaryRoles.includes('Kitchen Manager');
};

/**
 * @route   GET /api/dining-hall/menu
 * @desc    Fetch the current week's published menu
 */
router.get('/menu', async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.findFirst({
      where: { schoolId, published: true },
      orderBy: { weekStarting: 'desc' }
    });
    res.json(menu);
  } catch (error) {
    console.error('Fetch menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * @route   POST /api/dining-hall/menu
 * @desc    Create/Update a weekly menu
 */
router.post('/menu', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to publish menu' });
  }

  const { weekStarting, menuData, published } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.create({
      data: {
        weekStarting: new Date(weekStarting),
        menuData,
        published: published !== undefined ? published : true,
        schoolId
      }
    });

    await logAction(req, 'CREATE_MENU', 'WeeklyMenu', menu.id, { weekStarting });
    res.json(menu);
  } catch (error) {
    console.error('Save menu error:', error);
    res.status(500).json({ error: 'Failed to save menu' });
  }
});

/**
 * @route   GET /api/dining-hall/reports
 * @desc    Fetch submitted dining hall service reports
 */
router.get('/reports', async (req: AuthRequest, res: Response) => {
  if (!canViewReports(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to view service reports' });
  }

  const schoolId = req.user!.schoolId!;
  try {
    const reports = await prisma.diningHallReport.findMany({
      where: { schoolId },
      include: {
        reportedBy: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Failed to fetch dining hall reports' });
  }
});

/**
 * @route   POST /api/dining-hall/reports
 * @desc    Submit a new dining hall service report
 */
router.post('/reports', async (req: AuthRequest, res: Response) => {
  const { category, rating, feedback } = req.body;
  const schoolId = req.user!.schoolId!;
  const userId = req.user!.id;

  if (!category || rating === undefined || !feedback) {
    return res.status(400).json({ error: 'Missing required report fields' });
  }

  try {
    const report = await prisma.diningHallReport.create({
      data: {
        category,
        rating: parseInt(rating),
        feedback,
        reportedById: userId,
        schoolId
      }
    });

    await logAction(req, 'SUBMIT_DINING_HALL_REPORT', 'DiningHallReport', report.id, { category });
    res.json(report);
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Failed to submit dining hall report' });
  }
});

export default router;
