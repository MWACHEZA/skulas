import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Nominate
router.post('/nominate', requireAuth, requireRole('TEACHER'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const nominatedById = req.user!.id;
  const { studentId, category, title, reason, evidenceUrl } = req.body;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Enforce limit: 3 awards per teacher per class per week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (student.classId) {
      const recentAwardsInClass = await prisma.studentAward.count({
        where: {
          schoolId,
          nominatedById,
          student: { classId: student.classId },
          createdAt: { gte: weekAgo }
        }
      });
      if (recentAwardsInClass >= 3) {
        return res.status(400).json({ message: 'Limit reached: 3 awards per class per week' });
      }
    }

    const config = await prisma.awardConfig.findFirst({
      where: { schoolId, category }
    });

    const award = await prisma.studentAward.create({
      data: {
        schoolId,
        studentId,
        nominatedById,
        category,
        title,
        reason,
        evidenceUrl,
        points: config?.points || 0,
        status: config?.requiresApprovalBy ? 'pending' : 'approved',
        approvedById: config?.requiresApprovalBy ? null : nominatedById
      }
    });

    if (award.status === 'approved') {
      await handleAwardApproval(award);
    }

    res.status(201).json(award);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Approve
router.post('/:id/approve', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const id = req.params.id as string;

  try {
    const award = await prisma.studentAward.findFirst({
      where: { id, schoolId, status: 'pending' },
      include: { student: true }
    });
    if (!award) return res.status(404).json({ message: 'Award not found or already processed' });

    const updated = await prisma.studentAward.update({
      where: { id },
      data: { status: 'approved', approvedById: req.user!.id }
    });

    await handleAwardApproval(updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

async function handleAwardApproval(award: any) {
  const config = await prisma.awardConfig.findFirst({
    where: { schoolId: award.schoolId, category: award.category }
  });

  if (config?.autoAddsToHousePoints && award.points > 0) {
    const student = await prisma.student.findUnique({ where: { id: award.studentId } });
    if (student?.houseId) {
      await prisma.studentHouse.update({
        where: { id: student.houseId },
        data: { points: { increment: award.points } }
      });
    }
  }

  // Cross-module hook: Bursary Suggestion
  if (award.category === "Head's Award") {
    // Determine a default bursary type or find one
    const bType = await prisma.bursaryType.findFirst({
      where: { schoolId: award.schoolId, type: 'merit' }
    });
    await prisma.studentBursary.create({
      data: {
        schoolId: award.schoolId,
        studentId: award.studentId,
        type: bType ? bType.type : 'merit',
        percentage: bType ? bType.defaultPercentage : 10,
        validFrom: new Date(),
        status: 'suggested',
        suggestedFromAwardId: award.id
      }
    });
  }
}

// Hall of Fame
router.get('/hall-of-fame', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  try {
    const awards = await prisma.studentAward.findMany({
      where: { schoolId, status: 'approved' },
      include: { student: true },
      orderBy: { points: 'desc' },
      take: 10
    });
    res.json(awards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
