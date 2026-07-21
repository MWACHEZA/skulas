"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
// Helper to check user scope for fetching records
async function getAccessibleUserIds(req) {
    const user = req.user;
    if (['SCHOOL_ADMIN', 'SUPER_ADMIN', 'CLINIC'].includes(user.role)) {
        // Clinic staff and admins can access all records in the school
        return null;
    }
    if (user.role === 'PARENT') {
        // Parents can access their own and their linked children's records
        const linked = await prisma_1.default.parentStudent.findMany({
            where: { parent: { userId: user.id } },
            select: { student: { select: { userId: true } } }
        });
        const childrenIds = linked.map(l => l.student.userId).filter(Boolean);
        return [user.id, ...childrenIds];
    }
    // Students and other roles can only see their own records
    return [user.id];
}
// ── APPOINTMENTS ──
router.get('/appointments', auth_1.requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const appointments = await prisma_1.default.clinicAppointment.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(userIds ? { userId: { in: userIds } } : {})
            },
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(appointments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});
router.post('/appointments', auth_1.requireAuth, async (req, res) => {
    const { appointment, symptoms, medicine, date, targetUserId } = req.body;
    try {
        const newAppointment = await prisma_1.default.clinicAppointment.create({
            data: {
                appointment,
                symptoms,
                medicine: medicine || null,
                date: date ? new Date(date) : new Date(),
                userId: targetUserId || req.user.id,
                schoolId: req.user.schoolId
            }
        });
        res.json(newAppointment);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});
router.delete('/appointments/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await prisma_1.default.clinicAppointment.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma_1.default.clinicAppointment.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});
// ── COMPLAINTS ──
router.get('/complaints', auth_1.requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const complaints = await prisma_1.default.clinicComplaint.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(userIds ? { userId: { in: userIds } } : {})
            },
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(complaints);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});
router.post('/complaints', auth_1.requireAuth, async (req, res) => {
    const { title, symptoms, date, medicine, targetUserId } = req.body;
    try {
        const newComplaint = await prisma_1.default.clinicComplaint.create({
            data: {
                title,
                symptoms,
                date: date ? new Date(date) : new Date(),
                medicine: medicine || null,
                userId: targetUserId || req.user.id,
                schoolId: req.user.schoolId
            }
        });
        res.json(newComplaint);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});
router.delete('/complaints/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await prisma_1.default.clinicComplaint.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma_1.default.clinicComplaint.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
});
// ── EMERGENCIES ──
router.get('/emergencies', auth_1.requireAuth, async (req, res) => {
    try {
        const emergencies = await prisma_1.default.clinicEmergency.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(emergencies);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch emergencies' });
    }
});
router.post('/emergencies', auth_1.requireAuth, async (req, res) => {
    const { title, details, date, time } = req.body;
    try {
        const newEmergency = await prisma_1.default.clinicEmergency.create({
            data: {
                title,
                details,
                date: date ? new Date(date) : new Date(),
                time: time || new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
                schoolId: req.user.schoolId
            }
        });
        res.json(newEmergency);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create emergency record' });
    }
});
router.delete('/emergencies/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await prisma_1.default.clinicEmergency.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma_1.default.clinicEmergency.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete emergency record' });
    }
});
// ── IMMUNIZATIONS ──
router.get('/immunizations', auth_1.requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const immunizations = await prisma_1.default.clinicImmunization.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(userIds ? { userId: { in: userIds } } : {})
            },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(immunizations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch immunization records' });
    }
});
router.post('/immunizations', auth_1.requireAuth, async (req, res) => {
    const { title, details, date, targetUserId } = req.body;
    try {
        const newImmunization = await prisma_1.default.clinicImmunization.create({
            data: {
                title,
                details,
                date: date ? new Date(date) : new Date(),
                userId: targetUserId || req.user.id,
                schoolId: req.user.schoolId
            }
        });
        res.json(newImmunization);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create immunization record' });
    }
});
router.delete('/immunizations/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await prisma_1.default.clinicImmunization.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma_1.default.clinicImmunization.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete immunization record' });
    }
});
// ── REFERRALS ──
router.get('/referrals', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const isNurseOrHealthCoordinator = user.role === 'CLINIC' ||
            user.role === 'SCHOOL_ADMIN' ||
            user.role === 'SUPER_ADMIN' ||
            user.secondaryRoles?.some(r => r.toLowerCase() === 'nurse' ||
                r.toLowerCase() === 'health coordinator' ||
                r.toLowerCase() === 'health co-ordinator');
        let whereClause = { schoolId: user.schoolId };
        if (!isNurseOrHealthCoordinator) {
            whereClause.userId = user.id;
        }
        const referrals = await prisma_1.default.clinicReferral.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(referrals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch referrals' });
    }
});
router.post('/referrals', auth_1.requireAuth, async (req, res) => {
    const { title, details, date, to, address, targetUserId } = req.body;
    const user = req.user;
    try {
        const isNurseOrHealthCoordinator = user.role === 'CLINIC' ||
            user.role === 'SCHOOL_ADMIN' ||
            user.role === 'SUPER_ADMIN' ||
            user.secondaryRoles?.some(r => r.toLowerCase() === 'nurse' ||
                r.toLowerCase() === 'health coordinator' ||
                r.toLowerCase() === 'health co-ordinator');
        if (!isNurseOrHealthCoordinator) {
            return res.status(403).json({ error: 'Forbidden: Only nurses or health coordinators can create referrals' });
        }
        const newReferral = await prisma_1.default.clinicReferral.create({
            data: {
                title,
                details,
                date: date ? new Date(date) : new Date(),
                to,
                address,
                userId: targetUserId || req.user.id,
                schoolId: req.user.schoolId
            }
        });
        res.json(newReferral);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create referral' });
    }
});
router.delete('/referrals/:id', auth_1.requireAuth, async (req, res) => {
    const user = req.user;
    try {
        const isNurseOrHealthCoordinator = user.role === 'CLINIC' ||
            user.role === 'SCHOOL_ADMIN' ||
            user.role === 'SUPER_ADMIN' ||
            user.secondaryRoles?.some(r => r.toLowerCase() === 'nurse' ||
                r.toLowerCase() === 'health coordinator' ||
                r.toLowerCase() === 'health co-ordinator');
        if (!isNurseOrHealthCoordinator) {
            return res.status(403).json({ error: 'Forbidden: Only nurses or health coordinators can delete referrals' });
        }
        const record = await prisma_1.default.clinicReferral.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma_1.default.clinicReferral.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete referral' });
    }
});
exports.default = router;
//# sourceMappingURL=clinic.js.map