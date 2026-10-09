"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStaffPunches = processStaffPunches;
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
// Get the logged in staff member's attendance
router.get('/my', auth_1.requireAuth, async (req, res) => {
    try {
        const attendances = await prisma_1.default.staffAttendance.findMany({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id
            },
            orderBy: { date: 'desc' },
            take: 30 // last 30 days
        });
        const logs = attendances.map(record => {
            let hoursPresent = null;
            let schoolHoursPresent = null;
            if (record.timeIn) {
                if (record.timeOut) {
                    const diffMs = record.timeOut.getTime() - record.timeIn.getTime();
                    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
                    hoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                }
                const schoolStart = new Date(record.date);
                schoolStart.setHours(8, 0, 0, 0);
                const schoolEnd = new Date(record.date);
                schoolEnd.setHours(16, 0, 0, 0);
                const effectiveIn = new Date(Math.max(record.timeIn.getTime(), schoolStart.getTime()));
                const effectiveOut = record.timeOut
                    ? new Date(Math.min(record.timeOut.getTime(), schoolEnd.getTime()))
                    : new Date(Math.min(new Date().getTime(), schoolEnd.getTime()));
                if (effectiveIn < effectiveOut) {
                    const diffMs = effectiveOut.getTime() - effectiveIn.getTime();
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    schoolHoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                }
                else {
                    schoolHoursPresent = '0h 0m';
                }
            }
            return {
                ...record,
                hoursPresent,
                schoolHoursPresent
            };
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching staff attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});
// Check today's status
router.get('/today', auth_1.requireAuth, async (req, res) => {
    try {
        const today = new Date();
        const attendance = await prisma_1.default.staffAttendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: {
                    gte: (0, date_fns_1.startOfDay)(today),
                    lte: (0, date_fns_1.endOfDay)(today)
                }
            }
        });
        res.json(attendance);
    }
    catch (error) {
        console.error('Error checking today attendance:', error);
        res.status(500).json({ error: 'Failed to check attendance' });
    }
});
// Clock In
router.post('/clock-in', auth_1.requireAuth, async (req, res) => {
    try {
        const { image } = req.body;
        const today = new Date();
        // Check if already clocked in today
        const existing = await prisma_1.default.staffAttendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: {
                    gte: (0, date_fns_1.startOfDay)(today),
                    lte: (0, date_fns_1.endOfDay)(today)
                }
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'Already clocked in today' });
        }
        const attendance = await prisma_1.default.staffAttendance.create({
            data: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: (0, date_fns_1.startOfDay)(today),
                timeIn: today,
                clockInImage: image,
                status: 'FULL DAY'
            }
        });
        res.json({ success: true, attendance });
    }
    catch (error) {
        console.error('Error clocking in:', error);
        res.status(500).json({ error: 'Failed to clock in' });
    }
});
// Clock Out
router.post('/clock-out', auth_1.requireAuth, async (req, res) => {
    try {
        const { image } = req.body;
        const today = new Date();
        const existing = await prisma_1.default.staffAttendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: {
                    gte: (0, date_fns_1.startOfDay)(today),
                    lte: (0, date_fns_1.endOfDay)(today)
                }
            }
        });
        if (!existing) {
            return res.status(400).json({ error: 'Have not clocked in today' });
        }
        if (existing.timeOut) {
            return res.status(400).json({ error: 'Already clocked out' });
        }
        const attendance = await prisma_1.default.staffAttendance.update({
            where: { id: existing.id },
            data: {
                timeOut: today,
                clockOutImage: image
            }
        });
        res.json({ success: true, attendance });
    }
    catch (error) {
        console.error('Error clocking out:', error);
        res.status(500).json({ error: 'Failed to clock out' });
    }
});
// GET all staff clock-ins for the school filterable by date
router.get('/all', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        // Check if the user is a Head of Department
        const headedDepts = await prisma_1.default.department.findMany({
            where: {
                schoolId,
                headId: req.user.id
            },
            select: {
                id: true
            }
        });
        const headedDeptIds = headedDepts.map(d => d.id);
        const isHod = headedDeptIds.length > 0;
        const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR'].includes(userRole);
        // Check permission
        if (!isAdmin && !isHod) {
            return res.status(403).json({ error: 'Access denied: HOD or HR permissions required' });
        }
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        // Fetch all active staff users in the school
        const staffUsers = await prisma_1.default.user.findMany({
            where: {
                schoolId,
                role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'CLINIC'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                staffId: true,
                departmentId: true
            }
        });
        // Filter staff list if user is HOD but not Admin
        let filteredStaffUsers = staffUsers;
        if (!isAdmin && isHod) {
            filteredStaffUsers = staffUsers.filter(u => u.id === req.user.id ||
                (u.departmentId && headedDeptIds.includes(u.departmentId)));
        }
        // Fetch actual clock-ins for this date
        const actualAttendances = await prisma_1.default.staffAttendance.findMany({
            where: {
                schoolId,
                date: {
                    gte: (0, date_fns_1.startOfDay)(queryDate),
                    lte: (0, date_fns_1.endOfDay)(queryDate)
                }
            }
        });
        // Merge actual clock-ins with all staff list to report missing clock-ins
        const logs = filteredStaffUsers.map(user => {
            const record = actualAttendances.find(a => a.staffId === user.id);
            let hoursPresent = null;
            let schoolHoursPresent = null;
            if (record?.timeIn) {
                if (record.timeOut) {
                    const diffMs = record.timeOut.getTime() - record.timeIn.getTime();
                    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
                    hoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                }
                // Calculate presence within standard school hours (08:00 - 16:00)
                const schoolStart = new Date(queryDate);
                schoolStart.setHours(8, 0, 0, 0);
                const schoolEnd = new Date(queryDate);
                schoolEnd.setHours(16, 0, 0, 0);
                const effectiveIn = new Date(Math.max(record.timeIn.getTime(), schoolStart.getTime()));
                const effectiveOut = record.timeOut
                    ? new Date(Math.min(record.timeOut.getTime(), schoolEnd.getTime()))
                    : new Date(Math.min(new Date().getTime(), schoolEnd.getTime()));
                if (effectiveIn < effectiveOut) {
                    const diffMs = effectiveOut.getTime() - effectiveIn.getTime();
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    schoolHoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                }
                else {
                    schoolHoursPresent = '0h 0m';
                }
            }
            return {
                id: record?.id || `virtual_${user.id}`,
                date: queryDate,
                timeIn: record?.timeIn || null,
                timeOut: record?.timeOut || null,
                status: record?.status || 'NOT CLOCKED IN',
                clockInImage: record?.clockInImage || null,
                clockOutImage: record?.clockOutImage || null,
                hoursPresent,
                schoolHoursPresent,
                staff: user
            };
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching all staff attendance logs:', error);
        res.status(500).json({ error: 'Failed to fetch attendance logs' });
    }
});
// ==========================================
// PHASE 5: UNIFIED STAFF ATTENDANCE & BIOMETRIC SERVICES
// ==========================================
/**
 * 15-Minute Punch Processor: converts raw biometric punches to daily records.
 * Rules:
 * - first punch = firstIn, last punch = lastOut
 * - calculates totalHours
 * - benchmark arrival: 08:00 AM.
 * - late over 30 minutes is flagged to the HR tardiness log.
 * - absent with no approved leave in /admin/leave is marked absent (UNAUTHORIZED_ABSENCE).
 */
