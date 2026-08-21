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

interface Subscriber {
  id: string;
  schoolId: string;
  role: string;
  res: Response;
}

class LedgerEventBroadcaster {
  private subscribers: Map<string, Subscriber[]> = new Map();

  /**
   * Register a new client SSE connection for a tenant
   */
  subscribe(id: string, schoolId: string, role: string, res: Response): void {
    if (!this.subscribers.has(schoolId)) {
      this.subscribers.set(schoolId, []);
    }

    const tenantSubscribers = this.subscribers.get(schoolId)!;
    tenantSubscribers.push({ id, schoolId, role, res });

    // Send initial connection confirmation event
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', schoolId, timestamp: new Date().toISOString() })}\n\n`);

    // Handle client disconnect
    res.on('close', () => {
      this.unsubscribe(schoolId, id);
    });
  }

  /**
   * Remove subscriber on disconnect
   */
  unsubscribe(schoolId: string, id: string): void {
    const list = this.subscribers.get(schoolId);
    if (!list) return;
    const filtered = list.filter(sub => sub.id !== id);
    if (filtered.length === 0) {
      this.subscribers.delete(schoolId);
    } else {
      this.subscribers.set(schoolId, filtered);
    }
  }

  /**
   * Broadcast an event to all subscribers of a specific tenant
   */
  broadcast(event: LedgerEventPayload): void {
    const list = this.subscribers.get(event.schoolId);
    if (!list || list.length === 0) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;

    for (const sub of list) {
      try {
        sub.res.write(data);
      } catch (err) {
        console.error(`[SSE] Failed to write event to sub ${sub.id}:`, err);
        this.unsubscribe(event.schoolId, sub.id);
      }
    }
  }

  /**
   * Send heartbeat to keep connections alive
   */
  pingAll(): void {
    const data = `data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`;
    for (const [, list] of this.subscribers.entries()) {
      for (const sub of list) {
        try {
          sub.res.write(data);
        } catch (err) {
          this.unsubscribe(sub.schoolId, sub.id);
        }
      }
    }
  }
}

export const LedgerEvents = new LedgerEventBroadcaster();

// Heartbeat every 25 seconds to prevent proxy / load-balancer timeouts
setInterval(() => {
  LedgerEvents.pingAll();
}, 25000);
