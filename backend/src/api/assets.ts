import { Router, Response } from 'express';
import path from 'path';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { assetUpload } from '../middleware/upload';

const router = Router();

/**
 * @route   GET /api/assets
 * @desc    Get all assets for the school (with joined data)
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const role = req.user!.role;
    let whereClause: any = { schoolId };

    const headedDepts = await prisma.department.findMany({
      where: { schoolId, headId: req.user!.id }
    });
    const isHod = headedDepts.length > 0;

    if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') {
      // Admin sees all assets
      whereClause = { schoolId };
    } else if (isHod) {
      // HOD sees all assets for staff in their department
      const deptIds = headedDepts.map(d => d.id);
      whereClause = {
        schoolId,
        custodian: {
          departmentId: { in: deptIds }
        }
      };
    } else {
      // Individual sees only assets assigned to them
      whereClause = {
        schoolId,
        custodianId: req.user!.id
      };
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        custodian: { select: { id: true, name: true, role: true } },
        incidents: {
          include: {
            reporter: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        maintenance: { orderBy: { scheduledDate: 'desc' } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

/**
 * @route   POST /api/assets
 * @desc    Register a new asset with optional attachments
 */
router.post('/', requireAuth, assetUpload.array('attachments', 5), async (req: AuthRequest, res: Response) => {
  const { name, category, serialNumber, location, condition, purchaseDate, purchasePrice, custodianId, nextMaintenance, maintenanceInterval } = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and Category are required' });
  }

  try {
    const attachments = files.map(file => ({
      name: file.originalname,
      url: path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
    }));

    const { name, category, serialNumber, location, condition, purchaseDate, purchasePrice, custodianId, nextMaintenance, maintenanceInterval } = req.body as any;

    const asset = await prisma.asset.create({
      data: {
        name: name as string,
        category: category as string,
        serialNumber: serialNumber as string,
        location: location as string,
        condition: condition || 'good',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: parseFloat(purchasePrice) || null,
        custodianId: custodianId ? String(custodianId) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
        maintenanceInterval: maintenanceInterval ? parseInt(maintenanceInterval) : null,
        attachments,
        schoolId: req.user!.schoolId!
      }
    });
    res.status(201).json(asset);
  } catch (error) {
    console.error('Asset creation error:', error);
    res.status(500).json({ error: 'Failed to register asset' });
  }
});

/**
 * @route   PATCH /api/assets/:id
 * @desc    Update asset details and attachments
 */
