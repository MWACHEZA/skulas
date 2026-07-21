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
    const { title, description, instructions, date, time, passingPercent, classId, sectionId, subjectId } = req.body;
    const exam = await prisma.cBTExam.create({
      data: {
        title,
        description,
        instructions,
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
        school: true,
        questions: {
          orderBy: [
            { page: 'asc' },
            { section: 'asc' },
            { createdAt: 'asc' }
          ]
        }
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
    const { status, title, description, instructions, date, time, passingPercent, classId, sectionId, subjectId } = req.body;
    
    // First verify ownership or admin
    const existing = await prisma.cBTExam.findFirst({ where: { id: req.params.id as string } });
    if (!existing || existing.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (instructions !== undefined) data.instructions = instructions;
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
    const { type, mark, question, options, answer, section, page } = req.body;
    
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
        answer,
        section: section || null,
        page: page ? Number(page) : 1
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
// Submit an exam (Auto-grade)
router.post('/:id/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id as string;
    const { responses } = req.body;
    
    const existingResult = await prisma.cBTResult.findUnique({
      where: { examId_studentId: { examId, studentId: req.user!.id } }
    });
    
    if (existingResult) {
      return res.status(400).json({ error: 'You have already submitted this exam.' });
    }

    const exam = await prisma.cBTExam.findUnique({
      where: { id: examId },
      include: { questions: true }
    });
    
    if (!exam || exam.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    let score = 0;
    const totalMarks = exam.totalMarks;

    exam.questions.forEach((q) => {
      const studentAns = responses[q.id];
      const correctAns = q.answer;

      if (studentAns === undefined || studentAns === null) return;

      if (q.type === 'Single choice') {
        if (studentAns === correctAns) score += q.mark;
      } else if (q.type === 'Multiple choice') {
        if (Array.isArray(studentAns) && Array.isArray(correctAns)) {
          const isCorrect = studentAns.length === correctAns.length && 
            studentAns.every(val => correctAns.includes(val));
          if (isCorrect) score += q.mark;
        }
      } else if (q.type === 'True or false') {
        if (studentAns === correctAns) score += q.mark;
      } else if (q.type === 'Fill in the blanks') {
        if (typeof studentAns === 'string' && typeof correctAns === 'string') {
          if (studentAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
            score += q.mark;
          }
        }
      }
    });

    const percent = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const status = percent >= exam.passingPercent ? 'Pass' : 'Fail';

    const result = await prisma.cBTResult.create({
      data: {
        examId,
        studentId: req.user!.id,
        score,
        totalMarks,
        status,
        responses
      }
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// Get all results for an exam
router.get('/:id/results', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id as string;
    
    const exam = await prisma.cBTExam.findUnique({ where: { id: examId } });
    if (!exam || exam.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const results = await prisma.cBTResult.findMany({
      where: { examId },
      orderBy: { createdAt: 'desc' }
    });

    const studentIds = results.map(r => r.studentId);
    
    // In skulas, a logged-in student uses User model. Sometimes User.student is linked. Let's fetch Users.
    const users = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      include: { student: { include: { class: true } } }
    });

    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, u));

    const enrichedResults = results.map(r => {
      const u = userMap.get(r.studentId);
      return {
        ...r,
        student: u ? {
          firstName: u.firstName,
          lastName: u.lastName,
          class: u.student?.class ? { name: u.student.class.name } : null
        } : null
      };
    });

    res.json(enrichedResults);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
});

// Remark a student's result
router.put('/results/:resultId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const resultId = req.params.resultId as string;
    const { score, status } = req.body;

    const result = await prisma.cBTResult.findUnique({
      where: { id: resultId },
      include: { exam: true }
    });

    if (!result || result.exam.schoolId !== req.user!.schoolId) {
      return res.status(404).json({ error: 'Result not found' });
    }

    const updated = await prisma.cBTResult.update({
      where: { id: resultId },
      data: { score: Number(score), status }
    });

    res.json({ success: true, result: updated });
  } catch (error) {
    console.error('Error updating exam result:', error);
    res.status(500).json({ error: 'Failed to update result' });
  }
});

export default router;
