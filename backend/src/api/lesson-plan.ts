import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();

/**
 * GET /api/lesson-plans - List lesson plans with filters
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { teacherId, classId, subjectId, schemeId, status, startDate, endDate } = req.query;

  try {
    const whereClause: any = { schoolId };
    if (teacherId) whereClause.teacherId = String(teacherId);
    if (classId) whereClause.classId = String(classId);
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (schemeId) whereClause.schemeId = String(schemeId);
    if (status) whereClause.status = String(status);

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(String(startDate));
      if (endDate) whereClause.date.lte = new Date(String(endDate));
    }

    const plans = await prisma.lessonPlan.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true, level: true } },
        teacher: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } }
          }
        },
        coverTeacher: {
          select: {
            id: true,
            user: { select: { id: true, name: true } }
          }
        },
        hodReviewedBy: { select: { id: true, name: true } },
        scheme: { select: { id: true, status: true, form: true, term: true, year: true } },
        schemeItem: {
          select: {
            id: true,
            week: true,
            subTopic: true,
            syllabusTopic: { select: { id: true, topic: true, code: true } }
          }
        },
        resourcesList: true
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ lessonPlans: plans, count: plans.length });
  } catch (error: any) {
    console.error('Error fetching lesson plans:', error);
    return res.status(500).json({ error: 'Failed to fetch lesson plans' });
  }
});

/**
 * GET /api/lesson-plans/:id - Detailed lesson plan
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const plan = await prisma.lessonPlan.findFirst({
      where: { id, schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true, level: true } },
        teacher: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } }
          }
        },
        coverTeacher: {
          select: {
            id: true,
            user: { select: { id: true, name: true } }
          }
        },
        hodReviewedBy: { select: { id: true, name: true } },
        scheme: {
          include: {
            subject: true,
            hodApprovedBy: { select: { id: true, name: true } }
          }
        },
        schemeItem: {
          include: {
            syllabusTopic: true
          }
        },
        resourcesList: true
      }
    });

    if (!plan) return res.status(404).json({ error: 'Lesson plan not found' });

    return res.json({ lessonPlan: plan });
  } catch (error: any) {
    console.error('Error fetching lesson plan details:', error);
    return res.status(500).json({ error: 'Failed to fetch lesson plan details' });
  }
});

/**
 * POST /api/lesson-plans - Create lesson plan
 * GATED: Scheme of Work MUST be HOD-approved or locked!
 */
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const {
    schemeId, schemeItemId, classId, subjectId, date, period,
    objectives, introduction, development, conclusion, aids, resources,
    assessment, homework, differentiation, reflection, status
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Lesson date is required' });
  }

  try {
    // 1. Resolve Scheme & verify HOD approval gate
    let targetSchemeId = schemeId;
    let targetSubjectId = subjectId;
    let targetClassId = classId;

    if (schemeItemId && !targetSchemeId) {
      const item = await prisma.schemeItem.findFirst({
        where: { id: schemeItemId, schoolId },
        include: { scheme: true }
      });
      if (item) {
        targetSchemeId = item.schemeId;
        if (!targetSubjectId) targetSubjectId = item.scheme.subjectId;
        if (!targetClassId) targetClassId = item.scheme.classId || undefined;
      }
    }

    if (targetSchemeId) {
      const scheme = await prisma.schemeOfWork.findFirst({
        where: { id: targetSchemeId, schoolId }
      });

      if (!scheme) {
        return res.status(404).json({ error: 'Linked Scheme of Work not found' });
      }

      if (scheme.status !== 'hod_approved' && scheme.status !== 'locked') {
        return res.status(400).json({
          error: `Cannot create lesson plan: Scheme of Work status is '${scheme.status}'. A Scheme of Work must be HOD-approved before lesson plans can be created.`,
          schemeStatus: scheme.status
        });
      }

      if (!targetSubjectId) targetSubjectId = scheme.subjectId;
      if (!targetClassId) targetClassId = scheme.classId || undefined;
    } else {
      return res.status(400).json({
        error: 'A lesson plan must link to an approved Scheme of Work (provide schemeId or schemeItemId).'
      });
    }

    // Resolve teacher id
    let teacherId = req.body.teacherId;
    if (!teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id, schoolId } });
      if (teacher) {
        teacherId = teacher.id;
      } else {
        const anyTeacher = await prisma.teacher.findFirst({ where: { schoolId } });
        teacherId = anyTeacher?.id || null;
      }
    }

    const created = await prisma.lessonPlan.create({
      data: {
        schoolId,
        schemeId: targetSchemeId,
        schemeItemId: schemeItemId || null,
        teacherId,
        classId: targetClassId || null,
        subjectId: targetSubjectId || null,
        date: new Date(date),
        period: period ? Number(period) : 1,
        objectives: objectives || null,
        introduction: introduction || null,
        development: development || null,
        conclusion: conclusion || null,
        aids: aids || null,
        resources: resources || null,
        assessment: assessment || null,
        homework: homework || null,
        differentiation: differentiation || null,
        reflection: reflection || null,
        status: status || 'draft'
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true } },
        schemeItem: true
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_LESSON_PLAN',
      entityType: 'LessonPlan',
      entityId: created.id,
      details: { schemeId: targetSchemeId, schemeItemId, date, period },
      schoolId,
      ipAddress: req.ip
    });

    return res.status(201).json({ success: true, lessonPlan: created });
  } catch (error: any) {
    console.error('Error creating lesson plan:', error);
    return res.status(500).json({ error: 'Failed to create lesson plan: ' + error.message });
  }
});

