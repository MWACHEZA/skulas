import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { generateAcademicReportPDF } from '../lib/pdf-generator';
import { signatureUpload, brandingUpload } from '../middleware/upload';
const router = Router();

/**
 * @route   GET /api/reports/classes
 * @desc    [TEACHER/ADMIN] Get list of classes for the school
 */
router.get('/classes', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role.toUpperCase();
    const secondaryRoles = req.user!.secondaryRoles || [];
    const isClassTeacher = userRole === 'TEACHER' && secondaryRoles.includes('Class Teacher');
    const isAdmin = userRole === 'SCHOOL_ADMIN' || secondaryRoles.includes('Senior Teacher');

    let where: any = { schoolId: req.user!.schoolId! };

    if (isClassTeacher && !isAdmin) {
      // Find teacher record
      const teacher = await prisma.teacher.findFirst({
        where: { userId: req.user!.id }
      });
      if (teacher) {
        where.teacherId = teacher.id;
      } else {
        return res.json([]); // No teacher record found
      }
    }

    const classes = await prisma.schoolClass.findMany({
      where,
      select: { id: true, name: true }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});


/**
 * @route   GET /api/reports/preview
 * @desc    [TEACHER/ADMIN] Get student data for report preview
 */
router.get('/preview', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { type, classId, term, year, studentId } = req.query;
  const schoolId = req.user!.schoolId!;
  const userRole = req.user!.role.toUpperCase();
  const secondaryRoles = req.user!.secondaryRoles || [];
  const isClassTeacher = userRole === 'TEACHER' && secondaryRoles.includes('Class Teacher');
  const isAdmin = userRole === 'SCHOOL_ADMIN' || secondaryRoles.includes('Senior Teacher');

  try {
    // Security check for class teachers
    if (isClassTeacher && !isAdmin && classId) {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
      const targetClass = await prisma.schoolClass.findFirst({
        where: { id: String(classId), teacherId: teacher?.id }
      });
      if (!targetClass) return res.status(403).json({ error: 'Access denied to this class' });
    }

    let data: any[] = [];

    switch (type) {
      case 'ACADEMIC':
      case 'ATTENDANCE':
      case 'ENROLLMENT':
        const students = await prisma.user.findMany({
          where: { 
            role: 'STUDENT',
            schoolId,
            ...(studentId ? { id: String(studentId) } : (classId ? { student: { classId: String(classId) } } : {}))
          },
          include: {
            student: {
              include: {
                class: true,
                grades: {
                  where: { term: String(term), year: parseInt(String(year)) },
                  include: { teacher: { include: { user: { select: { name: true } } } } }
                },
                attendance: {
                  where: { 
                    date: {
                      gte: new Date(`${year}-01-01`),
                      lte: new Date(`${year}-12-31`)
                    }
                  }
                }
              }
            }
          }
        });
        data = students.map(u => ({
          id: u.id,
          name: u.name,
          studentId: u.student?.studentId,
          complete: type === 'ACADEMIC' ? (u.student?.grades.length || 0) > 0 : true,
          statusText: type === 'ACADEMIC' ? `${u.student?.grades.length || 0} subjects graded` : (type === 'ATTENDANCE' ? `${u.student?.attendance.length || 0} records` : 'Enrolled'),
          grades: u.student?.grades,
          attendance: u.student?.attendance,
          class: u.student?.class
        }));
        break;

      case 'FEES':
        const feeStudents = await prisma.student.findMany({
          where: { 
            schoolId,
            ...(classId ? { classId: String(classId) } : {})
          },
          include: {
            user: { select: { name: true } },
            fees: {
              where: { term: String(term), year: parseInt(String(year)) }
            }
          }
        });
        data = feeStudents.map(s => {
          const totalFee = Math.round(s.fees.reduce((sum, f) => sum + f.amount, 0) * 100) / 100;
          const totalPaid = Math.round(s.fees.reduce((sum, f) => sum + f.paid, 0) * 100) / 100;
          const balance = Math.round((totalFee - totalPaid) * 100) / 100;
          return {
            id: s.id,
            name: s.user?.name || s.name,
            studentId: s.studentId,
            complete: balance <= 0,
            statusText: balance <= 0 ? 'Fully Paid' : `$${balance.toLocaleString()} Outstanding`,
            fees: s.fees,
            totalFee,
            totalPaid,
            balance
          };
        });
        break;

      case 'STAFF':
        const staff = await prisma.user.findMany({
          where: { 
            schoolId,
            role: { in: ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY'] }
          }
        });
        data = staff.map(u => ({
          id: u.id,
          name: u.name,
          staffId: u.staffId,
          statusText: u.role,
          complete: true,
          role: u.role,
          email: u.email,
          phone: u.phone
        }));
        break;

      case 'ASSETS':
        const assets = await prisma.asset.findMany({
          where: { schoolId },
          include: { custodian: { select: { name: true } } }
        });
        data = assets.map(a => ({
          id: a.id,
          name: a.name,
          assetId: a.serialNumber || a.id,
          statusText: a.condition.toUpperCase(),
          complete: a.condition === 'good',
          category: a.category,
          location: a.location,
          custodian: a.custodian?.name
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch report preview data' });
  }
});

/**
 * @route   POST /api/reports/snapshot
 * @desc    [TEACHER/ADMIN] Bulk generate and save reports
 */
router.post('/snapshot', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { studentIds, term, year, publishStudent, publishParent } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: 'List of student IDs is required' });
  }

  try {
    // 1. Fetch fresh data for all students in a single query
    const gteDate = term === 'Term 1' ? new Date(`${year}-01-01`) : 
                    term === 'Term 2' ? new Date(`${year}-05-01`) :
                    term === 'Term 3' ? new Date(`${year}-09-01`) :
                    new Date(`${year}-01-01`);
                    
    const lteDate = term === 'Term 1' ? new Date(`${year}-04-30`) : 
                    term === 'Term 2' ? new Date(`${year}-08-31`) :
                    term === 'Term 3' ? new Date(`${year}-12-31`) :
                    new Date(`${year}-12-31`);

    const studentsData = await prisma.user.findMany({
      where: { id: { in: studentIds }, schoolId: req.user!.schoolId! },
      include: {
        student: {
          include: {
            class: true,
            grades: {
              where: { term: term as string, year: parseInt(year as string) }
            },
            attendance: {
              where: { 
                date: {
                  gte: gteDate,
                  lte: lteDate
                }
              }
            }
          }
        }
      }
    });

    // 2. Prepare bulk upsert operations
    const upsertOperations = studentsData.map(studentData => {
      const sid = studentData.id;
      return prisma.academicReport.upsert({
        where: {
          id: `${sid}-${term}-${year}` // Deterministic ID for upsert
        },
        update: {
          data: studentData as any,
          publishedStudent: !!publishStudent,
          publishedParent: !!publishParent,
        },
        create: {
          id: `${sid}-${term}-${year}`,
          studentId: sid,
          term,
          year,
          data: studentData as any,
          publishedStudent: !!publishStudent,
          publishedParent: !!publishParent,
          schoolId: req.user!.schoolId!
        }
      });
    });

    // 3. Execute all upserts in a single transaction
    const reports = await prisma.$transaction(upsertOperations);

    res.json({ success: true, count: reports.length });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

/**
 * @route   GET /api/reports/parent-summary
 * @desc    [PARENT] Comprehensive 4-tab summary for parent academics
 *          Strict tenant isolation + parent-child linkage verification
 *          Zero classmate identity/grade leakage
 */
router.get('/parent-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let studentId = req.query.studentId as string;
    const userRole = req.user?.role;
    const userId = req.user!.id;
    const schoolId = req.user?.schoolId;

    // 1. Authorization & Tenant Isolation
    if (userRole === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: {
          students: {
            where: { status: 'APPROVED' },
            include: { student: true }
          }
        }
      });

      if (!parent || parent.students.length === 0) {
        return res.status(403).json({ error: 'No approved student link found for this parent.' });
      }

      if (!studentId) {
        studentId = parent.students[0].studentId;
      } else {
        const isAuthorized = parent.students.some(
          ps => ps.studentId === studentId || ps.student.id === studentId || ps.student.userId === studentId
        );
        if (!isAuthorized) {
          return res.status(403).json({ error: 'Unauthorized: Student is not linked to your parent account.' });
        }
      }
    } else if (userRole === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId }, { id: studentId || userId }] }
      });
      if (!student) {
        return res.status(403).json({ error: 'Student record not found.' });
      }
      studentId = student.id;
    } else if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'TEACHER') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    // 2. Fetch Student with Tenant Check
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        school: {
          include: {
            schoolSetting: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Strict Tenant Isolation check
    if (schoolId && student.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Access denied.' });
    }

    const effectiveSchoolId = student.schoolId;
    const schoolSetting = student.school.schoolSetting;

    // 3. Determine active Term and Year
    let activeTerm = schoolSetting?.currentTerm || 'Term 1';
    let activeYear = schoolSetting?.runningSession ? parseInt(schoolSetting.runningSession) : new Date().getFullYear();

    const allStudentGrades = await prisma.grade.findMany({
      where: {
        schoolId: effectiveSchoolId,
        studentId: student.id
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } }
      },
      orderBy: [{ year: 'desc' }, { term: 'desc' }, { createdAt: 'desc' }]
    });

    if (allStudentGrades.length > 0) {
      const hasGradesInCurrent = allStudentGrades.some(g => g.term === activeTerm && g.year === activeYear);
      if (!hasGradesInCurrent) {
        activeTerm = allStudentGrades[0].term;
        activeYear = allStudentGrades[0].year;
      }
    }

    // Current Term Grades
    const currentTermGrades = allStudentGrades.filter(g => g.term === activeTerm && g.year === activeYear);

    // Compute Class Aggregates strictly without leaking classmate identity
    let totalClassStudents = 1;
    if (student.classId) {
      totalClassStudents = await prisma.student.count({
        where: { classId: student.classId, schoolId: effectiveSchoolId, status: 'Enrolled' }
      });
      if (totalClassStudents === 0) totalClassStudents = 1;
    }

    const getLetterGrade = (score: number) => {
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };

    const currentAverage = currentTermGrades.length > 0
      ? Math.round(
          currentTermGrades.reduce((acc, g) => acc + (g.score / (g.maxScore || 100)) * 100, 0) / currentTermGrades.length
        )
      : 0;

    // Previous Term Average Calculation
    const termOrder = ['Term 1', 'Term 2', 'Term 3'];
    const currentTermIdx = termOrder.indexOf(activeTerm);
    let prevTerm: string | null = null;
    let prevYear = activeYear;

    if (currentTermIdx > 0) {
      prevTerm = termOrder[currentTermIdx - 1];
    } else {
      prevTerm = 'Term 3';
      prevYear = activeYear - 1;
    }

    const previousTermGrades = allStudentGrades.filter(g => g.term === prevTerm && g.year === prevYear);
    const previousAverage = previousTermGrades.length > 0
      ? Math.round(
          previousTermGrades.reduce((acc, g) => acc + (g.score / (g.maxScore || 100)) * 100, 0) / previousTermGrades.length
        )
      : null;

    const trend = previousAverage !== null ? currentAverage - previousAverage : null;

    // Overall rank/position in class
    let classPosition: number | null = null;
    if (student.classId && currentTermGrades.length > 0) {
      const peersGrades = await prisma.grade.findMany({
        where: {
          schoolId: effectiveSchoolId,
          term: activeTerm,
          year: activeYear,
          student: { classId: student.classId }
        },
        select: { studentId: true, score: true, maxScore: true }
      });

      const peerAverages = new Map<string, { total: number; count: number }>();
      for (const pg of peersGrades) {
        const item = peerAverages.get(pg.studentId) || { total: 0, count: 0 };
        item.total += (pg.score / (pg.maxScore || 100)) * 100;
        item.count += 1;
        peerAverages.set(pg.studentId, item);
      }

      const rankList: { studentId: string; avg: number }[] = [];
      peerAverages.forEach((val, sid) => {
        rankList.push({ studentId: sid, avg: val.count > 0 ? val.total / val.count : 0 });
      });
      rankList.sort((a, b) => b.avg - a.avg);

      const foundIdx = rankList.findIndex(r => r.studentId === student.id);
      if (foundIdx !== -1) {
        classPosition = foundIdx + 1;
      }
    }

    if (!classPosition && currentTermGrades.length > 0) {
      const withPos = currentTermGrades.find(g => g.classPosition);
      if (withPos && withPos.classPosition) {
        classPosition = withPos.classPosition;
      }
    }

    // Best Subject & Needs Help Subject
    let bestSubject: { name: string; score: number; grade: string } | null = null;
    let needsHelpSubject: { name: string; score: number; grade: string; threshold: number } | null = null;
    const attentionThreshold = 50; // Attention threshold (percentage)

    if (currentTermGrades.length > 0) {
      const sortedByScore = [...currentTermGrades].sort(
        (a, b) => (b.score / (b.maxScore || 100)) - (a.score / (a.maxScore || 100))
      );

      const top = sortedByScore[0];
      const topScorePct = Math.round((top.score / (top.maxScore || 100)) * 100);
      bestSubject = {
        name: top.subject.name,
        score: topScorePct,
        grade: top.grade || getLetterGrade(topScorePct)
      };

      const lowest = sortedByScore[sortedByScore.length - 1];
      const lowestScorePct = Math.round((lowest.score / (lowest.maxScore || 100)) * 100);

      // ONLY show if below threshold!
      if (lowestScorePct < attentionThreshold) {
        needsHelpSubject = {
          name: lowest.subject.name,
          score: lowestScorePct,
          grade: lowest.grade || getLetterGrade(lowestScorePct),
          threshold: attentionThreshold
        };
      }
    }

    // Conduct Status & Termly Comment
    const latestCommentEver = await prisma.termlyComment.findFirst({
      where: {
        schoolId: effectiveSchoolId,
        studentId: student.id
      },
      orderBy: [{ year: 'desc' }, { term: 'desc' }, { createdAt: 'desc' }]
    });

    let conductStatus = 'Good';
    if (currentAverage >= 80) conductStatus = 'Excellent';
    else if (currentAverage >= 60) conductStatus = 'Satisfactory';
    else if (currentAverage > 0) conductStatus = 'Needs Attention';

    // Sparkline progression across recent terms (up to 4 terms)
    const progressionMap = new Map<string, { term: string; year: number; total: number; count: number }>();
    for (const g of allStudentGrades) {
      const key = `${g.year}-${g.term}`;
      const item = progressionMap.get(key) || { term: g.term, year: g.year, total: 0, count: 0 };
      item.total += (g.score / (g.maxScore || 100)) * 100;
      item.count += 1;
      progressionMap.set(key, item);
    }

    const progressionList: { label: string; term: string; year: number; score: number }[] = [];
    progressionMap.forEach((val) => {
      progressionList.push({
        label: `${val.term} ${val.year}`,
        term: val.term,
        year: val.year,
        score: Math.round(val.total / (val.count || 1))
      });
    });

    progressionList.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return termOrder.indexOf(a.term) - termOrder.indexOf(b.term);
    });

    const sparklineData = progressionList.slice(-4);

    // Published Academic Reports
    const publishedReports = await prisma.academicReport.findMany({
      where: {
        schoolId: effectiveSchoolId,
        OR: [
          { studentId: student.id },
          ...(student.userId ? [{ studentId: student.userId }] : [])
        ],
        publishedParent: true
      },
      orderBy: [{ year: 'desc' }, { term: 'desc' }, { createdAt: 'desc' }]
    });

    const latestReport = publishedReports[0];

    // Subject Breakdown Details (with assignments and recent assessments)
    let classAssignments: any[] = [];
    if (student.classId) {
      classAssignments = await prisma.assignment.findMany({
        where: {
          schoolId: effectiveSchoolId,
          classId: student.classId
        },
        include: {
          submissions: {
            where: { studentId: student.id }
          }
        },
        orderBy: { dueDate: 'desc' }
      });
    }

    const subjectBreakdown = currentTermGrades.map(g => {
      const scorePct = Math.round((g.score / (g.maxScore || 100)) * 100);

      let recentAssessments: any[] = [];
      if (Array.isArray(g.assessmentEntries)) {
        recentAssessments = (g.assessmentEntries as any[]).map((ae: any, i: number) => ({
          id: `ae-${i}`,
          title: ae.title || ae.name || `Assessment ${i + 1}`,
          category: ae.type || ae.category || 'Assessment',
          date: ae.date || ae.createdAt || '',
          score: ae.score ?? null,
          maxScore: ae.maxScore || 100,
          status: 'Graded'
        }));
      }

      const subjAssignments = classAssignments.filter(a => a.subjectId === g.subjectId);
      const missingWork: any[] = [];

      for (const assign of subjAssignments) {
        const sub = assign.submissions?.[0];
        if (sub) {
          recentAssessments.push({
            id: assign.id,
            title: assign.title,
            category: assign.category || 'Assignment',
            date: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '',
            score: sub.grade !== null && sub.grade !== undefined ? sub.grade : null,
            maxScore: assign.maxScore || 100,
            status: sub.status === 'GRADED' ? 'Graded' : 'Submitted'
          });
        } else {
          const isOverdue = new Date(assign.dueDate) < new Date();
          if (isOverdue) {
            missingWork.push({
              id: assign.id,
              title: assign.title,
              dueDate: new Date(assign.dueDate).toLocaleDateString(),
              category: assign.category || 'Assignment'
            });
          }
        }
      }

      const classAvg = g.classAverage ?? null;

      return {
        id: g.id,
        subjectId: g.subjectId,
        subjectName: g.subject.name,
        score: scorePct,
        maxScore: g.maxScore || 100,
        grade: g.grade || getLetterGrade(scorePct),
        classAverage: classAvg,
        teacherComment: g.comment,
        teacherName: g.teacher?.user?.name || null,
        recentAssessments,
        missingWorkCount: missingWork.length,
        missingWork
      };
    });

    // Year-on-year History (Grouped by Year)
    const yearsMap = new Map<number, {
      year: number;
      className: string;
      terms: Map<string, { term: string; scores: number[] }>;
    }>();

    for (const g of allStudentGrades) {
      const y = g.year;
      if (!yearsMap.has(y)) {
        yearsMap.set(y, {
          year: y,
          className: student.class?.name || 'Class',
          terms: new Map()
        });
      }
      const yData = yearsMap.get(y)!;
      if (!yData.terms.has(g.term)) {
        yData.terms.set(g.term, { term: g.term, scores: [] });
      }
      const scorePct = (g.score / (g.maxScore || 100)) * 100;
      yData.terms.get(g.term)!.scores.push(scorePct);
    }

    const history: any[] = [];
    const sortedYears = Array.from(yearsMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYears) {
      const yData = yearsMap.get(y)!;
      let allScoresInYear: number[] = [];
      const termsList: any[] = [];

      const termsInYear = Array.from(yData.terms.values()).sort(
        (a, b) => termOrder.indexOf(a.term) - termOrder.indexOf(b.term)
      );

      for (const t of termsInYear) {
        const termAvg = t.scores.length > 0
          ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
          : 0;
        allScoresInYear = allScoresInYear.concat(t.scores);
        termsList.push({
          term: t.term,
          average: termAvg,
          grade: getLetterGrade(termAvg),
          subjectsCount: t.scores.length
        });
      }

      const yearAvg = allScoresInYear.length > 0
        ? Math.round(allScoresInYear.reduce((a, b) => a + b, 0) / allScoresInYear.length)
        : 0;

      const isCurrentYear = y === activeYear;

      history.push({
        year: y,
        className: yData.className,
        average: yearAvg,
        position: isCurrentYear && classPosition ? `${classPosition}th of ${totalClassStudents}` : 'Completed',
        finalGrade: getLetterGrade(yearAvg),
        status: isCurrentYear ? 'In Progress' : 'Completed',
        terms: termsList
      });
    }

    res.json({
      student: {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        className: student.class?.name || 'Class',
        classId: student.classId,
        schoolName: student.school.name
      },
      activeTerm,
      activeYear,
      overview: {
        term: activeTerm,
        year: activeYear,
        className: student.class?.name || 'Class',
        currentAverage,
        previousAverage,
        trend,
        classPosition,
        totalClassStudents,
        overallGrade: getLetterGrade(currentAverage),
        conductStatus,
        bestSubject,
        needsHelpSubject,
        progression: sparklineData,
        targetAverage: 80,
        latestReportId: latestReport?.id || null
      },
      subjectBreakdown,
      reportCards: publishedReports.map(r => ({
        id: r.id,
        term: r.term,
        year: r.year,
        publishedAt: r.createdAt,
        availableDate: new Date(r.createdAt).toLocaleDateString(),
        downloadUrl: `/api/reports/download/${r.id}`
      })),
      principalComment: latestCommentEver ? {
        term: latestCommentEver.term,
        year: latestCommentEver.year,
        comment: latestCommentEver.principalComment || null,
        classTeacherComment: latestCommentEver.classTeacherComment || null
      } : null,
      history
    });
  } catch (error: any) {
    console.error('Error fetching parent academics summary:', error);
    res.status(500).json({ error: 'Failed to fetch academic summary: ' + error.message });
  }
});

