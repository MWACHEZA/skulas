import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import ClockInModal from '../../../components/attendance/ClockInModal';
import MaintenanceRequestModal from '../../../components/shared/MaintenanceRequestModal';

export default function AncillaryDashboard() {
  const { user } = useAuth();
  const [clockModalAction, setClockModalAction] = useState<'IN' | 'OUT' | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const primaryColor = user?.schoolBranding?.primaryColor || '#0c2340';
  const accentColor = user?.schoolBranding?.accentColor || '#0284c7';
  const schoolName = user?.schoolName || 'Lobengula Primary';

  useEffect(() => {
    fetchAttendance();
    fetchDashboardStats();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/api/staff-attendance/today');
      setAttendanceStatus(res.data);
    } catch (e) {
      console.error('Fetch attendance error:', e);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/api/dashboard/ancillary');
      setStats(res.data?.stats || null);
      setRecentTickets(res.data?.recentTickets || []);
    } catch (e) {
      console.error('Fetch dashboard stats error:', e);
    }
  };

  const isClockedIn = attendanceStatus && !attendanceStatus.timeOut;

  const filteredTickets = useMemo(() => {
    if (ticketFilter === 'all') return recentTickets;
    return recentTickets.filter(t => (t.status || '').toLowerCase() === ticketFilter);
  }, [recentTickets, ticketFilter]);

  const openTicketsCount = stats?.openTicketsCount ?? recentTickets.filter(t => (t.status || '').toLowerCase() === 'open').length;
  const closedTicketsCount = recentTickets.filter(t => (t.status || '').toLowerCase() === 'closed').length;

  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const hasStationRole = (roleNames: string[]) => {
    const isSuperOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
    if (isSuperOrAdmin) return true;
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '');
    const userSecRoles = (user?.secondaryRoles || []).map(normalize);
    const metaSecRoles = Array.isArray((user?.metadata as any)?.secondaryRoles)
      ? (user!.metadata as any).secondaryRoles.map(normalize)
      : [];
    const designation = normalize((user?.metadata as any)?.designation || (user?.metadata as any)?.jobTitle || '');
    const deptName = normalize(user?.dept?.name || (typeof user?.department === 'string' ? user.department : (user?.department as any)?.name) || '');

    const hasAnySpecialization = userSecRoles.length > 0 || metaSecRoles.length > 0 || Boolean(designation) || Boolean(deptName);
    if (!hasAnySpecialization) return true;
    const targets = roleNames.map(normalize);
    return targets.some(r =>
      userSecRoles.includes(r) ||
      metaSecRoles.includes(r) ||
      (designation && (designation.includes(r) || r.includes(designation))) ||
      (deptName && (deptName.includes(r) || r.includes(deptName)))
    );
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* 1. HERO OPERATIONAL BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0c2340 0%, #1e3a8a 55%, #0369a1 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 24,
          boxShadow: '0 12px 30px -8px rgba(12, 35, 64, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                borderRadius: 30,
                padding: '4px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="fas fa-shield-alt" style={{ color: '#38bdf8' }}></i>
              Campus Operations & Essential Services
            </span>

            <span
              style={{
                background: isClockedIn ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                border: `1px solid ${isClockedIn ? '#4ade80' : '#f87171'}`,
                borderRadius: 30,
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: isClockedIn ? '#bbf7d0' : '#fecaca'
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isClockedIn ? '#22c55e' : '#ef4444',
                  boxShadow: isClockedIn ? '0 0 10px #22c55e' : 'none'
                }}
              ></span>
              {isClockedIn ? 'Duty Shift Active' : 'Off Duty / Awaiting Clock-In'}
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 8px 0',
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            Welcome, {user?.name || 'Staff Member'}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: '0.98rem',
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: 500,
              lineHeight: 1.5
            }}
          >
            {schoolName} Operations Center. Monitor campus security, hostels, kitchen rations, facility maintenance, and daily work orders.
          </p>
        </div>

        {/* Hero Quick Action Cluster */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => {
              if (isClockedIn) setClockModalAction('OUT');
              else setClockModalAction('IN');
            }}
            style={{
              background: isClockedIn ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 22px',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: isClockedIn ? '0 6px 16px rgba(217, 119, 6, 0.35)' : '0 6px 16px rgba(16, 185, 129, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <i className={isClockedIn ? 'fas fa-sign-out-alt' : 'fas fa-fingerprint'}></i>
            {isClockedIn ? 'Clock Out of Shift' : 'Clock In for Duty'}
          </button>

          <button
            onClick={() => setIsMaintModalOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              borderRadius: 12,
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s ease'
            }}
          >
            <i className="fas fa-tools" style={{ color: '#38bdf8' }}></i>
            Report Maintenance
          </button>
        </div>
      </div>

      {/* 2. LIVE TIMECLOCK & SHIFT STATUS WIDGET */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: isClockedIn ? '#ecfdf5' : '#fef2f2',
              color: isClockedIn ? '#059669' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            <i className={isClockedIn ? 'fas fa-user-check' : 'fas fa-user-clock'}></i>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Operational Attendance
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: isClockedIn ? '#d1fae5' : '#fee2e2',
                  color: isClockedIn ? '#065f46' : '#991b1b'
                }}
              >
                {isClockedIn ? 'CLOCKED IN' : 'NOT CLOCKED IN'}
              </span>
            </div>

            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
              {isClockedIn ? (
                <>
                  Clocked In at <span style={{ color: '#059669' }}>{attendanceStatus?.timeIn || 'Shift Start'}</span>
                  {attendanceStatus?.lateReason && <span style={{ fontSize: '0.8rem', color: '#b45309', marginLeft: 8 }}>(Note: {attendanceStatus.lateReason})</span>}
                </>
              ) : (
                'You are currently off duty. Clock in to record your physical campus presence.'
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              {formatDisplayDate(currentTime)} · Campus Station: {typeof user?.department === 'string' ? user.department : (user?.department as any)?.name || user?.dept?.name || 'Facilities & Support'}
            </div>
          </div>
        </div>

        {/* Live digital clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '1.25rem',
              fontWeight: 800,
              padding: '10px 18px',
              borderRadius: 12,
              letterSpacing: '0.08em',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-clock" style={{ fontSize: '0.95rem', color: '#94a3b8' }}></i>
            {formatClockTime(currentTime)}
          </div>

          <button
            onClick={() => {
              if (isClockedIn) setClockModalAction('OUT');
              else setClockModalAction('IN');
            }}
            style={{
              background: isClockedIn ? '#ef4444' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: isClockedIn ? '0 4px 12px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <i className={isClockedIn ? 'fas fa-sign-out-alt' : 'fas fa-sign-in-alt'}></i>
            {isClockedIn ? 'Clock Out' : 'Clock In Now'}
          </button>
        </div>
      </div>

      {/* 3. EXECUTIVE OPERATIONAL KPI METRICS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18,
          marginBottom: 28
        }}
      >
        {/* KPI 1: Shift Attendance */}
        <div
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: `4px solid ${isClockedIn ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderRadius: 16
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shift Attendance
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: isClockedIn ? '#059669' : '#dc2626', margin: '6px 0 2px' }}>
              {isClockedIn ? 'Clocked In' : 'Off Duty'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {isClockedIn ? `In at ${attendanceStatus?.timeIn || 'Duty Start'}` : 'Tap Clock In above to start shift'}
            </div>
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: isClockedIn ? '#d1fae5' : '#fee2e2',
              color: isClockedIn ? '#059669' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}
          >
            <i className="fas fa-business-time"></i>
          </div>
        </div>

        {/* KPI 2: Open IT & Maintenance Tickets */}
        <div
          onClick={() => setTicketFilter('open')}
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderRadius: 16,
            cursor: 'pointer'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Open Tickets
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0369a1', margin: '6px 0 2px' }}>
              {openTicketsCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Active IT & repair requests
            </div>
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}
          >
            <i className="fas fa-laptop-medical"></i>
          </div>
        </div>

        {/* KPI 3: Pending Procurements */}
        <Link
          to="/ancillary/procurement"
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderRadius: 16,
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Procurements
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#d97706', margin: '6px 0 2px' }}>
              {stats?.pendingProcurementsCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Supplies awaiting approval
            </div>
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}
          >
            <i className="fas fa-shopping-cart"></i>
          </div>
        </Link>

        {/* KPI 4: Assigned Duties & Shifts */}
        <Link
          to="/ancillary/schedules"
          className="portal-card"
          style={{
            padding: '20px 22px',
            borderLeft: '4px solid #8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderRadius: 16,
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tasks & Duties
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#7c3aed', margin: '6px 0 2px' }}>
              {stats?.assignedTasksCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Assigned shift duties
            </div>
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#ede9fe',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}
          >
            <i className="fas fa-tasks"></i>
          </div>
        </Link>
      </div>

      {/* 4. CAMPUS OPERATIONS QUICK LAUNCHPAD */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-th-large" style={{ color: '#0284c7' }}></i>
              Campus Operations Launchpad
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Fast access to essential station portals and daily management terminals
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Tile: Tuckshop & POS Terminal */}
          {hasStationRole(['Tuckshop Manager', 'Cashier', 'Tuckshop Assistant', 'Stock Controller']) && (
            <Link
              to="/ancillary/tuckshop"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-cash-register"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Tuckshop & POS Terminal
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Touchscreen point-of-sale, inventory stock records, till sessions & student wallet top-ups.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d97706' }}>Open Tuckshop & POS</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#d97706' }}></i>
              </div>
            </Link>
          )}

          {/* Tile: Transport & Fleet */}
          {hasStationRole(['Driver', 'Transport Coordinator', 'Transport Manager']) && (
            <Link
              to="/ancillary/transportation/vehicles"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-bus"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Transport & Fleet
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Campus bus routes, vehicle assignments, driver records & passenger transport logistics.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8' }}>Manage Fleet</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#1d4ed8' }}></i>
              </div>
            </Link>
          )}

          {/* Tile 1: Gate Scanner Terminal */}
          {hasStationRole(['Security Guard', 'Security Supervisor', 'Night Watchman', 'Gate Officer', 'Security Officer']) && (
            <Link
              to="/gate"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-qrcode"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Gate Scanner Terminal
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Scan student ID cards, record day scholar entry/departures & guard overrides.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>Open Scanner</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#0284c7' }}></i>
              </div>
            </Link>
          )}

          {/* Tile 2: Dorm Roll Call */}
          {hasStationRole(['Boarding Master', 'Hostel Matron', 'Hostel Supervisor', 'House Master', 'Matron', 'Warden']) && (
            <Link
              to="/ancillary/boarding?tab=rollcall"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#ccfbf1',
                    color: '#0f766e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-clipboard-check"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Dorm Roll Call
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Hostel headcount roster, track sick bay admissions & sync dining meal deductions.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f766e' }}>Start Headcount</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#0f766e' }}></i>
              </div>
            </Link>
          )}

          {/* Tile 3: School Farm Projects */}
          {hasStationRole(['Farm Manager', 'Farm Assistant', 'Agriculture Teacher']) && (
            <Link
              to="/ancillary/farm"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-tractor"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    School Farm Projects
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Broiler & layer poultry flocks, mortality rate tracking & crop harvest logs.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d' }}>Open Farm Hub</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#15803d' }}></i>
              </div>
            </Link>
          )}

          {/* Tile 4: Dining Hall & Kitchen */}
          {hasStationRole(['Head Chef', 'Cook', 'Catering Supervisor', 'Kitchen Assistant', 'Caterer', 'DH Captain']) && (
            <Link
              to="/ancillary/kitchen"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#ffedd5',
                    color: '#c2410c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-utensils"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Dining Hall & Kitchen
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Daily rations allocation, meal deductions, kitchen store inventory & recipes.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c2410c' }}>Kitchen Management</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#c2410c' }}></i>
              </div>
            </Link>
          )}

          {/* Tile 5: Asset Register & Maintenance */}
          {hasStationRole(['Maintenance Supervisor', 'Plumber', 'Electrician', 'Carpenter', 'General Maintenance Worker', 'Handyman']) && (
            <Link
              to="/ancillary/maintenance"
              className="portal-card"
              style={{
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#f3e8ff',
                    color: '#7e22ce',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-tools"></i>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Asset Maintenance
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Campus repairs, fixture breakdowns, work orders & equipment servicing schedules.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7e22ce' }}>View Assets</span>
                <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#7e22ce' }}></i>
              </div>
            </Link>
          )}

          {/* Tile 6: Shift Roster & Schedules */}
          <Link
            to="/ancillary/schedules"
            className="portal-card"
            style={{
              padding: '20px 22px',
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: 16,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                  Shift Roster & Schedules
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                  Weekly station assignments, morning/evening shifts & team handovers.
                </p>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca' }}>View Roster</span>
              <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem', color: '#4338ca' }}></i>
            </div>
          </Link>
        </div>
      </div>

      {/* 5. DUAL INTELLIGENCE SECTION: TICKETS & OPERATIONAL DIRECTORY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* LEFT COLUMN: RECENT SUPPORT & REPAIR TICKETS */}
        <div
          className="portal-card"
          style={{
            borderRadius: 20,
            padding: 0,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.03)',
            background: '#ffffff'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-clipboard-list" style={{ color: primaryColor }}></i>
                Recent Support & Repair Requests
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                IT issues, equipment breakdowns & work orders logged
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                <button
                  onClick={() => setTicketFilter('all')}
                  style={{
                    background: ticketFilter === 'all' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: ticketFilter === 'all' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: ticketFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  All ({recentTickets.length})
                </button>
                <button
                  onClick={() => setTicketFilter('open')}
                  style={{
                    background: ticketFilter === 'open' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: ticketFilter === 'open' ? '#dc2626' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: ticketFilter === 'open' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Open ({openTicketsCount})
                </button>
                <button
                  onClick={() => setTicketFilter('closed')}
                  style={{
                    background: ticketFilter === 'closed' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: ticketFilter === 'closed' ? '#059669' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: ticketFilter === 'closed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Closed ({closedTicketsCount})
                </button>
              </div>

              <button
                onClick={() => setIsMaintModalOpen(true)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <i className="fas fa-plus"></i> New Request
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Ticket ID</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Subject</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#94a3b8', fontSize: '1.2rem' }}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <div style={{ fontWeight: 700, color: '#334155' }}>No tickets found in this view</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                        All maintenance and IT issues are up to date.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const isOpen = (t.status || '').toLowerCase() === 'open';
                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0369a1', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                          #{t.ticketNumber || t.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '3px 10px',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}
                          >
                            {t.category || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
                            {t.subject}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              background: isOpen ? '#fee2e2' : '#d1fae5',
                              color: isOpen ? '#dc2626' : '#059669',
                              border: `1px solid ${isOpen ? '#fecaca' : '#a7f3d0'}`,
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}
                          >
                            {isOpen ? 'Open' : 'Closed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: CAMPUS SAFETY DIRECTORY & STANDARD PROCEDURES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Campus Emergency Extensions */}
          <div
            className="portal-card"
            style={{
              borderRadius: 20,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.03)',
              background: '#ffffff'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-phone-alt" style={{ color: '#0284c7' }}></i>
              Campus Safety & Emergency Extensions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-shield-alt" style={{ color: '#0284c7' }}></i>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Main Gatehouse & Security</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Post 1 / Perimeter Guard</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: 6, fontSize: '0.82rem' }}>
                  Ext 101
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-heartbeat" style={{ color: '#059669' }}></i>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>School Clinic & Sick Bay</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Nurse On Duty / Triage</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#059669', background: '#d1fae5', padding: '3px 8px', borderRadius: 6, fontSize: '0.82rem' }}>
                  Ext 104
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-building" style={{ color: '#d97706' }}></i>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Administration & Bursar</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Main Office / Store Requisitions</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: 6, fontSize: '0.82rem' }}>
                  Ext 100
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-wrench" style={{ color: '#7c3aed' }}></i>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Estate Caretaker & Workshop</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Plumbing, Electric & Generator</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#7c3aed', background: '#ede9fe', padding: '3px 8px', borderRadius: 6, fontSize: '0.82rem' }}>
                  Ext 109
                </span>
              </div>
            </div>
          </div>

          {/* Daily Shift Operational Reminders */}
          <div
            className="portal-card"
            style={{
              borderRadius: 20,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.03)',
              background: '#f8fafc'
            }}
          >
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-tasks" style={{ color: '#0284c7' }}></i>
              Shift Protocols Checklist
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', marginTop: 3 }}></i>
                <span>Confirm physical student exeat authorization before permitting gate exit.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', marginTop: 3 }}></i>
                <span>Complete evening roll-call headcount before 20:00 lights-out inspection.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', marginTop: 3 }}></i>
                <span>Report all facility, water pump or lighting faults immediately via New Request.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Clock Modal */}
      {clockModalAction && (
        <ClockInModal
          action={clockModalAction}
          onClose={() => setClockModalAction(null)}
          onSuccess={fetchAttendance}
        />
      )}

      {/* Maintenance Request Modal */}
      <MaintenanceRequestModal
        isOpen={isMaintModalOpen}
        onClose={() => {
          setIsMaintModalOpen(false);
          fetchDashboardStats();
        }}
      />
    </div>
  );
}
