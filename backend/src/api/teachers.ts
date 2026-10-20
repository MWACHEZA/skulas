import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { upload, assignmentUpload } from '../middleware/upload';
import { validate } from '../middleware/validation';
import { CreateAssignmentSchema, UpdateAssignmentAcceptingSchema, GradeSubmissionSchema, BulkAttendanceSchema, AssignBookSchema, AssignTeacherClassSchema } from '../schemas/teacher.schema';

const router = Router();

/**
 * @route   GET /api/teachers
 * @desc    [ADMIN] Get all teachers with user details
 */
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: { 
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            secondaryRoles: true,
            avatar: true,
            phone: true,
            isLocked: true,
            metadata: true,
            employeeProfile: true
          }
        },
        dept: { select: { name: true } }
      },
      orderBy: { user: { name: 'asc' } }
    });
    res.json({ teachers });
  } catch (error) {
    console.error('Fetch teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher roster' });
  }
});

/**
 * @route   DELETE /api/teachers/:id
 * @desc    [ADMIN] Delete a teacher and their user account
 */
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const teacher = await prisma.teacher.findFirst({
      where: { id: req.params.id as string },
      select: { userId: true }
    });
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (teacher.userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Since onDelete: Cascade is configured in the schema for User -> Teacher,
    // deleting the User will also delete the Teacher profile.
    await prisma.user.delete({
      where: { id: teacher.userId }
    });

    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

/**
 * @route   POST /api/teachers/assignments
 * @desc    [TEACHER] Create a new assignment for a specific class with optional attachment
 */
router.post('/assignments', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), assignmentUpload.array('files', 5), validate(CreateAssignmentSchema), async (req: AuthRequest, res: Response) => {
  const { 
    title, 
    description, 
    subjectId, 
    classId, 
    dueDate, 
    maxScore,
    category,
    type,
    status,
    timeLimit,
    allowLate,
    allowResubmission,
    latePenaltyPercent,
    targetType,
    targetStudentIds,
    includeInTermReport,
    term,
    questions // JSON string if provided
  } = req.body;
  
  // Handle multiple file storage
  const files = req.files as Express.Multer.File[];
  const uploadPath = (req as any).uploadCategoryPath || 'global/assignments';
  const fileAttachments = files ? files.map(f => ({
    name: f.originalname,
    url: `${uploadPath}/${f.filename}`.replace(/\\/g, '/')
  })) : [];

  let parsedTargetStudentIds: string[] = [];
  if (Array.isArray(targetStudentIds)) {
    parsedTargetStudentIds = targetStudentIds;
  } else if (typeof targetStudentIds === 'string' && targetStudentIds.trim()) {
    try {
      parsedTargetStudentIds = JSON.parse(targetStudentIds);
    } catch {
      parsedTargetStudentIds = targetStudentIds.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const structuredMetadata = {
    files: fileAttachments,
    type: type || (category ? category.toLowerCase() : 'homework'),
    status: status || 'published',
    allowResubmission: allowResubmission === 'true' || allowResubmission === true,
    latePenaltyPercent: latePenaltyPercent ? parseFloat(latePenaltyPercent) : 0,
    targetType: targetType || 'class',
    targetStudentIds: parsedTargetStudentIds,
    includeInTermReport: includeInTermReport === 'true' || includeInTermReport === true,
    term: term || 'Term 1',
    gradesReleased: false,
    gradesReleasedAt: null
  };

  try {
    const schoolId = req.user!.schoolId!;
    // Find teacher record
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
    if (!teacher && req.user!.role !== 'SCHOOL_ADMIN') return res.status(404).json({ error: 'Teacher record not found' });
    const teacherId = teacher ? teacher.id : (await prisma.teacher.findFirst({ where: { schoolId } }))?.id;

    if (!teacherId) return res.status(400).json({ error: 'No valid teacher account available for assignment creation' });

    const parsedDue = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const assignment = await prisma.assignment.create({
      data: {
        schoolId,
        title,
        description: description || null,
        subjectId,
        classId,
        attachments: structuredMetadata as any,
        dueDate: parsedDue,
        maxScore: parseFloat(maxScore || '100'),
        teacherId,
        category: category || (type ? type.toUpperCase() : 'ASSIGNMENT'),
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        allowLate: allowLate === 'true' || allowLate === true,
        isAccepting: (status || 'published') !== 'closed',
        questions: questions ? (typeof questions === 'string' ? JSON.parse(questions) : questions) : null
      }
    });

    res.status(201).json({
      ...assignment,
      ...structuredMetadata
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

/**
 * @route   PATCH /api/teachers/assignments/:id/toggle-status
 * @desc    [TEACHER] Manually open or close submissions for an assignment
 */
router.patch('/assignments/:id/toggle-status', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), validate(UpdateAssignmentAcceptingSchema), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { isAccepting } = req.body;

  try {
    const existing = await prisma.assignment.findFirst({
      where: { id, schoolId: req.user!.schoolId! }
    });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });

    const currentMeta = (existing.attachments as any) || {};
    const updatedMeta = {
      ...currentMeta,
      status: isAccepting ? 'published' : 'closed'
    };

    const assignment = await prisma.assignment.update({
      where: { id },
      data: { 
        isAccepting: !!isAccepting,
        attachments: updatedMeta as any
      }
    });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
});

/**
 * @route   GET /api/teachers/assignments
 * @desc    [TEACHER] List assignments created by the teacher with target stats and metadata
 */
router.get('/assignments', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    let teacherId: string | undefined;
    if (req.user!.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher record not found' });
      teacherId = teacher.id;
    }

    const assignments = await prisma.assignment.findMany({
      where: { 
        schoolId,
        ...(teacherId ? { teacherId } : {})
      },
      include: { 
        class: { 
          select: { 
            id: true, 
            name: true,
            _count: { select: { students: true } }
          } 
        },
        subject: { select: { id: true, name: true } },
        submissions: {
          select: {
            id: true,
            status: true,
            grade: true,
            submittedAt: true
          }
        },
        _count: { select: { submissions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = assignments.map(a => {
      const meta = (a.attachments as any) || {};
      const files = meta.files || (Array.isArray(a.attachments) ? a.attachments : []);
      const totalStudents = a.class?._count?.students || 0;
      const targetCount = (meta.targetType === 'student' && Array.isArray(meta.targetStudentIds) && meta.targetStudentIds.length > 0)
        ? meta.targetStudentIds.length
        : totalStudents;

      const submissions = a.submissions || [];
      const submittedCount = submissions.length;
      const gradedCount = submissions.filter(s => s.status === 'GRADED' && s.grade !== null).length;

      return {
        ...a,
        type: meta.type || (a.category ? a.category.toLowerCase() : 'homework'),
        status: meta.status || (a.isAccepting ? 'published' : 'closed'),
        allowResubmission: meta.allowResubmission ?? true,
        latePenaltyPercent: meta.latePenaltyPercent ?? 0,
        targetType: meta.targetType || 'class',
        targetStudentIds: meta.targetStudentIds || [],
        includeInTermReport: meta.includeInTermReport ?? false,
        term: meta.term || 'Term 1',
        gradesReleased: meta.gradesReleased ?? false,
        gradesReleasedAt: meta.gradesReleasedAt ?? null,
        files,
        totalTargetCount: targetCount,
        submittedCount,
        gradedCount
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Fetch assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

/**
 * @route   GET /api/teachers/assignments/:id
 * @desc    [TEACHER] Get details of a single assignment
 */
router.get('/assignments/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id, schoolId: req.user!.schoolId! },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } }
      }
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const meta = (assignment.attachments as any) || {};
    const files = meta.files || (Array.isArray(assignment.attachments) ? assignment.attachments : []);

    res.json({
      ...assignment,
      type: meta.type || (assignment.category ? assignment.category.toLowerCase() : 'homework'),
      status: meta.status || (assignment.isAccepting ? 'published' : 'closed'),
      allowResubmission: meta.allowResubmission ?? true,
      latePenaltyPercent: meta.latePenaltyPercent ?? 0,
      targetType: meta.targetType || 'class',
      targetStudentIds: meta.targetStudentIds || [],
      includeInTermReport: meta.includeInTermReport ?? false,
      term: meta.term || 'Term 1',
      gradesReleased: meta.gradesReleased ?? false,
      gradesReleasedAt: meta.gradesReleasedAt ?? null,
      files
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
});

/**
 * @route   GET /api/teachers/assignments/:id/submissions
 * @desc    [TEACHER] Get all student submissions for an assignment, including roster gap detection
 */
router.get('/assignments/:id/submissions', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const schoolId = req.user!.schoolId!;

  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id, schoolId },
      include: { class: true }
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const meta = (assignment.attachments as any) || {};
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: id, schoolId },
      include: { 
        student: { 
          include: { 
            class: { select: { name: true } },
            user: { select: { name: true, email: true, avatar: true } } 
          } 
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Unpack attachment metadata (files, text, history)
    const formattedSubmissions = submissions.map(s => {
      const sData = (s.attachments as any) || {};
      const files = Array.isArray(sData) ? sData : (sData.files || []);
      const submissionText = sData.submissionText || null;
      const history = sData.history || [];
      const answers = sData.answers || null;

      const isLate = assignment.dueDate ? new Date(s.submittedAt) > new Date(assignment.dueDate) : false;
      const latePenalty = (isLate && meta.latePenaltyPercent > 0) ? meta.latePenaltyPercent : 0;

      return {
        ...s,
        attachments: files,
        submissionText,
        submissionHistory: history,
        answers,
        isLate,
        latePenaltyPercent: latePenalty
      };
    });

    res.json(formattedSubmissions);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * @route   POST /api/teachers/submissions/:id/grade
 * @desc    [TEACHER] Record a grade and feedback for a submission
 */
router.post('/submissions/:id/grade', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), validate(GradeSubmissionSchema), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { grade, feedback, penaltyApplied, finalGrade } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const existing = await prisma.assignmentSubmission.findFirst({
      where: { id, schoolId }
    });
    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    const rawGrade = parseFloat(grade);
    const assignedGrade = finalGrade !== undefined ? parseFloat(finalGrade) : rawGrade;

    const submission = await prisma.assignmentSubmission.update({
      where: { id },
      data: {
        grade: isNaN(assignedGrade) ? null : assignedGrade,
        feedback: feedback || null,
        status: 'GRADED',
        gradedAt: new Date()
      }
    });
    res.json(submission);
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Failed to record grade' });
  }
});

/**
 * @route   POST /api/teachers/assignments/:id/release-grades
 * @desc    [TEACHER] Explicitly publish and release grades to the entire class & write to Continuous Assessment
 */
router.post('/assignments/:id/release-grades', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const schoolId = req.user!.schoolId!;

  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id, schoolId },
      include: {
        class: true,
        subject: true,
        submissions: {
          where: { status: 'GRADED' },
          include: { student: true }
        }
      }
    });

    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const meta = (assignment.attachments as any) || {};
    const updatedMeta = {
      ...meta,
      gradesReleased: true,
      gradesReleasedAt: new Date().toISOString()
    };

    // 1. Mark assignment grades as released
    await prisma.assignment.update({
      where: { id },
      data: {
        attachments: updatedMeta as any
      }
    });

    // 2. If assignment is designated for Continuous Assessment / Term Report, synchronize with Marks Entry module
    let assessmentRecordId: string | null = null;
    const gradedSubmissions = assignment.submissions.filter(s => s.grade !== null);

    if (meta.includeInTermReport && assignment.classId && assignment.subjectId && gradedSubmissions.length > 0) {
      const termName = meta.term || 'Term 1';
      const yearNum = new Date().getFullYear();

      // Find or create assessment container in continuous assessment module
      let assessment = await prisma.assessment.findFirst({
        where: {
          schoolId,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          title: assignment.title,
          term: termName
        }
      });

      if (!assessment) {
        assessment = await prisma.assessment.create({
          data: {
            schoolId,
            title: assignment.title,
            classId: assignment.classId,
            subjectId: assignment.subjectId,
            term: termName,
            year: yearNum,
            totalMarks: assignment.maxScore || 100,
            weight: 15,
            status: 'published',
            publishedAt: new Date(),
            createdById: req.user!.id
          }
        });
      }
      assessmentRecordId = assessment.id;

      try {
        // Upsert individual student scores into Continuous Assessment ledger
        for (const sub of gradedSubmissions) {
          await prisma.studentAssessment.upsert({
            where: {
              assessmentId_studentId: {
                assessmentId: assessment.id,
                studentId: sub.studentId
              }
            },
            update: {
              marksObtained: sub.grade,
              comment: sub.feedback
            },
            create: {
              schoolId,
              assessmentId: assessment.id,
              studentId: sub.studentId,
              marksObtained: sub.grade,
              comment: sub.feedback
            }
          });
        }
      } catch (caError) {
        console.warn('[Release Grades] Non-fatal continuous assessment sync warning:', caError);
      }
    }

    res.json({
      success: true,
      message: `Grades successfully released to students for "${assignment.title}".`,
      releasedCount: gradedSubmissions.length,
      linkedAssessmentId: assessmentRecordId
    });
  } catch (error: any) {
    console.error('Release grades error:', error);
    res.status(500).json({ error: error.message || 'Failed to release grades' });
  }
});

/**
 * @route   POST /api/teachers/assignments/:id/bulk-zero-unsubmitted
 * @desc    [TEACHER] Assign 0 marks to all learners who did not submit before deadline
 */
router.post('/assignments/:id/bulk-zero-unsubmitted', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const schoolId = req.user!.schoolId!;

  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id, schoolId },
      include: {
        submissions: { select: { studentId: true } }
      }
    });

    if (!assignment || !assignment.classId) return res.status(404).json({ error: 'Assignment not found or unlinked to class' });

    const meta = (assignment.attachments as any) || {};
    const submittedStudentIds = new Set(assignment.submissions.map(s => s.studentId));

    // Determine target students
    let targetStudents: Array<{ id: string }> = [];
    if (meta.targetType === 'student' && Array.isArray(meta.targetStudentIds) && meta.targetStudentIds.length > 0) {
      targetStudents = await prisma.student.findMany({
        where: { id: { in: meta.targetStudentIds }, schoolId },
        select: { id: true }
      });
    } else {
      targetStudents = await prisma.student.findMany({
        where: { classId: assignment.classId, schoolId },
        select: { id: true }
      });
    }

    const unsubmittedStudents = targetStudents.filter(s => !submittedStudentIds.has(s.id));

    let createdCount = 0;
    for (const student of unsubmittedStudents) {
      await prisma.assignmentSubmission.create({
        data: {
          schoolId,
          assignmentId: id,
          studentId: student.id,
          status: 'GRADED',
          grade: 0,
          feedback: 'Automated 0 mark assigned for non-submission after deadline.',
          gradedAt: new Date(),
          attachments: {
            files: [],
            submissionText: 'NON_SUBMISSION_DEFAULT_ZERO'
          } as any
        }
      });
      createdCount++;
    }

    res.json({
      success: true,
      message: `Assigned 0 to ${createdCount} non-submitting learners.`,
      count: createdCount
    });
  } catch (error: any) {
    console.error('Bulk zero error:', error);
    res.status(500).json({ error: error.message || 'Failed to apply bulk 0 marks' });
  }
});

/**
 * @route   POST /api/teachers/attendance/mark-bulk
 * @desc    [TEACHER] Bulk record attendance for a class
 */
router.post('/attendance/mark-bulk', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), validate(BulkAttendanceSchema), async (req: AuthRequest, res: Response) => {
  const { date, records, classId } = req.body; // records: [{ studentId, status, note }]

  try {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher record not found' });

    // Use loop with findFirst + create/update instead of upsert to handle classId gracefully
    const results = [];
    for (const rec of records) {
      const existing = await prisma.attendance.findFirst({
        where: {
          schoolId: req.user!.schoolId!,
          studentId: rec.studentId,
          date: new Date(date),
          classId: classId || null
        }
      });

      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: rec.status.toLowerCase(),
            note: rec.note || null,
            teacherId: teacher.id
          }
        });
        results.push(updated);
      } else {
        const created = await prisma.attendance.create({
          data: {
            schoolId: req.user!.schoolId!,
            date: new Date(date),
            studentId: rec.studentId,
            teacherId: teacher.id,
            classId: classId || null,
            status: rec.status.toLowerCase(),
            note: rec.note || null
          }
        });
        results.push(created);
      }
    }

    res.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Attendance mark error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

