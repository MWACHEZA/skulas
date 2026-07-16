import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface LinkedEntity {
  id: string; // studentId or schoolCode
  name: string; // studentName or schoolName
  schoolCode: string;
  schoolName: string;
  schoolLogo?: string;
  roleSpecificId?: string; // vendorId for suppliers
  status: 'PENDING' | 'APPROVED';
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  secondaryRoles?: string[];
  phone?: string;
  avatar?: string;
  staffId?: string;
  schoolId?: string;
  school?: any;
  schoolName?: string;
  schoolCode?: string;
  schoolBranding?: {
    primaryColor?: string;
    accentColor?: string;
    logo?: string;
  };
  schoolPlan?: string;   // e.g. 'Starter' | 'Professional' | 'Enterprise'
  schoolType?: string;   // e.g. 'Primary', 'Secondary', 'Nursing School'
  linkedEntities?: LinkedEntity[];
  createdAt?: string;
  departmentId?: string;
  dept?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    subjects?: {
      subjectId: string;
      subject?: any;
    }[];
  };
  student?: {
    id: string;
    studentId: string;
    houseId?: string | null;
    classId?: string | null;
    class?: {
      id: string;
      name: string;
    } | null;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  activeEntity: LinkedEntity | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setActiveEntity: (entity: LinkedEntity | null) => void;
  updateLinkedEntities: (entities: LinkedEntity[]) => void;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('acadex_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('acadex_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeEntity, setActiveEntityState] = useState<LinkedEntity | null>(() => {
    const stored = localStorage.getItem('acadex_active_entity');
    return stored ? JSON.parse(stored) : null;
  });

  // Apply school branding globally
  useEffect(() => {
    if (user?.schoolBranding) {
      const { primaryColor, accentColor } = user.schoolBranding;
      if (primaryColor) document.documentElement.style.setProperty('--school-primary', primaryColor);
      if (accentColor) document.documentElement.style.setProperty('--school-accent', accentColor);
    } else {
      // Reset to defaults if no branding
      document.documentElement.style.setProperty('--school-primary', '#0056b3');
      document.documentElement.style.setProperty('--school-accent', '#2563eb');
    }
  }, [user]);

  // Session Inactivity Idle Timeout Listener (Applies to all users/portals)
  useEffect(() => {
    if (!user || !token) return;

    let idleTimeLimit = 0;       // seconds
    let warningTime = 0;         // seconds

    let idleTimer: any;
    let warningTimer: any;
    let warningModal: HTMLDivElement | null = null;

    const fetchIdleSettings = async () => {
      try {
        const { default: api } = await import('../lib/api');
        const res = await api.get('/api/schools/settings');
        if (res.data) {
          idleTimeLimit = parseInt(res.data.idleTime) || 0;
          warningTime = parseInt(res.data.idleTimeCountdown) || 0;
          startTimers();
        }
      } catch (err) {
        console.error('Failed to fetch idle timeout settings', err);
      }
    };

    const showWarningModal = (countdown: number) => {
      if (warningModal) return;

      warningModal = document.createElement('div');
      warningModal.style.position = 'fixed';
      warningModal.style.inset = '0';
      warningModal.style.background = 'rgba(15, 23, 42, 0.7)';
      warningModal.style.backdropFilter = 'blur(12px)';
      warningModal.style.zIndex = '999999';
      warningModal.style.display = 'flex';
      warningModal.style.alignItems = 'center';
      warningModal.style.justifyContent = 'center';
      warningModal.style.padding = '20px';

      const card = document.createElement('div');
      card.style.background = 'white';
      card.style.borderRadius = '24px';
      card.style.padding = '40px';
      card.style.maxWidth = '420px';
      card.style.width = '100%';
      card.style.textAlign = 'center';
      card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)';
      card.style.fontFamily = 'Inter, system-ui, sans-serif';

      const iconContainer = document.createElement('div');
      iconContainer.style.width = '64px';
      iconContainer.style.height = '64px';
      iconContainer.style.borderRadius = '50%';
      iconContainer.style.background = '#fef2f2';
      iconContainer.style.color = '#ef4444';
      iconContainer.style.display = 'flex';
      iconContainer.style.alignItems = 'center';
      iconContainer.style.justifyContent = 'center';
      iconContainer.style.fontSize = '28px';
      iconContainer.style.margin = '0 auto 24px';
      iconContainer.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';

      const title = document.createElement('h3');
      title.innerText = 'Session Expiry Warning';
      title.style.margin = '0 0 8px 0';
      title.style.fontSize = '1.3rem';
      title.style.fontWeight = '800';
      title.style.color = '#0f172a';

      const msg = document.createElement('p');
      msg.id = 'idle-warning-msg';
      msg.innerText = `You have been inactive for a while. You will be automatically logged out in ${countdown} seconds.`;
      msg.style.margin = '0 0 32px 0';
      msg.style.fontSize = '0.95rem';
      msg.style.color = '#64748b';
      msg.style.lineHeight = '1.6';

      const btn = document.createElement('button');
      btn.innerText = 'Keep Session Active';
      btn.style.background = 'var(--school-primary, #0056b3)';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '12px';
      btn.style.padding = '14px 28px';
      btn.style.fontWeight = '700';
      btn.style.fontSize = '0.95rem';
      btn.style.cursor = 'pointer';
      btn.style.width = '100%';
      btn.style.transition = 'opacity 0.2s';
      btn.onmouseenter = () => btn.style.opacity = '0.9';
      btn.onmouseleave = () => btn.style.opacity = '1';
      btn.onclick = () => {
        resetTimers();
        if (warningModal && document.body.contains(warningModal)) {
          document.body.removeChild(warningModal);
          warningModal = null;
        }
      };

      card.appendChild(iconContainer);
      card.appendChild(title);
      card.appendChild(msg);
      card.appendChild(btn);
      warningModal.appendChild(card);
      document.body.appendChild(warningModal);
    };

    const handleTimeout = () => {
      if (warningModal && document.body.contains(warningModal)) {
        document.body.removeChild(warningModal);
        warningModal = null;
      }
      logout();
      alert('Your session has timed out due to inactivity.');
      window.location.reload();
    };

    const startTimers = () => {
      if (idleTimeLimit <= 0) return;

      const timeBeforeWarning = Math.max(0, idleTimeLimit - warningTime);

      idleTimer = setTimeout(() => {
        let remaining = warningTime;
        if (remaining > 0) {
          showWarningModal(remaining);
          warningTimer = setInterval(() => {
            remaining--;
            const msgEl = document.getElementById('idle-warning-msg');
            if (msgEl) {
              msgEl.innerText = `You have been inactive for a while. You will be automatically logged out in ${remaining} seconds.`;
            }
            if (remaining <= 0) {
              clearInterval(warningTimer);
              handleTimeout();
            }
          }, 1000);
        } else {
          handleTimeout();
        }
      }, timeBeforeWarning * 1000);
    };

    const resetTimers = () => {
      clearTimeout(idleTimer);
      clearInterval(warningTimer);
      startTimers();
    };

    fetchIdleSettings();

    // User activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const debouncedReset = () => {
      resetTimers();
    };
    events.forEach(e => document.addEventListener(e, debouncedReset));

    // Storage event listener for multi-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acadex_token' && e.newValue === null) {
        // Logged out in another tab
        setToken(null);
        setUser(null);
        setActiveEntityState(null);
        window.location.reload();
      }
      if (e.key === 'acadex_active_entity' && e.newValue) {
        // Active entity changed in another tab
        setActiveEntityState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(idleTimer);
      clearInterval(warningTimer);
      events.forEach(e => document.removeEventListener(e, debouncedReset));
      window.removeEventListener('storage', handleStorageChange);
      if (warningModal && document.body.contains(warningModal)) {
        document.body.removeChild(warningModal);
        warningModal = null;
      }
    };
  }, [user, token]);

  const setActiveEntity = (entity: LinkedEntity | null) => {
    if (entity) {
      localStorage.setItem('acadex_active_entity', JSON.stringify(entity));
    } else {
      localStorage.removeItem('acadex_active_entity');
    }
    setActiveEntityState(entity);
  };

  const updateLinkedEntities = (entities: LinkedEntity[]) => {
    if (!user) return;
    const updatedUser = { ...user, linkedEntities: entities };
    setUser(updatedUser);
    localStorage.setItem('acadex_user', JSON.stringify(updatedUser));
    
    // If we just added the first entity, set it as active
    if (entities.length > 0 && !activeEntity) {
      setActiveEntity(entities[0]);
    }
  };

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('acadex_token', newToken);
    localStorage.setItem('acadex_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    
    // Auto-set the first linked entity as active if available
    if (newUser.linkedEntities && newUser.linkedEntities.length > 0) {
      setActiveEntity(newUser.linkedEntities[0]);
    } else {
      setActiveEntityState(null);
      localStorage.removeItem('acadex_active_entity');
    }
  };

  const logout = async () => {
    if (token) {
      try {
        const { default: api } = await import('../lib/api');
        await api.post('/api/auth/logout');
      } catch (err) {
        console.error('Failed to notify server of logout', err);
      }
    }
    localStorage.removeItem('acadex_token');
    localStorage.removeItem('acadex_user');
    localStorage.removeItem('acadex_active_entity');
    setToken(null);
    setUser(null);
    setActiveEntityState(null);
  };

  const hasRole = (...roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { default: api } = await import('../lib/api');
      const { data } = await api.get('/api/users/me');
      if (data) {
        // Map nested school fields to top-level AuthUser fields
        const enriched: AuthUser = {
          ...data,
          schoolName:     data.school?.name     || data.schoolName,
          schoolCode:     data.school?.code     || data.schoolCode,
          schoolBranding: data.school?.branding || data.schoolBranding,
          schoolPlan:     data.schoolPlan       || data.school?.plan?.name || null,
          schoolType:     data.school?.type       || data.schoolType || 'Secondary',
        };
        setUser(enriched);
        localStorage.setItem('acadex_user', JSON.stringify(enriched));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      activeEntity,
      login, 
      logout, 
      setActiveEntity,
      updateLinkedEntities,
      isAuthenticated: !!token && !!user, 
      hasRole,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
