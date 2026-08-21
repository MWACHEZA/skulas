/**
 * useLedgerSSE — Real-Time Tenant Accounting Event Stream Hook.
 *
 * Connects to /api/accounts/events/stream using EventSource.
 * Automatically invalidates relevant query keys when ledger entries or stock movements post.
 * Degrades gracefully if offline with automatic reconnection.
 */

import { useEffect, useRef, useState } from 'react';
import { BASE_URL } from '../lib/api';
import { invalidateAllAccountingKeys, invalidateCacheKey } from './useAccountingQuery';

export function useLedgerSSE() {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('acadex_token');
    if (!token) return;

    // Pass JWT token in query param for EventSource stream request
    const url = `${BASE_URL}/api/accounts/events/stream?token=${encodeURIComponent(token)}`;

    let es: EventSource | null = null;

    try {
      es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'PING' || payload.type === 'CONNECTED') {
            return;
          }

          // Trigger reactive cache invalidation based on event payload
          if (payload.type === 'LEDGER_POSTED' || payload.type === 'LEDGER_REVERSED') {
            invalidateAllAccountingKeys();
          } else if (payload.type === 'STOCK_CHANGED') {
            invalidateCacheKey('uniforms:items');
            invalidateCacheKey('uniforms:sales');
            invalidateCacheKey('uniforms:orders');
            invalidateCacheKey('accounting:reports:income-statement');
          } else if (payload.type === 'WALLET_UPDATED') {
            if (payload.studentId) {
              invalidateCacheKey(`wallets:${payload.studentId}`);
            }
            invalidateCacheKey('fees:invoices');
            invalidateCacheKey('accounting:reports:trial-balance');
          }
        } catch (err) {
          console.error('[SSE] Failed to parse message event:', err);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        // EventSource will automatically attempt reconnection
      };
    } catch (err) {
      console.error('[SSE] Connection error:', err);
      setIsConnected(false);
    }

    return () => {
      if (es) {
        es.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return { isConnected };
}
