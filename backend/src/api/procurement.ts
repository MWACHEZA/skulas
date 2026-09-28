import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

/**
 * @route   GET /api/procurement/requisitions
 * @desc    Get requisitions based on role (Self for Staff, Dept for HOD, All for Admin/Bursar)
 */
router.get('/requisitions', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    let whereClause: any = { schoolId: user.schoolId! };

    const isProcurementOrBuyer = user.secondaryRoles?.some(r => 
      r.toLowerCase() === 'procurement officer' || 
      r.toLowerCase() === 'buyer'
    );

    // Role-based visibility logic
    if (user.role === 'SCHOOL_ADMIN' || user.role === 'BURSAR' || isProcurementOrBuyer) {
      // Sees everything in the school
    } else if (user.secondaryRoles.includes('HOD')) {
      // Find HOD's department
      const teacher = await prisma.teacher.findFirst({ where: { userId: user.id } });
      whereClause = {
        schoolId: user.schoolId!,
        OR: [
          { department: teacher?.department },
          { requesterId: user.id }
        ]
      };
    } else if (user.role === 'ANCILLARY') {
      // Matron / Boarding staff: see requests for hostels they warden, or where they are assigned HOD, or their own
      const hostelsManaged = await prisma.hostel.findMany({
        where: { schoolId: user.schoolId!, wardenUserId: user.id },
        select: { id: true }
      });
      const hostelIds = hostelsManaged.map(h => h.id);

      whereClause = {
        schoolId: user.schoolId!,
        OR: [
          { requesterId: user.id },
          { hodId: user.id },
          ...(hostelIds.length > 0 ? [{ hostelReqId: { in: hostelIds } }] : []),
          { requesterRole: 'STUDENT_LEADER' }
        ]
      };
    } else if (user.role === 'STUDENT') {
      // STUDENT LEADER: Find student record and enforce active leadership
      const student = await prisma.student.findFirst({
        where: { userId: user.id, schoolId: user.schoolId! }
      });
      if (!student) {
        return res.status(403).json({ error: 'Student record not found' });
      }
      const activeAssignment = await prisma.leadershipAssignment.findFirst({
        where: { studentId: student.id, schoolId: user.schoolId!, isActive: true }
      });
      if (!activeAssignment) {
        return res.status(403).json({ error: 'Access denied: Active student leadership assignment required' });
      }
      whereClause = {
        schoolId: user.schoolId!,
        requestedByStudentId: student.id
      };
    } else {
      // STAFF/TEACHER: Only see their own requests
      whereClause.requesterId = user.id;
    }

    // Optional query param filters
    if (req.query.requesterRole) {
      whereClause.requesterRole = String(req.query.requesterRole);
    }
    if (req.query.status) {
      whereClause.status = String(req.query.status);
    }
    if (req.query.hostelId) {
      whereClause.hostelReqId = String(req.query.hostelId);
    }

    const requisitions = await prisma.requisition.findMany({
      where: whereClause,
      include: {
        requester: { select: { id: true, name: true, role: true } },
        requestedByStudent: { select: { id: true, name: true, studentId: true } },
        hostelReq: { select: { id: true, name: true } },
        hod: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        bursar: { select: { name: true } },
        admin: { select: { name: true } },
        matronApprovedBy: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } },
        purchaseOrder: user.role !== 'STUDENT'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Student Serializer: strictly sanitize out all financial data
    if (user.role === 'STUDENT') {
      const sanitized = requisitions.map(r => ({
        id: r.id,
        refNumber: r.refNumber,
        title: r.title,
        status: r.status,
        requesterRole: r.requesterRole,
        items: r.items,
        hostelReq: r.hostelReq,
        createdAt: r.createdAt,
        matronApprovedAt: r.matronApprovedAt,
        issuedAt: r.issuedAt,
        receivedAt: r.receivedAt,
        rejectionReason: r.rejectionReason
      }));
      return res.json(sanitized);
    }

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

const DEFAULT_REQUISITION_TYPES = [
  'Books & Learning Resources',
  'Stationery & Classroom Supplies',
  'Laboratory Equipment & Consumables',
  'IT Hardware & Software',
  'Library Furniture & Fixtures',
  'Maintenance & Repairs',
  'Uniforms & Apparel',
  'Sports & Physical Education',
  'Other'
];

/**
 * @route   GET /api/procurement/requisitions/types
 * @desc    Get configured requisition types
 */
router.get('/requisitions/types', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(DEFAULT_REQUISITION_TYPES);
});

/**
 * @route   GET /api/procurement/requisitions/next-number
 * @desc    Get auto-generated next requisition number
 */
router.get('/requisitions/next-number', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const year = new Date().getFullYear();
    const count = await prisma.requisition.count({ where: { schoolId } });
    const nextNumber = `REQ-${year}-${(count + 1).toString().padStart(4, '0')}`;
    res.json({ nextNumber });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate requisition number' });
  }
});