/**
 * @route   POST /api/teachers/textbooks/issue
 * @desc    [TEACHER] Bulk issue a textbook to a specific class
 */
router.post('/textbooks/issue', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), validate(AssignBookSchema), async (req: AuthRequest, res: Response) => {
  const { bookId, classId, dueDate } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const students = await prisma.student.findMany({
      where: { classId, schoolId }
    });

    if (students.length === 0) return res.status(400).json({ error: 'No students found in selected class' });

    // Check availability
    const book = await prisma.book.findFirst({ where: { id: bookId } });
    if (!book || book.available < students.length) {
      return res.status(400).json({ error: `Not enough copies available. Need ${students.length}, have ${book?.available || 0}` });
    }

    await prisma.$transaction(async (tx) => {
      // Re-read availability inside the transaction to prevent concurrent over-issuance
      const book = await tx.book.findFirst({ where: { id: bookId } });
      if (!book || book.available < students.length) {
        throw new Error(`Not enough copies available. Need ${students.length}, have ${book?.available || 0}`);
      }

      // Create loans inside the transaction
      for (const student of students) {
        await tx.bookLoan.create({
          data: {
            schoolId,
            bookId,
            studentId: student.id,
            dueDate: new Date(dueDate),
            loanType: 'TEXTBOOK',
            status: 'borrowed'
          }
        });
      }

      // Atomically decrement available count
      await tx.book.update({
        where: { id: bookId },
        data: { available: { decrement: students.length } }
      });
    });

    res.json({ success: true, count: students.length });
  } catch (error) {
    console.error('Textbook issue error:', error);
    res.status(500).json({ error: 'Failed to issue textbooks' });
  }
});

