"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerEvents = void 0;
class LedgerEventBroadcaster {
    constructor() {
        this.subscribers = new Map();
    }
    /**
     * Register a new client SSE connection for a tenant
     */
    subscribe(id, schoolId, role, res) {
        if (!this.subscribers.has(schoolId)) {
            this.subscribers.set(schoolId, []);
        }
        const tenantSubscribers = this.subscribers.get(schoolId);
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
    unsubscribe(schoolId, id) {
        const list = this.subscribers.get(schoolId);
        if (!list)
            return;
        const filtered = list.filter(sub => sub.id !== id);
        if (filtered.length === 0) {
            this.subscribers.delete(schoolId);
        }
        else {
            this.subscribers.set(schoolId, filtered);
        }
    }
    /**
     * Broadcast an event to all subscribers of a specific tenant
     */
    broadcast(event) {
        const list = this.subscribers.get(event.schoolId);
        if (!list || list.length === 0)
            return;
        const data = `data: ${JSON.stringify(event)}\n\n`;
        for (const sub of list) {
            try {
                sub.res.write(data);
            }
            catch (err) {
                console.error(`[SSE] Failed to write event to sub ${sub.id}:`, err);
                this.unsubscribe(event.schoolId, sub.id);
            }
        }
    }
    /**
     * Send heartbeat to keep connections alive
     */
    pingAll() {
        const data = `data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`;
        for (const [, list] of this.subscribers.entries()) {
            for (const sub of list) {
                try {
                    sub.res.write(data);
                }
                catch (err) {
                    this.unsubscribe(sub.schoolId, sub.id);
                }
            }
        }
    }
}
exports.LedgerEvents = new LedgerEventBroadcaster();
// Heartbeat every 25 seconds to prevent proxy / load-balancer timeouts
setInterval(() => {
    exports.LedgerEvents.pingAll();
}, 25000);
//# sourceMappingURL=ledger-events.js.map