export declare class NotificationService {
    /**
     * Enqueue a notification to be sent by the worker.
     */
    static enqueue(data: {
        type: 'WhatsApp' | 'Email' | 'SMS';
        schoolId: string;
        senderId: string;
        studentId?: string;
        recipientPhone?: string;
        recipientEmail?: string;
        template?: string;
        payload: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        status: string;
        schoolId: string;
        studentId: string | null;
        senderId: string;
        retries: number;
        errorDetails: string | null;
        recipientPhone: string | null;
        recipientEmail: string | null;
        template: string | null;
        payload: string;
        nextAttempt: Date;
    }>;
    /**
     * Directly insert into CommunicationLog
     */
    static logCommunication(data: {
        schoolId: string;
        senderId: string;
        studentId?: string;
        type: string;
        description: string;
        status: string;
        providerMsgId?: string;
        errorDetails?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        status: string;
        schoolId: string;
        description: string;
        studentId: string | null;
        senderId: string;
        providerMsgId: string | null;
        errorDetails: string | null;
    }>;
}
