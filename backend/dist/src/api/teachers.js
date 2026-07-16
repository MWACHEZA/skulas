import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { assignmentUpload } from '../middleware/upload';
const router = Router();
/**
 * @route   GET /api/teachers
 * @desc    [ADMIN] Get all teachers with user details
 */
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const teachers = await prisma.teacher.findMany({
            where: { schoolId: req.user.schoolId },
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
    }
    catch (error) {
        console.error('Fetch teachers error:', error);
        res.status(500).json({ error: 'Failed to fetch teacher roster' });
    }
});
/**
 * @route   POST /api/teachers/assignments
 * @desc    [TEACHER] Create a new assignment for a specific class with optional attachment
 */
router.post('/assignments', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), assignmentUpload.array('files', 5), async (req, res) => {
    const { title, description, subjectId, classId, dueDate, maxScore, category, timeLimit, allowLate, questions // JSON string if provided
     } = req.body;
    // Handle multiple file storage
    const files = req.files;
    const uploadPath = req.uploadCategoryPath || 'global/assignments';
    const attachments = files ? files.map(f => ({
        name: f.originalname,
        url: `${uploadPath}/${f.filename}`.replace(/\\/g, '/')
    })) : [];
    try {
        // Find teacher record
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        const assignment = await prisma.assignment.create({
            data: {
                title,
                description,
                subjectId,
                classId,
                attachments: attachments,
                dueDate: new Date(dueDate),
                maxScore: parseFloat(maxScore || '100'),
                teacherId: teacher.id,
                category: category || 'ASSIGNMENT',
                timeLimit: timeLimit ? parseInt(timeLimit) : null,
                allowLate: allowLate === 'true' || allowLate === true,
                isAccepting: true,
                questions: questions ? JSON.parse(questions) : null
            }
        });
        res.status(201).json(assignment);
    }
    catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ error: 'Failed to create assignment' });
    }
});
/**
 * @route   PATCH /api/teachers/assignments/:id/toggle-status
 * @desc    [TEACHER] Manually open or close submissions for an assignment
 */
router.patch('/assignments/:id/toggle-status', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const id = req.params.id;
    const { isAccepting } = req.body;
    try {
        const assignment = await prisma.assignment.update({
            where: { id },
            data: { isAccepting }
        });
        res.json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update assignment status' });
    }
});
/**
 * @route   GET /api/teachers/assignments
 * @desc    [TEACHER] List assignments created by the teacher
 */
router.get('/assignments', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        const assignments = await prisma.assignment.findMany({
            where: { teacherId: teacher.id },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                _count: { select: { submissions: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});
/**
 * @route   GET /api/teachers/assignments/:id
 * @desc    [TEACHER] Get details of a single assignment
 */
router.get('/assignments/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const id = req.params.id;
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } }
            }
        });
        res.json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch assignment details' });
    }
});
/**
 * @route   GET /api/teachers/assignments/:id/submissions
 * @desc    [TEACHER] Get all student submissions for an assignment
 */
