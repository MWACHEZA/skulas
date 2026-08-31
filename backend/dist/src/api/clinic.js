"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISIT_STAGES = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const router = express_1.default.Router();
// Allowed Visit Workflow State Machine Pipeline
exports.VISIT_STAGES = [
    'CHECK_IN',
    'TRIAGE',
    'CONSULTATION',
    'PRESCRIBED',
    'DISPENSED',
    'BILLED',
    'DISCHARGED'
];
// Helper to verify clinical staff role
function isClinicalStaff(user) {
    if (!user)
        return false;
    if (['CLINIC', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user.role))
        return true;
    if (Array.isArray(user.secondaryRoles)) {
        return user.secondaryRoles.some((r) => ['nurse', 'doctor', 'clinician', 'health coordinator', 'pharmacist'].includes(r.toLowerCase()));
    }
    return false;
}
// Helper to check user scope for fetching records
async function getAccessibleUserIds(req) {
    const user = req.user;
    if (isClinicalStaff(user)) {
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
    const { firstName, lastName, dob, gender, contactNumber, address, medicalHistory, targetUserId, bloodType, allergies, chronicConditions, guardianName, guardianContact } = req.body;
    try {
        const schoolId = req.user.schoolId;
        // Auto-generate MRN (MRN-YYYY-XXXX)
        const year = new Date().getFullYear();
        const count = await prisma_1.default.clinicPatient.count({ where: { schoolId } });
        const mrn = `MRN-${year}-${(count + 1).toString().padStart(4, '0')}`;
        const patient = await prisma_1.default.clinicPatient.create({
            data: {
                mrn,
                firstName,
                lastName,
                dob: dob ? new Date(dob) : null,
                gender,
                contactNumber,
                address,
                medicalHistory,
                bloodType: bloodType || null,
                allergies: allergies || null,
                chronicConditions: chronicConditions || null,
                guardianName: guardianName || null,
                guardianContact: guardianContact || null,
                userId: targetUserId || null,
                schoolId
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
// ── VISIT WORKFLOW STATE MACHINE ──
/**
 * @route   PATCH /api/clinic/visits/:id/stage
 * @desc    Enforce sequential workflow stage transition for clinic visits:
 *          CHECK_IN -> TRIAGE -> CONSULTATION -> PRESCRIBED -> DISPENSED -> BILLED -> DISCHARGED
 */
router.patch('/visits/:id/stage', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nextStage, notes } = req.body;
        const schoolId = req.user.schoolId;
        if (!exports.VISIT_STAGES.includes(nextStage)) {
            return res.status(400).json({ error: `Invalid stage. Must be one of: ${exports.VISIT_STAGES.join(', ')}` });
        }
        const visit = await prisma_1.default.clinicVisit.findFirst({
            where: { id: id, schoolId }
        });
        if (!visit)
            return res.status(404).json({ error: 'Visit record not found' });
        // Validate state machine progression
        const currentIdx = exports.VISIT_STAGES.indexOf(visit.status);
        const targetIdx = exports.VISIT_STAGES.indexOf(nextStage);
        if (currentIdx !== -1 && targetIdx < currentIdx) {
            return res.status(400).json({
                error: `Cannot regress visit stage from ${visit.status} back to ${nextStage}. Follow sequence: ${exports.VISIT_STAGES.join(' -> ')}`
            });
        }
        const updated = await prisma_1.default.clinicVisit.update({
            where: { id: visit.id },
            data: {
                status: nextStage,
                notes: notes ? (visit.notes ? `${visit.notes}\n[${new Date().toISOString()}] ${notes}` : notes) : visit.notes
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update visit workflow stage' });
    }
});
// ── GET CLINIC VISITS LIST ──
/**
 * @route   GET /api/clinic/visits
 * @desc    Get list of clinic visits with filtering by status, date, or search
 */
router.get('/visits', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { status, patientId } = req.query;
        const where = { schoolId };
        if (status && status !== 'ALL')
            where.status = status;
        if (patientId)
            where.patientId = patientId;
        const visits = await prisma_1.default.clinicVisit.findMany({
            where,
            include: {
                patient: {
                    select: {
                        id: true,
                        mrn: true,
                        firstName: true,
                        lastName: true,
                        bloodType: true,
                        allergies: true,
                        contactNumber: true,
                        userId: true
                    }
                },
                dispensings: {
                    include: {
                        item: { select: { id: true, name: true, unitPrice: true } }
                    }
                }
            },
            orderBy: { visitDate: 'desc' },
            take: 100
        });
        res.json(visits);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinic visits' });
    }
});
// ── CLINIC BILLING & LEDGER INTEGRATION ──
/**
 * @route   POST /api/clinic/visits/:id/bill
 * @desc    Finalize visit billing and post double-entry journal entry to LedgerService.
 *          DR 1100 Cash / Bank (or 1210 Student AR if unpaid student bill)
 *          CR 5900 Miscellaneous / Clinic Income
 *          DR 6110 COGS (Cost of Dispensed Medical Stock)
 *          CR 1310 Inventory Asset (Pharmacy Stock)
 */
router.post('/visits/:id/bill', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const { consultationFee = 0, medicationCost = 0, procedureCost = 0, paymentMode = 'CASH', isSubsidized = false } = req.body;
        const visit = await prisma_1.default.clinicVisit.findFirst({
            where: { id: id, schoolId }
        });
        if (!visit)
            return res.status(404).json({ error: 'Clinic visit record not found' });
        const totalCharge = (parseFloat(consultationFee) || 0) + (parseFloat(medicationCost) || 0) + (parseFloat(procedureCost) || 0);
        let journalEntryId = null;
        if (totalCharge > 0 && !isSubsidized) {
            // Get Ledger Accounts
            const [cashAccountId, incomeAccountId, cogsAccountId, inventoryAccountId] = await Promise.all([
                (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default), // Cash on Hand
                (0, coa_seeder_1.getAccountId)(schoolId, '5900', prisma_1.default), // Miscellaneous / Clinic Income
                (0, coa_seeder_1.getAccountId)(schoolId, '6110', prisma_1.default), // COGS
                (0, coa_seeder_1.getAccountId)(schoolId, '1310', prisma_1.default) // Inventory Asset
            ]);
            const lines = [
                {
                    accountId: cashAccountId,
                    debit: totalCharge,
                    description: `Clinic visit payment (${paymentMode}) - Code ${visit.visitCode || visit.id}`
                },
                {
                    accountId: incomeAccountId,
                    credit: totalCharge,
                    description: `Clinic Consultation & Dispensary Revenue`
                }
            ];
            // Add COGS / Inventory movement if medication cost is recorded
            if (parseFloat(medicationCost) > 0) {
                lines.push({
                    accountId: cogsAccountId,
                    debit: parseFloat(medicationCost),
                    description: `COGS: Dispensed Clinic Supplies`
                });
                lines.push({
                    accountId: inventoryAccountId,
                    credit: parseFloat(medicationCost),
                    description: `Inventory Asset Reduction: Medical Dispensary`
                });
            }
            const je = await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: new Date(),
                description: `Clinic Visit Billing [${visit.visitCode || visit.id}]`,
                sourceType: 'clinic_bill',
                sourceId: visit.id,
                createdByUserId: req.user.id,
                lines
            });
            journalEntryId = je.id;
        }
        else if (isSubsidized) {
            // Subsidized / Donated care posting: DR 7900 Misc Expense (Donated Care Cost), CR 1310 Inventory
            try {
                const [expenseAccountId, inventoryAccountId] = await Promise.all([
                    (0, coa_seeder_1.getAccountId)(schoolId, '7900', prisma_1.default),
                    (0, coa_seeder_1.getAccountId)(schoolId, '1310', prisma_1.default)
                ]);
                const estCost = parseFloat(medicationCost) || 10; // Nominal donated care cost
                const je = await ledger_service_1.LedgerService.postEntry({
                    schoolId,
                    date: new Date(),
                    description: `Subsidized / Mission Outreach Clinic Care [${visit.visitCode || visit.id}]`,
                    sourceType: 'clinic_donated_care',
                    sourceId: visit.id,
                    createdByUserId: req.user.id,
                    lines: [
                        { accountId: expenseAccountId, debit: estCost, description: `Donated / Subsidized Clinic Care Expense` },
                        { accountId: inventoryAccountId, credit: estCost, description: `Inventory Asset: Medical Stock Dispersal` }
                    ]
                });
                journalEntryId = je.id;
            }
            catch (err) {
                console.warn('Subsidized care ledger posting warning:', err);
            }
        }
        // Update visit status & billing details
        const updatedVisit = await prisma_1.default.clinicVisit.update({
            where: { id: visit.id },
            data: {
                status: 'BILLED',
                treatment: (visit.treatment || '') + ` | Billed: $${totalCharge} (${paymentMode})`,
            }
        });
        res.json({
            success: true,
            visit: updatedVisit,
            totalCharge,
            journalEntryId,
            message: isSubsidized ? 'Visit marked as subsidized mission care and logged' : `Visit successfully billed for $${totalCharge} and posted to General Ledger`
        });
    }
    catch (error) {
        console.error('Clinic billing error:', error);
        res.status(500).json({ error: error.message || 'Failed to process clinic billing' });
    }
});
// ── PHARMACY INVENTORY & DISPENSING ──
/**
 * @route GET /api/clinic/pharmacy/inventory
 * @desc List medical stock items, with low-stock and expiry warnings
 */
