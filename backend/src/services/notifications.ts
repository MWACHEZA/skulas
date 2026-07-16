import prisma from '../lib/prisma';

export class NotificationService {
  /**
   * Enqueue a notification to be sent by the worker.
   */
  static async enqueue(data: {
    type: 'WhatsApp' | 'Email' | 'SMS';
    schoolId: string;
    senderId: string;
    studentId?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    template?: string;
    payload: any;
  }) {
    // If phone or email is missing, we could try to fetch it if studentId is provided.
    // For now, assume callers resolve recipients or worker resolves them.
    return prisma.notificationQueue.create({
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
  static async logCommunication(data: {
    schoolId: string;
    senderId: string;
    studentId?: string;
    type: string;
    description: string;
    status: string;
    providerMsgId?: string;
    errorDetails?: string;
  }) {
    return prisma.communicationLog.create({
      data
    });
  }
}
