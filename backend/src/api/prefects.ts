import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma'; // Ensure this matches actual db import
import { requireModuleAccess } from '../middleware/moduleAccess'; // Ensure this is the right import path for auth middleware

const router = Router();

// Gating middleware
router.use(requireModuleAccess('prefects'));

// Duty Roster
router.get('/duty', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const duties = await prisma.prefectDuty.findMany({ where: { schoolId } });
  res.json(duties);
});

router.post('/duty', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const { studentId, date, role } = req.body;
  const duty = await prisma.prefectDuty.create({
    data: { studentId, date: new Date(date), role, schoolId }
  });
  res.json(duty);
});

// Meeting Minutes
router.get('/meetings', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const meetings = await prisma.prefectMeeting.findMany({ where: { schoolId } });
  res.json(meetings);
});

router.post('/meetings', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const { date, chairId, agenda, minutes } = req.body;
  const meeting = await prisma.prefectMeeting.create({
    data: { date: new Date(date), chairId, agenda, minutes, schoolId }
  });
  res.json(meeting);
});

// Conduct Reports (DisciplineRecord)
router.get('/conduct', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const reports = await prisma.disciplineRecord.findMany({ where: { schoolId } });
  res.json(reports);
});

router.post('/conduct', async (req: Request, res: Response) => {
  const { schoolId, id: reporterId } = (req as any).user;
  const { studentId, date, offenceType, description, severity } = req.body;
  const record = await prisma.disciplineRecord.create({
    data: {
      studentId,
      reporterId,
      date: new Date(date),
      offenceType,
      description,
      severity,
      schoolId
    }
  });
  res.json(record);
});

// Prefects List
router.get('/', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const prefects = await prisma.leadershipAssignment.findMany({
    where: { schoolId, isActive: true },
    include: { student: true }
  });
  res.json(prefects);
});

export default router;
