import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireModuleAccess } from '../middleware/moduleAccess';

const router = Router();

// Gating middleware: require authentication, then module access
router.use(requireAuth);
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
  const reports = await prisma.disciplineRecord.findMany({
    where: { schoolId },
    orderBy: { date: 'desc' }
  });
  const studentIds = [...new Set(reports.map(r => r.studentId))];
  const reporterIds = [...new Set(reports.map(r => r.reporterId))];
  const [students, reporters] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, studentId: true, class: { select: { name: true } } }
    }),
    prisma.user.findMany({
      where: { id: { in: reporterIds } },
      select: { id: true, name: true, role: true }
    })
  ]);
  const sMap = new Map(students.map(s => [s.id, s]));
  const rMap = new Map(reporters.map(r => [r.id, r]));
  res.json(reports.map(r => ({
    ...r,
    student: sMap.get(r.studentId) || null,
    reporter: rMap.get(r.reporterId) || null
  })));
});

router.get('/reports', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const reports = await prisma.disciplineRecord.findMany({
    where: { schoolId },
    orderBy: { date: 'desc' }
  });
  const studentIds = [...new Set(reports.map(r => r.studentId))];
  const reporterIds = [...new Set(reports.map(r => r.reporterId))];
  const [students, reporters] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, studentId: true, class: { select: { name: true } } }
    }),
    prisma.user.findMany({
      where: { id: { in: reporterIds } },
      select: { id: true, name: true, role: true }
    })
  ]);
  const sMap = new Map(students.map(s => [s.id, s]));
  const rMap = new Map(reporters.map(r => [r.id, r]));
  res.json(reports.map(r => ({
    ...r,
    student: sMap.get(r.studentId) || null,
    reporter: rMap.get(r.reporterId) || null
  })));
});

router.patch('/reports/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, resolution } = req.body;
  try {
    const updated = await prisma.disciplineRecord.update({
      where: { id: id as string },
      data: {
        actionTaken: resolution || status,
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report status' });
  }
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
