import { Response } from 'express';
export interface LedgerEventPayload {
    type: 'LEDGER_POSTED' | 'LEDGER_REVERSED' | 'STOCK_CHANGED' | 'WALLET_UPDATED' | 'PAYMENT_RECEIVED' | 'PERIOD_CLOSED';
    schoolId: string;
    sourceType?: string;
    sourceId?: string;
    affectedAccounts?: string[];
    studentId?: string;
    itemId?: string;
    timestamp: string;
}
declare class LedgerEventBroadcaster {
    private subscribers;
    /**
     * Register a new client SSE connection for a tenant
     */
    subscribe(id: string, schoolId: string, role: string, res: Response): void;
    /**
     * Remove subscriber on disconnect
     */
    unsubscribe(schoolId: string, id: string): void;
    /**
     * Broadcast an event to all subscribers of a specific tenant
     */
    broadcast(event: LedgerEventPayload): void;
    /**
     * Send heartbeat to keep connections alive
     */
    pingAll(): void;
}
export declare const LedgerEvents: LedgerEventBroadcaster;
export {};
