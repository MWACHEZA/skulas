"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncModuleEventToCalendar = syncModuleEventToCalendar;
const prisma_1 = __importDefault(require("../lib/prisma"));
async function syncModuleEventToCalendar(eventData) {
    const existingEvent = await prisma_1.default.calendarEvent.findFirst({
        where: {
            sourceModule: eventData.sourceModule,
            sourceId: eventData.sourceId,
            schoolId: eventData.schoolId
        }
    });
    if (existingEvent) {
        return prisma_1.default.calendarEvent.update({
            where: { id: existingEvent.id },
            data: eventData
        });
    }
    else {
        return prisma_1.default.calendarEvent.create({
            data: eventData
        });
    }
}
//# sourceMappingURL=calendar.service.js.map