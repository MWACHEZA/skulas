import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

/**
 * GET /api/assessments/types - List configured assessment types
 */
router.get('/types', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID missing from user session' });

  try {
    let types = await prisma.assessmentType.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' }
    });

    // Seed standard Zimbabwe CALA and Cambridge / National defaults if none exist
    if (types.length === 0) {
      await prisma.assessmentType.createMany({
        data: [
          { schoolId, name: 'CALA 1 (Continuous Assessment)', weightDefault: 15, isExam: false, category: 'CA', description: 'Continuous Assessment Learning Activity 1' },
          { schoolId, name: 'CALA 2 (Continuous Assessment)', weightDefault: 15, isExam: false, category: 'CA', description: 'Continuous Assessment Learning Activity 2' },
          { schoolId, name: 'Mid-Term Test', weightDefault: 20, isExam: false, category: 'CA', description: 'Mid-term written assessment' },
          { schoolId, name: 'Practical / Project Work', weightDefault: 10, isExam: false, category: 'CA', description: 'Laboratory practical or design coursework' },
          { schoolId, name: 'End-of-Term Final Examination', weightDefault: 70, isExam: true, category: 'EXAM', description: 'Summative end of term formal examination' }
        ]
      });

      types = await prisma.assessmentType.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'asc' }
      });
    }

    return res.json({ types });
  } catch (error: any) {
    console.error('Error fetching assessment types:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment types' });
  }
});

/**
 * POST /api/assessments/types - Create new assessment type
 */
router.post('/types', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID missing from user session' });

  const { name, weightDefault, isExam, category, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Assessment type name is required' });

  try {
    const created = await prisma.assessmentType.create({
      data: {
        schoolId,
        name: String(name).trim(),
        weightDefault: weightDefault ? Number(weightDefault) : 20,
        isExam: Boolean(isExam),
        category: category || (isExam ? 'EXAM' : 'CA'),
        description: description || null
      }
    });

    return res.status(201).json({ success: true, type: created });
  } catch (error: any) {
    console.error('Error creating assessment type:', error);
    return res.status(500).json({ error: 'Failed to create assessment type: ' + error.message });
  }
});

// ============================================================================
// QUESTION BANK (Requires syllabusTopicId per specification)
// ============================================================================

/**
 * GET /api/assessments/question-bank/items - Get questions
 */
router.get('/question-bank/items', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID missing from user session' });

  const { subjectId, syllabusTopicId, difficulty, type } = req.query;

  try {
    const whereClause: any = { schoolId };
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (syllabusTopicId) whereClause.syllabusTopicId = String(syllabusTopicId);
    if (difficulty) whereClause.difficulty = String(difficulty);
    if (type) whereClause.type = String(type);

    const questions = await prisma.questionBank.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        syllabusTopic: { select: { id: true, topic: true, code: true, term: true, week: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ questions, count: questions.length });
  } catch (error: any) {
    console.error('Error fetching question bank items:', error);
    return res.status(500).json({ error: 'Failed to fetch question bank' });
  }
});

/**
 * POST /api/assessments/question-bank/items - Create question with MANDATORY syllabusTopicId
 */