/**
 * @route   GET /api/teachers/textbooks
 * @desc    [TEACHER] Get school books list for issuance
 */
router.get('/textbooks', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const role = req.user!.role;
    let whereClause: any = { schoolId };

    if (role === 'TEACHER') {
      // Check if they are HOD
      const headedDepts = await prisma.department.findMany({
        where: { schoolId, headId: req.user!.id }
      });
      const isHod = headedDepts.length > 0;

      if (isHod) {
        const deptIds = headedDepts.map(d => d.id);
        whereClause = {
          schoolId,
          teacher: {
            departmentId: { in: deptIds }
          }
        };
      } else {
        const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
        if (!teacher) {
          return res.json([]);
        }
        whereClause = {
          schoolId,
          teacherId: teacher.id
        };
      }
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      include: {
        teacher: { select: { user: { select: { name: true } } } },
        loans: {
          where: { status: 'borrowed' },
          include: {
            student: {
              select: {
                name: true,
                studentId: true,
                class: { select: { name: true } }
              }
            }
          }
        },
        _count: { select: { loans: { where: { status: 'borrowed' } } } }
      },
      orderBy: { title: 'asc' }
    });
    res.json(books);
  } catch (error) {
    console.error('Error fetching textbooks:', error);
    res.status(500).json({ error: 'Failed to fetch textbooks' });
  }
});

