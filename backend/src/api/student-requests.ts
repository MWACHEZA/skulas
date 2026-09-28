import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();
router.use(requireAuth);

/**
 * Middleware: Verify caller is an active student leader for this school
 */
export const requireStudentLeader = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const user = req.user!;
    if (user.role !== 'STUDENT') {
      res.status(403).json({ error: 'Access denied: Must be a student' });
      return;
    }

    const student = await prisma.student.findFirst({
      where: { userId: user.id, schoolId: user.schoolId! }
    });

    if (!student) {
      res.status(403).json({ error: 'Student record not found' });
      return;
    }

    const activeAssignment = await prisma.leadershipAssignment.findFirst({
      where: {
        studentId: student.id,
        schoolId: user.schoolId!,
        isActive: true
      },
      include: {
        hostel: { select: { id: true, name: true } }
      }
    });

    if (!activeAssignment) {
      res.status(403).json({ error: 'Access denied: Active student leadership assignment required' });
      return;
    }

    (req as any).student = student;
    (req as any).leadership = activeAssignment;
    next();
  } catch (err) {
    console.error('requireStudentLeader error:', err);
    res.status(500).json({ error: 'Failed to verify leadership credentials' });
  }
};

/**
 * @route GET /api/student-requests/leadership-check
 * @desc Check if current student has active leadership assignment
 */
router.get('/leadership-check', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'STUDENT') {
      res.json({ isLeader: false, assignment: null });
      return;
    }

    const student = await prisma.student.findFirst({
      where: { userId: user.id, schoolId: user.schoolId! }
    });

    if (!student) {
      res.json({ isLeader: false, assignment: null });
      return;
    }

    const assignment = await prisma.leadershipAssignment.findFirst({
      where: {
        studentId: student.id,
        schoolId: user.schoolId!,
        isActive: true
      },
      include: {
        hostel: { select: { id: true, name: true } }
      }
    });

    res.json({ isLeader: !!assignment, assignment });
  } catch (err) {
    console.error('leadership-check error:', err);
    res.status(500).json({ error: 'Failed to check leadership status' });
  }
});

/**
 * @route GET /api/student-requests/allowed-items
 * @desc Get active cleaning supplies allowed for student leader requests
 */
router.get('/allowed-items', requireStudentLeader, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const items = await prisma.studentAllowedItem.findMany({
      where: { schoolId, isActive: true },
      orderBy: { itemName: 'asc' }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch allowed supplies' });
  }
});

/**
 * @route GET /api/student-requests
 * @desc List requests submitted by this student leader
 */
