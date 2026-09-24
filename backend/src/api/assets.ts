import { Router, Response } from 'express';
import path from 'path';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { assetUpload } from '../middleware/upload';

const router = Router();

// Helper to determine financial permission
function isFinancialRole(role?: string): boolean {
  const r = (role || '').toUpperCase();
  return r === 'SCHOOL_ADMIN' || r === 'SUPER_ADMIN' || r === 'BURSAR';
}

/**
 * @route   GET /api/assets
 * @desc    Get assets with strict role-based server-side filtering
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const role = (req.user!.role || '').toUpperCase();
    const isFinRole = isFinancialRole(role);

    const departmentQuery = req.query.department as string;
    const statusQuery = req.query.status as string;
    const searchQuery = (req.query.search as string || '').trim().toLowerCase();

    // Check if user is HOD
    const headedDepts = await prisma.department.findMany({
      where: { schoolId, headId: req.user!.id }
    });
    const isHod = headedDepts.length > 0;
    const headedDeptNames = headedDepts.map(d => d.name.toLowerCase());

    let whereClause: any = { schoolId };

    // 1. Role-based Server-side Scoping
    if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') {
      // Admin sees everything across all departments
      if (departmentQuery && departmentQuery !== 'all') {
        whereClause.department = { equals: departmentQuery, mode: 'insensitive' };
      }
    } else if (role === 'BURSAR') {
      // Bursar sees everything across all departments (focused on valuation)
      if (departmentQuery && departmentQuery !== 'all') {
        whereClause.department = { equals: departmentQuery, mode: 'insensitive' };
      }
    } else if (role === 'LIBRARIAN') {
      // Librarian sees strictly Library assets
      whereClause.department = { equals: 'library', mode: 'insensitive' };
    } else if (role === 'TEACHER') {
      // Teacher sees only their department AND assigned to them (or headed if HOD)
      if (isHod) {
        whereClause.OR = [
          { custodianId: req.user!.id },
          { department: { in: headedDeptNames, mode: 'insensitive' } }
        ];
      } else {
        whereClause.custodianId = req.user!.id;
      }
    } else if (role === 'CLINIC') {
      // Clinic staff sees strictly Clinic department assets
      whereClause.department = { equals: 'clinic', mode: 'insensitive' };
    } else if (role === 'ANCILLARY') {
      // Ancillary staff: only assets assigned to them or their specific location
      whereClause.OR = [
        { custodianId: req.user!.id },
        { location: { in: ['kitchen', 'grounds', 'maintenance', 'canteen', 'hostel', 'security', 'transport'], mode: 'insensitive' } }
      ];
    } else {
      // Fallback: only assigned to them
      whereClause.custodianId = req.user!.id;
    }

    if (statusQuery && statusQuery !== 'all') {
      whereClause.status = statusQuery.toUpperCase();
    }

    const rawAssets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        custodian: { select: { id: true, name: true, role: true, email: true } },
        registeredBy: { select: { id: true, name: true, role: true } },
        incidents: {
          include: { reporter: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        },
        maintenance: { orderBy: { scheduledDate: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Filter by search query if provided
    let filtered = rawAssets;
    if (searchQuery) {
      filtered = rawAssets.filter(a =>
        a.name.toLowerCase().includes(searchQuery) ||
        (a.assetNumber && a.assetNumber.toLowerCase().includes(searchQuery)) ||
        (a.category && a.category.toLowerCase().includes(searchQuery)) ||
        (a.location && a.location.toLowerCase().includes(searchQuery)) ||
        (a.custodian?.name && a.custodian.name.toLowerCase().includes(searchQuery))
      );
    }

    // 3. Server-side Field Masking for non-financial roles
    // Librarian, Teacher, Clinic, Ancillary cannot view financial figures if restricted
    const sanitized = filtered.map(asset => {
      if (!isFinRole) {
        return {
          ...asset,
          purchasePrice: undefined,
          supplierName: undefined,
          invoiceNumber: undefined,
          depreciationRate: undefined,
          warrantyExpiry: undefined
        };
      }
      return asset;
    });

    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

/**
 * @route   GET /api/assets/users-search
 * @desc    Type-ahead search with live suggestions for 'Assigned To'
 */
