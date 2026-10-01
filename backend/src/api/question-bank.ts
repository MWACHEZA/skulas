import { Router } from 'express';
import { PrismaClient } from '../generated/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/questions', async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      include: { subject: true, createdBy: true }
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.post('/questions', async (req, res) => {
  try {
    const { type, text, form, subjectId, syllabusTopicId, difficulty, marks, options, explanation, isShared, schoolId, createdById } = req.body;
    const question = await prisma.question.create({
      data: {
        type, text, form, subjectId, syllabusTopicId, difficulty, marks, options, explanation, isShared, schoolId, createdById
      }
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.get('/papers', async (req, res) => {
  try {
    const papers = await prisma.questionPaper.findMany({
      include: { subject: true }
    });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

router.post('/papers', async (req, res) => {
  try {
    const { title, totalMarks, createdById, schoolId, sections, subjectId } = req.body;
    const paper = await prisma.questionPaper.create({
      data: {
        title, totalMarks, createdById, schoolId, sections, subjectId
      }
    });
    res.json(paper);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create paper' });
  }
});

router.post('/papers/:id/convert-to-cbt', async (req, res) => {
  try {
    const { id } = req.params;
    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    const { classId, startTime, endTime, durationMinutes, passingPercentage } = req.body;
    
    const cbt = await prisma.cbtExam.create({
      data: {
        title: paper.title,
        classId,
        subjectId: paper.subjectId,
        description: paper.description,
        instructions: paper.instructions,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        durationMinutes: durationMinutes || paper.duration,
        passingPercentage: passingPercentage || 50,
        createdById: paper.teacherId || '',
        schoolId: paper.schoolId,
        status: 'Pending',
        questions: paper.sections || []
      }
    });

    res.json(cbt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert to CBT' });
  }
});

export default router;
