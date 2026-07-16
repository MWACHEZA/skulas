import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateSequentialId } from '../lib/id-generator';
import { submissionUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rate-limit';
const router = Router();
/**
 * @route   GET /api/students
 * @desc    List students in the current user's school (paginated)
 */
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN'), async (req, res) => {
    const { page = '1', limit = '20', search = '' } = req.query;
    const schoolId = req.user.schoolId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    try {
        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where: {
                    schoolId: schoolId,
                    ...(search ? { name: { contains: String(search), mode: 'insensitive' } } : {}),
                },
                include: {
                    class: { select: { name: true, level: true } },
                    user: {
                        select: {
                            id: true, name: true, role: true, isLocked: true,
                            avatar: true, secondaryRoles: true, email: true,
                            phone: true, staffId: true, metadata: true,
                            departmentId: true, dept: { select: { id: true, name: true } }
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.student.count({ where: { schoolId: schoolId } }),
        ]);
        res.json({ students, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});
/**
 * @route   GET /api/students/me/dashboard
 * @desc    Get the logged-in student's own dashboard data
 */
router.get('/me/dashboard', requireAuth, requireRole('STUDENT'), async (req, res) => {
    try {
        const student = await prisma.student.findFirst({
            where: { userId: req.user.id, schoolId: req.user.schoolId },
            include: {
                class: true,
                grades: { include: { subject: { select: { name: true } } } },
                fees: true,
                attendance: { orderBy: { date: 'desc' }, take: 30 },
            },
        });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        // Compute stats
        const attendance = student.attendance || [];
        const grades = student.grades || [];
        const fees = student.fees || [];
        const present = attendance.filter((a) => ['present', 'late'].includes(a.status)).length;
        const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
        const avgScore = grades.length
            ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
            : 0;
        const totalFees = fees.reduce((s, f) => s + f.amount, 0);
        const paidFees = fees.reduce((s, f) => s + f.paid, 0);
        const feeBalance = totalFees - paidFees;
        const announcements = await prisma.announcement.findMany({
            where: { schoolId: student.schoolId, targetRole: { in: ['ALL', 'STUDENT'] } },
            orderBy: { publishedAt: 'desc' },
            take: 5,
        });
        const assignments = await prisma.assignment.findMany({
            where: {
                classId: student.classId,
                schoolId: student.schoolId,
                isAccepting: true
            },
            include: {
                subject: { select: { name: true } },
                submissions: { where: { studentId: student.id } }
            },
            orderBy: { dueDate: 'asc' },
            take: 5,
        });
        // Only fetch timetable if student is assigned to a class
        let timetable = [];
        if (student.classId) {
            timetable = await prisma.timetableSlot.findMany({
                where: { classId: student.classId, schoolId: student.schoolId },
                include: { subject: { select: { name: true } } },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            });
        }
        res.json({
            student: {
                id: student.id,
                name: student.name,
                studentId: student.studentId,
                class: student.class,
                attendance: student.attendance || []
            },
            stats: {
                attendanceRate,
                avgScore,
                feeBalance,
                pendingAssignments: assignments.filter((a) => a.dueDate && new Date(a.dueDate) > new Date()).length
            },
            grades: student.grades,
            fees: student.fees,
            attendance: student.attendance || [],
            timetable,
            assignments,
            announcements,
        });
    }
    catch (e) {
        console.error('Student Dashboard Fetch Error:', e);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});
/**
 * @route   GET /api/students/me/research
 * @desc    Get postgraduate research details for the logged-in student
 */
router.get('/me/research', requireAuth, requireRole('STUDENT'), async (req, res) => {
    try {
        const student = await prisma.student.findFirst({
            where: { userId: req.user.id, schoolId: req.user.schoolId },
            include: {
                supervisors: {
                    include: {
                        teacher: {
                            include: { user: { select: { name: true } } }
                        }
                    }
                },
                progressReports: {
                    orderBy: { submittedAt: 'desc' }
                },
                extensionRequests: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        res.json({
            student: {
                researchTitle: student.researchTitle,
                programLevel: student.programLevel,
                studyMode: student.studyMode,
                startDate: student.startDate,
                maxCompletionDate: student.maxCompletionDate,
                extensionMonths: student.extensionMonths
            },
            supervisors: student.supervisors,
            progressReports: student.progressReports,
            extensions: student.extensionRequests
        });
    }
    catch (error) {
        console.error('Research data error:', error);
        res.status(500).json({ error: 'Failed to fetch research details' });
    }
});
/**
 * @route   GET /api/students/me/portfolio
 * @desc    Aggregate all student records and reports for the logged-in user (Cross-School History)
 */
router.get('/me/portfolio', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const [enrollments, reports, transferRequests] = await Promise.all([
            // 1. All student records for this user (past and present)
            prisma.student.findMany({
                where: { userId },
                include: {
                    school: { select: { name: true, code: true, branding: true } },
                    class: { select: { name: true } }
                },
                orderBy: { enrollmentDate: 'desc' }
            }),
            // 2. All academic reports for this user (globally)
            prisma.academicReport.findMany({
                where: { studentId: userId },
                orderBy: { createdAt: 'desc' }
            }),
            // 3. Relevant transfer requests
            prisma.transferAuthorization.findMany({
                where: { studentUserId: userId },
                include: {
                    originSchool: { select: { name: true } },
                    targetSchool: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        res.json({
            enrollments: enrollments.map(e => ({
                school: e.school,
                studentId: e.studentId,
                class: e.class?.name || 'Graduated/Inactive',
                status: e.status,
                enrollmentDate: e.enrollmentDate
            })),
            reports,
            transferRequests
        });
    }
    catch (error) {
        console.error('[Portfolio] Aggregation failed:', error);
        res.status(500).json({ error: 'Failed to fetch academic history portfolio' });
    }
});
/**
 * @route   GET /api/students/assignments
 * @desc    [STUDENT] List assignments for the student's class
 */
router.get('/assignments', requireAuth, requireRole('STUDENT'), async (req, res) => {
    const userId = req.user.id;
    try {
        const student = await prisma.student.findFirst({
            where: { userId, schoolId: req.user.schoolId },
            select: { classId: true }
        });
        if (!student || !student.classId)
            return res.json([]);
        const assignments = await prisma.assignment.findMany({
            where: {
                classId: student.classId,
                schoolId: req.user.schoolId,
                isAccepting: true
            },
            include: {
                subject: { select: { name: true } }
            },
            orderBy: { dueDate: 'asc' }
        });
        const studentRecord = await prisma.student.findFirst({ where: { userId, schoolId: req.user.schoolId } });
        if (!studentRecord)
            return res.json([]);
        const assignmentsWithUserSubmissions = await Promise.all(assignments.map(async (a) => {
            const submission = await prisma.assignmentSubmission.findFirst({
                where: {
                    assignmentId: a.id,
                    studentId: studentRecord.id,
                    schoolId: req.user.schoolId
                }
            });
            return { ...a, submissions: submission ? [submission] : [] };
        }));
        res.json(assignmentsWithUserSubmissions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});
/**
 * @route   GET /api/students/my-children
 * @desc    [PARENT] Get all students linked to the logged-in parent
 */
router.get('/my-children', requireAuth, requireRole('PARENT'), async (req, res) => {
    try {
        const parentLinks = await prisma.parentStudent.findMany({
            where: {
                parent: { userId: req.user.id }
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true,
                        class: { select: { id: true, name: true } }
                    }
                }
            }
        });
        const students = parentLinks.map(link => link.student);
        res.json(students);
    }
    catch (error) {
        console.error('Error fetching parent children:', error);
        res.status(500).json({ error: 'Failed to fetch linked students' });
    }
});
/**
 * @route   GET /api/students/:id
 * @desc    Get a single student's full profile including grades, fees, attendance summary
 */
router.get('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    // Ownership check for students
    if (user.role === 'STUDENT') {
        // A student can only view their own record by student.userId
        const student = await prisma.student.findFirst({
            where: { id: String(id), schoolId: user.schoolId }
        });
        if (!student || student.userId !== user.id) {
            return res.status(403).json({ error: 'Access denied: You can only view your own records' });
        }
    }
    try {
        const student = await prisma.student.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId },
            include: {
                user: true,
                class: true,
                house: true,
                club: true,
                grades: { include: { subject: { select: { name: true, code: true } } }, orderBy: { createdAt: 'desc' } },
                fees: { orderBy: { term: 'asc' } },
                attendance: { orderBy: { date: 'desc' }, take: 30 },
                bookLoans: { include: { book: { select: { title: true, author: true } } }, orderBy: { borrowedAt: 'desc' } },
            },
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        // Calculate attendance rate
        const attendance = student.attendance || [];
        const total = attendance.length;
        const present = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
        const attendanceRate = total ? Math.round((present / total) * 100) : 0;
        res.json({ ...student, attendanceRate });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});
/**
 * @route   POST /api/students
 * @desc    Create a new student record (SCHOOL_ADMIN only)
 */
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { studentId, name, email, phone, dob, gender, address, classId } = req.body;
    const schoolId = req.user.schoolId;
    try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email: email?.trim().toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ error: 'This email is already registered to another account. Please use a unique email.' });
        }
        const hashedPassword = await bcrypt.hash('Password', 10);
        const result = await prisma.$transaction(async (tx) => {
            // 1. Generate sequential ID if not provided
            const generatedId = await generateSequentialId(schoolId, 'STUDENT', tx);
            const studentEmail = email?.trim().toLowerCase() || `${generatedId.toLowerCase()}@school.com`;
            // 2. Create User account
            const user = await tx.user.create({
                data: {
                    email: studentEmail,
                    password: hashedPassword,
                    name,
                    role: 'STUDENT',
                    phone,
                    staffId: studentId || generatedId, // <-- preserve sequential ID on user
                    schoolId,
                    mustChangePassword: true
                }
            });
            // 3. Create Student record linked to User
            const student = await tx.student.create({
                data: {
                    studentId: studentId || generatedId,
                    name,
                    email: studentEmail,
                    phone,
                    dob: dob ? new Date(dob) : undefined,
                    gender,
                    address,
                    classId,
                    userId: user.id,
                    schoolId
                }
            });
            return student;
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Student creation failed:', error);
        res.status(500).json({ error: 'Failed to create student and user account.' });
    }
});
/**
 * @route   PATCH /api/students/:id
 * @desc    Update a student record
 */
router.patch('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, dob, gender, address, classId, status, part, standing } = req.body;
    try {
        const student = await prisma.student.update({
            where: { id: String(id), schoolId: req.user.schoolId },
            data: {
                name,
                email,
                phone,
                dob: dob ? new Date(dob) : undefined,
                gender,
                address,
                classId,
                status,
                part: part ? parseInt(part) : undefined,
                standing
            },
        });
        res.json(student);
    }
    catch {
        res.status(500).json({ error: 'Failed to update student' });
    }
});
/**
 * @route   POST /api/students/:id/calculate-standing
 * @desc    [ADMIN/TEACHER] Automated standing calculation based on NUST regs
 */
router.post('/:id/calculate-standing', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req, res) => {
    const { id } = req.params;
    const { term, year } = req.body;
    try {
        const student = await prisma.student.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId },
            include: {
                grades: { where: { term: String(term), year: parseInt(year) } },
                class: true
            }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        const totalModules = student.grades.length;
        if (totalModules === 0)
            return res.json({ standing: student.standing, message: 'No grades found for this period' });
        const passedModules = student.grades.filter(g => g.score >= 50).length;
        const failedModules = totalModules - passedModules;
        const failRate = (failedModules / totalModules) * 100;
        const aggregate = student.grades.reduce((sum, g) => sum + g.score, 0) / totalModules;
        let standing = 'Normal';
        let reasons = [];
        // NUST Regulation logic (matching academic.ts)
        if (passedModules / totalModules < 0.25)
            standing = 'Withdraw';
        else if (failRate > 50 || aggregate < 35)
            standing = 'Discontinue';
        else if (failRate > 25)
            standing = 'Repeat';
        else if (failedModules > 0)
            standing = 'Carry Over';
        const updated = await prisma.student.update({
            where: { id: student.id, schoolId: req.user.schoolId },
            data: { standing }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Standing calculation failed' });
    }
});
/**
 * @route   DELETE /api/students/:id
 * @desc    Permanently delete a student record
 */
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.student.deleteMany({
            where: { id: String(id), schoolId: req.user.schoolId },
        });
        res.json({ message: 'Student deleted successfully' });
    }
    catch {
        res.status(500).json({ error: 'Failed to delete student' });
    }
});
/**
 * @route   POST /api/students/:id/reset-password
 * @desc    Reset a student's password to "Password"
 */
router.post('/:id/reset-password', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const student = await prisma.student.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId },
            select: { email: true, userId: true }
        });
        if (!student || !student.userId) {
            return res.status(404).json({ error: 'Student user record not found' });
        }
        // Update the corresponding User record
        const hashedPassword = await bcrypt.hash('Password', 10);
        await prisma.user.update({
            where: { id: student.userId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
                passwordLastChanged: new Date()
            }
        });
        res.json({ message: 'Password has been reset to the system default successfully' });
    }
    catch {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
// Moved /assignments above /:id to prevent shadowing
/**
 * @route   POST /api/students/assignments/:id/start
 * @desc    [STUDENT] Mark an assignment as started (starts the timer for timed quizzes)
 */
router.post('/assignments/:id/start', requireAuth, requireRole('STUDENT'), async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    try {
        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        // Initial check: is it already started?
        let submission = await prisma.assignmentSubmission.findFirst({
            where: {
                assignmentId: id,
                studentId: student.id,
                schoolId: req.user.schoolId
            }
        });
        if (!submission) {
            submission = await prisma.assignmentSubmission.create({
                data: {
                    assignmentId: id,
                    studentId: student.id,
                    schoolId: req.user.schoolId,
                    startedAt: new Date(),
                    status: 'IN_PROGRESS'
                }
            });
        }
        else if (!submission.startedAt) {
            submission = await prisma.assignmentSubmission.update({
                where: {
                    id: submission.id,
                    schoolId: req.user.schoolId
                },
                data: { startedAt: new Date(), status: 'IN_PROGRESS' }
            });
        }
        res.json(submission);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to start assignment' });
    }
});
/**
 * @route   POST /api/students/assignments/:id/submit
 * @desc    [STUDENT] Submit work for an assignment (Supports files or Quiz answers)
 */