router.post('/question-bank/items', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID missing from user session' });

  const { subjectId, syllabusTopicId, difficulty, type, questionText, options, answer, marks, imageUrl, explanation } = req.body;

  if (!questionText || !questionText.trim()) {
    return res.status(400).json({ error: 'Question text is required' });
  }

  // ENFORCE MANDATORY syllabusTopicId
  if (!syllabusTopicId || !syllabusTopicId.trim()) {
    return res.status(400).json({
      error: 'syllabusTopicId is required. Every question bank item must be mapped to a syllabus curriculum topic.'
    });
  }

  try {
    // Validate syllabusTopic exists and belongs to school
    const topic = await prisma.syllabusTopic.findFirst({
      where: { id: syllabusTopicId, syllabus: { schoolId } }
    });
    if (!topic) {
      return res.status(404).json({ error: 'Valid syllabus topic not found for this institution' });
    }

    let finalSubjectId = subjectId;
    if (!finalSubjectId) {
      const syl = await prisma.syllabus.findUnique({ where: { id: topic.syllabusId } });
      finalSubjectId = syl?.subjectId;
    }
    if (!finalSubjectId) {
      return res.status(400).json({ error: 'Subject ID is required' });
    }

    const created = await prisma.questionBank.create({
      data: {
        schoolId,
        subjectId: finalSubjectId,
        syllabusTopicId,
        difficulty: difficulty || 'MEDIUM',
        type: type || 'MULTIPLE_CHOICE',
        questionText: questionText.trim(),
        options: options || null,
        answer: answer || null,
        marks: marks ? Number(marks) : 1,
        imageUrl: imageUrl || null,
        explanation: explanation || null,
        createdById: req.user?.id || null
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        syllabusTopic: { select: { id: true, topic: true, code: true } }
      }
    });

    return res.status(201).json({ success: true, question: created });
  } catch (error: any) {
    console.error('Error creating question in bank:', error);
    return res.status(500).json({ error: 'Failed to create question bank entry: ' + error.message });
  }
});

// ============================================================================
// ASSESSMENTS (Tests & Exams unified engine)
// ============================================================================

/**
 * GET /api/assessments - List assessments
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID missing from user session' });

  const { subjectId, classId, term, year, isExam, status } = req.query;

  try {
    const whereClause: any = { schoolId };
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (classId) whereClause.classId = String(classId);
    if (term) whereClause.term = String(term);
    if (year) whereClause.year = Number(year);
    if (isExam !== undefined) whereClause.isExam = isExam === 'true';
    if (status) whereClause.status = String(status);

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true, level: true } },
        assessmentType: { select: { id: true, name: true, category: true, weightDefault: true } },
        createdBy: { select: { id: true, name: true } },
        moderatedBy: { select: { id: true, name: true } },
        _count: {
          select: {
            questions: true,
            studentAssessments: true,
            timetables: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ assessments, count: assessments.length });
  } catch (error: any) {
    console.error('Error fetching assessments:', error);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

/**
 * GET /api/assessments/:id - Assessment details with questions, timetable, and marking stats
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const assessment = await prisma.assessment.findFirst({
      where: { id, schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true, caWeight: true, examWeight: true } },
        schoolClass: { select: { id: true, name: true, level: true } },
        assessmentType: true,
        createdBy: { select: { id: true, name: true } },
        moderatedBy: { select: { id: true, name: true } },
        questions: {
          orderBy: { questionOrder: 'asc' },
          include: {
            syllabusTopic: { select: { id: true, topic: true, code: true } }
          }
        },
        timetables: {
          orderBy: { date: 'asc' },
          include: {
            schoolClass: { select: { id: true, name: true } },
            invigilator: { select: { id: true, user: { select: { name: true } } } }
          }
        },
        studentAssessments: {
          include: {
            student: { select: { id: true, name: true, studentId: true } }
          }
        }
      }
    });

    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    // Enforce publishing gate for student and parent users
    const userRole = (req.user?.role || '').toUpperCase();
    const isStudentOrParent = userRole === 'STUDENT' || userRole === 'PARENT';

    if (isStudentOrParent && assessment.status !== 'published') {
      return res.status(403).json({
        error: 'Assessment results have not been published yet.',
        status: assessment.status
      });
    }

    const marksCount = assessment.studentAssessments.length;
    const scoredList = assessment.studentAssessments.filter(sa => sa.marksObtained !== null);
    const averageMark = scoredList.length > 0
      ? Math.round((scoredList.reduce((acc, sa) => acc + (sa.marksObtained || 0), 0) / scoredList.length) * 10) / 10
      : 0;

    const moderatedCount = assessment.studentAssessments.filter(sa => sa.isModerated).length;
    const moderationSamplePercent = marksCount > 0 ? Math.round((moderatedCount / marksCount) * 100) : 0;

    return res.json({
      assessment: {
        ...assessment,
        stats: {
          totalEnrolled: marksCount,
          gradedCount: scoredList.length,
          averageMark,
          moderatedCount,
          moderationSamplePercent,
          isPublished: assessment.status === 'published'
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching assessment details:', error);
    return res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
});

/**
 * POST /api/assessments - Create test or exam
 */
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(400).json({ error: 'School ID missing from user session' });

  const {
    title, subjectId, classId, term, year, assessmentTypeId,
    syllabusTopicIds, totalMarks, passMark, weight, date,
    durationMinutes, instructions, isExam
  } = req.body;

  if (!title || !subjectId || !term || !year) {
    return res.status(400).json({ error: 'Title, subjectId, term, and year are required' });
  }

  try {
    const isFormalExam = Boolean(isExam);

    const created = await prisma.assessment.create({
      data: {
        schoolId,
        title: String(title).trim(),
        subjectId,
        classId: classId || null,
        term: String(term),
        year: Number(year),
        assessmentTypeId: assessmentTypeId || null,
        syllabusTopicIds: Array.isArray(syllabusTopicIds) ? syllabusTopicIds : [],
        totalMarks: totalMarks ? Number(totalMarks) : 100,
        passMark: passMark ? Number(passMark) : 50,
        weight: weight ? Number(weight) : (isFormalExam ? 70 : 20),
        date: date ? new Date(date) : null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : (isFormalExam ? 120 : 45),
        instructions: instructions || null,
        isExam: isFormalExam,
        status: 'draft',
        createdById: req.user?.id || null
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true } },
        assessmentType: true
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: isFormalExam ? 'CREATE_EXAMINATION' : 'CREATE_TEST',
      entityType: 'Assessment',
      entityId: created.id,
      details: { title, isExam: isFormalExam, subjectId, classId, term, year },
      schoolId,
      ipAddress: req.ip
    });

    return res.status(201).json({ success: true, assessment: created });
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    return res.status(500).json({ error: 'Failed to create assessment: ' + error.message });
  }
});

