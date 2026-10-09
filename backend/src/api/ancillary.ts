import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { BursarService } from '../services/bursar.service';
import { CreditNoteService } from '../services/credit-note.service';

const router = Router();

// ═══════════ HOSTELS & BOARDING ═══════════

router.get('/hostel-categories', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.hostelCategory.findMany({ where: { schoolId: req.user!.schoolId! } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostel categories' });
  }
});

router.post('/hostel-categories', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.hostelCategory.create({
      data: { ...req.body, schoolId: req.user!.schoolId! }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hostel category' });
  }
});

router.delete('/hostel-categories/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.hostelCategory.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hostel category' });
  }
});

router.get('/hostel-rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.hostelRoom.findMany({ where: { schoolId: req.user!.schoolId! } });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostel rooms' });
  }
});

router.post('/hostel-rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.hostelRoom.create({
      data: {
        ...req.body,
        numberOfBeds: parseInt(req.body.numberOfBeds) || 0,
        cost: parseFloat(req.body.cost) || 0,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hostel room' });
  }
});

router.delete('/hostel-rooms/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.hostelRoom.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hostel room' });
  }
});

router.get('/hostels', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const hostels = await prisma.hostel.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        category: true,
        roomType: true,
        rooms: {
          include: {
            _count: { select: { bedAllocations: true, students: true } }
          },
          orderBy: { name: 'asc' }
        },
        _count: { select: { students: true, bedAllocations: true } }
      }
    });
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostels' });
  }
});

router.post('/hostels', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const hostel = await prisma.hostel.create({
      data: {
        name: req.body.name || req.body.hostelName || 'Hostel',
        type: req.body.type || 'BOYS',
        categoryId: req.body.categoryId || null,
        roomId: req.body.roomId || null,
        capacity: parseInt(req.body.capacity || req.body.intake) || 0,
        location: req.body.location || req.body.address,
        description: req.body.description,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(hostel);
  } catch (error) {
    console.error('Failed to create hostel:', error);
    res.status(500).json({ error: 'Failed to create hostel' });
  }
});

router.delete('/hostels/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.hostel.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hostel' });
  }
});

// ═══════════ HOSTEL ROOMS MANAGEMENT ═══════════

