import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get syllabus items (Scheme of Work)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { classId, subjectId } = req.query;
    const syllabuses = await prisma.syllabus.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        ...(classId ? { classId: classId as string } : {}),
        ...(subjectId ? { subjectId: subjectId as string } : {})
      },
      include: {
        class: true,
        subject: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(syllabuses);
  } catch (error) {
    console.error('Error fetching syllabus:', error);
    res.status(500).json({ error: 'Failed to fetch syllabus' });
  }
});

// Create a syllabus item
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { classId, subjectId, topic, content, week } = req.body;
    
    if (!classId || !subjectId || !topic || !content || !week) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const syllabus = await prisma.syllabus.create({
      data: {
        classId,
        subjectId,
        topic,
        content,
        week,
        schoolId: req.user!.schoolId!
      }
    });
    
    res.json({ success: true, syllabus });
  } catch (error) {
    console.error('Error creating syllabus:', error);
    res.status(500).json({ error: 'Failed to create syllabus item' });
  }
});

// Bulk create syllabus items (Weeks -> Topic + Content)
router.post('/bulk', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { classId, subjectId, weeks } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!classId || !subjectId || !Array.isArray(weeks) || weeks.length === 0) {
      return res.status(400).json({ error: 'Class, subject, and at least one week entry are required' });
    }

    // Filter valid week items with topic & content
    const validWeeks = weeks.filter(w => w.week && (w.topic || w.content));
    if (validWeeks.length === 0) {
      return res.status(400).json({ error: 'Please provide topic and content for the defined weeks' });
    }

    const created = await prisma.$transaction(
      validWeeks.map(w => prisma.syllabus.create({
        data: {
          classId,
          subjectId,
          week: w.week,
          topic: w.topic || 'Untitled Topic',
          content: w.content || '',
          schoolId
        }
      }))
    );

    res.json({ success: true, count: created.length, syllabuses: created });
  } catch (error) {
    console.error('Error bulk creating syllabus:', error);
    res.status(500).json({ error: 'Failed to bulk create syllabus items' });
  }
});

// Update a syllabus item
router.put('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { topic, content, week } = req.body;
    const schoolId = req.user!.schoolId!;

    const existing = await prisma.syllabus.findFirst({
      where: { id: id as string, schoolId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Syllabus item not found' });
    }

    const updated = await prisma.syllabus.update({
      where: { id: id as string },
      data: {
        topic: topic !== undefined ? topic : existing.topic,
        content: content !== undefined ? content : existing.content,
        week: week !== undefined ? week : existing.week
      }
    });

    res.json({ success: true, syllabus: updated });
  } catch (error) {
    console.error('Error updating syllabus:', error);
    res.status(500).json({ error: 'Failed to update syllabus item' });
  }
});

// Delete a syllabus item
router.delete('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.syllabus.findFirst({ where: { id: req.params.id as string } });
    if (!existing || existing.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Syllabus item not found' });
    }
    await prisma.syllabus.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    res.status(500).json({ error: 'Failed to delete syllabus item' });
  }
});

export default router;
