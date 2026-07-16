import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// All farm routes require authentication
router.use(requireAuth);

/**
 * Helper to check if a user has permissions to modify farm data
 */
const canModifyFarm = (user: any) => {
  return user.role === 'SCHOOL_ADMIN' || 
         user.secondaryRoles.includes('Agriculture Teacher') || 
         user.secondaryRoles.includes('Farm Assistant') || 
         user.secondaryRoles.includes('Farm Manager') || 
         user.secondaryRoles.includes('Farm Manager Assistant');
};

// ── LIVESTOCK MONITORS ──

/**
 * @route   GET /api/farm/livestock
 * @desc    Get livestock batches for the school
 */
router.get('/livestock', async (req: AuthRequest, res: Response) => {
  try {
    const batches = await prisma.farmLivestockBatch.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { datePlaced: 'desc' }
    });
    res.json(batches);
  } catch (error) {
    console.error('Fetch livestock error:', error);
    res.status(500).json({ error: 'Failed to fetch livestock batches' });
  }
});

/**
 * @route   POST /api/farm/livestock
 * @desc    Create a new livestock batch
 */
router.post('/livestock', async (req: AuthRequest, res: Response) => {
  if (!canModifyFarm(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to manage farm projects' });
  }

  const { batchName, type, datePlaced, currentCount, startCount, mortalityRate, status } = req.body;
  if (!batchName || !type || !datePlaced || currentCount === undefined || startCount === undefined) {
    return res.status(400).json({ error: 'Missing required livestock fields' });
  }

  try {
    const batch = await prisma.farmLivestockBatch.create({
      data: {
        batchName,
        type,
        datePlaced: new Date(datePlaced),
        currentCount: parseInt(currentCount),
        startCount: parseInt(startCount),
        mortalityRate: parseFloat(mortalityRate) || 0.0,
        status: status || 'Maturing',
        schoolId: req.user!.schoolId!
      }
    });

    await logAction(req, 'CREATE_FARM_LIVESTOCK', 'FarmLivestockBatch', batch.id, { batchName });
    res.json(batch);
  } catch (error) {
    console.error('Create livestock error:', error);
    res.status(500).json({ error: 'Failed to create livestock batch' });
  }
});

// ── CROP CYCLE PLANNER ──

/**
 * @route   GET /api/farm/crops
 * @desc    Get crop cycles for the school
 */
router.get('/crops', async (req: AuthRequest, res: Response) => {
  try {
    const crops = await prisma.farmCropCycle.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { datePlanted: 'desc' }
    });
    res.json(crops);
  } catch (error) {
    console.error('Fetch crops error:', error);
    res.status(500).json({ error: 'Failed to fetch crop cycles' });
  }
});

/**
 * @route   POST /api/farm/crops
 * @desc    Create a new crop cycle
 */
router.post('/crops', async (req: AuthRequest, res: Response) => {
  if (!canModifyFarm(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to manage farm projects' });
  }

  const { name, type, sector, datePlanted, expectedHarvest, status } = req.body;
  if (!name || !type || !sector || !datePlanted || !expectedHarvest) {
    return res.status(400).json({ error: 'Missing required crop fields' });
  }

  try {
    const crop = await prisma.farmCropCycle.create({
      data: {
        name,
        type,
        sector,
        datePlanted: new Date(datePlanted),
        expectedHarvest: new Date(expectedHarvest),
        status: status || 'Growing',
        schoolId: req.user!.schoolId!
      }
    });

    await logAction(req, 'CREATE_FARM_CROP', 'FarmCropCycle', crop.id, { name });
    res.json(crop);
  } catch (error) {
    console.error('Create crop error:', error);
    res.status(500).json({ error: 'Failed to create crop cycle' });
  }
});

// ── FARM INVENTORY ──

/**
 * @route   GET /api/farm/inventory
 * @desc    Get farm inventory items
 */
router.get('/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await prisma.farmInventoryItem.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { name: 'asc' }
    });
    res.json(inventory);
  } catch (error) {
    console.error('Fetch farm inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch farm inventory' });
  }
});

/**
 * @route   POST /api/farm/inventory
 * @desc    Add/Request farm inventory item
 */
router.post('/inventory', async (req: AuthRequest, res: Response) => {
  if (!canModifyFarm(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to manage farm inventory' });
  }

  const { name, category, quantity, condition } = req.body;
  if (!name || !category || !quantity) {
    return res.status(400).json({ error: 'Missing required inventory fields' });
  }

  try {
    const item = await prisma.farmInventoryItem.create({
      data: {
        name,
        category,
        quantity,
        condition: condition || 'Good Condition',
        schoolId: req.user!.schoolId!
      }
    });

    await logAction(req, 'CREATE_FARM_INVENTORY', 'FarmInventoryItem', item.id, { name });
    res.json(item);
  } catch (error) {
    console.error('Create farm inventory error:', error);
    res.status(500).json({ error: 'Failed to add farm inventory item' });
  }
});

export default router;
