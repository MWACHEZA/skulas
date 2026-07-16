import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get lesson plan breakdowns
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { classId, subjectId, week, session } = req.query;
    
    const lessonPlans = await prisma.lessonPlan.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        ...(classId ? { classId: classId as string } : {}),
        ...(subjectId ? { subjectId: subjectId as string } : {}),
        ...(week ? { week: week as string } : {}),
        ...(session ? { session: session as string } : {})
      },
      include: {
        class: true,
        subject: true,
        syllabus: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(lessonPlans);
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    res.status(500).json({ error: 'Failed to fetch lesson plans' });
  }
});

// Create a lesson plan breakdown
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { classId, subjectId, syllabusId, week, session, content } = req.body;
    
    if (!classId || !subjectId || !syllabusId || !week || !session || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    let teacherId = '';
    if (req.user!.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher record not found for this user' });
      teacherId = teacher.id;
    } else {
      const schoolClass = await prisma.schoolClass.findFirst({ where: { id: classId } });
      if (schoolClass && schoolClass.teacherId) {
        teacherId = schoolClass.teacherId;
      } else {
        const teacher = await prisma.teacher.findFirst({ where: { schoolId: req.user!.schoolId! } });
        if (!teacher) return res.status(400).json({ error: 'No teachers found in the school to assign to this lesson plan.' });
        teacherId = teacher.id;
      }
    }

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        classId,
        subjectId,
        syllabusId,
        week,
        session,
        content,
        schoolId: req.user!.schoolId!,
        teacherId
      }
    });
    
    res.json({ success: true, lessonPlan });
  } catch (error) {
    console.error('Error creating lesson plan:', error);
    res.status(500).json({ error: 'Failed to create lesson plan breakdown' });
  }
});

// Delete a lesson plan breakdown
router.delete('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.lessonPlan.findFirst({ where: { id: req.params.id as string } });
    if (!existing || existing.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Lesson plan not found' });
    }
    
    // Only admins or the teacher who created it can delete it
    if (req.user!.role === 'TEACHER' && existing.teacherId !== req.user!.staffId) {
       return res.status(403).json({ error: 'You can only delete your own lesson plans' });
    }

    await prisma.lessonPlan.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson plan:', error);
    res.status(500).json({ error: 'Failed to delete lesson plan' });
  }
});

export default router;