async function processStaffPunches(schoolId, queryDate) {
    const dateStr = queryDate.toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    // 1. Fetch all active staff users in the school
    const staffUsers = await prisma_1.default.user.findMany({
        where: {
            schoolId,
            role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'CLINIC'] }
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            staffId: true,
            departmentId: true
        }
    });
    // 2. Fetch raw punches for the date
    const punches = await prisma_1.default.biometricRawLog.findMany({
        where: {
            schoolId,
            punchTime: { gte: dayStart, lte: dayEnd }
        },
        orderBy: { punchTime: 'asc' }
    });
    // Group punches by staffId
    const punchesByStaff = new Map();
    for (const p of punches) {
        if (!punchesByStaff.has(p.staffId)) {
            punchesByStaff.set(p.staffId, []);
        }
        punchesByStaff.get(p.staffId).push(p);
    }
    // Benchmark time: 08:00 AM UTC on queryDate
    const benchmarkTime = new Date(`${dateStr}T08:00:00.000Z`);
    let processedCount = 0;
    let flaggedTardinessCount = 0;
    let unauthorizedAbsencesCount = 0;
    for (const staff of staffUsers) {
        const staffPunches = punchesByStaff.get(staff.id);
        if (staffPunches && staffPunches.length > 0) {
            const firstIn = staffPunches[0].punchTime;
            const lastOut = staffPunches.length > 1 ? staffPunches[staffPunches.length - 1].punchTime : null;
            let totalHours = 0;
            if (lastOut) {
                const diffMs = lastOut.getTime() - firstIn.getTime();
                totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
            }
            let lateMinutes = 0;
            if (firstIn.getTime() > benchmarkTime.getTime()) {
                lateMinutes = Math.floor((firstIn.getTime() - benchmarkTime.getTime()) / (1000 * 60));
            }
            let status = 'present';
            if (lateMinutes > 0) {
                status = 'late';
            }
            else if (totalHours > 0 && totalHours < 4) {
                status = 'half_day';
            }
            const flaggedTardiness = lateMinutes > 30;
            if (flaggedTardiness) {
                await prisma_1.default.hrTardinessLog.upsert({
                    where: {
                        schoolId_staffId_date: {
                            schoolId,
                            staffId: staff.id,
                            date: dayStart
                        }
                    },
                    update: {
                        lateMinutes,
                        actionStatus: 'FLAGGED',
                        notes: `Clocked in at ${firstIn.toLocaleTimeString()} (${lateMinutes} mins late, exceeding 30-min threshold)`
                    },
                    create: {
                        schoolId,
                        staffId: staff.id,
                        date: dayStart,
                        lateMinutes,
                        actionStatus: 'FLAGGED',
                        notes: `Clocked in at ${firstIn.toLocaleTimeString()} (${lateMinutes} mins late, exceeding 30-min threshold)`
                    }
                });
                flaggedTardinessCount++;
            }
            await prisma_1.default.staffAttendanceDaily.upsert({
                where: {
                    schoolId_staffId_date: {
                        schoolId,
                        staffId: staff.id,
                        date: dayStart
                    }
                },
                update: {
                    firstIn,
                    lastOut,
                    totalHours,
                    status,
                    lateMinutes,
                    flaggedTardiness,
                    leaveCrossCheck: 'PRESENT'
                },
                create: {
                    schoolId,
                    staffId: staff.id,
                    date: dayStart,
                    firstIn,
                    lastOut,
                    totalHours,
                    status,
                    lateMinutes,
                    flaggedTardiness,
                    leaveCrossCheck: 'PRESENT'
                }
            });
            processedCount++;
        }
        else {
            // Check if on approved leave
            const approvedLeave = await prisma_1.default.staffLeave.findFirst({
                where: {
                    schoolId,
                    userId: staff.id,
                    status: 'approved',
                    startDate: { lte: dayEnd },
                    endDate: { gte: dayStart }
                }
            });
            const leaveCrossCheck = approvedLeave ? 'APPROVED_LEAVE' : 'UNAUTHORIZED_ABSENCE';
            if (!approvedLeave)
                unauthorizedAbsencesCount++;
            await prisma_1.default.staffAttendanceDaily.upsert({
                where: {
                    schoolId_staffId_date: {
                        schoolId,
                        staffId: staff.id,
                        date: dayStart
                    }
                },
                update: {
                    firstIn: null,
                    lastOut: null,
                    totalHours: 0,
                    status: 'absent',
                    lateMinutes: 0,
                    flaggedTardiness: false,
                    leaveCrossCheck
                },
                create: {
                    schoolId,
                    staffId: staff.id,
                    date: dayStart,
                    firstIn: null,
                    lastOut: null,
                    totalHours: 0,
                    status: 'absent',
                    lateMinutes: 0,
                    flaggedTardiness: false,
                    leaveCrossCheck
                }
            });
        }
    }
    // Mark processed
    if (punches.length > 0) {
        await prisma_1.default.biometricRawLog.updateMany({
            where: {
                schoolId,
                punchTime: { gte: dayStart, lte: dayEnd }
            },
            data: { processed: true }
        });
    }
    return { processedCount, flaggedTardinessCount, unauthorizedAbsencesCount };
}
// Background punch converter: runs every 15 minutes
setInterval(async () => {
    try {
        const schools = await prisma_1.default.school.findMany({ select: { id: true } });
        const today = new Date();
        for (const sc of schools) {
            await processStaffPunches(sc.id, today);
        }
    }
    catch (err) {
        console.error('Background punch processor error:', err);
    }
}, 15 * 60 * 1000);
// Endpoint to trigger punch processing on demand
router.post('/process-punches', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { date } = req.body;
        const queryDate = date ? new Date(date) : new Date();
        const result = await processStaffPunches(schoolId, queryDate);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Error processing staff punches:', error);
        res.status(500).json({ error: 'Failed to process staff punches' });
    }
});
// Endpoint to ingest raw biometric punches
router.post('/raw-punches', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { punches, deviceId, staffId, punchTime, punchType } = req.body;
        const punchList = [];
        if (Array.isArray(punches)) {
            punchList.push(...punches);
        }
        else if (staffId) {
            punchList.push({
                deviceId: deviceId || 'DEVICE_DEFAULT',
                staffId,
                punchTime: punchTime ? new Date(punchTime) : new Date(),
                punchType: punchType || 'RAW'
            });
        }
        else {
            return res.status(400).json({ error: 'punches array or staffId is required' });
        }
        const created = await Promise.all(punchList.map(p => prisma_1.default.biometricRawLog.create({
            data: {
                schoolId,
                deviceId: p.deviceId || 'DEVICE_DEFAULT',
                staffId: p.staffId,
                punchTime: p.punchTime ? new Date(p.punchTime) : new Date(),
                punchType: p.punchType || 'RAW',
                processed: false
            }
        })));
        // Process immediately for the date of the punches
        const firstDate = punchList[0]?.punchTime ? new Date(punchList[0].punchTime) : new Date();
        const procResult = await processStaffPunches(schoolId, firstDate);
        res.json({
            success: true,
            ingested: created.length,
            ...procResult
        });
    }
    catch (error) {
        console.error('Error ingesting raw punches:', error);
        res.status(500).json({ error: 'Failed to ingest biometric punches' });
    }
});
// GET Raw Device Logs
router.get('/raw-logs', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { date, deviceId, staffId } = req.query;
        const where = { schoolId };
        if (date) {
            const qDate = new Date(date);
            where.punchTime = {
                gte: (0, date_fns_1.startOfDay)(qDate),
                lte: (0, date_fns_1.endOfDay)(qDate)
            };
        }
        if (deviceId)
            where.deviceId = deviceId;
        if (staffId)
            where.staffId = staffId;
        const logs = await prisma_1.default.biometricRawLog.findMany({
            where,
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        staffId: true
                    }
                }
            },
            orderBy: { punchTime: 'desc' },
            take: 200
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching raw device logs:', error);
        res.status(500).json({ error: 'Failed to fetch raw device logs' });
    }
});
// GET Daily Summary (StaffAttendanceDaily)
router.get('/daily-summary', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        const dateStr = queryDate.toISOString().slice(0, 10);
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        // Check if daily records exist, if not process first
        let dailyRecords = await prisma_1.default.staffAttendanceDaily.findMany({
            where: {
                schoolId,
                date: dayStart
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        staffId: true
                    }
                }
            },
            orderBy: { staff: { name: 'asc' } }
        });
        if (dailyRecords.length === 0) {
            await processStaffPunches(schoolId, queryDate);
            dailyRecords = await prisma_1.default.staffAttendanceDaily.findMany({
                where: {
                    schoolId,
                    date: dayStart
                },
                include: {
                    staff: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            staffId: true
                        }
                    }
                },
                orderBy: { staff: { name: 'asc' } }
            });
        }
        const totalStaff = dailyRecords.length;
        const presentCount = dailyRecords.filter(r => ['present', 'late', 'half_day'].includes(r.status)).length;
        const absentCount = dailyRecords.filter(r => r.status === 'absent').length;
        const lateCount = dailyRecords.filter(r => r.lateMinutes > 0).length;
        res.json({
            records: dailyRecords,
            stats: {
                totalStaff,
                presentCount,
                absentCount,
                lateCount,
                presenceRate: totalStaff > 0 ? parseFloat(((presentCount / totalStaff) * 100).toFixed(1)) : 100.0
            }
        });
    }
    catch (error) {
        console.error('Error fetching daily staff summary:', error);
        res.status(500).json({ error: 'Failed to load staff attendance summary' });
    }
});
// GET Late Comers & Tardiness
router.get('/late-comers', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        const dateStr = queryDate.toISOString().slice(0, 10);
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        const lateRecords = await prisma_1.default.staffAttendanceDaily.findMany({
            where: {
                schoolId,
                date: dayStart,
                lateMinutes: { gt: 0 }
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        staffId: true
                    }
                }
            },
            orderBy: { lateMinutes: 'desc' }
        });
        const tardinessLogs = await prisma_1.default.hrTardinessLog.findMany({
            where: {
                schoolId,
                date: dayStart
            }
        });
        res.json({
            lateComers: lateRecords.map(r => ({
                ...r,
                hrTardinessLog: tardinessLogs.find(t => t.staffId === r.staffId) || null
            })),
            totalLate: lateRecords.length,
            flaggedOver30Mins: lateRecords.filter(r => r.lateMinutes > 30).length
        });
    }
    catch (error) {
        console.error('Error fetching late comers:', error);
        res.status(500).json({ error: 'Failed to fetch late comers' });
    }
});
// GET Leave Cross-Check
router.get('/leave-cross-check', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        const dateStr = queryDate.toISOString().slice(0, 10);
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
        // Get staff absent from daily records
        const absentStaff = await prisma_1.default.staffAttendanceDaily.findMany({
            where: {
                schoolId,
                date: dayStart,
                status: 'absent'
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        staffId: true
                    }
                }
            }
        });
        // Fetch approved leaves on that date
        const approvedLeaves = await prisma_1.default.staffLeave.findMany({
            where: {
                schoolId,
                status: 'approved',
                startDate: { lte: dayEnd },
                endDate: { gte: dayStart }
            }
        });
        const leaveByStaff = new Map();
        for (const l of approvedLeaves) {
            leaveByStaff.set(l.userId, l);
        }
        const items = absentStaff.map(ab => ({
            staff: ab.staff,
            status: ab.status,
            leaveCrossCheck: ab.leaveCrossCheck,
            approvedLeave: leaveByStaff.get(ab.staffId) || null
        }));
        res.json({
            absentStaff: items,
            totalAbsent: items.length,
            approvedLeaveCount: items.filter(i => i.leaveCrossCheck === 'APPROVED_LEAVE').length,
            unauthorizedAbsenceCount: items.filter(i => i.leaveCrossCheck === 'UNAUTHORIZED_ABSENCE').length
        });
    }
    catch (error) {
        console.error('Error fetching leave cross-check:', error);
        res.status(500).json({ error: 'Failed to cross-check staff leave' });
    }
});
exports.default = router;
//# sourceMappingURL=staff-attendance.js.map