router.post('/assignments/:id/submit', requireAuth, requireRole('STUDENT'), uploadLimiter, submissionUpload.array('files', 10), async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    // Handle multiple file storage
    const files = req.files;
    const uploadPath = req.uploadCategoryPath || 'global/submissions';
    const attachments = files ? files.map(f => ({
        name: f.originalname,
        url: `${uploadPath}/${f.filename}`.replace(/\\/g, '/')
    })) : [];
    try {
        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        const assignment = await prisma.assignment.findFirst({
            where: { id, schoolId: req.user.schoolId },
            include: { class: true }
        });
        if (!assignment)
            return res.status(404).json({ error: 'Assignment not found' });
        // 1. Check if submissions are manually closed
        if (!assignment.isAccepting) {
            return res.status(403).json({ error: 'This assignment is no longer accepting submissions.' });
        }
        // 2. Check hard deadline
        const now = new Date();
        const isLate = now > new Date(assignment.dueDate);
        if (isLate && !assignment.allowLate) {
            return res.status(403).json({ error: 'The deadline has passed and late submissions are disabled.' });
        }
        // 3. Automated Quiz Grading
        let autoScore = null;
        let submissionData = attachments;
        // If it's an online quiz, the answers are in the body instead of files
        if (assignment.questions && req.body.answers) {
            const answers = JSON.parse(req.body.answers); // { "q1": "Answer", "q2": "OptionB" }
            const questions = assignment.questions;
            let totalPoints = 0;
            let earnedPoints = 0;
            questions.forEach(q => {
                totalPoints += q.points || 0;
                const studentAns = answers[q.id];
                if (studentAns === q.answer) {
                    earnedPoints += q.points || 0;
                }
            });
            autoScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
            submissionData = answers; // Store answers in attachments JSON
        }
        const submission = await prisma.assignmentSubmission.upsert({
            where: {
                assignmentId_studentId: { assignmentId: id, studentId: student.id },
                schoolId: req.user.schoolId
            },
            update: {
                attachments: submissionData,
                submittedAt: now,
                status: isLate ? 'LATE' : 'SUBMITTED',
                autoScore: autoScore
            },
            create: {
                assignmentId: id,
                studentId: student.id,
                schoolId: req.user.schoolId,
                attachments: submissionData,
                submittedAt: now,
                status: isLate ? 'LATE' : 'SUBMITTED',
                autoScore: autoScore
            }
        });
        res.json(submission);
    }
    catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Failed to submit assignment' });
    }
});
/**
 * @route   GET /api/students/me/books
 * @desc    [STUDENT] List books currently issued to the student
 */