/**
 * PUT /api/assessments/:id - Update assessment
 */
router.put('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const {
    title, classId, term, year, assessmentTypeId,
    syllabusTopicIds, totalMarks, passMark, weight, date,
    durationMinutes, instructions, status
  } = req.body;

  try {
    const existing = await prisma.assessment.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Assessment not found' });

    if (existing.status === 'published' && req.user?.role !== 'SCHOOL_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify a published assessment. Unpublish or contact Administrator.' });
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        classId: classId !== undefined ? classId : undefined,
        term: term !== undefined ? String(term) : undefined,
        year: year !== undefined ? Number(year) : undefined,
        assessmentTypeId: assessmentTypeId !== undefined ? assessmentTypeId : undefined,
        syllabusTopicIds: syllabusTopicIds !== undefined ? (Array.isArray(syllabusTopicIds) ? syllabusTopicIds : []) : undefined,
        totalMarks: totalMarks !== undefined ? Number(totalMarks) : undefined,
        passMark: passMark !== undefined ? Number(passMark) : undefined,
        weight: weight !== undefined ? Number(weight) : undefined,
        date: date !== undefined ? (date ? new Date(date) : null) : undefined,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        instructions: instructions !== undefined ? instructions : undefined,
        status: status !== undefined ? status : undefined
      }
    });

    return res.json({ success: true, assessment: updated });
  } catch (error: any) {
    console.error('Error updating assessment:', error);
    return res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// ============================================================================
// QUESTIONS ATTACHMENT
// ============================================================================

/**
 * POST /api/assessments/:id/questions - Add question to assessment
 */
router.post('/:id/questions', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { questionBankId, questionText, section, marks, type, options, correctAnswer, syllabusTopicId } = req.body;

  try {
    const assessment = await prisma.assessment.findFirst({ where: { id, schoolId } });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    let finalQuestionText = questionText;
    let finalType = type || 'MULTIPLE_CHOICE';
    let finalOptions = options || null;
    let finalAnswer = correctAnswer || null;
    let finalMarks = marks ? Number(marks) : 1;
    let finalTopicId = syllabusTopicId || null;

    if (questionBankId) {
      const qb = await prisma.questionBank.findFirst({ where: { id: questionBankId, schoolId } });
      if (qb) {
        finalQuestionText = qb.questionText;
        finalType = qb.type;
        finalOptions = qb.options;
        finalAnswer = qb.answer;
        finalMarks = marks ? Number(marks) : qb.marks;
        finalTopicId = qb.syllabusTopicId;
      }
    }

    if (!finalQuestionText) {
      return res.status(400).json({ error: 'Question text or valid questionBankId is required' });
    }

    const currentCount = await prisma.assessmentQuestion.count({ where: { assessmentId: id } });

    const created = await prisma.assessmentQuestion.create({
      data: {
        schoolId: schoolId!,
        assessmentId: id,
        questionBankId: questionBankId || null,
        questionOrder: currentCount + 1,
        section: section || 'A',
        questionText: finalQuestionText,
        type: finalType,
        options: finalOptions,
        correctAnswer: finalAnswer,
        marks: finalMarks,
        syllabusTopicId: finalTopicId
      },
      include: {
        syllabusTopic: { select: { id: true, topic: true } }
      }
    });

    return res.status(201).json({ success: true, question: created });
  } catch (error: any) {
    console.error('Error adding assessment question:', error);
    return res.status(500).json({ error: 'Failed to add question to assessment' });
  }
});