/**
 * PUT /api/lesson-plans/:id - Update lesson plan
 */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const {
    date, period, objectives, introduction, development, conclusion, aids,
    resources, assessment, homework, differentiation, reflection, evaluation
  } = req.body;

  try {
    const existing = await prisma.lessonPlan.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Lesson plan not found' });

    if (existing.status === 'taught') {
      return res.status(400).json({ error: 'Cannot modify a lesson plan that has already been marked as taught' });
    }

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        period: period !== undefined ? Number(period) : undefined,
        objectives: objectives !== undefined ? objectives : undefined,
        introduction: introduction !== undefined ? introduction : undefined,
        development: development !== undefined ? development : undefined,
        conclusion: conclusion !== undefined ? conclusion : undefined,
        aids: aids !== undefined ? aids : undefined,
        resources: resources !== undefined ? resources : undefined,
        assessment: assessment !== undefined ? assessment : undefined,
        homework: homework !== undefined ? homework : undefined,
        differentiation: differentiation !== undefined ? differentiation : undefined,
        reflection: reflection !== undefined ? reflection : undefined,
        evaluation: evaluation !== undefined ? evaluation : undefined
      }
    });

    return res.json({ success: true, lessonPlan: updated });
  } catch (error: any) {
    console.error('Error updating lesson plan:', error);
    return res.status(500).json({ error: 'Failed to update lesson plan' });
  }
});

/**
 * POST /api/lesson-plans/:id/submit - Submit lesson plan for HOD review
 */
router.post('/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const existing = await prisma.lessonPlan.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Lesson plan not found' });

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: { status: 'submitted' }
    });

    return res.json({ success: true, message: 'Lesson plan submitted for HOD review', lessonPlan: updated });
  } catch (error: any) {
    console.error('Error submitting lesson plan:', error);
    return res.status(500).json({ error: 'Failed to submit lesson plan' });
  }
});

/**
 * POST /api/lesson-plans/:id/review - HOD reviews lesson plan with feedback
 */
router.post('/:id/review', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { feedback } = req.body;

  try {
    const existing = await prisma.lessonPlan.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Lesson plan not found' });

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: 'hod_reviewed',
        hodReviewedById: req.user!.id,
        hodReviewedAt: new Date(),
        hodFeedback: feedback || 'Approved for execution'
      },
      include: {
        hodReviewedBy: { select: { id: true, name: true } }
      }
    });

    return res.json({ success: true, message: 'Lesson plan reviewed by HOD', lessonPlan: updated });
  } catch (error: any) {
    console.error('Error reviewing lesson plan:', error);
    return res.status(500).json({ error: 'Failed to review lesson plan' });
  }
});

/**
 * POST /api/lesson-plans/:id/taught - Mark lesson as taught with teacher evaluation
 */
