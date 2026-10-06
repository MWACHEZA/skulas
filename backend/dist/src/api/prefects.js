"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const moduleAccess_1 = require("../middleware/moduleAccess");
const router = (0, express_1.Router)();
// Gating middleware: require authentication, then module access
router.use(auth_1.requireAuth);
router.use((0, moduleAccess_1.requireModuleAccess)('prefects'));
// Duty Roster
router.get('/duty', async (req, res) => {
    const { schoolId } = req.user;
    const duties = await prisma_1.default.prefectDuty.findMany({ where: { schoolId } });
    res.json(duties);
});
router.post('/duty', async (req, res) => {
    const { schoolId } = req.user;
    const { studentId, date, role } = req.body;
    const duty = await prisma_1.default.prefectDuty.create({
        data: { studentId, date: new Date(date), role, schoolId }
    });
    res.json(duty);
});
// Meeting Minutes
router.get('/meetings', async (req, res) => {
    const { schoolId } = req.user;
    const meetings = await prisma_1.default.prefectMeeting.findMany({ where: { schoolId } });
    res.json(meetings);
});
router.post('/meetings', async (req, res) => {
    const { schoolId } = req.user;
    const { date, chairId, agenda, minutes } = req.body;
    const meeting = await prisma_1.default.prefectMeeting.create({
        data: { date: new Date(date), chairId, agenda, minutes, schoolId }
    });
    res.json(meeting);
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
    const { schoolId, id: reporterId } = req.user;
    const { studentId, date, offenceType, description, severity } = req.body;
    const record = await prisma_1.default.disciplineRecord.create({
        data: {
            studentId,
            reporterId,
            date: new Date(date),
            offenceType,
            description,
            severity,
            schoolId
        }
    });
    res.json(record);
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