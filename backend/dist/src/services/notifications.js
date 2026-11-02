"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class NotificationService {
    /**
     * Enqueue a notification to be sent by the worker.
     */
    static async enqueue(data) {
        // If phone or email is missing, we could try to fetch it if studentId is provided.
        // For now, assume callers resolve recipients or worker resolves them.
        return prisma_1.default.notificationQueue.create({
            data: {
                type: data.type,
                schoolId: data.schoolId,
                senderId: data.senderId,
                studentId: data.studentId,
                recipientPhone: data.recipientPhone,
                recipientEmail: data.recipientEmail,
                template: data.template,
                payload: JSON.stringify(data.payload),
                status: 'PENDING',
                retries: 0,
                nextAttempt: new Date()
            }
        });
    }
    /**
     * Helper to send SMS directly or enqueue.
     */
    static async sendSms(recipientPhone, message, schoolId = 'system', senderId = 'system') {
        return this.enqueue({
            type: 'SMS',
            schoolId,
            senderId,
            recipientPhone,
            payload: { message }
        }).catch(() => null);
    }
    /**
     * Directly insert into CommunicationLog
     */
    static async logCommunication(data) {
        try {
            // Ensure senderId points to an existing User to prevent foreign key constraint violations
            let resolvedSenderId = data.senderId;
            const userExists = resolvedSenderId && resolvedSenderId !== 'system'
                ? await prisma_1.default.user.findUnique({ where: { id: resolvedSenderId }, select: { id: true } })
                : null;
            if (!userExists) {
                // Find an admin or staff member in this school as fallback
                const fallbackUser = await prisma_1.default.user.findFirst({
                    where: { ...(data.schoolId && data.schoolId !== 'system' ? { schoolId: data.schoolId } : {}) },
                    select: { id: true }
                });
                if (fallbackUser) {
                    resolvedSenderId = fallbackUser.id;
                }
                else {
                    console.warn(`[NotificationService] Skipped CommunicationLog: no valid User found for senderId "${data.senderId}".`);
                    return null;
                }
            }
            return await prisma_1.default.communicationLog.create({
                data: {
                    ...data,
                    senderId: resolvedSenderId
                }
            });
        }
        catch (err) {
            console.warn('[NotificationService] Failed to create CommunicationLog entry:', err.message);
            return null;
        }
    }
}
exports.NotificationService = NotificationService;
