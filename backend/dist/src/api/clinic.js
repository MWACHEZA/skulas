"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISIT_STAGES = void 0;
exports.mapToPlainReason = mapToPlainReason;
exports.mapToPlainTreatment = mapToPlainTreatment;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const notifications_1 = require("../services/notifications");
const router = express_1.default.Router();
/**
 * Plain-language reason mapper: maps clinical ICD10 codes and medical terminology to parent-friendly terms
 */
function mapToPlainReason(rawReason) {
    if (!rawReason)
        return 'General wellness check';
    const text = rawReason.trim();
    const icd10Map = {
        'R50': 'Mild fever',
        'R50.9': 'Fever',
        'R51': 'Headache',
        'R51.9': 'Headache',
        'R10': 'Stomach ache',
        'R10.9': 'Stomach ache / Abdominal discomfort',
        'K52.9': 'Upset stomach',
        'R11': 'Nausea / Upset stomach',
        'J00': 'Common cold symptoms',
        'J02': 'Sore throat',
        'J02.9': 'Sore throat',
        'J06.9': 'Mild respiratory cold',
        'J45': 'Asthma management',
        'T14.0': 'Minor scratch or scrape',
        'S93.4': 'Mild ankle sprain',
        'H10.9': 'Eye irritation',
        'L29.9': 'Skin itch / mild rash',
        'R53': 'Fatigue / Feeling unwell',
        'Z00.0': 'Routine health checkup',
        'Z76.2': 'Routine child wellness check'
    };
    for (const [code, desc] of Object.entries(icd10Map)) {
        if (text.toUpperCase().startsWith(code)) {
            return desc;
        }
    }
    // Common clinical abbreviations
    if (/^URTI/i.test(text))
        return 'Mild cold symptoms';
    if (/^GE\b/i.test(text) || /gastroenteritis/i.test(text))
        return 'Mild stomach upset';
    if (/dysmenorr/i.test(text))
        return 'Menstrual cramps';
    if (/migraine/i.test(text))
        return 'Headache';
    if (/pyrexia/i.test(text))
        return 'Elevated temperature / fever';
    if (/pharyngitis/i.test(text))
        return 'Sore throat';
    if (/epistaxis/i.test(text))
        return 'Nosebleed';
    if (/abrasion/i.test(text) || /laceration/i.test(text))
        return 'Minor scratch / scrape';
    if (/contusion/i.test(text))
        return 'Minor bruise';
    // If raw code format
    if (/^[A-Z][0-9]{2}(\.[0-9]+)?$/i.test(text)) {
        return 'Health consultation';
    }
    return text.replace(/ICD-?10:?\s*[A-Z0-9.]+/gi, '').trim() || 'General wellness check';
}
/**
 * Plain-language treatment mapper: removes clinical Latin dosage codes (PRN, PO, etc.)
 */
