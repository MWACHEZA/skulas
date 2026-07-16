import express, { Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const inquiries = await prisma.websiteInquiry.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { createdAt: 'desc' }
    });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, message } = req.body;
    const inquiry = await prisma.websiteInquiry.create({
      data: {
        name,
        email,
        phone,
        message,
        schoolId: req.user!.schoolId!
      }
    });
    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create inquiry' });
  }
});

router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.websiteInquiry.delete({
      where: {
        id: req.params.id as string,
        schoolId: req.user!.schoolId!
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

export default router;