/**
 * @route   POST /api/procurement/requisitions
 * @desc    [STAFF] Create a new requisition (Draft or Submitted to HOD)
 */
router.post('/requisitions', requireAuth, async (req: AuthRequest, res: Response) => {
  const { 
    title, 
    description, 
    estimatedAmount,
    requisitionType,
    priority = 'Medium',
    neededByDate,
    attachmentUrl,
    items,
    status = 'PENDING'
  } = req.body;
  const user = req.user!;
  const schoolId = user.schoolId!;

  try {
    const year = new Date().getFullYear();
    const count = await prisma.requisition.count({ where: { schoolId } });
    const refNumber = `REQ-${year}-${(count + 1).toString().padStart(4, '0')}`;

    // Find the user's department and head
    const dbUser = await prisma.user.findFirst({ 
      where: { id: user.id },
      include: { dept: true }
    });
    const departmentId = dbUser?.departmentId;
    const hodId = dbUser?.dept?.headId;

    const requisition = await prisma.requisition.create({
      data: {
        refNumber,
        title,
        description,
        estimatedAmount: parseFloat(String(estimatedAmount || 0)),
        requisitionType: requisitionType || 'Books & Learning Resources',
        priority: priority || 'Medium',
        neededByDate: neededByDate ? new Date(neededByDate) : null,
        attachmentUrl: attachmentUrl || null,
        items: items || null,
        status: status === 'DRAFT' ? 'DRAFT' : 'PENDING',
        departmentId,
        hodId,
        requesterId: user.id,
        schoolId
      },
      include: {
        department: true,
        requester: { select: { id: true, name: true, role: true } }
      }
    });

    await logAction(req, 'CREATE_REQUISITION', 'Requisition', requisition.id, { 
      refNumber, 
      title, 
      amount: estimatedAmount, 
      status: requisition.status 
    });
    res.status(201).json(requisition);
  } catch (err) {
    console.error('Create requisition error:', err);
    res.status(500).json({ error: 'Failed to raise requisition' });
  }
});

/**
 * @route   PATCH /api/procurement/requisitions/:id
 * @desc    Update a requisition (e.g. edit draft or submit draft to HOD)
 */