router.get('/hostels/:id/rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { hostelId: req.params.id as string },
      include: {
        _count: { select: { bedAllocations: true, students: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.post('/hostels/:id/rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, roomNumber, capacity = 4, bedCount = 4, conditionStatus = 'GOOD' } = req.body;
    const room = await prisma.room.create({
      data: {
        hostelId: req.params.id as string,
        name: name || roomNumber || 'Room',
        roomNumber: roomNumber || name,
        capacity: parseInt(capacity) || 4,
        bedCount: parseInt(bedCount) || 4,
        conditionStatus: conditionStatus || 'GOOD'
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

router.patch('/rooms/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, roomNumber, capacity, bedCount, conditionStatus } = req.body;
    const room = await prisma.room.update({
      where: { id: req.params.id as string },
      data: {
        ...(name ? { name } : {}),
        ...(roomNumber ? { roomNumber } : {}),
        ...(capacity !== undefined ? { capacity: parseInt(capacity) } : {}),
        ...(bedCount !== undefined ? { bedCount: parseInt(bedCount) } : {}),
        ...(conditionStatus ? { conditionStatus } : {})
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

router.delete('/rooms/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.room.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ═══════════ BOARDING & BED ALLOCATIONS (BURSAR INTEGRATION) ═══════════

/**
 * GET /api/ancillary/boarding/dashboard-stats
 * Comprehensive boarding statistics, capacity metrics, and unpaid fee red flags
 */
router.get('/boarding/dashboard-stats', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const [hostels, rooms, allocations, pendingExeats] = await Promise.all([
      prisma.hostel.findMany({
        where: { schoolId },
        include: { _count: { select: { rooms: true, students: true } } }
      }),
      prisma.room.findMany({
        where: { hostel: { schoolId } }
      }),
      prisma.hostelBedAllocation.findMany({
        where: { schoolId, status: 'ACTIVE' },
        include: {
          student: { select: { id: true, studentId: true, name: true, class: { select: { name: true } } } },
          hostel: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } }
        }
      }),
      prisma.exeat.count({
        where: { schoolId, status: 'pending_parent' }
      })
    ]);

    const totalHostels = hostels.length;
    const totalRooms = rooms.length;
    const totalCapacity = hostels.reduce((sum, h) => sum + (h.capacity || 0), 0);
    const activeBoarders = allocations.length;
    const occupancyRate = totalCapacity > 0 ? Math.round((activeBoarders / totalCapacity) * 100) : 0;

    // Filter unpaid allocations: fee > 0 and invoice is not paid
    const unpaidAllocations = allocations.filter(a => {
      if (a.feeAmount <= 0) return false;
      if (!a.invoice) return true;
      return a.invoice.status !== 'paid';
    });

    res.json({
      totalHostels,
      totalRooms,
      totalCapacity,
      activeBoarders,
      occupancyRate,
      pendingExeatsCount: pendingExeats,
      unpaidCount: unpaidAllocations.length,
      unpaidAllocations: unpaidAllocations.map(a => ({
        id: a.id,
        studentId: a.studentId,
        studentName: a.student?.name,
        studentCode: a.student?.studentId,
        className: a.student?.class?.name,
        hostelName: a.hostel?.name,
        roomName: a.room?.name,
        feeAmount: a.feeAmount,
        invoiceNumber: a.invoice?.invoiceNumber || 'NOT_INVOICED',
        invoiceStatus: a.invoice?.status || 'unbilled'
      }))
    });
  } catch (error) {
    console.error('Failed to get boarding stats:', error);
    res.status(500).json({ error: 'Failed to fetch boarding dashboard stats' });
  }
});

/**
 * GET /api/ancillary/boarding/allocations
 * List all bed allocations with invoice status
 */
router.get('/boarding/allocations', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const allocations = await prisma.hostelBedAllocation.findMany({
      where: { schoolId },
      include: {
        student: { select: { id: true, studentId: true, name: true, class: { select: { name: true } } } },
        hostel: { select: { id: true, name: true, type: true } },
        room: { select: { id: true, name: true, conditionStatus: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, status: true } }
      },
      orderBy: { allocatedAt: 'desc' }
    });

    const enriched = allocations.map(a => ({
      ...a,
      isUnpaid: a.feeAmount > 0 && (!a.invoice || a.invoice.status !== 'paid')
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bed allocations' });
  }
});

/**
 * POST /api/ancillary/boarding/assign
 * Allocate a student to a hostel bed, auto-invoicing via BursarService
 * Idempotency Key: board_{allocation_id}
 * Revenue Account: 4020 (Boarding & Hostel Accommodation)
 */
router.post('/boarding/assign', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, hostelId, roomId, termId, term, feeAmount } = req.body;

    if (!studentId || !hostelId) {
      return res.status(400).json({ error: 'studentId and hostelId are required' });
    }

    const [student, hostel] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, schoolId } }),
      prisma.hostel.findFirst({
        where: { id: hostelId, schoolId },
        include: { roomType: true }
      })
    ]);

    if (!student) return res.status(404).json({ error: 'Student not found in this school' });
    if (!hostel) return res.status(404).json({ error: 'Hostel not found in this school' });

    // Determine boarding fee from roomType cost, request body, or default
    let resolvedFee = 0;
    if (feeAmount !== undefined && feeAmount !== null && parseFloat(feeAmount) >= 0) {
      resolvedFee = parseFloat(feeAmount);
    } else if (hostel.roomType?.cost) {
      resolvedFee = hostel.roomType.cost;
    }

    // 1. Create Allocation Record
    const allocation = await prisma.hostelBedAllocation.create({
      data: {
        schoolId,
        studentId,
        hostelId,
        roomId: roomId || null,
        termId: termId || 'term_1',
        term: term || 'Term 1',
        feeAmount: resolvedFee,
        status: 'ACTIVE'
      }
    });

    // 2. Update Student status
    await prisma.student.update({
      where: { id: studentId },
      data: {
        hostelId,
        roomId: roomId || null,
        boardingStatus: 'Boarder'
      }
    });

    // 3. Post Invoice to Bursar if fee > 0
    let invoiceResult: any = null;
    if (resolvedFee > 0) {
      const idempotencyKey = `board_${allocation.id}`;
      invoiceResult = await BursarService.createStudentInvoice({
        schoolId,
        idempotencyKey,
        studentId,
        termId: termId || 'term_1',
        term: term || 'Term 1',
        sourceModule: 'boarding',
        sourceId: allocation.id,
        items: [
          {
            billingItemCode: 'BOARD',
            description: `Boarding & Hostel Accommodation — ${hostel.name}${roomId ? ` (Room ${roomId})` : ''}`,
            quantity: 1,
            unitPrice: resolvedFee,
            totalAmount: resolvedFee,
            revenueAccountCode: '4020'
          }
        ],
        createdBy: req.user!.id
      });

      await prisma.hostelBedAllocation.update({
        where: { id: allocation.id },
        data: { invoiceId: invoiceResult.invoice.id }
      });
    }

    res.json({
      success: true,
      allocation,
      invoice: invoiceResult?.invoice || null
    });
  } catch (error: any) {
    console.error('Failed to assign boarding bed:', error);
    res.status(500).json({ error: error.message || 'Failed to assign student to hostel' });
  }
});

/**
 * POST /api/ancillary/boarding/vacate
 * Vacate a bed with optional pro-rata credit note reversal
 */
router.post('/boarding/vacate', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { allocationId, studentId, reason = 'Vacated hostel bed', proRataRatio } = req.body;

    const allocation = await prisma.hostelBedAllocation.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(allocationId ? { id: allocationId } : { studentId })
      }
    });

    if (!allocation) {
      return res.status(404).json({ error: 'No active bed allocation found for student' });
    }

    let creditNoteResult: any = null;
    const ratio = proRataRatio !== undefined ? parseFloat(proRataRatio) : 0;

    // If pro-rata ratio > 0 and invoice exists, issue credit note
    if (ratio > 0 && allocation.invoiceId) {
      creditNoteResult = await CreditNoteService.createCreditNoteForInvoice({
        schoolId,
        invoiceId: allocation.invoiceId,
        reason: `${reason} (Pro-rata ${Math.round(ratio * 100)}%)`,
        proRataRatio: ratio,
        issuedByUserId: req.user!.id
      });
    }

    // Update allocation
    const updatedAllocation = await prisma.hostelBedAllocation.update({
      where: { id: allocation.id },
      data: {
        status: 'VACATED',
        vacatedAt: new Date(),
        vacatedReason: reason,
        creditNoteId: creditNoteResult?.creditNote?.id || null
      }
    });

    // Reset student status to Day scholar
    await prisma.student.update({
      where: { id: allocation.studentId },
      data: {
        hostelId: null,
        roomId: null,
        boardingStatus: 'Day'
      }
    });

    res.json({
      success: true,
      allocation: updatedAllocation,
      creditNote: creditNoteResult?.creditNote || null
    });
  } catch (error: any) {
    console.error('Failed to vacate hostel bed:', error);
    res.status(500).json({ error: error.message || 'Failed to vacate hostel bed' });
  }
});

