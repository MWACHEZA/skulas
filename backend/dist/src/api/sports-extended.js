"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const moduleAccess_1 = require("../middleware/moduleAccess");
const calendar_service_1 = require("../services/calendar.service");
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
exports.default = router;
//# sourceMappingURL=sports-extended.js.map