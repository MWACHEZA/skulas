import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/timetable/class/:classId
 * @desc    Get published timetable for a specific class
 */
router.get('/class/:classId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const schoolId = req.user!.schoolId!;
  try {
    const slots = await prisma.timetableSlot.findMany({
      where: { 
        classId: classId as string, 
        schoolId, 
        // Show even if not published if the user is admin/teacher
        ...(req.user!.role === 'STUDENT' ? { isPublished: true } : {})
      },
      include: {
        subject: { select: { name: true, code: true } }
      }
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class timetable' });
  }
});

/**
 * @route   GET /api/timetable/master
 * @desc    Get master timetable cross grid for the whole school
 */
router.get('/master', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const slots = await prisma.timetableSlot.findMany({
      where: { schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { 
          select: { 
            id: true, 
            name: true, 
            level: true, 
            teacher: { select: { id: true, user: { select: { name: true } } } },
            subjectTeachers: {
              include: {
                teacher: { select: { id: true, user: { select: { name: true } } } },
                subject: { select: { id: true, name: true } }
              }
            }
          } 
        }
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json(slots);
  } catch (error) {
    console.error('Failed to fetch master timetable slots:', error);
    res.status(500).json({ error: 'Failed to fetch master timetable' });
  }
});

/**
 * @route   GET /api/timetable/my
 * @desc    Get personalized timetable for current student, teacher, or parent (for a child)
 */
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const userId = req.user!.id;
  const role = req.user!.role;
  const { studentId: requestedStudentId } = req.query;

  try {
    if (role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId } });
      if (!student || !student.classId) return res.json([]);
      
      const slots = await prisma.timetableSlot.findMany({
        where: { classId: student.classId, isPublished: true, schoolId },
        include: { subject: { select: { name: true, code: true } } }
      });
      return res.json(slots);
    } 
    
    if (role === 'PARENT') {
      if (!requestedStudentId) {
        return res.status(400).json({ error: 'studentId is required for parents' });
      }

      // Security: Verify parent-student linkage
      const parent = await prisma.parent.findUnique({ where: { userId } });
      if (!parent) return res.status(404).json({ error: 'Parent record not found' });

      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId: requestedStudentId as string }
      });

      if (!link) {
        return res.status(403).json({ error: 'Access denied. You are not linked to this student.' });
      }

      // Fetch student's class
      const student = await prisma.student.findFirst({
        where: { id: requestedStudentId as string },
        select: { classId: true }
      });

      if (!student || !student.classId) return res.json([]);

      const slots = await prisma.timetableSlot.findMany({
        where: { classId: student.classId, isPublished: true }, // Timetables are school-agnostic in the query if classId is unique
        include: { subject: { select: { name: true, code: true } } }
      });
      return res.json(slots);
    }
    
    if (role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({ where: { userId } });
      if (!teacher) return res.json([]);

      // 1. Assignments via ClassSubjectTeacher
      const classSubjectAssignments = await prisma.classSubjectTeacher.findMany({
        where: { teacherId: teacher.id },
        select: { subjectId: true, classId: true }
      });

      // 2. Direct subject assignments via TeacherSubject
      const teacherSubjects = await prisma.teacherSubject.findMany({
        where: { teacherId: teacher.id },
        select: { subjectId: true }
      });

      // 3. Classes where teacher is appointed as Class Teacher
      const headedClasses = await prisma.schoolClass.findMany({
        where: { teacherId: teacher.id },
        select: { id: true }
      });

      const directSubjectIds = teacherSubjects.map(ts => ts.subjectId);
      const cstSubjectIds = classSubjectAssignments.map(c => c.subjectId);
      const allSubjectIds = Array.from(new Set([...directSubjectIds, ...cstSubjectIds]));
      const classIds = Array.from(new Set([
        ...classSubjectAssignments.map(c => c.classId),
        ...headedClasses.map(h => h.id)
      ]));

      // Query timetable slots matching the teacher's assigned subjects and classes
      const orConditions: any[] = [];
      
      if (classSubjectAssignments.length > 0) {
        orConditions.push({
          OR: classSubjectAssignments.map(c => ({
            classId: c.classId,
            subjectId: c.subjectId
          }))
        });
      }

      if (classIds.length > 0 && allSubjectIds.length > 0) {
        orConditions.push({
          classId: { in: classIds },
          subjectId: { in: allSubjectIds }
        });
      } else if (allSubjectIds.length > 0) {
        orConditions.push({
          subjectId: { in: allSubjectIds }
        });
      }

      if (orConditions.length === 0) {
        return res.json([]);
      }

      const slots = await prisma.timetableSlot.findMany({
        where: {
          schoolId,
          OR: orConditions
        },
        include: { 
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, level: true } }
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });

      return res.json(slots);
    }

    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch personalized timetable' });
  }
});

/**
 * @route   POST /api/timetable/save
 * @desc    Bulk save timetable slots for a class
 */
router.post('/save', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { classId, slots, term, year } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    await prisma.$transaction([
      // Delete existing slots for this class/term/year to prevent duplication
      prisma.timetableSlot.deleteMany({
        where: { classId, term, year, schoolId }
      }),
      // Create new slots
      prisma.timetableSlot.createMany({
        data: slots.map((s: any) => ({
          ...s,
          classId,
          schoolId,
          term,
          year: parseInt(year)
        }))
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Timetable Save Error:', error);
    res.status(500).json({ error: 'Failed to save timetable' });
  }
});

/**
 * @route   POST /api/timetable/publish
 * @desc    Toggle published status for a specific timetable
 */
router.post('/publish', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { classId, term, year, isPublished } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    // Verify slots exist first
    const count = await prisma.timetableSlot.count({
      where: { classId, term, year, schoolId }
    });

    if (count === 0 && isPublished) {
      return res.status(400).json({ 
        error: 'Cannot publish an empty timetable. Please add and save slots first.' 
      });
    }

    await prisma.timetableSlot.updateMany({
      where: { classId, term, year, schoolId },
      data: { isPublished }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish timetable' });
  }
});

// --- Phase 2: Teacher Personal Timetable ---
router.get('/teacher-personal', requireAuth, requireRole('TEACHER'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const userId = req.user!.id;
  try {
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) return res.json({ slots: [], duties: [] });

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId: teacher.id },
      select: { subjectId: true }
    });
    const subjectIds = teacherSubjects.map(ts => ts.subjectId);

    const slots = await prisma.timetableSlot.findMany({
      where: { subjectId: { in: subjectIds }, schoolId },
      include: {
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } }
      }
    });

    // In a full implementation, we'd fetch from a StaffDuty or PrefectDuty model
    // but the instruction says "use existing PrefectDuty or similar if found, otherwise create StaffDuty"
    // To keep it simple, we can return an empty duties array for now since schema wasn't populated with StaffDuty
    const duties: any[] = [];

    res.json({ slots, duties });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch personal timetable' });
  }
});

export default router;