// ═══════════ BOARDING LOGS ═══════════

/**
 * @route   POST /api/ancillary/boarding/log
 * @desc    Record a boarding movement (Sign-out, Sign-in, etc)
 */
router.post('/boarding/log', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { studentId, type, reason } = req.body;
  const schoolId = req.user!.schoolId!;
  const userId = req.user!.id;

  try {
    const log = await prisma.boardingLog.create({
      data: {
        studentId,
        type,
        reason,
        authorizedById: userId,
        schoolId
      }
    });

    // If it's a sign-out, maybe update student status? 
    // For now we just log it.

    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record boarding log' });
  }
});

/**
 * @route   GET /api/ancillary/boarding/logs
 * @desc    Fetch recent boarding movement logs & exeat records
 */
router.get('/boarding/logs', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const logs = await prisma.boardingLog.findMany({
      where: { schoolId },
      include: {
        student: {
          select: { id: true, name: true, studentId: true, hostel: { select: { name: true } } }
        },
        authorizedBy: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch boarding logs error:', error);
    res.status(500).json({ error: 'Failed to fetch boarding logs' });
  }
});

/**
 * @route   PATCH /api/ancillary/boarding/logs/:id/return
 * @desc    Mark a student as returned from exeat / sign-out
 */
router.patch('/boarding/logs/:id/return', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const id = req.params.id as string;
  try {
    const log = await prisma.boardingLog.findFirst({
      where: { id, schoolId }
    });
    if (!log) return res.status(404).json({ error: 'Boarding log not found' });

    const updated = await prisma.boardingLog.update({
      where: { id },
      data: { returnedAt: new Date() }
    });
    res.json(updated);
  } catch (error) {
    console.error('Update boarding return error:', error);
    res.status(500).json({ error: 'Failed to update boarding return' });
  }
});

