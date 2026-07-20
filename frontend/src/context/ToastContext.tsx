import React, { createContext, useContext, useState, useCallback } from 'react';
import '../styles/toast.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  toastConfirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// We will also export a global helper so it can be used outside React components or easily imported without hooks
export let globalToastConfirm: (message: string) => Promise<boolean> = () => Promise.resolve(false);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  const toastConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ message, resolve });
    });
  }, []);

  React.useEffect(() => {
    globalToastConfirm = toastConfirm;
    (window as any).toastConfirm = toastConfirm;
  }, [toastConfirm]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Integrate user preferences for Browser and Email notifications
    try {
      const localPrefs = localStorage.getItem('personal_prefs');
      const prefs = localPrefs ? JSON.parse(localPrefs) : { emailAlerts: true, browserNotifications: true };

      // 1. Browser Notifications
      if (prefs.browserNotifications) {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('School Notification', { body: message });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('School Notification', { body: message });
              }
            });
          }
        }
      }

      // 2. Simulated Email Notifications
      if (prefs.emailAlerts) {
        const userStr = localStorage.getItem('acadex_user') || localStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u && u.email) {
            console.log(`[Email Notification Sent to ${u.email}]: ${message}`);
          }
        }
      }
    } catch (e) {
      console.error('Failed to dispatch personal notifications preferences', e);
    }

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    const handleNetworkError = () => {
      showToast('Network error: You appear to be offline or the server is unreachable.', 'error');
    };
    window.addEventListener('acadex-network-error', handleNetworkError);
    return () => window.removeEventListener('acadex-network-error', handleNetworkError);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toastConfirm }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-content">
              <i className={`fas toast-icon ${
                toast.type === 'success' ? 'fa-check-circle' :
                toast.type === 'error' ? 'fa-exclamation-circle' :
                toast.type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
              }`}></i>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>&times;</button>
          </div>
        ))}
      </div>
      
      {/* Global Confirm Dialog Modal */}
      {confirmDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '12px',
            maxWidth: '400px', width: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e293b', fontSize: '1.2rem', fontWeight: 600 }}>Confirm Action</h3>
            <p style={{ color: '#475569', marginBottom: '24px' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
                style={{
                  padding: '8px 16px', background: '#f1f5f9', color: '#475569',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}
                style={{
                  padding: '8px 16px', background: '#2563eb', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
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
