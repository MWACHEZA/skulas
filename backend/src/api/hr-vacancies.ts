import express, { Response } from 'express';

import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const vacancies = await prisma.vacancy.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: { department: true, recruiter: true }
    });
    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    res.status(500).json({ error: 'Failed to fetch vacancies' });
  }
});

router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const { reqPhoto, reqResume, reqDob, reqGender, ...data } = req.body;
    const vacancy = await prisma.vacancy.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        interviewRounds: parseInt(data.interviewRounds, 10),
        numberOfVacancies: parseInt(data.numberOfVacancies, 10),
        schoolId: req.user!.schoolId!
      }
    });
    res.json(vacancy);
  } catch (error) {
    console.error('Error creating vacancy:', error);
    res.status(500).json({ error: 'Failed to create vacancy' });
  }
});

router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.vacancy.delete({
      where: {
        id: req.params.id as string,
        schoolId: req.user!.schoolId!
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vacancy' });
  }
});

router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const { reqPhoto, reqResume, reqDob, reqGender, id, ...data } = req.body;
    const vacancy = await prisma.vacancy.update({
      where: {
        id: req.params.id as string,
        schoolId: req.user!.schoolId!
      },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        interviewRounds: data.interviewRounds ? parseInt(data.interviewRounds, 10) : undefined,
        numberOfVacancies: data.numberOfVacancies ? parseInt(data.numberOfVacancies, 10) : undefined
      }
    });
    res.json(vacancy);
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ error: 'Failed to update vacancy' });
  }
});

export default router;