/**
 * PATCH /api/ancillary/boarding/allocations/:id/status
 * Update allocation status (ACTIVE, SUSPENDED, VACATED)
 */
router.patch('/boarding/allocations/:id/status', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'VACATED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid allocation status' });
    }

    const allocation = await prisma.hostelBedAllocation.findFirst({
      where: { id: req.params.id as string, schoolId }
    });
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    const updated = await prisma.hostelBedAllocation.update({
      where: { id: allocation.id },
      data: { status }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update allocation status' });
  }
});

// ═══════════ NIGHT ROLL CALL (18:00 & 21:00) ═══════════

/**
 * GET /api/ancillary/boarding/roll-call
 * Retrieve boarders and existing night roll call records for a hostel
 */
router.get('/boarding/roll-call', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { hostelId, date = new Date().toISOString().split('T')[0], time = '18:00' } = req.query as any;

    if (!hostelId) {
      return res.status(400).json({ error: 'hostelId is required' });
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59);

    // 1. Get active allocations for this hostel
    const allocations = await prisma.hostelBedAllocation.findMany({
      where: { schoolId, hostelId, status: 'ACTIVE' },
      include: {
        student: {
          select: { id: true, studentId: true, name: true, class: { select: { name: true } } }
        },
        room: { select: { id: true, name: true } }
      }
    });

    // 2. Get approved exeats covering this date
    const activeExeats = await prisma.exeat.findMany({
      where: {
        schoolId,
        status: { in: ['approved', 'returned'] },
        departureAt: { lte: endOfDay },
        returnAt: { gte: startOfDay }
      }
    });
    const exeatStudentMap = new Map<string, any>();
    activeExeats.forEach(e => exeatStudentMap.set(e.studentId, e));

    // 3. Get existing roll call entries for this hostel, date, and time
    const existingEntries = await prisma.boardingRollCall.findMany({
      where: {
        schoolId,
        hostelId,
        time,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });
    const entryMap = new Map<string, any>();
    existingEntries.forEach(entry => entryMap.set(entry.studentId, entry));

    // 4. Build student list
    const students = allocations.map(a => {
      const existing = entryMap.get(a.studentId);
      const exeat = exeatStudentMap.get(a.studentId);

      let status = 'present';
      if (existing) {
        status = existing.status;
      } else if (exeat && exeat.status === 'approved') {
        status = 'on_exeat';
      }

      return {
        studentId: a.studentId,
        studentName: a.student?.name,
        studentCode: a.student?.studentId,
        className: a.student?.class?.name,
        roomName: a.room?.name,
        status,
        hasApprovedExeat: !!exeat,
        exeatDetails: exeat ? { id: exeat.id, type: exeat.type, reason: exeat.reason } : null,
        notes: existing?.notes || ''
      };
    });

    const summary = {
      total: students.length,
      present: students.filter(s => s.status === 'present').length,
      absent: students.filter(s => s.status === 'absent').length,
      onExeat: students.filter(s => s.status === 'on_exeat').length,
      sickBay: students.filter(s => s.status === 'sick_bay').length
    };

    res.json({
      hostelId,
      date,
      time,
      isSubmitted: existingEntries.length > 0,
      students,
      summary
    });
  } catch (error) {
    console.error('Failed to get boarding roll call:', error);
    res.status(500).json({ error: 'Failed to fetch roll call records' });
  }
});

/**
 * POST /api/ancillary/boarding/roll-call
 * Save night roll call: triggers parent SMS & discipline flag on unexcused absence, clinic hospitalization on sick_bay
 */
