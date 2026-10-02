import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireModuleAccess } from '../middleware/moduleAccess';
import { syncModuleEventToCalendar } from '../services/calendar.service';

const router = Router();

router.use(requireModuleAccess('sports'));

router.get('/teams', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const teams = await prisma.sport.findMany({ where: { schoolId } });
  res.json(teams);
});

router.get('/houses', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const houses = await prisma.studentHouse.findMany({ where: { schoolId } });
  res.json(houses);
});

router.get('/equipment', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const equipment = await prisma.sportingEquipment.findMany({
    where: { sport: { schoolId } },
    include: { sport: true }
  });
  res.json(equipment);
});

router.get('/events', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const events = await prisma.sportsEvent.findMany({ where: { schoolId } });
  res.json(events);
});

router.post('/events', async (req: Request, res: Response) => {
  const { schoolId } = (req as any).user;
  const { title, type, sport, date, venue, opponent, compulsory, transport, facilities, catering } = req.body;
  
  const event = await prisma.sportsEvent.create({
    data: {
      title, type, sport, date: new Date(date), venue, opponent, compulsory, schoolId
    }
  });

  if (transport) {
    await prisma.transportRequest.create({ data: { eventId: event.id, details: transport, schoolId } });
  }
  if (facilities) {
    await prisma.facilitiesRequest.create({ data: { eventId: event.id, details: facilities, schoolId } });
  }
  if (catering) {
    await prisma.cateringRequest.create({ data: { eventId: event.id, details: catering, schoolId } });
  }

  await syncModuleEventToCalendar({
    title,
    date: new Date(date),
    type: 'SPORTS',
    sourceModule: 'sports',
    sourceId: event.id,
    schoolId
  });

  res.json(event);
});

export default router;
