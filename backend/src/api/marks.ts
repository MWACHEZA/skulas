import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();

// ============================================================================
// ASSESSMENT COLUMNS CONFIGURATION
// ============================================================================

/**
 * @route   GET /api/marks/columns/:subjectId
 * @desc    Get dynamic assessment columns configured for a subject
 */
router.get('/columns/:subjectId', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const subjectId = req.params.subjectId as string;

  try {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true, name: true, moderatedScale: true, caWeight: true, examWeight: true }
    });

    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Look for assessment columns stored in moderatedScale or find recent grade assessment entries
    let columns = (subject.moderatedScale as any)?.assessmentColumns;

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      // Find from most recent grade record if available
      const recentGrade = await prisma.grade.findFirst({
        where: { subjectId, schoolId },
        orderBy: { updatedAt: 'desc' },
        select: { assessmentEntries: true }
      });

      if (recentGrade?.assessmentEntries && Array.isArray(recentGrade.assessmentEntries)) {
        columns = (recentGrade.assessmentEntries as any[]).map(e => ({
          id: e.id,
          name: e.name,
          type: e.type || 'Test',
          date: e.date || new Date().toISOString().slice(0, 10),
          maxScore: e.maxScore || 50,
          weight: e.weight || 25,
          selectedForReport: e.selectedForReport !== false,
          category: e.category || 'CA'
        }));
      }
    }

    // Default column fallback if none configured
    if (!columns || columns.length === 0) {
      columns = [
        { id: 'cat-1', name: 'Continuous Assessment Test 1 (CAT)', type: 'CAT', maxScore: 30, weight: 20, selectedForReport: true, category: 'CA' },
        { id: 'cat-2', name: 'Continuous Assessment Test 2 (CAT)', type: 'CAT', maxScore: 30, weight: 20, selectedForReport: true, category: 'CA' },
        { id: 'practical-1', name: 'Practical Lab / Assignment', type: 'Practical', maxScore: 50, weight: 20, selectedForReport: true, category: 'CA' },
        { id: 'final-exam', name: 'End-of-Term Examination', type: 'Exam', maxScore: 100, weight: 40, selectedForReport: true, category: 'EXAM' }
      ];
    }

    res.json({
      subjectId,
      subjectName: subject.name,
      caWeight: subject.caWeight,
      examWeight: subject.examWeight,
      columns
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch assessment columns: ' + error.message });
  }
});

/**
 * @route   POST /api/marks/columns/:subjectId
 * @desc    Save teacher-defined assessment columns with 100% total weight validation
 */
router.post('/columns/:subjectId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const subjectId = req.params.subjectId as string;
  const { columns } = req.body;

  if (!Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({ error: 'At least one assessment column is required' });
  }

  // 100% Weight Validation for columns included in final report
  const includedCols = columns.filter((c: any) => c.selectedForReport !== false);
  const totalWeight = Math.round(includedCols.reduce((sum: number, c: any) => sum + (parseFloat(c.weight) || 0), 0) * 100) / 100;

  if (Math.abs(totalWeight - 100) > 0.01) {
    return res.status(400).json({
      error: `Assessment weights must sum to exactly 100%. Current sum: ${totalWeight}%. Please adjust column weights before saving.`,
      currentTotalWeight: totalWeight
    });
  }

  try {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId }
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const existingMod = (subject.moderatedScale as any) || {};
    const updatedScale = {
      ...existingMod,
      assessmentColumns: columns
    };

    // Calculate aggregate CA and Exam weights
    const caWeight = includedCols
      .filter((c: any) => c.category === 'CA' || c.type !== 'Exam')
      .reduce((sum: number, c: any) => sum + (parseFloat(c.weight) || 0), 0);
    const examWeight = Math.max(0, 100 - caWeight);

    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        moderatedScale: updatedScale,
        caWeight: Math.round(caWeight * 10) / 10,
        examWeight: Math.round(examWeight * 10) / 10
      }
    });

    res.json({
      success: true,
      message: 'Assessment columns configuration saved successfully with 100% balanced weights',
      totalWeight,
      columns
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save columns configuration: ' + error.message });
  }
});

// ============================================================================
// FAST GRID UPDATE
// ============================================================================

