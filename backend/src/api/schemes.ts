import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();

/**
 * GET /api/schemes - List schemes of work
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { subjectId, classId, teacherId, term, year, status } = req.query;

  try {
    const whereClause: any = { schoolId };
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (classId) whereClause.classId = String(classId);
    if (teacherId) whereClause.teacherId = String(teacherId);
    if (term) whereClause.term = Number(term);
    if (year) whereClause.year = Number(year);
    if (status) whereClause.status = String(status);

    const schemes = await prisma.schemeOfWork.findMany({
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
        syllabus: { select: { id: true, form: true, curriculum: true, level: true } },
        hodApprovedBy: { select: { id: true, name: true, role: true } },
        items: {
          orderBy: { week: 'asc' },
          include: {
            syllabusTopic: { select: { id: true, topic: true, code: true, term: true, week: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = schemes.map(s => ({
      ...s,
      totalItems: s.items.length,
      weeksPlanned: s.items.length,
      isApproved: s.status === 'hod_approved' || s.status === 'locked'
    }));

    return res.json({ schemes: enriched, count: enriched.length });
  } catch (error: any) {
    console.error('Error fetching schemes of work:', error);
    return res.status(500).json({ error: 'Failed to fetch schemes of work' });
  }
});

/**
 * GET /api/schemes/:id - Detailed scheme with items and lesson plan count
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const scheme = await prisma.schemeOfWork.findFirst({
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
        syllabus: {
          include: {
            topics: { orderBy: [{ term: 'asc' }, { week: 'asc' }] }
          }
        },
        hodApprovedBy: { select: { id: true, name: true, role: true } },
        items: {
          orderBy: { week: 'asc' },
          include: {
            syllabusTopic: true,
            lessonPlans: { select: { id: true, date: true, status: true, period: true } }
          }
        }
      }
    });

    if (!scheme) {
      return res.status(404).json({ error: 'Scheme of work not found' });
    }

    return res.json({ scheme });
  } catch (error: any) {
    console.error('Error fetching scheme details:', error);
    return res.status(500).json({ error: 'Failed to fetch scheme details' });
  }
});

/**
 * POST /api/schemes - Create new scheme draft
 */
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { subjectId, classId, form, term, year, syllabusId, items, comments } = req.body;

  if (!subjectId || !term || !year) {
    return res.status(400).json({ error: 'subjectId, term, and year are required' });
  }

  try {
    // Resolve teacher id
    let teacherId = req.body.teacherId;
    if (!teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id, schoolId } });
      if (teacher) {
        teacherId = teacher.id;
      } else {
        const anyTeacher = await prisma.teacher.findFirst({ where: { schoolId } });
        if (anyTeacher) teacherId = anyTeacher.id;
        else return res.status(400).json({ error: 'No teacher profile found for this school' });
      }
    }

    // Resolve class or form
    let formName = form;
    if (!formName && classId) {
      const cls = await prisma.schoolClass.findFirst({ where: { id: String(classId), schoolId } });
      if (cls) formName = cls.name;
    }
    if (!formName) formName = 'Form 1';

    const created = await prisma.schemeOfWork.create({
      data: {
        schoolId,
        teacherId,
        subjectId,
        classId: classId || null,
        form: String(formName),
        term: Number(term),
        year: Number(year),
        syllabusId: syllabusId || null,
        status: 'draft',
        comments: comments || null,
        items: Array.isArray(items) && items.length > 0 ? {
          create: items.map((it: any, idx: number) => ({
            schoolId,
            week: it.week ? Number(it.week) : idx + 1,
            plannedDate: it.plannedDate ? new Date(it.plannedDate) : null,
            periodsRequired: it.periodsRequired ? Number(it.periodsRequired) : 1,
            syllabusTopicId: it.syllabusTopicId || null,
            subTopic: it.subTopic || null,
            activities: it.activities || null,
            resources: it.resources || null,
            assessmentMethod: it.assessmentMethod || null,
            status: it.status || 'planned'
          }))
        } : undefined
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true } },
        items: true
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_SCHEME_OF_WORK',
      entityType: 'SchemeOfWork',
      entityId: created.id,
      details: { subjectId, form: formName, term, year, itemsCount: created.items.length },
      schoolId,
      ipAddress: req.ip
    });

    return res.status(201).json({ success: true, scheme: created });
  } catch (error: any) {
    console.error('Error creating scheme of work:', error);
    return res.status(500).json({ error: 'Failed to create scheme of work: ' + error.message });
  }
});

