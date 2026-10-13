"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const validation_1 = require("../middleware/validation");
const procurement_service_1 = require("../services/procurement.service");
const procurement_schema_1 = require("../schemas/procurement.schema");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/procurement/requisitions
 * @desc    Get requisitions based on role (Self for Staff, Dept for HOD, All for Admin/Bursar)
 */
router.get('/requisitions', auth_1.requireAuth, async (req, res) => {
    const user = req.user;
    try {
        let whereClause = {};
        if (user.schoolId) {
            whereClause.schoolId = user.schoolId;
        }
        const isProcurementOrBuyer = user.secondaryRoles?.some(r => r?.toLowerCase() === 'procurement officer' ||
            r?.toLowerCase() === 'buyer');
        // Role-based visibility logic
        if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'BURSAR' || isProcurementOrBuyer) {
            // Sees everything in the school
        }
        else if (Array.isArray(user.secondaryRoles) && user.secondaryRoles.includes('HOD')) {
            // Find HOD's department
            const teacher = await prisma_1.default.teacher.findFirst({ where: { userId: user.id } });
            whereClause = {
                ...(user.schoolId ? { schoolId: user.schoolId } : {}),
                OR: [
                    { department: teacher?.department },
                    { requesterId: user.id }
                ]
            };
        }
        else if (user.role === 'ANCILLARY') {
            // Matron / Boarding staff: see requests for hostels they warden, or where they are assigned HOD, or their own
            const hostelsManaged = await prisma_1.default.hostel.findMany({
                where: { ...(user.schoolId ? { schoolId: user.schoolId } : {}), wardenUserId: user.id },
                select: { id: true }
            });
            const hostelIds = hostelsManaged.map(h => h.id);
            whereClause = {
                ...(user.schoolId ? { schoolId: user.schoolId } : {}),
                OR: [
                    { requesterId: user.id },
                    { hodId: user.id },
                    ...(hostelIds.length > 0 ? [{ hostelReqId: { in: hostelIds } }] : []),
                    { requesterRole: 'STUDENT_LEADER' }
                ]
            };
        }
        else if (user.role === 'STUDENT') {
            // STUDENT LEADER: Find student record and enforce active leadership
            const student = await prisma_1.default.student.findFirst({
                where: { userId: user.id, ...(user.schoolId ? { schoolId: user.schoolId } : {}) }
            });
            if (!student) {
                return res.status(403).json({ error: 'Student record not found' });
            }
            const activeAssignment = await prisma_1.default.leadershipAssignment.findFirst({
                where: { studentId: student.id, ...(user.schoolId ? { schoolId: user.schoolId } : {}), isActive: true }
            });
            if (!activeAssignment) {
                return res.status(403).json({ error: 'Access denied: Active student leadership assignment required' });
            }
            whereClause = {
                ...(user.schoolId ? { schoolId: user.schoolId } : {}),
                requestedByStudentId: student.id
            };
        }
        else {
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
        const includeClause = {
            requester: { select: { id: true, name: true, role: true } },
            requestedByStudent: { select: { id: true, name: true, studentId: true } },
            hostelReq: { select: { id: true, name: true } },
            hod: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            bursar: { select: { name: true } },
            admin: { select: { name: true } },
            matronApprovedBy: { select: { id: true, name: true } },
            issuedBy: { select: { id: true, name: true } }
        };
        if (user.role !== 'STUDENT') {
            includeClause.purchaseOrder = true;
        }
        const requisitions = await prisma_1.default.requisition.findMany({
            where: whereClause,
            include: includeClause,
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
    }
    catch (err) {
        console.error('Fetch requisitions error:', err);
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
router.get('/requisitions/types', auth_1.requireAuth, async (req, res) => {
    res.json(DEFAULT_REQUISITION_TYPES);
});
/**
 * @route   GET /api/procurement/requisitions/next-number
 * @desc    Get auto-generated next requisition number
 */
router.get('/requisitions/next-number', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const year = new Date().getFullYear();
        const count = await prisma_1.default.requisition.count({ where: { schoolId } });
        const nextNumber = `REQ-${year}-${(count + 1).toString().padStart(4, '0')}`;
        res.json({ nextNumber });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate requisition number' });
    }
});
/**
 * @route   POST /api/procurement/requisitions
 * @desc    [STAFF] Create a new requisition (Draft or Submitted to HOD)
 */
router.post('/requisitions', auth_1.requireAuth, async (req, res) => {
    const { title, description, estimatedAmount, requisitionType, priority = 'Medium', neededByDate, attachmentUrl, items, status = 'PENDING' } = req.body;
    const user = req.user;
    const schoolId = user.schoolId;
    try {
        const year = new Date().getFullYear();
        const count = await prisma_1.default.requisition.count({ where: { schoolId } });
        const refNumber = `REQ-${year}-${(count + 1).toString().padStart(4, '0')}`;
        // Find the user's department and head
        const dbUser = await prisma_1.default.user.findFirst({
            where: { id: user.id },
            include: { dept: true }
        });
        const departmentId = dbUser?.departmentId;
        const hodId = dbUser?.dept?.headId;
        const requisition = await prisma_1.default.requisition.create({
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
        await (0, audit_1.logAction)(req, 'CREATE_REQUISITION', 'Requisition', requisition.id, {
            refNumber,
            title,
            amount: estimatedAmount,
            status: requisition.status
        });
        res.status(201).json(requisition);
    }
    catch (err) {
        console.error('Create requisition error:', err);
        res.status(500).json({ error: 'Failed to raise requisition' });
    }
});
/**
 * @route   PATCH /api/procurement/requisitions/:id
 * @desc    Update a requisition (e.g. edit draft or submit draft to HOD)
 */
router.patch('/requisitions/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { title, description, estimatedAmount, requisitionType, priority, neededByDate, attachmentUrl, items, status } = req.body;
    try {
        const existing = await prisma_1.default.requisition.findFirst({
            where: { id: String(id), schoolId: user.schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Requisition not found' });
        }
        // Only requester or admin/HOD can edit if it's draft or pending
        if (existing.requesterId !== user.id && user.role !== 'SCHOOL_ADMIN') {
            return res.status(403).json({ error: 'Not authorized to edit this requisition' });
        }
        const data = {};
        if (title !== undefined)
            data.title = title;
        if (description !== undefined)
            data.description = description;
        if (estimatedAmount !== undefined)
            data.estimatedAmount = parseFloat(String(estimatedAmount));
        if (requisitionType !== undefined)
            data.requisitionType = requisitionType;
        if (priority !== undefined)
            data.priority = priority;
        if (neededByDate !== undefined)
            data.neededByDate = neededByDate ? new Date(neededByDate) : null;
        if (attachmentUrl !== undefined)
            data.attachmentUrl = attachmentUrl;
        if (items !== undefined)
            data.items = items;
        if (status !== undefined)
            data.status = status;
        const updated = await prisma_1.default.requisition.update({
            where: { id: String(id) },
            data,
            include: {
                department: true,
                requester: { select: { id: true, name: true, role: true } }
            }
        });
        await (0, audit_1.logAction)(req, 'UPDATE_REQUISITION', 'Requisition', updated.id, { title: updated.title, status: updated.status });
        res.json(updated);
    }
    catch (err) {
        console.error('Update requisition error:', err);
        res.status(500).json({ error: 'Failed to update requisition' });
    }
});
/**
 * @route   PATCH /api/procurement/requisitions/:id/approve
 * @desc    [HOD/BURSAR/ADMIN] Progress requisition through approval stages
 */
router.patch('/requisitions/:id/approve', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const user = req.user;
    try {
        const reqInstance = await prisma_1.default.requisition.findFirst({ where: { id: id } });
        if (!reqInstance || reqInstance.schoolId !== user.schoolId) {
            return res.status(404).json({ error: 'Requisition not found' });
        }
        if (action === 'REJECT') {
            const updated = await prisma_1.default.requisition.update({
                where: { id: id },
                data: { status: 'REJECTED' }
            });
            await (0, audit_1.logAction)(req, 'REJECT_REQUISITION', 'Requisition', String(id), { previousStatus: reqInstance.status });
            return res.json(updated);
        }
        let nextStatus = reqInstance.status;
        const updateData = {};
        // 0. MATRON APPROVAL for Student Leader requests (PENDING_HOD_BOARDING -> PENDING_ADMIN)
        if (reqInstance.status === 'PENDING_HOD_BOARDING') {
            const isMatronOrAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'ANCILLARY' || reqInstance.hodId === user.id;
            if (isMatronOrAdmin) {
                nextStatus = 'PENDING_ADMIN';
                updateData.matronApprovedById = user.id;
                updateData.matronApprovedAt = new Date();
            }
            else {
                return res.status(403).json({ error: 'Requires approval from the Boarding Matron / Warden' });
            }
        }
        // 0b. ADMIN APPROVAL for Student Leader requests (PENDING_ADMIN -> PENDING_BURSAR)
        else if (reqInstance.status === 'PENDING_ADMIN') {
            if (user.role === 'SCHOOL_ADMIN') {
                nextStatus = 'PENDING_BURSAR';
                updateData.adminId = user.id;
            }
            else {
                return res.status(403).json({ error: 'Requires School Admin approval' });
            }
        }
        // 0c. BURSAR APPROVAL for Student Leader requests (PENDING_BURSAR -> APPROVED)
        else if (reqInstance.status === 'PENDING_BURSAR') {
            if (user.role === 'BURSAR' || user.role === 'SCHOOL_ADMIN') {
                nextStatus = 'APPROVED';
                updateData.bursarId = user.id;
            }
            else {
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
            }
            else {
                return res.status(403).json({ error: 'Requires approval from the assigned Department Head' });
            }
        }
        // 2. BURSAR APPROVAL (HOD_APPROVED -> BURSAR_APPROVED)
        else if (reqInstance.status === 'HOD_APPROVED') {
            if (user.role === 'BURSAR' || user.role === 'SCHOOL_ADMIN') {
                nextStatus = 'BURSAR_APPROVED';
                updateData.bursarId = user.id;
            }
            else {
                return res.status(403).json({ error: 'Requires Bursar approval' });
            }
        }
        // 3. ADMIN FINAL APPROVAL (BURSAR_APPROVED -> APPROVED)
        else if (reqInstance.status === 'BURSAR_APPROVED') {
            if (user.role === 'SCHOOL_ADMIN') {
                nextStatus = 'APPROVED';
                updateData.adminId = user.id;
            }
            else {
                return res.status(403).json({ error: 'Requires final Admin approval' });
            }
        }
        else {
            return res.status(400).json({ error: 'Requisition is already finalized or in another stage' });
        }
        const updated = await prisma_1.default.requisition.update({
            where: { id: id },
            data: { status: nextStatus, ...updateData },
            include: {
                requester: { select: { name: true } },
                requestedByStudent: { select: { name: true } },
                hostelReq: { select: { name: true } }
            }
        });
        await (0, audit_1.logAction)(req, 'APPROVE_REQUISITION_STAGE', 'Requisition', String(id), { from: reqInstance.status, to: nextStatus });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Approval action failed' });
    }
});
/**
 * @route   POST /api/procurement/requisitions/:id/matron-approve
 * @desc    [MATRON] Approve student leader cleaning supplies request
 */
router.post('/requisitions/:id/matron-approve', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const requisition = await prisma_1.default.requisition.findFirst({
            where: { id: String(id), schoolId: user.schoolId }
        });
        if (!requisition) {
            return res.status(404).json({ error: 'Requisition not found' });
        }
        if (requisition.status !== 'PENDING_HOD_BOARDING') {
            return res.status(400).json({ error: `Cannot approve request with status: ${requisition.status}` });
        }
        const updated = await prisma_1.default.requisition.update({
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
        await (0, audit_1.logAction)(req, 'MATRON_APPROVE_STUDENT_REQUEST', 'Requisition', String(id), {
            refNumber: requisition.refNumber,
            approvedBy: user.name
        });
        res.json(updated);
    }
    catch (err) {
        console.error('Matron approve error:', err);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});
/**
 * @route   POST /api/procurement/requisitions/:id/matron-reject
 * @desc    [MATRON] Decline student leader cleaning supplies request
 */
router.post('/requisitions/:id/matron-reject', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;
    try {
        const requisition = await prisma_1.default.requisition.findFirst({
            where: { id: String(id), schoolId: user.schoolId }
        });
        if (!requisition) {
            return res.status(404).json({ error: 'Requisition not found' });
        }
        if (requisition.status !== 'PENDING_HOD_BOARDING' && requisition.status !== 'PENDING_ADMIN') {
            return res.status(400).json({ error: `Cannot decline request with status: ${requisition.status}` });
        }
        const updated = await prisma_1.default.requisition.update({
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
        await (0, audit_1.logAction)(req, 'MATRON_REJECT_STUDENT_REQUEST', 'Requisition', String(id), {
            refNumber: requisition.refNumber,
            reason
        });
        res.json(updated);
    }
    catch (err) {
        console.error('Matron reject error:', err);
        res.status(500).json({ error: 'Failed to decline request' });
    }
});
/**
 * @route   POST /api/procurement/requisitions/:id/issue
 * @desc    [STORE/INVENTORY] Issue items to student leader or staff and decrement stock
 */
router.post('/requisitions/:id/issue', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const allowedIssueRoles = ['ANCILLARY', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'BURSAR'];
    if (!allowedIssueRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: Requires Store, Ancillary, or Admin role to issue items' });
    }
    try {
        const requisition = await prisma_1.default.requisition.findFirst({
            where: { id: String(id), schoolId: user.schoolId },
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
        const items = Array.isArray(requisition.items) ? requisition.items : [];
        for (const item of items) {
            const itemName = item.name || item.itemName;
            const qty = parseFloat(item.quantity || item.qty || 1);
            if (itemName) {
                // Try to find matching PhysicalProduct
                const product = await prisma_1.default.physicalProduct.findFirst({
                    where: {
                        schoolId: user.schoolId,
                        name: { equals: itemName, mode: 'insensitive' }
                    }
                });
                if (product) {
                    // Decrement stock
                    await prisma_1.default.physicalProduct.update({
                        where: { id: product.id },
                        data: { quantity: Math.max(0, product.quantity - qty) }
                    });
                    // Record consumption tagged with hostelId
                    await prisma_1.default.physicalProductConsumption.create({
                        data: {
                            productId: product.id,
                            quantity: qty,
                            requestedBy: requisition.requestedByStudent?.name || requisition.title,
                            dispatchedBy: user.name,
                            date: new Date(),
                            schoolId: user.schoolId,
                            hostelId: requisition.hostelReqId || null
                        }
                    });
                }
            }
        }
        const updated = await prisma_1.default.requisition.update({
            where: { id: String(id) },
            data: {
                status: 'ISSUED',
                issuedAt: new Date(),
                issuedById: user.id
            }
        });
        await (0, audit_1.logAction)(req, 'ISSUE_REQUISITION_ITEMS', 'Requisition', String(id), {
            refNumber: requisition.refNumber,
            issuedTo: requisition.requestedByStudent?.name || 'Staff'
        });
        res.json(updated);
    }
    catch (err) {
        console.error('Issue requisition error:', err);
        res.status(500).json({ error: 'Failed to issue items' });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS & BUDGET CHECK
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @route   GET /api/procurement/purchase-orders
 * @desc    List Purchase Orders with filters
 */
router.get('/purchase-orders', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'School ID required' });
        const { status, supplierId } = req.query;
        const where = { schoolId };
        if (status)
            where.status = String(status);
        if (supplierId)
            where.supplierId = String(supplierId);
        const purchaseOrders = await prisma_1.default.purchaseOrder.findMany({
            where,
            include: {
                supplier: { select: { id: true, companyName: true, contactName: true, email: true } },
                grns: { select: { id: true, grnNumber: true, status: true, receivedDate: true } },
                invoices: { select: { id: true, invoiceNo: true, amount: true, matchingStatus: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(purchaseOrders);
    }
    catch (error) {
        console.error('List PO error:', error);
        res.status(500).json({ error: error.message || 'Failed to list purchase orders' });
    }
});
/**
 * @route   GET /api/procurement/purchase-orders/:id
 * @desc    Get detailed Purchase Order with linked GRNs and Invoices
 */
router.get('/purchase-orders/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const id = req.params.id;
        const po = await prisma_1.default.purchaseOrder.findFirst({
            where: { id, schoolId },
            include: {
                supplier: true,
                grns: true,
                invoices: true
            }
        });
        if (!po)
            return res.status(404).json({ error: 'Purchase order not found' });
        res.json(po);
    }
    catch (error) {
        console.error('Get PO error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch purchase order' });
    }
});
/**
 * @route   POST /api/procurement/purchase-orders
 * @desc    Create a Purchase Order in draft status
 */
router.post('/purchase-orders', auth_1.requireAuth, (0, validation_1.validate)(procurement_schema_1.CreatePurchaseOrderSchema), async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'School ID required' });
        const po = await procurement_service_1.ProcurementService.createPurchaseOrder({
            schoolId,
            supplierId: req.body.supplierId,
            description: req.body.description,
            items: req.body.items,
            totalAmount: req.body.totalAmount,
            coaCode: req.body.coaCode,
            department: req.body.department
        });
        res.status(201).json(po);
    }
    catch (error) {
        console.error('Create PO error:', error);
        res.status(400).json({ error: error.message || 'Failed to create purchase order' });
    }
});
/**
 * @route   GET /api/procurement/purchase-orders/:id/budget-check
 * @desc    Check available budget ceiling before approving Purchase Order
 */
router.get('/purchase-orders/:id/budget-check', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const id = req.params.id;
        const po = await prisma_1.default.purchaseOrder.findFirst({
            where: { id, schoolId }
        });
        if (!po)
            return res.status(404).json({ error: 'Purchase order not found' });
        const check = await procurement_service_1.ProcurementService.checkBudget({
            schoolId: schoolId,
            coaCode: po.coaCode || undefined,
            amount: po.totalAmount,
            excludePoId: po.id
        });
        res.json(check);
    }
    catch (error) {
        console.error('Budget check error:', error);
        res.status(500).json({ error: error.message || 'Failed to check budget' });
    }
});
/**
 * @route   POST /api/procurement/purchase-orders/:id/approve
 * @desc    Approve Purchase Order (with budget limit validation)
 */
router.post('/purchase-orders/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), (0, validation_1.validate)(procurement_schema_1.ApprovePurchaseOrderSchema), async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const approverId = req.user?.id;
        const id = req.params.id;
        const { forceOverride, overrideReason } = req.body || {};
        if (!schoolId || !approverId) {
            return res.status(400).json({ error: 'School ID and user required' });
        }
        const approvedPO = await procurement_service_1.ProcurementService.approvePurchaseOrder(schoolId, id, approverId, Boolean(forceOverride), overrideReason);
        res.json({
            message: 'Purchase order approved successfully',
            purchaseOrder: approvedPO
        });
    }
    catch (error) {
        console.error('Approve PO error:', error);
        res.status(400).json({ error: error.message || 'Failed to approve purchase order' });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// GOODS RECEIVED NOTE (GRN) & INVENTORY UPDATES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @route   POST /api/procurement/grn
 * @desc    Create Goods Received Note (GRN) and update stock & stock movements
 */
router.post('/grn', auth_1.requireAuth, (0, validation_1.validate)(procurement_schema_1.CreateGRNSchema), async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const receivedById = req.user?.id;
        if (!schoolId || !receivedById) {
            return res.status(400).json({ error: 'School ID and user required' });
        }
        const grn = await procurement_service_1.ProcurementService.createGoodsReceivedNote({
            schoolId,
            purchaseOrderId: req.body.purchaseOrderId,
            receivedById,
            deliveryNoteNumber: req.body.deliveryNoteNumber,
            items: req.body.items,
            notes: req.body.notes
        });
        res.status(201).json(grn);
    }
    catch (error) {
        console.error('Create GRN error:', error);
        res.status(400).json({ error: error.message || 'Failed to create Goods Received Note' });
    }
});
/**
 * @route   GET /api/procurement/grn
 * @desc    List Goods Received Notes
 */
router.get('/grn', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'School ID required' });
        const grns = await prisma_1.default.goodsReceivedNote.findMany({
            where: { schoolId },
            include: {
                purchaseOrder: { select: { id: true, poNumber: true, totalAmount: true } },
                supplier: { select: { id: true, companyName: true, contactName: true } },
                receivedBy: { select: { id: true, name: true } }
            },
            orderBy: { receivedDate: 'desc' }
        });
        res.json(grns);
    }
    catch (error) {
        console.error('List GRN error:', error);
        res.status(500).json({ error: error.message || 'Failed to list Goods Received Notes' });
    }
});
/**
 * @route   GET /api/procurement/grn/:id
 * @desc    Get detailed Goods Received Note
 */
