import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/support/my
 * @desc    Get support tickets for the current user
 */
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { requesterId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your tickets' });
  }
});

/**
 * @route   GET /api/support/admin
 * @desc    [ADMIN] Get all support tickets for the school
 */
router.get('/admin', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        }
      }
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch helpdesk tickets' });
  }
});

/**
 * @route   POST /api/support
 * @desc    Create a new support ticket
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, description, category, priority } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description and category are required' });
  }

  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'medium',
        requesterId: req.user!.id,
        schoolId: req.user!.schoolId!,
        status: 'open'
      }
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

/**
 * @route   PATCH /api/support/:id
 * @desc    [ADMIN] Update ticket status or assignment
 */
router.patch('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, priority, assignedTo } = req.body;

  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: String(id), schoolId: req.user!.schoolId! },
      data: { 
        status, 
        priority, 
        assignedTo,
        updatedAt: new Date()
      }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

export default router;