router.get('/assignments/:id/submissions', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const id = req.params.id;
    try {
        const submissions = await prisma.assignmentSubmission.findMany({
            where: { assignmentId: id },
            include: {
                student: { include: { user: { select: { name: true } } } }
            },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(submissions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});
/**
 * @route   POST /api/teachers/submissions/:id/grade
 * @desc    [TEACHER] Record a grade and feedback for a submission
 */
router.post('/submissions/:id/grade', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const id = req.params.id;
    const { grade, feedback } = req.body;
    try {
        const submission = await prisma.assignmentSubmission.update({
            where: { id },
            data: {
                grade: parseFloat(grade),
                feedback,
                status: 'GRADED',
                gradedAt: new Date()
            }
        });
        res.json(submission);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record grade' });
    }
});
/**
 * @route   POST /api/teachers/attendance/mark-bulk
 * @desc    [TEACHER] Bulk record attendance for a class
 */
router.post('/attendance/mark-bulk', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const { date, records } = req.body; // records: [{ studentId, status, note }]
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        const results = await Promise.all(records.map(async (rec) => {
            return prisma.attendance.create({
                data: {
                    schoolId: req.user.schoolId,
                    studentId: rec.studentId,
                    teacherId: teacher.id,
                    date: new Date(date),
                    status: rec.status,
                    note: rec.note
                }
            });
        }));
        res.json({ success: true, count: results.length });
    }
    catch (error) {
        console.error('Attendance mark error:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});
/**
 * @route   POST /api/teachers/textbooks/issue
 * @desc    [TEACHER] Bulk issue a textbook to a specific class
 */
router.post('/textbooks/issue', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const { bookId, classId, dueDate } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const students = await prisma.student.findMany({
            where: { classId, schoolId }
        });
        if (students.length === 0)
            return res.status(400).json({ error: 'No students found in selected class' });
        // Check availability
        const book = await prisma.book.findUnique({ where: { id: bookId } });
        if (!book || book.available < students.length) {
            return res.status(400).json({ error: `Not enough copies available. Need ${students.length}, have ${book?.available || 0}` });
        }
        // Create loans
        const loans = await Promise.all(students.map(student => prisma.bookLoan.create({
            data: {
                schoolId,
                bookId,
                studentId: student.id,
                dueDate: new Date(dueDate),
                loanType: 'TEXTBOOK',
                status: 'borrowed'
            }
        })));
        // Update available count
        await prisma.book.update({
            where: { id: bookId },
            data: { available: { decrement: students.length } }
        });
        res.json({ success: true, count: loans.length });
    }
    catch (error) {
        console.error('Textbook issue error:', error);
        res.status(500).json({ error: 'Failed to issue textbooks' });
    }
});
/**
 * @route   GET /api/teachers/textbooks
 * @desc    [TEACHER] Get school books list for issuance
 */
router.get('/textbooks', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const role = req.user.role;
        let whereClause = { schoolId };
        if (role === 'TEACHER') {
            // Check if they are HOD
            const headedDepts = await prisma.department.findMany({
                where: { schoolId, headId: req.user.id }
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
            }
            else {
                const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
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
    }
    catch (error) {
        console.error('Error fetching textbooks:', error);
        res.status(500).json({ error: 'Failed to fetch textbooks' });
    }
});
/**
 * @route   GET /api/teachers/my-classes
 * @desc    [TEACHER] Get classes assigned to teacher (as class teacher or subject teacher)
 */
router.get('/my-classes', requireAuth, requireRole('TEACHER'), async (req, res) => {
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        // Classes where they are the Class Teacher
        const homeroomClasses = await prisma.schoolClass.findMany({
            where: { teacherId: teacher.id },
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
        homeroomClasses.forEach(c => classMap.set(c.id, { ...c, role: 'Class Teacher' }));
        subjectAssignments.forEach(sa => {
            if (!classMap.has(sa.classId)) {
                classMap.set(sa.classId, { ...sa.class, role: `Subject Teacher (${sa.subject.name})` });
            }
            else {
                const existing = classMap.get(sa.classId);
                existing.role += `, Subject Teacher (${sa.subject.name})`;
            }
        });
        res.json(Array.from(classMap.values()));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch your classes' });
    }
});
/**
 * @route   GET /api/teachers/my-students
 * @desc    [TEACHER] Get students in a specific class assigned to the teacher
 */
router.get('/my-students', requireAuth, requireRole('TEACHER'), async (req, res) => {
    const { classId } = req.query;
    try {
        const students = await prisma.student.findMany({
            where: {
                schoolId: req.user.schoolId,
                classId: classId || undefined
            },
            include: {
                user: { select: { name: true, email: true, avatar: true } },
                class: { select: { name: true } }
            },
            orderBy: { user: { name: 'asc' } }
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});
/**
 * @route   GET /api/teachers/:id/load
 * @desc    [ADMIN] Get professional load for a teacher
 */
router.get('/:id/load', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const teacherId = req.params.id;
    try {
        const teacher = await prisma.teacher.findUnique({
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
        if (!teacher)
            return res.status(404).json({ error: 'Teacher not found' });
        res.json(teacher);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch teacher load' });
    }
});
/**
 * @route   POST /api/teachers/:id/load/assign
 * @desc    [ADMIN] Assign teacher to class/subject
 */
router.post('/:id/load/assign', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { classId, subjectId, isClassTeacher } = req.body;
    const teacherId = req.params.id;
    try {
        if (isClassTeacher) {
            await prisma.schoolClass.update({
                where: { id: classId },
                data: { teacherId: teacherId }
            });
        }
        if (subjectId) {
            await prisma.classSubjectTeacher.upsert({
                where: {
                    classId_subjectId_teacherId: {
                        classId: classId,
                        subjectId: subjectId,
                        teacherId: teacherId
                    }
                },
                create: {
                    classId: classId,
                    subjectId: subjectId,
                    teacherId: teacherId
                },
                update: {}
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to assign teacher' });
    }
});
/**
 * @route   DELETE /api/teachers/:id/load/unassign
 * @desc    [ADMIN] Unassign teacher from class/subject
 */
router.post('/:id/load/unassign', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { classId, subjectId, isClassTeacher } = req.body;
    const teacherId = req.params.id;
    try {
        if (isClassTeacher) {
            await prisma.schoolClass.update({
                where: { id: classId },
                data: { teacherId: null }
            });
        }
        if (subjectId) {
            await prisma.classSubjectTeacher.deleteMany({
                where: {
                    classId: classId,
                    subjectId: subjectId,
                    teacherId: teacherId
                }
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to unassign teacher' });
    }
});
/**
 * @route   POST /api/teachers/attendance/mark-bulk
 * @desc    [TEACHER] Mark bulk attendance for students
 */
router.post('/attendance/mark-bulk', requireAuth, requireRole('TEACHER'), async (req, res) => {
    const { date, records } = req.body; // records: [{ studentId, status, note }]
    const userId = req.user.id;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        await prisma.$transaction(records.map((rec) => prisma.attendance.create({
            data: {
                schoolId: req.user.schoolId,
                date: new Date(date),
                studentId: rec.studentId,
                teacherId: teacher.id,
                status: rec.status.toLowerCase(),
                note: rec.note || null
            }
        })));
        res.json({ success: true, message: 'Attendance recorded successfully' });
    }
    catch (error) {
        console.error('Bulk attendance error:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});
export default router;
//# sourceMappingURL=teachers.js.map