import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get the logged in user's payslips (salary stubs)
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const payslips = await prisma.salaryStub.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        userId: req.user!.id
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });
    
    // We append the month name dynamically for convenience
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const mapped = payslips.map(ps => ({
      ...ps,
      period: `${monthNames[ps.month - 1]} ${ps.year}`
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

export default router;