router.get('/me/books', requireAuth, requireRole('STUDENT'), async (req, res) => {
    const userId = req.user.id;
    try {
        const student = await prisma.student.findUnique({ where: { userId } });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        const loans = await prisma.bookLoan.findMany({
            where: {
                studentId: student.id,
                schoolId: req.user.schoolId,
                status: { in: ['borrowed', 'overdue'] }
            },
            include: {
                book: {
                    select: {
                        title: true,
                        author: true,
                        isbn: true,
                        category: true
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });
        res.json(loans);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch issued books' });
    }
});
/**
 * @route   GET /api/students/by-class/:classId
 * @desc    [SCHOOL_ADMIN/TEACHER] Get students for a specific class for migration
 */
router.get('/by-class/:classId', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER', 'BURSAR'), async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            where: {
                classId: req.params.classId,
                schoolId: req.user.schoolId
            },
            select: {
                id: true,
                studentId: true,
                name: true,
                part: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch students for class' });
    }
});
/**
 * @route   POST /api/students/migrate
 * @desc    [SCHOOL_ADMIN] Bulk migrate students to a new class/year
 */
router.post('/migrate', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { studentIds, targetClassId, targetPart } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const targetClass = await tx.schoolClass.findUnique({
                where: { id: targetClassId }
            });
            const targetClassName = targetClass ? targetClass.name : 'Unknown Class';
            const students = await tx.student.findMany({
                where: { id: { in: studentIds }, schoolId },
                include: { class: true }
            });
            for (const student of students) {
                let history = student.academicHistory;
                if (!history || typeof history !== 'object') {
                    history = { migrations: [] };
                }
                else if (Array.isArray(history)) {
                    history = { previousGrades: history, migrations: [] };
                }
                else if (!history.migrations) {
                    history.migrations = [];
                }
                history.migrations.push({
                    date: new Date().toISOString(),
                    fromClassId: student.classId || null,
                    fromClassName: student.class?.name || 'Unassigned',
                    fromPart: student.part,
                    toClassId: targetClassId,
                    toClassName: targetClassName,
                    toPart: targetPart ? parseInt(targetPart) : 1,
                    migratedBy: req.user.email || 'Admin'
                });
                await tx.student.update({
                    where: { id: student.id },
                    data: {
                        classId: targetClassId,
                        part: targetPart ? parseInt(targetPart) : undefined,
                        status: 'Enrolled',
                        academicHistory: history
                    }
                });
            }
            return { count: students.length };
        });
        res.json({ success: true, count: result.count });
    }
    catch (error) {
        res.status(500).json({ error: 'Migration failed: ' + error.message });
    }
});
/**
 * @route   POST /api/students/bulk-migrate
 * @desc    [SCHOOL_ADMIN] Bulk migrate students based on class-to-class mapping
 */