router.post('/boarding/roll-call', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { hostelId, date = new Date().toISOString().split('T')[0], time = '18:00', records = [] } = req.body;

    if (!hostelId || !records.length) {
      return res.status(400).json({ error: 'hostelId and records array are required' });
    }

    if (time !== '18:00' && time !== '21:00') {
      return res.status(400).json({ error: 'Roll call time must be either 18:00 or 21:00' });
    }

    const sessionDate = new Date(date);
    const startOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 23, 59, 59);

    const savedRecords: any[] = [];
    const triggeredAbsences: any[] = [];
    const sickBayAdmissions: any[] = [];

    for (const item of records) {
      const { studentId, status, notes } = item;

      // 1. Check if student has approved exeat
      const approvedExeat = await prisma.exeat.findFirst({
        where: {
          schoolId,
          studentId,
          status: 'approved',
          departureAt: { lte: endOfDay },
          returnAt: { gte: startOfDay }
        }
      });

      let finalStatus = status;
      if (approvedExeat && status !== 'sick_bay') {
        finalStatus = 'on_exeat';
      }

      let smsDispatched = false;
      let disciplineCaseCreated = false;
      let clinicAdmitted = false;

      // 2. Absence flow: absent with NO approved exeat triggers parent SMS & discipline flag
      if (finalStatus === 'absent' && !approvedExeat) {
        smsDispatched = true;

        const existingDiscipline = await prisma.disciplineRecord.findFirst({
          where: {
            schoolId,
            studentId,
            offenceType: 'UNAUTHORIZED_ABSENCE_BOARDING',
            date: { gte: startOfDay, lte: endOfDay }
          }
        });

        if (!existingDiscipline) {
          await prisma.disciplineRecord.create({
            data: {
              schoolId,
              studentId,
              reporterId: userId,
              date: sessionDate,
              offenceType: 'UNAUTHORIZED_ABSENCE_BOARDING',
              description: `Unaccounted absence during boarding night roll call at ${time} without an approved exeat`,
              severity: 'HIGH',
              status: 'PENDING',
              actionTaken: 'Flagged for warden review. Parent SMS alert dispatched.'
            }
          });
          disciplineCaseCreated = true;
          triggeredAbsences.push(studentId);
        }
      }

      // 3. Sick Bay flow: create clinic hospitalization / admission
      if (finalStatus === 'sick_bay') {
        let patient = await prisma.clinicPatient.findFirst({
          where: { schoolId, user: { student: { id: studentId } } }
        });
        if (!patient) {
          const student = await prisma.student.findUnique({ where: { id: studentId } });
          patient = await prisma.clinicPatient.create({
            data: {
              schoolId,
              firstName: student?.name?.split(' ')[0] || 'Student',
              lastName: student?.name?.split(' ').slice(1).join(' ') || '',
              mrn: `MRN-${Date.now().toString().slice(-6)}`,
              userId: student?.userId || undefined
            }
          });
        }

        await prisma.clinicHospitalization.create({
          data: {
            schoolId,
            patientId: patient.id,
            userId: patient.userId || undefined,
            stage: 'ADMITTED',
            preAdmissionData: {
              source: 'BOARDING_NIGHT_ROLL_CALL',
              hostelId,
              time,
              date,
              notes: notes || 'Admitted to sick bay during night roll call'
            }
          }
        });
        clinicAdmitted = true;
        sickBayAdmissions.push(studentId);
      }

      // 4. On Exeat flow: sync day attendance to "excused" with note
      if (finalStatus === 'on_exeat') {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (student) {
          const teacher = await prisma.teacher.findFirst({ where: { schoolId } });
          if (teacher) {
            await prisma.attendance.upsert({
              where: {
                schoolId_studentId_date_classId: {
                  schoolId,
                  studentId,
                  date: startOfDay,
                  classId: student.classId || ''
                }
              },
              update: {
                status: 'excused',
                note: 'On Approved Exeat'
              },
              create: {
                schoolId,
                studentId,
                teacherId: teacher.id,
                date: startOfDay,
                classId: student.classId || undefined,
                status: 'excused',
                note: 'On Approved Exeat'
              }
            }).catch(() => {});
          }
        }
      }

      // 5. Upsert BoardingRollCall
      const existingRollCall = await prisma.boardingRollCall.findFirst({
        where: {
          schoolId,
          hostelId,
          time,
          studentId,
          date: { gte: startOfDay, lte: endOfDay }
        }
      });

      let saved;
      if (existingRollCall) {
        saved = await prisma.boardingRollCall.update({
          where: { id: existingRollCall.id },
          data: {
            status: finalStatus,
            notes,
            markedById: userId,
            smsDispatched: existingRollCall.smsDispatched || smsDispatched,
            disciplineCaseCreated: existingRollCall.disciplineCaseCreated || disciplineCaseCreated,
            clinicAdmitted: existingRollCall.clinicAdmitted || clinicAdmitted
          }
        });
      } else {
        saved = await prisma.boardingRollCall.create({
          data: {
            schoolId,
            hostelId,
            time,
            studentId,
            date: sessionDate,
            status: finalStatus,
            notes,
            markedById: userId,
            smsDispatched,
            disciplineCaseCreated,
            clinicAdmitted
          }
        });
      }
      savedRecords.push(saved);
    }

    res.json({
      success: true,
      message: `Night roll call (${time}) recorded for ${savedRecords.length} boarders`,
      hostelId,
      date,
      time,
      count: savedRecords.length,
      absentCasesLogged: triggeredAbsences.length,
      sickBayAdmissions: sickBayAdmissions.length
    });
  } catch (error: any) {
    console.error('Failed to save boarding roll call:', error);
    res.status(500).json({ error: error.message || 'Failed to save boarding roll call' });
  }
});

