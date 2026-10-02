"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Get daily attendance for a class
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { classId, date } = req.query;
        if (!classId || !date) {
            return res.status(400).json({ error: 'classId and date are required' });
        }
        const queryDate = new Date(date);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;
        const [attendances, total] = await Promise.all([
            prisma_1.default.attendance.findMany({
                where: {
                    schoolId: req.user.schoolId,
                    student: {
                        classId: classId
                    },
                    date: {
                        gte: (0, date_fns_1.startOfDay)(queryDate),
                        lte: (0, date_fns_1.endOfDay)(queryDate)
                    }
                },
                include: {
                    student: true
                },
                skip,
                take: limit
            }),
            prisma_1.default.attendance.count({
                where: {
                    schoolId: req.user.schoolId,
                    student: {
                        classId: classId
                    },
                    date: {
                        gte: (0, date_fns_1.startOfDay)(queryDate),
                        lte: (0, date_fns_1.endOfDay)(queryDate)
                    }
                }
            })
        ]);
        res.json({ data: attendances, total, page, limit });
    }
    catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: "We couldn't load the attendance records right now due to a network connection issue. Please refresh the page." });
    }
});
// Mark student attendance (Manual)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { studentId, date, status, note } = req.body;
        if (!studentId || !date || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const queryDate = new Date(date);
        // Find existing attendance
        const existing = await prisma_1.default.attendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                studentId,
                date: (0, date_fns_1.startOfDay)(queryDate),
                classId: req.body.classId || null
            }
        });
        let attendance;
        if (existing) {
            attendance = await prisma_1.default.attendance.update({
                where: { id: existing.id },
                data: {
                    status,
                    note,
                    teacherId: req.user.staffId || 'admin',
                    scanMethod: 'Manual'
                }
            });
        }
        else {
            attendance = await prisma_1.default.attendance.create({
                data: {
                    schoolId: req.user.schoolId,
                    studentId,
                    date: (0, date_fns_1.startOfDay)(queryDate),
                    status,
                    note,
                    teacherId: req.user.staffId || 'admin',
                    classId: req.body.classId || null,
                    scanMethod: 'Manual'
                }
            });
        }
        res.json({ success: true, attendance });
    }
    catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ error: "We couldn't save today's attendance because the connection to the server was lost. Please check your internet and try clicking save again." });
    }
});
// Helper to run a gate check on a student
async function runGateCheck(studentId, schoolId) {
    const student = await prisma_1.default.student.findFirst({
        where: { id: studentId },
        include: { class: true }
    });
    if (!student || student.schoolId !== schoolId) {
        return { allowed: false, reason: 'Student not found or unauthorized' };
    }
    // Calculate fee balance
    const fees = await prisma_1.default.fee.findMany({
        where: { studentId: student.id }
    });
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
    const balance = totalFees - totalPaid;
    // Load school gate settings
    let settings = await prisma_1.default.schoolSetting.findFirst({
        where: { schoolId }
    });
    // Create default fallback settings if missing
    if (!settings) {
        settings = await prisma_1.default.schoolSetting.create({
            data: { schoolId }
        });
    }
    const gateMinPaid = settings.gateMinPaidAmount;
    const gateMinPercent = settings.gateMinPaidPercent;
    const gateType = settings.gateRequiredType || 'none';
    let allowed = false;
    let reason = '';
    if (gateType === 'none' || balance <= 0) {
        allowed = true;
        reason = 'Allowed: School has no gate entry fee requirements, or balance is fully settled.';
    }
    else if (gateType === 'amount') {
        if (totalPaid >= gateMinPaid) {
            allowed = true;
            reason = `Allowed: Total fees paid ($${totalPaid.toFixed(2)}) meets/exceeds the required gate figure ($${gateMinPaid.toFixed(2)}).`;
        }
        else {
            reason = `Denied: Total fees paid ($${totalPaid.toFixed(2)}) is below the required gate figure ($${gateMinPaid.toFixed(2)}).`;
        }
    }
    else if (gateType === 'percent') {
        const paidPercent = totalFees > 0 ? (totalPaid / totalFees) * 100 : 100;
        if (paidPercent >= gateMinPercent) {
            allowed = true;
            reason = `Allowed: Fees paid (${paidPercent.toFixed(1)}%) meets/exceeds the required gate percentage (${gateMinPercent}%).`;
        }
        else {
            reason = `Denied: Fees paid (${paidPercent.toFixed(1)}%) is below the required gate percentage (${gateMinPercent}%).`;
        }
    }
    // If not allowed, check for ACTIVE payment plans
    if (!allowed) {
        const activePlans = await prisma_1.default.paymentPlan.findMany({
            where: {
                studentId: student.id,
                status: { in: ['ACTIVE', 'DEFAULTED'] }
            },
            orderBy: { createdAt: 'desc' },
            include: { installments: { orderBy: { dueDate: 'asc' } } }
        });
        if (activePlans.length > 0) {
            const latestPlan = activePlans[0];
            if (latestPlan.status === 'DEFAULTED') {
                allowed = false;
                reason = `Denied: Overdue payment plan.`;
            }
            else {
                allowed = true;
                reason = `Allowed: Covered by active payment plan.`;
            }
        }
    }
    return {
        allowed,
        reason,
        student,
        totalFees,
        totalPaid,
        balance,
        gateMinPaid,
        gateMinPercent,
        gateType
    };
}
// Get gate check status for a student QR scan
router.get('/gate-check', auth_1.requireAuth, async (req, res) => {
    try {
        const { qrData } = req.query;
        if (!qrData) {
            return res.status(400).json({ error: 'qrData is required' });
        }
        const check = await runGateCheck(qrData, req.user.schoolId);
        res.json(check);
    }
    catch (error) {
        console.error('Error running gate check:', error);
        res.status(500).json({ error: "We couldn't verify the student's fee status right now. Please check your connection and try scanning the QR code again." });
    }
});
// Mark student attendance via QR code (with gate check enforcement)
router.post('/qr', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { qrData, date, forceAllow } = req.body;
        if (!qrData) {
            return res.status(400).json({ error: 'QR data is missing' });
        }
        const schoolId = req.user.schoolId;
        const gateCheck = await runGateCheck(qrData, schoolId);
        if (!gateCheck.allowed && !forceAllow) {
            return res.status(403).json({
                error: gateCheck.reason,
                gateDenied: true,
                gateCheck
            });
        }
        const student = gateCheck.student;
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const queryDate = date ? new Date(date) : new Date();
        const existing = await prisma_1.default.attendance.findFirst({
            where: {
                schoolId,
                studentId: student.id,
                date: (0, date_fns_1.startOfDay)(queryDate),
                classId: null
            }
        });
        let attendance;
        if (existing) {
            attendance = await prisma_1.default.attendance.update({
                where: { id: existing.id },
                data: {
                    status: 'present',
                    teacherId: req.user.staffId || 'admin',
                    scanMethod: 'QR Code'
                }
            });
        }
        else {
            attendance = await prisma_1.default.attendance.create({
                data: {
                    schoolId,
                    studentId: student.id,
                    date: (0, date_fns_1.startOfDay)(queryDate),
                    status: 'present',
                    teacherId: req.user.staffId || 'admin',
                    classId: null,
                    scanMethod: 'QR Code'
                }
            });
        }
        res.json({ success: true, attendance, student, gateCheck });
    }
    catch (error) {
        console.error('Error marking QR attendance:', error);
        res.status(500).json({ error: 'Failed to mark QR attendance' });
    }
});
// GET student clock-in/out image logs from storage
router.get('/student-clock-ins', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const schoolCode = req.user.schoolCode || 'global';
        // Check permission (TEACHER/LIBRARIAN/HOD or ADMIN roles)
        const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR', 'TEACHER', 'LIBRARIAN'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        // YYYY-MM
        const yearMonth = `${queryDate.getFullYear()}-${String(queryDate.getMonth() + 1).padStart(2, '0')}`;
        // DD
        const day = String(queryDate.getDate()).padStart(2, '0');
        // Build directory path: storage/[schoolCode]/attendance/YYYY-MM/DD/
        const storageDir = path_1.default.join(__dirname, '../../storage', schoolCode, 'attendance', yearMonth, day);
        const logs = [];
        if (fs_1.default.existsSync(storageDir)) {
            const files = fs_1.default.readdirSync(storageDir);
            // Check headed departments for HOD
            const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR'].includes(req.user.role);
            let headedDeptIds = [];
            if (!isAdmin) {
                const headedDepts = await prisma_1.default.department.findMany({
                    where: { schoolId, headId: req.user.id }
                });
                if (headedDepts.length === 0) {
                    // If they are not an HOD (and not admin), they can see no students
                    return res.json([]);
                }
                headedDeptIds = headedDepts.map(d => d.id);
            }
            for (const file of files) {
                const match = file.match(/^(.*)_(in|out)(?:\..+)?$/i);
                if (match) {
                    const studentIdentifier = match[1];
                    const direction = match[2].toLowerCase(); // 'in' or 'out'
                    // Get Student Details
                    const student = await prisma_1.default.student.findFirst({
                        where: {
                            schoolId,
                            OR: [
                                { id: studentIdentifier },
                                { studentId: studentIdentifier }
                            ]
                        },
                        include: {
                            class: true,
                            user: {
                                select: {
                                    id: true,
                                    departmentId: true,
                                    dept: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                    if (!student)
                        continue;
                    // HOD partitioning: restrict to department
                    if (!isAdmin) {
                        if (!student.user?.departmentId || !headedDeptIds.includes(student.user.departmentId)) {
                            continue; // Skip student not in headed department
                        }
                    }
                    const stat = fs_1.default.statSync(path_1.default.join(storageDir, file));
                    logs.push({
                        id: `${student.id}_${direction}`,
                        student: {
                            id: student.id,
                            studentId: student.studentId,
                            name: student.name,
                            class: student.class?.name || 'Unassigned',
                            department: student.user?.dept?.name || 'N/A'
                        },
                        direction: direction === 'in' ? 'Clock In' : 'Clock Out',
                        time: stat.mtime,
                        image: `/api/storage/media/${schoolCode}/attendance/${yearMonth}/${day}/${file}`
                    });
                }
            }
        }
        // Sort by time descending
        logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching student clock-in logs:', error);
        res.status(500).json({ error: 'Failed to fetch student clock-in logs' });
    }
});
// --- Phase 1: Attendance & Roll Call (Register, QR, Period) ---
// 1. Get Roll Call
router.get('/roll-call', auth_1.requireAuth, async (req, res) => {
    const { classId, date, session } = req.query;
    const schoolId = req.user?.schoolId;
    if (!schoolId || !classId || !date || !session) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    try {
        const register = await prisma_1.default.attendanceRegister.findUnique({
            where: {
                schoolId_classId_date_session: {
                    schoolId,
                    classId: String(classId),
                    date: new Date(String(date)),
                    session: String(session),
                },
            },
            include: { records: true },
        });
        res.json(register || { records: [] });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch roll call' });
    }
});
// 2. Submit Roll Call
router.post('/roll-call', auth_1.requireAuth, async (req, res) => {
    const { classId, date, session, records } = req.body;
    const schoolId = req.user?.schoolId;
    if (!schoolId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const parsedDate = new Date(date);
        const register = await prisma_1.default.attendanceRegister.upsert({
            where: {
                schoolId_classId_date_session: {
                    schoolId,
                    classId,
                    date: parsedDate,
                    session,
                },
            },
            update: { submitted: true },
            create: {
                schoolId,
                classId,
                date: parsedDate,
                session,
                submitted: true,
            },
        });
        for (const record of records) {
            await prisma_1.default.attendanceRecord.upsert({
                where: {
                    registerId_studentId: {
                        registerId: register.id,
                        studentId: record.studentId,
                    },
                },
                update: {
                    status: record.status,
                    notes: record.notes,
                },
                create: {
                    registerId: register.id,
                    studentId: record.studentId,
                    status: record.status,
                    notes: record.notes,
                },
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit roll call' });
    }
});
// 3. Generate QR Code Session
router.post('/qr/generate', auth_1.requireAuth, async (req, res) => {
    const { classId, periodId, expiresMinutes } = req.body;
    const teacherId = req.user?.id;
    if (!teacherId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + (expiresMinutes || 10));
        const session = await prisma_1.default.qrCodeSession.create({
            data: {
                teacherId,
                classId,
                periodId,
                date: new Date(),
                code,
                expiresAt,
            },
        });
        res.json({ code: session.code, expiresAt: session.expiresAt });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});
// 4. Scan QR Code
router.post('/qr/scan', auth_1.requireAuth, async (req, res) => {
    const { code, studentId, locationData } = req.body;
    try {
        const session = await prisma_1.default.qrCodeSession.findUnique({ where: { code } });
        if (!session)
            return res.status(404).json({ error: 'Invalid QR code' });
        if (new Date() > session.expiresAt)
            return res.status(400).json({ error: 'QR code expired' });
        if (session.periodId) {
            await prisma_1.default.periodAttendance.upsert({
                where: {
                    studentId_timetablePeriodId_date: {
                        studentId,
                        timetablePeriodId: session.periodId,
                        date: session.date,
                    }
                },
                update: { status: 'Present', scannedAt: new Date() },
                create: {
                    studentId,
                    timetablePeriodId: session.periodId,
                    date: session.date,
                    status: 'Present',
                    scannedAt: new Date(),
                }
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record scan' });
    }
});
exports.default = router;
//# sourceMappingURL=attendance.js.map