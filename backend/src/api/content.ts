import { Router, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// All routes here require authentication and SCHOOL_ADMIN or SUPER_ADMIN role
router.use((req, res, next: NextFunction) => requireAuth(req as AuthRequest, res as Response, next));
router.use((req, res, next: NextFunction) => requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN')(req as AuthRequest, res as Response, next));

/**
 * @route   PATCH /api/admin/branding
 * @desc    Update school branding (colors, logo)
 */
router.patch('/branding', async (req: AuthRequest, res: Response) => {
  const { branding } = req.body;
  const schoolId = req.user?.schoolId;

  if (!schoolId) return res.status(400).json({ error: 'No school associated with user' });

  try {
    const school = await prisma.school.update({
      where: { id: schoolId },
      data: { branding },
    });

    await logAction(req, 'UPDATE_BRANDING', 'School', schoolId, { branding });
    
    res.json({ success: true, branding: (school as any).branding });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

/**
 * @route   POST /api/admin/news
 * @desc    Add a news item
 */
router.post('/news', async (req: AuthRequest, res: Response) => {
  const { title, content, image } = req.body;
  const schoolId = req.user?.schoolId;

  if (!schoolId) return res.status(400).json({ error: 'No school associated with user' });

  try {
    const news = await prisma.news.create({
      data: {
        title,
        content,
        image, // Reference to stored file (URL)
        schoolId,
      },
    });

    await logAction(req, 'CREATE_NEWS', 'News', news.id, { title });

    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create news' });
  }
});

/**
 * @route   DELETE /api/admin/news/:id
 * @desc    Delete a news item
 */
router.delete('/news/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const schoolId = req.user?.schoolId;

  try {
    const news = await prisma.news.findFirst({ where: { id } });
    if (!news || news.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Unauthorized to delete this news' });
    }

    await prisma.news.delete({ where: { id } });
    
    await logAction(req, 'DELETE_NEWS', 'News', id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

/**
 * @route   GET /api/admin/announcements
 * @desc    Get all announcements
 */
router.get('/announcements', async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.announcement.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * @route   POST /api/admin/announcements
 * @desc    Create announcement with multi-portal visibility
 */
router.post('/announcements', async (req: AuthRequest, res: Response) => {
  const { title, content, visiblePortals, isPublic, expiresAt } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        visiblePortals: visiblePortals || ['ALL'],
        isPublic: !!isPublic,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        schoolId,
      },
    });

    await logAction(req, 'CREATE_ANNOUNCEMENT', 'Announcement', announcement.id, { title });

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

/**
 * @route   PUT /api/content/announcements/:id
 * @desc    Update announcement
 */
router.put('/announcements/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { title, content, visiblePortals, isPublic, expiresAt } = req.body;
  try {
    const announcement = await prisma.announcement.updateMany({
      where: { id, schoolId: req.user!.schoolId! },
      data: {
        title,
        content,
        visiblePortals,
        isPublic,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

/**
 * @route   DELETE /api/admin/announcements/:id
 * @desc    Delete announcement
 */
router.delete('/announcements/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    await prisma.announcement.deleteMany({
      where: { id, schoolId: req.user!.schoolId! },
    });

    await logAction(req, 'DELETE_ANNOUNCEMENT', 'Announcement', id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Similar routes for Gallery, Clubs, Sports...
// Placeholder for brevity but structure is identical: check schoolId isolation.

export default router;