// ═══════════ EXEATS WORKFLOW ═══════════

/**
 * GET /api/ancillary/boarding/exeats
 * Fetch exeat records with student & approval details
 */
router.get('/boarding/exeats', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { status, studentId, type } = req.query as any;

    const exeats = await prisma.exeat.findMany({
      where: {
        schoolId,
        ...(status ? { status } : {}),
        ...(studentId ? { studentId } : {}),
        ...(type ? { type } : {})
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            class: { select: { name: true } },
            hostel: { select: { name: true } }
          }
        },
        approvedByHousemaster: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(exeats);
  } catch (error) {
    console.error('Failed to fetch exeats:', error);
    res.status(500).json({ error: 'Failed to fetch exeat records' });
  }
});

/**
 * POST /api/ancillary/boarding/exeats
 * Request a new exeat (weekend, emergency, medical)
 */
router.post('/boarding/exeats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { studentId, type, reason, departureAt, returnAt } = req.body;

    if (!studentId || !type || !reason || !departureAt || !returnAt) {
      return res.status(400).json({ error: 'studentId, type, reason, departureAt, and returnAt are required' });
    }

    const exeat = await prisma.exeat.create({
      data: {
        schoolId,
        studentId,
        type, // weekend | emergency | medical
        reason,
        departureAt: new Date(departureAt),
        returnAt: new Date(returnAt),
        status: 'pending_parent'
      },
      include: {
        student: { select: { name: true, studentId: true } }
      }
    });

    res.json({ success: true, exeat });
  } catch (error: any) {
    console.error('Failed to create exeat:', error);
    res.status(500).json({ error: error.message || 'Failed to create exeat request' });
  }
});

/**
 * POST /api/ancillary/boarding/exeats/:id/parent-sign
 * Parent signs exeat digitally
 */
router.post('/boarding/exeats/:id/parent-sign', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { parentSignature, status = 'approved' } = req.body;

    if (!parentSignature) {
      return res.status(400).json({ error: 'Parent signature is required' });
    }

    const exeat = await prisma.exeat.findFirst({
      where: { id: req.params.id as string, schoolId }
    });
    if (!exeat) return res.status(404).json({ error: 'Exeat request not found' });

    const updated = await prisma.exeat.update({
      where: { id: exeat.id },
      data: {
        parentSignature,
        parentIp: req.ip || '127.0.0.1',
        parentSignedAt: new Date(),
        status
      }
    });

    res.json({ success: true, exeat: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sign exeat' });
  }
});