/**
 * @route   POST /api/teachers/textbooks
 * @desc    [TEACHER / ADMIN] Register a curriculum textbook linked to teacher/class/subject
 */
router.post('/textbooks', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { title, author, isbn, totalCopies, subjectId, classId, description } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and Author are required' });
    }

    let teacherId: string | null = null;
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
    if (teacher) {
      teacherId = teacher.id;
    }

    const copiesCount = Math.max(1, parseInt(String(totalCopies || '1'), 10) || 1);

    const book = await prisma.book.create({
      data: {
        title: String(title).trim(),
        author: String(author).trim(),
        isbn: isbn ? String(isbn).trim() : null,
        description: description ? String(description).trim() : null,
        copies: copiesCount,
        available: copiesCount,
        schoolId,
        teacherId,
        subjectId: subjectId || null,
        classId: classId || null,
        status: 'Available',
        source: 'Curriculum'
      }
    });

    res.status(201).json(book);
  } catch (error: any) {
    console.error('Error creating textbook:', error);
    res.status(500).json({ error: error.message || 'Failed to add textbook' });
  }
});

/**
 * @route   GET /api/teachers/my-classes
 * @desc    [TEACHER] Get classes assigned to teacher (as class teacher or subject teacher)
 */
router.get('/my-classes', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
    if (!teacher) {
      if (['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        const allClasses = await prisma.schoolClass.findMany({
          where: { schoolId },
          include: { _count: { select: { students: true } } },
          orderBy: { name: 'asc' }
        });
        return res.json(allClasses.map(c => ({ ...c, role: 'Administrator' })));
      }
      return res.status(404).json({ error: 'Teacher record not found' });
    }

    // Classes where they are the Class Teacher
    const homeroomClasses = await prisma.schoolClass.findMany({
      where: { teacherId: teacher.id, schoolId },
      include: { _count: { select: { students: true } } }
    });

    // Classes where they are a Subject Teacher
    const subjectAssignments = await prisma.classSubjectTeacher.findMany({
      where: { teacherId: teacher.id },
      include: { 
        class: { include: { _count: { select: { students: true } } } },
        subject: { select: { 
          id: true, 
          name: true, 
          gradingType: true,
          caWeight: true,
          examWeight: true,
          isIndustrial: true,
          isProject: true,
          credits: true
        } }
      }
    });

    // Merge and unique
    const classMap = new Map();
    homeroomClasses.forEach(c => {
      if (c && c.id) {
        classMap.set(c.id, { ...c, role: 'Class Teacher' });
      }
    });

    subjectAssignments.forEach(sa => {
      if (!sa || !sa.class || !sa.class.id) return;
      const subjName = sa.subject?.name || 'Assigned Subject';
      if (!classMap.has(sa.classId)) {
        classMap.set(sa.classId, { ...sa.class, role: `Subject Teacher (${subjName})` });
      } else {
        const existing = classMap.get(sa.classId);
        existing.role += `, Subject Teacher (${subjName})`;
      }
    });

    res.json(Array.from(classMap.values()));
  } catch (error) {
    console.error('Error fetching my-classes:', error);
    res.status(500).json({ error: 'Failed to fetch your classes' });
  }
});