/**
 * DELETE /api/assessments/:id/questions/:questionId - Remove question from assessment
 */
router.delete('/:id/questions/:questionId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const questionId = String(req.params.questionId);

  try {
    const q = await prisma.assessmentQuestion.findFirst({ where: { id: questionId, assessmentId: id, schoolId } });
    if (!q) return res.status(404).json({ error: 'Question not found on assessment' });

    await prisma.assessmentQuestion.delete({ where: { id: questionId } });
    return res.json({ success: true, message: 'Question removed' });
  } catch (error: any) {
    console.error('Error deleting assessment question:', error);
    return res.status(500).json({ error: 'Failed to remove question' });
  }
});

// ============================================================================
// EXAM TIMETABLE & CONFLICT CHECKING
// ============================================================================

/**
 * POST /api/assessments/:id/timetable - Schedule exam room & invigilator with conflict checks
 */
router.post('/:id/timetable', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { classId, date, startTime, endTime, roomId, roomName, invigilatorId } = req.body;

  if (!classId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'ClassId, date, startTime, and endTime are required' });
  }

  try {
    const assessment = await prisma.assessment.findFirst({ where: { id, schoolId } });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const examDate = new Date(date);

    // 1. Conflict check: Check if invigilator is already booked at that same date and overlapping time
    if (invigilatorId) {
      const invigilatorConflict = await prisma.examTimetable.findFirst({
        where: {
          schoolId,
          invigilatorId,
          date: examDate,
          OR: [
            { startTime: { lte: startTime }, endTime: { gt: startTime } },
            { startTime: { lt: endTime }, endTime: { gte: endTime } },
            { startTime: { gte: startTime }, endTime: { lte: endTime } }
          ]
        },
        include: { assessment: { select: { title: true } } }
      });

      if (invigilatorConflict) {
        return res.status(409).json({
          error: `Invigilator conflict: Teacher is already scheduled to invigilate '${invigilatorConflict.assessment.title}' on this date between ${invigilatorConflict.startTime} and ${invigilatorConflict.endTime}.`
        });
      }
    }

    // 2. Conflict check: Check if room is already booked at that same date and overlapping time
    if (roomName || roomId) {
      const roomConflict = await prisma.examTimetable.findFirst({
        where: {
          schoolId,
          date: examDate,
          OR: [
            roomId ? { roomId } : {},
            roomName ? { roomName } : {}
          ],
          AND: [
            {
              OR: [
                { startTime: { lte: startTime }, endTime: { gt: startTime } },
                { startTime: { lt: endTime }, endTime: { gte: endTime } },
                { startTime: { gte: startTime }, endTime: { lte: endTime } }
              ]
            }
          ]
        },
        include: { assessment: { select: { title: true } } }
      });

      if (roomConflict) {
        return res.status(409).json({
          error: `Room conflict: Room '${roomName || roomId}' is already allocated to '${roomConflict.assessment.title}' on this date between ${roomConflict.startTime} and ${roomConflict.endTime}.`
        });
      }
    }

    const timetable = await prisma.examTimetable.create({
      data: {
        schoolId: schoolId!,
        assessmentId: id,
        classId,
        date: examDate,
        startTime,
        endTime,
        roomId: roomId || null,
        roomName: roomName || null,
        invigilatorId: invigilatorId || null
      },
      include: {
        schoolClass: { select: { id: true, name: true } },
        invigilator: { select: { id: true, user: { select: { name: true } } } }
      }
    });

    // Update assessment status to scheduled if currently draft
    if (assessment.status === 'draft') {
      await prisma.assessment.update({ where: { id }, data: { status: 'scheduled' } });
    }

    return res.status(201).json({ success: true, timetable });
  } catch (error: any) {
    console.error('Error creating exam timetable:', error);
    return res.status(500).json({ error: 'Failed to schedule exam slot: ' + error.message });
  }
});