router.get('/', requireStudentLeader, async (req: AuthRequest, res: Response) => {
  try {
    const student = (req as any).student;
    const schoolId = req.user!.schoolId!;

    const requisitions = await prisma.requisition.findMany({
      where: {
        schoolId,
        requestedByStudentId: student.id,
        requesterRole: 'STUDENT_LEADER'
      },
      include: {
        hostelReq: { select: { id: true, name: true } },
        matronApprovedBy: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map internal status to plain language labels
    const plainLanguageMap: Record<string, string> = {
      'PENDING_HOD_BOARDING': 'Waiting for Matron',
      'PENDING_ADMIN': 'Waiting for Admin',
      'PENDING_BURSAR': 'Waiting for Bursar',
      'ISSUED': 'Ready for collection',
      'RECEIVED': 'Received',
      'REJECTED': 'Declined'
    };

    const enriched = requisitions.map(r => ({
      ...r,
      displayStatus: plainLanguageMap[r.status] || r.status
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cleaning requests' });
  }
});

/**
 * @route POST /api/student-requests
 * @desc Submit a cleaning supplies request
 */
router.post('/', requireStudentLeader, async (req: AuthRequest, res: Response) => {
  try {
    const student = (req as any).student;
    const leadership = (req as any).leadership;
    const schoolId = req.user!.schoolId!;
    const { items, hostelId, reason } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one cleaning supply item is required' });
      return;
    }

    // 1. ANTI-ABUSE: Anti-spam rate limit (Max 10 requests per rolling 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRequestCount = await prisma.requisition.count({
      where: {
        schoolId,
        requestedByStudentId: student.id,
        requesterRole: 'STUDENT_LEADER',
        createdAt: { gte: sevenDaysAgo }
      }
    });

    if (recentRequestCount >= 10) {
      res.status(429).json({
        error: 'Request limit reached: You can submit a maximum of 10 requests every 7 days. Please wait before submitting again.'
      });
      return;
    }

    // 2. ANTI-ABUSE: Validate every item against tenant's active allowed list
    const allowedItems = await prisma.studentAllowedItem.findMany({
      where: { schoolId, isActive: true }
    });
    const allowedSkuMap = new Map(allowedItems.map(i => [i.itemSku.toLowerCase(), i]));

    const validatedItems: any[] = [];
    for (const item of items) {
      const sku = (item.sku || item.itemSku || '').trim().toLowerCase();
      const allowed = allowedSkuMap.get(sku);
      if (!allowed) {
        res.status(403).json({
          error: `Item "${item.name || item.itemName || sku}" is not on your school's approved cleaning supplies list.`
        });
        return;
      }

      const qty = parseInt(item.quantity || item.qty, 10);
      if (isNaN(qty) || qty < 1 || qty > 20) {
        res.status(400).json({
          error: `Invalid quantity for ${allowed.itemName}. Maximum allowed per item is 20.`
        });
        return;
      }

      validatedItems.push({
        sku: allowed.itemSku,
        name: allowed.itemName,
        quantity: qty,
        unit: 'Units'
      });
    }

    // 3. ANTI-ABUSE & FORCED ROUTING: Determine Hostel
    let targetHostelId: string | null = null;
    if (leadership.leadershipRole === 'HOSTEL_PREFECT') {
      // Must be locked to the leader's assigned hostel
      targetHostelId = leadership.hostelId;
      if (!targetHostelId) {
        res.status(400).json({ error: 'Your leadership assignment does not have a designated hostel linked.' });
        return;
      }
    } else {
      // Non-hostel roles (Head Boy/Girl, SRC): select from valid school hostels
      if (!hostelId) {
        res.status(400).json({ error: 'Please select a hostel for this cleaning supplies request.' });
        return;
      }
      const existingHostel = await prisma.hostel.findFirst({
        where: { id: hostelId, schoolId }
      });
      if (!existingHostel) {
        res.status(400).json({ error: 'Selected hostel does not exist in your school.' });
        return;
      }
      targetHostelId = existingHostel.id;
    }

    // 4. FORCED ROUTING: Determine Matron/Boarding Master approver
    const hostel = await prisma.hostel.findFirst({
      where: { id: targetHostelId, schoolId },
      select: { id: true, name: true, wardenUserId: true }
    });

    let designatedApproverId: string | null = hostel?.wardenUserId || null;

    // Fallback: If hostel has no assigned warden, find ANCILLARY user in a 'Boarding' department
    if (!designatedApproverId) {
      const boardingDept = await prisma.department.findFirst({
        where: {
          schoolId,
          name: { contains: 'Boarding', mode: 'insensitive' }
        }
      });

      if (boardingDept) {
        const matronUser = await prisma.user.findFirst({
          where: {
            schoolId,
            role: 'ANCILLARY',
            departmentId: boardingDept.id
          }
        });
        if (matronUser) {
          designatedApproverId = matronUser.id;
        }
      }
    }

    // Find boarding department id if exists
    const boardingDepartment = await prisma.department.findFirst({
      where: {
        schoolId,
        name: { contains: 'Boarding', mode: 'insensitive' }
      }
    });

    // 5. Generate Requisition Reference Number
    const year = new Date().getFullYear();
    const count = await prisma.requisition.count({ where: { schoolId } });
    const refNumber = `SLR-${year}-${String(count + 1).padStart(4, '0')}`;

    // 6. DB ZERO-AMOUNT ENFORCEMENT: Students cannot set or see prices (0 at DB level)
    const newRequisition = await prisma.requisition.create({
      data: {
        schoolId,
        refNumber,
        title: `Cleaning Supplies (${hostel?.name || 'Hostel'}) - ${student.name}`,
        description: reason?.trim() || 'Hostel sanitation and cleaning supplies request',
        estimatedAmount: 0, // Enforced zero
        priority: 'Medium',
        requisitionType: 'Maintenance & Repairs',
        status: 'PENDING_HOD_BOARDING',
        requesterRole: 'STUDENT_LEADER',
        requestedByStudentId: student.id,
        requesterId: req.user!.id,
        hostelReqId: targetHostelId,
        hodId: designatedApproverId,
        departmentId: boardingDepartment?.id || null,
        items: validatedItems
      },
      include: {
        hostelReq: { select: { id: true, name: true } }
      }
    });

    await logAction(
      req,
      'CREATE_STUDENT_LEADER_REQUEST',
      'Requisition',
      newRequisition.id,
      {
        refNumber,
        hostel: hostel?.name,
        role: leadership.leadershipRole,
        itemCount: validatedItems.length
      }
    );

    res.status(201).json(newRequisition);
  } catch (err) {
    console.error('Submit student request error:', err);
    res.status(500).json({ error: 'Failed to submit cleaning supplies request' });
  }
});

/**
 * @route PATCH /api/student-requests/:id/confirm-received
 * @desc Confirm physical receipt of issued cleaning supplies
 */
router.patch('/:id/confirm-received', requireStudentLeader, async (req: AuthRequest, res: Response) => {
  try {
    const student = (req as any).student;
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;

    const requisition = await prisma.requisition.findFirst({
      where: {
        id,
        schoolId,
        requestedByStudentId: student.id
      }
    });

    if (!requisition) {
      res.status(404).json({ error: 'Request not found or not owned by you' });
      return;
    }

    if (requisition.status !== 'ISSUED') {
      res.status(400).json({
        error: `Cannot confirm receipt for request with status: ${requisition.status}. Must be 'ISSUED'.`
      });
      return;
    }

    const updated = await prisma.requisition.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date()
      }
    });

    await logAction(
      req,
      'CONFIRM_STUDENT_SUPPLIES_RECEIVED',
      'Requisition',
      id,
      { refNumber: requisition.refNumber }
    );

    res.json({ success: true, requisition: updated });
  } catch (err) {
    console.error('Confirm receipt error:', err);
    res.status(500).json({ error: 'Failed to confirm receipt' });
  }
});

/**
 * @route GET /api/student-requests/hostel-stock
 * @desc Read-only view of current cleaning supply stock for leader's hostel
 */
router.get('/hostel-stock', requireStudentLeader, async (req: AuthRequest, res: Response) => {
  try {
    const leadership = (req as any).leadership;
    const schoolId = req.user!.schoolId!;

    if (leadership.leadershipRole !== 'HOSTEL_PREFECT' || !leadership.hostelId) {
      res.status(403).json({ error: 'Hostel stock view is reserved for Hostel Prefects.' });
      return;
    }

    // Query PhysicalProductConsumption tagged with this hostelId
    const consumptions = await prisma.physicalProductConsumption.findMany({
      where: {
        schoolId,
        hostelId: leadership.hostelId
      },
      include: {
        product: { select: { id: true, name: true, unit: true, quantity: true } }
      },
      orderBy: { date: 'desc' },
      take: 50
    });

    res.json({
      hostel: leadership.hostel,
      records: consumptions
    });
  } catch (err) {
    console.error('Fetch hostel stock error:', err);
    res.status(500).json({ error: 'Failed to fetch hostel stock' });
  }
});

export default router;
