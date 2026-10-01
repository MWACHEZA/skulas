import type { Prisma } from '../generated/client';
export interface RegisterDeviceInput {
    serialNo: string;
    deviceModel: string;
    location: string;
    apiUrl: string;
    activationKey: string;
    apiToken?: string;
}
export interface FiscalItemInput {
    name: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    taxCode?: 'A' | 'E';
}
export interface FiscaliseSaleInput {
    schoolId: string;
    deviceId?: string;
    grossAmount: number;
    currency?: string;
    paymentMethod: string;
    items: FiscalItemInput[];
    glTransactionId?: string;
    isCreditNote?: boolean;
    originalFiscalId?: string;
    originalFiscalCode?: string;
    tx?: Prisma.TransactionClient;
}
export declare class FiscalService {
    /**
     * Register or update a fiscal device for a tenant.
     * Stores secret credentials in FiscalDeviceSecret, isolated from client queries.
     */
    static registerDevice(schoolId: string, input: RegisterDeviceInput): Promise<{
        id: string;
        schoolId: string;
        serialNo: string;
        deviceModel: string;
        location: string;
        apiUrl: string;
        isActive: boolean;
        createdAt: Date;
    }>;
    /**
     * List fiscal devices for a tenant (without sensitive secrets)
     */
    static listDevices(schoolId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        location: string;
        serialNo: string;
        deviceModel: string;
        apiUrl: string;
    }[]>;
    /**
     * Fiscalise a commercial sale with ZIMRA Virtual Fiscal Device provider.
     * If fiscal provider is offline/unreachable, creates a 'pending' invoice and NEVER drops the sale.
     */
    static fiscaliseSale(input: FiscaliseSaleInput): Promise<{
        isFiscalised: boolean;
        reason: string;
        status?: undefined;
        receiptNo?: undefined;
        fiscalCode?: undefined;
        qrCode?: undefined;
        receiptHash?: undefined;
        vatAmount?: undefined;
        invoiceId?: undefined;
    } | {
        isFiscalised: boolean;
        status: string;
        receiptNo: string;
        fiscalCode: string | null;
        qrCode: string | null;
        receiptHash: string | null;
        vatAmount: number;
        invoiceId: string;
        reason?: undefined;
    }>;
    /**
     * Resend / retry a pending or failed fiscal invoice
     */
    static retryInvoice(schoolId: string, invoiceId: string): Promise<{
        success: boolean;
        message: string;
        invoice?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        invoice: {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            schoolId: string;
            amount: number;
            currency: string;
            payload: Prisma.JsonValue | null;
            deviceId: string;
            glTransactionId: string | null;
            receiptNo: string;
            fiscalCode: string | null;
            fiscalDayNo: number | null;
            qrCode: string | null;
            receiptHash: string | null;
            response: Prisma.JsonValue | null;
            vatAmount: number;
            isCreditNote: boolean;
            originalFiscalId: string | null;
        };
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        invoice?: undefined;
    }>;
    /**
     * Fiscal dashboard overview: today's counts, total sales, pending queue
     */
    static getDashboard(schoolId: string): Promise<{
        todaySales: number;
        todayVat: number;
        todayCount: number;
        pendingQueue: number;
        recentInvoices: ({
            device: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                schoolId: string;
                isActive: boolean;
                location: string;
                serialNo: string;
                deviceModel: string;
                apiUrl: string;
            };
        } & {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            schoolId: string;
            amount: number;
            currency: string;
            payload: Prisma.JsonValue | null;
            deviceId: string;
            glTransactionId: string | null;
            receiptNo: string;
            fiscalCode: string | null;
            fiscalDayNo: number | null;
            qrCode: string | null;
            receiptHash: string | null;
            response: Prisma.JsonValue | null;
            vatAmount: number;
            isCreditNote: boolean;
            originalFiscalId: string | null;
        })[];
    }>;
    /**
     * Daily Z-Report / ZIMRA Audit Summary per device
     */
    static getDailyAuditReport(schoolId: string, deviceId?: string, fromDate?: Date, toDate?: Date): Promise<{
        schoolId: string;
        totalInvoices: number;
        grandTotal: number;
        grandVat: number;
        byPaymentMethod: Record<string, {
            count: number;
            total: number;
            vat: number;
        }>;
        invoices: ({
            device: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                schoolId: string;
                isActive: boolean;
                location: string;
                serialNo: string;
                deviceModel: string;
                apiUrl: string;
            };
        } & {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            schoolId: string;
            amount: number;
            currency: string;
            payload: Prisma.JsonValue | null;
            deviceId: string;
            glTransactionId: string | null;
            receiptNo: string;
            fiscalCode: string | null;
            fiscalDayNo: number | null;
            qrCode: string | null;
            receiptHash: string | null;
            response: Prisma.JsonValue | null;
            vatAmount: number;
            isCreditNote: boolean;
            originalFiscalId: string | null;
        })[];
    }>;
}