router.get('/users-search', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const query = (req.query.q as string || '').trim().toLowerCase();

  try {
    const users = await prisma.user.findMany({
      where: {
        schoolId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { staffId: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffId: true,
        dept: { select: { name: true } }
      },
      take: 10
    });

    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      staffId: u.staffId || '—',
      department: u.dept?.name || 'General'
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * @route   POST /api/assets
 * @desc    Register a new asset with bulk entry & multi-stage approval workflow
 */
router.post('/', requireAuth, assetUpload.array('attachments', 5), async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const role = (req.user!.role || '').toUpperCase();
  const isFinRole = isFinancialRole(role);

  // Requirement: Teachers cannot register new assets directly
  if (role === 'TEACHER') {
    return res.status(403).json({
      error: 'Teachers cannot register new assets directly. Please request asset procurement through your HOD, Bursar, or Admin.'
    });
  }

  const {
    name,
    category,
    quantity = 1,
    location,
    department: requestedDepartment,
    condition = 'good',
    serialNumber,
    // Admin / Bursar extra fields
    supplierName,
    purchaseDate,
    purchasePrice,
    invoiceNumber,
    depreciationRate,
    warrantyExpiry,
    custodianId,
    nextMaintenance,
    maintenanceInterval,
    photoUrl
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Asset Name and Category are required' });
  }

  const parsedQty = Math.max(1, Math.min(100, parseInt(quantity) || 1));

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { code: true, name: true }
    });
    const schoolPrefix = school?.code || 'SKL';

    // Auto-set department based on registering user's role
    let assignedDepartment = requestedDepartment || 'General';
    if (role === 'LIBRARIAN') assignedDepartment = 'Library';
    else if (role === 'CLINIC') assignedDepartment = 'Clinic';
    else if (role === 'ANCILLARY') assignedDepartment = 'Ancillary';
    else if (isFinRole && requestedDepartment) assignedDepartment = requestedDepartment;

    // Approval workflow:
    // Admin / Bursar registrations are directly ACTIVE & APPROVED
    // Non-admin (Librarian, Ancillary, Clinic) registrations go to PENDING_APPROVAL -> PENDING_HOD
    const isDirectApproval = isFinRole;
    const initialStatus = isDirectApproval ? 'ACTIVE' : 'PENDING_APPROVAL';
    const initialApprovalStatus = isDirectApproval ? 'APPROVED' : 'PENDING_HOD';

    const files = (req.files as Express.Multer.File[]) || [];
    const attachments = files.map(file => ({
      name: file.originalname,
      url: path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
    }));

    // Generate unique sequential Asset IDs with school prefix
    const totalExistingAssets = await prisma.asset.count({ where: { schoolId } });

    const createdAssets = await prisma.$transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < parsedQty; i++) {
        const uniqueAssetNumber = `${schoolPrefix}-AST-${String(totalExistingAssets + i + 1).padStart(4, '0')}`;
        
        const asset = await tx.asset.create({
          data: {
            assetNumber: uniqueAssetNumber,
            name: parsedQty > 1 ? `${name} (Unit #${i + 1})` : name,
            category,
            quantity: 1, // each row is an individual tracked unit
            location: location || 'Main Campus',
            department: assignedDepartment,
            condition: condition || 'good',
            status: initialStatus,
            approvalStatus: initialApprovalStatus,
            serialNumber: serialNumber ? (parsedQty > 1 ? `${serialNumber}-${i + 1}` : serialNumber) : null,
            photoUrl: photoUrl || (attachments.length > 0 ? attachments[0].url : null),
            registeredById: req.user!.id,
            // Admin/Bursar fields only allowed if user is financial role
            supplierName: isFinRole ? (supplierName || null) : null,
            purchaseDate: isFinRole && purchaseDate ? new Date(purchaseDate) : null,
            purchasePrice: isFinRole && purchasePrice ? parseFloat(purchasePrice) : null,
            invoiceNumber: isFinRole ? (invoiceNumber || null) : null,
            depreciationRate: isFinRole && depreciationRate ? parseFloat(depreciationRate) : null,
            warrantyExpiry: isFinRole && warrantyExpiry ? new Date(warrantyExpiry) : null,
            custodianId: custodianId ? String(custodianId) : null,
            nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
            maintenanceInterval: maintenanceInterval ? parseInt(maintenanceInterval) : null,
            adminApprovedAt: isDirectApproval ? new Date() : null,
            adminApprovedById: isDirectApproval ? req.user!.id : null,
            attachments,
            schoolId
          },
          include: {
            custodian: { select: { id: true, name: true } },
            registeredBy: { select: { id: true, name: true } }
          }
        });
        results.push(asset);
      }
      return results;
    });

    res.status(201).json({
      message: parsedQty > 1 ? `${parsedQty} assets successfully registered in bulk` : 'Asset registered successfully',
      assets: createdAssets,
      isPendingApproval: !isDirectApproval
    });
  } catch (error) {
    console.error('Asset registration error:', error);
    res.status(500).json({ error: 'Failed to register asset' });
  }
});

