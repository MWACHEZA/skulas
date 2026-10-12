import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();

/**
 * GET /api/syllabus - List all syllabi for school with coverage metrics
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { subjectId, form, curriculum, status } = req.query;

  try {
    const whereClause: any = { schoolId };
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (form) whereClause.form = String(form);
    if (curriculum) whereClause.curriculum = String(curriculum);
    if (status) whereClause.status = String(status);

    const syllabi = await prisma.syllabus.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        topics: {
          orderBy: [{ term: 'asc' }, { week: 'asc' }, { expectedWeek: 'asc' }],
          include: {
            coveredBy: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = syllabi.map(s => {
      const totalTopics = s.topics.length;
      const coveredTopics = s.topics.filter(t => t.isCovered || t.status === 'covered').length;
      const progress = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;
      return {
        ...s,
        totalTopics,
        coveredTopics,
        coveragePercentage: progress
      };
    });

    return res.json({ syllabi: enriched, count: enriched.length });
  } catch (error: any) {
    console.error('Error fetching syllabi:', error);
    return res.status(500).json({ error: 'Failed to fetch syllabi' });
  }
});

/**
 * GET /api/syllabus/:id - Single syllabus details with structured term/week breakdown
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id, schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true, caWeight: true, examWeight: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        topics: {
          orderBy: [{ term: 'asc' }, { week: 'asc' }, { expectedWeek: 'asc' }],
          include: {
            coveredBy: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const totalTopics = syllabus.topics.length;
    const coveredTopics = syllabus.topics.filter(t => t.isCovered || t.status === 'covered').length;
    const coveragePercentage = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;

    // Group topics by term
    const termBreakdown = {
      term1: syllabus.topics.filter(t => (t.term || 1) === 1),
      term2: syllabus.topics.filter(t => t.term === 2),
      term3: syllabus.topics.filter(t => t.term === 3)
    };

    return res.json({
      syllabus: {
        ...syllabus,
        totalTopics,
        coveredTopics,
        coveragePercentage,
        termBreakdown
      }
    });
  } catch (error: any) {
    console.error('Error fetching syllabus:', error);
    return res.status(500).json({ error: 'Failed to fetch syllabus details' });
  }
});

/**
 * POST /api/syllabus - Create new structured syllabus (ZIMSEC, Cambridge, etc.)
 */
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { subjectId, form, level, curriculum, year, totalHours, status, url, topics } = req.body;
  if (!subjectId || !form) {
    return res.status(400).json({ error: 'subjectId and form are required' });
  }

  try {
    const created = await prisma.syllabus.create({
      data: {
        schoolId,
        subjectId,
        form: String(form),
        level: level || (form.toLowerCase().includes('6') ? 'A-Level' : 'O-Level'),
        curriculum: curriculum || 'ZIMSEC',
        year: year ? Number(year) : new Date().getFullYear(),
        totalHours: totalHours ? Number(totalHours) : null,
        status: status || 'active',
        url: url || null,
        uploadedById: req.user?.id || null,
        topics: Array.isArray(topics) && topics.length > 0 ? {
          create: topics.map((t: any, index: number) => ({
            topic: t.topicTitle || t.topic || t.name,
            topicTitle: t.topicTitle || t.topic || t.name,
            code: t.code || null,
            term: t.term ? Number(t.term) : 1,
            week: t.week ? Number(t.week) : (t.expectedWeek ? Number(t.expectedWeek) : index + 1),
            expectedWeek: t.week ? Number(t.week) : (t.expectedWeek ? Number(t.expectedWeek) : index + 1),
            objectives: t.objectives || null,
            content: t.content || null,
            competencies: t.competencies || null,
            hours: t.hours ? Number(t.hours) : null,
            status: t.status || (t.isCovered ? 'covered' : 'pending'),
            isCovered: Boolean(t.isCovered || t.status === 'covered')
          }))
        } : undefined
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        topics: true
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_SYLLABUS',
      entityType: 'Syllabus',
      entityId: created.id,
      details: { subjectId, form, curriculum: created.curriculum, topicsCount: created.topics.length },
      schoolId,
      ipAddress: req.ip
    });

    return res.status(201).json({ success: true, syllabus: created });
  } catch (error: any) {
    console.error('Error creating syllabus:', error);
    return res.status(500).json({ error: 'Failed to create syllabus: ' + error.message });
  }
});

/**
 * PUT /api/syllabus/:id - Update syllabus metadata
 */
router.put('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { form, level, curriculum, year, totalHours, status, url } = req.body;

  try {
    const existing = await prisma.syllabus.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Syllabus not found' });

    const updated = await prisma.syllabus.update({
      where: { id },
      data: {
        form: form !== undefined ? String(form) : undefined,
        level: level !== undefined ? String(level) : undefined,
        curriculum: curriculum !== undefined ? String(curriculum) : undefined,
        year: year !== undefined ? Number(year) : undefined,
        totalHours: totalHours !== undefined ? Number(totalHours) : undefined,
        status: status !== undefined ? String(status) : undefined,
        url: url !== undefined ? url : undefined
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        topics: true
      }
    });

    return res.json({ success: true, syllabus: updated });
  } catch (error: any) {
    console.error('Error updating syllabus:', error);
    return res.status(500).json({ error: 'Failed to update syllabus' });
  }
});

/**
 * POST /api/syllabus/:id/topics - Add structured topic to syllabus
 */