/**
 * DELETE /api/assessments/:id/timetable/:ttId - Remove timetable entry
 */
router.delete('/:id/timetable/:ttId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = String(req.params.id);
  const ttId = String(req.params.ttId);

  try {
    const existing = await prisma.examTimetable.findFirst({ where: { id: ttId, assessmentId: id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Timetable entry not found' });

    await prisma.examTimetable.delete({ where: { id: ttId } });
    return res.json({ success: true, message: 'Exam timetable slot removed' });
  } catch (error: any) {
    console.error('Error deleting timetable entry:', error);
    return res.status(500).json({ error: 'Failed to delete timetable entry' });
  }
});

// ============================================================================
// MARKING & HOD MODERATION & PUBLISHING GATE
// ============================================================================

/**
 * POST /api/assessments/:id/marks - Bulk record student marks (status: marking)
 */
router.post('/:id/marks', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { marks } = req.body;

  if (!Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({ error: 'Array of student marks is required' });
  }

  try {
    const assessment = await prisma.assessment.findFirst({ where: { id, schoolId } });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    // Fetch school grading scale for automated grade computation
    const gradingScales = await (prisma as any).gradingScale.findMany({
      where: { schoolId },
      orderBy: { maxScore: 'desc' }
    });

    const computeGrade = (percentage: number): string => {
      if (gradingScales && gradingScales.length > 0) {
        for (const scale of gradingScales) {
          if (percentage >= scale.minScore && percentage <= scale.maxScore) {
            return scale.grade;
          }
        }
      }
      if (percentage >= 75) return 'A';
      if (percentage >= 65) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'U';
    };

    const ops = marks.map((m: any) => {
      const score = m.marksObtained !== undefined ? Number(m.marksObtained) : null;
      const pct = score !== null && assessment.totalMarks > 0
        ? Math.round((score / assessment.totalMarks) * 1000) / 10
        : null;
      const grade = pct !== null ? computeGrade(pct) : null;

      return prisma.studentAssessment.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: id,
            studentId: m.studentId
          }
        },
        update: {
          marksObtained: score,
          percentage: pct,
          grade: m.grade || grade,
          comment: m.comment || undefined,
          markedById: req.user!.id,
          markedAt: new Date(),
          status: 'marked'
        },
        create: {
          schoolId: schoolId!,
          assessmentId: id,
          studentId: m.studentId,
          marksObtained: score,
          percentage: pct,
          grade: m.grade || grade,
          comment: m.comment || null,
          markedById: req.user!.id,
          markedAt: new Date(),
          status: 'marked'
        }
      });
    });

    await prisma.$transaction(ops);

    // Update assessment status to marking
    if (assessment.status === 'draft' || assessment.status === 'scheduled' || assessment.status === 'in_progress') {
      await prisma.assessment.update({ where: { id }, data: { status: 'marking' } });
    }

    return res.json({ success: true, count: marks.length, message: `${marks.length} student marks recorded successfully` });
  } catch (error: any) {
    console.error('Error saving student marks:', error);
    return res.status(500).json({ error: 'Failed to record student marks: ' + error.message });
  }
});

