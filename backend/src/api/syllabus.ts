import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/syllabus - List all syllabi for school
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { subjectId, form } = req.query;

  try {
    const whereClause: any = { schoolId };
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (form) whereClause.form = String(form);

    const syllabi = await prisma.syllabus.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        topics: {
          orderBy: { expectedWeek: 'asc' },
          include: {
            coveredBy: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ syllabi, count: syllabi.length });
  } catch (error: any) {
    console.error('Error fetching syllabi:', error);
    return res.status(500).json({ error: 'Failed to fetch syllabi' });
  }
});

// POST /api/syllabus - Create new syllabus
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID missing from user session' });
  }

  const { subjectId, form, url, topics } = req.body;
  if (!subjectId || !form) {
    return res.status(400).json({ error: 'subjectId and form are required' });
  }

  try {
    const created = await prisma.syllabus.create({
      data: {
        schoolId,
        subjectId,
        form: String(form),
        url: url || null,
        uploadedById: req.user?.id || null,
        topics: Array.isArray(topics) && topics.length > 0 ? {
          create: topics.map((t: any) => ({
            topic: t.topic || t.name,
            code: t.code || null,
            expectedWeek: t.expectedWeek ? Number(t.expectedWeek) : null,
            objectives: t.objectives || null,
            isCovered: Boolean(t.isCovered)
          }))
        } : undefined
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        topics: true
      }
    });

    return res.status(201).json({ success: true, syllabus: created });
  } catch (error: any) {
    console.error('Error creating syllabus:', error);
    return res.status(500).json({ error: 'Failed to create syllabus' });
  }
});

// GET /api/syllabus/:id - Single syllabus details
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id, schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        topics: {
          orderBy: { expectedWeek: 'asc' },
          include: {
            coveredBy: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    return res.json({ syllabus });
  } catch (error: any) {
    console.error('Error fetching syllabus:', error);
    return res.status(500).json({ error: 'Failed to fetch syllabus details' });
  }
});

// POST /api/syllabus/:id/topics - Add topic to syllabus
router.post('/:id/topics', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { topic, code, expectedWeek, objectives, isCovered } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic title is required' });
  }

  try {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id, schoolId }
    });

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const createdTopic = await prisma.syllabusTopic.create({
      data: {
        syllabusId: id,
        topic,
        code: code || null,
        expectedWeek: expectedWeek ? Number(expectedWeek) : null,
        objectives: objectives || null,
        isCovered: Boolean(isCovered),
        coveredById: isCovered ? req.user?.id : null,
        coveredAt: isCovered ? new Date() : null
      }
    });

    return res.status(201).json({ success: true, topic: createdTopic });
  } catch (error: any) {
    console.error('Error adding topic to syllabus:', error);
    return res.status(500).json({ error: 'Failed to add topic' });
  }
});

// PATCH /api/syllabus/topics/:topicId - Update topic status / details
router.patch('/topics/:topicId', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const topicId = req.params.topicId as string;
  const { topic, code, expectedWeek, objectives, isCovered } = req.body;

  try {
    const existing = await prisma.syllabusTopic.findFirst({
      where: {
        id: topicId,
        syllabus: { schoolId }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus topic not found' });
    }

    const updateData: any = {};
    if (topic !== undefined) updateData.topic = topic;
    if (code !== undefined) updateData.code = code;
    if (expectedWeek !== undefined) updateData.expectedWeek = Number(expectedWeek);
    if (objectives !== undefined) updateData.objectives = objectives;
    if (isCovered !== undefined) {
      updateData.isCovered = Boolean(isCovered);
      if (isCovered && !existing.isCovered) {
        updateData.coveredById = req.user?.id;
        updateData.coveredAt = new Date();
      } else if (!isCovered) {
        updateData.coveredById = null;
        updateData.coveredAt = null;
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

// DELETE /api/syllabus/:id - Delete syllabus
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const existing = await prisma.syllabus.findFirst({
      where: { id, schoolId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    await prisma.syllabus.delete({
      where: { id }
    });

    return res.json({ success: true, message: 'Syllabus deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting syllabus:', error);
    return res.status(500).json({ error: 'Failed to delete syllabus' });
  }
});

export default router;
