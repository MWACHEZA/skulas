"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const moduleAccess_1 = require("../middleware/moduleAccess");
const calendar_service_1 = require("../services/calendar.service");
const bursar_service_1 = require("../services/bursar.service");
const credit_note_service_1 = require("../services/credit-note.service");
const router = (0, express_1.Router)();
router.use((0, moduleAccess_1.requireModuleAccess)('sports'));
router.get('/teams', async (req, res) => {
    const { schoolId } = req.user;
    const teams = await prisma_1.default.sport.findMany({ where: { schoolId } });
    res.json(teams);
});
router.get('/houses', async (req, res) => {
    const { schoolId } = req.user;
    const houses = await prisma_1.default.studentHouse.findMany({ where: { schoolId } });
    res.json(houses);
});
router.get('/equipment', async (req, res) => {
    const { schoolId } = req.user;
    const equipment = await prisma_1.default.sportingEquipment.findMany({
        where: { sport: { schoolId } },
        include: { sport: true }
    });
    res.json(equipment);
});
router.get('/events', async (req, res) => {
    const { schoolId } = req.user;
    const events = await prisma_1.default.sportsEvent.findMany({ where: { schoolId } });
    res.json(events);
});
router.post('/events', async (req, res) => {
    const { schoolId } = req.user;
    const { title, type, sport, date, venue, opponent, compulsory, transport, facilities, catering } = req.body;
    const event = await prisma_1.default.sportsEvent.create({
        data: {
            title, type, sport, date: new Date(date), venue, opponent, compulsory, schoolId
        }
    });
    if (transport) {
        await prisma_1.default.transportRequest.create({ data: { eventId: event.id, details: transport, schoolId } });
    }
    if (facilities) {
        await prisma_1.default.facilitiesRequest.create({ data: { eventId: event.id, details: facilities, schoolId } });
    }
    if (catering) {
        await prisma_1.default.cateringRequest.create({ data: { eventId: event.id, details: catering, schoolId } });
    }
    await (0, calendar_service_1.syncModuleEventToCalendar)({
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
router.get('/trips', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const trips = await prisma_1.default.schoolTrip.findMany({
            where: { schoolId },
            include: {
                _count: { select: { consents: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(trips);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
});
/**
 * POST /api/sports/trips
 * Create a new school trip / excursion
 */
router.post('/trips', async (req, res) => {
    try {
        const { schoolId, id: userId } = req.user;
        const { title, destination, date, cost = 0, currency = 'USD', description, transport } = req.body;
        if (!title || !destination || !date) {
            return res.status(400).json({ error: 'title, destination, and date are required' });
        }
        const trip = await prisma_1.default.schoolTrip.create({
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
        await (0, calendar_service_1.syncModuleEventToCalendar)({
            title: `Trip: ${title}`,
            date: new Date(date),
            type: 'ACADEMIC_EVENT',
            sourceModule: 'sports',
            sourceId: trip.id,
            schoolId
        });
        res.status(201).json(trip);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create trip' });
    }
});
/**
 * POST /api/sports/trips/:tripId/consent
 * Record parental consent / student approval for a trip and invoice via BursarService
 * Idempotency Key: trip_{consent_id}
 * Revenue Account: 4031 (Sports, Culture & Activity Levies)
 */
router.post('/trips/:tripId/consent', async (req, res) => {
    try {
        const { schoolId, id: userId } = req.user;
        const tripId = req.params.tripId;
        const { studentId, parentName, parentPhone, termId = 'term_1' } = req.body;
        if (!studentId) {
            return res.status(400).json({ error: 'studentId is required' });
        }
        const [trip, student] = await Promise.all([
            prisma_1.default.schoolTrip.findFirst({ where: { id: tripId, schoolId } }),
            prisma_1.default.student.findFirst({ where: { id: studentId, schoolId } })
        ]);
        if (!trip)
            return res.status(404).json({ error: 'School trip not found' });
        if (!student)
            return res.status(404).json({ error: 'Student not found in this school' });
        // Check if consent already exists
        let consent = await prisma_1.default.tripConsent.findFirst({
            where: { schoolId, tripId, studentId }
        });
        if (!consent) {
            consent = await prisma_1.default.tripConsent.create({
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
        let invoiceResult = null;
        if (trip.cost > 0) {
            const idempotencyKey = `trip_${consent.id}`;
            invoiceResult = await bursar_service_1.BursarService.createStudentInvoice({
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
            await prisma_1.default.tripConsent.update({
                where: { id: consent.id },
                data: { invoiceId: invoiceResult.invoice.id }
            });
        }
        res.json({
            success: true,
            consent,
            invoice: invoiceResult?.invoice || null
        });
    }
    catch (error) {
        console.error('Trip consent error:', error);
        res.status(500).json({ error: error.message || 'Failed to process trip consent' });
    }
});
/**
 * GET /api/sports/trips/:tripId/consents
 * List all signed consents for a trip
 */
router.get('/trips/:tripId/consents', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const tripId = req.params.tripId;
        const consents = await prisma_1.default.tripConsent.findMany({
            where: { schoolId, tripId },
            include: {
                student: { select: { id: true, studentId: true, name: true, class: true } }
            },
            orderBy: { consentedAt: 'desc' }
        });
        res.json(consents);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch trip consents' });
    }
});
/**
 * POST /api/sports/trips/consents/:id/cancel
 * Cancel trip consent and issue reversal credit note to Bursar
 */
router.post('/trips/consents/:id/cancel', async (req, res) => {
    try {
        const { schoolId, id: userId } = req.user;
        const id = req.params.id;
        const { reason = 'Trip consent withdrawn by parent' } = req.body;
        const consent = await prisma_1.default.tripConsent.findFirst({
            where: { id, schoolId }
        });
        if (!consent)
            return res.status(404).json({ error: 'Trip consent not found' });
        let creditNoteResult = null;
        if (consent.invoiceId) {
            creditNoteResult = await credit_note_service_1.CreditNoteService.createCreditNoteForInvoice({
                schoolId,
                invoiceId: consent.invoiceId,
                reason,
                issuedByUserId: userId
            });
        }
        const updated = await prisma_1.default.tripConsent.update({
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
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to cancel trip consent' });
    }
});
exports.default = router;
//# sourceMappingURL=sports-extended.js.map