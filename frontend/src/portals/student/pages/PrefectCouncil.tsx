import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface DutyAssignment {
  id: string;
  prefectName: string;
  zone: string;
  timeSlot: string;
  day: string;
}

interface MeetingMinutes {
  id: string;
  title: string;
  date: string;
  chair: string;
  recordsText: string;
}

interface ConductReport {
  id: string;
  studentName: string;
  category: string;
  narrative: string;
  hasPunishment?: boolean;
  punishment?: string | null;
  punishmentLocation?: string | null;
  punishmentStatus?: string | null;
  createdAt: string;
  reportedBy?: {
    name: string;
    role: string;
  };
}

interface SearchResultUser {
  id: string;
  name: string;
  role: string;
}

export default function PrefectCouncil() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'roster' | 'meetings' | 'reports'>('roster');

  // Dynamic Lists
  const [duties, setDuties] = useState<DutyAssignment[]>([]);
  const [meetings, setMeetings] = useState<MeetingMinutes[]>([]);
  const [reports, setReports] = useState<ConductReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Duties
  const [dutyDayFilter, setDutyDayFilter] = useState<string>('ALL');
  const [dutySearch, setDutySearch] = useState('');
  const [dutiesPage, setDutiesPage] = useState(1);
  const itemsPerPage = 8;

  // Filters for Reports
  const [reportCategoryFilter, setReportCategoryFilter] = useState('ALL');

  // Modals
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [dutyForm, setDutyForm] = useState({
    prefectName: '',
    zone: 'Main Gate',
    timeSlot: '07:15 - 07:45 (Morning Assembly)',
    day: 'Monday'
  });

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    chair: '',
    recordsText: ''
  });

  const [reportForm, setReportForm] = useState({
    studentName: '',
    category: 'Uniform Violation',
    narrative: '',
    hasPunishment: false,
    punishment: '',
    punishmentLocation: 'Assembly Grounds'
  });

  // Autocomplete / Search states
  const [memberSearchResults, setMemberSearchResults] = useState<SearchResultUser[]>([]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [studentSearchResults, setStudentSearchResults] = useState<SearchResultUser[]>([]);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // School Type Awareness
  const type = (user?.schoolType || 'Secondary').toLowerCase();
  const isTertiary = type.includes('nursing') || type.includes('medical') || type.includes('college') ||
                     type.includes('poly') || type.includes('technical') || type.includes('vocational') ||
                     type.includes('university') || type.includes('varsity') || type.includes('tertiary');

  const pageTitle = isTertiary ? 'Student Representative Council (SRC)' : 'Prefects Board';
  const pageSubtitle = isTertiary 
    ? 'Student advocacy, council assemblies, campus duty coordination, and leadership governance.' 
    : 'Lead with integrity, serve with humility, and maintain the highest standards of school excellence.';

  const rosterLabel = isTertiary ? 'Council Roster' : 'Duty Roster';
  const reportsLabel = isTertiary ? 'Student Concerns' : 'Conduct Reports';

  // Role Checks
  const isPrefectLeader = user?.secondaryRoles?.some((r: string) => 
    ['Head Boy', 'Head Girl', 'Vice Head Boy', 'Vice Head Girl', 'Senior Prefect', 'Senior Teacher'].includes(r)
  ) || user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const canViewReportsLog = user?.role === 'SCHOOL_ADMIN' || 
                            user?.role === 'SUPER_ADMIN' ||
                            user?.secondaryRoles?.includes('Senior Teacher') ||
                            user?.secondaryRoles?.includes('Head Boy') ||
                            user?.secondaryRoles?.includes('Head Girl') ||
                            user?.role === 'TEACHER';

  const canFileReports = user?.role === 'SCHOOL_ADMIN' || 
                         user?.role === 'SUPER_ADMIN' ||
                         user?.role === 'TEACHER' ||
                         user?.secondaryRoles?.some((r: string) => 
                           ['Prefect', 'Head Boy', 'Head Girl', 'Vice Head Boy', 'Vice Head Girl', 'Senior Prefect', 'Class Monitor', 'Student Librarian', 'Senior Teacher'].includes(r)
                         );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'roster') {
        const res = await api.get('/api/prefects/duties');
        setDuties(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'meetings') {
        const res = await api.get('/api/prefects/meetings');
        setMeetings(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'reports') {
        const res = await api.get('/api/prefects/reports');
        setReports(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      showToast(`Failed to load ${activeTab} data`, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMemberSearch = async (query: string) => {
    if (!query) {
      setMemberSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/api/users/search?query=${encodeURIComponent(query)}`);
      setMemberSearchResults(res.data || []);
    } catch (err) {
      console.error('Member search error', err);
    }
  };

  const handleStudentSearch = async (query: string) => {
    if (!query) {
      setStudentSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/api/users/search?role=STUDENT&query=${encodeURIComponent(query)}`);
      setStudentSearchResults(res.data || []);
    } catch (err) {
      console.error('Student search error', err);
    }
  };

  const handleDutySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyForm.prefectName.trim() || !dutyForm.zone.trim()) {
      showToast('Please specify a prefect and zone', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/prefects/duties', dutyForm);
      showToast('Duty assignment scheduled successfully', 'success');
      setShowDutyModal(false);
      setDutyForm({ prefectName: '', zone: 'Main Gate', timeSlot: '07:15 - 07:45 (Morning Assembly)', day: 'Monday' });
      fetchData();
    } catch {
      showToast('Failed to schedule duty', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.chair.trim() || !meetingForm.recordsText.trim()) {
      showToast('Please fill all required meeting fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/prefects/meetings', meetingForm);
      showToast('Meeting minutes published successfully', 'success');
      setShowMeetingModal(false);
      setMeetingForm({ title: '', date: '', chair: '', recordsText: '' });
      fetchData();
    } catch {
      showToast('Failed to publish minutes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.studentName.trim() || !reportForm.narrative.trim()) {
      showToast('Please enter student name and description', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/prefects/reports', reportForm);
      showToast('Conduct report filed successfully', 'success');
      setShowReportModal(false);
      setReportForm({ studentName: '', category: 'Uniform Violation', narrative: '', hasPunishment: false, punishment: '', punishmentLocation: 'Assembly Grounds' });
      fetchData();
    } catch {
      showToast('Failed to file conduct report', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Duties
  const filteredDuties = useMemo(() => {
    return duties.filter(d => {
      const matchDay = dutyDayFilter === 'ALL' || d.day.toLowerCase() === dutyDayFilter.toLowerCase();
      const matchSearch = !dutySearch.trim() ||
        d.prefectName.toLowerCase().includes(dutySearch.toLowerCase()) ||
        d.zone.toLowerCase().includes(dutySearch.toLowerCase());
      return matchDay && matchSearch;
    });
  }, [duties, dutyDayFilter, dutySearch]);

  const totalDutyPages = Math.ceil(filteredDuties.length / itemsPerPage);
  const paginatedDuties = useMemo(() => {
    const start = (dutiesPage - 1) * itemsPerPage;
    return filteredDuties.slice(start, start + itemsPerPage);
  }, [filteredDuties, dutiesPage]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (reportCategoryFilter === 'ALL') return true;
      return r.category === reportCategoryFilter;
    });
  }, [reports, reportCategoryFilter]);

  const getZoneColor = (zone: string) => {
    const z = zone.toLowerCase();
    if (z.includes('gate')) return { bg: '#fee2e2', color: '#b91c1c', icon: 'fa-torii-gate' };
    if (z.includes('dining') || z.includes('canteen')) return { bg: '#fef3c7', color: '#b45309', icon: 'fa-utensils' };
    if (z.includes('assembly') || z.includes('hall')) return { bg: '#eff6ff', color: '#1d4ed8', icon: 'fa-school' };
    if (z.includes('library')) return { bg: '#f3e8ff', color: '#7e22ce', icon: 'fa-book' };
    if (z.includes('corridor') || z.includes('quad')) return { bg: '#ecfdf5', color: '#047857', icon: 'fa-arrows-split-up-and-left' };
    return { bg: '#f1f5f9', color: '#475569', icon: 'fa-location-dot' };
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── EXECUTIVE BANNER ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '30px 32px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #334155',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.05em', marginBottom: '12px' }}>
              <i className="fas fa-award" /> STUDENT LEADERSHIP COMMAND CENTER
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {pageTitle}
            </h1>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              {pageSubtitle}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {isPrefectLeader && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDutyModal(true)}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  <i className="fas fa-clipboard-check" /> Assign Duty Slot
                </button>

                <button
                  type="button"
                  onClick={() => setShowMeetingModal(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-handshake" /> Record Minutes
                </button>
              </>
            )}

            {canFileReports && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
                }}
              >
                <i className="fas fa-file-shield" /> Log Conduct Case
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 KPI LEADERSHIP CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* KPI 1 */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Weekly Duty Slots</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-clipboard-user" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {duties.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
              Active weekly duty posts
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Gates, assembly hall, dining hall, corridors
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Council Meetings</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-handshake-simple" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {meetings.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: 600, marginTop: '4px' }}>
              Published minutes &amp; proceedings
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Official student council records
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Conduct Incidents</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-shield-halved" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {reports.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, marginTop: '4px' }}>
              Logged this academic term
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Turnout, punctuality, property respect
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Leadership Scope</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              <i className="fas fa-sitemap" />
            </div>
          </div>
          <div style={{ margin: '14px 0 6px' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {new Set(duties.map(d => d.zone)).size || 5}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
              Covered campus zones
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Discipline &amp; student monitoring coverage
          </div>
        </div>
      </div>

      {/* ── TABS ROW ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { id: 'roster', label: rosterLabel, icon: 'fa-clipboard-list', count: duties.length },
          { id: 'meetings', label: 'Council Proceedings & Minutes', icon: 'fa-book', count: meetings.length },
          { id: 'reports', label: reportsLabel, icon: 'fa-file-shield', count: reports.length }
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
              <span style={{
                background: isActive ? '#dbeafe' : '#f1f5f9',
                color: isActive ? '#1e40af' : '#64748b',
                fontSize: '0.75rem',
                padding: '1px 7px',
                borderRadius: '9999px',
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: DUTY ROSTER ── */}
      {activeTab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Day Pills & Search Bar */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Day:</span>
              {['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDutyDayFilter(d); setDutiesPage(1); }}
                  style={{
                    background: dutyDayFilter === d ? '#1e293b' : '#f8fafc',
                    color: dutyDayFilter === d ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: dutyDayFilter === d ? '#1e293b' : '#e2e8f0',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
              <input
                type="text"
                placeholder="Search prefect name or zone..."
                value={dutySearch}
                onChange={e => { setDutySearch(e.target.value); setDutiesPage(1); }}
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

          {/* Duties Table Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            {paginatedDuties.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem' }}>
                  <i className="fas fa-calendar-xmark" />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No Duties Scheduled</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                  {dutySearch || dutyDayFilter !== 'ALL' ? 'No assignments match the selected day or search filter.' : 'No student duty assignments have been created yet.'}
                </p>
                {isPrefectLeader && (
                  <button
                    type="button"
                    onClick={() => setShowDutyModal(true)}
                    style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <i className="fas fa-plus mr-2" /> Assign First Duty Slot
                  </button>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.825rem', fontWeight: 700 }}>
                    <th style={{ padding: '14px 20px' }}>Prefect / Student Leader</th>
                    <th style={{ padding: '14px 20px' }}>Campus Zone / Post</th>
                    <th style={{ padding: '14px 20px' }}>Day of Week</th>
                    <th style={{ padding: '14px 20px' }}>Time Slot</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDuties.map(duty => {
                    const zoneStyle = getZoneColor(duty.zone);
                    return (
                      <tr key={duty.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                              {duty.prefectName.charAt(0)}
                            </div>
                            <span>{duty.prefectName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            background: zoneStyle.bg,
                            color: zoneStyle.color,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <i className={`fas ${zoneStyle.icon}`} /> {duty.zone}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#334155' }}>
                          <span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            {duty.day}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#64748b', fontWeight: 600 }}>
                          <i className="fas fa-clock mr-2 opacity-50" /> {duty.timeSlot}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800 }}>
                            SCHEDULED
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Pagination footer */}
            {totalDutyPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {(dutiesPage - 1) * itemsPerPage + 1} to {Math.min(dutiesPage * itemsPerPage, filteredDuties.length)} of {filteredDuties.length} assignments
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDutiesPage(p => Math.max(1, p - 1))}
                    disabled={dutiesPage === 1}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', cursor: dutiesPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setDutiesPage(p => Math.min(totalDutyPages, p + 1))}
                    disabled={dutiesPage === totalDutyPages}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', cursor: dutiesPage === totalDutyPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: COUNCIL MEETINGS ── */}
      {activeTab === 'meetings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {meetings.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem' }}>
                <i className="fas fa-handshake" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No Council Minutes Published</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                Record agendas, leadership resolutions, and action items discussed during student council assemblies.
              </p>
              {isPrefectLeader && (
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(true)}
                  style={{ marginTop: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <i className="fas fa-plus mr-2" /> Record Council Meeting
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {meetings.map(m => (
                <div
                  key={m.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '22px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#faf5ff', color: '#7e22ce', padding: '3px 9px', borderRadius: '6px' }}>
                        OFFICIAL MINUTES
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                        <i className="fas fa-calendar-day mr-1" /> {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {m.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: '#475569', marginBottom: '12px' }}>
                      <i className="fas fa-user-tie" style={{ color: '#2563eb' }} />
                      <span>Presiding Chair: <strong style={{ color: '#0f172a' }}>{m.chair}</strong></span>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      fontSize: '0.875rem',
                      color: '#334155',
                      lineHeight: 1.6,
                      maxHeight: '140px',
                      overflowY: 'auto'
                    }}>
                      {m.recordsText}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Archived in Council Registry</span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="fas fa-print" /> Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CONDUCT REPORTS ── */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Category Filter Pills */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Category:</span>
              {['ALL', 'Uniform Violation', 'Tardiness / Truancy', 'Littering', 'Disorderly Conduct', 'Respect of Property'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setReportCategoryFilter(cat)}
                  style={{
                    background: reportCategoryFilter === cat ? '#1e293b' : '#f8fafc',
                    color: reportCategoryFilter === cat ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: reportCategoryFilter === cat ? '#1e293b' : '#e2e8f0',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {canFileReports && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-plus" /> File New Report
              </button>
            )}
          </div>

          {/* Conduct Reports List */}
          {filteredReports.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem' }}>
                <i className="fas fa-shield-check" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No Infractions Logged</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                {reportCategoryFilter !== 'ALL' ? 'No conduct incidents match the selected category filter.' : 'All students are in full compliance with the institutional dress and conduct code.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {filteredReports.map(report => (
                <div
                  key={report.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em'
                      }}>
                        {report.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                        {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      Student: {report.studentName}
                    </h4>

                    <p style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                      {report.narrative}
                    </p>

                    {report.hasPunishment && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#92400e', marginBottom: '6px' }}>
                        <i className="fas fa-gavel mr-1" />
                        <strong>Action / Sanction: </strong>
                        {report.punishment} ({report.punishmentLocation || 'Campus'})
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Reported by: <strong>{report.reportedBy?.name || 'Prefect on Duty'}</strong></span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>LOGGED</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ASSIGN DUTY SLOT ── */}
      {showDutyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <i className="fas fa-clipboard-check" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Schedule Prefect Duty Slot</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDutyModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDutySubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Prefect Name *</label>
                <input
                  type="text"
                  placeholder="Enter prefect full name..."
                  value={dutyForm.prefectName}
                  onChange={e => {
                    setDutyForm({ ...dutyForm, prefectName: e.target.value });
                    handleMemberSearch(e.target.value);
                    setIsMemberDropdownOpen(true);
                  }}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                />
                {isMemberDropdownOpen && memberSearchResults.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '140px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {memberSearchResults.map(m => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setDutyForm({ ...dutyForm, prefectName: m.name });
                          setIsMemberDropdownOpen(false);
                        }}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <strong>{m.name}</strong> ({m.role})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Campus Zone / Post *</label>
                  <select
                    value={dutyForm.zone}
                    onChange={e => setDutyForm({ ...dutyForm, zone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                  >
                    <option value="Main Gate">Main Gate</option>
                    <option value="Assembly Hall">Assembly Hall</option>
                    <option value="Dining Hall / Canteen">Dining Hall / Canteen</option>
                    <option value="Quadrangle / Corridors">Quadrangle / Corridors</option>
                    <option value="Library Quad">Library Quad</option>
                    <option value="Sports Pavilion">Sports Pavilion</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Day of Week *</label>
                  <select
                    value={dutyForm.day}
                    onChange={e => setDutyForm({ ...dutyForm, day: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Time Slot *</label>
                <select
                  value={dutyForm.timeSlot}
                  onChange={e => setDutyForm({ ...dutyForm, timeSlot: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="07:15 - 07:45 (Morning Assembly)">07:15 - 07:45 (Morning Assembly)</option>
                  <option value="10:30 - 11:00 (Break Time)">10:30 - 11:00 (Break Time)</option>
                  <option value="13:00 - 14:00 (Lunch Period)">13:00 - 14:00 (Lunch Period)</option>
                  <option value="16:00 - 16:30 (Dismissal)">16:00 - 16:30 (Dismissal)</option>
                  <option value="Full Day Supervision">Full Day Supervision</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDutyModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD MINUTES ── */}
      {showMeetingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '560px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <i className="fas fa-handshake" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Record Council Meeting Minutes</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleMeetingSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Meeting Agenda / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Term 1 General Prefect Assembly &amp; Gala Preparations"
                  value={meetingForm.title}
                  onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Date of Meeting *</label>
                  <input
                    type="date"
                    value={meetingForm.date}
                    onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Presiding Chair *</label>
                  <input
                    type="text"
                    placeholder="e.g. Head Boy / Head Girl"
                    value={meetingForm.chair}
                    onChange={e => setMeetingForm({ ...meetingForm, chair: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Proceedings &amp; Resolutions *</label>
                <textarea
                  rows={4}
                  placeholder="Summarize main agenda points discussed, resolutions voted on, and assigned prefect action items..."
                  value={meetingForm.recordsText}
                  onChange={e => setMeetingForm({ ...meetingForm, recordsText: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#9333ea', color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Publishing...' : 'Publish Minutes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: FILE CONDUCT REPORT ── */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <i className="fas fa-file-shield" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>File Student Conduct Case</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReportSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Student Name *</label>
                <input
                  type="text"
                  placeholder="Search student full name..."
                  value={reportForm.studentName}
                  onChange={e => {
                    setReportForm({ ...reportForm, studentName: e.target.value });
                    handleStudentSearch(e.target.value);
                    setIsStudentDropdownOpen(true);
                  }}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                />
                {isStudentDropdownOpen && studentSearchResults.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '140px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {studentSearchResults.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setReportForm({ ...reportForm, studentName: s.name });
                          setIsStudentDropdownOpen(false);
                        }}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <strong>{s.name}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Infraction Category *</label>
                <select
                  value={reportForm.category}
                  onChange={e => setReportForm({ ...reportForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', background: '#fff' }}
                >
                  <option value="Uniform Violation">Uniform Violation</option>
                  <option value="Tardiness / Truancy">Tardiness / Truancy</option>
                  <option value="Littering">Littering</option>
                  <option value="Disorderly Conduct">Disorderly Conduct</option>
                  <option value="Respect of Property">Respect of Property</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Incident Narrative / Details *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the nature of the violation, location on campus, and circumstances..."
                  value={reportForm.narrative}
                  onChange={e => setReportForm({ ...reportForm, narrative: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reportForm.hasPunishment}
                    onChange={e => setReportForm({ ...reportForm, hasPunishment: e.target.checked })}
                  />
                  <span>Immediate Corrective Action / Sanction Assigned</span>
                </label>

                {reportForm.hasPunishment && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. Grounds cleanup for 20 minutes, Uniform correction"
                      value={reportForm.punishment}
                      onChange={e => setReportForm({ ...reportForm, punishment: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', outline: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="Location: Assembly Grounds, Hallway, etc."
                      value={reportForm.punishmentLocation}
                      onChange={e => setReportForm({ ...reportForm, punishmentLocation: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#d97706', color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Submit Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