/**
 * PUT /api/schemes/:id - Update scheme metadata & items
 */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { form, term, year, syllabusId, classId, comments, items } = req.body;

  try {
    const existing = await prisma.schemeOfWork.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Scheme not found' });

    // Locked schemes can only be edited by Admin/HOD
    const isHodOrAdmin = req.user?.role === 'SCHOOL_ADMIN' || req.user?.role === 'SUPER_ADMIN' ||
      req.user?.secondaryRoles?.some((r: string) => ['HOD', 'DEPARTMENT_HEAD', 'SUPERVISOR'].includes(r.toUpperCase()));

    if (existing.status === 'locked' && !isHodOrAdmin) {
      return res.status(403).json({ error: 'Cannot modify a locked scheme of work. Contact HOD or Administrator.' });
    }

    const updated = await prisma.schemeOfWork.update({
      where: { id },
      data: {
        form: form !== undefined ? String(form) : undefined,
        term: term !== undefined ? Number(term) : undefined,
        year: year !== undefined ? Number(year) : undefined,
        syllabusId: syllabusId !== undefined ? syllabusId : undefined,
        classId: classId !== undefined ? classId : undefined,
        comments: comments !== undefined ? comments : undefined
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        items: true
      }
    });

    // If items are passed, replace or update
    if (Array.isArray(items)) {
      await prisma.schemeItem.deleteMany({ where: { schemeId: id } });
      await prisma.schemeItem.createMany({
        data: items.map((it: any, idx: number) => ({
          schoolId: schoolId!,
          schemeId: id,
          week: it.week ? Number(it.week) : idx + 1,
          plannedDate: it.plannedDate ? new Date(it.plannedDate) : null,
          periodsRequired: it.periodsRequired ? Number(it.periodsRequired) : 1,
          syllabusTopicId: it.syllabusTopicId || null,
          subTopic: it.subTopic || null,
          activities: it.activities || null,
          resources: it.resources || null,
          assessmentMethod: it.assessmentMethod || null,
          status: it.status || 'planned'
        }))
      });
    }

    return res.json({ success: true, scheme: updated });
  } catch (error: any) {
    console.error('Error updating scheme:', error);
    return res.status(500).json({ error: 'Failed to update scheme: ' + error.message });
  }
});

/**
 * POST /api/schemes/:id/submit - Submit scheme for HOD review
 */
router.post('/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const existing = await prisma.schemeOfWork.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Scheme not found' });

    const updated = await prisma.schemeOfWork.update({
      where: { id },
      data: { status: 'pending_approval' }
    });

    return res.json({ success: true, message: 'Scheme submitted for HOD review', scheme: updated });
  } catch (error: any) {
    console.error('Error submitting scheme:', error);
    return res.status(500).json({ error: 'Failed to submit scheme' });
  }
});

/**
 * POST /api/schemes/:id/approve - HOD / Admin approves scheme
 */
router.post('/:id/approve', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  // Verify HOD role or School Admin
  const isHodOrAdmin = req.user?.role === 'SCHOOL_ADMIN' || req.user?.role === 'SUPER_ADMIN' ||
    req.user?.secondaryRoles?.some((r: string) => ['HOD', 'DEPARTMENT_HEAD', 'SUPERVISOR'].includes(r.toUpperCase()));

  if (!isHodOrAdmin) {
    return res.status(403).json({ error: 'Only Head of Department (HOD) or School Admin can approve schemes of work.' });
  }

  try {
    const existing = await prisma.schemeOfWork.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Scheme not found' });

    const updated = await prisma.schemeOfWork.update({
      where: { id },
      data: {
        status: 'hod_approved',
        hodApprovedById: req.user!.id,
        hodApprovedAt: new Date(),
        rejectionReason: null
      },
      include: {
        hodApprovedBy: { select: { id: true, name: true, role: true } },
        subject: { select: { name: true } }
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'APPROVE_SCHEME_OF_WORK',
      entityType: 'SchemeOfWork',
      entityId: id,
      details: { subject: updated.subject.name, term: updated.term, year: updated.year },
      schoolId: schoolId!,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Scheme of work approved by HOD. Lesson plans can now be planned.', scheme: updated });
  } catch (error: any) {
    console.error('Error approving scheme:', error);
    return res.status(500).json({ error: 'Failed to approve scheme' });
  }
});

/**
 * POST /api/schemes/:id/reject - HOD / Admin rejects scheme with notes
 */
router.post('/:id/reject', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const existing = await prisma.schemeOfWork.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Scheme not found' });

    const updated = await prisma.schemeOfWork.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: String(reason),
        hodApprovedById: null,
        hodApprovedAt: null
      }
    });

    return res.json({ success: true, message: 'Scheme of work returned for revision', scheme: updated });
  } catch (error: any) {
    console.error('Error rejecting scheme:', error);
    return res.status(500).json({ error: 'Failed to reject scheme' });
  }
});

