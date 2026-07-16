import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api, { BASE_URL } from '../../lib/api';
import MaintenanceRequestModal from '../shared/MaintenanceRequestModal';
import AdminPortalFooter from './shared/AdminPortalFooter';
import ClockInModal from '../attendance/ClockInModal';
import './portal.css';

export interface NavItem {
  label: string;
  icon: string;
  to: string;
  section?: string; // optional section header above this item
  requiredSecondaryRoles?: string[]; // only visible if user has one of these roles
  subItems?: { label: string; to: string; icon?: string }[];
}

interface DashboardLayoutProps {
  portalName: string;
  portalIcon: string;
  roleBadge: string;
  navItems: NavItem[];
  accentColor?: string;
  className?: string;
  sidebarHeaderExtra?: React.ReactNode;
  branding?: {
    logo?: string;
    schoolName?: string;
  };
}

export default function DashboardLayout({ 
  portalName, 
  portalIcon, 
  roleBadge, 
  navItems, 
  className = '', 
  sidebarHeaderExtra,
  branding
}: DashboardLayoutProps) {
  const { user, activeEntity, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);

  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockActionType, setClockActionType] = useState<'IN' | 'OUT'>('IN');

  const isStaffUser = user && !['STUDENT', 'PARENT', 'SUPPLIER', 'ALUMNI'].includes(user.role);

  const fetchTodayAttendance = async () => {
    if (!isStaffUser) return;
    try {
      const { data } = await api.get('/api/staff-attendance/today');
      setTodayAttendance(data || null);
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, [user]);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Use activeEntity branding if available, otherwise fallback to props
  const displaySchoolName = activeEntity?.schoolName || branding?.schoolName || user?.schoolName || 'Acadex School';
  const displayLogo = activeEntity?.schoolLogo || branding?.logo || user?.schoolBranding?.logo || portalIcon;

  return (
    <div className={`portal-root ${className}`}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`portal-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="portal-sidebar-header">
          <div className="portal-sidebar-logo">
            {displayLogo && (displayLogo.startsWith('fa') || displayLogo.includes(' ')) ? (
              <i className={displayLogo}></i>
            ) : (
              <img 
                src={displayLogo.startsWith('http') ? displayLogo : `${BASE_URL}/api/storage/media/${user?.schoolCode || 'global'}/images/${displayLogo}`} 
                alt="School Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                onError={(e) => {
                  (e.target as any).onerror = null;
                  (e.target as any).style.display = 'none';
                  (e.target as any).parentElement.innerHTML = `<i class="${portalIcon}"></i>`;
                }}
              />
            )}
          </div>
          <div className="portal-sidebar-title">
            <h3>{portalName}</h3>
            <span>{displaySchoolName}</span>
          </div>
        </div>

        {/* Extra sidebar content (e.g. Entity Switcher) */}
        {sidebarHeaderExtra && (
           <div className="portal-sidebar-extra">
              {sidebarHeaderExtra}
           </div>
        )}

        <nav className="portal-sidebar-nav">
          <ul>
            {navItems.map((item, idx) => {
              // 1. Check if item should be visible based on roles
              if (item.requiredSecondaryRoles && item.requiredSecondaryRoles.length > 0) {
                const userRoles = user?.secondaryRoles || [];
                const hasAccess = item.requiredSecondaryRoles.some(role => userRoles.includes(role));
                if (!hasAccess) return null;
              }

              // 2. Section logic: Only show section header if subsequent items in that section are visible
              // (Simplification: just show it if it exists on the item, 
              // but ideally we'd look ahead or pre-filter navItems)
                            return (
                  <React.Fragment key={idx}>
                    {item.section && <li className="portal-nav-section-title">{item.section}</li>}
                    {item.subItems ? (
                      <li className="portal-nav-item has-submenu">
                        <details style={{ width: '100%' }}>
                          <summary className="portal-nav-link" style={{ cursor: 'pointer', padding: '12px 16px', display: 'flex', alignItems: 'center', color: '#cbd5e0' }}>
                            <i className={item.icon} style={{ width: 24, textAlign: 'center', marginRight: 12 }}></i>
                            <span className="portal-nav-label" style={{ flex: 1 }}>{item.label}</span>
                            <i className="fas fa-chevron-down" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}></i>
                          </summary>
                          <ul style={{ listStyle: 'none', padding: '0 0 0 36px', margin: '4px 0', background: 'rgba(0,0,0,0.15)', borderRadius: 4 }}>
                            {item.subItems.map((subItem, subIdx) => (
                              <li key={subIdx} style={{ margin: '4px 0' }}>
                                <NavLink
                                  to={subItem.to}
                                  className={({ isActive }) => `portal-nav-link sub-link ${isActive ? 'active' : ''}`}
                                  style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#a0aec0', display: 'block', borderRadius: 4, textDecoration: 'none' }}
                                  onClick={() => setMobileOpen(false)}
                                >
                                  {subItem.icon && <i className={subItem.icon} style={{ marginRight: 8, width: 16 }}></i>}
                                  {subItem.label}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ) : (
                      <li className="portal-nav-item">
                        <NavLink
                          to={item.to}
                          className={({ isActive }) => {
                             return isActive ? 'active' : '';
                          }}
                          onClick={() => setMobileOpen(false)}
                          end={item.to.split('/').length <= 2}
                        >
                          <i className={item.icon}></i>
                          <span className="portal-nav-label">{item.label}</span>
                        </NavLink>
                      </li>
                    )}
                  </React.Fragment>
                );
            })}
          </ul>
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-card" onClick={handleLogout} title="Click to logout">
            <div className="portal-user-avatar">
              {user?.avatar ? (
                <img src={`${BASE_URL}/api/storage/media/${user?.schoolCode}/${user.avatar}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div className="portal-user-info">
              <strong>{user?.name}</strong>
              <span>{roleBadge}</span>
            </div>
            <i className="fas fa-sign-out-alt" style={{ opacity: 0.6, fontSize: '0.85rem' }}></i>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={`portal-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <div className="portal-topbar">
          <div className="portal-topbar-left">
            <button
              className="portal-collapse-btn"
              onClick={() => { 
                if (window.innerWidth <= 1024) {
                  setMobileOpen(o => !o);
                } else {
                  setCollapsed(c => !c);
                }
              }}
              title="Toggle sidebar"
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="portal-breadcrumb">
              <span>{portalName}</span>
              <i className="fas fa-chevron-right"></i>
              <span className="current">{activeEntity?.name || 'Dashboard'}</span>
              {activeEntity?.status === 'PENDING' && (
                <span className="portal-badge warning" style={{ marginLeft: 10 }}>Verification Pending</span>
              )}
            </div>
          </div>
          <div className="portal-topbar-right">
            <div className="portal-topbar-user">
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>
                {user?.avatar ? (
                  <img src={`${BASE_URL}/api/storage/media/${user?.schoolCode}/${user.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <span>{user?.name}</span>
              <span className="portal-role-badge">{roleBadge}</span>
            </div>
            <button className="portal-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="portal-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - var(--portal-header-height))' }}>
          {isStaffUser && (
            <div className="no-print" style={{ padding: '0 24px', marginTop: '16px' }}>
              {!todayAttendance ? (
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                  animation: 'pulse 2s infinite'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#d97706', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: '#92400e', fontWeight: 800, fontSize: '0.95rem' }}>Daily Attendance Warning</h4>
                      <p style={{ margin: '2px 0 0', color: '#b45309', fontSize: '0.85rem', fontWeight: 600 }}>You have not clocked in for today yet! Please clock in to register your presence.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setClockActionType('IN'); setShowClockModal(true); }}
                    className="portal-btn-primary"
                    style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 800, padding: '10px 20px', borderRadius: '8px' }}
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i>Clock In Now
                  </button>
                </div>
              ) : !todayAttendance.timeOut ? (
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  border: '1px solid #a7f3d0',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#059669', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                      <i className="fas fa-clock"></i>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: '#065f46', fontWeight: 800, fontSize: '0.95rem' }}>You are Clocked In</h4>
                      <p style={{ margin: '2px 0 0', color: '#047857', fontSize: '0.85rem', fontWeight: 600 }}>
                        Clocked In at {new Date(todayAttendance.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Remember to clock out when your shift ends!
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setClockActionType('OUT'); setShowClockModal(true); }}
                    className="portal-btn-primary"
                    style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 800, padding: '10px 20px', borderRadius: '8px' }}
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>Clock Out Now
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
          {portalName === 'Admin Portal' && <AdminPortalFooter />}
        </div>
      </main>

      <MaintenanceRequestModal 
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
      />

      {showClockModal && (
        <ClockInModal 
          action={clockActionType}
          onClose={() => setShowClockModal(false)}
          onSuccess={fetchTodayAttendance}
        />
      )}

      <style>{`
        .maint-btn-hover:hover {
          background: rgba(255,255,255,0.1) !important;
          color: white !important;
          border-color: rgba(255,255,255,0.4) !important;
        }
      `}</style>
    </div>
  );
}