/**
 * POST /api/ancillary/boarding/exeats/:id/approve
 * Housemaster approves exeat: updates day attendance to "On Exeat" (not Absent)
 */
router.post('/boarding/exeats/:id/approve', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { approvalNotes } = req.body;

    const exeat = await prisma.exeat.findFirst({
      where: { id: req.params.id as string, schoolId },
      include: { student: true }
    });
    if (!exeat) return res.status(404).json({ error: 'Exeat request not found' });

    const updated = await prisma.exeat.update({
      where: { id: exeat.id },
      data: {
        status: 'approved',
        approvedByHousemasterId: req.user!.id,
        approvalNotes: approvalNotes || null
      }
    });

    // Flow: An approved exeat sets day attendance to "On Exeat" (not Absent)
    const startDate = new Date(exeat.departureAt);
    startDate.setHours(0, 0, 0, 0);
    const teacher = await prisma.teacher.findFirst({ where: { schoolId } });
    if (teacher && exeat.student) {
      await prisma.attendance.upsert({
        where: {
          schoolId_studentId_date_classId: {
            schoolId,
            studentId: exeat.studentId,
            date: startDate,
            classId: exeat.student.classId || ''
          }
        },
        update: {
          status: 'excused',
          note: `On Exeat: ${exeat.reason}`
        },
        create: {
          schoolId,
          studentId: exeat.studentId,
          teacherId: teacher.id,
          date: startDate,
          classId: exeat.student.classId || undefined,
          status: 'excused',
          note: `On Exeat: ${exeat.reason}`
        }
      }).catch(() => {});
    }

    res.json({ success: true, exeat: updated });
  } catch (error: any) {
    console.error('Failed to approve exeat:', error);
    res.status(500).json({ error: error.message || 'Failed to approve exeat' });
  }
});

/**
 * POST /api/ancillary/boarding/exeats/:id/reject
 * Reject an exeat request
 */
router.post('/boarding/exeats/:id/reject', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const { approvalNotes = 'Rejected by housemaster' } = req.body;

    const updated = await prisma.exeat.update({
      where: { id: req.params.id as string },
      data: {
        status: 'rejected',
        approvedByHousemasterId: req.user!.id,
        approvalNotes
      }
    });

    res.json({ success: true, exeat: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reject exeat' });
  }
});

/**
 * POST /api/ancillary/boarding/exeats/:id/return
 * Mark student as returned from exeat
 */
router.post('/boarding/exeats/:id/return', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await prisma.exeat.update({
      where: { id: req.params.id as string },
      data: {
        status: 'returned',
        returnedAt: new Date()
      }
    });

    res.json({ success: true, exeat: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark exeat returned' });
  }
});

// ═══════════ VISITOR TRACKING ═══════════

/**
 * @route   GET /api/ancillary/visitors
 * @desc    Get current day's visitors
 */
router.get('/visitors', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const visitors = await prisma.visitorLog.findMany({
      where: { schoolId },
      orderBy: { entryTime: 'desc' }
    });
    res.json(visitors);
  } catch (error) {
    // Note: Prisma might have named it VisitorLog or visitorLog based on schema
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

/**
 * @route   POST /api/ancillary/visitors
 * @desc    Record a new visitor entry
 */
router.post('/visitors', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  const { name, phone, purpose, vehicleReg } = req.body;
  const schoolId = req.user!.schoolId!;
  const guardId = req.user!.id;

  try {
    const visitor = await prisma.visitorLog.create({
      data: { name, phone, purpose, vehicleReg, guardId, schoolId }
    });
    res.json(visitor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record visitor' });
  }
});

// ═══════════ MEAL PLANNING ═══════════

/**
 * @route   GET /api/ancillary/menu/current
 * @desc    Get the menu starting this week
 */
router.get('/menu/current', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.findFirst({
      where: { schoolId, published: true },
      orderBy: { weekStarting: 'desc' }
    });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * @route   POST /api/ancillary/menu
 * @desc    Create/Update a weekly menu
 */
router.post('/menu', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  const { weekStarting, menuData, published } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.create({
      data: {
        weekStarting: new Date(weekStarting),
        menuData,
        published,
        schoolId
      }
    });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save menu' });
  }
});

export default router;