router.patch('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), assetUpload.array('attachments', 5), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  try {
    const existing = await prisma.asset.findFirst({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    const newAttachments = files.map(file => ({
      name: file.originalname,
      url: path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
    }));

    const currentAttachments = (existing.attachments as any[]) || [];

    const { name, category, serialNumber, location, condition, custodianId, purchaseDate, purchasePrice, nextMaintenance, maintenanceInterval } = req.body as any;

    const asset = await prisma.asset.update({
      where: { id: id as string },
      data: {
        name: name as string,
        category: category as string,
        serialNumber: serialNumber as string,
        location: location as string,
        condition: condition as string,
        custodianId: custodianId as string,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        maintenanceInterval: maintenanceInterval ? parseInt(maintenanceInterval) : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : undefined,
        attachments: [...currentAttachments, ...newAttachments]
      }
    });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

/**
 * @route   POST /api/assets/incident
 * @desc    Report an asset incident with optional attachments
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
      // 1. Create Incident
      const newIncident = await tx.assetIncident.create({
        data: {
          assetId: assetId as string,
          reporterId: req.user!.id,
          issueType: issueType as string,
          details: details as string,
          status: 'PENDING',
          attachments,
          schoolId: req.user!.schoolId!
        }
      });

      // 2. Update Asset condition if it's damaged or theft
      if (issueType.toLowerCase().includes('damage') || issueType.toLowerCase().includes('theft') || issueType.toLowerCase().includes('fault')) {
        await tx.asset.update({
          where: { id: assetId as string },
          data: { condition: 'damaged' }
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
router.patch('/incident/:id/resolve', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fixDetails, newStatus } = req.body;

  try {
    const incident = await prisma.$transaction(async (tx) => {
      // 1. Update Incident
      const updatedIncident = await tx.assetIncident.update({
        where: { id: String(id) },
        data: {
          status: 'RESOLVED',
          fixDetails,
          resolvedBy: req.user!.name,
          updatedAt: new Date()
        }
      });

      // 2. Update Asset Condition
      await tx.asset.update({
        where: { id: updatedIncident.assetId },
        data: { condition: newStatus || 'good' }
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
 * @desc    [ADMIN] Record maintenance performance and scheduled next
 */
router.post('/maintenance/perform', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { assetId, description, cost, performedDate } = req.body;
  const pDate = performedDate ? new Date(performedDate) : new Date();

  try {
    const asset = await prisma.asset.findFirst({ where: { id: assetId as string } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    let nextMaintenance = null;
    if (asset.maintenanceInterval) {
      nextMaintenance = new Date(pDate.getTime() + asset.maintenanceInterval * 24 * 60 * 60 * 1000);
    }

    await prisma.$transaction([
      prisma.assetMaintenance.create({
        data: {
          assetId: assetId as string,
          description: description as string,
          cost: parseFloat(cost) || 0,
          performedDate: pDate,
          scheduledDate: asset.nextMaintenance || pDate,
          schoolId: req.user!.schoolId!
        }
      }),
      prisma.asset.update({
        where: { id: assetId as string },
        data: { nextMaintenance }
      })
    ]);

    res.json({ success: true, nextMaintenance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record maintenance' });
  }
});

/**
 * @route   POST /api/assets/request-maintenance
 * @desc    Request maintenance for an asset (User-facing)
 */
router.post('/request-maintenance', requireAuth, async (req: AuthRequest, res: Response) => {
  const { assetId, details } = req.body;
  try {
    const incident = await prisma.assetIncident.create({
      data: {
        assetId: assetId as string,
        reporterId: req.user!.id,
        issueType: 'MAINTENANCE_REQUEST',
        details: details as string,
        status: 'PENDING',
        schoolId: req.user!.schoolId!
      }
    });
    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

/**
 * @route   POST /api/assets/maintenance/schedule
 * @desc    [ADMIN] Schedule a future maintenance task
 */
router.post('/maintenance/schedule', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { assetId, description, cost, scheduledDate } = req.body;
  try {
    const maintenance = await prisma.assetMaintenance.create({
      data: {
        assetId: assetId as string,
        description: description as string,
        cost: parseFloat(cost) || 0,
        scheduledDate: new Date(scheduledDate),
        schoolId: req.user!.schoolId!
      }
    });
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule maintenance' });
  }
});

/**
 * @route   PATCH /api/assets/maintenance/:id/complete
 * @desc    [ADMIN] Mark a scheduled maintenance task as complete
 */
router.patch('/maintenance/:id/complete', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { cost, performedDate, notes, assetStatus } = req.body;
  const pDate = performedDate ? new Date(performedDate) : new Date();
  try {
    const maint = await prisma.assetMaintenance.findFirst({ where: { id: id as string } });
    if (!maint) return res.status(404).json({ error: 'Maintenance record not found' });

    const asset = await prisma.asset.findFirst({ where: { id: maint.assetId } });
    let nextMaintenance = null;
    if (asset?.maintenanceInterval) {
      nextMaintenance = new Date(pDate.getTime() + asset.maintenanceInterval * 24 * 60 * 60 * 1000);
    }

    const assetUpdateData: any = { nextMaintenance };
    if (assetStatus && ['good', 'fair', 'poor', 'condemned'].includes(assetStatus)) {
      assetUpdateData.condition = assetStatus;
    }

    await prisma.$transaction([
      prisma.assetMaintenance.update({
        where: { id: id as string },
        data: {
          performedDate: pDate,
          cost: cost ? parseFloat(cost) : maint.cost,
          notes: notes || null
        }
      }),
      prisma.asset.update({
        where: { id: maint.assetId },
        data: assetUpdateData
      })
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete maintenance' });
  }
});

/**
 * @route   PUT /api/assets/maintenance/:id
 * @desc    [ADMIN] Update a scheduled maintenance task
 */
router.put('/maintenance/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { description, cost, scheduledDate } = req.body;
  try {
    const maintenance = await prisma.assetMaintenance.update({
      where: { id: String(id) },
      data: {
        description: description ? String(description) : undefined,
        cost: cost ? parseFloat(cost) : undefined,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      }
    });
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance task' });
  }
});

/**
 * @route   DELETE /api/assets/maintenance/:id
 * @desc    [ADMIN] Delete a maintenance task
 */
router.delete('/maintenance/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.assetMaintenance.delete({
      where: { id: String(id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete maintenance task' });
  }
});

export default router;
