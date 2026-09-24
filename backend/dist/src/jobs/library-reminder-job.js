"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.libraryReminderWorker = exports.LibraryReminderWorker = void 0;
exports.calculateDaysBetween = calculateDaysBetween;
exports.computeLoanFine = computeLoanFine;
exports.runLibraryReminders = runLibraryReminders;
const prisma_1 = __importDefault(require("../lib/prisma"));
const notifications_1 = require("../services/notifications");
/**
 * Calculates business days or calendar days between two dates
 */
function calculateDaysBetween(startDate, endDate, includeWeekends = false) {
    if (startDate >= endDate)
        return 0;
    if (includeWeekends) {
        const diff = endDate.getTime() - startDate.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    let count = 0;
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const target = new Date(endDate);
    target.setHours(0, 0, 0, 0);
    while (cur < target) {
        cur.setDate(cur.getDate() + 1);
        const day = cur.getDay();
        if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
            count++;
        }
    }
    return count;
}
/**
 * Computes overdue days and fine for a loan according to configurable school library settings
 */
function computeLoanFine(loan, setting) {
    const now = new Date();
    const due = new Date(loan.dueDate);
    if (now <= due) {
        return { daysOverdue: 0, fineAmount: 0, isOverdue: false };
    }
    const isStudent = !!loan.studentId;
    const dailyRate = isStudent ? (setting?.studentDailyFine ?? 0.50) : (setting?.staffDailyFine ?? 1.00);
    const maxCap = isStudent ? (setting?.studentMaxFine ?? 20.00) : (setting?.staffMaxFine ?? 30.00);
    const includeWeekends = setting?.accrueOnWeekends ?? false;
    const daysOverdue = calculateDaysBetween(due, now, includeWeekends);
    const rawFine = daysOverdue * dailyRate;
    const cappedFine = Math.min(rawFine, maxCap);
    // Deduct waived and paid fines
    const waived = loan.waivedFine ?? 0;
    const paid = loan.paidFine ?? 0;
    const netFine = Math.max(0, cappedFine - waived - paid);
    return { daysOverdue, fineAmount: parseFloat(netFine.toFixed(2)), isOverdue: daysOverdue > 0 };
}
/**
 * Runs the daily Library Automated Reminder System (runs at 8:00 AM)
 */