router.post('/:id/taught', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { evaluation } = req.body;

  if (!evaluation || !String(evaluation).trim()) {
    return res.status(400).json({
      error: 'Teacher evaluation is required when marking a lesson as taught (learning outcomes, student mastery, reflection).'
    });
  }

  try {
    const existing = await prisma.lessonPlan.findFirst({
      where: { id, schoolId },
      include: { schemeItem: true }
    });
    if (!existing) return res.status(404).json({ error: 'Lesson plan not found' });

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: 'taught',
        evaluation: String(evaluation).trim()
      }
    });

    // Mark corresponding scheme item status as taught
    if (existing.schemeItemId) {
      await prisma.schemeItem.update({
        where: { id: existing.schemeItemId },
        data: { status: 'taught' }
      });
    }

    return res.json({ success: true, message: 'Lesson marked as taught with evaluation recorded', lessonPlan: updated });
  } catch (error: any) {
    console.error('Error marking lesson as taught:', error);
    return res.status(500).json({ error: 'Failed to mark lesson as taught' });
  }
});

/**
 * POST /api/lesson-plans/:id/missed - Mark lesson as missed, alerting HOD and cover teacher
 */
router.post('/:id/missed', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { missedReason, coverTeacherId } = req.body;

  if (!missedReason || !String(missedReason).trim()) {
    return res.status(400).json({
      error: 'Missed reason is required when recording an untaught lesson (illness, school event, emergency, etc.).'
    });
  }

  try {
    const existing = await prisma.lessonPlan.findFirst({
      where: { id, schoolId },
      include: {
        scheme: { include: { hodApprovedBy: true } },
        schemeItem: true,
        subject: true
      }
    });
    if (!existing) return res.status(404).json({ error: 'Lesson plan not found' });

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: 'missed',
        missedReason: String(missedReason).trim(),
        coverTeacherId: coverTeacherId || null
      },
      include: {
        coverTeacher: { select: { id: true, user: { select: { name: true } } } }
      }
    });

    // Mark corresponding scheme item as missed
    if (existing.schemeItemId) {
      await prisma.schemeItem.update({
        where: { id: existing.schemeItemId },
        data: { status: 'missed' }
      });
    }

    // Security & relief audit log for HOD and Teacher Load
    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'LESSON_MISSED_ALERT',
      entityType: 'LessonPlan',
      entityId: id,
      details: {
        subject: existing.subject?.name,
        date: existing.date,
        period: existing.period,
        reason: missedReason,
        coverTeacherId: coverTeacherId || 'NONE_ASSIGNED'
      },
      schoolId: schoolId!,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Lesson marked as missed. HOD alerted for teacher cover relief.',
      lessonPlan: updated
    });
  } catch (error: any) {
    console.error('Error marking lesson as missed:', error);
    return res.status(500).json({ error: 'Failed to record missed lesson' });
  }
});

/**
 * POST /api/lesson-plans/:id/resources - Add lesson plan resource
 */
router.post('/:id/resources', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { title, url, fileType } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Resource title and URL are required' });
  }

  try {
    const plan = await prisma.lessonPlan.findFirst({ where: { id, schoolId } });
    if (!plan) return res.status(404).json({ error: 'Lesson plan not found' });

    const resource = await prisma.lessonPlanResource.create({
      data: {
        schoolId: schoolId!,
        lessonPlanId: id,
        title,
        url,
        fileType: fileType || null
      }
    });

    return res.status(201).json({ success: true, resource });
  } catch (error: any) {
    console.error('Error adding resource:', error);
    return res.status(500).json({ error: 'Failed to add lesson resource' });
  }
});

/**
 * DELETE /api/lesson-plans/:id/resources/:resId - Remove resource
 */
router.delete('/:id/resources/:resId', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const resId = String(req.params.resId);

  try {
    const resource = await prisma.lessonPlanResource.findFirst({
      where: { id: resId, lessonPlanId: id, schoolId }
    });
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    await prisma.lessonPlanResource.delete({ where: { id: resId } });
    return res.json({ success: true, message: 'Resource removed' });
  } catch (error: any) {
    console.error('Error removing resource:', error);
    return res.status(500).json({ error: 'Failed to remove resource' });
  }
});

/**
 * DELETE /api/lesson-plans/:id - Delete lesson plan
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const plan = await prisma.lessonPlan.findFirst({ where: { id, schoolId } });
    if (!plan) return res.status(404).json({ error: 'Lesson plan not found' });

    if (plan.status === 'taught') {
      return res.status(400).json({ error: 'Cannot delete a taught lesson plan' });
    }

    await prisma.lessonPlan.delete({ where: { id } });
    return res.json({ success: true, message: 'Lesson plan deleted' });
  } catch (error: any) {
    console.error('Error deleting lesson plan:', error);
    return res.status(500).json({ error: 'Failed to delete lesson plan' });
  }
});

export default router;