router.patch('/requisitions/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const {
    title,
    description,
    estimatedAmount,
    requisitionType,
    priority,
    neededByDate,
    attachmentUrl,
    items,
    status
  } = req.body;

  try {
    const existing = await prisma.requisition.findFirst({
      where: { id: String(id), schoolId: user.schoolId! }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Only requester or admin/HOD can edit if it's draft or pending
    if (existing.requesterId !== user.id && user.role !== 'SCHOOL_ADMIN') {
      return res.status(403).json({ error: 'Not authorized to edit this requisition' });
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (estimatedAmount !== undefined) data.estimatedAmount = parseFloat(String(estimatedAmount));
    if (requisitionType !== undefined) data.requisitionType = requisitionType;
    if (priority !== undefined) data.priority = priority;
    if (neededByDate !== undefined) data.neededByDate = neededByDate ? new Date(neededByDate) : null;
    if (attachmentUrl !== undefined) data.attachmentUrl = attachmentUrl;
    if (items !== undefined) data.items = items;
    if (status !== undefined) data.status = status;

    const updated = await prisma.requisition.update({
      where: { id: String(id) },
      data,
      include: {
        department: true,
        requester: { select: { id: true, name: true, role: true } }
      }
    });

    await logAction(req, 'UPDATE_REQUISITION', 'Requisition', updated.id, { title: updated.title, status: updated.status });
    res.json(updated);
  } catch (err) {
    console.error('Update requisition error:', err);
    res.status(500).json({ error: 'Failed to update requisition' });
  }
});

/**
 * @route   PATCH /api/procurement/requisitions/:id/approve
 * @desc    [HOD/BURSAR/ADMIN] Progress requisition through approval stages
 */
router.patch('/requisitions/:id/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // 'APPROVE' or 'REJECT'
  const user = req.user!;

  try {
    const reqInstance = await prisma.requisition.findFirst({ where: { id: id as string } });
    if (!reqInstance || reqInstance.schoolId !== user.schoolId) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (action === 'REJECT') {
      const updated = await prisma.requisition.update({
        where: { id: id as string },
        data: { status: 'REJECTED' }
      });
      await logAction(req, 'REJECT_REQUISITION', 'Requisition', String(id), { previousStatus: reqInstance.status });
      return res.json(updated);
    }

    let nextStatus = reqInstance.status;
    const updateData: any = {};

    // 0. MATRON APPROVAL for Student Leader requests (PENDING_HOD_BOARDING -> PENDING_ADMIN)
    if (reqInstance.status === 'PENDING_HOD_BOARDING') {
      const isMatronOrAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'ANCILLARY' || reqInstance.hodId === user.id;
      if (isMatronOrAdmin) {
        nextStatus = 'PENDING_ADMIN';
        updateData.matronApprovedById = user.id;
        updateData.matronApprovedAt = new Date();
      } else {
        return res.status(403).json({ error: 'Requires approval from the Boarding Matron / Warden' });
      }
    }
    // 0b. ADMIN APPROVAL for Student Leader requests (PENDING_ADMIN -> PENDING_BURSAR)
    else if (reqInstance.status === 'PENDING_ADMIN') {
      if (user.role === 'SCHOOL_ADMIN') {
        nextStatus = 'PENDING_BURSAR';
        updateData.adminId = user.id;
      } else {
        return res.status(403).json({ error: 'Requires School Admin approval' });
      }
    }
    // 0c. BURSAR APPROVAL for Student Leader requests (PENDING_BURSAR -> APPROVED)
    else if (reqInstance.status === 'PENDING_BURSAR') {
      if (user.role === 'BURSAR' || user.role === 'SCHOOL_ADMIN') {
        nextStatus = 'APPROVED';
        updateData.bursarId = user.id;
      } else {
        return res.status(403).json({ error: 'Requires Bursar approval' });
      }
    }
    // 1. HOD APPROVAL (PENDING -> HOD_APPROVED)
    else if (reqInstance.status === 'PENDING') {
      // Check if user is the assigned HOD for this requisition's department
      const isAssignedHOD = reqInstance.hodId === user.id;
      
      if (user.role === 'SCHOOL_ADMIN' || isAssignedHOD) {
        nextStatus = 'HOD_APPROVED';
        updateData.hodId = user.id; // Record who actually approved it
      } else {
        return res.status(403).json({ error: 'Requires approval from the assigned Department Head' });
      }
    } 
    // 2. BURSAR APPROVAL (HOD_APPROVED -> BURSAR_APPROVED)
    else if (reqInstance.status === 'HOD_APPROVED') {
      if (user.role === 'BURSAR' || user.role === 'SCHOOL_ADMIN') {
        nextStatus = 'BURSAR_APPROVED';
        updateData.bursarId = user.id;
      } else {
        return res.status(403).json({ error: 'Requires Bursar approval' });
      }
    } 
    // 3. ADMIN FINAL APPROVAL (BURSAR_APPROVED -> APPROVED)
    else if (reqInstance.status === 'BURSAR_APPROVED') {
      if (user.role === 'SCHOOL_ADMIN') {
        nextStatus = 'APPROVED';
        updateData.adminId = user.id;
      } else {
        return res.status(403).json({ error: 'Requires final Admin approval' });
      }
    } 
    else {
      return res.status(400).json({ error: 'Requisition is already finalized or in another stage' });
    }

    const updated = await prisma.requisition.update({
      where: { id: id as string },
      data: { status: nextStatus, ...updateData },
      include: {
        requester: { select: { name: true } },
        requestedByStudent: { select: { name: true } },
        hostelReq: { select: { name: true } }
      }
    });

    await logAction(req, 'APPROVE_REQUISITION_STAGE', 'Requisition', String(id), { from: reqInstance.status, to: nextStatus });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Approval action failed' });
  }
});

/**
 * @route   POST /api/procurement/requisitions/:id/matron-approve
 * @desc    [MATRON] Approve student leader cleaning supplies request
 */
