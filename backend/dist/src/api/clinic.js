import express from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
// Helper to check user scope for fetching records
async function getAccessibleUserIds(req) {
    const user = req.user;
    if (['SCHOOL_ADMIN', 'CLINIC', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY'].includes(user.role)) {
        // Staff can access all records in the school
        return null;
    }
    if (user.role === 'PARENT') {
        // Parents can access their own and their linked children's records
        const linked = await prisma.parentStudent.findMany({
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
router.get('/appointments', requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const appointments = await prisma.clinicAppointment.findMany({
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
router.post('/appointments', requireAuth, async (req, res) => {
    const { appointment, symptoms, medicine, date, targetUserId } = req.body;
    try {
        const newAppointment = await prisma.clinicAppointment.create({
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
router.delete('/appointments/:id', requireAuth, async (req, res) => {
    try {
        const record = await prisma.clinicAppointment.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma.clinicAppointment.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});
// ── COMPLAINTS ──
router.get('/complaints', requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const complaints = await prisma.clinicComplaint.findMany({
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
router.post('/complaints', requireAuth, async (req, res) => {
    const { title, symptoms, date, medicine, targetUserId } = req.body;
    try {
        const newComplaint = await prisma.clinicComplaint.create({
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
router.delete('/complaints/:id', requireAuth, async (req, res) => {
    try {
        const record = await prisma.clinicComplaint.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma.clinicComplaint.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
});
// ── EMERGENCIES ──
router.get('/emergencies', requireAuth, async (req, res) => {
    try {
        const emergencies = await prisma.clinicEmergency.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(emergencies);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch emergencies' });
    }
});
router.post('/emergencies', requireAuth, async (req, res) => {
    const { title, details, date, time } = req.body;
    try {
        const newEmergency = await prisma.clinicEmergency.create({
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
router.delete('/emergencies/:id', requireAuth, async (req, res) => {
    try {
        const record = await prisma.clinicEmergency.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma.clinicEmergency.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete emergency record' });
    }
});
// ── IMMUNIZATIONS ──
router.get('/immunizations', requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const immunizations = await prisma.clinicImmunization.findMany({
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
router.post('/immunizations', requireAuth, async (req, res) => {
    const { title, details, date, targetUserId } = req.body;
    try {
        const newImmunization = await prisma.clinicImmunization.create({
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
router.delete('/immunizations/:id', requireAuth, async (req, res) => {
    try {
        const record = await prisma.clinicImmunization.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma.clinicImmunization.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete immunization record' });
    }
});
// ── REFERRALS ──
router.get('/referrals', requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const referrals = await prisma.clinicReferral.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(userIds ? { userId: { in: userIds } } : {})
            },
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
router.post('/referrals', requireAuth, async (req, res) => {
    const { title, details, date, to, address, targetUserId } = req.body;
    try {
        const newReferral = await prisma.clinicReferral.create({
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
router.delete('/referrals/:id', requireAuth, async (req, res) => {
    try {
        const record = await prisma.clinicReferral.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma.clinicReferral.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete referral' });
    }
});
export default router;
//# sourceMappingURL=clinic.js.map