/**
 * @route   GET /api/reports/my
 * @desc    Get reports for the current student or parent
 */
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    let reports: any[] = [];
    if (role === 'STUDENT') {
      reports = await prisma.academicReport.findMany({
        where: { studentId: userId, publishedStudent: true },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === 'PARENT') {
      // Find linked students
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: { students: { where: { status: 'APPROVED' } } }
      });

      if (parent) {
        const studentIds = parent.students.map(ps => ps.studentId);
        reports = await prisma.academicReport.findMany({
          where: { 
            studentId: { in: studentIds },
            publishedParent: true 
          },
          include: { student: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @route   POST /api/reports/template
 * @desc    [ADMIN] Update report template and signature
 */
router.post('/template', requireAuth, requireRole('SCHOOL_ADMIN'), signatureUpload.single('signature'), async (req: AuthRequest, res: Response) => {
  const { config } = req.body;
  const signatureUrl = req.file ? `/storage/${(req as any).uploadCategoryPath}/${req.file.filename}` : undefined;

  try {
    const template = await prisma.reportTemplate.upsert({
      where: { schoolId: String(req.user!.schoolId!) },
      update: {
        config: config ? JSON.parse(config) : undefined,
        ...(signatureUrl && { signatureUrl })
      },
      create: {
        schoolId: String(req.user!.schoolId!),
        config: config ? JSON.parse(config) : { primaryColor: '#3182ce', showAttendance: true },
        signatureUrl: signatureUrl || null
      }
    });

    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * @route   GET /api/reports/template
 * @desc    Get school report template + school branding info
 */
router.get('/template', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = String(req.user!.schoolId!);

    const [template, school] = await Promise.all([
      prisma.reportTemplate.findFirst({ where: { schoolId } }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          address: true,
          type: true,
          phone: true,
          email: true,
          website: true,
          branding: true,
          customContent: true
        }
      })
    ]);

    const branding = school?.branding as any;
    const customContent = school?.customContent as any;

    const enriched = {
      ...(template || { config: { primaryColor: '#3182ce' } }),
      school: {
        name: school?.name || 'School',
        address: school?.address || '',
        type: school?.type || 'secondary',
        phone: school?.phone || '',
        email: school?.email || '',
        website: school?.website || '',
        motto: customContent?.motto || '',
        logoUrl: branding?.logo
          ? (branding.logo.startsWith('http') ? branding.logo : `/api/storage/media/global/${branding.logo}`)
          : null
      }
    };

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * @route   PATCH /api/reports/cert-template
 * @desc    [ADMIN] Upload certificate background template
 */
router.patch('/cert-template', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), brandingUpload.single('template'), async (req: AuthRequest, res: Response) => {
  try {
    const templatePath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!templatePath) return res.status(400).json({ error: 'No template file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.certTemplateUrl = templatePath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, certTemplateUrl: templatePath, config: updated.config });
  } catch (error) {
    console.error('Certificate Template upload error:', error);
    res.status(500).json({ error: 'Failed to update certificate template' });
  }
});

/**
 * @route   PATCH /api/reports/report-template
 * @desc    [ADMIN] Upload report background template
 */
router.patch('/report-template', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), brandingUpload.single('template'), async (req: AuthRequest, res: Response) => {
  try {
    const templatePath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!templatePath) return res.status(400).json({ error: 'No template file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.reportTemplateUrl = templatePath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, reportTemplateUrl: templatePath, config: updated.config });
  } catch (error) {
    console.error('Report Template upload error:', error);
    res.status(500).json({ error: 'Failed to update report template' });
  }
});

/**
 * @route   PATCH /api/reports/receipt-logo
 * @desc    [ADMIN] Upload receipt logo
 */
router.patch('/receipt-logo', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), brandingUpload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const logoPath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!logoPath) return res.status(400).json({ error: 'No logo file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.receiptLogoUrl = logoPath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, receiptLogoUrl: logoPath, config: updated.config });
  } catch (error) {
    console.error('Receipt Logo upload error:', error);
    res.status(500).json({ error: 'Failed to update receipt logo' });
  }
});

/**
 * @route   PATCH /api/reports/consultation-logo
 * @desc    [ADMIN] Upload consultation logo
 */
router.patch('/consultation-logo', requireAuth, requireRole('SCHOOL_ADMIN', 'CLINIC'), brandingUpload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const logoPath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!logoPath) return res.status(400).json({ error: 'No logo file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.consultationLogoUrl = logoPath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, consultationLogoUrl: logoPath, config: updated.config });
  } catch (error) {
    console.error('Consultation Logo upload error:', error);
    res.status(500).json({ error: 'Failed to update consultation logo' });
  }
});

/**
 * @route   GET /api/reports/download/:id
 * @desc    Generate and download PDF report
 */
router.get('/download/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    const report = await prisma.academicReport.findFirst({
      where: { id: String(id) }
    });

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Security check: Only the student, their parent, or school staff
    if (role === 'STUDENT' && report.studentId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (role === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: { students: { where: { status: 'APPROVED' }, include: { student: true } } }
      });
      if (!parent) return res.status(403).json({ error: 'Access denied: No linked parent profile' });
      const allowedStudentIds = parent.students.map(s => s.studentId);
      const allowedUserIds = parent.students.map(s => s.student.userId).filter(Boolean);
      if (!allowedStudentIds.includes(report.studentId) && !allowedUserIds.includes(report.studentId)) {
        return res.status(403).json({ error: 'Access denied to this student report card' });
      }
    }

    const reportData = report.data as any;
    
    // Enrich with school branding
    const school = await prisma.school.findUnique({
      where: { id: report.schoolId }
    });

    // Map to PDF Generator Interface
    const pdfData = {
      student: {
        name: reportData.name,
        studentId: reportData.student?.studentId || 'N/A',
        class: reportData.student?.class
      },
      grades: reportData.student?.grades.map((g: any) => ({
        subject: { name: g.subjectName || 'Unknown Subject', code: '' }, // We might need to fetch subject name if it's just an ID
        score: g.score,
        grade: g.grade,
        teacherComment: g.feedback
      })) || [],
      attendance: {
        present: reportData.student?.attendance.filter((a: any) => a.status === 'present').length || 0,
        absent: reportData.student?.attendance.filter((a: any) => a.status === 'absent').length || 0,
        rate: 0 // Will compute below
      },
      school: {
        name: school?.name || 'Academic Institution',
        address: school?.address || undefined,
        email: school?.email,
        type: school?.type,
        branding: school?.branding as any
      },
      term: report.term,
      year: report.year
    };

    // Fix subject names if they are IDs (they should be enriched in the snapshot)
    // Actually, in the snapshot route (line 217), grades are included but might need more enrichment.
    // For now, assume the snapshot was enriched.

    // Compute attendance rate
    const total = pdfData.attendance.present + pdfData.attendance.absent;
    pdfData.attendance.rate = total > 0 ? Math.round((pdfData.attendance.present / total) * 100) : 100;

    await generateAcademicReportPDF(pdfData, res);
  } catch (error) {
    console.error('PDF Download Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * @route   GET /api/reports/principal-comments/:classId
 * @desc    [ADMIN/TEACHER] Get students and their principal comments for a class
 */
router.get('/principal-comments/:classId', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { term, year, subjectId } = req.query;
  const schoolId = req.user!.schoolId!;

  try {
    const students = await (prisma as any).student.findMany({
      where: { classId: String(classId), schoolId: String(schoolId) },
      include: {
        termlyComments: {
          where: { 
            term: String(term), 
            year: parseInt(String(year)) 
          }
        },
        grades: {
          where: { 
            subjectId: String(subjectId), 
            term: String(term), 
            year: parseInt(String(year)) 
          },
          include: { subject: { select: { name: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch principal comments' });
  }
});

/**
 * @route   POST /api/reports/principal-comments/bulk
 * @desc    [ADMIN] Bulk save principal comments
 */
router.post('/principal-comments/bulk', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { term, year, comments } = req.body;
  const schoolId = req.user!.schoolId!;

  // comments: Array<{ studentId: string, principalComment: string }>

  try {
    const operations = comments.map((c: any) => {
      return prisma.termlyComment.upsert({
        where: {
          schoolId_studentId_term_year: {
            schoolId,
            studentId: c.studentId,
            term,
            year: parseInt(year)
          }
        },
        update: {
          principalComment: c.principalComment
        },
        create: {
          schoolId,
          studentId: c.studentId,
          term,
          year: parseInt(year),
          principalComment: c.principalComment
        }
      });
    });

    await prisma.$transaction(operations);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save comments: ' + error.message });
  }
});

export default router;
