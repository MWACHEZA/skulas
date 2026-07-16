import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all CBT exams for a school
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const exams = await prisma.cBTExam.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        class: true,
        section: true,
        subject: true,
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    console.error('Error fetching CBT exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// Create a new CBT exam
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { title, description, date, time, passingPercent, classId, sectionId, subjectId } = req.body;
    const exam = await prisma.cBTExam.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        passingPercent: Number(passingPercent),
        classId,
        sectionId,
        subjectId,
        schoolId: req.user!.schoolId!,
        teacherId: req.user!.staffId
      }
    });
    res.json({ success: true, exam });
  } catch (error) {
    console.error('Error creating CBT exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

// Get a specific exam with questions
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const exam = await prisma.cBTExam.findFirst({
      where: { id: req.params.id as string },
      include: {
        class: true,
        section: true,
        subject: true,
        questions: true
      }
    });
    if (!exam || exam.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    console.error('Error fetching CBT exam:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// Update exam status (Publish)
router.put('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, title, date, time, passingPercent, classId, sectionId, subjectId } = req.body;
    
    // First verify ownership or admin
    const existing = await prisma.cBTExam.findFirst({ where: { id: req.params.id as string } });
    if (!existing || existing.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (title !== undefined) data.title = title;
    if (date !== undefined) data.date = new Date(date);
    if (time !== undefined) data.time = time;
    if (passingPercent !== undefined) data.passingPercent = Number(passingPercent);
    if (classId !== undefined) data.classId = classId;
    if (sectionId !== undefined) data.sectionId = sectionId;
    if (subjectId !== undefined) data.subjectId = subjectId;

    const exam = await prisma.cBTExam.update({
      where: { id: req.params.id as string },
      data
    });
    res.json({ success: true, exam });
  } catch (error) {
    console.error('Error updating CBT exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// Delete an exam
router.delete('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.cBTExam.findFirst({ where: { id: req.params.id as string } });
    if (!existing || existing.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    await prisma.cBTExam.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

// Add a question to an exam
router.post('/:id/questions', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id as string;
    const { type, mark, question, options, answer } = req.body;
    
    const exam = await prisma.cBTExam.findFirst({ where: { id: examId } });
    if (!exam || exam.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const newQuestion = await prisma.cBTQuestion.create({
      data: {
        examId,
        type,
        mark: Number(mark),
        question,
        options: options || [],
        answer
      }
    });
    
    // Update total marks of the exam
    await prisma.cBTExam.update({
      where: { id: examId },
      data: {
        totalMarks: { increment: Number(mark) }
      }
    });

    res.json({ success: true, question: newQuestion });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Delete a question
router.delete('/:examId/questions/:questionId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.examId as string;
    const questionId = req.params.questionId as string;
    
    const exam = await prisma.cBTExam.findFirst({ where: { id: examId } });
    if (!exam || exam.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const question = await prisma.cBTQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.examId !== examId) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await prisma.cBTQuestion.delete({ where: { id: questionId } });
    
    // Update total marks of the exam
    await prisma.cBTExam.update({
      where: { id: examId },
      data: {
        totalMarks: { decrement: question.mark }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