/**
 * POST /api/assessments/:id/moderation - HOD moderation of sample scripts (~20%)
 */
router.post('/:id/moderation', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;
  const { sampleMarks, moderationNotes } = req.body;

  // Verify HOD or School Admin
  const isHodOrAdmin = req.user?.role === 'SCHOOL_ADMIN' || req.user?.role === 'SUPER_ADMIN' ||
    req.user?.secondaryRoles?.some((r: string) => ['HOD', 'DEPARTMENT_HEAD', 'SUPERVISOR'].includes(r.toUpperCase()));

  if (!isHodOrAdmin) {
    return res.status(403).json({ error: 'Only Head of Department (HOD) or School Admin can conduct moderation.' });
  }

  if (!Array.isArray(sampleMarks) || sampleMarks.length === 0) {
    return res.status(400).json({ error: 'Sample marks array is required for moderation' });
  }

  try {
    const assessment = await prisma.assessment.findFirst({
      where: { id, schoolId },
      include: {
        _count: { select: { studentAssessments: true } }
      }
    });

    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const totalStudents = assessment._count.studentAssessments;
    const sampledCount = sampleMarks.length;
    const samplePercentage = totalStudents > 0 ? Math.round((sampledCount / totalStudents) * 100) : 100;

    // Update each moderated script
    const ops = sampleMarks.map((m: any) => {
      const modScore = m.moderatedMarks !== undefined ? Number(m.moderatedMarks) : undefined;
      const modGrade = m.moderatedGrade || undefined;
      const comment = m.moderationComment || 'Moderated by HOD';

      return prisma.studentAssessment.update({
        where: {
          assessmentId_studentId: {
            assessmentId: id,
            studentId: m.studentId
          }
        },
        data: {
          moderatedMarks: modScore,
          moderatedGrade: modGrade,
          moderationComment: comment,
          isModerated: true,
          status: 'moderated'
        }
      });
    });

    await prisma.$transaction(ops);

    // Update assessment status to moderated
    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: 'moderated',
        moderatedById: req.user!.id,
        moderatedAt: new Date(),
        moderationNotes: moderationNotes || `HOD moderation conducted on ${sampledCount} scripts (${samplePercentage}% of class).`
      },
      include: {
        moderatedBy: { select: { id: true, name: true, role: true } }
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'MODERATE_ASSESSMENT_MARKS',
      entityType: 'Assessment',
      entityId: id,
      details: {
        assessmentTitle: assessment.title,
        sampleCount: sampledCount,
        samplePercentage,
        notes: moderationNotes
      },
      schoolId: schoolId!,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Moderation complete for ${sampledCount} scripts (${samplePercentage}% sample). Status set to 'moderated'.`,
      assessment: updated
    });
  } catch (error: any) {
    console.error('Error in assessment moderation:', error);
    return res.status(500).json({ error: 'Failed to complete moderation: ' + error.message });
  }
});

/**
 * POST /api/assessments/:id/publish - Publishing gate! Makes marks visible to students/parents
 */
router.post('/:id/publish', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const id = req.params.id as string;

  try {
    const assessment = await prisma.assessment.findFirst({
      where: { id, schoolId },
      include: {
        subject: { select: { name: true } },
        studentAssessments: {
          include: { student: { select: { id: true, name: true, userId: true } } }
        }
      }
    });

    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    // Transition to published
    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date()
      }
    });

    // Notify parents and students
    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'PUBLISH_ASSESSMENT_RESULTS',
      entityType: 'Assessment',
      entityId: id,
      details: {
        title: assessment.title,
        subject: assessment.subject.name,
        studentsCount: assessment.studentAssessments.length,
        publishedAt: new Date()
      },
      schoolId: schoolId!,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Assessment '${assessment.title}' successfully published! Results are now visible to students and parents.`,
      assessment: updated
    });
  } catch (error: any) {
    console.error('Error publishing assessment:', error);
    return res.status(500).json({ error: 'Failed to publish assessment results: ' + error.message });
  }
});

export default router;