router.get('/grn/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const id = req.params.id;
        const grn = await prisma_1.default.goodsReceivedNote.findFirst({
            where: { id, schoolId },
            include: {
                purchaseOrder: true,
                supplier: true,
                receivedBy: { select: { id: true, name: true, role: true } },
                invoices: true
            }
        });
        if (!grn)
            return res.status(404).json({ error: 'GRN not found' });
        res.json(grn);
    }
    catch (error) {
        console.error('Get GRN error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch GRN' });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIER INVOICES & 3-WAY MATCHING (PO + GRN + INVOICE)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @route   POST /api/procurement/invoices
 * @desc    Register a supplier invoice linked to PO and GRN
 */
router.post('/invoices', auth_1.requireAuth, (0, validation_1.validate)(procurement_schema_1.CreateSupplierInvoiceSchema), async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'School ID required' });
        const { invoiceNo, supplierId, purchaseOrderId, grnId, amount, dueDate, items } = req.body;
        const invoice = await prisma_1.default.invoice.create({
            data: {
                invoiceNo,
                supplierId,
                purchaseOrderId: purchaseOrderId || null,
                grnId: grnId || null,
                amount,
                items: items || null,
                dueDate: new Date(dueDate),
                schoolId,
                status: 'pending',
                matchingStatus: 'PENDING'
            },
            include: {
                supplier: true,
                purchaseOrder: true,
                grn: true
            }
        });
        res.status(201).json(invoice);
    }
    catch (error) {
        console.error('Register invoice error:', error);
        res.status(400).json({ error: error.message || 'Failed to register invoice' });
    }
});
/**
 * @route   GET /api/procurement/invoices
 * @desc    List supplier invoices with matching statuses
 */
router.get('/invoices', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'School ID required' });
        const invoices = await prisma_1.default.invoice.findMany({
            where: { schoolId },
            include: {
                supplier: { select: { id: true, companyName: true, contactName: true } },
                purchaseOrder: { select: { id: true, poNumber: true, totalAmount: true } },
                grn: { select: { id: true, grnNumber: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(invoices);
    }
    catch (error) {
        console.error('List invoices error:', error);
        res.status(500).json({ error: error.message || 'Failed to list invoices' });
    }
});
/**
 * @route   POST /api/procurement/invoices/:id/3-way-match
 * @desc    Perform 3-Way Match (PO + GRN + Invoice) & post to Accounts Payable on success
 */
router.post('/invoices/:id/3-way-match', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        const approverId = req.user?.id;
        const id = req.params.id;
        if (!schoolId)
            return res.status(400).json({ error: 'School ID required' });
        const result = await procurement_service_1.ProcurementService.perform3WayMatch(schoolId, id, approverId);
        res.json(result);
    }
    catch (error) {
        console.error('3-Way Match error:', error);
        res.status(400).json({ error: error.message || 'Failed to perform 3-way match' });
    }
});
exports.default = router;
//# sourceMappingURL=procurement.js.map