router.post('/requisitions/:id/matron-approve', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const requisition = await prisma.requisition.findFirst({
      where: { id: String(id), schoolId: user.schoolId! }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (requisition.status !== 'PENDING_HOD_BOARDING') {
      return res.status(400).json({ error: `Cannot approve request with status: ${requisition.status}` });
    }

    const updated = await prisma.requisition.update({
      where: { id: String(id) },
      data: {
        status: 'PENDING_ADMIN',
        matronApprovedAt: new Date(),
        matronApprovedById: user.id
      },
      include: {
        requestedByStudent: { select: { id: true, name: true } },
        hostelReq: { select: { id: true, name: true } }
      }
    });

    await logAction(req, 'MATRON_APPROVE_STUDENT_REQUEST', 'Requisition', String(id), {
      refNumber: requisition.refNumber,
      approvedBy: user.name
    });

    res.json(updated);
  } catch (err) {
    console.error('Matron approve error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

/**
 * @route   POST /api/procurement/requisitions/:id/matron-reject
 * @desc    [MATRON] Decline student leader cleaning supplies request
 */
router.post('/requisitions/:id/matron-reject', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  try {
    const requisition = await prisma.requisition.findFirst({
      where: { id: String(id), schoolId: user.schoolId! }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (requisition.status !== 'PENDING_HOD_BOARDING' && requisition.status !== 'PENDING_ADMIN') {
      return res.status(400).json({ error: `Cannot decline request with status: ${requisition.status}` });
    }

    const updated = await prisma.requisition.update({
      where: { id: String(id) },
      data: {
        status: 'REJECTED',
        rejectionReason: reason?.trim() || 'Declined by Boarding Matron / Administrator'
      },
      include: {
        requestedByStudent: { select: { id: true, name: true } },
        hostelReq: { select: { id: true, name: true } }
      }
    });

    await logAction(req, 'MATRON_REJECT_STUDENT_REQUEST', 'Requisition', String(id), {
      refNumber: requisition.refNumber,
      reason
    });

    res.json(updated);
  } catch (err) {
    console.error('Matron reject error:', err);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

/**
 * @route   POST /api/procurement/requisitions/:id/issue
 * @desc    [STORE/INVENTORY] Issue items to student leader or staff and decrement stock
 */
router.post('/requisitions/:id/issue', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const allowedIssueRoles = ['ANCILLARY', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'BURSAR'];
  if (!allowedIssueRoles.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden: Requires Store, Ancillary, or Admin role to issue items' });
  }

  try {
    const requisition = await prisma.requisition.findFirst({
      where: { id: String(id), schoolId: user.schoolId! },
      include: {
        requestedByStudent: { select: { id: true, name: true } },
        hostelReq: { select: { id: true, name: true } }
      }
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    if (requisition.status !== 'APPROVED' && requisition.status !== 'PENDING_BURSAR') {
      return res.status(400).json({
        error: `Cannot issue supplies for request with status: ${requisition.status}. Must be APPROVED or PENDING_BURSAR.`
      });
    }

    // Process inventory decrements and log consumptions
    const items = Array.isArray(requisition.items) ? (requisition.items as any[]) : [];
    for (const item of items) {
      const itemName = item.name || item.itemName;
      const qty = parseFloat(item.quantity || item.qty || 1);

      if (itemName) {
        // Try to find matching PhysicalProduct
        const product = await prisma.physicalProduct.findFirst({
          where: {
            schoolId: user.schoolId!,
            name: { equals: itemName, mode: 'insensitive' }
          }
        });

        if (product) {
          // Decrement stock
          await prisma.physicalProduct.update({
            where: { id: product.id },
            data: { quantity: Math.max(0, product.quantity - qty) }
          });

          // Record consumption tagged with hostelId
          await prisma.physicalProductConsumption.create({
            data: {
              productId: product.id,
              quantity: qty,
              requestedBy: requisition.requestedByStudent?.name || requisition.title,
              dispatchedBy: user.name,
              date: new Date(),
              schoolId: user.schoolId!,
              hostelId: requisition.hostelReqId || null
            }
          });
        }
      }
    }

    const updated = await prisma.requisition.update({
      where: { id: String(id) },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        issuedById: user.id
      }
    });

    await logAction(req, 'ISSUE_REQUISITION_ITEMS', 'Requisition', String(id), {
      refNumber: requisition.refNumber,
      issuedTo: requisition.requestedByStudent?.name || 'Staff'
    });

    res.json(updated);
  } catch (err) {
    console.error('Issue requisition error:', err);
    res.status(500).json({ error: 'Failed to issue items' });
  }
});

export default router;



