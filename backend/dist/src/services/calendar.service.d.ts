export declare function syncModuleEventToCalendar(eventData: {
    title: string;
    date: Date;
    endTime?: Date;
    location?: string;
    type: string;
    sourceModule: string;
    sourceId: string;
    schoolId: string;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    type: string;
    schoolId: string;
    date: Date;
    title: string;
    sourceModule: string;
    sourceId: string;
    endTime: Date | null;
    location: string | null;
}>;