router.post('/bulk-migrate', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { mappings } = req.body; // mappings: Array of { sourceClassId: string, targetClassId: string, targetPart: number }
    const schoolId = req.user.schoolId;
    if (!Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({ error: 'Invalid mappings provided' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            let totalCount = 0;
            for (const m of mappings) {
                if (!m.sourceClassId || !m.targetClassId)
                    continue;
                const sourceClass = await tx.schoolClass.findUnique({
                    where: { id: m.sourceClassId }
                });
                const targetClass = await tx.schoolClass.findUnique({
                    where: { id: m.targetClassId }
                });
                if (!targetClass)
                    continue;
                const sourceClassName = sourceClass ? sourceClass.name : 'Unknown Class';
                const targetClassName = targetClass.name;
                const students = await tx.student.findMany({
                    where: { classId: m.sourceClassId, schoolId }
                });
                for (const student of students) {
                    let history = student.academicHistory;
                    if (!history || typeof history !== 'object') {
                        history = { migrations: [] };
                    }
                    else if (Array.isArray(history)) {
                        history = { previousGrades: history, migrations: [] };
                    }
                    else if (!history.migrations) {
                        history.migrations = [];
                    }
                    history.migrations.push({
                        date: new Date().toISOString(),
                        fromClassId: m.sourceClassId,
                        fromClassName: sourceClassName,
                        fromPart: student.part,
                        toClassId: m.targetClassId,
                        toClassName: targetClassName,
                        toPart: m.targetPart ? parseInt(m.targetPart) : 1,
                        migratedBy: req.user.email || 'Admin'
                    });
                    await tx.student.update({
                        where: { id: student.id },
                        data: {
                            classId: m.targetClassId,
                            part: m.targetPart ? parseInt(m.targetPart) : undefined,
                            status: 'Enrolled',
                            academicHistory: history
                        }
                    });
                    totalCount++;
                }
            }
            return totalCount;
        });
        res.json({ success: true, count: result });
    }
    catch (error) {
        res.status(500).json({ error: 'Bulk migration failed: ' + error.message });
    }
});
export default router;
//# sourceMappingURL=students.js.map