import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';

const router = Router();

router.post('/apply', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const { studentId, type, sponsor, percentage, validFrom, validTo } = req.body;
  
  try {
    const bursary = await prisma.studentBursary.create({
      data: {
        schoolId,
        studentId,
        type,
        sponsor,
        percentage,
        validFrom: new Date(validFrom),
        validTo: validTo ? new Date(validTo) : null,
        status: 'pending'
      }
    });
    res.status(201).json(bursary);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.post('/:id/approve', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  const id = req.params.id as string;

  try {
    const bursary = await prisma.studentBursary.findFirst({
      where: { id, schoolId, status: { in: ['pending', 'suggested'] } }
    });
    if (!bursary) return res.status(404).json({ message: 'Bursary not found or already approved' });

    const student = await prisma.student.findUnique({ where: { id: bursary.studentId } });

    const updated = await prisma.studentBursary.update({
      where: { id },
      data: { status: 'approved', approvedById: req.user!.id }
    });

    // Ledger post Double Entry
    // 1210: Student Accounts Receivable
    // 5100: Tuition/Discount Revenue (using as contra-revenue for example)
    const discountAmount = 0; // Requires fees info to compute actual discount amount
    
    if (discountAmount > 0 && student) {
      await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        date: new Date(),
        description: `Bursary discount for ${student.name}`,
        amount: discountAmount,
        debitCode: '5100',
        creditCode: '1210',
        sourceModule: 'fees', // fees is expected
        studentId: student.id,
        currency: 'USD'
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response): Promise<any> => {
  const schoolId = req.user!.schoolId!;
  try {
    const bursaries = await prisma.studentBursary.findMany({
      where: { schoolId },
      include: { student: true, approver: true }
    });
    res.json(bursaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
