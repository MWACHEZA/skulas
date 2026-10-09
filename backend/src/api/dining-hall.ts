import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';
import { LedgerService } from '../services/ledger.service';
import { getModuleAccess } from '../middleware/moduleAccess';

const router = Router();

// All dining hall routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/dining-hall/access
 * @desc    Check if a teacher has access to the Dining Hall view
 */
router.get('/access', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    // If not a teacher, just allow based on primary role (handled by frontend anyway)
    if (user.role !== 'TEACHER') {
      return res.json({ hasAccess: true, reason: 'Primary role grants access' });
    }

    // 1. Boarding staff check
    const diningAccess = getModuleAccess(user, 'dining');
    if (diningAccess.level === 'full' || diningAccess.level === 'scoped') {
      return res.json({ hasAccess: true, reason: 'Boarding staff role' });
    }

    // 2. On duty today
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[new Date().getDay()];
    
    const prefectDuty = await prisma.prefectDuty.findFirst({
      where: {
        schoolId,
        day: todayName,
        prefectName: { equals: user.name, mode: 'insensitive' }
      }
    });

    if (prefectDuty) {
      return res.json({ hasAccess: true, reason: 'Assigned to duty today' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await prisma.staffAttendance.findFirst({
      where: {
        schoolId,
        staffId: user.id,
        date: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['ABSENT', 'ON LEAVE'] }
      }
    });

    if (attendance) {
      return res.json({ hasAccess: true, reason: 'Staff present on duty today' });
    }

    // 3. Class teacher with dietary alerts
    const teacherClass = await prisma.schoolClass.findFirst({
      where: {
        schoolId,
        teacherId: user.id
      }
    });

    if (teacherClass) {
      const studentsWithAlerts = await prisma.student.count({
        where: {
          classId: teacherClass.id,
          dietNotes: { not: null }
        }
      });
      if (studentsWithAlerts > 0) {
        return res.json({ hasAccess: true, reason: 'Class teacher of students with dietary alerts' });
      }
    }

    return res.json({ hasAccess: false, reason: 'No active dining hall duty or access requirement' });
  } catch (error) {
    console.error('Dining hall access check error:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

/**
 * Helper to check if user has menu management access
 */
const canManageMenu = (user: any) => {
  return user.role === 'SCHOOL_ADMIN' || 
         user.role === 'BURSAR' || 
         user.role === 'ANCILLARY' || 
         user.secondaryRoles.includes('Kitchen Manager') ||
         user.secondaryRoles.includes('Cook');
};

/**
 * Helper to check if user can view student service reports
 */
const canViewReports = (user: any) => {
  return user.role === 'SCHOOL_ADMIN' || 
         user.role === 'TEACHER' || 
         user.role === 'ANCILLARY' ||
         user.secondaryRoles.includes('Kitchen Manager');
};

/**
 * @route   GET /api/dining-hall/menu
 * @desc    Fetch the current week's published menu
 */
router.get('/menu', async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    let menu = await prisma.weeklyMenu.findFirst({
      where: { schoolId, published: true },
      orderBy: { weekStarting: 'desc' }
    });

    if (!menu) {
      const defaultMenuData = {
        Monday: { breakfast: 'Oatmeal Porridge & Fresh Fruits', lunch: 'Sadza with Beef Stew & Cabbage', dinner: 'Rice & Roast Chicken with Gravy' },
        Tuesday: { breakfast: 'Scrambled Eggs & Toasted Bread', lunch: 'Chicken Stew & Rice with Garden Salad', dinner: 'Spaghetti Bolognaise & Greens' },
        Wednesday: { breakfast: 'Pancakes with Syrup & Tea', lunch: 'Fish & Chips with Tartar Sauce', dinner: 'Sadza & Beef Curry with Braised Spinach' },
        Thursday: { breakfast: 'Cornflakes & Fresh Milk', lunch: 'Pork Chops & Creamy Mashed Potatoes', dinner: 'Vegetable Stew & Steamed Brown Rice' },
        Friday: { breakfast: 'French Toast & Hot Beverage', lunch: 'Sadza & Mixed Braai Meats with Chakalaka', dinner: 'Beef Burger & Potato Wedges' },
        Saturday: { breakfast: 'Boiled Eggs, Sausage & Toast', lunch: 'Jollof Rice & Grilled Chicken Drumsticks', dinner: 'Pasta Alfredo with Peas & Carrots' },
        Sunday: { breakfast: 'Full English Breakfast (Bacon, Eggs & Beans)', lunch: 'Sunday Roast Beef, Roast Potatoes & Gravy', dinner: 'Creamy Vegetable Soup & Fresh Bread Rolls' }
      };

      try {
        menu = await prisma.weeklyMenu.create({
          data: {
            schoolId,
            weekStarting: new Date(),
            menuData: defaultMenuData,
            published: true
          }
        });
      } catch (createErr) {
        // Fallback in-memory response if create fails
        return res.json({
          id: 'default-menu',
          schoolId,
          weekStarting: new Date(),
          published: true,
          menuData: defaultMenuData
        });
      }
    }

    res.json(menu);
  } catch (error) {
    console.error('Fetch menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * @route   POST /api/dining-hall/menu
 * @desc    Create/Update a weekly menu
 */
router.post('/menu', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to publish menu' });
  }

  const { weekStarting, menuData, published } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const menu = await prisma.weeklyMenu.create({
      data: {
        weekStarting: new Date(weekStarting),
        menuData,
        published: published !== undefined ? published : true,
        schoolId
      }
    });

    await logAction(req, 'CREATE_MENU', 'WeeklyMenu', menu.id, { weekStarting });
    res.json(menu);
  } catch (error) {
    console.error('Save menu error:', error);
    res.status(500).json({ error: 'Failed to save menu' });
  }
});

/**
 * @route   GET /api/dining-hall/reports
 * @desc    Fetch submitted dining hall service reports
 */
router.get('/reports', async (req: AuthRequest, res: Response) => {
  if (!canViewReports(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to view service reports' });
  }

  const schoolId = req.user!.schoolId!;
  try {
    const reports = await prisma.diningHallReport.findMany({
      where: { schoolId },
      include: {
        reportedBy: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Failed to fetch dining hall reports' });
  }
});

/**
 * @route   POST /api/dining-hall/reports
 * @desc    Submit a new dining hall service report
 */
router.post('/reports', async (req: AuthRequest, res: Response) => {
  const { category, rating, feedback } = req.body;
  const schoolId = req.user!.schoolId!;
  const userId = req.user!.id;

  if (!category || rating === undefined || !feedback) {
    return res.status(400).json({ error: 'Missing required report fields' });
  }

  try {
    const report = await prisma.diningHallReport.create({
      data: {
        category,
        rating: parseInt(rating),
        feedback,
        reportedById: userId,
        schoolId
      }
    });

    await logAction(req, 'SUBMIT_DINING_HALL_REPORT', 'DiningHallReport', report.id, { category });
    res.json(report);
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Failed to submit dining hall report' });
  }
});

/**
 * @route   POST /api/dining-hall/meal-deduction
 * @desc    Record meal deduction from inventory (1220 -> 5030) and record variance against roll call
 */
router.post('/meal-deduction', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to post meal deductions' });
  }

  const schoolId = req.user!.schoolId!;
  const { mealType, date, rollCallCount, actualServedCount, costPerMeal = 1.5, notes } = req.body;

  if (!mealType || rollCallCount === undefined || actualServedCount === undefined) {
    return res.status(400).json({ error: 'mealType, rollCallCount, and actualServedCount are required' });
  }

  const rollCall = parseInt(rollCallCount);
  const served = parseInt(actualServedCount);
  const unitCost = parseFloat(costPerMeal);
  const variance = served - rollCall; // positive means more served than counted
  const totalCost = Math.round(served * unitCost * 100) / 100;

  try {
    // Post double entry: DR 5030 (Food Provisions Expense) / CR 1220 (Inventory - Dining Hall Provisions)
    const journalEntry = await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '5030', // Food Provisions & Kitchen Groceries
      creditCode: '1220', // Inventory - Dining Hall Provisions
      amount: totalCost,
      description: `Dining meal inventory deduction: ${mealType} on ${date || new Date().toISOString().split('T')[0]} (${served} meals served, roll call: ${rollCall}, variance: ${variance > 0 ? '+' : ''}${variance})`,
      sourceModule: 'dining_deduction',
      reference: `MEAL-${mealType.toUpperCase()}-${Date.now()}`,
      userId: req.user!.id,
      ipAddress: req.ip
    });

    await logAction(req, 'MEAL_DEDUCTION_POSTED', 'JournalEntry', journalEntry.id, {
      mealType,
      rollCall,
      served,
      variance,
      totalCost,
      notes
    });

    res.json({
      success: true,
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      mealType,
      rollCallCount: rollCall,
      actualServedCount: served,
      variance,
      varianceFlag: variance !== 0,
      totalCost,
      postedAt: journalEntry.createdAt
    });
  } catch (error: any) {
    console.error('Meal deduction error:', error);
    res.status(500).json({ error: error.message || 'Failed to post meal deduction' });
  }
});

/**
 * @route   GET /api/dining-hall/meal-deductions
 * @desc    Fetch recent meal deductions posted to the general ledger
 */
router.get('/meal-deductions', async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const deductions = await prisma.journalEntry.findMany({
      where: {
        schoolId,
        sourceModule: 'dining_deduction'
      },
      include: {
        lines: {
          include: {
            account: true
          }
        },
        postedBy: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(deductions);
  } catch (error) {
    console.error('Fetch meal deductions error:', error);
    res.status(500).json({ error: 'Failed to fetch meal deductions' });
  }
});

// ═══════════ DINING PANTRY STOCK & RECIPES (PHASE 3) ═══════════

/**
 * @route   GET /api/dining-hall/pantry
 * @desc    Get all pantry stock items with low stock alerts
 */
router.get('/pantry', async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const items = await prisma.diningPantryItem.findMany({
      where: { schoolId },
      orderBy: { itemName: 'asc' }
    });

    const enriched = items.map(item => ({
      ...item,
      isLowStock: item.stockQty <= item.minAlertQty
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Fetch pantry error:', error);
    res.status(500).json({ error: 'Failed to fetch pantry items' });
  }
});

/**
 * @route   POST /api/dining-hall/pantry
 * @desc    Create or restock a dining pantry item
 */
router.post('/pantry', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to manage dining pantry' });
  }

  const schoolId = req.user!.schoolId!;
  const { itemName, unit = 'kg', stockQty = 0, minAlertQty = 10, unitCost = 1.0 } = req.body;

  if (!itemName) {
    return res.status(400).json({ error: 'itemName is required' });
  }

  try {
    const existing = await prisma.diningPantryItem.findFirst({
      where: { schoolId, itemName: { equals: itemName, mode: 'insensitive' } }
    });

    let item;
    if (existing) {
      item = await prisma.diningPantryItem.update({
        where: { id: existing.id },
        data: {
          stockQty: existing.stockQty + (parseFloat(stockQty) || 0),
          unitCost: parseFloat(unitCost) || existing.unitCost,
          minAlertQty: parseFloat(minAlertQty) || existing.minAlertQty
        }
      });
    } else {
      item = await prisma.diningPantryItem.create({
        data: {
          schoolId,
          itemName,
          unit,
          stockQty: parseFloat(stockQty) || 0,
          minAlertQty: parseFloat(minAlertQty) || 10,
          unitCost: parseFloat(unitCost) || 1.0
        }
      });
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error('Save pantry item error:', error);
    res.status(500).json({ error: 'Failed to save pantry item' });
  }
});

/**
 * @route   PATCH /api/dining-hall/pantry/:id
 * @desc    Update pantry item stock or settings
 */
router.patch('/pantry/:id', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to modify dining pantry' });
  }

  const schoolId = req.user!.schoolId!;
  const { stockQty, minAlertQty, unitCost, unit } = req.body;

  try {
    const updated = await prisma.diningPantryItem.update({
      where: { id: req.params.id as string },
      data: {
        ...(stockQty !== undefined ? { stockQty: parseFloat(stockQty) } : {}),
        ...(minAlertQty !== undefined ? { minAlertQty: parseFloat(minAlertQty) } : {}),
        ...(unitCost !== undefined ? { unitCost: parseFloat(unitCost) } : {}),
        ...(unit ? { unit } : {})
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

/**
 * @route   GET /api/dining-hall/recipes
 * @desc    Fetch meal recipes configured with per-head quantities
 */
router.get('/recipes', async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const recipes = await prisma.diningRecipe.findMany({
      where: { schoolId },
      orderBy: { recipeName: 'asc' }
    });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

/**
 * @route   POST /api/dining-hall/recipes
 * @desc    Create or update a dining recipe with ingredients per head
 */
router.post('/recipes', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to manage recipes' });
  }

  const schoolId = req.user!.schoolId!;
  const { recipeName, mealType = 'LUNCH', description, ingredients = [] } = req.body;

  if (!recipeName || !ingredients.length) {
    return res.status(400).json({ error: 'recipeName and ingredients array are required' });
  }

  try {
    const recipe = await prisma.diningRecipe.create({
      data: {
        schoolId,
        recipeName,
        mealType: mealType.toUpperCase(),
        description,
        ingredients
      }
    });

    res.json({ success: true, recipe });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

/**
 * @route   POST /api/dining-hall/scheduled-meal-deduction
 * @desc    Deduct scheduled meal ingredients from dining pantry stock based on per-head recipe & post to general ledger
 */
router.post('/scheduled-meal-deduction', async (req: AuthRequest, res: Response) => {
  if (!canManageMenu(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to post scheduled meal deductions' });
  }

  const schoolId = req.user!.schoolId!;
  const { mealType, date = new Date().toISOString().split('T')[0], headCount, recipeId, notes } = req.body;

  if (!mealType || !headCount) {
    return res.status(400).json({ error: 'mealType and headCount are required' });
  }

  const count = parseInt(headCount);
  if (isNaN(count) || count <= 0) {
    return res.status(400).json({ error: 'headCount must be a positive integer' });
  }

  try {
    // 1. Fetch recipe or default fallback institutional proportions
    let recipe = recipeId
      ? await prisma.diningRecipe.findFirst({ where: { id: recipeId, schoolId } })
      : await prisma.diningRecipe.findFirst({ where: { schoolId, mealType: { equals: mealType, mode: 'insensitive' } } });

    let ingredientsToDeduct: Array<{ itemName: string; perHeadQty: number; unit: string; pantryItemId?: string }> = [];

    if (recipe && Array.isArray(recipe.ingredients)) {
      ingredientsToDeduct = recipe.ingredients as any;
    } else {
      // Institutional default boarding recipe per head
      if (mealType.toLowerCase() === 'breakfast') {
        ingredientsToDeduct = [
          { itemName: 'Meal Meal / Oatmeal', perHeadQty: 0.15, unit: 'kg' },
          { itemName: 'Sugar', perHeadQty: 0.04, unit: 'kg' },
          { itemName: 'Milk', perHeadQty: 0.2, unit: 'litres' }
        ];
      } else if (mealType.toLowerCase() === 'lunch') {
        ingredientsToDeduct = [
          { itemName: 'Maize Meal (Sadza)', perHeadQty: 0.25, unit: 'kg' },
          { itemName: 'Beef / Protein', perHeadQty: 0.15, unit: 'kg' },
          { itemName: 'Cooking Oil', perHeadQty: 0.03, unit: 'litres' },
          { itemName: 'Vegetables / Greens', perHeadQty: 0.1, unit: 'kg' }
        ];
      } else {
        ingredientsToDeduct = [
          { itemName: 'Rice / Sadza', perHeadQty: 0.22, unit: 'kg' },
          { itemName: 'Chicken / Stew', perHeadQty: 0.15, unit: 'kg' },
          { itemName: 'Cooking Oil', perHeadQty: 0.03, unit: 'litres' }
        ];
      }
    }

    // 2. Deduct from pantry and compute total food cost
    let totalFoodCost = 0;
    const deductionsSummary: any[] = [];

    for (const ing of ingredientsToDeduct) {
      const requiredQty = Math.round(count * ing.perHeadQty * 100) / 100;

      // Find or create pantry item
      let pantryItem = ing.pantryItemId
        ? await prisma.diningPantryItem.findFirst({ where: { id: ing.pantryItemId, schoolId } })
        : await prisma.diningPantryItem.findFirst({
            where: { schoolId, itemName: { equals: ing.itemName, mode: 'insensitive' } }
          });

      if (!pantryItem) {
        pantryItem = await prisma.diningPantryItem.create({
          data: {
            schoolId,
            itemName: ing.itemName,
            unit: ing.unit,
            stockQty: 500, // initialized stock
            minAlertQty: 25,
            unitCost: ing.unit === 'kg' ? 1.5 : 2.0
          }
        });
      }

      const cost = Math.round(requiredQty * pantryItem.unitCost * 100) / 100;
      totalFoodCost += cost;

      const remainingStock = Math.max(0, pantryItem.stockQty - requiredQty);
      await prisma.diningPantryItem.update({
        where: { id: pantryItem.id },
        data: { stockQty: remainingStock }
      });

      deductionsSummary.push({
        pantryItemId: pantryItem.id,
        itemName: pantryItem.itemName,
        deductedQty: requiredQty,
        unit: pantryItem.unit,
        unitCost: pantryItem.unitCost,
        cost,
        remainingStock,
        isLowStock: remainingStock <= pantryItem.minAlertQty
      });
    }

    totalFoodCost = Math.round(totalFoodCost * 100) / 100;

    // 3. Post double entry: DR 5030 (Food Provisions Expense) / CR 1220 (Inventory - Dining Provisions)
    const journalEntry = await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '5030',
      creditCode: '1220',
      amount: totalFoodCost,
      description: `Scheduled meal pantry deduction: ${mealType} on ${date} (${count} boarders served, ${ingredientsToDeduct.length} ingredients)`,
      sourceModule: 'dining_pantry_deduction',
      reference: `PANTRY-${mealType.toUpperCase()}-${Date.now()}`,
      userId: req.user!.id,
      ipAddress: req.ip,
      bypassApprovalCheck: true
    });

    await logAction(req, 'PANTRY_MEAL_DEDUCTION_POSTED', 'JournalEntry', journalEntry.id, {
      mealType,
      headCount: count,
      totalCost: totalFoodCost,
      ingredientsCount: ingredientsToDeduct.length,
      notes
    });

    res.json({
      success: true,
      mealType,
      date,
      headCount: count,
      recipeName: recipe?.recipeName || `${mealType} Standard Boarding Proportions`,
      totalFoodCost,
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      deductionsSummary
    });
  } catch (error: any) {
    console.error('Scheduled meal deduction error:', error);
    res.status(500).json({ error: error.message || 'Failed to post scheduled meal deduction' });
  }
});

export default router;