/**
 * @route   POST /api/assets/:id/approve-hod
 * @desc    HOD approval stage for pending assets
 */
router.post('/:id/approve-hod', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const role = (req.user!.role || '').toUpperCase();
  const schoolId = req.user!.schoolId!;

  try {
    const asset = await prisma.asset.findFirst({ where: { id: String(id), schoolId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    // Must be HOD or Admin
    const headedDepts = await prisma.department.findMany({ where: { schoolId, headId: req.user!.id } });
    const isHod = headedDepts.some(d => d.name.toLowerCase() === (asset.department || '').toLowerCase());
    const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';

    if (!isHod && !isAdmin) {
      return res.status(403).json({ error: 'Only the relevant Department HOD or School Admin can perform this approval' });
    }

    const updated = await prisma.asset.update({
      where: { id: String(id) },
      data: {
        approvalStatus: 'PENDING_BURSAR_ADMIN',
        hodApprovedAt: new Date(),
        hodApprovedById: req.user!.id
      }
    });

    res.json({ message: 'Asset approved by HOD. Now awaiting Bursar & Admin approval.', asset: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve asset' });
  }
});

/**
 * @route   POST /api/assets/:id/approve-bursar
 * @desc    Bursar approval stage for pending assets
 */
router.post('/:id/approve-bursar', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const schoolId = req.user!.schoolId!;

  try {
    const asset = await prisma.asset.findFirst({ where: { id: String(id), schoolId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const bursarApprovedAt = new Date();
    // Check if admin also approved
    const isFullyApproved = !!asset.adminApprovedAt;

    const updated = await prisma.asset.update({
      where: { id: String(id) },
      data: {
        bursarApprovedAt,
        bursarApprovedById: req.user!.id,
        approvalStatus: isFullyApproved ? 'APPROVED' : 'PENDING_BURSAR_ADMIN',
        status: isFullyApproved ? 'ACTIVE' : 'PENDING_APPROVAL'
      }
    });

    res.json({
      message: isFullyApproved ? 'Asset fully approved and added to active register.' : 'Bursar approved. Awaiting Admin confirmation.',
      asset: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve asset' });
  }
});

/**
 * @route   POST /api/assets/:id/approve-admin
 * @desc    Admin approval stage for pending assets
 */
router.post('/:id/approve-admin', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const schoolId = req.user!.schoolId!;

  try {
    const asset = await prisma.asset.findFirst({ where: { id: String(id), schoolId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const adminApprovedAt = new Date();
    // Admin has authority to finalize directly or check bursar
    const updated = await prisma.asset.update({
      where: { id: String(id) },
      data: {
        adminApprovedAt,
        adminApprovedById: req.user!.id,
        approvalStatus: 'APPROVED',
        status: 'ACTIVE'
      }
    });

    res.json({ message: 'Asset approved by Admin and activated on school register.', asset: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve asset' });
  }
});

/**
 * @route   POST /api/assets/:id/reject
 * @desc    Reject asset registration with reason
 */
router.post('/:id/reject', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const updated = await prisma.asset.update({
      where: { id: String(id) },
      data: {
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
        rejectionReason: reason || 'Registration rejected by administrator'
      }
    });
    res.json({ message: 'Asset registration rejected', asset: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject asset' });
  }
});

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete asset — STRICTLY RESTRICTED TO SCHOOL ADMIN
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req.user!.role || '').toUpperCase();
  const { id } = req.params;
  const schoolId = req.user!.schoolId!;

  // Strict enforcement: Bursar and other roles CANNOT delete without Admin involvement
  if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Deleting an asset from the school register requires School Administrator authorization. Bursars and department staff cannot delete assets unilaterally.'
    });
  }

  try {
    await prisma.$transaction([
      prisma.assetIncident.deleteMany({ where: { assetId: String(id) } }),
      prisma.assetMaintenance.deleteMany({ where: { assetId: String(id) } }),
      prisma.asset.delete({ where: { id: String(id), schoolId } })
    ]);

    res.json({ success: true, message: 'Asset permanently removed from register' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

/**
 * @route   POST /api/assets/:id/transfer
 * @desc    Transfer asset location/department/custodian
 */
router.post('/:id/transfer', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'LIBRARIAN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { location, department, custodianId } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const asset = await prisma.asset.findFirst({ where: { id: String(id), schoolId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const updated = await prisma.asset.update({
      where: { id: String(id) },
      data: {
        location: location || asset.location,
        department: department || asset.department,
        custodianId: custodianId ? String(custodianId) : asset.custodianId,
        status: 'TRANSFERRED'
      }
    });

    res.json({ message: 'Asset transferred successfully', asset: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transfer asset' });
  }
});

/**
 * @route   POST /api/assets/:id/dispose
 * @desc    Dispose asset (requires Admin or Bursar approval)
 */
router.post('/:id/dispose', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const updated = await prisma.asset.update({
      where: { id: String(id), schoolId },
      data: {
        status: 'DISPOSED',
        condition: 'condemned'
      }
    });
    res.json({ message: 'Asset successfully marked as disposed', asset: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dispose asset' });
  }
});

/**
 * @route   POST /api/assets/:id/report-damage
 * @desc    Report asset damage or fault (accessible by all roles: Teacher, Librarian, Clinic, Ancillary)
 */
router.post('/:id/report-damage', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { details, issueType = 'DAMAGE' } = req.body;
  const schoolId = req.user!.schoolId!;

  if (!details) {
    return res.status(400).json({ error: 'Damage details are required' });
  }

  try {
    const [incident, updatedAsset] = await prisma.$transaction([
      prisma.assetIncident.create({
        data: {
          assetId: String(id),
          reporterId: req.user!.id,
          issueType: String(issueType),
          details: String(details),
          status: 'PENDING',
          schoolId
        }
      }),
      prisma.asset.update({
        where: { id: String(id) },
        data: { condition: 'damaged', status: 'DAMAGED' }
      })
    ]);

    res.status(201).json({ message: 'Damage reported successfully', incident, asset: updatedAsset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to report asset damage' });
  }
});

/**
 * @route   PATCH /api/assets/:id
 * @desc    Update asset details and value
 */
router.patch('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'SUPER_ADMIN'), assetUpload.array('attachments', 5), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const role = (req.user!.role || '').toUpperCase();
  const isFinRole = isFinancialRole(role);
  const files = (req.files as Express.Multer.File[]) || [];

  try {
    const existing = await prisma.asset.findFirst({ where: { id: String(id), schoolId: req.user!.schoolId! } });
    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    const newAttachments = files.map(file => ({
      name: file.originalname,
      url: path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
    }));
    const currentAttachments = (existing.attachments as any[]) || [];

    const {
      name,
      category,
      serialNumber,
      location,
      department,
      condition,
      status,
      custodianId,
      purchaseDate,
      purchasePrice,
      supplierName,
      invoiceNumber,
      depreciationRate,
      warrantyExpiry,
      nextMaintenance,
      maintenanceInterval
    } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (category) data.category = category;
    if (serialNumber !== undefined) data.serialNumber = serialNumber;
    if (location !== undefined) data.location = location;
    if (department !== undefined) data.department = department;
    if (condition) data.condition = condition;
    if (status) data.status = status;
    if (custodianId !== undefined) data.custodianId = custodianId ? String(custodianId) : null;
    if (nextMaintenance !== undefined) data.nextMaintenance = nextMaintenance ? new Date(nextMaintenance) : null;
    if (maintenanceInterval !== undefined) data.maintenanceInterval = maintenanceInterval ? parseInt(maintenanceInterval) : null;

    if (isFinRole) {
      if (purchasePrice !== undefined) data.purchasePrice = purchasePrice ? parseFloat(purchasePrice) : null;
      if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
      if (supplierName !== undefined) data.supplierName = supplierName;
      if (invoiceNumber !== undefined) data.invoiceNumber = invoiceNumber;
      if (depreciationRate !== undefined) data.depreciationRate = depreciationRate ? parseFloat(depreciationRate) : null;
      if (warrantyExpiry !== undefined) data.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
    }

    if (newAttachments.length > 0) {
      data.attachments = [...currentAttachments, ...newAttachments];
    }

    const updated = await prisma.asset.update({
      where: { id: String(id) },
      data,
      include: {
        custodian: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

/**
 * @route   POST /api/assets/incident
 * @desc    Report an asset incident
 */
router.post('/incident', requireAuth, assetUpload.array('attachments', 5), async (req: AuthRequest, res: Response) => {
  const { assetId, issueType, details } = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  if (!assetId || !issueType || !details) {
    return res.status(400).json({ error: 'Asset ID, issue type and details are required' });
  }

  try {
    const attachments = files.map(file => ({
      name: file.originalname,
      url: path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
    }));

    const incident = await prisma.$transaction(async (tx) => {
      const newIncident = await tx.assetIncident.create({
        data: {
          assetId: String(assetId),
          reporterId: req.user!.id,
          issueType: String(issueType),
          details: String(details),
          status: 'PENDING',
          attachments,
          schoolId: req.user!.schoolId!
        }
      });

      if (issueType.toLowerCase().includes('damage') || issueType.toLowerCase().includes('theft') || issueType.toLowerCase().includes('fault')) {
        await tx.asset.update({
          where: { id: String(assetId) },
          data: { condition: 'damaged', status: 'DAMAGED' }
        });
      }

      return newIncident;
    });

    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

/**
 * @route   PATCH /api/assets/incident/:id/resolve
 * @desc    [ADMIN] Resolve an asset incident
 */
router.patch('/incident/:id/resolve', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fixDetails, newStatus } = req.body;

  try {
    const incident = await prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.assetIncident.update({
        where: { id: String(id) },
        data: {
          status: 'RESOLVED',
          fixDetails,
          resolvedBy: req.user!.name,
          updatedAt: new Date()
        }
      });

      await tx.asset.update({
        where: { id: updatedIncident.assetId },
        data: { condition: newStatus || 'good', status: 'ACTIVE' }
      });

      return updatedIncident;
    });

    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
});

/**
 * @route   POST /api/assets/maintenance/perform
 * @desc    Record maintenance performance
 */
router.post('/maintenance/perform', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { assetId, description, cost, performedDate } = req.body;
  const pDate = performedDate ? new Date(performedDate) : new Date();

  try {
    const asset = await prisma.asset.findFirst({ where: { id: String(assetId), schoolId: req.user!.schoolId! } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    let nextMaintenance = null;
    if (asset.maintenanceInterval) {
      nextMaintenance = new Date(pDate.getTime() + asset.maintenanceInterval * 24 * 60 * 60 * 1000);
    }

    await prisma.$transaction([
      prisma.assetMaintenance.create({
        data: {
          assetId: String(assetId),
          description: String(description),
          cost: parseFloat(cost) || 0,
          performedDate: pDate,
          scheduledDate: asset.nextMaintenance || pDate,
          schoolId: req.user!.schoolId!
        }
      }),
      prisma.asset.update({
        where: { id: String(assetId) },
        data: { nextMaintenance, status: 'ACTIVE' }
      })
    ]);

    res.json({ success: true, nextMaintenance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record maintenance' });
  }
});

/**
 * @route   POST /api/assets/request-maintenance
 * @desc    Request maintenance for an asset
 */
router.post('/request-maintenance', requireAuth, async (req: AuthRequest, res: Response) => {
  const { assetId, details } = req.body;
  try {
    const incident = await prisma.assetIncident.create({
      data: {
        assetId: String(assetId),
        reporterId: req.user!.id,
        issueType: 'MAINTENANCE_REQUEST',
        details: String(details),
        status: 'PENDING',
        schoolId: req.user!.schoolId!
      }
    });
    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

export default router;
