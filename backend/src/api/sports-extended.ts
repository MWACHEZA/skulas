import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireModuleAccess } from '../middleware/moduleAccess';
import { syncModuleEventToCalendar } from '../services/calendar.service';
import { BursarService } from '../services/bursar.service';
import { CreditNoteService } from '../services/credit-note.service';

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

// ═══════════════════════════════════════════════════════════════════
// SCHOOL TRIPS & PARENT CONSENT BILLING (BURSAR INTEGRATION)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/sports/trips
 * List all school trips and excursions
 */
router.get('/trips', async (req: Request, res: Response) => {
  try {
    const { schoolId } = (req as any).user;
    const trips = await prisma.schoolTrip.findMany({
      where: { schoolId },
      include: {
        _count: { select: { consents: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

/**
 * POST /api/sports/trips
 * Create a new school trip / excursion
 */
router.post('/trips', async (req: Request, res: Response) => {
  try {
    const { schoolId, id: userId } = (req as any).user;
    const { title, destination, date, cost = 0, currency = 'USD', description, transport } = req.body;

    if (!title || !destination || !date) {
      return res.status(400).json({ error: 'title, destination, and date are required' });
    }

    const trip = await prisma.schoolTrip.create({
      data: {
        schoolId,
        title,
        destination,
        date: new Date(date),
        cost: parseFloat(cost) || 0,
        currency,
        description,
        transport,
        status: 'PLANNED'
      }
    });

    await syncModuleEventToCalendar({
      title: `Trip: ${title}`,
      date: new Date(date),
      type: 'ACADEMIC_EVENT',
      sourceModule: 'sports',
      sourceId: trip.id,
      schoolId
    });

    res.status(201).json(trip);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create trip' });
  }
});

/**
 * POST /api/sports/trips/:tripId/consent
 * Record parental consent / student approval for a trip and invoice via BursarService
 * Idempotency Key: trip_{consent_id}
 * Revenue Account: 4031 (Sports, Culture & Activity Levies)
 */
router.post('/trips/:tripId/consent', async (req: Request, res: Response) => {
  try {
    const { schoolId, id: userId } = (req as any).user;
    const tripId = req.params.tripId as string;
    const { studentId, parentName, parentPhone, termId = 'term_1' } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const [trip, student] = await Promise.all([
      prisma.schoolTrip.findFirst({ where: { id: tripId, schoolId } }),
      prisma.student.findFirst({ where: { id: studentId, schoolId } })
    ]);

    if (!trip) return res.status(404).json({ error: 'School trip not found' });
    if (!student) return res.status(404).json({ error: 'Student not found in this school' });

    // Check if consent already exists
    let consent = await prisma.tripConsent.findFirst({
      where: { schoolId, tripId, studentId }
    });

    if (!consent) {
      consent = await prisma.tripConsent.create({
        data: {
          schoolId,
          tripId,
          studentId,
          parentName: parentName || 'Parent / Guardian',
          parentPhone,
          status: 'APPROVED'
        }
      });
    }

    // Auto-invoice via Bursar if trip has cost > 0
    let invoiceResult: any = null;
    if (trip.cost > 0) {
      const idempotencyKey = `trip_${consent.id}`;
      invoiceResult = await BursarService.createStudentInvoice({
        schoolId,
        idempotencyKey,
        studentId,
        termId,
        term: termId,
        sourceModule: 'trips',
        sourceId: consent.id,
        items: [
          {
            billingItemCode: 'TRIP',
            description: `Excursion / School Trip Fee — ${trip.title} (${trip.destination})`,
            quantity: 1,
            unitPrice: trip.cost,
            totalAmount: trip.cost,
            revenueAccountCode: '4031'
          }
        ],
        createdBy: userId || 'SYSTEM'
      });

      await prisma.tripConsent.update({
        where: { id: consent.id },
        data: { invoiceId: invoiceResult.invoice.id }
      });
    }

    res.json({
      success: true,
      consent,
      invoice: invoiceResult?.invoice || null
    });
  } catch (error: any) {
    console.error('Trip consent error:', error);
    res.status(500).json({ error: error.message || 'Failed to process trip consent' });
  }
});

/**
 * GET /api/sports/trips/:tripId/consents
 * List all signed consents for a trip
 */
router.get('/trips/:tripId/consents', async (req: Request, res: Response) => {
  try {
    const { schoolId } = (req as any).user;
    const tripId = req.params.tripId as string;
    const consents = await prisma.tripConsent.findMany({
      where: { schoolId, tripId },
      include: {
        student: { select: { id: true, studentId: true, name: true, class: true } }
      },
      orderBy: { consentedAt: 'desc' }
    });
    res.json(consents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trip consents' });
  }
});

/**
 * POST /api/sports/trips/consents/:id/cancel
 * Cancel trip consent and issue reversal credit note to Bursar
 */
router.post('/trips/consents/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { schoolId, id: userId } = (req as any).user;
    const id = req.params.id as string;
    const { reason = 'Trip consent withdrawn by parent' } = req.body;

    const consent = await prisma.tripConsent.findFirst({
      where: { id, schoolId }
    });

    if (!consent) return res.status(404).json({ error: 'Trip consent not found' });

    let creditNoteResult: any = null;
    if (consent.invoiceId) {
      creditNoteResult = await CreditNoteService.createCreditNoteForInvoice({
        schoolId,
        invoiceId: consent.invoiceId,
        reason,
        issuedByUserId: userId
      });
    }

    const updated = await prisma.tripConsent.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        creditNoteId: creditNoteResult?.creditNote?.id || null
      }
    });

    res.json({
      success: true,
      consent: updated,
      creditNote: creditNoteResult?.creditNote || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel trip consent' });
  }
});

export default router;
