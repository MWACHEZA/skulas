import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Search ICD10 codes
router.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json([]);

    const codes = await prisma.icd10Code.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: { code: 'asc' }
    });

    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search ICD-10 codes' });
  }
});

// List codes with pagination
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [codes, total] = await Promise.all([
      prisma.icd10Code.findMany({ skip, take: limit, orderBy: { code: 'asc' } }),
      prisma.icd10Code.count()
    ]);

    res.json({
      codes,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ICD-10 codes' });
  }
});

// Create a new code
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code, description, category } = req.body;
    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' });
    }

    const newCode = await prisma.icd10Code.create({
      data: { code, description, category }
    });

    res.json(newCode);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'ICD-10 Code already exists' });
    }
    res.status(500).json({ error: 'Failed to create ICD-10 code' });
  }
});

// Update an existing code
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code, description, category } = req.body;
    const updatedCode = await prisma.icd10Code.update({
      where: { id: req.params.id as string },
      data: { code, description, category }
    });

    res.json(updatedCode);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ICD-10 code' });
  }
});

// Delete a code
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.icd10Code.delete({
      where: { id: req.params.id as string }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ICD-10 code' });
  }
});

export default router;
