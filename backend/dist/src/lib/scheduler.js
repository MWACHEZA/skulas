"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Background Scheduler for automated system maintenance
 */
async function initScheduler() {
    console.log('⏰ Initializing Background Scheduler...');
    // Run immediately on boot
    await runMaintenanceTasks();
    // Schedule to run every 24 hours
    setInterval(async () => {
        await runMaintenanceTasks();
    }, 24 * 60 * 60 * 1000);
}
async function runMaintenanceTasks() {
    const now = new Date();
    try {
        console.log(`[Scheduler] Starting maintenance at ${now.toISOString()}`);
        // 1. Expire Transfer Authorizations
        const expiredTransfers = await prisma_1.default.transferAuthorization.updateMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: now }
            },
            data: { status: 'EXPIRED' }
        });
        if (expiredTransfers.count > 0) {
            console.log(`[Scheduler] Marked ${expiredTransfers.count} transfer requests as EXPIRED.`);
        }
        // 2. Add other cleanup tasks here (e.g. temporary file cleanup)
    }
    catch (error) {
        console.error('[Scheduler] Maintenance task failed:', error);
    }
}
//# sourceMappingURL=scheduler.js.map