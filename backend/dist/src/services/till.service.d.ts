export interface OpenTillInput {
    schoolId: string;
    deviceId: string;
    userId: string;
    openingFloat: number;
    tillAccountCode?: string;
    ipAddress?: string;
}
export interface CashDenominationInput {
    denomination: number;
    count: number;
}
export interface CloseTillInput {
    schoolId: string;
    tillSessionId: string;
    userId: string;
    denominations: CashDenominationInput[];
    countedPayments: {
        paymentMethod: string;
        countedAmount: number;
    }[];
    notes?: string;
    tillAccountCode?: string;
    ipAddress?: string;
}
export declare class TillService {
    /**
     * Verify that an active till session is open for a device.
     * Throws an error if no till session is open.
     * Server-enforced guard for all sales.
     */
    static requireOpenTill(schoolId: string, deviceId?: string): Promise<{
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        notes: string | null;
        closedAt: Date | null;
        deviceId: string;
        sessionNumber: string;
        openedByUserId: string;
        openedAt: Date;
        closedByUserId: string | null;
        openingFloat: number;
        closingCounted: number | null;
        expectedSales: number | null;
        variance: number | null;
    }>;
    /**
     * Get active open session for a device if exists
     */
    static getOpenSession(schoolId: string, deviceId: string): Promise<({
        payments: {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            schoolId: string;
            variance: number;
            tillSessionId: string;
            expectedAmount: number;
            countedAmount: number;
        }[];
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
        denominations: {
            count: number;
            id: string;
            createdAt: Date;
            schoolId: string;
            currency: string;
            tillSessionId: string;
            denomination: number;
            total: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        notes: string | null;
        closedAt: Date | null;
        deviceId: string;
        sessionNumber: string;
        openedByUserId: string;
        openedAt: Date;
        closedByUserId: string | null;
        openingFloat: number;
        closingCounted: number | null;
        expectedSales: number | null;
        variance: number | null;
    }) | null>;
    /**
     * Open a new till session.
     * - Validates no active session exists for device
     * - Atomically generates session reference via nextDocNo('TILL')
     * - Posts opening float: DR Till Cash (1023) / CR Main Safe (1020)
     */
    static openTill(input: OpenTillInput): Promise<{
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        notes: string | null;
        closedAt: Date | null;
        deviceId: string;
        sessionNumber: string;
        openedByUserId: string;
        openedAt: Date;
        closedByUserId: string | null;
        openingFloat: number;
        closingCounted: number | null;
        expectedSales: number | null;
        variance: number | null;
    }>;
    /**
     * Calculate expected sales for an open till session.
     * Sums fiscal invoices for this device since openedAt, grouped by payment method.
     */
    static calculateExpectedSales(schoolId: string, tillSessionId: string): Promise<{
        sessionNumber: string;
        openedAt: Date;
        openingFloat: number;
        expectedCash: number;
        salesOnlyCash: number;
        salesTotal: number;
        byPaymentMethod: Record<string, number>;
        invoiceCount: number;
    }>;
    /**
     * Close a till session and reconcile cash drawer:
     * - Records denomination breakdown
     * - Records expected vs counted per payment method
     * - Posts variance to GL:
     *   * Surplus: DR Till Cash (1023) / CR Till Cash Surplus (4910)
     *   * Shortage: DR Till Cash Shortage (5910) / CR Till Cash (1023)
     * - Transfers physical cash above float back to safe: DR Main Safe (1020) / CR Till Cash (1023)
     * - Marks status 'CLOSED' or 'VARIANCE_REVIEW'
     */
    static closeTill(input: CloseTillInput): Promise<{
        payments: {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            schoolId: string;
            variance: number;
            tillSessionId: string;
            expectedAmount: number;
            countedAmount: number;
        }[];
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
        denominations: {
            count: number;
            id: string;
            createdAt: Date;
            schoolId: string;
            currency: string;
            tillSessionId: string;
            denomination: number;
            total: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        notes: string | null;
        closedAt: Date | null;
        deviceId: string;
        sessionNumber: string;
        openedByUserId: string;
        openedAt: Date;
        closedByUserId: string | null;
        openingFloat: number;
        closingCounted: number | null;
        expectedSales: number | null;
        variance: number | null;
    }>;
    /**
     * Get till variance report across all sessions
     */
    static getVarianceReport(schoolId: string, limit?: number): Promise<({
        payments: {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            schoolId: string;
            variance: number;
            tillSessionId: string;
            expectedAmount: number;
            countedAmount: number;
        }[];
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        notes: string | null;
        closedAt: Date | null;
        deviceId: string;
        sessionNumber: string;
        openedByUserId: string;
        openedAt: Date;
        closedByUserId: string | null;
        openingFloat: number;
        closingCounted: number | null;
        expectedSales: number | null;
        variance: number | null;
    })[]>;
}
