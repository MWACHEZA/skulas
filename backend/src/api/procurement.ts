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
    } else {
      // STAFF/TEACHER: Only see their own requests
      whereClause.requesterId = user.id;
    }

    const requisitions = await prisma.requisition.findMany({
      where: whereClause,
      include: {
        requester: { select: { id: true, name: true, role: true } },
        hod: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        bursar: { select: { name: true } },
        admin: { select: { name: true } },
        purchaseOrder: true
      },
      orderBy: { createdAt: 'desc' }
    });
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

    // 1. HOD APPROVAL (PENDING -> HOD_APPROVED)
    if (reqInstance.status === 'PENDING') {
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
      return res.status(400).json({ error: 'Requisition is already finalized' });
    }

    const updated = await prisma.requisition.update({
      where: { id: id as string },
      data: { status: nextStatus, ...updateData },
      include: { requester: { select: { name: true } } }
    });

    await logAction(req, 'APPROVE_REQUISITION_STAGE', 'Requisition', String(id), { from: reqInstance.status, to: nextStatus });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Approval action failed' });
  }
});

export default router;



