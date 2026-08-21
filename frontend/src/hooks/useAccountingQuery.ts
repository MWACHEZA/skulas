/**
 * useAccountingQuery — Centralized Reactive Accounting Query Engine.
 *
 * Rules:
 *  1. Single source of truth: all components reading financial data use this hook.
 *  2. Central cache invalidation: key-based invalidations refresh all subscribed components.
 *  3. Cross-tab sync: BroadcastChannel notifies other browser tabs to invalidate keys instantly.
 *  4. Optimistic mutations with automatic rollback on error.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Global Cache Store & Subscribers
// ─────────────────────────────────────────────────────────────────────────────

type CacheKey = string;
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  fetching: boolean;
}

const globalCache = new Map<CacheKey, CacheEntry<any>>();
const listeners = new Map<CacheKey, Set<() => void>>();

// Cross-tab synchronization channel
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('skulas_accounting_sync') : null;

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === 'INVALIDATE_KEY') {
      invalidateCacheKey(event.data.key, false); // false = don't re-broadcast
    }
  };
}

function notifySubscribers(key: CacheKey) {
  const subs = listeners.get(key);
  if (subs) {
    subs.forEach(fn => fn());
  }
}

/**
 * Invalidate a cache key and trigger subscribers to refetch
 */
export function invalidateCacheKey(key: CacheKey, broadcast: boolean = true) {
  globalCache.delete(key);
  notifySubscribers(key);

  if (broadcast && syncChannel) {
    try {
      syncChannel.postMessage({ type: 'INVALIDATE_KEY', key });
    } catch (e) {
      // Ignore broadcast errors
    }
  }
}

/**
 * Invalidate all accounting-related cache keys
 */
export function invalidateAllAccountingKeys() {
  for (const key of globalCache.keys()) {
    if (key.startsWith('accounting:') || key.startsWith('fees:') || key.startsWith('uniforms:') || key.startsWith('wallets:')) {
      globalCache.delete(key);
      notifySubscribers(key);
    }
  }
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'INVALIDATE_KEY', key: 'accounting:*' });
    } catch (e) {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Query Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  staleTimeMs?: number;
  enabled?: boolean;
}

export function useAccountingQuery<T>({ key, fetcher, staleTimeMs = 15000, enabled = true }: QueryOptions<T>) {
  const [, setTick] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const entry = globalCache.get(key) as CacheEntry<T> | undefined;

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    const existing = globalCache.get(key);
    const now = Date.now();

    // Return cached value if still fresh and not forced
    if (!force && existing && (now - existing.timestamp < staleTimeMs)) {
      return;
    }

    if (existing?.fetching) return;

    globalCache.set(key, {
      data: existing?.data,
      timestamp: existing?.timestamp ?? 0,
      fetching: true
    });

    notifySubscribers(key);

    try {
      const data = await fetcher();
      if (isMounted.current) {
        globalCache.set(key, {
          data,
          timestamp: Date.now(),
          fetching: false
        });
        notifySubscribers(key);
      }
    } catch (error) {
      if (isMounted.current) {
        globalCache.set(key, {
          data: existing?.data,
          timestamp: existing?.timestamp ?? 0,
          fetching: false
        });
        notifySubscribers(key);
      }
      throw error;
    }
  }, [key, fetcher, staleTimeMs, enabled]);

  // Subscribe to key changes
  useEffect(() => {
    if (!enabled) return;

    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    const subFn = () => {
      if (isMounted.current) setTick(t => t + 1);
    };
    listeners.get(key)!.add(subFn);

    // Initial fetch if missing or stale
    fetchData();

    return () => {
      const subs = listeners.get(key);
      if (subs) {
        subs.delete(subFn);
        if (subs.size === 0) listeners.delete(key);
      }
    };
  }, [key, fetchData, enabled]);

  return {
    data: entry?.data as T | undefined,
    isLoading: !entry?.data && entry?.fetching,
    isFetching: entry?.fetching ?? false,
    refetch: () => fetchData(true)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimistic Mutation Helper
// ─────────────────────────────────────────────────────────────────────────────

export interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  affectedKeys: string[];
  optimisticUpdate?: (variables: TVariables) => void;
  onSuccess?: (data: TData) => void;
  onError?: (error: any) => void;
}

export function useOptimisticAccountingMutation<TData, TVariables>({
  mutationFn,
  affectedKeys,
  optimisticUpdate,
  onSuccess,
  onError
}: OptimisticMutationOptions<TData, TVariables>) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (variables: TVariables) => {
    setIsPending(true);

    // Backup current cache snapshots for rollback
    const snapshots = new Map<string, CacheEntry<any>>();
    for (const key of affectedKeys) {
      if (globalCache.has(key)) {
        snapshots.set(key, { ...globalCache.get(key)! });
      }
    }

    // Apply optimistic update
    if (optimisticUpdate) {
      try {
        optimisticUpdate(variables);
        for (const key of affectedKeys) {
          notifySubscribers(key);
        }
      } catch (e) {
        console.error('[Optimistic UI] Failed to apply update:', e);
      }
    }

    try {
      const result = await mutationFn(variables);

      // Invalidate affected keys to get authoritative backend numbers
      for (const key of affectedKeys) {
        invalidateCacheKey(key, true);
      }

      setIsPending(false);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (error: any) {
      // ROLLBACK: Restore original snapshot on failure
      for (const [key, snap] of snapshots.entries()) {
        globalCache.set(key, snap);
        notifySubscribers(key);
      }

      setIsPending(false);
      const errMsg = error.response?.data?.error || error.message || 'Transaction failed. Rolling back changes.';
      toast.error(`Transaction Failed: ${errMsg}`);

      // Invalidate to refetch fresh server truth
      for (const key of affectedKeys) {
        invalidateCacheKey(key, false);
      }

      if (onError) onError(error);
      throw error;
    }
  };

  return { mutate, isPending };
}
