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
     * Directly insert into CommunicationLog
     */
    static async logCommunication(data) {
        return prisma_1.default.communicationLog.create({
            data
        });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notifications.js.map