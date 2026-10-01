import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';
import LedgerService from '../services/ledger.service';
import { requireModuleAccess } from '../middleware/moduleAccess';

const router = Router();

// All farm routes require authentication
router.use(requireAuth);

router.get('/access', (req: AuthRequest, res: Response) => {
  const { getModuleAccess } = require('../middleware/moduleAccess');
  const access = getModuleAccess(req.user, 'farm');
  res.json(access);
});

// ── LIVESTOCK MONITORS ──

router.get('/livestock', requireModuleAccess('farm', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const batches = await prisma.farmLivestockBatch.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { datePlaced: 'desc' }
    });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch livestock batches' });
  }
});

router.post('/livestock', requireModuleAccess('farm', 'scoped'), async (req: AuthRequest, res: Response) => {
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
    res.status(500).json({ error: 'Failed to create livestock batch' });
  }
});

// ── CROP CYCLE PLANNER ──

router.get('/crops', requireModuleAccess('farm', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const crops = await prisma.farmCropCycle.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { datePlanted: 'desc' }
    });
    res.json(crops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crop cycles' });
  }
});

router.post('/crops', requireModuleAccess('farm', 'scoped'), async (req: AuthRequest, res: Response) => {
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
    res.status(500).json({ error: 'Failed to create crop cycle' });
  }
});

// ── FARM INVENTORY ──

router.get('/inventory', requireModuleAccess('farm', 'scoped'), async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await prisma.farmInventoryItem.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { name: 'asc' }
    });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch farm inventory' });
  }
});

router.post('/inventory', requireModuleAccess('farm', 'scoped'), async (req: AuthRequest, res: Response) => {
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
    res.status(500).json({ error: 'Failed to add farm inventory item' });
  }
});

// ── PRODUCE SALES ──
router.post('/sales', requireModuleAccess('farm', 'full'), async (req: AuthRequest, res: Response) => {
  const { itemId, productName, quantitySold, saleAmount } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const farmIncomeCode = '4050'; // Farm/Agricultural Revenue

    // GL Engine
    await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '1010',  // Cash/Bank
      creditCode: farmIncomeCode,
      amount: Number(saleAmount),
      description: `Farm produce sale: ${productName} x${quantitySold}`,
      sourceModule: 'farm_sale',
      reference: `FARM-${Date.now()}`,
      userId: req.user!.id
    });

    // Decrement farm inventory: quantity is stored as a String in schema
    // Update the condition to reflect lower stock
    const currentItem = await prisma.farmInventoryItem.findFirst({ where: { id: itemId, schoolId } });
    if (currentItem) {
      // Parse numeric part from quantity string (e.g. "12 Bags" -> 12), subtract, reformat
      const numericQty = parseFloat(currentItem.quantity) || 0;
      const newQty = Math.max(0, numericQty - Number(quantitySold));
      const unit = currentItem.quantity.replace(/[\d.]+/, '').trim();
      await prisma.farmInventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: `${newQty} ${unit}`.trim(),
          condition: newQty === 0 ? 'Out of Stock' : newQty < 5 ? 'Low Stock' : currentItem.condition
        }
      });
    }

    // Stock movement record — use fields that exist in StockMovement schema
    await prisma.stockMovement.create({
      data: {
        schoolId,
        module: 'FARM',
        itemId,
        itemName: String(productName),
        direction: 'OUT',
        quantity: Number(quantitySold),
        unitCost: Number(saleAmount) / Number(quantitySold),
        totalCost: Number(saleAmount),
        reference: `FARM-${Date.now()}`
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process farm sale' });
  }
});

export default router;
