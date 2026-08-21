import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';

const router = Router();

/**
 * @route   GET /api/inventory/products
 * @desc    [BURSAR/ADMIN] Get all physical products
 */
router.get('/products', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const products = await (prisma as any).physicalProduct.findMany({
      where: { schoolId: String(req.user!.schoolId!) },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * @route   POST /api/inventory/products
 * @desc    [BURSAR/ADMIN] Create or update physical product
 */
router.post('/products', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id, name, unit, quantity, price } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const data = {
      name,
      unit,
      quantity: parseFloat(quantity) || 0,
      price: parseFloat(price) || 0,
      schoolId
    };

    let product;
    if (id) {
      const existing = await prisma.physicalProduct.findFirst({
        where: { id: id as string, schoolId }
      });
      if (!existing) return res.status(403).json({ error: 'Unauthorized' });

      product = await prisma.physicalProduct.update({ 
        where: { id: id as string }, 
        data 
      });
    } else {
      product = await prisma.physicalProduct.create({ data });
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save product: ' + error.message });
  }
});

/**
 * @route   DELETE /api/inventory/products/:id
 * @desc    [BURSAR/ADMIN] Delete physical product
 */
router.delete('/products/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.physicalProduct.deleteMany({
      where: { id: req.params.id as string, schoolId: req.user!.schoolId! }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * @route   POST /api/inventory/bill
 * @desc    [BURSAR/ADMIN] Bill physical products to students in selected classes
 */
router.post('/bill', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { productAssignments, classIds, year, billingType } = req.body;
  const schoolId = req.user!.schoolId!;

  // productAssignments: Array<{ productId: string, expectedQty: number }>

  try {
    const products = await prisma.physicalProduct.findMany({
      where: { id: { in: productAssignments.map((p: any) => p.productId) }, schoolId }
    });

    const students = await prisma.student.findMany({
      where: { classId: { in: classIds }, schoolId },
      select: { id: true, name: true }
    });

    if (students.length === 0) return res.status(400).json({ error: 'No students found in selected classes' });

    const results = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let totalBilledAmount = 0;

      for (const assignment of productAssignments) {
        const product = products.find(p => p.id === assignment.productId);
        if (!product) continue;

        const amount = (product.price || 0) * (assignment.expectedQty || 0);
        if (amount <= 0) continue;

        for (const student of students) {
          await tx.fee.create({
            data: {
              studentId: student.id,
              amount,
              term: billingType,
              year: parseInt(year),
              description: `Grocery Billing: ${product.name} (${assignment.expectedQty} ${product.unit})`,
              dueDate: new Date(parseInt(year), 11, 31),
              schoolId
            }
          });
          createdCount++;
          totalBilledAmount += amount;
        }
      }

      if (totalBilledAmount > 0) {
        const [arAccountId, salesAccountId] = await Promise.all([
          getAccountId(schoolId, '1210', tx as any),
          getAccountId(schoolId, '5210', tx as any) // Tuckshop/Canteen Sales
        ]);

        await LedgerService.postEntry({
          schoolId,
          date: new Date(),
          description: `Bulk Grocery Billing for ${students.length} students (${year} ${billingType})`,
          sourceType: 'inventory',
          sourceId: `bill_${Date.now()}`,
          createdByUserId: req.user!.id,
          lines: [
            { accountId: arAccountId, debit: totalBilledAmount, description: 'Grocery billing to students' },
            { accountId: salesAccountId, credit: totalBilledAmount, description: 'Grocery revenue' }
          ],
          tx: tx as any
        });
      }

      return { createdCount };
    });

    res.json({ success: true, message: `Successfully billed ${results.createdCount} items to ${students.length} students.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Billing failed: ' + error.message });
  }
});

/**
 * @route   GET /api/inventory/consumption
 * @desc    [BURSAR/ADMIN] Get consumption logs
 */
router.get('/consumption', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.physicalProductConsumption.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: { product: true },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch consumption logs' });
  }
});

/**
 * @route   POST /api/inventory/consumption
 * @desc    [BURSAR/ADMIN] Log consumption and update stock
 */
router.post('/consumption', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { consumptions, requestedBy, date } = req.body;
  const schoolId = req.user!.schoolId!;

  // consumptions: Array<{ productId: string, quantity: number }>

  try {
    await prisma.$transaction(async (tx) => {
      let totalCostValue = 0;

      // Need products to get price for total cost
      const productIds = consumptions.map((c: any) => c.productId);
      const products = await tx.physicalProduct.findMany({
        where: { id: { in: productIds }, schoolId }
      });

      for (const item of consumptions) {
        if (item.quantity <= 0) continue;

        const product = products.find(p => p.id === item.productId);
        if (product) {
          totalCostValue += (product.price || 0) * item.quantity;
        }

        // Create log
        await tx.physicalProductConsumption.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            requestedBy,
            date: new Date(date),
            schoolId
          }
        });

        // Update stock atomically and strictly fail if insufficient
        const stockUpdate = await tx.physicalProduct.updateMany({
          where: { id: item.productId, schoolId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } }
        });

        if (stockUpdate.count === 0) {
          throw new Error(`Insufficient stock for product ID: ${item.productId}`);
        }
      }

      if (totalCostValue > 0) {
        const [cogsAccountId, inventoryAccountId] = await Promise.all([
          getAccountId(schoolId, '6110', tx as any), // COGS - Tuckshop
          getAccountId(schoolId, '1310', tx as any)  // Inventory - Tuckshop
        ]);

        await LedgerService.postEntry({
          schoolId,
          date: new Date(date),
          description: `Inventory consumption recorded by ${requestedBy}`,
          sourceType: 'inventory',
          sourceId: `consump_${Date.now()}`,
          createdByUserId: req.user!.id,
          lines: [
            { accountId: cogsAccountId, debit: totalCostValue, description: 'Cost of goods consumed' },
            { accountId: inventoryAccountId, credit: totalCostValue, description: 'Stock reduction' }
          ],
          tx: tx as any
        });
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to log consumption: ' + error.message });
  }
});

export default router;
