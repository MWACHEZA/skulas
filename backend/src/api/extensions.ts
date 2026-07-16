import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireFeature } from '../middleware/features';

const router = Router();

/**
 * @route   GET /api/extensions
 * @desc    Get all extension requests (Admin) or my requests (Student)
 */
router.get('/', requireAuth, requireFeature('Postgraduate Regulation Engine'), async (req: AuthRequest, res: Response) => {
  const userRole = req.user!.role.toUpperCase();

  try {
    if (userRole === 'SCHOOL_ADMIN') {
      const requests = await prisma.extensionRequest.findMany({
        where: { student: { schoolId: req.user!.schoolId } },
        include: { student: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(requests);
    }

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findFirst({ 
        where: { userId: req.user!.id } 
      });
      // Fallback if compound index not available or using userId
      const studentFallback = await prisma.student.findFirst({
        where: { userId: req.user!.id, schoolId: req.user!.schoolId }
      });
      
      const targetStudent = studentFallback;
      if (!targetStudent) return res.status(404).json({ error: 'Student record not found' });

      const requests = await prisma.extensionRequest.findMany({
        where: { 
          studentId: targetStudent.id,
          schoolId: req.user!.schoolId 
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(requests);
    }

    res.status(403).json({ error: 'Unauthorized' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch extension requests' });
  }
});

/**
 * @route   POST /api/extensions
 * @desc    Submit a new extension request (Student)
 */
router.post('/', requireAuth, requireFeature('Postgraduate Regulation Engine'), async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can request extensions' });

  const { reason, durationRequested, justificationUrl } = req.body;

  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.id, schoolId: req.user!.schoolId }
    });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    const request = await prisma.extensionRequest.create({
      data: {
        studentId: student.id,
        reason,
        durationRequested,
        justificationUrl,
        schoolId: req.user!.schoolId as string,
        status: 'PENDING'
      }
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit extension request' });
  }
});

/**
 * @route   PATCH /api/extensions/:id
 * @desc    Approve or Reject extension request (Admin)
 */
router.patch('/:id', requireAuth, requireFeature('Postgraduate Regulation Engine'), async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'SCHOOL_ADMIN') return res.status(403).json({ error: 'Unauthorized' });

  const id = req.params.id as string;
  const { status, adminComment } = req.body; // APPROVED or REJECTED

  try {
    const request = await prisma.extensionRequest.findFirst({
      where: { 
        id,
        schoolId: req.user!.schoolId as string
      },
      include: { student: true }
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Request
      const updatedRequest = await tx.extensionRequest.update({
        where: { 
          id,
          schoolId: req.user!.schoolId as string
        },
        data: { status, adminComment, updatedAt: new Date() }
      });

      // 2. If approved, update student timeline
      if (status === 'APPROVED') {
        const student = await tx.student.findFirst({ where: { id: request.studentId } });
        if (student && student.maxCompletionDate) {
          const newMaxDate = new Date(student.maxCompletionDate);
          newMaxDate.setMonth(newMaxDate.getMonth() + request.durationRequested);

          await tx.student.update({
            where: { id: request.studentId },
            data: {
              maxCompletionDate: newMaxDate,
              extensionMonths: { increment: request.durationRequested }
            }
          });
        }
      }

      return updatedRequest;
    });

    res.json(result);
  } catch (error) {
    console.error('Extension approval error:', error);
    res.status(500).json({ error: 'Failed to process extension request' });
  }
});

export default router;
