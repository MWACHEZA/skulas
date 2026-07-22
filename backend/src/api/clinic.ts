import express, { Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

// Helper to check user scope for fetching records
async function getAccessibleUserIds(req: AuthRequest): Promise<string[] | null> {
  const user = req.user!;
  if (['SCHOOL_ADMIN', 'SUPER_ADMIN', 'CLINIC'].includes(user.role)) {
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
  const { appointment, symptoms, medicine, date, targetUserId } = req.body;
  try {
    const newAppointment = await prisma.clinicAppointment.create({
      data: {
        appointment,
        symptoms,
        medicine: medicine || null,
        date: date ? new Date(date) : new Date(),
        userId: targetUserId || req.user!.id,
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
  const { title, symptoms, date, medicine, targetUserId } = req.body;
  try {
    const newComplaint = await prisma.clinicComplaint.create({
      data: {
        title,
        symptoms,
        date: date ? new Date(date) : new Date(),
        medicine: medicine || null,
        userId: targetUserId || req.user!.id,
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
  const { title, details, date, time } = req.body;
  try {
    const newEmergency = await prisma.clinicEmergency.create({
      data: {
        title,
        details,
        date: date ? new Date(date) : new Date(),
        time: time || new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
        schoolId: req.user!.schoolId!
      }
    });
    res.json(newEmergency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create emergency record' });
  }
});

router.delete('/emergencies/:id', requireAuth, async (req: AuthRequest, res: Response) => {
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
  const { title, details, date, targetUserId } = req.body;
  try {
    const newImmunization = await prisma.clinicImmunization.create({
      data: {
        title,
        details,
        date: date ? new Date(date) : new Date(),
        userId: targetUserId || req.user!.id,
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
  const { title, details, date, to, address, targetUserId } = req.body;
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

    const newReferral = await prisma.clinicReferral.create({
      data: {
        title,
        details,
        date: date ? new Date(date) : new Date(),
        to,
        address,
        userId: targetUserId || req.user!.id,
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
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clinic visits' });
  }
});

router.post('/visits', requireAuth, async (req: AuthRequest, res: Response) => {
  const { 
    targetUserId, temperature, bloodPressure, heartRate, respiratoryRate, 
    weight, height, oxygenSaturation, presentingComplaint, triageLevel, 
    conditionDetails, diagnosis, treatment, prescription, notes, status, visitDate 
  } = req.body;
  try {
    const visit = await prisma.clinicVisit.create({
      data: {
        userId: targetUserId || req.user!.id,
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
    res.json(visit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create clinic visit' });
  }
});

// ── PATIENT HISTORY ──
router.get('/patient/:id/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id as string;
    // Basic auth check
    const accessibleIds = await getAccessibleUserIds(req);
    if (accessibleIds && !accessibleIds.includes(targetUserId)) {
       return res.status(403).json({ error: 'Forbidden' });
    }

    const [visits, appointments, complaints, immunizations, referrals] = await Promise.all([
      prisma.clinicVisit.findMany({ where: { userId: targetUserId, schoolId: req.user!.schoolId! }, orderBy: { visitDate: 'desc' } }),
      prisma.clinicAppointment.findMany({ where: { userId: targetUserId, schoolId: req.user!.schoolId! }, orderBy: { date: 'desc' } }),
      prisma.clinicComplaint.findMany({ where: { userId: targetUserId, schoolId: req.user!.schoolId! }, orderBy: { date: 'desc' } }),
      prisma.clinicImmunization.findMany({ where: { userId: targetUserId, schoolId: req.user!.schoolId! }, orderBy: { date: 'desc' } }),
      prisma.clinicReferral.findMany({ where: { userId: targetUserId, schoolId: req.user!.schoolId! }, orderBy: { date: 'desc' } })
    ]);

    res.json({
      visits,
      appointments,
      complaints,
      immunizations,
      referrals
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
});

export default router;
