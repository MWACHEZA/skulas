import prisma from '../lib/prisma';

export async function syncModuleEventToCalendar(eventData: {
  title: string;
  date: Date;
  endTime?: Date;
  location?: string;
  type: string;
  sourceModule: string;
  sourceId: string;
  schoolId: string;
}) {
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      sourceModule: eventData.sourceModule,
      sourceId: eventData.sourceId,
      schoolId: eventData.schoolId
    }
  });

  if (existingEvent) {
    return prisma.calendarEvent.update({
      where: { id: existingEvent.id },
      data: eventData
    });
  } else {
    return prisma.calendarEvent.create({
      data: eventData
    });
  }
}