router.get('/pharmacy/inventory', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const items = await prisma_1.default.clinicInventoryItem.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        const now = new Date();
        const alertThreshold = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
        const itemsWithStatus = items.map((item) => ({
            ...item,
            isLowStock: item.stock <= item.reorderLevel,
            isExpired: item.expiryDate ? new Date(item.expiryDate) <= now : false,
            isExpiringSoon: item.expiryDate ? (new Date(item.expiryDate) > now && new Date(item.expiryDate) <= alertThreshold) : false
        }));
        res.json(itemsWithStatus);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch pharmacy inventory' });
    }
});
/**
 * @route POST /api/clinic/pharmacy/inventory
 * @desc Add or restock a medical inventory item
 */
router.post('/pharmacy/inventory', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Forbidden: Clinical role required to manage dispensary inventory' });
        }
        const { name, category, batchNumber, expiryDate, unit, stock, reorderLevel, unitCost, unitPrice, location } = req.body;
        const schoolId = req.user.schoolId;
        const item = await prisma_1.default.clinicInventoryItem.create({
            data: {
                schoolId,
                name,
                category: category || 'MEDICATION',
                batchNumber: batchNumber || null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                unit: unit || 'tablets',
                stock: parseInt(stock) || 0,
                reorderLevel: parseInt(reorderLevel) || 10,
                unitCost: parseFloat(unitCost) || 0,
                unitPrice: parseFloat(unitPrice) || 0,
                location: location || null
            }
        });
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create pharmacy item' });
    }
});
/**
 * @route POST /api/clinic/pharmacy/dispense
 * @desc Dispense medication against a visit or patient, decrement stock, and log audit movement
 */