router.put('/grid-update', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response): Promise<any> => {
  const { classId, subjectId, term, year, updates } = req.body;
  const schoolId = req.user!.schoolId!;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  try {
    let teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id, schoolId } });
    if (!teacher) {
      teacher = await prisma.teacher.findFirst({ where: { schoolId } });
    }
    if (!teacher) return res.status(404).json({ error: 'Teacher record not found' });

    const ops = updates.map((u: any) => {
      return prisma.grade.upsert({
        where: {
          schoolId_studentId_subjectId_term_year: {
            schoolId,
            studentId: u.studentId,
            subjectId,
            term: String(term),
            year: parseInt(String(year))
          }
        },
        update: {
          score: u.score !== undefined ? parseFloat(u.score) : undefined,
          grade: u.grade || undefined,
          caScore: u.caScore !== undefined ? parseFloat(u.caScore) : undefined,
          examScore: u.examScore !== undefined ? parseFloat(u.examScore) : undefined,
          comment: u.comment !== undefined ? u.comment : undefined,
          assessmentEntries: u.assessmentEntries || undefined,
          classPosition: u.classPosition !== undefined ? parseInt(u.classPosition) : undefined,
          teacherId: teacher.id
        },
        create: {
          schoolId,
          studentId: u.studentId,
          subjectId,
          term: String(term),
          year: parseInt(String(year)),
          score: parseFloat(u.score) || 0,
          grade: u.grade || 'F',
          caScore: parseFloat(u.caScore) || 0,
          examScore: parseFloat(u.examScore) || 0,
          comment: u.comment || null,
          assessmentEntries: u.assessmentEntries || undefined,
          classPosition: u.classPosition ? parseInt(u.classPosition) : undefined,
          teacherId: teacher.id
        }
      });
    });

    await prisma.$transaction(ops);
    res.json({ success: true, count: updates.length, message: `${updates.length} records updated in grid` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update marks grid: ' + error.message });
  }
});

// ============================================================================
// REPORT PREVIEW & COMPETITION RANKING (1, 2, 2, 4)
// ============================================================================

router.get('/report-preview', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const { classId, subjectId, term, year } = req.query;

  if (!classId || !subjectId) {
    return res.status(400).json({ error: 'classId and subjectId are required' });
  }

  try {
    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        subjectId: String(subjectId),
        term: String(term),
        year: parseInt(String(year)),
        student: { classId: String(classId) }
      },
      include: {
        student: { select: { id: true, name: true, studentId: true } },
        subject: { select: { id: true, name: true, code: true } }
      },
      orderBy: { score: 'desc' }
    });

    // Standard competition ranking (1, 2, 2, 4 with tie handling)
    let currentRank = 1;
    const rankedGrades = grades.map((g, index) => {
      if (index > 0 && g.score < grades[index - 1].score) {
        currentRank = index + 1;
      }
      return {
        ...g,
        classPosition: currentRank
      };
    });

    const scores = grades.map(g => g.score);
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const average = scores.length > 0 ? Math.round((totalScore / scores.length) * 10) / 10 : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;

    // Distribution
    const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(g => {
      const gd = (g.grade || 'F').toUpperCase();
      if (distribution[gd] !== undefined) distribution[gd]++;
      else distribution[gd] = (distribution[gd] || 0) + 1;
    });

    res.json({
      totalStudents: grades.length,
      classAverage: average,
      highestScore: highest,
      lowestScore: lowest,
      gradeDistribution: distribution,
      rankedGrades
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate report preview: ' + error.message });
  }
});

// ============================================================================
// SUBMIT TO HOD APPROVAL
// ============================================================================

router.post('/submit-approval', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const { classId, subjectId, term, year, notes } = req.body;

  try {
    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'SUBMIT_MARKS_HOD_APPROVAL',
      entityType: 'SubjectGrades',
      entityId: `${subjectId}-${classId}`,
      details: {
        classId,
        subjectId,
        term,
        year,
        notes: notes || 'Submitted for HOD moderation and approval'
      },
      schoolId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Subject marksheet successfully submitted for HOD review and approval.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit marks for approval: ' + error.message });
  }
});

export default router;