async function runLibraryReminders() {
    console.log('[Library Reminder Job] Starting 8am reminder sweep...');
    let sentCount = 0;
    const errors = [];
    try {
        const activeLoans = await prisma_1.default.bookLoan.findMany({
            where: {
                status: 'borrowed',
                returnedAt: null
            },
            include: {
                book: true,
                student: {
                    include: {
                        user: { select: { id: true, name: true, email: true, phone: true } }
                    }
                },
                user: { select: { id: true, name: true, email: true, phone: true } }
            }
        });
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        // Group loans by school to fetch LibrarySetting once per school
        const settingsBySchool = {};
        for (const loan of activeLoans) {
            try {
                if (!settingsBySchool[loan.schoolId]) {
                    settingsBySchool[loan.schoolId] = await prisma_1.default.librarySetting.findUnique({
                        where: { schoolId: loan.schoolId }
                    });
                }
                const setting = settingsBySchool[loan.schoolId];
                const borrowerName = loan.student?.user?.name || loan.student?.name || loan.user?.name || 'Borrower';
                const borrowerEmail = loan.student?.user?.email || loan.student?.email || loan.user?.email;
                const borrowerPhone = loan.student?.user?.phone || loan.student?.phone || loan.user?.phone;
                const recipientUserId = loan.userId || loan.student?.userId;
                const due = new Date(loan.dueDate);
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const { daysOverdue, fineAmount, isOverdue } = computeLoanFine(loan, setting);
                // Update fine in database
                if (isOverdue) {
                    await prisma_1.default.bookLoan.update({
                        where: { id: loan.id },
                        data: { fineCalculated: fineAmount }
                    });
                }
                let reminderMessage = null;
                let reminderType = null;
                const accession = loan.accessionNumber || loan.book.accessionNumber || loan.book.isbn || 'catalog copy';
                const dueDateFormatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                // Reminder Trigger Rules:
                if (!isOverdue) {
                    if (diffDays === 3) {
                        reminderType = '3_DAYS_BEFORE';
                        reminderMessage = `"${loan.book.title}" is due in 3 days — ${dueDateFormatted}.`;
                    }
                    else if (diffDays === 1) {
                        reminderType = '1_DAY_BEFORE';
                        reminderMessage = `Due Tomorrow: Please return ${accession} ("${loan.book.title}").`;
                    }
                    else if (diffDays === 0) {
                        reminderType = 'DUE_TODAY';
                        reminderMessage = `Due Today: Return "${loan.book.title}" by 4pm to avoid a fine.`;
                    }
                }
                else {
                    // Overdue flow
                    const dailyRate = loan.studentId ? (setting?.studentDailyFine ?? 0.50) : (setting?.staffDailyFine ?? 1.00);
                    if (daysOverdue === 1) {
                        reminderType = '1_DAY_OVERDUE';
                        reminderMessage = `Overdue: Fine started — $${dailyRate.toFixed(2)}/day for "${loan.book.title}". Return now.`;
                    }
                    else if (daysOverdue > 1 && daysOverdue % 3 === 0) {
                        // Every 3 days after that while still overdue
                        reminderType = `OVERDUE_${daysOverdue}_DAYS`;
                        reminderMessage = `Overdue Update: "${loan.book.title}" is now ${daysOverdue} days overdue. Current accumulated fine: $${fineAmount.toFixed(2)}. Return immediately.`;
                    }
                }
                // Avoid duplicate triggers on the same calendar day
                if (reminderMessage && reminderType) {
                    const lastSentStr = loan.lastReminderDate ? loan.lastReminderDate.toISOString().slice(0, 10) : null;
                    if (lastSentStr !== todayStr) {
                        // Enqueue notification
                        if (borrowerPhone || borrowerEmail) {
                            await notifications_1.NotificationService.enqueue({
                                type: borrowerPhone ? 'WhatsApp' : 'Email',
                                schoolId: loan.schoolId,
                                senderId: 'SYSTEM',
                                studentId: loan.studentId || undefined,
                                recipientPhone: borrowerPhone || undefined,
                                recipientEmail: borrowerEmail || undefined,
                                payload: {
                                    borrowerName,
                                    bookTitle: loan.book.title,
                                    message: reminderMessage,
                                    dueDate: dueDateFormatted,
                                    daysOverdue,
                                    fineAmount
                                }
                            }).catch(e => console.error('Enqueue notification error:', e));
                        }
                        // Log communication
                        await notifications_1.NotificationService.logCommunication({
                            schoolId: loan.schoolId,
                            senderId: 'SYSTEM',
                            studentId: loan.studentId || undefined,
                            type: 'LIBRARY_REMINDER',
                            description: `[Library Reminder] ${reminderMessage} (Borrower: ${borrowerName})`,
                            status: 'SENT'
                        }).catch(e => console.error('Log communication error:', e));
                        // Update loan reminder state
                        await prisma_1.default.bookLoan.update({
                            where: { id: loan.id },
                            data: {
                                lastReminderDate: now,
                                lastReminderType: reminderType
                            }
                        });
                        sentCount++;
                    }
                }
            }
            catch (loanErr) {
                console.error(`[Library Reminder Job] Error processing loan ${loan.id}:`, loanErr);
                errors.push({ loanId: loan.id, error: String(loanErr) });
            }
        }
        console.log(`[Library Reminder Job] Sweep complete. Sent ${sentCount} reminders.`);
        return { sentCount, errors };
    }
    catch (err) {
        console.error('[Library Reminder Job] Fatal sweep error:', err);
        return { sentCount, errors: [err] };
    }
}
/**
 * Background runner that triggers every morning at 8:00 AM
 */
class LibraryReminderWorker {
    constructor() {
        this.isRunning = false;
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('[Library Reminder Worker] Initialized 8am scheduler.');
        // Check every 60 seconds if it's 8:00 AM
        let lastRunDay = -1;
        this.timer = setInterval(async () => {
            const now = new Date();
            if (now.getHours() === 8 && now.getMinutes() === 0 && now.getDate() !== lastRunDay) {
                lastRunDay = now.getDate();
                await runLibraryReminders().catch(console.error);
            }
        }, 60000);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.isRunning = false;
        console.log('[Library Reminder Worker] Stopped.');
    }
}
exports.LibraryReminderWorker = LibraryReminderWorker;
exports.libraryReminderWorker = new LibraryReminderWorker();
//# sourceMappingURL=library-reminder-job.js.map