import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { startOfDay, endOfDay } from 'date-fns';
import fs from 'fs';
import path from 'path';
const router = Router();
// Get daily attendance for a class
router.get('/', requireAuth, async (req, res) => {
    try {
        const { classId, date } = req.query;
        if (!classId || !date) {
            return res.status(400).json({ error: 'classId and date are required' });
        }
        const queryDate = new Date(date);
        const attendances = await prisma.attendance.findMany({
            where: {
                schoolId: req.user.schoolId,
                student: {
                    classId: classId
                },
                date: {
                    gte: startOfDay(queryDate),
                    lte: endOfDay(queryDate)
                }
            },
            include: {
                student: true
            }
        });
        res.json(attendances);
    }
    catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});
// Mark student attendance (Manual)
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { studentId, date, status, note } = req.body;
        if (!studentId || !date || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const queryDate = new Date(date);
        // Upsert the attendance record
        const attendance = await prisma.attendance.upsert({
            where: {
                schoolId_studentId_date: {
                    schoolId: req.user.schoolId,
                    studentId,
                    date: startOfDay(queryDate)
                }
            },
            update: {
                status,
                note,
                teacherId: req.user.staffId || 'admin',
                scanMethod: 'Manual'
            },
            create: {
                schoolId: req.user.schoolId,
                studentId,
                date: startOfDay(queryDate),
                status,
                note,
                teacherId: req.user.staffId || 'admin',
                scanMethod: 'Manual'
            }
        });
        res.json({ success: true, attendance });
    }
    catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});
// Helper to run a gate check on a student
async function runGateCheck(studentId, schoolId) {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { class: true }
    });
    if (!student || student.schoolId !== schoolId) {
        return { allowed: false, reason: 'Student not found or unauthorized' };
    }
    // Calculate fee balance
    const fees = await prisma.fee.findMany({
        where: { studentId: student.id }
    });
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
    const balance = totalFees - totalPaid;
    // Load school gate settings
    let settings = await prisma.schoolSetting.findUnique({
        where: { schoolId }
    });
    // Create default fallback settings if missing
    if (!settings) {
        settings = await prisma.schoolSetting.create({
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
    // If not allowed, check for APPROVED payment plans
    if (!allowed) {
        const activePlans = await prisma.paymentPlan.findMany({
            where: {
                studentId: student.id,
                status: { in: ['APPROVED', 'OVERDUE'] }
            },
            orderBy: { dueDate: 'desc' }
        });
        if (activePlans.length > 0) {
            const latestPlan = activePlans[0];
            const today = new Date();
            if (today > new Date(latestPlan.dueDate) && balance > 0) {
                // Overdue payment plan! Flag it as OVERDUE
                if (latestPlan.status !== 'OVERDUE') {
                    await prisma.paymentPlan.update({
                        where: { id: latestPlan.id },
                        data: { status: 'OVERDUE' }
                    });
                }
                allowed = false;
                reason = `Denied: Overdue payment plan. Promised payment date was ${new Date(latestPlan.dueDate).toLocaleDateString()}.`;
            }
            else {
                allowed = true;
                reason = `Allowed: Covered by active/approved payment plan (due date: ${new Date(latestPlan.dueDate).toLocaleDateString()}).`;
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
router.get('/gate-check', requireAuth, async (req, res) => {
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
        res.status(500).json({ error: 'Failed to run gate check' });
    }
});
// Mark student attendance via QR code (with gate check enforcement)
router.post('/qr', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'ANCILLARY'), async (req, res) => {
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
        const attendance = await prisma.attendance.upsert({
            where: {
                schoolId_studentId_date: {
                    schoolId,
                    studentId: student.id,
                    date: startOfDay(queryDate)
                }
            },
            update: {
                status: 'present',
                teacherId: req.user.staffId || 'admin',
                scanMethod: 'QR Code'
            },
            create: {
                schoolId,
                studentId: student.id,
                date: startOfDay(queryDate),
                status: 'present',
                teacherId: req.user.staffId || 'admin',
                scanMethod: 'QR Code'
            }
        });
        res.json({ success: true, attendance, student, gateCheck });
    }
    catch (error) {
        console.error('Error marking QR attendance:', error);
        res.status(500).json({ error: 'Failed to mark QR attendance' });
    }
});
// GET student clock-in/out image logs from storage
router.get('/student-clock-ins', requireAuth, async (req, res) => {
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
        const storageDir = path.join(__dirname, '../../storage', schoolCode, 'attendance', yearMonth, day);
        const logs = [];
        if (fs.existsSync(storageDir)) {
            const files = fs.readdirSync(storageDir);
            // Check headed departments for HOD
            const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR'].includes(req.user.role);
            let headedDeptIds = [];
            if (!isAdmin) {
                const headedDepts = await prisma.department.findMany({
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
                    const student = await prisma.student.findFirst({
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
                    const stat = fs.statSync(path.join(storageDir, file));
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
export default router;
//# sourceMappingURL=attendance.js.map