router.post('/pharmacy/dispense', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Forbidden: Clinical authorization required to dispense drugs' });
        }
        const { itemId, visitId, patientId, quantity, notes } = req.body;
        const schoolId = req.user.schoolId;
        const qtyToDispense = parseInt(quantity) || 1;
        const item = await prisma_1.default.clinicInventoryItem.findFirst({
            where: { id: itemId, schoolId }
        });
        if (!item)
            return res.status(404).json({ error: 'Medication stock item not found' });
        // Expiry check
        if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
            return res.status(400).json({
                error: `Cannot dispense expired stock! Medication ${item.name} expired on ${new Date(item.expiryDate).toLocaleDateString()}`
            });
        }
        // Stock check
        if (item.stock < qtyToDispense) {
            return res.status(400).json({
                error: `Insufficient inventory for ${item.name}. Required: ${qtyToDispense}, Available: ${item.stock}`
            });
        }
        // Decrement stock & create dispense log
        const updatedItem = await prisma_1.default.clinicInventoryItem.update({
            where: { id: item.id },
            data: { stock: item.stock - qtyToDispense }
        });
        const dispenseLog = await prisma_1.default.clinicDispensingLog.create({
            data: {
                schoolId,
                itemId: item.id,
                visitId: visitId || null,
                patientId: patientId || null,
                quantity: qtyToDispense,
                unitCost: item.unitCost,
                totalPrice: qtyToDispense * item.unitPrice,
                dispensedBy: req.user.name || req.user.email,
                notes: notes || null
            }
        });
        // If linked to visit, update visit stage to DISPENSED
        if (visitId) {
            await prisma_1.default.clinicVisit.update({
                where: { id: visitId },
                data: { status: 'DISPENSED' }
            }).catch(() => { });
        }
        res.json({
            success: true,
            item: updatedItem,
            dispenseLog,
            message: `Successfully dispensed ${qtyToDispense} ${item.unit} of ${item.name}`
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to dispense medication' });
    }
});
// ── IMMUNIZATION BOOSTER / DUE REPORT ──
/**
 * @route GET /api/clinic/immunizations/due-report
 * @desc Get list of pending/upcoming immunization booster dates for students & community patients
 */
router.get('/immunizations/due-report', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { targetDate } = req.query;
        const cutoff = targetDate ? new Date(targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const dueList = await prisma_1.default.clinicImmunization.findMany({
            where: {
                schoolId,
                nextDueDate: { lte: cutoff }
            },
            include: {
                patient: { select: { firstName: true, lastName: true, mrn: true, contactNumber: true, guardianContact: true } },
                user: { select: { name: true, email: true, phone: true } }
            },
            orderBy: { nextDueDate: 'asc' }
        });
        res.json(dueList);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate immunization booster report' });
    }
});
// ── DISEASE SURVEILLANCE & OUTBREAK REPORTING ──
/**
 * @route GET /api/clinic/reports/surveillance
 * @desc Aggregate disease diagnosis frequencies for epidemiological surveillance and outbreak tracking
 */
router.get('/reports/surveillance', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const visits = await prisma_1.default.clinicVisit.findMany({
            where: {
                schoolId,
                visitDate: { gte: start, lte: end },
                diagnosis: { not: null }
            },
            select: { diagnosis: true, triageLevel: true, visitDate: true }
        });
        // Group diagnoses
        const diagnosisCounts = {};
        visits.forEach((v) => {
            if (!v.diagnosis)
                return;
            const diag = v.diagnosis.trim();
            diagnosisCounts[diag] = (diagnosisCounts[diag] || 0) + 1;
        });
        const report = Object.entries(diagnosisCounts)
            .map(([diagnosis, count]) => ({ diagnosis, count }))
            .sort((a, b) => b.count - a.count);
        res.json({
            period: { start, end },
            totalCasesLogged: visits.length,
            surveillanceSummary: report
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate disease surveillance report' });
    }
});
exports.default = router;
//# sourceMappingURL=clinic.js.map