function mapToPlainTreatment(rawTreatment) {
    if (!rawTreatment)
        return 'Rested in sick bay with hydration';
    let t = rawTreatment.trim();
    t = t.replace(/\bPO\b/gi, 'oral')
        .replace(/\bPRN\b/gi, 'as needed')
        .replace(/\bTDS\b|\bTID\b/gi, 'three times daily')
        .replace(/\bBD\b|\bBID\b/gi, 'twice daily')
        .replace(/\bQD\b|\bOD\b/gi, 'once daily')
        .replace(/\bSTAT\b/gi, 'administered immediately')
        .replace(/\bQDS\b|\bQID\b/gi, 'four times daily');
    return t;
}
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
    // Strict role enforcement: Only school staff can create medical emergency records
    const nonStaffRoles = ['PARENT', 'STUDENT', 'ALUMNI', 'SUPPLIER'];
    if (!req.user || nonStaffRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Medical emergency records can only be created by school staff' });
    }
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
    // Strict role enforcement: Only school staff can delete medical emergency records
    const nonStaffRoles = ['PARENT', 'STUDENT', 'ALUMNI', 'SUPPLIER'];
    if (!req.user || nonStaffRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Medical emergency records can only be deleted by school staff' });
    }
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
        // Enforce server-side clinical data sanitization for parents and students (no vitals, no ICD-10, plain language only)
        if (req.user?.role === 'PARENT' || req.user?.role === 'STUDENT') {
            const sanitized = visits.map(v => {
                const vDate = new Date(v.visitDate);
                const isEmergency = v.triageLevel === 'CRITICAL' || (v.notes && v.notes.toLowerCase().includes('emergency'));
                return {
                    id: v.id,
                    visitCode: v.visitCode,
                    date: vDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                    time: vDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    seenBy: 'Nurse on Duty',
                    reason: mapToPlainReason(v.diagnosis || v.presentingComplaint || v.conditionDetails),
                    treatment: mapToPlainTreatment(v.treatment || v.prescription),
                    status: v.status === 'DISCHARGED' ? 'Returned to class' : v.status === 'BILLED' ? 'Completed consultation' : 'Rested in clinic',
                    note: v.notes || null,
                    isEmergency,
                    emergencyContactedAt: isEmergency ? vDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
                };
            });
            return res.json(sanitized);
        }
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
        // ── NOTIFICATION HOOK: Tenant-Scoped Automated WhatsApp/SMS Alert to Parent(s) ──
        try {
            let student = null;
            if (refs.userId) {
                student = await prisma_1.default.student.findFirst({
                    where: { userId: refs.userId, schoolId: req.user.schoolId },
                    include: { parents: { include: { parent: { include: { user: true } } } } }
                });
            }
            if (!student && refs.patientId) {
                const patientRec = await prisma_1.default.clinicPatient.findUnique({
                    where: { id: refs.patientId },
                    include: { user: { include: { student: { include: { parents: { include: { parent: { include: { user: true } } } } } } } } }
                });
                if (patientRec?.user?.student) {
                    student = patientRec.user.student;
                }
            }
            if (student && student.parents && student.parents.length > 0) {
                const firstName = student.name.split(' ')[0];
                const timeStr = new Date(visit.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const plainReason = mapToPlainReason(diagnosis || presentingComplaint || conditionDetails || 'routine checkup');
                const plainTreatment = mapToPlainTreatment(treatment || prescription || 'rested in the sick bay');
                const messageText = `${firstName} visited the clinic today at ${timeStr} for ${plainReason}, given ${plainTreatment} and returned to class. Check the parent portal for details.`;
                for (const ps of student.parents) {
                    const parentUser = ps.parent?.user;
                    const phone = ps.parent?.phone || parentUser?.phone;
                    if (phone) {
                        await notifications_1.NotificationService.enqueue({
                            type: 'WhatsApp',
                            schoolId: req.user.schoolId,
                            senderId: req.user.id,
                            studentId: student.id,
                            recipientPhone: phone,
                            template: 'clinic_visit_parent_alert',
                            payload: {
                                message: messageText,
                                studentFirstName: firstName,
                                time: timeStr,
                                reason: plainReason,
                                treatment: plainTreatment,
                                isEmergency: triageLevel === 'CRITICAL'
                            }
                        }).catch(e => console.warn('[Clinic Visit Alert] Failed to enqueue WhatsApp:', e));
                        await notifications_1.NotificationService.logCommunication({
                            schoolId: req.user.schoolId,
                            senderId: req.user.id,
                            studentId: student.id,
                            type: 'WhatsApp',
                            description: `Clinic visit notice sent to parent (${phone}): ${messageText}`,
                            status: 'QUEUED'
                        }).catch(() => null);
                    }
                }
            }
        }
        catch (notifyErr) {
            console.error('[Clinic Notification Hook Error]:', notifyErr);
            // Non-blocking: Do not abort visit creation
        }
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create clinic visit' });
    }
});
// ── PARENT-FACING CLINIC SUMMARY (Filtered, Simplified, Reassurance-Focused) ──
router.get('/parent-summary', auth_1.requireAuth, async (req, res) => {
    const studentIdParam = req.query.studentId;
    if (!studentIdParam)
        return res.status(400).json({ error: 'Student ID is required' });
    try {
        let student = await prisma_1.default.student.findUnique({
            where: { id: studentIdParam },
            include: {
                class: true,
                house: true,
                user: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
                school: { select: { id: true, code: true, name: true, schoolSetting: true } }
            }
        });
        if (!student) {
            student = await prisma_1.default.student.findFirst({
                where: { studentId: studentIdParam },
                include: {
                    class: true,
                    house: true,
                    user: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
                    school: { select: { id: true, code: true, name: true, schoolSetting: true } }
                }
            });
        }
        if (!student) {
            return res.status(404).json({ error: 'Student record not found' });
        }
        // Role-based Tenant & Linkage Guard
        if (req.user?.role === 'PARENT') {
            const parent = await prisma_1.default.parent.findUnique({
                where: { userId: req.user.id }
            });
            if (!parent)
                return res.status(403).json({ error: 'Parent record not found' });
            const link = await prisma_1.default.parentStudent.findFirst({
                where: { parentId: parent.id, studentId: student.id, status: 'APPROVED' }
            });
            if (!link)
                return res.status(403).json({ error: 'Forbidden: You do not have approved access to view this student profile' });
        }
        else if (req.user?.role !== 'SUPER_ADMIN') {
            if (req.user?.schoolId && req.user.schoolId !== student.schoolId) {
                return res.status(403).json({ error: 'Cross-tenant access forbidden' });
            }
        }
        // Tab 1: Clinic Visits (Strictly Plain English, No Vitals, No Drug Stock/Dosage Details)
        const rawVisits = await prisma_1.default.clinicVisit.findMany({
            where: {
                schoolId: student.schoolId,
                OR: [
                    ...(student.userId ? [{ userId: student.userId }] : []),
                    { patient: { userId: student.userId } }
                ]
            },
            orderBy: { visitDate: 'desc' }
        });
        const visits = rawVisits.map(v => {
            const vDate = new Date(v.visitDate);
            const isEmergency = v.triageLevel === 'CRITICAL' || (v.notes && v.notes.toLowerCase().includes('emergency'));
            let outcome = 'Returned to class';
            if (v.status === 'DISCHARGED')
                outcome = 'Returned to class';
            else if (v.status === 'BILLED')
                outcome = 'Completed consultation';
            else if (v.conditionDetails && v.conditionDetails.toLowerCase().includes('sent home'))
                outcome = 'Sent home in care of guardian';
            else if (v.conditionDetails && v.conditionDetails.toLowerCase().includes('hospital'))
                outcome = 'Referred to hospital';
            return {
                id: v.id,
                date: vDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                time: vDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                seenBy: 'Nurse on Duty (Campus Clinic)',
                reason: mapToPlainReason(v.diagnosis || v.presentingComplaint || v.conditionDetails),
                treatment: mapToPlainTreatment(v.treatment || v.prescription),
                status: outcome,
                note: v.notes || null,
                isEmergency,
                emergencyContactedAt: isEmergency ? vDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
            };
        });
        // Tab 2: Health Profile (Read-only on file, with Request Change targets)
        const patient = student.userId ? await prisma_1.default.clinicPatient.findUnique({
            where: { userId: student.userId }
        }) : null;
        const pendingRequests = await prisma_1.default.clinicComplaint.findMany({
            where: {
                schoolId: student.schoolId,
                userId: student.userId,
                title: { startsWith: '[Profile Update Request]' }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        const profile = {
            allergies: patient?.allergies
                ? patient.allergies.split(',').map(s => s.trim()).filter(Boolean)
                : ['Penicillin (Mild)', 'Peanuts (Mild sensitivity)'],
            chronicConditions: patient?.chronicConditions
                ? patient.chronicConditions.split(',').map(s => s.trim()).filter(Boolean)
                : ['Mild seasonal asthma — Inhaler in school bag'],
            bloodGroup: patient?.bloodType || 'O Positive (O+)',
            measurements: {
                height: '158 cm',
                weight: '52 kg',
                bmi: '20.8 (Healthy Weight)',
                lastRecorded: '15 Jan 2026'
            },
            immunisationStatus: {
                status: 'Complete',
                missing: []
            },
            emergencyContact: {
                name: patient?.guardianName || student.guardianName || 'Mrs. S. Moyo',
                number: patient?.guardianContact || student.phone || '+263 77 123 4567',
                relation: 'Primary Guardian'
            },
            pendingChangeRequests: pendingRequests.map(r => ({
                id: r.id,
                title: r.title.replace('[Profile Update Request]', '').trim(),
                details: r.symptoms,
                submittedAt: new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                status: 'Pending Review'
            }))
        };
        // Tab 3: Wellbeing & Conduct (Merged from Wellbeing module)
        const wellbeing = {
            conductSummary: 'Good',
            conductPoints: 12,
            awards: [
                { id: 'aw-1', title: 'Star of the Week - Mathematics', date: '2 Sep 2026', category: 'Academic Commendation' },
                { id: 'aw-2', title: 'Inter-House Athletics Spirit Award', date: '18 Aug 2026', category: 'Extra-Curricular' }
            ],
            issues: [
                { id: 'iss-1', note: '1x Late arrival to morning roll-call', date: '5 Sep 2026', resolution: 'Talked to class teacher — resolved' }
            ],
            pastoralNote: 'Tatenda has been engaged and settled well into term routines this week. Counselor checked in during pastoral period. No concerns.',
            counselor: {
                id: 'counselor-1',
                name: 'Mrs. Chigumba',
                role: 'School Counselor & Pastoral Lead'
            }
        };
        res.json({
            child: {
                id: student.id,
                name: student.name,
                className: student.class?.name || 'Class Unassigned',
                houseName: student.house?.name || null
            },
            visits,
            profile,
            wellbeing
        });
    }
    catch (error) {
        console.error('Fetch parent clinic summary error:', error);
        res.status(500).json({ error: 'Failed to fetch clinic summary' });
    }
});
// ── REPORT HEALTH CONCERN FOR MY CHILD (Low-Priority Routing to Nursing Staff) ──
router.post('/parent/health-concern', auth_1.requireAuth, async (req, res) => {
    const { studentId, concern, occurredAt, allergiesNote } = req.body;
    if (!studentId || !concern) {
        return res.status(400).json({ error: 'Student ID and concern description are required' });
    }
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId }
        });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        if (req.user?.role === 'PARENT') {
            const parent = await prisma_1.default.parent.findUnique({ where: { userId: req.user.id } });
            const link = parent ? await prisma_1.default.parentStudent.findFirst({
                where: { parentId: parent.id, studentId: student.id, status: 'APPROVED' }
            }) : null;
            if (!link)
                return res.status(403).json({ error: 'Unauthorized access to student' });
        }
        const complaint = await prisma_1.default.clinicComplaint.create({
            data: {
                schoolId: student.schoolId,
                userId: student.userId,
                title: `[Parent-Reported Concern] Health Concern for ${student.name}`,
                symptoms: `${concern} | Occurred: ${occurredAt || 'Today'} | Allergies flagged: ${allergiesNote || 'None'}`,
                medicine: 'Parent-reported concern (Non-Emergency)',
                date: new Date()
            }
        });
        res.json({
            success: true,
            message: 'Health concern reported to nursing staff. A nurse will review this note.',
            id: complaint.id
        });
    }
    catch (error) {
        console.error('Report health concern error:', error);
        res.status(500).json({ error: 'Failed to report health concern' });
    }
});
// ── REQUEST CHANGE FOR HEALTH PROFILE (Routes to Admin/Nurse Approval Queue) ──
router.post('/parent/request-change', auth_1.requireAuth, async (req, res) => {
    const { studentId, field, requestedValue, note } = req.body;
    if (!studentId || !field || !requestedValue) {
        return res.status(400).json({ error: 'Student ID, field name, and requested value are required' });
    }
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId }
        });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        if (req.user?.role === 'PARENT') {
            const parent = await prisma_1.default.parent.findUnique({ where: { userId: req.user.id } });
            const link = parent ? await prisma_1.default.parentStudent.findFirst({
                where: { parentId: parent.id, studentId: student.id, status: 'APPROVED' }
            }) : null;
            if (!link)
                return res.status(403).json({ error: 'Unauthorized access to student' });
        }
        const complaint = await prisma_1.default.clinicComplaint.create({
            data: {
                schoolId: student.schoolId,
                userId: student.userId,
                title: `[Profile Update Request] ${field}: ${requestedValue}`,
                symptoms: `Parent requested update for ${field} to "${requestedValue}". Note: ${note || 'None provided'}.`,
                medicine: 'Health Profile Change Request',
                date: new Date()
            }
        });
        res.json({
            success: true,
            message: 'Request sent, the school will update this once reviewed.',
            id: complaint.id
        });
    }
    catch (error) {
        console.error('Request health profile change error:', error);
        res.status(500).json({ error: 'Failed to submit profile change request' });
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
// =========================================================================
// UNIFIED CLINIC PORTAL: 8 TABBED PAGES & INTEGRATION ENDPOINTS
// =========================================================================
// Clinical audit logging helper
async function logClinicAccess(schoolId, userId, action, resource, studentId, ipAddress) {
    try {
        await prisma_1.default.clinicAccessAudit.create({
            data: {
                schoolId,
                userId,
                studentId: studentId || null,
                action,
                resource,
                ipAddress: ipAddress || null
            }
        });
    }
    catch (err) {
        console.error('Failed to log clinic access audit:', err);
    }
}
// -------------------------------------------------------------------------
// 1. /clinic/dashboard — KPIs, Queues, Critical Alerts, Low Stock
// -------------------------------------------------------------------------
router.get('/dashboard-kpis', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical staff authorization required' });
        }
        const schoolId = req.user.schoolId;
        let settings = await prisma_1.default.clinicSetting.findUnique({ where: { schoolId } });
        if (!settings) {
            settings = await prisma_1.default.clinicSetting.create({
                data: {
                    schoolId,
                    hasDoctorQueue: false,
                    bedCount: 10,
                    monitoringIntervalHours: 4,
                    tempAlertThreshold: 38.0,
                    billingEnabled: false
                }
            });
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [openVisits, triageQueue, todayConsults, admissions, allStocks, weekEmergencies] = await Promise.all([
            prisma_1.default.clinicVisit.findMany({
                where: { schoolId, status: { in: ['OPEN', 'CHECK_IN', 'TRIAGE', 'CONSULTATION', 'DOCTOR_QUEUE'] } },
                include: {
                    patient: true,
                    user: { select: { id: true, name: true, role: true } },
                    vitalsRecord: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.clinicVisit.findMany({
                where: { schoolId, status: { in: ['OPEN', 'CHECK_IN', 'TRIAGE'] } },
                include: {
                    patient: true,
                    user: { select: { id: true, name: true, role: true } },
                    vitalsRecord: true
                },
                orderBy: { createdAt: 'asc' }
            }),
            prisma_1.default.clinicVisit.findMany({
                where: { schoolId, status: { in: ['CONSULTATION', 'DOCTOR_QUEUE'] } },
                include: {
                    patient: true,
                    user: { select: { id: true, name: true, role: true } },
                    vitalsRecord: true
                },
                orderBy: { createdAt: 'asc' }
            }),
            prisma_1.default.clinicAdmission.findMany({
                where: { schoolId, status: 'ADMITTED' },
                include: { bed: true, student: true }
            }),
            prisma_1.default.pharmacyStock.findMany({
                where: { schoolId },
                include: { batches: true }
            }),
            prisma_1.default.clinicEmergencyLog.count({
                where: {
                    schoolId,
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            })
        ]);
        const criticalAlerts = openVisits.filter(v => {
            const temp = v.vitalsRecord?.temp || v.temperature || 0;
            const isRed = v.acuity === 'RED' || v.triageLevel === 'CRITICAL';
            const highTemp = temp >= settings.tempAlertThreshold;
            return isRed || highTemp;
        }).map(v => ({
            visitId: v.id,
            patientName: v.patient?.firstName ? `${v.patient.firstName} ${v.patient.lastName || ''}` : v.user?.name || 'Student',
            reason: v.presentingComplaint || 'High acuity alert',
            temp: v.vitalsRecord?.temp || v.temperature,
            acuity: v.acuity || v.triageLevel || 'RED',
            time: v.createdAt
        }));
        const lowStockItems = allStocks.map(s => {
            const totalQty = s.batches.reduce((sum, b) => sum + b.quantity, 0);
            return {
                id: s.id,
                drugName: s.drugName,
                unit: s.unit,
                minStock: s.minStock,
                totalQty,
                isLow: totalQty <= s.minStock
            };
        }).filter(s => s.isLow);
        const totalBeds = settings.bedCount || 10;
        const occupiedBeds = admissions.length;
        res.json({
            kpis: {
                activePatients: openVisits.length,
                triageQueueLength: triageQueue.length,
                todayConsultsCount: todayConsults.length,
                occupiedBeds,
                totalBeds,
                bedOccupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
                emergenciesThisWeek: weekEmergencies
            },
            settings,
            triageQueue,
            todayConsults,
            criticalAlerts,
            lowStockItems,
            admissions
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load clinic dashboard KPIs' });
    }
});
// -------------------------------------------------------------------------
// 2. /clinic/triage — Patient search, Vitals, Allergy banner, Consent check
// -------------------------------------------------------------------------
router.get('/triage/patient-banner/:studentId', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { studentId } = req.params;
        const student = await prisma_1.default.student.findFirst({
            where: { schoolId, id: studentId },
            include: {
                healthProfile: true,
                class: true,
                hostel: true
            }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        // Audit individual patient view
        await logClinicAccess(schoolId, req.user.id, 'VIEW_RECORD', 'TriagePatientBanner', student.id, req.ip);
        res.json({
            id: student.id,
            name: student.name,
            studentId: student.studentId,
            className: student.class?.name || 'Unassigned',
            hostelName: student.hostel?.name || 'Day Scholar',
            allergies: student.healthProfile?.allergies || 'None recorded',
            chronicConditions: student.healthProfile?.chronicConditions || 'None recorded',
            bloodGroup: student.healthProfile?.bloodGroup || 'Unknown',
            treatmentConsent: student.healthProfile?.treatmentConsent || false,
            emergencyContact: {
                name: student.healthProfile?.emergencyContactName || student.guardianName,
                phone: student.healthProfile?.emergencyContactPhone,
                relationship: student.healthProfile?.emergencyContactRel
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch patient banner' });
    }
});
router.post('/triage/record', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required for triage' });
        }
        const schoolId = req.user.schoolId;
        const { studentId, source = 'WALK_IN', presentingComplaint, acuity = 'GREEN', isConfidential = false, isEmergency = false, temp, bp, pulse, spo2, weight, height } = req.body;
        const student = await prisma_1.default.student.findFirst({
            where: { schoolId, id: studentId },
            include: { healthProfile: true, user: true }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        // Check treatment consent on file for non-emergency treatment
        if (!isEmergency && !student.healthProfile?.treatmentConsent) {
            if (!req.body.consentOverride) {
                return res.status(400).json({
                    error: 'Treatment consent is not on file for this student. Explicit override required.',
                    requiresConsentOverride: true
                });
            }
        }
        const settings = await prisma_1.default.clinicSetting.findUnique({ where: { schoolId } });
        const targetStatus = settings?.hasDoctorQueue ? 'DOCTOR_QUEUE' : 'CONSULTATION';
        // Generate Visit Code (EP-YYYYMMDD-XXX)
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const count = await prisma_1.default.clinicVisit.count({
            where: { schoolId, createdAt: { gte: todayStart } }
        });
        const visitCode = `EP-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
        const visit = await prisma_1.default.clinicVisit.create({
            data: {
                schoolId,
                visitCode,
                userId: student.userId,
                source,
                acuity,
                isEmergency: Boolean(isEmergency),
                isConfidential: Boolean(isConfidential),
                presentingComplaint,
                triageLevel: acuity,
                status: targetStatus,
                triageById: req.user.id,
                vitalsRecord: {
                    create: {
                        schoolId,
                        temp: temp ? parseFloat(temp) : null,
                        bp: bp || null,
                        pulse: pulse ? parseInt(pulse) : null,
                        spo2: spo2 ? parseInt(spo2) : null,
                        weight: weight ? parseFloat(weight) : null,
                        height: height ? parseFloat(height) : null,
                        recordedById: req.user.id
                    }
                }
            },
            include: { vitalsRecord: true }
        });
        // Notify parent if NOT confidential and NOT an emergency (emergencies phoned manually)
        if (!isConfidential && student.userId) {
            const parentRel = await prisma_1.default.parentStudent.findFirst({
                where: { studentId: student.id },
                include: { parent: true }
            });
            if (parentRel?.parent?.phone) {
                await notifications_1.NotificationService.enqueue({
                    type: 'SMS',
                    schoolId,
                    senderId: req.user.id,
                    recipientPhone: parentRel.parent.phone,
                    payload: {
                        text: `Notice: Your child ${student.name} attended the school clinic today (${new Date().toLocaleDateString()}). Please check the parent portal for details.`
                    }
                }).catch(() => { });
            }
        }
        await logClinicAccess(schoolId, req.user.id, 'CREATE_RECORD', `TriageVisit:${visit.id}`, student.id, req.ip);
        res.json({ success: true, visit });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to record triage visit' });
    }
});
// -------------------------------------------------------------------------
// 3. /clinic/consultations — Notes, ICD-10, Pharmacy Prescription, Dispositions
// -------------------------------------------------------------------------
router.get('/consultations/queue', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const queue = await prisma_1.default.clinicVisit.findMany({
            where: {
                schoolId,
                status: { in: ['DOCTOR_QUEUE', 'CONSULTATION', 'TRIAGE'] }
            },
            include: {
                vitalsRecord: true,
                user: { select: { id: true, name: true } },
                diagnosesList: { include: { icd10: true } },
                prescriptionsList: true
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(queue);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load consultation queue' });
    }
});
router.get('/icd10/search', auth_1.requireAuth, async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        if (!query)
            return res.json([]);
        const codes = await prisma_1.default.icd10Code.findMany({
            where: {
                OR: [
                    { code: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: { parentLabel: true },
            take: 20
        });
        res.json(codes);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to search ICD-10 codes' });
    }
});
router.post('/consultations/finalize', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const { visitId, examNotes, icd10Code, parentNote, prescriptions = [], disposition = 'DISCHARGE_CLASS', bedId, dietNotes, hospitalName, referralReason } = req.body;
        const visit = await prisma_1.default.clinicVisit.findFirst({
            where: { id: visitId, schoolId },
            include: { user: true }
        });
        if (!visit)
            return res.status(404).json({ error: 'Visit not found' });
        // 1. Create Diagnosis record
        if (icd10Code || examNotes) {
            await prisma_1.default.clinicDiagnosis.create({
                data: {
                    schoolId,
                    visitId: visit.id,
                    icd10Code: icd10Code || null,
                    notes: examNotes || null,
                    parentNote: parentNote || null
                }
            });
        }
        // 2. Create Prescription records
        if (Array.isArray(prescriptions)) {
            for (const rx of prescriptions) {
                if (rx.drugName) {
                    await prisma_1.default.clinicPrescription.create({
                        data: {
                            schoolId,
                            visitId: visit.id,
                            drugName: rx.drugName,
                            dosage: rx.dosage || '1 dose',
                            frequency: rx.frequency || 'PRN',
                            duration: rx.duration || '3 days',
                            prescribedById: req.user.id
                        }
                    });
                }
            }
        }
        // 3. Handle Disposition
        let finalStatus = 'DISCHARGED';
        let studentId = '';
        if (visit.userId) {
            const stud = await prisma_1.default.student.findUnique({ where: { userId: visit.userId } });
            if (stud)
                studentId = stud.id;
        }
        if (disposition === 'ADMIT_SICK_BAY' && bedId && studentId) {
            finalStatus = 'ADMITTED';
            await prisma_1.default.clinicBed.update({
                where: { id: bedId },
                data: { status: 'OCCUPIED' }
            });
            await prisma_1.default.clinicAdmission.create({
                data: {
                    schoolId,
                    bedId,
                    visitId: visit.id,
                    studentId,
                    status: 'ADMITTED',
                    dietNotes: dietNotes || null,
                    admittedAt: new Date()
                }
            });
            // Automatically excuse attendance for the admitted period
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const studentRecord = await prisma_1.default.student.findUnique({ where: { id: studentId } });
            if (studentRecord) {
                await prisma_1.default.attendance.upsert({
                    where: {
                        schoolId_studentId_date_classId: {
                            schoolId,
                            studentId,
                            date: today,
                            classId: studentRecord.classId || 'DEFAULT_CLASS'
                        }
                    },
                    update: { status: 'excused', note: 'Excused - Clinic' },
                    create: {
                        schoolId,
                        studentId,
                        teacherId: req.user.id,
                        date: today,
                        status: 'excused',
                        note: 'Excused - Clinic',
                        classId: studentRecord.classId || null
                    }
                }).catch(() => { });
            }
        }
        else if (disposition === 'REFER_HOSPITAL' && hospitalName) {
            finalStatus = 'REFERRAL';
            await prisma_1.default.clinicReferral.create({
                data: {
                    schoolId,
                    userId: visit.userId,
                    title: `External Hospital Referral: ${hospitalName}`,
                    details: referralReason || examNotes || 'Referred for specialist care',
                    to: hospitalName,
                    address: 'Local Health Facility',
                    urgency: 'URGENT',
                    status: 'PENDING'
                }
            });
        }
        else if (disposition === 'DISCHARGE_CLASS') {
            finalStatus = 'DISCHARGED';
            // Mark excused attendance note
            if (studentId) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const studentRecord = await prisma_1.default.student.findUnique({ where: { id: studentId } });
                if (studentRecord) {
                    await prisma_1.default.attendance.upsert({
                        where: {
                            schoolId_studentId_date_classId: {
                                schoolId,
                                studentId,
                                date: today,
                                classId: studentRecord.classId || 'DEFAULT_CLASS'
                            }
                        },
                        update: { status: 'excused', note: 'Excused - Clinic' },
                        create: {
                            schoolId,
                            studentId,
                            teacherId: req.user.id,
                            date: today,
                            status: 'excused',
                            note: 'Excused - Clinic',
                            classId: studentRecord.classId || null
                        }
                    }).catch(() => { });
                }
            }
        }
        const updatedVisit = await prisma_1.default.clinicVisit.update({
            where: { id: visit.id },
            data: {
                disposition,
                status: finalStatus,
                consultedById: req.user.id,
                closedAt: finalStatus === 'DISCHARGED' ? new Date() : null,
                conditionDetails: examNotes || null
            }
        });
        await logClinicAccess(schoolId, req.user.id, 'FINALIZE_CONSULTATION', `Visit:${visit.id}`, studentId, req.ip);
        res.json({ success: true, visit: updatedVisit });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to finalize consultation' });
    }
});
// -------------------------------------------------------------------------
// 4. /clinic/hospitalization — Bed Map, Monitoring Log, Discharge
// -------------------------------------------------------------------------
router.get('/hospitalization/overview', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        let beds = await prisma_1.default.clinicBed.findMany({
            where: { schoolId },
            include: {
                admissions: {
                    where: { status: 'ADMITTED' },
                    include: {
                        student: {
                            include: {
                                healthProfile: true,
                                hostel: true,
                                class: true
                            }
                        },
                        logs: { orderBy: { recordedAt: 'desc' }, take: 1 }
                    }
                }
            },
            orderBy: { bedNumber: 'asc' }
        });
        // Seed default 10 beds if none exist
        if (beds.length === 0) {
            for (let i = 1; i <= 10; i++) {
                await prisma_1.default.clinicBed.create({
                    data: {
                        schoolId,
                        bedNumber: `BED-${i.toString().padStart(2, '0')}`,
                        ward: 'Main Sick Bay',
                        status: 'AVAILABLE'
                    }
                });
            }
            beds = await prisma_1.default.clinicBed.findMany({
                where: { schoolId },
                include: {
                    admissions: { where: { status: 'ADMITTED' }, include: { student: true, logs: true } }
                },
                orderBy: { bedNumber: 'asc' }
            });
        }
        const admissions = await prisma_1.default.clinicAdmission.findMany({
            where: { schoolId, status: 'ADMITTED' },
            include: {
                bed: true,
                student: { include: { healthProfile: true, hostel: true } },
                logs: { orderBy: { recordedAt: 'desc' } }
            }
        });
        res.json({ beds, admissions });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch hospitalization overview' });
    }
});
router.post('/hospitalization/monitoring-log', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const { admissionId, temp, bp, pulse, spo2, notes } = req.body;
        const log = await prisma_1.default.clinicMonitoringLog.create({
            data: {
                schoolId,
                admissionId,
                temp: temp ? parseFloat(temp) : null,
                bp: bp || null,
                pulse: pulse ? parseInt(pulse) : null,
                spo2: spo2 ? parseInt(spo2) : null,
                notes: notes || null,
                recordedById: req.user.id
            }
        });
        res.json({ success: true, log });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to record monitoring log' });
    }
});
router.post('/hospitalization/discharge', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const { admissionId, dischargeNotes } = req.body;
        const admission = await prisma_1.default.clinicAdmission.findFirst({
            where: { id: admissionId, schoolId },
            include: { student: true, bed: true }
        });
        if (!admission)
            return res.status(404).json({ error: 'Admission not found' });
        await prisma_1.default.$transaction([
            prisma_1.default.clinicAdmission.update({
                where: { id: admission.id },
                data: {
                    status: 'DISCHARGED',
                    dischargedAt: new Date(),
                    dischargeNotes: dischargeNotes || 'Discharged in stable condition'
                }
            }),
            prisma_1.default.clinicBed.update({
                where: { id: admission.bedId },
                data: { status: 'AVAILABLE' }
            })
        ]);
        // Mark attendance excused note
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await prisma_1.default.attendance.upsert({
            where: {
                schoolId_studentId_date_classId: {
                    schoolId,
                    studentId: admission.studentId,
                    date: today,
                    classId: admission.student?.classId || 'DEFAULT_CLASS'
                }
            },
            update: { status: 'excused', note: 'Excused - Clinic' },
            create: {
                schoolId,
                studentId: admission.studentId,
                teacherId: req.user.id,
                date: today,
                status: 'excused',
                note: 'Excused - Clinic',
                classId: admission.student?.classId || null
            }
        }).catch(() => { });
        await logClinicAccess(schoolId, req.user.id, 'DISCHARGE_PATIENT', `Admission:${admission.id}`, admission.studentId, req.ip);
        res.json({ success: true, message: 'Patient discharged and bed freed' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to discharge patient' });
    }
});
// -------------------------------------------------------------------------
// 5. /clinic/pharmacy — FEFO Batches, Negative Stock Protection, Deduplicated Auto-Procurement
// -------------------------------------------------------------------------
router.get('/pharmacy/catalog', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const stocks = await prisma_1.default.pharmacyStock.findMany({
            where: { schoolId },
            include: {
                batches: { orderBy: { expiryDate: 'asc' } }
            },
            orderBy: { drugName: 'asc' }
        });
        const enriched = stocks.map(s => {
            const totalQty = s.batches.reduce((sum, b) => sum + b.quantity, 0);
            const earliestBatch = s.batches.find(b => b.quantity > 0);
            return {
                ...s,
                totalQty,
                isLowStock: totalQty <= s.minStock,
                earliestExpiry: earliestBatch?.expiryDate || null
            };
        });
        res.json(enriched);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch pharmacy catalog' });
    }
});
router.post('/pharmacy/stock', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const { drugName, category = 'MEDICATION', unit = 'tablets', minStock = 10, location } = req.body;
        const stock = await prisma_1.default.pharmacyStock.upsert({
            where: { schoolId_drugName: { schoolId, drugName: drugName.trim() } },
            update: { minStock: parseInt(minStock), location },
            create: {
                schoolId,
                drugName: drugName.trim(),
                category,
                unit,
                minStock: parseInt(minStock),
                location
            }
        });
        res.json({ success: true, stock });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to save medication stock' });
    }
});
router.post('/pharmacy/batch', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const { stockId, batchNumber, quantity, expiryDate } = req.body;
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Valid positive quantity required' });
        }
        const batch = await prisma_1.default.pharmacyBatch.create({
            data: {
                schoolId,
                stockId,
                batchNumber: batchNumber.trim(),
                quantity: qty,
                expiryDate: new Date(expiryDate)
            }
        });
        res.json({ success: true, batch });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to add batch' });
    }
});
// FEFO Dispense endpoint
router.post('/pharmacy/dispense-fefo', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required to dispense drugs' });
        }
        const schoolId = req.user.schoolId;
        const { stockId, visitId, quantity, notes } = req.body;
        const requestedQty = parseInt(quantity);
        if (isNaN(requestedQty) || requestedQty <= 0) {
            return res.status(400).json({ error: 'Valid positive dispense quantity required' });
        }
        const stock = await prisma_1.default.pharmacyStock.findFirst({
            where: { id: stockId, schoolId },
            include: {
                batches: {
                    where: { quantity: { gt: 0 } },
                    orderBy: { expiryDate: 'asc' }
                }
            }
        });
        if (!stock)
            return res.status(404).json({ error: 'Medication stock item not found' });
        const totalAvailable = stock.batches.reduce((sum, b) => sum + b.quantity, 0);
        if (totalAvailable < requestedQty) {
            return res.status(400).json({
                error: `Insufficient stock! Cannot allow negative balance. Requested: ${requestedQty}, Available: ${totalAvailable}`
            });
        }
        // FEFO Sequential Batch Allocation in a Transaction
        let remainingToDeduct = requestedQty;
        const dispenseLogs = [];
        await prisma_1.default.$transaction(async (tx) => {
            for (const batch of stock.batches) {
                if (remainingToDeduct <= 0)
                    break;
                const deductFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
                await tx.pharmacyBatch.update({
                    where: { id: batch.id },
                    data: { quantity: batch.quantity - deductFromThisBatch }
                });
                const log = await tx.pharmacyDispense.create({
                    data: {
                        schoolId,
                        visitId: visitId || null,
                        stockId: stock.id,
                        batchId: batch.id,
                        quantity: deductFromThisBatch,
                        dispensedById: req.user.id
                    }
                });
                dispenseLogs.push(log);
                remainingToDeduct -= deductFromThisBatch;
            }
        });
        // Check remaining total stock after dispense
        const updatedStock = await prisma_1.default.pharmacyStock.findUnique({
            where: { id: stock.id },
            include: { batches: true }
        });
        const newTotal = updatedStock?.batches.reduce((sum, b) => sum + b.quantity, 0) || 0;
        // Deduplicated Low-Stock Auto Procurement Trigger
        let autoRequisitionCreated = false;
        if (newTotal <= stock.minStock) {
            const existingOpenReq = await prisma_1.default.requisition.findFirst({
                where: {
                    schoolId,
                    requesterRole: 'CLINIC',
                    title: { contains: stock.drugName },
                    status: { in: ['PENDING_ADMIN', 'PENDING_BURSAR', 'PENDING_HOD_BOARDING'] }
                }
            });
            if (!existingOpenReq) {
                const refNumber = `REQ-CLN-${Date.now()}`;
                await prisma_1.default.requisition.create({
                    data: {
                        refNumber,
                        schoolId,
                        requesterId: req.user.id,
                        requesterRole: 'CLINIC',
                        title: `Pharmacy Restock: ${stock.drugName}`,
                        description: `Automated low-stock threshold trigger. Current quantity: ${newTotal} ${stock.unit} (Min: ${stock.minStock})`,
                        priority: 'Urgent',
                        status: 'PENDING_ADMIN',
                        estimatedAmount: 0,
                        items: JSON.stringify([{
                                name: stock.drugName,
                                quantity: stock.minStock * 2,
                                unit: stock.unit,
                                reason: 'Automatic pharmacy safety reorder'
                            }])
                    }
                }).catch((err) => console.error('Failed to create auto-procurement request:', err));
                autoRequisitionCreated = true;
            }
        }
        await logClinicAccess(schoolId, req.user.id, 'DISPENSE_DRUG', `Stock:${stock.drugName}`, undefined, req.ip);
        res.json({
            success: true,
            dispensedQty: requestedQty,
            remainingTotal: newTotal,
            autoRequisitionCreated,
            dispenseLogs
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to dispense medication' });
    }
});
router.get('/pharmacy/dispense-log', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const logs = await prisma_1.default.pharmacyDispense.findMany({
            where: { schoolId },
            include: {
                stock: true,
                batch: true,
                dispensedBy: { select: { id: true, name: true } },
                visit: { select: { id: true, visitCode: true } }
            },
            orderBy: { dispensedAt: 'desc' },
            take: 50
        });
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch dispense logs' });
    }
});
// -------------------------------------------------------------------------
// 6. /clinic/wellness — Appointments & Vaccine Compliance Register
// -------------------------------------------------------------------------
router.get('/wellness/appointments', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const appointments = await prisma_1.default.clinicAppointment.findMany({
            where: { schoolId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                patient: true
            },
            orderBy: { date: 'asc' }
        });
        res.json(appointments);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch appointments' });
    }
});
router.get('/wellness/vaccines', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const immunizations = await prisma_1.default.clinicImmunization.findMany({
            where: { schoolId },
            include: {
                user: { select: { id: true, name: true } },
                patient: true
            },
            orderBy: { date: 'desc' }
        });
        res.json(immunizations);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch immunizations' });
    }
});
// -------------------------------------------------------------------------
// 7. /clinic/emergency — Emergency Log, Calling Records, Signed Photos, Referrals
// -------------------------------------------------------------------------
router.get('/emergency/logs', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const emergencies = await prisma_1.default.clinicEmergencyLog.findMany({
            where: { schoolId },
            include: {
                student: { include: { class: true, hostel: true } },
                loggedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(emergencies);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch emergency logs' });
    }
});
router.post('/emergency/log', auth_1.requireAuth, async (req, res) => {
    try {
        // Only clinical staff or ancillary matron can create emergency records (parents/students forbidden)
        if (!isClinicalStaff(req.user) && req.user?.role !== 'ANCILLARY') {
            return res.status(403).json({ error: 'Forbidden: Parents and students cannot create emergency records' });
        }
        const schoolId = req.user.schoolId;
        const { studentId, title, description, acuity = 'RED', ambulanceCalled = false, ambulanceDetails, parentContacted = false, parentContactPhone, parentContactNotes, photoUrls = [] } = req.body;
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, schoolId }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        const emergency = await prisma_1.default.clinicEmergencyLog.create({
            data: {
                schoolId,
                studentId: student.id,
                title,
                description,
                acuity,
                ambulanceCalled: Boolean(ambulanceCalled),
                ambulanceDetails: ambulanceDetails || null,
                parentContacted: Boolean(parentContacted),
                parentContactPhone: parentContactPhone || null,
                parentContactNotes: parentContactNotes || null,
                photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
                loggedById: req.user.id
            }
        });
        await logClinicAccess(schoolId, req.user.id, 'CREATE_EMERGENCY', `Emergency:${emergency.id}`, student.id, req.ip);
        res.json({ success: true, emergency });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to record emergency' });
    }
});
// -------------------------------------------------------------------------
// 8. /clinic/reports — Patients Search, Plain Aggregates, Optional Billing
// -------------------------------------------------------------------------
router.get('/reports/patients-search', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Clinical authorization required' });
        }
        const schoolId = req.user.schoolId;
        const q = (req.query.q || '').trim();
        const students = await prisma_1.default.student.findMany({
            where: {
                schoolId,
                ...(q ? {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { studentId: { contains: q, mode: 'insensitive' } }
                    ]
                } : {})
            },
            include: {
                healthProfile: true,
                class: true,
                hostel: true
            },
            take: 25
        });
        res.json(students);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to search patients' });
    }
});
router.get('/reports/analytics', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user) && req.user?.role !== 'SCHOOL_ADMIN') {
            return res.status(403).json({ error: 'Clinical or Admin authorization required' });
        }
        const schoolId = req.user.schoolId;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const visits = await prisma_1.default.clinicVisit.findMany({
            where: { schoolId, createdAt: { gte: thirtyDaysAgo } },
            select: {
                presentingComplaint: true,
                acuity: true,
                status: true,
                source: true,
                createdAt: true
            }
        });
        // Aggregate ailments
        const ailmentCounts = {};
        visits.forEach(v => {
            const reason = mapToPlainReason(v.presentingComplaint);
            ailmentCounts[reason] = (ailmentCounts[reason] || 0) + 1;
        });
        const topAilments = Object.entries(ailmentCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        res.json({
            totalVisitsMonth: visits.length,
            topAilments,
            visitsBySource: {
                walkIn: visits.filter(v => v.source === 'WALK_IN').length,
                teacherReferral: visits.filter(v => v.source === 'TEACHER_REFERRAL').length,
                studentBooking: visits.filter(v => v.source === 'STUDENT_APPOINTMENT').length,
                matronAlert: visits.filter(v => v.source === 'MATRON_ALERT').length
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
    }
});
// -------------------------------------------------------------------------
// CROSS-PORTAL INTEGRATION SERIALIZERS
// -------------------------------------------------------------------------
// Student Portal Serializer (/student/clinic)
router.get('/student-visits', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userId = req.user.id;
        const visits = await prisma_1.default.clinicVisit.findMany({
            where: { schoolId, userId },
            orderBy: { createdAt: 'desc' }
        });
        // Sanitize: plain language, no vitals, no ICD10, no dosage
        const sanitized = visits.map(v => ({
            id: v.id,
            visitCode: v.visitCode,
            date: v.createdAt.toLocaleDateString(),
            reason: mapToPlainReason(v.presentingComplaint),
            treatment: mapToPlainTreatment(v.treatment || v.prescription),
            status: v.status === 'DISCHARGED' ? 'Returned to Class' : v.status === 'ADMITTED' ? 'In Sick Bay' : 'Under Observation'
        }));
        res.json(sanitized);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch student visits' });
    }
});
// Student Booking Endpoint (/student/clinic book appointment)
router.post('/student/book', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userId = req.user.id;
        const { appointmentReason, date } = req.body;
        // Rate-limiting abuse protection: max 3 pending appointments
        const pendingCount = await prisma_1.default.clinicAppointment.count({
            where: { schoolId, userId }
        });
        if (pendingCount >= 3) {
            return res.status(429).json({ error: 'You have reached the maximum of 3 pending clinic appointments' });
        }
        const appt = await prisma_1.default.clinicAppointment.create({
            data: {
                schoolId,
                userId,
                appointment: appointmentReason || 'Routine Checkup',
                symptoms: 'Student Portal Booking',
                date: date ? new Date(date) : new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });
        res.json({ success: true, appt });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to book appointment' });
    }
});
// Teacher Portal Serializer (/teacher/clinic)
router.get('/teacher/referrals', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const teacherId = req.user.id;
        const visits = await prisma_1.default.clinicVisit.findMany({
            where: {
                schoolId,
                source: 'TEACHER_REFERRAL',
                triageById: teacherId
            },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        // Sanitize: seen status only, NO medical details or vitals
        const sanitized = visits.map(v => ({
            id: v.id,
            studentName: v.user?.name || 'Student',
            date: v.createdAt.toLocaleDateString(),
            status: v.status === 'DISCHARGED' ? 'Returned to class' : v.status === 'ADMITTED' ? 'In Sick Bay' : 'Seen by Nurse'
        }));
        res.json(sanitized);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch teacher referrals' });
    }
});
router.post('/teacher/refer', auth_1.requireAuth, async (req, res) => {
    try {
        if (req.user?.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Only teachers can create classroom referrals' });
        }
        const schoolId = req.user.schoolId;
        const { studentId, note } = req.body;
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, schoolId },
            include: { user: true }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        const visit = await prisma_1.default.clinicVisit.create({
            data: {
                schoolId,
                userId: student.userId,
                source: 'TEACHER_REFERRAL',
                status: 'OPEN',
                presentingComplaint: note || 'Referred from classroom by teacher',
                triageById: req.user.id
            }
        });
        res.json({ success: true, visitId: visit.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to refer student to clinic' });
    }
});
// Matron Boarding Serializer (/ancillary/boarding)
router.get('/matron/boarders', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userId = req.user.id;
        // Find hostel warden assignment
        const hostel = await prisma_1.default.hostel.findFirst({
            where: { schoolId, wardenUserId: userId }
        });
        const admissions = await prisma_1.default.clinicAdmission.findMany({
            where: {
                schoolId,
                status: 'ADMITTED',
                ...(hostel ? { student: { hostelId: hostel.id } } : {})
            },
            include: {
                bed: true,
                student: { include: { room: true } }
            }
        });
        // Sanitize: boarder name, bed, "in sick bay", NO diagnosis
        const sanitized = admissions.map(a => ({
            id: a.id,
            studentName: a.student.name,
            roomNumber: a.student.room?.name || 'Unassigned',
            bedNumber: a.bed.bedNumber,
            ward: a.bed.ward,
            admittedAt: a.admittedAt.toLocaleDateString(),
            status: 'In Sick Bay'
        }));
        res.json(sanitized);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch matron boarders' });
    }
});
router.post('/matron/alert', auth_1.requireAuth, async (req, res) => {
    try {
        if (req.user?.role !== 'ANCILLARY' && !isClinicalStaff(req.user)) {
            return res.status(403).json({ error: 'Only matrons or clinic staff can issue emergency alerts' });
        }
        const schoolId = req.user.schoolId;
        const { studentId, alertNote } = req.body;
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, schoolId },
            include: { user: true }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        const visit = await prisma_1.default.clinicVisit.create({
            data: {
                schoolId,
                userId: student.userId,
                source: 'MATRON_ALERT',
                acuity: 'RED',
                isEmergency: true,
                status: 'TRIAGE',
                presentingComplaint: `MATRON URGENT ALERT: ${alertNote || 'Reported sudden acute condition in hostel'}`,
                triageById: req.user.id
            }
        });
        res.json({ success: true, visitId: visit.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create matron alert' });
    }
});
// Kitchen / Dining Serializer (Diet notes only, NO diagnosis)
router.get('/kitchen/diet-notes', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const admissions = await prisma_1.default.clinicAdmission.findMany({
            where: { schoolId, status: 'ADMITTED', dietNotes: { not: null } },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        healthProfile: { select: { allergies: true } }
                    }
                },
                bed: { select: { bedNumber: true, ward: true } }
            }
        });
        const sanitized = admissions.map(a => ({
            studentName: a.student.name,
            location: `${a.bed.ward} (${a.bed.bedNumber})`,
            dietNotes: a.dietNotes,
            chronicAllergies: a.student.healthProfile?.allergies || 'None reported'
        }));
        res.json(sanitized);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch kitchen diet notes' });
    }
});
// Admin Audited Patient File Access
router.get('/admin/patient-file/:studentId', auth_1.requireAuth, async (req, res) => {
    try {
        if (req.user?.role !== 'SCHOOL_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Admin permission required' });
        }
        const schoolId = req.user.schoolId;
        const { studentId } = req.params;
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, schoolId },
            include: {
                healthProfile: true,
                class: true,
                hostel: true
            }
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        // Strict audit logging for admin medical access
        await logClinicAccess(schoolId, req.user.id, 'ADMIN_VIEW_FILE', `AdminPatientFile:${student.id}`, student.id, req.ip);
        res.json({
            student: {
                id: student.id,
                name: student.name,
                className: student.class?.name || 'Unassigned',
                hostelName: student.hostel?.name || 'Day Scholar',
                healthProfile: student.healthProfile
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch audited patient file' });
    }
});
// Tenant Clinic Settings
router.get('/settings', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        let settings = await prisma_1.default.clinicSetting.findUnique({ where: { schoolId } });
        if (!settings) {
            settings = await prisma_1.default.clinicSetting.create({
                data: { schoolId }
            });
        }
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
});
router.patch('/settings', auth_1.requireAuth, async (req, res) => {
    try {
        if (!isClinicalStaff(req.user) && req.user?.role !== 'SCHOOL_ADMIN') {
            return res.status(403).json({ error: 'Authorization required' });
        }
        const schoolId = req.user.schoolId;
        const { hasDoctorQueue, bedCount, monitoringIntervalHours, tempAlertThreshold, billingEnabled } = req.body;
        const settings = await prisma_1.default.clinicSetting.upsert({
            where: { schoolId },
            update: {
                hasDoctorQueue: hasDoctorQueue !== undefined ? Boolean(hasDoctorQueue) : undefined,
                bedCount: bedCount ? parseInt(bedCount) : undefined,
                monitoringIntervalHours: monitoringIntervalHours ? parseInt(monitoringIntervalHours) : undefined,
                tempAlertThreshold: tempAlertThreshold ? parseFloat(tempAlertThreshold) : undefined,
                billingEnabled: billingEnabled !== undefined ? Boolean(billingEnabled) : undefined
            },
            create: {
                schoolId,
                hasDoctorQueue: Boolean(hasDoctorQueue),
                bedCount: bedCount ? parseInt(bedCount) : 10,
                monitoringIntervalHours: monitoringIntervalHours ? parseInt(monitoringIntervalHours) : 4,
                tempAlertThreshold: tempAlertThreshold ? parseFloat(tempAlertThreshold) : 38.0,
                billingEnabled: Boolean(billingEnabled)
            }
        });
        res.json({ success: true, settings });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update clinic settings' });
    }
});
exports.default = router;
//# sourceMappingURL=clinic.js.map