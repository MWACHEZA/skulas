import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { BursarService } from '../services/bursar.service';

const router = Router();

function getSchoolId(req: AuthRequest): string {
  const schoolId = req.user?.schoolId || (req.query.schoolId as string) || (req.headers['x-school-id'] as string);
  if (!schoolId) {
    throw new Error('School ID is required');
  }
  return schoolId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Get Approvals for Parent (Categorized & Module-Aware)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId } = req.query;

    let targetStudentIds: string[] = [];

    if (studentId && typeof studentId === 'string') {
      targetStudentIds = [studentId];
    } else if (req.user?.id) {
      // Find students linked to this parent user
      const studentLinks = await prisma.parentStudent.findMany({
        where: { parentId: req.user.id },
        select: { studentId: true }
      });
      targetStudentIds = studentLinks.map(l => l.studentId);

      // Also fallback if user is linked by phone
      const userPhone = (req.user as any)?.phone;
      if (targetStudentIds.length === 0 && userPhone) {
        const matchingStudents = await prisma.student.findMany({
          where: { schoolId, phone: userPhone },
          select: { id: true }
        });
        targetStudentIds = matchingStudents.map(s => s.id);
      }
    }

    // Check school modules
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, type: true }
    });

    const isBoardingSchool = school?.type?.toLowerCase().includes('board') || true;

    // 1. Excursions / Trips (Available for all schools)
    const tripConsents = await prisma.tripConsent.findMany({
      where: {
        schoolId,
        ...(targetStudentIds.length > 0 ? { studentId: { in: targetStudentIds } } : {})
      },
      include: {
        trip: {
          include: {
            bus: { select: { id: true, name: true, number: true, model: true } },
            staff: { select: { id: true, name: true, phone: true } },
            nurseStaff: { select: { id: true, name: true, phone: true } }
          }
        },
        student: {
          select: { id: true, name: true, studentId: true, schoolClass: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Boarding Exeats (Strictly separate: hidden if boarding is OFF)
    let exeats: any[] = [];
    if (isBoardingSchool) {
      exeats = await prisma.exeat.findMany({
        where: {
          schoolId,
          ...(targetStudentIds.length > 0 ? { studentId: { in: targetStudentIds } } : {})
        },
        include: {
          student: {
            select: { id: true, name: true, studentId: true, schoolClass: { select: { name: true } } }
          },
          approvedByHousemaster: {
            select: { id: true, name: true, phone: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // 3. Medical Emergency Consents (Clinic module)
    const medicalConsents = await prisma.medicalConsent.findMany({
      where: {
        schoolId,
        ...(targetStudentIds.length > 0 ? { studentId: { in: targetStudentIds } } : {})
      },
      include: {
        student: {
          select: { id: true, name: true, studentId: true, schoolClass: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      approvals: {
        excursions: tripConsents,
        exeats,
        medical: medicalConsents
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Respond to Trip Excursion Consent (Legal Sign-off & Audit Log)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/trips/:consentId/respond', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const consentId = req.params.consentId as string;
    const { action, signatureName, agreedRiskAssessment, agreedToPay, notes } = req.body;

    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be "approve" or "decline"' });
    }

    const consent = await prisma.tripConsent.findFirst({
      where: { id: consentId, schoolId },
      include: { trip: true, student: true }
    });

    if (!consent) {
      return res.status(404).json({ success: false, error: 'Excursion consent request not found' });
    }

    if (consent.status === 'expired') {
      return res.status(400).json({ success: false, error: 'Cannot respond: The consent deadline for this excursion has expired.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    if (action === 'approve') {
      if (!signatureName || signatureName.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Typed legal signature name is required for excursion consent approval.' });
      }
      if (!agreedRiskAssessment) {
        return res.status(400).json({ success: false, error: 'You must acknowledge the risk assessment and safety protocols.' });
      }

      // Update consent record
      const updatedConsent = await prisma.tripConsent.update({
        where: { id: consent.id },
        data: {
          status: 'approved',
          signatureName: signatureName.trim(),
          signatureIp: clientIp,
          consentedAt: new Date(),
          consentedBy: req.user?.id || signatureName.trim(),
          agreedRiskAssessment: true,
          agreedToPay: consent.trip.cost > 0 ? (agreedToPay !== false) : false,
          notes: notes || null
        }
      });

      // Write to AuditLog
      if (req.user?.id) {
        await prisma.auditLog.create({
          data: {
            actorId: req.user.id,
            action: 'TRIP_CONSENT_APPROVED',
            entityType: 'TripConsent',
            entityId: consent.id,
            details: {
              tripId: consent.tripId,
              tripTitle: consent.trip.title,
              studentId: consent.studentId,
              cost: consent.trip.cost,
              signatureName: signatureName.trim(),
              ipAddress: clientIp
            },
            ipAddress: clientIp,
            schoolId
          }
        });
      }

      // Automatically create invoice if cost > 0
      let invoiceCreated = null;
      if (consent.trip.cost > 0 && !consent.invoiceId) {
        const tripInvoiceRes = await BursarService.createStudentInvoice({
          schoolId,
          studentId: consent.studentId,
          idempotencyKey: `trip_${consent.id}`,
          sourceModule: 'trips',
          sourceId: consent.id,
          dueDate: consent.trip.date,
          currency: consent.trip.currency || 'USD',
          items: [
            {
              billingItemCode: 'TRIP',
              description: `Excursion / School Trip Fee – ${consent.trip.title}`,
              quantity: 1,
              unitPrice: consent.trip.cost,
              totalAmount: consent.trip.cost,
              revenueAccountCode: '4031' // Sports, Culture & Activity Levies
            }
          ]
        });

        invoiceCreated = tripInvoiceRes.invoice;
        await prisma.tripConsent.update({
          where: { id: consent.id },
          data: {
            invoiceId: tripInvoiceRes.invoice.id,
            paymentStatus: 'unpaid'
          }
        });
      }

      return res.json({
        success: true,
        message: `Legal consent granted for "${consent.trip.title}".`,
        consent: updatedConsent,
        invoice: invoiceCreated
      });
    } else {
      // Decline
      const updatedConsent = await prisma.tripConsent.update({
        where: { id: consent.id },
        data: {
          status: 'declined',
          signatureName: signatureName?.trim() || 'Parent',
          signatureIp: clientIp,
          consentedAt: new Date(),
          notes: notes || null
        }
      });

      if (req.user?.id) {
        await prisma.auditLog.create({
          data: {
            actorId: req.user.id,
            action: 'TRIP_CONSENT_DECLINED',
            entityType: 'TripConsent',
            entityId: consent.id,
            details: {
              tripId: consent.tripId,
              tripTitle: consent.trip.title,
              studentId: consent.studentId,
              reason: notes || 'Declined by parent'
            },
            ipAddress: clientIp,
            schoolId
          }
        });
      }

      return res.json({
        success: true,
        message: `Excursion participation declined for "${consent.trip.title}".`,
        consent: updatedConsent
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Respond to Boarding Exeat Consent
// ─────────────────────────────────────────────────────────────────────────────
router.post('/exeats/:exeatId/respond', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const exeatId = req.params.exeatId as string;
    const { action, signatureName, notes } = req.body;

    const exeat = await (prisma as any).exeat.findFirst({
      where: { id: exeatId, schoolId },
      include: { student: true }
    });

    if (!exeat) {
      return res.status(404).json({ success: false, error: 'Exeat request not found' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updated = await (prisma as any).exeat.update({
      where: { id: exeat.id },
      data: {
        status: newStatus,
        parentSignature: signatureName || 'Parent',
        parentIp: clientIp,
        parentSignedAt: new Date(),
        approvalNotes: notes || null
      }
    });

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: action === 'approve' ? 'EXEAT_PARENT_APPROVED' : 'EXEAT_PARENT_REJECTED',
          entityType: 'Exeat',
          entityId: exeat.id,
          details: { studentId: exeat.studentId, type: exeat.type, signatureName },
          ipAddress: clientIp,
          schoolId
        }
      });
    }

    res.json({
      success: true,
      message: `Exeat request ${action === 'approve' ? 'approved' : 'rejected'}.`,
      exeat: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Respond to Clinic Medical Emergency Consent
// ─────────────────────────────────────────────────────────────────────────────
router.post('/medical/:consentId/respond', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const consentId = req.params.consentId as string;
    const { action, signatureName, allergiesConfirmed, emergencyContactName, emergencyContactPhone } = req.body;

    const consent = await (prisma as any).medicalConsent.findFirst({
      where: { id: consentId, schoolId },
      include: { student: true }
    });

    if (!consent) {
      return res.status(404).json({ success: false, error: 'Medical emergency consent not found' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    const updated = await (prisma as any).medicalConsent.update({
      where: { id: consent.id },
      data: {
        status: action === 'approve' ? 'approved' : 'declined',
        signatureName: signatureName?.trim() || null,
        signatureIp: clientIp,
        consentedAt: new Date(),
        allergiesConfirmed: allergiesConfirmed === true,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null
      }
    });

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: action === 'approve' ? 'MEDICAL_CONSENT_APPROVED' : 'MEDICAL_CONSENT_DECLINED',
          entityType: 'MedicalConsent',
          entityId: consent.id,
          details: { studentId: consent.studentId, consentType: consent.consentType, signatureName },
          ipAddress: clientIp,
          schoolId
        }
      });
    }

    res.json({
      success: true,
      message: `Medical consent ${action === 'approve' ? 'granted' : 'declined'}.`,
      consent: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