/**
 * POST /api/schemes/:id/lock - Lock scheme for the academic term
 */
router.post('/:id/lock', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const updated = await prisma.schemeOfWork.update({
      where: { id },
      data: { status: 'locked' }
    });

    return res.json({ success: true, message: 'Scheme locked for term execution', scheme: updated });
  } catch (error: any) {
    console.error('Error locking scheme:', error);
    return res.status(500).json({ error: 'Failed to lock scheme' });
  }
});

/**
 * POST /api/schemes/:id/items - Add item to scheme
 */
router.post('/:id/items', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { week, plannedDate, periodsRequired, syllabusTopicId, subTopic, activities, resources, assessmentMethod } = req.body;

  if (!week) return res.status(400).json({ error: 'Week number is required' });

  try {
    const scheme = await prisma.schemeOfWork.findFirst({ where: { id, schoolId } });
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    const item = await prisma.schemeItem.create({
      data: {
        schoolId: schoolId!,
        schemeId: id,
        week: Number(week),
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        periodsRequired: periodsRequired ? Number(periodsRequired) : 1,
        syllabusTopicId: syllabusTopicId || null,
        subTopic: subTopic || null,
        activities: activities || null,
        resources: resources || null,
        assessmentMethod: assessmentMethod || null,
        status: 'planned'
      },
      include: {
        syllabusTopic: true
      }
    });

    return res.status(201).json({ success: true, item });
  } catch (error: any) {
    console.error('Error adding scheme item:', error);
    return res.status(500).json({ error: 'Failed to add scheme item' });
  }
});

/**
 * PUT /api/schemes/:id/items/:itemId - Update item in scheme
 */
router.put('/:id/items/:itemId', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const itemId = String(req.params.itemId);
  const { week, plannedDate, periodsRequired, syllabusTopicId, subTopic, activities, resources, assessmentMethod, status } = req.body;

  try {
    const item = await prisma.schemeItem.findFirst({
      where: { id: itemId, schemeId: id, schoolId }
    });
    if (!item) return res.status(404).json({ error: 'Scheme item not found' });

    const updated = await prisma.schemeItem.update({
      where: { id: itemId },
      data: {
        week: week !== undefined ? Number(week) : undefined,
        plannedDate: plannedDate !== undefined ? (plannedDate ? new Date(plannedDate) : null) : undefined,
        periodsRequired: periodsRequired !== undefined ? Number(periodsRequired) : undefined,
        syllabusTopicId: syllabusTopicId !== undefined ? syllabusTopicId : undefined,
        subTopic: subTopic !== undefined ? subTopic : undefined,
        activities: activities !== undefined ? activities : undefined,
        resources: resources !== undefined ? resources : undefined,
        assessmentMethod: assessmentMethod !== undefined ? assessmentMethod : undefined,
        status: status !== undefined ? status : undefined
      },
      include: {
        syllabusTopic: true
      }
    });

    return res.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('Error updating scheme item:', error);
    return res.status(500).json({ error: 'Failed to update scheme item' });
  }
});

/**
 * DELETE /api/schemes/:id/items/:itemId - Remove item from scheme
 */
router.delete('/:id/items/:itemId', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const itemId = String(req.params.itemId);

  try {
    const item = await prisma.schemeItem.findFirst({
      where: { id: itemId, schemeId: id, schoolId }
    });
    if (!item) return res.status(404).json({ error: 'Scheme item not found' });

    await prisma.schemeItem.delete({ where: { id: itemId } });
    return res.json({ success: true, message: 'Scheme item deleted' });
  } catch (error: any) {
    console.error('Error deleting scheme item:', error);
    return res.status(500).json({ error: 'Failed to delete scheme item' });
  }
});

/**
 * DELETE /api/schemes/:id - Delete scheme
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const existing = await prisma.schemeOfWork.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Scheme not found' });

    if (existing.status === 'locked') {
      return res.status(400).json({ error: 'Cannot delete a locked scheme of work' });
    }

    await prisma.schemeOfWork.delete({ where: { id } });
    return res.json({ success: true, message: 'Scheme deleted' });
  } catch (error: any) {
    console.error('Error deleting scheme:', error);
    return res.status(500).json({ error: 'Failed to delete scheme' });
  }
});

export default router;
