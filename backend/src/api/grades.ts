import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { BulkGradeSchema } from '../schemas/academic.schema';
import { logAction } from '../utils/audit';

const router = Router();

/**
 * @route   GET /api/grades/class/:classId
 * @desc    Get grades for all students in a class for a specific subject
 */
router.get('/class/:classId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const classId = req.params.classId as string;
  const { subjectId, term, year } = req.query;

  try {
    const grades = await prisma.grade.findMany({
      where: {
        student: { classId },
        subjectId: subjectId as string,
        term: term as string,
        year: parseInt(year as string)
      },
      include: {
        student: { select: { id: true, name: true, studentId: true } }
      }
    });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

/**
 * @route   GET /api/grades/subject/:classId/:subjectId
 * @desc    Get students and their grades for a specific class subject
 */
router.get('/subject/:classId/:subjectId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { classId, subjectId } = req.params;
  const { term, year } = req.query;
  const schoolId = req.user!.schoolId!;

  try {
    const students = await (prisma as any).student.findMany({
      where: { classId: String(classId), schoolId: String(schoolId) },
      include: {
        grades: {
          where: { 
            subjectId: String(subjectId), 
            term: String(term), 
            year: parseInt(String(year)) 
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subject grades' });
  }
});

/**
 * @route   GET /api/grades/scale/:subjectId
 * @desc    Get school grading scale, subject-level moderated scale, and moderation history
 */
router.get('/scale/:subjectId', requireAuth, async (req: AuthRequest, res: Response) => {
  const subjectId = req.params.subjectId as string;
  const schoolId = req.user!.schoolId!;

  try {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true, name: true, moderatedScale: true }
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const schoolScales = await (prisma as any).gradingScale.findMany({
      where: { schoolId },
      orderBy: { maxScore: 'desc' }
    });

    const lastModeration = await prisma.auditLog.findFirst({
      where: {
        schoolId,
        entityType: 'Subject',
        entityId: subjectId,
        action: 'GRADE_SCALE_MODERATION'
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      schoolScale: schoolScales,
      moderatedScale: subject.moderatedScale || null,
      lastModeration
    });
  } catch (error) {
    console.error('Error fetching scale:', error);
    res.status(500).json({ error: 'Failed to fetch grading scale' });
  }
});

/**
 * @route   POST /api/grades/moderate-scale
 * @desc    Moderate or override grading scale for a subject with mandatory reason & audit trail
 */
router.post('/moderate-scale', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { subjectId, moderatedScale, reason, term, year } = req.body;
  const schoolId = req.user!.schoolId!;

  if (!subjectId) {
    return res.status(400).json({ error: 'Subject ID is required' });
  }

  if (moderatedScale !== null && (!reason || !reason.trim())) {
    return res.status(400).json({ error: 'A mandatory reason is required to moderate the grading scale.' });
  }

  try {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId }
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Check teacher assignment authorization
    if (req.user!.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id, schoolId } });
      if (!teacher) return res.status(403).json({ error: 'Teacher record not found' });

      const isAssigned = await prisma.classSubjectTeacher.findFirst({
        where: { subjectId, teacherId: teacher.id }
      }) || await prisma.teacherSubject.findFirst({
        where: { subjectId, teacherId: teacher.id }
      });

      if (!isAssigned) {
        return res.status(403).json({ error: 'Only teachers assigned to teach this subject or administrators may moderate its grading scale.' });
      }
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { moderatedScale }
    });

    // Record audit trail
    await logAction(
      req,
      moderatedScale === null ? 'GRADE_SCALE_RESET' : 'GRADE_SCALE_MODERATION',
      'Subject',
      subjectId,
      {
        subjectName: subject.name,
        reason: reason?.trim() || 'Reset to default school scale',
        moderatedScale,
        term,
        year,
        moderatedBy: req.user!.name || req.user!.email
      }
    );

    res.json({
      success: true,
      moderatedScale: updated.moderatedScale,
      message: moderatedScale === null ? 'Grading scale reset to default' : 'Grading scale moderated successfully'
    });
  } catch (error: any) {
    console.error('Moderation error:', error);
    res.status(500).json({ error: 'Failed to moderate grading scale: ' + error.message });
  }
});

/**
 * @route   POST /api/grades/bulk
 * @desc    Bulk save/update grades for a class
 */
