import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireModuleAccess } from '../middleware/moduleAccess';
import { logAction } from '../utils/audit';

const router = Router();
router.use(requireAuth);

router.get('/access', (req: AuthRequest, res: Response) => {
  const { getModuleAccess } = require('../middleware/moduleAccess');
  const access = getModuleAccess(req.user, 'sports');
  res.json(access);
});

router.get('/teams', requireModuleAccess('sports', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const teams = await prisma.sport.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { name: 'asc' }
    });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sports teams' });
  }
});

router.post('/teams', requireModuleAccess('sports', 'full'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, ageGroups, coaches } = req.body;
    const team = await prisma.sport.create({
      data: {
        schoolId: req.user!.schoolId!,
        name,
        description,
        category,
        ageGroups,
        coaches
      }
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Houses - blocked for sports_tech
router.get('/houses', requireModuleAccess('sports', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const { getModuleAccess } = require('../middleware/moduleAccess');
    const access = getModuleAccess(req.user, 'sports');
    if (access.actingAs === 'sports_tech') {
      return res.status(403).json({ error: 'Not authorized for houses' });
    }

    const houses = await prisma.studentHouse.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { points: 'desc' }
    });
    res.json(houses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch houses' });
  }
});

// Request points
router.post('/houses/:id/points-request', requireModuleAccess('sports', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const { getModuleAccess } = require('../middleware/moduleAccess');
    const access = getModuleAccess(req.user, 'sports');
    if (access.actingAs !== 'house_master' && req.user!.role !== 'SCHOOL_ADMIN') {
      return res.status(403).json({ error: 'Only House Master can request points' });
    }

    const id = req.params.id as string;
    // Usually would log a request or insert into HousePointRequest model, here we just fake a success or log
    await logAction(req, 'REQUEST_HOUSE_POINTS', 'StudentHouse', id, { amount: req.body.points });
    res.json({ success: true, message: 'Points request submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request points' });
  }
});

// Equipment
router.get('/equipment', requireModuleAccess('sports', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.sportingEquipment.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: { sport: true }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

router.post('/equipment', requireModuleAccess('sports', 'full'), async (req: AuthRequest, res: Response) => {
  try {
    const { getModuleAccess } = require('../middleware/moduleAccess');
    const access = getModuleAccess(req.user, 'sports');
    if (access.actingAs !== 'sports_tech' && access.actingAs !== 'sports_master' && req.user!.role !== 'SCHOOL_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to add equipment' });
    }

    const item = await prisma.sportingEquipment.create({
      data: {
        schoolId: req.user!.schoolId!,
        name: req.body.name,
        sportId: req.body.sportId,
        quantity: req.body.quantity,
        condition: req.body.condition
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add equipment' });
  }
});

router.post('/equipment/request', requireModuleAccess('sports', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const { getModuleAccess } = require('../middleware/moduleAccess');
    const access = getModuleAccess(req.user, 'sports');
    if (access.actingAs !== 'pe_teacher' && access.actingAs !== 'house_master' && req.user!.role !== 'SCHOOL_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to request equipment' });
    }

    await logAction(req, 'REQUEST_EQUIPMENT', 'SportingEquipment', req.body.equipmentId, { quantity: req.body.quantity });
    res.json({ success: true, message: 'Equipment request submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request equipment' });
  }
});

export default router;
