import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notifications';

const router = Router();

// Helper to extract schoolId
function getSchoolId(req: AuthRequest): string {
  const schoolId = req.user?.schoolId || (req.query.schoolId as string) || (req.headers['x-school-id'] as string);
  if (!schoolId) {
    throw new Error('School ID is required');
  }
  return schoolId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. List Trips
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const whereClause: any = { schoolId };
    if (status) {
      whereClause.status = status;
    }
    if (type) {
      whereClause.type = type;
    }

    const trips = await (prisma as any).schoolTrip.findMany({
      where: whereClause,
      include: {
        bus: {
          select: { id: true, name: true, number: true, model: true, quantity: true }
        },
        staff: {
          select: { id: true, name: true, email: true, phone: true }
        },
        nurseStaff: {
          select: { id: true, name: true, email: true, phone: true }
        },
        consents: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            boardedAt: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const enriched = trips.map((trip: any) => {
      const consents: any[] = trip.consents || [];
      const totalInvited = consents.length;
      const approvedPaid = consents.filter((c: any) => c.status === 'approved' && (c.paymentStatus === 'paid' || trip.cost === 0)).length;
      const approvedUnpaid = consents.filter((c: any) => c.status === 'approved' && c.paymentStatus !== 'paid' && trip.cost > 0).length;
      const pending = consents.filter((c: any) => c.status === 'pending').length;
      const declined = consents.filter((c: any) => c.status === 'declined').length;
      const expired = consents.filter((c: any) => c.status === 'expired').length;
      const boarded = consents.filter((c: any) => c.boardedAt !== null).length;

      return {
        ...trip,
        stats: {
          totalInvited,
          approvedPaid,
          approvedUnpaid,
          pending,
          declined,
          expired,
          boarded
        }
      };
    });

    res.json({ success: true, trips: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Trip Details & Student Roster
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;

    const trip = await (prisma as any).schoolTrip.findFirst({
      where: { id, schoolId },
      include: {
        bus: true,
        staff: {
          select: { id: true, name: true, email: true, phone: true }
        },
        nurseStaff: {
          select: { id: true, name: true, email: true, phone: true }
        },
        consents: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentId: true,
                classId: true,
                guardianName: true,
                phone: true,
                schoolClass: { select: { id: true, name: true } },
                clinicPatients: {
                  select: { id: true, allergies: true, chronicConditions: true, bloodGroup: true },
                  take: 1
                }
              }
            }
          },
          orderBy: { student: { name: 'asc' } }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    const consents: any[] = trip.consents || [];

    // Auto-check for expired consents if past deadline
    const now = new Date();
    if (trip.consentDeadline && new Date(trip.consentDeadline) < now) {
      const overduePendingIds = consents.filter((c: any) => c.status === 'pending').map((c: any) => c.id);
      if (overduePendingIds.length > 0) {
        await (prisma as any).tripConsent.updateMany({
          where: { id: { in: overduePendingIds } },
          data: { status: 'expired' }
        });
        consents.forEach((c: any) => {
          if (overduePendingIds.includes(c.id)) {
            c.status = 'expired';
          }
        });
      }
    }

    // Check outstanding discipline cases & fee balances for each student
    const studentIds = consents.map((c: any) => c.studentId);
    const [disciplineRecords, invoices] = await Promise.all([
      prisma.disciplineRecord.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          status: { in: ['PENDING', 'UNDER_INVESTIGATION', 'GUILTY'] }
        },
        select: { studentId: true, offenceType: true, severity: true }
      }),
      prisma.studentInvoice.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          status: { in: ['PENDING', 'PARTIAL'] }
        },
        select: { studentId: true, balance: true }
      })
    ]);

    const disciplineMap = new Map<string, any[]>();
    for (const d of disciplineRecords) {
      if (!disciplineMap.has(d.studentId)) disciplineMap.set(d.studentId, []);
      disciplineMap.get(d.studentId)!.push(d);
    }

    const arrearsMap = new Map<string, number>();
    for (const inv of invoices) {
      arrearsMap.set(inv.studentId, (arrearsMap.get(inv.studentId) || 0) + (inv.balance || 0));
    }

    const roster = consents.map((consent: any) => {
      const studentDisc = disciplineMap.get(consent.studentId) || [];
      const balance = arrearsMap.get(consent.studentId) || 0;
      const clinicPatient = consent.student?.clinicPatients?.[0];

      return {
        ...consent,
        hasDisciplineIssue: studentDisc.length > 0,
        disciplineCasesCount: studentDisc.length,
        feeBalance: balance,
        hasFeeArrears: balance > 0,
        allergies: clinicPatient?.allergies || 'None recorded',
        bloodGroup: clinicPatient?.bloodGroup || 'Unknown'
      };
    });

    const totalInvited = roster.length;
    const approvedPaid = roster.filter((c: any) => c.status === 'approved' && (c.paymentStatus === 'paid' || trip.cost === 0)).length;
    const approvedUnpaid = roster.filter((c: any) => c.status === 'approved' && c.paymentStatus !== 'paid' && trip.cost > 0).length;
    const pending = roster.filter((c: any) => c.status === 'pending').length;
    const declined = roster.filter((c: any) => c.status === 'declined').length;
    const expired = roster.filter((c: any) => c.status === 'expired').length;
    const boarded = roster.filter((c: any) => c.boardedAt !== null).length;

    res.json({
      success: true,
      trip: {
        ...trip,
        consents: roster,
        stats: {
          totalInvited,
          approvedPaid,
          approvedUnpaid,
          pending,
          declined,
          expired,
          boarded
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Create Trip
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      title,
      type,
      destination,
      purpose,
      date,
      departureTime,
      returnTime,
      cost,
      currency,
      transport,
      busId,
      staffId,
      nurseStaffId,
      requiredDocuments,
      consentDeadline,
      riskAssessmentFile,
      riskLevel,
      itinerary,
      seatLimit
    } = req.body;

    if (!title || !destination || !date) {
      return res.status(400).json({ success: false, error: 'Title, destination and date are required' });
    }

    const trip = await (prisma as any).schoolTrip.create({
      data: {
        schoolId,
        title,
        type: type || 'academic',
        destination,
        purpose: purpose || null,
        date: new Date(date),
        departureTime: departureTime || null,
        returnTime: returnTime || null,
        cost: cost ? parseFloat(cost) : 0,
        currency: currency || 'USD',
        transport: transport || null,
        busId: busId || null,
        staffId: staffId || null,
        nurseStaffId: nurseStaffId || null,
        requiredDocuments: requiredDocuments || null,
        consentDeadline: consentDeadline ? new Date(consentDeadline) : null,
        riskAssessmentFile: riskAssessmentFile || null,
        riskLevel: riskLevel || 'LOW',
        itinerary: itinerary || null,
        seatLimit: seatLimit ? parseInt(seatLimit) : null,
        status: 'DRAFT'
      }
    });

    res.status(201).json({ success: true, trip });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Update Trip
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const data: any = {};
    const allowed = [
      'title', 'type', 'destination', 'purpose', 'date', 'departureTime', 'returnTime',
      'cost', 'currency', 'transport', 'busId', 'staffId', 'nurseStaffId', 'requiredDocuments',
      'consentDeadline', 'riskAssessmentFile', 'riskLevel', 'itinerary', 'seatLimit', 'status'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'date' || key === 'consentDeadline') {
          data[key] = req.body[key] ? new Date(req.body[key]) : null;
        } else if (key === 'cost') {
          data[key] = parseFloat(req.body[key]);
        } else if (key === 'seatLimit') {
          data[key] = req.body[key] ? parseInt(req.body[key]) : null;
        } else {
          data[key] = req.body[key];
        }
      }
    }

    const updated = await (prisma as any).schoolTrip.update({
      where: { id },
      data
    });

    res.json({ success: true, trip: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Publish Trip & Generate Consents
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;
    const { classIds, studentIds } = req.body;

    const trip = await (prisma as any).schoolTrip.findFirst({
      where: { id, schoolId }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    // Resolve target students
    let targetStudents: any[] = [];
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      targetStudents = await prisma.student.findMany({
        where: { schoolId, id: { in: studentIds } },
        select: { id: true, name: true, phone: true, guardianName: true, parents: { select: { parentId: true } } }
      });
    } else if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      targetStudents = await prisma.student.findMany({
        where: { schoolId, classId: { in: classIds }, status: 'Enrolled' },
        select: { id: true, name: true, phone: true, guardianName: true, parents: { select: { parentId: true } } }
      });
    } else {
      return res.status(400).json({ success: false, error: 'Please specify classIds or studentIds to publish this trip' });
    }

    if (targetStudents.length === 0) {
      return res.status(400).json({ success: false, error: 'No enrolled students found for the selected classes' });
    }

    let createdCount = 0;
    const deadlineStr = trip.consentDeadline
      ? new Date(trip.consentDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'the trip date';

    for (const student of targetStudents) {
      const parentId = student.parents?.[0]?.parentId || null;
      await (prisma as any).tripConsent.upsert({
        where: {
          tripId_studentId: {
            tripId: trip.id,
            studentId: student.id
          }
        },
        create: {
          schoolId,
          tripId: trip.id,
          studentId: student.id,
          parentId,
          parentName: student.guardianName || null,
          parentPhone: student.phone || null,
          status: 'pending',
          paymentStatus: trip.cost > 0 ? 'unpaid' : 'na'
        },
        update: {}
      });

      createdCount++;

      // Enqueue notification & log communication to parent
      if (student.phone) {
        const message = `Dear Parent, ${student.name} is invited to "${trip.title}" on ${new Date(trip.date).toLocaleDateString('en-GB')}. Cost: $${trip.cost}. Please log into the Parent Portal to provide legal consent before ${deadlineStr}.`;
        await NotificationService.enqueue({
          type: 'SMS',
          schoolId,
          senderId: req.user?.id || 'admin',
          studentId: student.id,
          recipientPhone: student.phone,
          payload: { tripId: trip.id, tripTitle: trip.title, message }
        });

        await NotificationService.logCommunication({
          schoolId,
          senderId: req.user?.id || 'admin',
          studentId: student.id,
          type: 'SMS',
          description: `Excursion Invite SMS sent for "${trip.title}" to ${student.phone}`,
          status: 'SENT'
        });
      }
    }

    const updatedTrip = await (prisma as any).schoolTrip.update({
      where: { id: trip.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Trip published. ${createdCount} parent consent invitations generated and notified.`,
      trip: updatedTrip,
      invitationsCount: createdCount
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Send Reminder SMS to Pending Parents
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/remind-pending', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;

    const trip = await (prisma as any).schoolTrip.findFirst({
      where: { id, schoolId },
      include: {
        consents: {
          where: { status: 'pending' },
          include: {
            student: { select: { id: true, name: true, phone: true } }
          }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    const pendingConsents: any[] = trip.consents || [];
    if (pendingConsents.length === 0) {
      return res.json({ success: true, message: 'No pending consents to remind', count: 0 });
    }

    const deadlineStr = trip.consentDeadline
      ? new Date(trip.consentDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'urgently';

    let remindedCount = 0;
    for (const c of pendingConsents) {
      if (c.student?.phone) {
        const message = `Reminder: Please complete legal consent for ${c.student.name}'s trip to "${trip.title}" by ${deadlineStr} via the Parent Portal.`;
        await NotificationService.enqueue({
          type: 'SMS',
          schoolId,
          senderId: req.user?.id || 'admin',
          studentId: c.studentId,
          recipientPhone: c.student.phone,
          payload: { tripId: trip.id, message }
        });

        await NotificationService.logCommunication({
          schoolId,
          senderId: req.user?.id || 'admin',
          studentId: c.studentId,
          type: 'SMS',
          description: `Excursion Reminder SMS sent for "${trip.title}" to ${c.student.phone}`,
          status: 'SENT'
        });
        remindedCount++;
      }
    }

    res.json({
      success: true,
      message: `Dispatched reminder SMS to ${remindedCount} parents.`,
      count: remindedCount
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Expire Overdue Consents
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/expire-consents', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;

    const trip = await (prisma as any).schoolTrip.findFirst({
      where: { id, schoolId }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    const now = new Date();
    if (!trip.consentDeadline || new Date(trip.consentDeadline) > now) {
      return res.json({ success: true, message: 'Trip consent deadline has not passed yet.', expiredCount: 0 });
    }

    const updateRes = await (prisma as any).tripConsent.updateMany({
      where: {
        tripId: trip.id,
        status: 'pending'
      },
      data: {
        status: 'expired'
      }
    });

    res.json({
      success: true,
      message: `Expired ${updateRes.count} overdue pending consents.`,
      expiredCount: updateRes.count
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Gate Manifest & QR Check-In Data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/gate-manifest', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;

    const trip = await (prisma as any).schoolTrip.findFirst({
      where: { id, schoolId },
      include: {
        bus: true,
        consents: {
          where: { status: 'approved' },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentId: true,
                guardianName: true,
                phone: true,
                schoolClass: { select: { name: true } },
                clinicPatients: {
                  select: { allergies: true, chronicConditions: true, bloodGroup: true }
                }
              }
            }
          },
          orderBy: { student: { name: 'asc' } }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    const consents: any[] = trip.consents || [];

    const manifest = consents.map((consent: any, idx: number) => {
      const clinic = consent.student?.clinicPatients?.[0];
      return {
        consentId: consent.id,
        studentId: consent.studentId,
        studentName: consent.student?.name,
        admissionNumber: consent.student?.studentId,
        className: consent.student?.schoolClass?.name || 'Unassigned',
        seatNumber: consent.seatNumber || (idx + 1),
        paymentStatus: consent.paymentStatus,
        boardedAt: consent.boardedAt,
        isBoarded: consent.boardedAt !== null,
        parentName: consent.parentName || consent.student?.guardianName,
        parentPhone: consent.parentPhone || consent.student?.phone,
        allergies: clinic?.allergies || 'None',
        bloodGroup: clinic?.bloodGroup || 'N/A',
        emergencyNotes: clinic?.chronicConditions || 'None'
      };
    });

    res.json({
      success: true,
      tripTitle: trip.title,
      destination: trip.destination,
      date: trip.date,
      bus: trip.bus,
      totalApproved: manifest.length,
      totalBoarded: manifest.filter((m: any) => m.isBoarded).length,
      manifest
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Boarding Toggle / QR Gate Check-In & Auto-Attendance Sync
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/board', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;
    const { studentId, seatNumber } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }

    const consent = await (prisma as any).tripConsent.findFirst({
      where: { tripId: id, studentId, schoolId },
      include: { trip: true, student: { select: { id: true, name: true, classId: true } } }
    });

    if (!consent) {
      return res.status(404).json({ success: false, error: 'Trip consent not found for this student' });
    }

    if (consent.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: `Cannot board: Parental consent status is ${consent.status.toUpperCase()} (only APPROVED students may board)`
      });
    }

    // Toggle boarded state
    const newBoardedAt = consent.boardedAt ? null : new Date();

    const updated = await (prisma as any).tripConsent.update({
      where: { id: consent.id },
      data: {
        boardedAt: newBoardedAt,
        seatNumber: seatNumber ? parseInt(seatNumber) : consent.seatNumber
      }
    });

    // Auto-sync daily attendance: if today matches the trip date, mark student as "on_trip"
    if (newBoardedAt && consent.student?.classId) {
      const tripDateStr = new Date(consent.trip.date).toISOString().slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);

      if (tripDateStr === todayStr) {
        const sessionDate = new Date(`${todayStr}T00:00:00.000Z`);
        let session = await prisma.attendanceSession.findFirst({
          where: {
            schoolId,
            classId: consent.student.classId,
            type: 'daily',
            date: sessionDate
          }
        });

        if (!session) {
          session = await prisma.attendanceSession.create({
            data: {
              schoolId,
              classId: consent.student.classId,
              type: 'daily',
              period: 'Homeroom',
              date: sessionDate,
              teacherId: req.user?.id || null,
              submitted: false
            }
          });
        }

        await prisma.attendanceSessionRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: consent.studentId
            }
          },
          create: {
            sessionId: session.id,
            studentId: consent.studentId,
            status: 'on_trip',
            notes: `On School Trip: ${consent.trip.title}`,
            markedById: req.user?.id || null
          },
          update: {
            status: 'on_trip',
            notes: `On School Trip: ${consent.trip.title}`
          }
        });
      }
    }

    res.json({
      success: true,
      message: newBoardedAt ? `${consent.student?.name} marked as boarded.` : `${consent.student?.name} boarding undone.`,
      consent: updated,
      isBoarded: newBoardedAt !== null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Bulk Sync Attendance for Trip Day
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/sync-attendance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    const id = req.params.id as string;

    const trip = await (prisma as any).schoolTrip.findFirst({
      where: { id, schoolId },
      include: {
        consents: {
          where: { status: 'approved' },
          include: { student: { select: { id: true, name: true, classId: true } } }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    const tripDateStr = new Date(trip.date).toISOString().slice(0, 10);
    const sessionDate = new Date(`${tripDateStr}T00:00:00.000Z`);

    const consents: any[] = trip.consents || [];

    // Group students by class
    const classMap = new Map<string, string[]>();
    for (const c of consents) {
      if (c.student?.classId) {
        if (!classMap.has(c.student.classId)) classMap.set(c.student.classId, []);
        classMap.get(c.student.classId)!.push(c.studentId);
      }
    }

    let recordsUpdated = 0;
    for (const [classId, studentIds] of classMap.entries()) {
      let session = await prisma.attendanceSession.findFirst({
        where: {
          schoolId,
          classId,
          type: 'daily',
          date: sessionDate
        }
      });

      if (!session) {
        session = await prisma.attendanceSession.create({
          data: {
            schoolId,
            classId,
            type: 'daily',
            period: 'Homeroom',
            date: sessionDate,
            teacherId: req.user?.id || null,
            submitted: false
          }
        });
      }

      for (const sId of studentIds) {
        await prisma.attendanceSessionRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: sId
            }
          },
          create: {
            sessionId: session.id,
            studentId: sId,
            status: 'on_trip',
            notes: `Authorized School Excursion: ${trip.title}`,
            markedById: req.user?.id || null
          },
          update: {
            status: 'on_trip',
            notes: `Authorized School Excursion: ${trip.title}`
          }
        });
        recordsUpdated++;
      }
    }

    res.json({
      success: true,
      message: `Synchronized ${recordsUpdated} student attendance records to "On School Trip".`,
      count: recordsUpdated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
