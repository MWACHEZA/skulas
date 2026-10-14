import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface ChurchEvent {
  id: string;
  title: string;
  type: 'ASSEMBLY' | 'SUNDAY_SERVICE' | 'MIDWEEK' | 'SPECIAL';
  date: string;
  theme: string;
  status: 'PLANNED' | 'CONFIRMED' | 'ARCHIVED';
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  secondaryRoles: string[];
  avatar: string | null;
}

interface ReligionStats {
  students: Record<string, number>;
  staff: Record<string, number>;
}

interface LatestReflection {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  createdAt: string;
}

export default function ChaplaincyDashboard() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [religionStats, setReligionStats] = useState<ReligionStats>({ students: {}, staff: {} });
  const [latestReflection, setLatestReflection] = useState<LatestReflection | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'calendar' | 'reflections' | 'demographics' | 'team'>('calendar');

  // Search & Type Filter for Events
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ChurchEvent['type']>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);

  // Form states
  const [serviceForm, setServiceForm] = useState<{
    title: string;
    type: ChurchEvent['type'];
    date: string;
    theme: string;
    status: ChurchEvent['status'];
  }>({
    title: '',
    type: 'SUNDAY_SERVICE',
    date: '',
    theme: '',
    status: 'PLANNED'
  });
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);

  const chaplaincyRoles = ['School Chaplain', 'Church Prefect', 'Chaplain', 'Pastor', 'Reverend', 'Religious Coordinator'];
  const isAuthorized = user?.role === 'SCHOOL_ADMIN' || 
                       user?.role === 'SUPER_ADMIN' ||
                       user?.secondaryRoles?.some((r: string) => chaplaincyRoles.includes(r));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, teamRes, statsRes, refRes] = await Promise.all([
        api.get('/api/chaplaincy/events'),
        api.get('/api/chaplaincy/team'),
        api.get('/api/chaplaincy/religion-stats'),
        api.get('/api/chaplaincy/latest-reflection').catch(() => ({ data: null }))
      ]);
      setEvents(eventsRes.data || []);
      setTeam(teamRes.data || []);
      setReligionStats(statsRes.data || { students: {}, staff: {} });
      setLatestReflection(refRes.data || null);
    } catch (err) {
      console.error('Failed to load chaplaincy data:', err);
      showToast('Error loading chaplaincy dashboard details', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScheduleService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title || !serviceForm.date || !serviceForm.theme) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/chaplaincy/events', serviceForm);
      showToast('Service scheduled successfully!', 'success');
      setShowServiceModal(false);
      setServiceForm({
        title: '',
        type: 'SUNDAY_SERVICE',
        date: '',
        theme: '',
        status: 'PLANNED'
      });
      fetchData();
    } catch {
      showToast('Failed to schedule service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim()) {
      showToast('Please write a reflection message', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/chaplaincy/broadcast', { content: reflectionText });
      showToast('Spiritual reflection broadcasted successfully to all dashboards!', 'success');
      setShowReflectionModal(false);
      setReflectionText('');
      fetchData();
    } catch {
      showToast('Failed to broadcast reflection', 'error');
    } finally {
      setSaving(false);
    }
  };

  const calculateStatsDetails = (statsGroup: Record<string, number>) => {
    const total = Object.values(statsGroup).reduce((sum, count) => sum + count, 0);
    return Object.entries(statsGroup).map(([religion, count]) => ({
      religion,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  };

  const studentReligions = useMemo(() => calculateStatsDetails(religionStats.students), [religionStats.students]);
  const staffReligions = useMemo(() => calculateStatsDetails(religionStats.staff), [religionStats.staff]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchType = typeFilter === 'ALL' || ev.type === typeFilter;
      const matchSearch = !searchQuery.trim() || 
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.theme.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [events, typeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

  const upcomingCount = events.filter(e => e.status !== 'ARCHIVED').length;
  const totalAffiliations = Object.values(religionStats.students).reduce((a, b) => a + b, 0) + 
                            Object.values(religionStats.staff).reduce((a, b) => a + b, 0);

  const getTypeBadge = (type: ChurchEvent['type']) => {
    switch (type) {
      case 'ASSEMBLY':
        return { label: 'Morning Assembly', bg: '#e0f2fe', color: '#0369a1', icon: 'fa-school' };
      case 'SUNDAY_SERVICE':
        return { label: 'Sunday Service', bg: '#fef3c7', color: '#b45309', icon: 'fa-church' };
      case 'MIDWEEK':
        return { label: 'Midweek Fellowship', bg: '#f3e8ff', color: '#7e22ce', icon: 'fa-hands-praying' };
      case 'SPECIAL':
        return { label: 'Special Service', bg: '#ecfdf5', color: '#047857', icon: 'fa-star' };
      default:
        return { label: type, bg: '#f1f5f9', color: '#475569', icon: 'fa-calendar' };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px', color: '#64748b' }}>
        <i className="fas fa-dove fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Loading Chaplaincy &amp; Spiritual Services...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── HERO BANNER ── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%)',
          borderRadius: '20px',
          padding: '30px 32px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #334155',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4), 0 8px 10px -6px rgba(15, 23, 42, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, color: '#93c5fd', letterSpacing: '0.05em', marginBottom: '12px' }}>
              <i className="fas fa-cross" /> CAMPUS SPIRITUAL &amp; ASSEMBLY SERVICES
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Chaplaincy &amp; Worship Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              Guiding moral character, pastoral counseling, collective school assemblies, and multi-faith spiritual fellowship for all students and staff.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {isAuthorized && (
              <>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(true)}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 22px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <i className="fas fa-calendar-plus" /> Schedule Service
                </button>

                <button
                  type="button"
                  onClick={() => setShowReflectionModal(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backdropFilter: 'blur(8px)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <i className="fas fa-broadcast-tower" /> Daily Reflection
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI METRICS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* KPI 1: Liturgical Services */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Services Scheduled</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-calendar-check" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {upcomingCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
              Active in term calendar
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {events.filter(e => e.type === 'ASSEMBLY').length} Morning Assemblies &bull; {events.filter(e => e.type === 'SUNDAY_SERVICE').length} Sunday Services
          </div>
        </div>

        {/* KPI 2: Today's Reflection */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Daily Reflection</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-dove" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {latestReflection ? 'Published Today' : 'Pending Reflection'}
            </div>
            <div style={{ fontSize: '0.8rem', color: latestReflection ? '#16a34a' : '#ea580c', fontWeight: 600, marginTop: '4px' }}>
              {latestReflection ? 'Live on all student & staff dashboards' : 'No message broadcasted yet'}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {latestReflection ? new Date(latestReflection.publishedAt || latestReflection.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Click broadcast to post'}
          </div>
        </div>

        {/* KPI 3: Ministry Team */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Chaplaincy Team</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-users-gear" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {team.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: 600, marginTop: '4px' }}>
              Pastoral &amp; Student Leaders
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Chaplains, Church Prefects &amp; Religious Coordinators
          </div>
        </div>

        {/* KPI 4: Community Demographics */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Community Records</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-dharmachakra" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {totalAffiliations}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, marginTop: '4px' }}>
              Active faith profiles
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {studentReligions.length} distinct religious denominations represented
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { id: 'calendar', label: 'Liturgical & Assembly Schedule', icon: 'fa-calendar-days', badge: upcomingCount },
          { id: 'reflections', label: 'Pastoral Reflections Feed', icon: 'fa-book-open-reader', badge: latestReflection ? 1 : 0 },
          { id: 'demographics', label: 'Faith & Demographics', icon: 'fa-chart-pie' },
          { id: 'team', label: 'Chaplaincy Ministry Team', icon: 'fa-user-group', badge: team.length }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#1d4ed8' : '#64748b',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                padding: '10px 18px',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <i className={`fas ${tab.icon}`} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  background: isActive ? '#dbeafe' : '#f1f5f9',
                  color: isActive ? '#1e40af' : '#64748b',
                  fontSize: '0.75rem',
                  padding: '1px 7px',
                  borderRadius: '9999px',
                  fontWeight: 800
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: LITURGICAL CALENDAR ── */}
      {activeTab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters & Search Row */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Classification:</span>
              {[
                { id: 'ALL', label: 'All Services' },
                { id: 'ASSEMBLY', label: 'Morning Assemblies' },
                { id: 'SUNDAY_SERVICE', label: 'Sunday Services' },
                { id: 'MIDWEEK', label: 'Midweek Fellowship' },
                { id: 'SPECIAL', label: 'Special Services' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setTypeFilter(f.id as any); setCurrentPage(1); }}
                  style={{
                    background: typeFilter === f.id ? '#1e293b' : '#f8fafc',
                    color: typeFilter === f.id ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: typeFilter === f.id ? '#1e293b' : '#e2e8f0',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
              <input
                type="text"
                placeholder="Search theme, sermon, topic..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Schedule List */}
          {filteredEvents.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem' }}>
                <i className="fas fa-calendar-day" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No Liturgical Services Found</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                {searchQuery || typeFilter !== 'ALL' ? 'Try adjusting your filters or search terms.' : 'No school liturgical assemblies or services have been scheduled yet.'}
              </p>
              {isAuthorized && (
                <button
                  type="button"
                  onClick={() => setShowServiceModal(true)}
                  style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <i className="fas fa-plus mr-2" /> Schedule First Service
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {paginatedEvents.map(event => {
                const typeConfig = getTypeBadge(event.type);
                const eventDate = new Date(event.date);
                const dayNum = eventDate.getDate();
                const monthStr = eventDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
                const timeStr = eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const weekdayStr = eventDate.toLocaleDateString('en-GB', { weekday: 'long' });

                return (
                  <div
                    key={event.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    {/* Date Block */}
                    <div style={{
                      width: '64px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '10px 6px',
                      textAlign: 'center',
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>{monthStr}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{dayNum}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>{timeStr}</div>
                    </div>

                    {/* Content Block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          background: typeConfig.bg,
                          color: typeConfig.color,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <i className={`fas ${typeConfig.icon}`} /> {typeConfig.label}
                        </span>

                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: event.status === 'CONFIRMED' ? '#dcfce7' : event.status === 'PLANNED' ? '#fef3c7' : '#f1f5f9',
                          color: event.status === 'CONFIRMED' ? '#15803d' : event.status === 'PLANNED' ? '#b45309' : '#64748b'
                        }}>
                          {event.status}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                        {event.title}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                        <i className="fas fa-clock" style={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                        <span>{weekdayStr} at {timeStr}</span>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        borderLeft: '3px solid #3b82f6',
                        borderRadius: '0 8px 8px 0',
                        padding: '8px 12px',
                        fontSize: '0.825rem',
                        color: '#334155',
                        lineHeight: 1.4
                      }}>
                        <strong style={{ color: '#0f172a' }}>Scripture / Theme: </strong>
                        &ldquo;{event.theme}&rdquo;
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderRadius: '12px', padding: '12px 20px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DAILY REFLECTIONS FEED ── */}
      {activeTab === 'reflections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {latestReflection ? (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1.5px solid #86efac',
              borderRadius: '20px',
              padding: '28px 32px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    <i className="fas fa-dove" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', letterSpacing: '0.04em' }}>TODAY&apos;S PUBLISHED BROADCAST</span>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#064e3b' }}>{latestReflection.title}</h2>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>
                    ACTIVE COMMUNITY WIDE
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                    {new Date(latestReflection.publishedAt || latestReflection.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px 24px',
                fontSize: '1rem',
                color: '#1e293b',
                lineHeight: 1.7,
                border: '1px solid #d1fae5',
                fontStyle: 'italic',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                &ldquo;{latestReflection.content}&rdquo;
              </div>

              {isAuthorized && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReflectionModal(true)}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 18px',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fas fa-pen-to-square" /> Update Daily Reflection
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem' }}>
                <i className="fas fa-dove" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No Active Daily Reflection</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', maxWidth: '480px', marginInline: 'auto' }}>
                Pastoral reflections appear automatically on student, parent, and staff dashboard banners to inspire moral leadership and spiritual encouragement.
              </p>
              {isAuthorized && (
                <button
                  type="button"
                  onClick={() => setShowReflectionModal(true)}
                  style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <i className="fas fa-plus mr-2" /> Write &amp; Broadcast Today&apos;s Reflection
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: FAITH & DEMOGRAPHICS ── */}
      {activeTab === 'demographics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {/* Students Demographics */}
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Student Faith Affiliations</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Institutional enrollment records breakdown</span>
              </div>
              <span style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '9999px' }}>
                {Object.values(religionStats.students).reduce((a, b) => a + b, 0)} Students
              </span>
            </div>

            {studentReligions.length === 0 ? (
              <p style={{ margin: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>No student religious preferences recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {studentReligions.map(({ religion, count, percentage }) => (
                  <div key={religion}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                      <span>{religion}</span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{count} ({percentage}%)</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: 'linear-gradient(90deg, #2563eb, #3b82f6)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff Demographics */}
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Faculty &amp; Staff Affiliations</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Staff directory voluntary faith records</span>
              </div>
              <span style={{ background: '#f8fafc', color: '#475569', fontWeight: 800, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '9999px' }}>
                {Object.values(religionStats.staff).reduce((a, b) => a + b, 0)} Staff
              </span>
            </div>

            {staffReligions.length === 0 ? (
              <p style={{ margin: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>No staff religious preferences recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {staffReligions.map(({ religion, count, percentage }) => (
                  <div key={religion}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                      <span>{religion}</span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{count} ({percentage}%)</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: 'linear-gradient(90deg, #475569, #64748b)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: CHAPLAINCY TEAM ── */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {team.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem' }}>
                <i className="fas fa-users-gear" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No Chaplaincy Staff Assigned</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                Assign secondary roles such as &quot;School Chaplain&quot;, &quot;Church Prefect&quot;, or &quot;Religious Coordinator&quot; in Staff Directory to build your ministry team.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {team.map(member => {
                const assignedRole = member.secondaryRoles.find(r => chaplaincyRoles.includes(r)) || member.role;
                const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <div
                    key={member.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {member.avatar ? (
                        <img 
                          src={`${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${member.avatar}`} 
                          alt={member.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.name}
                      </h4>
                      <div style={{ display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                        {assignedRole}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        Primary: {member.role}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: SCHEDULE LITURGICAL SERVICE ── */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <i className="fas fa-calendar-plus" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Schedule Liturgical Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleService} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Service Title / Occasion *</label>
                <input
                  type="text"
                  placeholder="e.g. Easter Assembly, Pentecost Sunday Mass, Midweek Fellowship"
                  value={serviceForm.title}
                  onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Classification *</label>
                  <select
                    value={serviceForm.type}
                    onChange={e => setServiceForm({ ...serviceForm, type: e.target.value as ChurchEvent['type'] })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                  >
                    <option value="ASSEMBLY">Morning Assembly</option>
                    <option value="SUNDAY_SERVICE">Sunday Service</option>
                    <option value="MIDWEEK">Midweek Fellowship</option>
                    <option value="SPECIAL">Special Gathering</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Status *</label>
                  <select
                    value={serviceForm.status}
                    onChange={e => setServiceForm({ ...serviceForm, status: e.target.value as ChurchEvent['status'] })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Service Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  value={serviceForm.date}
                  onChange={e => setServiceForm({ ...serviceForm, date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Sermon Theme / Scripture Passage *</label>
                <input
                  type="text"
                  placeholder="e.g. Walking in Integrity (Proverbs 10:9) or Loving One Another"
                  value={serviceForm.theme}
                  onChange={e => setServiceForm({ ...serviceForm, theme: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Scheduling...' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BROADCAST DAILY REFLECTION ── */}
      {showReflectionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '580px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <i className="fas fa-dove" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Broadcast Daily Reflection</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReflectionModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleBroadcastReflection} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Spiritual Thought, Word of Wisdom or Scripture *
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. &ldquo;Trust in the Lord with all your heart, and do not lean on your own understanding.&rdquo; Today let us encourage one another with patience and kindness."
                  value={reflectionText}
                  onChange={e => setReflectionText(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  This message appears instantly as the top daily banner on Student, Parent, Teacher, and Staff dashboards.
                </span>
              </div>

              {reflectionText.trim() && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#166534', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>LIVE DASHBOARD PREVIEW</span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d', fontStyle: 'italic' }}>
                    &ldquo;{reflectionText}&rdquo;
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReflectionModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Publishing...' : 'Broadcast to All Portals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
