import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';
import '../../../styles/portal.css';

export interface CalendarEvent {
  id: string;
  title: string;
  content?: string | null;
  startDate: string;
  endDate: string;
  category?: string;
  isPublished?: boolean;
}

const EVENT_CATEGORIES: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
  HOLIDAY: { label: 'Public Holiday / Break', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: 'fa-umbrella-beach' },
  EXAM: { label: 'Examinations & Assessments', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: 'fa-file-alt' },
  SPORTS: { label: 'Sports & Co-Curricular', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: 'fa-running' },
  ACADEMIC: { label: 'Academic Deadline', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', icon: 'fa-graduation-cap' },
  PARENT: { label: 'Parents Consultation', bg: '#fffbeb', color: '#92400e', border: '#fde68a', icon: 'fa-users' },
  ASSEMBLY: { label: 'Assembly & Devotion', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', icon: 'fa-church' },
  NOTICE: { label: 'General Announcement', bg: '#f8fafc', color: '#334155', border: '#cbd5e1', icon: 'fa-bullhorn' }
};

export default function Holiday() {
  const { showToast, toastConfirm } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calendar Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalForm, setModalForm] = useState({
    title: '',
    content: '',
    category: 'HOLIDAY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    publishNoticeboard: true
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/schools/holidays');
      const list = Array.isArray(res.data) ? res.data : [];
      setEvents(list);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      showToast('Failed to load academic calendar events', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Open modal for new event or selected date
  const handleOpenAddModal = (dateStr?: string) => {
    const d = dateStr || new Date().toISOString().split('T')[0];
    setEditingEvent(null);
    setModalForm({
      title: '',
      content: '',
      category: 'HOLIDAY',
      startDate: d,
      endDate: d,
      publishNoticeboard: true
    });
    setShowModal(true);
  };

  // Open modal to edit existing event
  const handleOpenEditModal = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    const start = ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : '';
    const end = ev.endDate ? new Date(ev.endDate).toISOString().split('T')[0] : start;

    // Detect category from title/content
    let cat = ev.category || 'HOLIDAY';
    const lower = `${ev.title} ${ev.content || ''}`.toLowerCase();
    if (lower.includes('exam') || lower.includes('test')) cat = 'EXAM';
    else if (lower.includes('sport') || lower.includes('gala')) cat = 'SPORTS';
    else if (lower.includes('parent') || lower.includes('consultation')) cat = 'PARENT';
    else if (lower.includes('assembly') || lower.includes('service')) cat = 'ASSEMBLY';
    else if (lower.includes('deadline') || lower.includes('registration')) cat = 'ACADEMIC';

    setModalForm({
      title: ev.title,
      content: ev.content || '',
      category: cat,
      startDate: start,
      endDate: end,
      publishNoticeboard: true
    });
    setShowModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title.trim()) {
      showToast('Please enter an event title', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editingEvent) {
        await api.put(`/api/schools/holidays/${editingEvent.id}`, modalForm);
        showToast('Event updated and published across all campus pages!', 'success');
      } else {
        await api.post('/api/schools/holidays', modalForm);
        showToast('Event scheduled and published across all campus pages!', 'success');
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      console.error('Failed to save event:', err);
      showToast('Failed to save event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (toastConfirm && !await toastConfirm(`Remove event "${title}" from the academic calendar?`)) {
      return;
    }
    try {
      await api.delete(`/api/schools/holidays/${id}`);
      showToast('Event removed from academic calendar', 'success');
      if (showModal) setShowModal(false);
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      showToast('Failed to delete event', 'error');
    }
  };

  // Calendar math
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter events by category
  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'ALL') return events;
    return events.filter(ev => {
      const lower = `${ev.title} ${ev.content || ''}`.toLowerCase();
      if (selectedCategory === 'HOLIDAY') return lower.includes('holiday') || lower.includes('break') || lower.includes('easter') || lower.includes('independence') || lower.includes('christmas');
      if (selectedCategory === 'EXAM') return lower.includes('exam') || lower.includes('test') || lower.includes('cbt');
      if (selectedCategory === 'SPORTS') return lower.includes('sport') || lower.includes('athletics') || lower.includes('gala');
      if (selectedCategory === 'PARENT') return lower.includes('parent') || lower.includes('consultation') || lower.includes('sdc');
      if (selectedCategory === 'ASSEMBLY') return lower.includes('assembly') || lower.includes('chapel') || lower.includes('devotion');
      if (selectedCategory === 'ACADEMIC') return lower.includes('deadline') || lower.includes('registration') || lower.includes('term');
      return true;
    });
  }, [events, selectedCategory]);

  // Check if an event falls on a specific date (YYYY-MM-DD)
  const getEventsForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const targetDateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;

    return filteredEvents.filter(ev => {
      if (!ev.startDate) return false;
      const startStr = new Date(ev.startDate).toISOString().split('T')[0];
      const endStr = ev.endDate ? new Date(ev.endDate).toISOString().split('T')[0] : startStr;
      return targetDateStr >= startStr && targetDateStr <= endStr;
    });
  };

  const todayDateStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Top Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-calendar-alt" style={{ color: '#0284c7' }} />
            Academic Calendar &amp; Institutional Events
          </h1>
          <p>
            Receptionist and Administrator event scheduling desk. Add daily events, breaks, exams, and notices with instant campus-wide publishing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleOpenAddModal()}
            className="portal-btn-primary"
            style={{
              height: 42,
              padding: '0 20px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <i className="fas fa-calendar-plus" /> Schedule Event
          </button>
        </div>
      </div>

      {/* Control & Navigation Toolbar */}
      <div 
        className="portal-card" 
        style={{ 
          padding: '14px 20px', 
          borderRadius: 12, 
          border: '1px solid #e2e8f0', 
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={prevMonth}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Previous Month"
          >
            <i className="fas fa-chevron-left" style={{ color: '#475569' }} />
          </button>

          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', minWidth: 200, textAlign: 'center' }}>
            {monthName} {currentYear}
          </h2>

          <button
            onClick={nextMonth}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Next Month"
          >
            <i className="fas fa-chevron-right" style={{ color: '#475569' }} />
          </button>

          <button
            onClick={goToToday}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
        </div>

        {/* Category Filter & View Mode */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="portal-select"
            style={{ height: 38, borderRadius: 8, fontSize: '0.85rem', minWidth: 160 }}
          >
            <option value="ALL">All Categories</option>
            {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.label}</option>
            ))}
          </select>

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'calendar' ? '#ffffff' : 'transparent',
                color: viewMode === 'calendar' ? '#1e293b' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="fas fa-calendar-alt" /> Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'agenda' ? '#ffffff' : 'transparent',
                color: viewMode === 'agenda' ? '#1e293b' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="fas fa-list" /> Agenda
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="portal-card" style={{ padding: 24, borderRadius: 12 }}>
          <SkeletonLoader type="table" rows={6} columns={7} />
        </div>
      ) : viewMode === 'calendar' ? (
        /* Interactive Month View Calendar Grid */
        <div className="portal-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', padding: 0 }}>
          {/* Day of Week Headers */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              background: '#f8fafc', 
              borderBottom: '1px solid #e2e8f0',
              textAlign: 'center',
              fontWeight: 700,
              color: '#475569',
              fontSize: '0.85rem'
            }}
          >
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
              <div key={d} style={{ padding: '12px 6px', color: i === 0 || i === 6 ? '#0284c7' : '#334155' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gridAutoRows: 'minmax(110px, auto)' 
            }}
          >
            {/* Blank cells before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: '#fafbfc', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', minHeight: 110 }} />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const pad = (n: number) => String(n).padStart(2, '0');
              const thisDateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
              const isToday = thisDateStr === todayDateStr;
              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={day}
                  style={{
                    borderRight: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9',
                    padding: '8px',
                    minHeight: 110,
                    background: isToday ? '#f0f9ff' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span 
                      style={{ 
                        fontWeight: isToday ? 900 : 700, 
                        fontSize: '0.88rem', 
                        color: isToday ? '#0284c7' : '#1e293b',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: isToday ? '#0284c7' : 'transparent',
                        color: isToday ? '#ffffff' : '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {day}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(thisDateStr)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 2,
                        fontSize: '0.78rem'
                      }}
                      title={`Add event for ${thisDateStr}`}
                    >
                      <i className="fas fa-plus" />
                    </button>
                  </div>

                  {/* Day Events Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, flex: 1 }}>
                    {dayEvents.map(ev => {
                      const lower = `${ev.title} ${ev.content || ''}`.toLowerCase();
                      let cat = EVENT_CATEGORIES.NOTICE;
                      if (lower.includes('holiday') || lower.includes('break')) cat = EVENT_CATEGORIES.HOLIDAY;
                      else if (lower.includes('exam') || lower.includes('test')) cat = EVENT_CATEGORIES.EXAM;
                      else if (lower.includes('sport')) cat = EVENT_CATEGORIES.SPORTS;
                      else if (lower.includes('parent')) cat = EVENT_CATEGORIES.PARENT;
                      else if (lower.includes('assembly')) cat = EVENT_CATEGORIES.ASSEMBLY;
                      else if (lower.includes('deadline')) cat = EVENT_CATEGORIES.ACADEMIC;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => handleOpenEditModal(ev)}
                          style={{
                            background: cat.bg,
                            color: cat.color,
                            border: `1px solid ${cat.border}`,
                            borderRadius: 6,
                            padding: '3px 6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={`${ev.title}${ev.content ? ` - ${ev.content}` : ''} (Click to edit)`
                        >
                          <i className={`fas ${cat.icon}`} style={{ fontSize: '0.65rem' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda List View */
        <div className="portal-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {filteredEvents.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-calendar-check fa-3x" style={{ color: '#cbd5e1', marginBottom: 16 }} />
              <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>No Events Scheduled</h3>
              <p style={{ fontSize: '0.88rem', marginTop: 4 }}>
                Add your school terms, public holidays, examination weeks, and sports days.
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="portal-btn-primary"
                style={{ height: 42, padding: '0 20px', borderRadius: 10, marginTop: 12 }}
              >
                <i className="fas fa-calendar-plus" /> Add First Event
              </button>
            </div>
          ) : (
            <table className="portal-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 18px' }}>Event Title &amp; Details</th>
                  <th style={{ padding: '12px 18px' }}>Category</th>
                  <th style={{ padding: '12px 18px' }}>Start Date</th>
                  <th style={{ padding: '12px 18px' }}>End Date</th>
                  <th style={{ padding: '12px 18px' }}>Broadcast / Publishing</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(ev => {
                  const lower = `${ev.title} ${ev.content || ''}`.toLowerCase();
                  let cat = EVENT_CATEGORIES.NOTICE;
                  if (lower.includes('holiday') || lower.includes('break')) cat = EVENT_CATEGORIES.HOLIDAY;
                  else if (lower.includes('exam') || lower.includes('test')) cat = EVENT_CATEGORIES.EXAM;
                  else if (lower.includes('sport')) cat = EVENT_CATEGORIES.SPORTS;
                  else if (lower.includes('parent')) cat = EVENT_CATEGORIES.PARENT;
                  else if (lower.includes('assembly')) cat = EVENT_CATEGORIES.ASSEMBLY;
                  else if (lower.includes('deadline')) cat = EVENT_CATEGORIES.ACADEMIC;

                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.92rem' }}>
                          {ev.title}
                        </div>
                        {ev.content && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                            {ev.content}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{ 
                            background: cat.bg, 
                            color: cat.color, 
                            border: `1px solid ${cat.border}`,
                            padding: '3px 8px', 
                            borderRadius: 6, 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <i className={`fas ${cat.icon}`} />
                          {cat.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                        {new Date(ev.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                        {ev.endDate ? new Date(ev.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Same Day'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{ 
                            background: '#dcfce7', 
                            color: '#166534', 
                            padding: '3px 8px', 
                            borderRadius: 6, 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <i className="fas fa-check-circle" /> Live Campus-Wide
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(ev)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Edit Event"
                          >
                            <i className="fas fa-edit" style={{ fontSize: '0.8rem' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1px solid #fee2e2',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete Event"
                          >
                            <i className="fas fa-trash-alt" style={{ fontSize: '0.8rem' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 540, borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {editingEvent ? 'Edit Scheduled Event' : 'Schedule New Event'}
              </h2>
              <button onClick={() => setShowModal(false)} className="close-modal">&times;</button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="portal-label">Event Title *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Mid-Term Break, Sports Gala, End of Term Exam"
                    value={modalForm.title}
                    onChange={e => setModalForm({ ...modalForm, title: e.target.value })}
                    required
                    style={{ height: 42, borderRadius: 8 }}
                  />
                </div>

                <div>
                  <label className="portal-label">Event Category / Type</label>
                  <select
                    className="portal-select"
                    value={modalForm.category}
                    onChange={e => setModalForm({ ...modalForm, category: e.target.value })}
                    style={{ height: 42, borderRadius: 8 }}
                  >
                    {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="portal-label">Start Date *</label>
                    <input
                      type="date"
                      className="portal-input"
                      value={modalForm.startDate}
                      onChange={e => setModalForm({ ...modalForm, startDate: e.target.value })}
                      required
                      style={{ height: 42, borderRadius: 8 }}
                    />
                  </div>

                  <div>
                    <label className="portal-label">End Date</label>
                    <input
                      type="date"
                      className="portal-input"
                      value={modalForm.endDate}
                      onChange={e => setModalForm({ ...modalForm, endDate: e.target.value })}
                      style={{ height: 42, borderRadius: 8 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="portal-label">Event Description &amp; Details</label>
                  <textarea
                    className="portal-input"
                    placeholder="Provide details, venue, time, or instructions..."
                    value={modalForm.content}
                    onChange={e => setModalForm({ ...modalForm, content: e.target.value })}
                    style={{ minHeight: 80, borderRadius: 8, padding: '10px 14px' }}
                  />
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#166534' }}>
                    <input
                      type="checkbox"
                      checked={modalForm.publishNoticeboard}
                      onChange={e => setModalForm({ ...modalForm, publishNoticeboard: e.target.checked })}
                    />
                    Publish instantly across all portals (Student, Parent &amp; Public Noticeboard)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id, editingEvent.title)}
                    className="portal-btn-ghost"
                    style={{ height: 42, padding: '0 16px', borderRadius: 10, color: '#dc2626' }}
                  >
                    <i className="fas fa-trash-alt mr-1" /> Delete
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="portal-btn-ghost"
                    style={{ height: 42, padding: '0 18px', borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="portal-btn-primary"
                    disabled={saving}
                    style={{ height: 42, padding: '0 24px', borderRadius: 10, fontWeight: 700 }}
                  >
                    {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : <i className="fas fa-check mr-2" />}
                    {editingEvent ? 'Save & Publish' : 'Create & Publish'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
