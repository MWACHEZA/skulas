/**
 * Calculates business days or calendar days between two dates
 */
export declare function calculateDaysBetween(startDate: Date, endDate: Date, includeWeekends?: boolean): number;
/**
 * Computes overdue days and fine for a loan according to configurable school library settings
 */
export declare function computeLoanFine(loan: {
    dueDate: Date;
    studentId?: string | null;
    waivedFine?: number | null;
    paidFine?: number | null;
}, setting?: {
    studentDailyFine?: number;
    studentMaxFine?: number;
    staffDailyFine?: number;
    staffMaxFine?: number;
    accrueOnWeekends?: boolean;
} | null): {
    daysOverdue: number;
    fineAmount: number;
    isOverdue: boolean;
};
/**
 * Runs the daily Library Automated Reminder System (runs at 8:00 AM)
 */
export declare function runLibraryReminders(): Promise<{
    sentCount: number;
    errors: any[];
}>;
/**
 * Background runner that triggers every morning at 8:00 AM
 */
export declare class LibraryReminderWorker {
    private timer?;
    private isRunning;
    start(): void;
    stop(): void;
}
export declare const libraryReminderWorker: LibraryReminderWorker;
