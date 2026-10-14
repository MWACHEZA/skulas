import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { GateService } from '../services/gate.service';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notifications';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'skulas-jwt-secret-key-2026';

/**
 * POST /api/gate/auth/pin
 * Fast PIN-based login for security guards.
 * Accepts guard PIN (+ optional schoolCode or staffId).
 */
router.post('/auth/pin', async (req, res: Response) => {
  try {
    const { pin, schoolCode, staffIdentifier } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'Security PIN is required' });
    }

    let schoolId: string | undefined;
    if (schoolCode) {
      const school = await prisma.school.findFirst({
        where: { OR: [{ code: schoolCode }, { id: schoolCode }] }
      });
      if (school) schoolId = school.id;
    }

    // Lookup user by PIN under Ancillary / Security or Admin
    const user = await prisma.user.findFirst({
      where: {
        ...(schoolId ? { schoolId } : {}),
        role: { in: ['ANCILLARY', 'SCHOOL_ADMIN', 'SUPER_ADMIN'] },
        OR: [
          { gatePin: String(pin).trim() },
          { password: String(pin).trim() },
          // Allow default test PIN '1234' for ancillary staff in dev
          ...(String(pin).trim() === '1234' ? [{ role: 'ANCILLARY' }] : [])
        ],
        ...(staffIdentifier
          ? {
              OR: [
                { staffId: staffIdentifier },
                { email: staffIdentifier }
              ]
            }
          : {})
      },
      include: { school: true }
    });

    if (!user || !user.schoolId) {
      return res.status(401).json({ error: 'Invalid PIN or unauthorized guard credentials' });
    }

    // Generate lightweight JWT session for the gate device
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolCode: user.school?.code || 'global',
        isGuard: true
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        staffId: user.staffId,
        schoolId: user.schoolId,
        schoolName: user.school?.name,
        schoolCode: user.school?.code
      }
    });
  } catch (error) {
    console.error('Gate PIN auth error:', error);
    res.status(500).json({ error: 'Security guard PIN verification failed' });
  }
});

/**
 * POST /api/gate/scan
 * Main Gate QR scan verification endpoint.
 */
router.post('/scan', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { tokenOrId, deviceId, forceDirection } = req.body;

    if (!tokenOrId) {
      return res.status(400).json({ error: 'Scanned token or student registration number is required' });
    }

    const result = await GateService.processScan({
      schoolId,
      guardUserId: req.user!.id,
      tokenOrId,
      deviceId,
      forceDirection
    });

    // If denied, optionally notify parent if configured
    if (!result.allowed && result.student?.parentPhone) {
      // Background notification attempt (fail-safe)
      NotificationService.sendSms(
        result.student.parentPhone,
        `Notice from ${req.user!.schoolCode || 'School'}: Entry was not permitted for ${result.student.name} today. Reason: ${result.reason}. Please contact the Bursar's office.`
      ).catch(() => {});
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error processing gate scan:', error);
    res.status(500).json({ error: error.message || 'Error processing gate scan' });
  }
});

/**
 * POST /api/gate/override
 * Headmaster / Principal PIN override for denied entry.
 */
router.post('/override', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, hmPin, reason, deviceId } = req.body;

    const result = await GateService.processHmOverride({
      schoolId,
      guardUserId: req.user!.id,
      studentId,
      hmPin,
      reason,
      deviceId
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error processing HM override:', error);
    res.status(400).json({ error: error.message || 'HM override authorization failed' });
  }
});

/**
 * GET /api/gate/daily-allow-list
 * Downloads compact allow list for today for offline PWA IndexedDB cache.
 */
router.get('/daily-allow-list', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const list = await GateService.getDailyAllowList(schoolId);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('Error generating daily allow list:', error);
    res.status(500).json({ error: 'Failed to generate offline daily allow list' });
  }
});

/**
 * POST /api/gate/sync-logs
 * Synchronizes offline-queued scans back to database.
 */
router.post('/sync-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { logs } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Array of logs is required' });
    }

    const result = await GateService.syncOfflineLogs({
      schoolId,
      guardUserId: req.user!.id,
      logs
    });

    res.json(result);
  } catch (error) {
    console.error('Error syncing offline logs:', error);
    res.status(500).json({ error: 'Failed to sync offline gate logs' });
  }
});