router.post('/:id/topics', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { topic, topicTitle, code, term, week, expectedWeek, objectives, content, competencies, hours, isCovered, status } = req.body;

  const title = topicTitle || topic;
  if (!title) {
    return res.status(400).json({ error: 'Topic title is required' });
  }

  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id, schoolId }
    });

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const targetWeek = week ? Number(week) : (expectedWeek ? Number(expectedWeek) : 1);
    const covered = Boolean(isCovered || status === 'covered');

    const createdTopic = await prisma.syllabusTopic.create({
      data: {
        syllabusId: id,
        topic: title,
        topicTitle: title,
        code: code || null,
        term: term ? Number(term) : 1,
        week: targetWeek,
        expectedWeek: targetWeek,
        objectives: objectives || null,
        content: content || null,
        competencies: competencies || null,
        hours: hours ? Number(hours) : null,
        status: status || (covered ? 'covered' : 'pending'),
        isCovered: covered,
        coveredById: covered ? req.user?.id : null,
        coveredAt: covered ? new Date() : null
      }
    });

    return res.status(201).json({ success: true, topic: createdTopic });
  } catch (error: any) {
    console.error('Error adding topic to syllabus:', error);
    return res.status(500).json({ error: 'Failed to add topic' });
  }
});

/**
 * PUT /api/syllabus/:id/topics/:topicId - Update topic details
 */
router.put('/:id/topics/:topicId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const topicId = String(req.params.topicId);
  const { topic, topicTitle, code, term, week, expectedWeek, objectives, content, competencies, hours, isCovered, status } = req.body;

  try {
    const existing = await prisma.syllabusTopic.findFirst({
      where: { id: topicId, syllabusId: id, syllabus: { schoolId } }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus topic not found' });
    }

    const updateData: any = {};
    const title = topicTitle || topic;
    if (title !== undefined) {
      updateData.topic = title;
      updateData.topicTitle = title;
    }
    if (code !== undefined) updateData.code = code;
    if (term !== undefined) updateData.term = Number(term);
    if (week !== undefined) {
      updateData.week = Number(week);
      updateData.expectedWeek = Number(week);
    } else if (expectedWeek !== undefined) {
      updateData.week = Number(expectedWeek);
      updateData.expectedWeek = Number(expectedWeek);
    }
    if (objectives !== undefined) updateData.objectives = objectives;
    if (content !== undefined) updateData.content = content;
    if (competencies !== undefined) updateData.competencies = competencies;
    if (hours !== undefined) updateData.hours = Number(hours);
    if (status !== undefined) updateData.status = status;

    if (isCovered !== undefined || status === 'covered') {
      const covered = Boolean(isCovered || status === 'covered');
      updateData.isCovered = covered;
      if (covered && !existing.isCovered) {
        updateData.coveredById = req.user?.id;
        updateData.coveredAt = new Date();
        updateData.status = 'covered';
      } else if (!covered) {
        updateData.coveredById = null;
        updateData.coveredAt = null;
        if (updateData.status === 'covered') updateData.status = 'pending';
      }
    }

    const updated = await prisma.syllabusTopic.update({
      where: { id: topicId },
      data: updateData
    });

    return res.json({ success: true, topic: updated });
  } catch (error: any) {
    console.error('Error updating syllabus topic:', error);
    return res.status(500).json({ error: 'Failed to update topic' });
  }
});

/**
 * POST /api/syllabus/:id/topics/:topicId/mark-covered - Toggle covered status
 */
router.post('/:id/topics/:topicId/mark-covered', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const topicId = String(req.params.topicId);
  const { isCovered } = req.body;

  try {
    const existing = await prisma.syllabusTopic.findFirst({
      where: { id: topicId, syllabusId: id, syllabus: { schoolId } }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus topic not found' });
    }

    const newCovered = isCovered !== undefined ? Boolean(isCovered) : !existing.isCovered;
    const updated = await prisma.syllabusTopic.update({
      where: { id: topicId },
      data: {
        isCovered: newCovered,
        status: newCovered ? 'covered' : 'pending',
        coveredById: newCovered ? req.user?.id : null,
        coveredAt: newCovered ? new Date() : null
      }
    });

    return res.json({ success: true, topic: updated });
  } catch (error: any) {
    console.error('Error toggling topic coverage:', error);
    return res.status(500).json({ error: 'Failed to update topic coverage' });
  }
});

/**
 * DELETE /api/syllabus/:id/topics/:topicId - Delete topic
 */
router.delete('/:id/topics/:topicId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const topicId = String(req.params.topicId);

  try {
    const existing = await prisma.syllabusTopic.findFirst({
      where: { id: topicId, syllabusId: id, syllabus: { schoolId } }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus topic not found' });
    }

    await prisma.syllabusTopic.delete({ where: { id: topicId } });
    return res.json({ success: true, message: 'Topic deleted' });
  } catch (error: any) {
    console.error('Error deleting topic:', error);
    return res.status(500).json({ error: 'Failed to delete topic' });
  }
});

/**
 * DELETE /api/syllabus/:id - Delete syllabus
 */
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const existing = await prisma.syllabus.findFirst({
      where: { id, schoolId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    await prisma.syllabus.delete({ where: { id } });
    return res.json({ success: true, message: 'Syllabus deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting syllabus:', error);
    return res.status(500).json({ error: 'Failed to delete syllabus' });
  }
});

export default router;
