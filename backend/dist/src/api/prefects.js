"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const moduleAccess_1 = require("../middleware/moduleAccess");
const discipline_service_1 = require("../services/discipline.service");
const router = (0, express_1.Router)();
// Gating middleware: require authentication, then module access
router.use(auth_1.requireAuth);
router.use((0, moduleAccess_1.requireModuleAccess)('prefects'));
// Duty Roster Handler (supports both /duty and /duties)
const handleGetDuties = async (req, res) => {
    try {
        const { schoolId } = req.user;
        const duties = await prisma_1.default.prefectDuty.findMany({
            where: { schoolId },
            orderBy: { date: 'asc' }
        });
        const studentIds = duties.map(d => d.studentId).filter(Boolean);
        const students = studentIds.length > 0
            ? await prisma_1.default.student.findMany({
                where: { id: { in: studentIds } },
                select: { id: true, name: true }
            })
            : [];
        const sMap = new Map(students.map(s => [s.id, s.name]));
        const formatted = duties.map(d => {
            const parts = (d.role || '').split('::');
            const zone = parts[0] || 'Main Gate';
            const timeSlot = parts[1] || '07:15 - 07:45 (Morning Assembly)';
            const dayName = d.date ? new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' }) : 'Monday';
            return {
                id: d.id,
                studentId: d.studentId,
                prefectName: sMap.get(d.studentId) || d.studentId || 'Prefect',
                zone,
                timeSlot,
                day: dayName,
                date: d.date,
                role: d.role,
                status: d.status
            };
        });
        res.json(formatted);
    }
    catch (error) {
        console.error('Failed to get prefect duties:', error);
        res.json([]);
    }
};
const handlePostDuty = async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { studentId, prefectName, date, role, zone, timeSlot, day } = req.body;
        const assignedRole = zone ? (timeSlot ? `${zone}::${timeSlot}` : zone) : (role || 'Main Gate');
        const assignedStudent = prefectName || studentId || 'Prefect';
        let dutyDate = date ? new Date(date) : new Date();
        if (!date && day) {
            // Find next matching weekday
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const targetDayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === String(day).toLowerCase());
            if (targetDayIndex !== -1) {
                const today = new Date();
                const currentDayIndex = today.getDay();
                const distance = (targetDayIndex + 7 - currentDayIndex) % 7;
                dutyDate = new Date(today);
                dutyDate.setDate(today.getDate() + (distance === 0 ? 7 : distance));
            }
        }
        const duty = await prisma_1.default.prefectDuty.create({
            data: {
                studentId: assignedStudent,
                date: dutyDate,
                role: assignedRole,
                schoolId
            }
        });
        res.json({
            id: duty.id,
            studentId: duty.studentId,
            prefectName: assignedStudent,
            zone: zone || assignedRole.split('::')[0] || 'Main Gate',
            timeSlot: timeSlot || (assignedRole.includes('::') ? assignedRole.split('::')[1] : '07:15 - 07:45 (Morning Assembly)'),
            day: day || dutyDate.toLocaleDateString('en-US', { weekday: 'long' }),
            date: duty.date,
            role: duty.role,
            status: duty.status
        });
    }
    catch (error) {
        console.error('Failed to create duty:', error);
        res.status(500).json({ error: 'Failed to create prefect duty' });
    }
};
router.get('/duty', handleGetDuties);
router.get('/duties', handleGetDuties);
router.post('/duty', handlePostDuty);
router.post('/duties', handlePostDuty);
// Meeting Minutes
router.get('/meetings', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const meetings = await prisma_1.default.prefectMeeting.findMany({
            where: { schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(meetings.map(m => ({
            id: m.id,
            title: m.agenda,
            agenda: m.agenda,
            date: m.date,
            chair: m.chairId,
            chairId: m.chairId,
            recordsText: m.minutes || '',
            minutes: m.minutes,
            status: m.status
        })));
    }
    catch (error) {
        console.error('Failed to get meetings:', error);
        res.json([]);
    }
});
router.post('/meetings', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { date, chairId, agenda, minutes, title, chair, recordsText } = req.body;
        const meeting = await prisma_1.default.prefectMeeting.create({
            data: {
                date: date ? new Date(date) : new Date(),
                chairId: chair || chairId || 'Council Chair',
                agenda: title || agenda || 'General SRC / Prefects Meeting',
                minutes: recordsText || minutes || '',
                schoolId
            }
        });
        res.json({
            id: meeting.id,
            title: meeting.agenda,
            agenda: meeting.agenda,
            date: meeting.date,
            chair: meeting.chairId,
            recordsText: meeting.minutes,
            status: meeting.status
        });
    }
    catch (error) {
        console.error('Failed to create meeting:', error);
        res.status(500).json({ error: 'Failed to save meeting minutes' });
    }
});
// Conduct Reports (DisciplineRecord)
router.get('/conduct', async (req, res) => {
    const { schoolId } = req.user;
    const reports = await prisma_1.default.disciplineRecord.findMany({
        where: { schoolId },
        orderBy: { date: 'desc' }
    });
    const studentIds = [...new Set(reports.map(r => r.studentId))];
    const reporterIds = [...new Set(reports.map(r => r.reporterId))];
    const [students, reporters] = await Promise.all([
        prisma_1.default.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, name: true, studentId: true, class: { select: { name: true } } }
        }),
        prisma_1.default.user.findMany({
            where: { id: { in: reporterIds } },
            select: { id: true, name: true, role: true }
        })
    ]);
    const sMap = new Map(students.map(s => [s.id, s]));
    const rMap = new Map(reporters.map(r => [r.id, r]));
    res.json(reports.map(r => ({
        ...r,
        student: sMap.get(r.studentId) || null,
        reporter: rMap.get(r.reporterId) || null
    })));
});
router.get('/reports', async (req, res) => {
    try {
        const { schoolId } = req.user;
        // Fetch from PrefectReport model if available
        let customReports = [];
        try {
            customReports = await prisma_1.default.prefectReport.findMany({
                where: { schoolId },
                orderBy: { createdAt: 'desc' },
                include: { reportedBy: { select: { name: true, role: true } } }
            });
        }
        catch {
            customReports = [];
        }
        const disciplineRecords = await prisma_1.default.disciplineRecord.findMany({
            where: { schoolId },
            orderBy: { date: 'desc' }
        });
        const studentIds = [...new Set(disciplineRecords.map(r => r.studentId))];
        const reporterIds = [...new Set(disciplineRecords.map(r => r.reporterId))];
        const [students, reporters] = await Promise.all([
            prisma_1.default.student.findMany({
                where: { id: { in: studentIds } },
                select: { id: true, name: true, studentId: true, class: { select: { name: true } } }
            }),
            prisma_1.default.user.findMany({
                where: { id: { in: reporterIds } },
                select: { id: true, name: true, role: true }
            })
        ]);
        const sMap = new Map(students.map(s => [s.id, s]));
        const rMap = new Map(reporters.map(r => [r.id, r]));
        const mappedDiscipline = disciplineRecords.map(r => ({
            id: r.id,
            studentName: sMap.get(r.studentId)?.name || r.studentId,
            category: r.offenceType || 'General Infraction',
            narrative: r.description || '',
            hasPunishment: !!r.actionTaken,
            punishment: r.actionTaken || null,
            punishmentLocation: 'Campus Grounds',
            punishmentStatus: r.actionTaken ? 'RECORDED' : 'PENDING',
            createdAt: r.date,
            reportedBy: rMap.get(r.reporterId) || { name: 'Staff Member', role: 'STAFF' }
        }));
        res.json([...customReports, ...mappedDiscipline]);
    }
    catch (error) {
        console.error('Failed to get reports:', error);
        res.json([]);
    }
});
router.post('/reports', async (req, res) => {
    try {
        const { schoolId, id: reporterId } = req.user;
        const { studentName, category, narrative, hasPunishment = false, punishment = null, punishmentLocation = 'Campus Grounds' } = req.body;
        const report = await prisma_1.default.prefectReport.create({
            data: {
                studentName: studentName || 'Student',
                category: category || 'General Infraction',
                narrative: narrative || '',
                hasPunishment: !!hasPunishment,
                punishment: punishment || null,
                punishmentLocation: punishmentLocation || null,
                punishmentStatus: hasPunishment ? 'PENDING' : 'RECORDED',
                reportedById: reporterId,
                schoolId
            },
            include: {
                reportedBy: { select: { name: true, role: true } }
            }
        });
        res.json(report);
    }
    catch (error) {
        console.error('Failed to create prefect report:', error);
        res.status(500).json({ error: error.message || 'Failed to submit report' });
    }
});
router.patch('/reports/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, resolution } = req.body;
    try {
        const updated = await prisma_1.default.disciplineRecord.update({
            where: { id: id },
            data: {
                actionTaken: resolution || status,
                updatedAt: new Date()
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update report status' });
    }
});
router.post('/conduct', async (req, res) => {
    try {
        const { schoolId, id: reporterId, role } = req.user;
        const { studentId, date, offenceType, description, severity, type = 'DEMERIT', points = 1, actionTaken } = req.body;
        const record = await discipline_service_1.DisciplineService.createRecord({
            schoolId,
            studentId,
            reporterId,
            reporterRole: role || 'PREFECT',
            type,
            points: Number(points) || 1,
            date: date ? new Date(date) : new Date(),
            offenceType,
            description,
            severity,
            actionTaken
        });
        res.json(record);
    }
    catch (error) {
        console.error('Failed to log prefect conduct report:', error);
        res.status(400).json({ error: error.message || 'Failed to record conduct' });
    }
});
// Prefects List
router.get('/', async (req, res) => {
    const { schoolId } = req.user;
    const prefects = await prisma_1.default.leadershipAssignment.findMany({
        where: { schoolId, isActive: true },
        include: { student: true }
    });
    res.json(prefects);
});
exports.default = router;
//# sourceMappingURL=prefects.js.map