router.post('/bulk', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { classId, subjectId, term, year, results, classAverage } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    let teacher = await prisma.teacher.findFirst({ 
      where: { userId: req.user!.id, schoolId } 
    });
    if (!teacher) {
      // Look for teacher assigned to this subject/class
      const assigned = await prisma.classSubjectTeacher.findFirst({
        where: { classId, subjectId }
      });
      if (assigned) {
        teacher = await prisma.teacher.findUnique({ where: { id: assigned.teacherId } });
      }
    }
    if (!teacher) {
      teacher = await prisma.teacher.findFirst({ where: { schoolId } });
    }
    if (!teacher) return res.status(404).json({ error: 'Teacher record not found' });

    // Validate subject to get weights & moderated scale
    const subject = await prisma.subject.findFirst({ 
      where: { id: subjectId, schoolId } 
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Fetch school's custom grading scale
    const schoolGradingScale = await (prisma as any).gradingScale.findMany({
      where: { schoolId },
      orderBy: { maxScore: 'desc' }
    });

    const effectiveScale = Array.isArray(subject.moderatedScale) && (subject.moderatedScale as any[]).length > 0
      ? (subject.moderatedScale as any[])
      : schoolGradingScale;

    const operations = results.map((res: any) => {
      // Calculate total score based on weights or explicit score
      let totalScore = 0;
      if (typeof res.score === 'number' && !isNaN(res.score)) {
        totalScore = res.score;
      } else if (subject.isIndustrial) {
        const ind = res.industrialScores || {};
        const ca = ((ind.industrialSup || 0) + (ind.academicSup || 0)) / 2;
        totalScore = (ca * 0.5) + ((ind.report || 0) * 0.4) + ((ind.oral || 0) * 0.1);
      } else {
        const caScore = parseFloat(res.caScore) || 0;
        const examScore = parseFloat(res.examScore) || 0;
        const caWeight = subject.caWeight || 30;
        const examWeight = subject.examWeight || 70;
        totalScore = (caScore * (caWeight / 100)) + (examScore * (examWeight / 100));
      }

      totalScore = Math.round(totalScore * 10) / 10;

      // Determine division/grade dynamically from grading scale or explicit grade
      let division = res.grade;
      if (!division) {
        if (effectiveScale && effectiveScale.length > 0) {
          const match = effectiveScale.find((scale: any) => totalScore >= scale.minScore && totalScore <= scale.maxScore);
          division = match ? match.grade : 'F';
        } else {
          if (totalScore >= 75) division = 'A';
          else if (totalScore >= 65) division = 'B';
          else if (totalScore >= 50) division = 'C';
          else if (totalScore >= 40) division = 'D';
          else division = 'F';
        }
      }

      const calculatedClassAvg = typeof res.classAverage === 'number' ? res.classAverage : (typeof classAverage === 'number' ? classAverage : undefined);

      return prisma.grade.upsert({
        where: {
          schoolId_studentId_subjectId_term_year: {
            schoolId,
            studentId: res.studentId,
            subjectId,
            term,
            year: parseInt(String(year))
          }
        },
        update: {
          score: totalScore,
          grade: division,
          caScore: parseFloat(res.caScore) || 0,
          examScore: parseFloat(res.examScore) || 0,
          comment: res.comment || null,
          assessmentEntries: res.assessmentEntries !== undefined ? res.assessmentEntries : undefined,
          classAverage: calculatedClassAvg,
          classPosition: typeof res.classPosition === 'number' ? res.classPosition : undefined,
          teacherId: teacher.id
        },
        create: {
          studentId: res.studentId,
          subjectId,
          term,
          year: parseInt(String(year)),
          score: totalScore,
          grade: division,
          caScore: parseFloat(res.caScore) || 0,
          examScore: parseFloat(res.examScore) || 0,
          comment: res.comment || null,
          assessmentEntries: res.assessmentEntries || undefined,
          classAverage: calculatedClassAvg,
          classPosition: typeof res.classPosition === 'number' ? res.classPosition : undefined,
          teacherId: teacher.id,
          schoolId
        }
      });
    });

    // Fetch existing grades before updating for audit logging
    const existingGrades = await prisma.grade.findMany({
      where: {
        schoolId,
        subjectId,
        term,
        year: parseInt(String(year)),
        studentId: { in: results.map((r: any) => r.studentId) }
      }
    });
    const existingGradesMap = new Map(existingGrades.map(g => [g.studentId, g]));

    await prisma.$transaction(operations);

    // Audit Log Grade Changes
    for (const resItem of results) {
      const existing = existingGradesMap.get(resItem.studentId);
      
      const changes = {
        subjectId,
        term,
        year,
        studentId: resItem.studentId,
        previousValues: existing ? {
          caScore: existing.caScore,
          examScore: existing.examScore,
          score: existing.score,
          grade: existing.grade
        } : null,
        newValues: {
          caScore: parseFloat(resItem.caScore) || 0,
          examScore: parseFloat(resItem.examScore) || 0,
          score: resItem.score,
          grade: resItem.grade,
          comment: resItem.comment
        }
      };

      // Only log if something meaningfully changed or if it's new
      if (!existing || existing.caScore !== changes.newValues.caScore || existing.examScore !== changes.newValues.examScore || existing.score !== changes.newValues.score) {
        await logAction(req, existing ? 'UPDATE_GRADE' : 'CREATE_GRADE', 'Grade', existing ? existing.id : 'bulk-new', changes);
      }
    }
    const studentIds = results.map((r: any) => r.studentId);
    
    // Find students who have an existing snapshot for this term
    const existingReports = await prisma.academicReport.findMany({
      where: {
        schoolId,
        term,
        year: year.toString(),
        studentId: { in: studentIds }
      }
    });

    if (existingReports.length > 0) {
      const gteDate = term === 'Term 1' ? new Date(`${year}-01-01`) : 
                      term === 'Term 2' ? new Date(`${year}-05-01`) :
                      term === 'Term 3' ? new Date(`${year}-09-01`) :
                      new Date(`${year}-01-01`);
                      
      const lteDate = term === 'Term 1' ? new Date(`${year}-04-30`) : 
                      term === 'Term 2' ? new Date(`${year}-08-31`) :
                      term === 'Term 3' ? new Date(`${year}-12-31`) :
                      new Date(`${year}-12-31`);

      const studentsData = await prisma.user.findMany({
        where: { id: { in: existingReports.map(r => r.studentId) } },
        include: {
          student: {
            include: {
              class: true,
              grades: { where: { term: term, year: parseInt(year) } },
              attendance: { where: { date: { gte: gteDate, lte: lteDate } } }
            }
          }
        }
      });

      const updateOps = studentsData.map(studentData => {
        return prisma.academicReport.updateMany({
          where: { studentId: studentData.id, term, year: year.toString(), schoolId },
          data: { data: studentData as any }
        });
      });

      await prisma.$transaction(updateOps);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Bulk grade save error:', error);
    res.status(500).json({ error: 'Failed to save grades: ' + error.message });
  }
});

export default router;