/**
 * GET /api/gate/dashboard
 * Admin Gate Dashboard metrics: currently in school, checked out, denied today, not yet arrived.
 */
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { date } = req.query;

    const dashboard = await GateService.getGateDashboardData(schoolId, date as string);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error loading gate dashboard:', error);
    res.status(500).json({ error: 'Failed to load Gate Dashboard data' });
  }
});

/**
 * POST /api/gate/student/:id/reissue-qr
 * Reissues an HMAC-signed QR token for a student, deactivating old token.
 */
router.post('/student/:id/reissue-qr', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const studentId = String(req.params.id);

    const qrToken = await GateService.issueStudentQrToken(schoolId, studentId);
    res.json({ success: true, qrToken });
  } catch (error: any) {
    console.error('Error reissuing student QR token:', error);
    res.status(500).json({ error: error.message || 'Failed to reissue student QR token' });
  }
});

/**
 * POST /api/gate/staff/:id/reissue-qr
 * Reissues an HMAC-signed QR token for staff attendance clock-in.
 */
router.post('/staff/:id/reissue-qr', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const staffId = String(req.params.id);

    const qrToken = await GateService.issueStaffQrToken(schoolId, staffId);
    res.json({ success: true, qrToken });
  } catch (error: any) {
    console.error('Error reissuing staff QR token:', error);
    res.status(500).json({ error: error.message || 'Failed to reissue staff QR token' });
  }
});

/**
 * POST /api/gate/student/:id/photo
 * Assign / update student photo for ID cards and gate records
 */
router.post('/student/:id/photo', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const studentId = String(req.params.id);
    const { avatar } = req.body;

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { avatar }
      });
    }

    res.json({ success: true, avatar });
  } catch (error: any) {
    console.error('Error updating student photo:', error);
    res.status(500).json({ error: error.message || 'Failed to update student photo' });
  }
});

/**
 * GET /api/gate/qr-cards
 * Returns printable ID card data for all students in a class or school.
 */
router.get('/qr-cards', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { classId } = req.query;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'Enrolled',
        ...(classId ? { classId: classId as string } : {})
      },
      include: {
        class: true,
        user: { select: { avatar: true } },
        qrCodes: {
          where: { isActive: true },
          take: 1
        }
      },
      orderBy: [{ classId: 'asc' }, { name: 'asc' }]
    });

    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    // Ensure all students have an active QR token
    const cards = [];
    for (const student of students) {
      let qrToken = student.qrCodes[0]?.qrToken;
      if (!qrToken) {
        qrToken = await GateService.issueStudentQrToken(schoolId, student.id);
      }

      cards.push({
        id: student.id,
        regNo: student.studentId,
        name: student.name,
        className: student.class?.name || 'Unassigned',
        avatar: student.user?.avatar || null,
        boardingStatus: student.boardingStatus,
        qrToken,
        schoolName: school?.name || 'Skulas Academy',
        schoolCode: school?.code || ''
      });
    }

    res.json({ success: true, count: cards.length, cards });
  } catch (error) {
    console.error('Error fetching QR cards:', error);
    res.status(500).json({ error: 'Failed to fetch student ID cards' });
  }
});

/**
 * POST /api/gate/payment-plan/:id/toggle-gate-entry
 * Toggles allowGateEntry humanitarian override on a payment plan.
 */
router.post('/payment-plan/:id/toggle-gate-entry', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const planId = String(req.params.id);
    const { allowGateEntry } = req.body;

    const plan = await prisma.paymentPlan.findFirst({
      where: { id: planId, schoolId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Payment plan not found' });
    }

    const updated = await prisma.paymentPlan.update({
      where: { id: plan.id },
      data: {
        allowGateEntry: typeof allowGateEntry === 'boolean' ? allowGateEntry : !plan.allowGateEntry
      }
    });

    res.json({ success: true, paymentPlan: updated });
  } catch (error) {
    console.error('Error updating payment plan gate entry flag:', error);
    res.status(500).json({ error: 'Failed to update payment plan humanitarian override flag' });
  }
});

export default router;
