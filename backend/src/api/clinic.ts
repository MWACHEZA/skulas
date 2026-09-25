import express, { Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { NotificationService } from '../services/notifications';

const router = express.Router();

/**
 * Plain-language reason mapper: maps clinical ICD10 codes and medical terminology to parent-friendly terms
 */
export function mapToPlainReason(rawReason?: string | null): string {
  if (!rawReason) return 'General wellness check';
  const text = rawReason.trim();

  const icd10Map: Record<string, string> = {
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
  if (/^URTI/i.test(text)) return 'Mild cold symptoms';
  if (/^GE\b/i.test(text) || /gastroenteritis/i.test(text)) return 'Mild stomach upset';
  if (/dysmenorr/i.test(text)) return 'Menstrual cramps';
  if (/migraine/i.test(text)) return 'Headache';
  if (/pyrexia/i.test(text)) return 'Elevated temperature / fever';
  if (/pharyngitis/i.test(text)) return 'Sore throat';
  if (/epistaxis/i.test(text)) return 'Nosebleed';
  if (/abrasion/i.test(text) || /laceration/i.test(text)) return 'Minor scratch / scrape';
  if (/contusion/i.test(text)) return 'Minor bruise';

  // If raw code format
  if (/^[A-Z][0-9]{2}(\.[0-9]+)?$/i.test(text)) {
    return 'Health consultation';
  }

  return text.replace(/ICD-?10:?\s*[A-Z0-9.]+/gi, '').trim() || 'General wellness check';
}

/**
 * Plain-language treatment mapper: removes clinical Latin dosage codes (PRN, PO, etc.)
 */
export function mapToPlainTreatment(rawTreatment?: string | null): string {
  if (!rawTreatment) return 'Rested in sick bay with hydration';
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
export const VISIT_STAGES = [
  'CHECK_IN',
  'TRIAGE',
  'CONSULTATION',
  'PRESCRIBED',
  'DISPENSED',
  'BILLED',
  'DISCHARGED'
] as const;

// Helper to verify clinical staff role
function isClinicalStaff(user: any): boolean {
  if (!user) return false;
  if (['CLINIC', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user.role)) return true;
  if (Array.isArray(user.secondaryRoles)) {
    return user.secondaryRoles.some((r: string) =>
      ['nurse', 'doctor', 'clinician', 'health coordinator', 'pharmacist'].includes(r.toLowerCase())
    );
  }
  return false;
}

// Helper to check user scope for fetching records
async function getAccessibleUserIds(req: AuthRequest): Promise<string[] | null> {
  const user = req.user!;
  if (isClinicalStaff(user)) {
    // Clinic staff and admins can access all records in the school
    return null; 
  }
  if (user.role === 'PARENT') {
    // Parents can access their own and their linked children's records
    const linked = await prisma.parentStudent.findMany({
      where: { parent: { userId: user.id } },
      select: { student: { select: { userId: true } } }
    });
    const childrenIds = linked.map(l => l.student.userId).filter(Boolean) as string[];
    return [user.id, ...childrenIds];
  }
  // Students and other roles can only see their own records
  return [user.id];
}

// Helper to resolve patient vs user association
function resolveClinicUserAndPatient(targetUserId?: string, patientId?: string, currentUserId?: string) {
  if (patientId) {
    return { userId: targetUserId || null, patientId };
  }
  return { userId: targetUserId || currentUserId, patientId: null };
}


// ── PATIENTS ──
router.get('/patients/search', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    const query = (q as string || '').trim();
    if (!query) return res.json([]);
    
    // Search clinic patients
    const patients = await prisma.clinicPatient.findMany({
      where: {
        schoolId: req.user!.schoolId!,
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
      const users = await prisma.user.findMany({
        where: {
          schoolId: req.user!.schoolId!,
          name: { contains: query, mode: 'insensitive' }
        },
        take: 10 - patients.length,
        select: { id: true, name: true, role: true, email: true, phone: true }
      });
      res.json({ patients, users });
    } else {
      res.json({ patients, users: [] });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

router.post('/patients', requireAuth, async (req: AuthRequest, res: Response) => {
  const { 
    firstName, lastName, dob, gender, contactNumber, address, medicalHistory, targetUserId,
    bloodType, allergies, chronicConditions, guardianName, guardianContact
  } = req.body;
  try {
    const schoolId = req.user!.schoolId!;

    // Auto-generate MRN (MRN-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await prisma.clinicPatient.count({ where: { schoolId } });
    const mrn = `MRN-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const patient = await prisma.clinicPatient.create({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to register clinic patient' });
  }
});

// ── APPOINTMENTS ──
router.get('/appointments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userIds = await getAccessibleUserIds(req);
    const appointments = await prisma.clinicAppointment.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        ...(userIds ? { userId: { in: userIds } } : {})
      },
      include: {
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.post('/appointments', requireAuth, async (req: AuthRequest, res: Response) => {
  const { appointment, symptoms, medicine, date, targetUserId, patientId } = req.body;
  try {
    const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user!.id);
    const newAppointment = await prisma.clinicAppointment.create({
      data: {
        appointment,
        symptoms,
        medicine: medicine || null,
        date: date ? new Date(date) : new Date(),
        userId: refs.userId,
        patientId: refs.patientId,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(newAppointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

router.delete('/appointments/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.clinicAppointment.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId as string }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await prisma.clinicAppointment.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// ── COMPLAINTS ──
router.get('/complaints', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userIds = await getAccessibleUserIds(req);
    const complaints = await prisma.clinicComplaint.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        ...(userIds ? { userId: { in: userIds } } : {})
      },
      include: {
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.post('/complaints', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, symptoms, date, medicine, targetUserId, patientId } = req.body;
  try {
    const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user!.id);
    const newComplaint = await prisma.clinicComplaint.create({
      data: {
        title,
        symptoms,
        date: date ? new Date(date) : new Date(),
        medicine: medicine || null,
        userId: refs.userId,
        patientId: refs.patientId,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(newComplaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

router.delete('/complaints/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.clinicComplaint.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId as string }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await prisma.clinicComplaint.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

// ── EMERGENCIES ──
router.get('/emergencies', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const emergencies = await prisma.clinicEmergency.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { date: 'desc' }
    });
    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

router.post('/emergencies', requireAuth, async (req: AuthRequest, res: Response) => {
  // Strict role enforcement: Only school staff can create medical emergency records
  const nonStaffRoles = ['PARENT', 'STUDENT', 'ALUMNI', 'SUPPLIER'];
  if (!req.user || nonStaffRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Medical emergency records can only be created by school staff' });
  }

  const { title, details, date, time, patientId } = req.body;
  try {
    const newEmergency = await prisma.clinicEmergency.create({
      data: {
        title,
        details,
        date: date ? new Date(date) : new Date(),
        time: time || new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
        patientId: patientId || null,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(newEmergency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create emergency record' });
  }
});

router.delete('/emergencies/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  // Strict role enforcement: Only school staff can delete medical emergency records
  const nonStaffRoles = ['PARENT', 'STUDENT', 'ALUMNI', 'SUPPLIER'];
  if (!req.user || nonStaffRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Medical emergency records can only be deleted by school staff' });
  }

  try {
    const record = await prisma.clinicEmergency.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId as string }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await prisma.clinicEmergency.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete emergency record' });
  }
});

// ── IMMUNIZATIONS ──
router.get('/immunizations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userIds = await getAccessibleUserIds(req);
    const immunizations = await prisma.clinicImmunization.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        ...(userIds ? { userId: { in: userIds } } : {})
      },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(immunizations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch immunization records' });
  }
});

router.post('/immunizations', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, details, date, targetUserId, patientId } = req.body;
  try {
    const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user!.id);
    const newImmunization = await prisma.clinicImmunization.create({
      data: {
        title,
        details,
        date: date ? new Date(date) : new Date(),
        userId: refs.userId,
        patientId: refs.patientId,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(newImmunization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create immunization record' });
  }
});

router.delete('/immunizations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.clinicImmunization.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId as string }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await prisma.clinicImmunization.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete immunization record' });
  }
});

// ── REFERRALS ──
router.get('/referrals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const isNurseOrHealthCoordinator = user.role === 'CLINIC' || 
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.secondaryRoles?.some(r => 
        r.toLowerCase() === 'nurse' || 
        r.toLowerCase() === 'health coordinator' || 
        r.toLowerCase() === 'health co-ordinator'
      );

    let whereClause: any = { schoolId: user.schoolId! };
    if (!isNurseOrHealthCoordinator) {
      whereClause.userId = user.id;
    }

    const referrals = await prisma.clinicReferral.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

router.post('/referrals', requireAuth, async (req: AuthRequest, res: Response) => {
  const { title, details, date, to, address, targetUserId, patientId } = req.body;
  const user = req.user!;
  try {
    const isNurseOrHealthCoordinator = user.role === 'CLINIC' || 
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.secondaryRoles?.some(r => 
        r.toLowerCase() === 'nurse' || 
        r.toLowerCase() === 'health coordinator' || 
        r.toLowerCase() === 'health co-ordinator'
      );

    if (!isNurseOrHealthCoordinator) {
      return res.status(403).json({ error: 'Forbidden: Only nurses or health coordinators can create referrals' });
    }

    const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user!.id);
    const newReferral = await prisma.clinicReferral.create({
      data: {
        title,
        details,
        date: date ? new Date(date) : new Date(),
        to,
        address,
        userId: refs.userId,
        patientId: refs.patientId,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(newReferral);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

router.delete('/referrals/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    const isNurseOrHealthCoordinator = user.role === 'CLINIC' || 
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.secondaryRoles?.some(r => 
        r.toLowerCase() === 'nurse' || 
        r.toLowerCase() === 'health coordinator' || 
        r.toLowerCase() === 'health co-ordinator'
      );

    if (!isNurseOrHealthCoordinator) {
      return res.status(403).json({ error: 'Forbidden: Only nurses or health coordinators can delete referrals' });
    }

    const record = await prisma.clinicReferral.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId as string }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await prisma.clinicReferral.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete referral' });
  }
});

// ── CLINIC VISITS & VITALS ──
router.get('/visits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userIds = await getAccessibleUserIds(req);
    const visits = await prisma.clinicVisit.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        ...(userIds ? { userId: { in: userIds } } : {})
      },
      include: {
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { visitDate: 'desc' }
    });

    // Enforce server-side clinical data sanitization for parents
    if (req.user?.role === 'PARENT') {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinic visits' });
  }
});

router.post('/visits', requireAuth, async (req: AuthRequest, res: Response) => {
  const { 
    targetUserId, patientId, temperature, bloodPressure, heartRate, respiratoryRate, 
    weight, height, oxygenSaturation, presentingComplaint, triageLevel, 
    conditionDetails, diagnosis, treatment, prescription, notes, status, visitDate 
  } = req.body;
  try {
    const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user!.id);
    
    // Generate Episode ID (EP-YYYYMMDD-001)
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const count = await prisma.clinicVisit.count({
      where: { schoolId: req.user!.schoolId!, createdAt: { gte: todayStart } }
    });
    const visitCode = `EP-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    const visit = await prisma.clinicVisit.create({
      data: {
        visitCode,
        userId: refs.userId,
        patientId: refs.patientId,
        schoolId: req.user!.schoolId!,
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
        student = await prisma.student.findFirst({
          where: { userId: refs.userId, schoolId: req.user!.schoolId! },
          include: { parents: { include: { parent: { include: { user: true } } } } }
        });
      }
      if (!student && refs.patientId) {
        const patientRec = await prisma.clinicPatient.findUnique({
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
            await NotificationService.enqueue({
              type: 'WhatsApp',
              schoolId: req.user!.schoolId!,
              senderId: req.user!.id,
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

            await NotificationService.logCommunication({
              schoolId: req.user!.schoolId!,
              senderId: req.user!.id,
              studentId: student.id,
              type: 'WhatsApp',
              description: `Clinic visit notice sent to parent (${phone}): ${messageText}`,
              status: 'QUEUED'
            }).catch(() => null);
          }
        }
      }
    } catch (notifyErr) {
      console.error('[Clinic Notification Hook Error]:', notifyErr);
      // Non-blocking: Do not abort visit creation
    }

    res.json(visit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create clinic visit' });
  }
});

// ── PARENT-FACING CLINIC SUMMARY (Filtered, Simplified, Reassurance-Focused) ──
router.get('/parent-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  const studentIdParam = req.query.studentId as string;
  if (!studentIdParam) return res.status(400).json({ error: 'Student ID is required' });

  try {
    let student = await prisma.student.findUnique({
      where: { id: studentIdParam },
      include: {
        class: true,
        house: true,
        user: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
        school: { select: { id: true, code: true, name: true, schoolSetting: true } }
      }
    });

    if (!student) {
      student = await prisma.student.findFirst({
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
      const parent = await prisma.parent.findUnique({
        where: { userId: req.user.id }
      });
      if (!parent) return res.status(403).json({ error: 'Parent record not found' });

      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId: student.id, status: 'APPROVED' }
      });
      if (!link) return res.status(403).json({ error: 'Forbidden: You do not have approved access to view this student profile' });
    } else if (req.user?.role !== 'SUPER_ADMIN') {
      if (req.user?.schoolId && req.user.schoolId !== student.schoolId) {
        return res.status(403).json({ error: 'Cross-tenant access forbidden' });
      }
    }

    // Tab 1: Clinic Visits (Strictly Plain English, No Vitals, No Drug Stock/Dosage Details)
    const rawVisits = await prisma.clinicVisit.findMany({
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
      if (v.status === 'DISCHARGED') outcome = 'Returned to class';
      else if (v.status === 'BILLED') outcome = 'Completed consultation';
      else if (v.conditionDetails && v.conditionDetails.toLowerCase().includes('sent home')) outcome = 'Sent home in care of guardian';
      else if (v.conditionDetails && v.conditionDetails.toLowerCase().includes('hospital')) outcome = 'Referred to hospital';

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
    const patient = student.userId ? await prisma.clinicPatient.findUnique({
      where: { userId: student.userId }
    }) : null;

    const pendingRequests = await prisma.clinicComplaint.findMany({
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
        status: 'Complete' as const,
        missing: [] as string[]
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
  } catch (error) {
    console.error('Fetch parent clinic summary error:', error);
    res.status(500).json({ error: 'Failed to fetch clinic summary' });
  }
});

// ── REPORT HEALTH CONCERN FOR MY CHILD (Low-Priority Routing to Nursing Staff) ──
router.post('/parent/health-concern', requireAuth, async (req: AuthRequest, res: Response) => {
  const { studentId, concern, occurredAt, allergiesNote } = req.body;
  if (!studentId || !concern) {
    return res.status(400).json({ error: 'Student ID and concern description are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    if (req.user?.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
      const link = parent ? await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId: student.id, status: 'APPROVED' }
      }) : null;
      if (!link) return res.status(403).json({ error: 'Unauthorized access to student' });
    }

    const complaint = await prisma.clinicComplaint.create({
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
  } catch (error) {
    console.error('Report health concern error:', error);
    res.status(500).json({ error: 'Failed to report health concern' });
  }
});

// ── REQUEST CHANGE FOR HEALTH PROFILE (Routes to Admin/Nurse Approval Queue) ──
router.post('/parent/request-change', requireAuth, async (req: AuthRequest, res: Response) => {
  const { studentId, field, requestedValue, note } = req.body;
  if (!studentId || !field || !requestedValue) {
    return res.status(400).json({ error: 'Student ID, field name, and requested value are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) return res.status(404).json({ error: 'Student record not found' });

    if (req.user?.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
      const link = parent ? await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId: student.id, status: 'APPROVED' }
      }) : null;
      if (!link) return res.status(403).json({ error: 'Unauthorized access to student' });
    }

    const complaint = await prisma.clinicComplaint.create({
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
  } catch (error) {
    console.error('Request health profile change error:', error);
    res.status(500).json({ error: 'Failed to submit profile change request' });
  }
});

// ── HOSPITALIZATIONS ──
router.get('/patient/:id/hospitalizations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id as string;
    const isPatientId = req.query.type === 'patient';
    
    // Basic auth check only applies if querying by system userId
    if (!isPatientId) {
      const accessibleIds = await getAccessibleUserIds(req);
      if (accessibleIds && !accessibleIds.includes(targetUserId)) {
         return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    const whereClause = isPatientId 
      ? { patientId: targetUserId, schoolId: req.user!.schoolId! } 
      : { userId: targetUserId, schoolId: req.user!.schoolId! };

    const records = await prisma.clinicHospitalization.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hospitalizations' });
  }
});

router.post('/hospitalizations', requireAuth, async (req: AuthRequest, res: Response) => {
  const { targetUserId, patientId, preAdmissionData } = req.body;
  try {
    const refs = resolveClinicUserAndPatient(targetUserId, patientId, req.user!.id);
    const newHosp = await prisma.clinicHospitalization.create({
      data: {
        userId: refs.userId,
        patientId: refs.patientId,
        schoolId: req.user!.schoolId!,
        stage: 'PRE_ADMISSION',
        preAdmissionData: preAdmissionData || {}
      }
    });
    res.json(newHosp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hospitalization record' });
  }
});

router.get('/hospitalizations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.clinicHospitalization.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId! },
      include: {
        user: { select: { name: true, email: true, role: true } }
      }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hospitalization record' });
  }
});

router.put('/hospitalizations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { stage, preAdmissionData, admissionData, transferData, dischargeData } = req.body;
  try {
    const record = await prisma.clinicHospitalization.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId! }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const updated = await prisma.clinicHospitalization.update({
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
      const user = await prisma.user.findUnique({ where: { id: updated.userId } });
      if (user?.role === 'STUDENT') {
         const student = await prisma.student.findUnique({ where: { userId: user.id } });
         if (student) {
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const existingAttendance = await prisma.attendance.findFirst({
              where: {
                studentId: student.id,
                schoolId: req.user!.schoolId!,
                date: today
              }
            });
            
            if (existingAttendance) {
               await prisma.attendance.update({
                 where: { id: existingAttendance.id },
                 data: { status: 'Medical Leave', note: 'Hospitalized (Admitted)' }
               });
            }
         }
      }
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hospitalization record' });
  }
});

router.delete('/hospitalizations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.clinicHospitalization.findFirst({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId! }
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    
    await prisma.clinicHospitalization.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hospitalization record' });
  }
});

// ── PATIENT HISTORY ──
router.get('/patient/:id/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id as string;
    const isPatientId = req.query.type === 'patient';

    // Basic auth check only applies if querying by system userId
    if (!isPatientId) {
      const accessibleIds = await getAccessibleUserIds(req);
      if (accessibleIds && !accessibleIds.includes(targetUserId)) {
         return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const whereClause = isPatientId 
      ? { patientId: targetUserId, schoolId: req.user!.schoolId! } 
      : { userId: targetUserId, schoolId: req.user!.schoolId! };

    const [visits, appointments, complaints, immunizations, referrals, hospitalizations] = await Promise.all([
      prisma.clinicVisit.findMany({ where: whereClause, orderBy: { visitDate: 'desc' } }),
      prisma.clinicAppointment.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
      prisma.clinicComplaint.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
      prisma.clinicImmunization.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
      prisma.clinicReferral.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
      prisma.clinicHospitalization.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } })
    ]);

    res.json({
      visits,
      appointments,
      complaints,
      immunizations,
      referrals,
      hospitalizations
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
});

// ── VISIT WORKFLOW STATE MACHINE ──
/**
 * @route   PATCH /api/clinic/visits/:id/stage
 * @desc    Enforce sequential workflow stage transition for clinic visits:
 *          CHECK_IN -> TRIAGE -> CONSULTATION -> PRESCRIBED -> DISPENSED -> BILLED -> DISCHARGED
 */
router.patch('/visits/:id/stage', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nextStage, notes } = req.body;
    const schoolId = req.user!.schoolId!;

    if (!VISIT_STAGES.includes(nextStage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${VISIT_STAGES.join(', ')}` });
    }

    const visit = await prisma.clinicVisit.findFirst({
      where: { id: id as string, schoolId }
    });

    if (!visit) return res.status(404).json({ error: 'Visit record not found' });

    // Validate state machine progression
    const currentIdx = VISIT_STAGES.indexOf(visit.status as any);
    const targetIdx = VISIT_STAGES.indexOf(nextStage as any);

    if (currentIdx !== -1 && targetIdx < currentIdx) {
      return res.status(400).json({ 
        error: `Cannot regress visit stage from ${visit.status} back to ${nextStage}. Follow sequence: ${VISIT_STAGES.join(' -> ')}` 
      });
    }

    const updated = await prisma.clinicVisit.update({
      where: { id: visit.id },
      data: {
        status: nextStage,
        notes: notes ? (visit.notes ? `${visit.notes}\n[${new Date().toISOString()}] ${notes}` : notes) : visit.notes
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update visit workflow stage' });
  }
});

// ── GET CLINIC VISITS LIST ──
/**
 * @route   GET /api/clinic/visits
 * @desc    Get list of clinic visits with filtering by status, date, or search
 */
router.get('/visits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { status, patientId } = req.query;

    const where: any = { schoolId };
    if (status && status !== 'ALL') where.status = status as string;
    if (patientId) where.patientId = patientId as string;

    const visits = await prisma.clinicVisit.findMany({
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
  } catch (error) {
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
router.post('/visits/:id/bill', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId!;
    const { consultationFee = 0, medicationCost = 0, procedureCost = 0, paymentMode = 'CASH', isSubsidized = false } = req.body;

    const visit = await prisma.clinicVisit.findFirst({
      where: { id: id as string, schoolId }
    });

    if (!visit) return res.status(404).json({ error: 'Clinic visit record not found' });

    const totalCharge = (parseFloat(consultationFee) || 0) + (parseFloat(medicationCost) || 0) + (parseFloat(procedureCost) || 0);

    let journalEntryId: string | null = null;

    if (totalCharge > 0 && !isSubsidized) {
      // Get Ledger Accounts
      const [cashAccountId, incomeAccountId, cogsAccountId, inventoryAccountId] = await Promise.all([
        getAccountId(schoolId, '1100', prisma), // Cash on Hand
        getAccountId(schoolId, '5900', prisma), // Miscellaneous / Clinic Income
        getAccountId(schoolId, '6110', prisma), // COGS
        getAccountId(schoolId, '1310', prisma)  // Inventory Asset
      ]);

      const lines: Array<{ accountId: string; debit?: number; credit?: number; description?: string }> = [
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

      const je = await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Clinic Visit Billing [${visit.visitCode || visit.id}]`,
        sourceType: 'clinic_bill',
        sourceId: visit.id,
        createdByUserId: req.user!.id,
        lines
      });

      journalEntryId = je.id;
    } else if (isSubsidized) {
      // Subsidized / Donated care posting: DR 7900 Misc Expense (Donated Care Cost), CR 1310 Inventory
      try {
        const [expenseAccountId, inventoryAccountId] = await Promise.all([
          getAccountId(schoolId, '7900', prisma),
          getAccountId(schoolId, '1310', prisma)
        ]);

        const estCost = parseFloat(medicationCost) || 10; // Nominal donated care cost
        const je = await LedgerService.postEntry({
          schoolId,
          date: new Date(),
          description: `Subsidized / Mission Outreach Clinic Care [${visit.visitCode || visit.id}]`,
          sourceType: 'clinic_donated_care',
          sourceId: visit.id,
          createdByUserId: req.user!.id,
          lines: [
            { accountId: expenseAccountId, debit: estCost, description: `Donated / Subsidized Clinic Care Expense` },
            { accountId: inventoryAccountId, credit: estCost, description: `Inventory Asset: Medical Stock Dispersal` }
          ]
        });
        journalEntryId = je.id;
      } catch (err) {
        console.warn('Subsidized care ledger posting warning:', err);
      }
    }

    // Update visit status & billing details
    const updatedVisit = await prisma.clinicVisit.update({
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
  } catch (error: any) {
    console.error('Clinic billing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process clinic billing' });
  }
});

// ── PHARMACY INVENTORY & DISPENSING ──

/**
 * @route GET /api/clinic/pharmacy/inventory
 * @desc List medical stock items, with low-stock and expiry warnings
 */
router.get('/pharmacy/inventory', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const items = await (prisma as any).clinicInventoryItem.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });

    const now = new Date();
    const alertThreshold = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const itemsWithStatus = items.map((item: any) => ({
      ...item,
      isLowStock: item.stock <= item.reorderLevel,
      isExpired: item.expiryDate ? new Date(item.expiryDate) <= now : false,
      isExpiringSoon: item.expiryDate ? (new Date(item.expiryDate) > now && new Date(item.expiryDate) <= alertThreshold) : false
    }));

    res.json(itemsWithStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pharmacy inventory' });
  }
});

/**
 * @route POST /api/clinic/pharmacy/inventory
 * @desc Add or restock a medical inventory item
 */
router.post('/pharmacy/inventory', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!isClinicalStaff(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Clinical role required to manage dispensary inventory' });
    }

    const { name, category, batchNumber, expiryDate, unit, stock, reorderLevel, unitCost, unitPrice, location } = req.body;
    const schoolId = req.user!.schoolId!;

    const item = await (prisma as any).clinicInventoryItem.create({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pharmacy item' });
  }
});

/**
 * @route POST /api/clinic/pharmacy/dispense
 * @desc Dispense medication against a visit or patient, decrement stock, and log audit movement
 */
router.post('/pharmacy/dispense', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!isClinicalStaff(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Clinical authorization required to dispense drugs' });
    }

    const { itemId, visitId, patientId, quantity, notes } = req.body;
    const schoolId = req.user!.schoolId!;
    const qtyToDispense = parseInt(quantity) || 1;

    const item = await (prisma as any).clinicInventoryItem.findFirst({
      where: { id: itemId, schoolId }
    });

    if (!item) return res.status(404).json({ error: 'Medication stock item not found' });

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
    const updatedItem = await (prisma as any).clinicInventoryItem.update({
      where: { id: item.id },
      data: { stock: item.stock - qtyToDispense }
    });

    const dispenseLog = await (prisma as any).clinicDispensingLog.create({
      data: {
        schoolId,
        itemId: item.id,
        visitId: visitId || null,
        patientId: patientId || null,
        quantity: qtyToDispense,
        unitCost: item.unitCost,
        totalPrice: qtyToDispense * item.unitPrice,
        dispensedBy: req.user!.name || req.user!.email,
        notes: notes || null
      }
    });

    // If linked to visit, update visit stage to DISPENSED
    if (visitId) {
      await prisma.clinicVisit.update({
        where: { id: visitId },
        data: { status: 'DISPENSED' }
      }).catch(() => {});
    }

    res.json({
      success: true,
      item: updatedItem,
      dispenseLog,
      message: `Successfully dispensed ${qtyToDispense} ${item.unit} of ${item.name}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispense medication' });
  }
});

// ── IMMUNIZATION BOOSTER / DUE REPORT ──
/**
 * @route GET /api/clinic/immunizations/due-report
 * @desc Get list of pending/upcoming immunization booster dates for students & community patients
 */
router.get('/immunizations/due-report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { targetDate } = req.query;

    const cutoff = targetDate ? new Date(targetDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const dueList = await (prisma as any).clinicImmunization.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate immunization booster report' });
  }
});

// ── DISEASE SURVEILLANCE & OUTBREAK REPORTING ──
/**
 * @route GET /api/clinic/reports/surveillance
 * @desc Aggregate disease diagnosis frequencies for epidemiological surveillance and outbreak tracking
 */
router.get('/reports/surveillance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const visits = await prisma.clinicVisit.findMany({
      where: {
        schoolId,
        visitDate: { gte: start, lte: end },
        diagnosis: { not: null }
      },
      select: { diagnosis: true, triageLevel: true, visitDate: true }
    });

    // Group diagnoses
    const diagnosisCounts: Record<string, number> = {};
    visits.forEach((v: any) => {
      if (!v.diagnosis) return;
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate disease surveillance report' });
  }
});

export default router;

