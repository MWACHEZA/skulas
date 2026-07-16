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
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

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
    <ToastContext.Provider value={{ showToast }}>
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
    </ToastContext.Provider>
  );
};
