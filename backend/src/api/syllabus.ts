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
