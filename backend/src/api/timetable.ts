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

      // In this system, teachers are assigned to slots via class teacher assignment 
      // or we can assume for now they want to see all classes where their subjects are taught
      // For precision, let's allow finding slots where the subject belongs to the teacher
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

export default router;
