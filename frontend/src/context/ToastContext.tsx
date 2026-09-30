import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import '../styles/toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItemData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  toastConfirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// Global helpers so notifications and confirmations can be called from outside React components
export let globalToastConfirm: (message: string) => Promise<boolean> = () => Promise.resolve(false);
export let globalShowToast: (message: string, type?: ToastType) => void = (msg, type) => {
  if (typeof window !== 'undefined' && (window as any).__acadexShowToast) {
    (window as any).__acadexShowToast(msg, type);
  } else {
    console.log(`[Toast ${type || 'info'}]: ${msg}`);
  }
};

/**
 * Standardized global toast object compatible with both useToast() callers
 * and direct toast.success / toast.error callers (replacing react-hot-toast).
 */
export interface ToastCallable {
  (msg: string): void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
  loading: (msg: string) => string;
  dismiss: (id?: string) => void;
}

const baseToast = ((msg: string) => globalShowToast(msg, 'info')) as ToastCallable;
baseToast.success = (msg: string) => globalShowToast(msg, 'success');
baseToast.error = (msg: string) => globalShowToast(msg, 'error');
baseToast.warning = (msg: string) => globalShowToast(msg, 'warning');
baseToast.info = (msg: string) => globalShowToast(msg, 'info');
baseToast.loading = (msg: string) => {
  globalShowToast(msg, 'info');
  return 'toast-loading';
};
baseToast.dismiss = (_id?: string) => {
  // If specific dismiss or clear requested
};

export const toast = baseToast;
export default toast;

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_TOAST_DURATION = 10000; // 10 seconds auto-dismiss
const RESUME_MIN_GRACE = 5000; // Pause & resume with at least 5 seconds remaining

/**
 * Individual Toast Component with internal 10s countdown,
 * hover/focus pause, and manual dismiss.
 */
const ToastItem: React.FC<{
  toast: ToastItemData;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const totalDuration = toast.duration || DEFAULT_TOAST_DURATION;
  const [remaining, setRemaining] = useState(totalDuration);
  const [isPaused, setIsPaused] = useState(false);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (isPaused) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setRemaining((prev) => {
        const next = prev - elapsed;
        if (next <= 0) {
          clearInterval(interval);
          onDismiss(toast.id);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, onDismiss, toast.id]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    // When mouse leaves, resume countdown ensuring at least 5s remaining
    setRemaining((prev) => Math.max(prev, RESUME_MIN_GRACE));
    lastTickRef.current = Date.now();
    setIsPaused(false);
  };

  const handleFocus = () => {
    setIsPaused(true);
  };

  const handleBlur = () => {
    setRemaining((prev) => Math.max(prev, RESUME_MIN_GRACE));
    lastTickRef.current = Date.now();
    setIsPaused(false);
  };

  const progressPercent = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));

  const isAlert = toast.type === 'error' || toast.type === 'warning';

  return (
    <div
      className={`toast ${toast.type}`}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
    >
      <div className="toast-content">
        <i
          className={`fas toast-icon ${
            toast.type === 'success'
              ? 'fa-check-circle'
              : toast.type === 'error'
              ? 'fa-exclamation-circle'
              : toast.type === 'warning'
              ? 'fa-exclamation-triangle'
              : 'fa-info-circle'
          }`}
          aria-hidden="true"
        />
        <div className="toast-body">
          <div className="toast-message">{toast.message}</div>
          {isPaused && (
            <div className="toast-pause-indicator">
              <i className="fas fa-pause text-xs" style={{ fontSize: '0.65rem' }} /> Paused (will resume on leave)
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        title="Dismiss notification"
      >
        &times;
      </button>

      {/* Visual 10-second countdown indicator */}
      <div
        className="toast-progress"
        style={{ width: `${progressPercent}%` }}
        aria-hidden="true"
      />
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToasts, setActiveToasts] = useState<ToastItemData[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastItemData[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  const toastConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ message, resolve });
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setActiveToasts((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      // Promote from queue if available
      setToastQueue((q) => {
        if (q.length > 0 && remaining.length < MAX_VISIBLE_TOASTS) {
          const [next, ...rest] = q;
          setActiveToasts((curr) => [...curr, next]);
          return rest;
        }
        return q;
      });
      return remaining;
    });
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItemData = {
      id,
      message,
      type,
      duration: DEFAULT_TOAST_DURATION,
    };

    setActiveToasts((prev) => {
      if (prev.length < MAX_VISIBLE_TOASTS) {
        return [...prev, newToast];
      } else {
        setToastQueue((q) => [...q, newToast]);
        return prev;
      }
    });

    // Optional user preferences integration
    try {
      const localPrefs = localStorage.getItem('personal_prefs');
      const prefs = localPrefs ? JSON.parse(localPrefs) : { emailAlerts: true, browserNotifications: true };

      if (prefs.browserNotifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Acadex Notification', { body: message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('Acadex Notification', { body: message });
            }
          });
        }
      }
    } catch {
      // Ignore background notification exceptions
    }
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    globalToastConfirm = toastConfirm;
    (window as any).__acadexShowToast = showToast;
    (window as any).showToast = showToast;
    (window as any).toast = toast;
    (window as any).toastConfirm = toastConfirm;

    // Check for any flash toast across page reloads (e.g. session timeout)
    try {
      const flash = sessionStorage.getItem('acadex_flash_toast');
      if (flash) {
        sessionStorage.removeItem('acadex_flash_toast');
        const parsed = JSON.parse(flash);
        showToast(parsed.message, parsed.type || 'info');
      }
    } catch {
      // Ignore
    }
  }, [showToast, toastConfirm]);

  useEffect(() => {
    const handleNetworkError = () => {
      showToast('Network error: You appear to be offline or the server is unreachable.', 'error');
    };
    window.addEventListener('acadex-network-error', handleNetworkError);
    return () => window.removeEventListener('acadex-network-error', handleNetworkError);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toastConfirm }}>
      {children}

      {/* Top-Right Stacking Toast Container */}
      <div className="toast-container" aria-live="polite" aria-relevant="additions text">
        {activeToasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={removeToast} />
        ))}
      </div>

      {/* Preserved Confirmation Modal for user decisions */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-action-title"
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3
              id="confirm-action-title"
              style={{ marginTop: 0, marginBottom: '16px', color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}
            >
              Confirm Action
            </h3>
            <p style={{ color: '#475569', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(false);
                  setConfirmDialog(null);
                }}
                style={{
                  padding: '8px 18px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(true);
                  setConfirmDialog(null);
                }}
                style={{
                  padding: '8px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
