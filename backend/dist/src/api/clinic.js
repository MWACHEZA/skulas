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
// Helper to resolve patient vs user association
function resolveClinicUserAndPatient(targetUserId, patientId, currentUserId) {
    if (patientId) {
        return { userId: targetUserId || null, patientId };
    }
    return { userId: targetUserId || currentUserId, patientId: null };
}
// ── PATIENTS ──
router.get('/patients/search', auth_1.requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        const query = (q || '').trim();
        if (!query)
            return res.json([]);
        // Search clinic patients
        const patients = await prisma_1.default.clinicPatient.findMany({
            where: {
                schoolId: req.user.schoolId,
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { contactNumber: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 10,
            include: { user: { select: { name: true, role: true, email: true } } }
        });
        // Also search users if not found enough
        if (patients.length < 10) {
            const users = await prisma_1.default.user.findMany({
                where: {
                    schoolId: req.user.schoolId,
                    name: { contains: query, mode: 'insensitive' }
                },
                take: 10 - patients.length,
                select: { id: true, name: true, role: true, email: true, phone: true }
            });
            res.json({ patients, users });
        }
        else {
            res.json({ patients, users: [] });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to search patients' });
    }
});
router.post('/patients', auth_1.requireAuth, async (req, res) => {
    const { firstName, lastName, dob, gender, contactNumber, address, medicalHistory, targetUserId } = req.body;
    try {
        const patient = await prisma_1.default.clinicPatient.create({
            data: {
                firstName,
                lastName,
                dob: dob ? new Date(dob) : null,
                gender,
                contactNumber,
                address,
                medicalHistory,
                userId: targetUserId || null,
                schoolId: req.user.schoolId
            }
        });
        res.json(patient);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to register clinic patient' });
    }
});
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
    const { appointment, symptoms, medicine, date, targetUserId, patientId } = req.body;
    try {
        const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user.id);
        const newAppointment = await prisma_1.default.clinicAppointment.create({
            data: {
                appointment,
                symptoms,
                medicine: medicine || null,
                date: date ? new Date(date) : new Date(),
                userId: refs.userId,
                patientId: refs.patientId,
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
    const { title, symptoms, date, medicine, targetUserId, patientId } = req.body;
    try {
        const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user.id);
        const newComplaint = await prisma_1.default.clinicComplaint.create({
            data: {
                title,
                symptoms,
                date: date ? new Date(date) : new Date(),
                medicine: medicine || null,
                userId: refs.userId,
                patientId: refs.patientId,
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
    const { title, details, date, time, patientId } = req.body;
    try {
        const newEmergency = await prisma_1.default.clinicEmergency.create({
            data: {
                title,
                details,
                date: date ? new Date(date) : new Date(),
                time: time || new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
                patientId: patientId || null,
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
    const { title, details, date, targetUserId, patientId } = req.body;
    try {
        const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user.id);
        const newImmunization = await prisma_1.default.clinicImmunization.create({
            data: {
                title,
                details,
                date: date ? new Date(date) : new Date(),
                userId: refs.userId,
                patientId: refs.patientId,
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
    const { title, details, date, to, address, targetUserId, patientId } = req.body;
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
        const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user.id);
        const newReferral = await prisma_1.default.clinicReferral.create({
            data: {
                title,
                details,
                date: date ? new Date(date) : new Date(),
                to,
                address,
                userId: refs.userId,
                patientId: refs.patientId,
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
// ── CLINIC VISITS & VITALS ──
router.get('/visits', auth_1.requireAuth, async (req, res) => {
    try {
        const userIds = await getAccessibleUserIds(req);
        const visits = await prisma_1.default.clinicVisit.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(userIds ? { userId: { in: userIds } } : {})
            },
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { visitDate: 'desc' }
        });
        res.json(visits);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinic visits' });
    }
});
router.post('/visits', auth_1.requireAuth, async (req, res) => {
    const { targetUserId, patientId, temperature, bloodPressure, heartRate, respiratoryRate, weight, height, oxygenSaturation, presentingComplaint, triageLevel, conditionDetails, diagnosis, treatment, prescription, notes, status, visitDate } = req.body;
    try {
        const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user.id);
        // Generate Episode ID (EP-YYYYMMDD-001)
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const count = await prisma_1.default.clinicVisit.count({
            where: { schoolId: req.user.schoolId, createdAt: { gte: todayStart } }
        });
        const visitCode = `EP-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
        const visit = await prisma_1.default.clinicVisit.create({
            data: {
                visitCode,
                userId: refs.userId,
                patientId: refs.patientId,
                schoolId: req.user.schoolId,
                temperature: temperature ? parseFloat(temperature) : null,
                bloodPressure: bloodPressure || null,
                heartRate: heartRate ? parseInt(heartRate) : null,
                respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
                oxygenSaturation: oxygenSaturation ? parseFloat(oxygenSaturation) : null,
                presentingComplaint: presentingComplaint || null,
                triageLevel: triageLevel || null,
                conditionDetails: conditionDetails || null,
                diagnosis: diagnosis || null,
                treatment: treatment || null,
                prescription: prescription || null,
                notes: notes || null,
                status: status || 'OPEN',
                visitDate: visitDate ? new Date(visitDate) : new Date(),
            }
        });
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create clinic visit' });
    }
});
// ── HOSPITALIZATIONS ──
router.get('/patient/:id/hospitalizations', auth_1.requireAuth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const isPatientId = req.query.type === 'patient';
        // Basic auth check only applies if querying by system userId
        if (!isPatientId) {
            const accessibleIds = await getAccessibleUserIds(req);
            if (accessibleIds && !accessibleIds.includes(targetUserId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const whereClause = isPatientId
            ? { patientId: targetUserId, schoolId: req.user.schoolId }
            : { userId: targetUserId, schoolId: req.user.schoolId };
        const records = await prisma_1.default.clinicHospitalization.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hospitalizations' });
    }
});
router.post('/hospitalizations', auth_1.requireAuth, async (req, res) => {
    const { targetUserId, patientId, preAdmissionData } = req.body;
    try {
        const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user.id);
        const newHosp = await prisma_1.default.clinicHospitalization.create({
            data: {
                userId: refs.userId,
                patientId: refs.patientId,
                schoolId: req.user.schoolId,
                stage: 'PRE_ADMISSION',
                preAdmissionData: preAdmissionData || {}
            }
        });
        res.json(newHosp);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create hospitalization record' });
    }
});
router.get('/hospitalizations/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await prisma_1.default.clinicHospitalization.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId },
            include: {
                user: { select: { name: true, email: true, role: true } }
            }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hospitalization record' });
    }
});
router.put('/hospitalizations/:id', auth_1.requireAuth, async (req, res) => {
    const { stage, preAdmissionData, admissionData, transferData, dischargeData } = req.body;
    try {
        const record = await prisma_1.default.clinicHospitalization.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        const updated = await prisma_1.default.clinicHospitalization.update({
            where: { id: record.id },
            data: {
                stage: stage || record.stage,
                preAdmissionData: preAdmissionData !== undefined ? preAdmissionData : record.preAdmissionData,
                admissionData: admissionData !== undefined ? admissionData : record.admissionData,
                transferData: transferData !== undefined ? transferData : record.transferData,
                dischargeData: dischargeData !== undefined ? dischargeData : record.dischargeData,
            }
        });
        // Auto-update student attendance if admitted
        if (stage === 'ADMITTED' && updated.userId) {
            const user = await prisma_1.default.user.findUnique({ where: { id: updated.userId } });
            if (user?.role === 'STUDENT') {
                const student = await prisma_1.default.student.findUnique({ where: { userId: user.id } });
                if (student) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const existingAttendance = await prisma_1.default.attendance.findFirst({
                        where: {
                            studentId: student.id,
                            schoolId: req.user.schoolId,
                            date: today
                        }
                    });
                    if (existingAttendance) {
                        await prisma_1.default.attendance.update({
                            where: { id: existingAttendance.id },
                            data: { status: 'Medical Leave', note: 'Hospitalized (Admitted)' }
                        });
                    }
                }
            }
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update hospitalization record' });
    }
});
router.delete('/hospitalizations/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await prisma_1.default.clinicHospitalization.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Record not found' });
        await prisma_1.default.clinicHospitalization.delete({ where: { id: record.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hospitalization record' });
    }
});
// ── PATIENT HISTORY ──
router.get('/patient/:id/history', auth_1.requireAuth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const isPatientId = req.query.type === 'patient';
        // Basic auth check only applies if querying by system userId
        if (!isPatientId) {
            const accessibleIds = await getAccessibleUserIds(req);
            if (accessibleIds && !accessibleIds.includes(targetUserId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const whereClause = isPatientId
            ? { patientId: targetUserId, schoolId: req.user.schoolId }
            : { userId: targetUserId, schoolId: req.user.schoolId };
        const [visits, appointments, complaints, immunizations, referrals, hospitalizations] = await Promise.all([
            prisma_1.default.clinicVisit.findMany({ where: whereClause, orderBy: { visitDate: 'desc' } }),
            prisma_1.default.clinicAppointment.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
            prisma_1.default.clinicComplaint.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
            prisma_1.default.clinicImmunization.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
            prisma_1.default.clinicReferral.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
            prisma_1.default.clinicHospitalization.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } })
        ]);
        res.json({
            visits,
            appointments,
            complaints,
            immunizations,
            referrals,
            hospitalizations
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient history' });
    }
});
exports.default = router;
//# sourceMappingURL=clinic.js.map