/**
 * @route   GET /api/teachers/my-students
 * @desc    [TEACHER] Get students in classes assigned to teacher (as class teacher or subject teacher)
 */
router.get('/my-students', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { classId } = req.query;
  const schoolId = req.user!.schoolId!;
  try {
    const isTeacher = req.user!.role === 'TEACHER';
    let allowedClassIds: string[] = [];
    const teacherRoleMap = new Map<string, string>();

    if (isTeacher) {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher record not found' });
      }

      // 1. Homeroom classes (Class Teacher)
      const homeroomClasses = await prisma.schoolClass.findMany({
        where: { teacherId: teacher.id, schoolId },
        select: { id: true, name: true }
      });
      homeroomClasses.forEach(c => {
        allowedClassIds.push(c.id);
        teacherRoleMap.set(c.id, 'Class Teacher');
      });

      // 2. Subject assignments (Subject Teacher)
      const subjectAssignments = await prisma.classSubjectTeacher.findMany({
        where: { teacherId: teacher.id },
        include: { subject: { select: { name: true } } }
      });
      subjectAssignments.forEach(sa => {
        if (!sa.classId) return;
        allowedClassIds.push(sa.classId);
        const subjName = sa.subject?.name || 'Subject';
        if (teacherRoleMap.has(sa.classId)) {
          teacherRoleMap.set(sa.classId, `${teacherRoleMap.get(sa.classId)} & Subject Teacher (${subjName})`);
        } else {
          teacherRoleMap.set(sa.classId, `Subject Teacher (${subjName})`);
        }
      });

      allowedClassIds = Array.from(new Set(allowedClassIds));

      // If teacher has no assigned classes, they teach 0 students
      if (allowedClassIds.length === 0) {
        return res.json([]);
      }
    }

    // Determine target classes filter
    let targetClassFilter: any = undefined;
    if (classId) {
      if (isTeacher && !allowedClassIds.includes(classId as string)) {
        return res.json([]);
      }
      targetClassFilter = classId as string;
    } else if (isTeacher) {
      targetClassFilter = { in: allowedClassIds };
    }

    const students = await prisma.student.findMany({
      where: { 
        schoolId,
        ...(targetClassFilter ? { classId: targetClassFilter } : {})
      },
      include: { 
        user: { select: { name: true, email: true, avatar: true, phone: true } },
        class: { select: { id: true, name: true } },
        parents: {
          include: {
            parent: {
              include: {
                user: { select: { name: true, phone: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    const enriched = students.map((s: any) => ({
      ...s,
      teacherAssignmentType: s.classId ? (teacherRoleMap.get(s.classId) || 'Assigned Student') : 'Unassigned',
      parent: s.parents?.[0]?.parent || null
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching my-students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

/**
 * @route   GET /api/teachers/:id/load
 * @desc    [ADMIN] Get professional load for a teacher
 */
router.get('/:id/load', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const teacherId = req.params.id as string;
  try {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId },
      include: {
        user: { select: { name: true, email: true } },
        dept: true,
        classes: true, // Use 'classes' instead of 'homeroomClass' based on schema
        subjectClasses: {
          include: { class: true, subject: true }
        }
      }
    });

    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teacher load' });
  }
});

/**
 * @route   POST /api/teachers/:id/load/assign
 * @desc    [ADMIN] Assign teacher to class/subject
 */
router.post('/:id/load/assign', requireAuth, requireRole('SCHOOL_ADMIN'), validate(AssignTeacherClassSchema), async (req: AuthRequest, res: Response) => {
  const { classId, subjectId, isClassTeacher } = req.body;
  const teacherId = req.params.id as string;

  try {
    if (isClassTeacher) {
      await prisma.schoolClass.update({
        where: { id: classId as string },
        data: { teacherId: teacherId }
      });
    }

    if (subjectId) {
      await prisma.classSubjectTeacher.upsert({
        where: {
          classId_subjectId_teacherId: { 
            classId: classId as string, 
            subjectId: subjectId as string, 
            teacherId: teacherId 
          }
        },
        create: { 
          classId: classId as string, 
          subjectId: subjectId as string, 
          teacherId: teacherId 
        },
        update: {}
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign teacher' });
  }
});

/**
 * @route   DELETE /api/teachers/:id/load/unassign
 * @desc    [ADMIN] Unassign teacher from class/subject
 */
router.post('/:id/load/unassign', requireAuth, requireRole('SCHOOL_ADMIN'), validate(AssignTeacherClassSchema), async (req: AuthRequest, res: Response) => {
  const { classId, subjectId, isClassTeacher } = req.body;
  const teacherId = req.params.id as string;

  try {
    if (isClassTeacher) {
      await prisma.schoolClass.update({
        where: { id: classId as string },
        data: { teacherId: null }
      });
    }

    if (subjectId) {
      await prisma.classSubjectTeacher.deleteMany({
        where: { 
          classId: classId as string, 
          subjectId: subjectId as string, 
          teacherId: teacherId 
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unassign teacher' });
  }
});

export default router;
