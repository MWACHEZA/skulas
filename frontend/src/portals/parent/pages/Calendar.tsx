import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import { SkeletonLoader } from '../../../components/shared';
import '../../../styles/portal.css';

interface CalendarEventItem {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  rawDate: Date;
  time: string;
  category: 'Academic' | 'Holiday' | 'Sports' | 'Event' | 'Exam';
  location: string;
  description?: string;
  isImportant?: boolean;
}

export default function ParentCalendar() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const mergedEvents: CalendarEventItem[] = [];

      // 1. Fetch holidays from /api/schools/holidays
      try {
        const holidayRes = await api.get('/api/schools/holidays');
        if (Array.isArray(holidayRes.data)) {
          holidayRes.data.forEach((h: any) => {
            const rawDate = h.startDate || h.date || h.createdAt;
            if (rawDate) {
              const d = new Date(rawDate);
              mergedEvents.push({
                id: `hol-${h.id || Math.random()}`,
                title: h.title || h.name || 'School Holiday',
                dateStr: d.toISOString().slice(0, 10),
                rawDate: d,
                time: 'All Day',
                category: 'Holiday',
                location: 'Campus Wide',
                description: h.content || h.description || 'Official school holiday / break',
                isImportant: true
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not load holidays:', e);
      }

      // 2. Fetch announcements & notices from /api/content/announcements
      try {
        const noticesRes = await api.get('/api/content/announcements');
        if (Array.isArray(noticesRes.data)) {
          noticesRes.data.forEach((a: any) => {
            const rawDate = a.eventDate || a.publishedAt || a.createdAt;
            if (rawDate) {
              const d = new Date(rawDate);
              const catLower = (a.category || '').toLowerCase();
              let cat: CalendarEventItem['category'] = 'Event';
              if (catLower.includes('academic') || catLower.includes('exam')) cat = 'Academic';
              else if (catLower.includes('sport')) cat = 'Sports';
              else if (catLower.includes('holiday')) cat = 'Holiday';

              mergedEvents.push({
                id: `ann-${a.id || Math.random()}`,
                title: a.title,
                dateStr: d.toISOString().slice(0, 10),
                rawDate: d,
                time: a.eventTime || '09:00 - 15:00',
                category: cat,
                location: a.location || 'School Grounds',
                description: a.content || a.summary || '',
                isImportant: a.isUrgent || false
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not load announcements:', e);
      }

      // 3. Fetch noticeboard items from /api/website-settings/noticeboard
      try {
        const nbRes = await api.get('/api/website-settings/noticeboard');
        if (Array.isArray(nbRes.data)) {
          nbRes.data.forEach((nb: any) => {
            const rawDate = nb.date || nb.createdAt;
            if (rawDate) {
              const d = new Date(rawDate);
              mergedEvents.push({
                id: `nb-${nb.id || Math.random()}`,
                title: nb.title,
                dateStr: d.toISOString().slice(0, 10),
                rawDate: d,
                time: 'Campus Scheduled',
                category: 'Event',
                location: 'Campus Wide',
                description: nb.content || 'School Noticeboard bulletin',
                isImportant: false
              });
            }
          });
        }
      } catch (e) {
        console.warn('Could not load noticeboard:', e);
      }

      // Deduplicate events by title + dateStr
      const seen = new Set<string>();
      const dedupedEvents = mergedEvents.filter(ev => {
        const key = `${ev.title}-${ev.dateStr}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      dedupedEvents.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
      setEvents(dedupedEvents);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      showToast('Could not load some calendar events.', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Generate iCal (.ics) file
  const handleExportICal = () => {
    if (events.length === 0) {
      showToast('No calendar events available to export.', 'info');
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Acadex Educational Systems//School Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach(ev => {
      const startStr = ev.dateStr.replace(/-/g, '');
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`SUMMARY:${ev.title.replace(/,/g, '\\,')}`);
      icsContent.push(`DTSTART;VALUE=DATE:${startStr}`);
      icsContent.push(`LOCATION:${ev.location.replace(/,/g, '\\,')}`);
      icsContent.push(`DESCRIPTION:${(ev.description || ev.title).replace(/,/g, '\\,')}`);
      icsContent.push(`CATEGORIES:${ev.category}`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `School_Calendar_${viewDate.getFullYear()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Calendar exported (.ics). Importable to Apple, Google & Outlook calendars.', 'success');
  };

  // Download printable term planner
  const handleDownloadPlanner = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocked. Please allow pop-ups to print the term planner.', 'error');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Academic Term Planner - Calendar</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
          h1 { margin: 0 0 4px; font-size: 24px; color: #0f172a; }
          p { margin: 0 0 24px; color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Academic Calendar & Term Planner</h1>
        <p>Generated on ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Event Title</th>
              <th>Category</th>
              <th>Time</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${events.map(e => `
              <tr>
                <td><strong>${new Date(e.rawDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</strong></td>
                <td>${e.title}</td>
                <td><span class="badge">${e.category}</span></td>
                <td>${e.time}</td>
                <td>${e.location}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    showToast('Term planner ready for printing / saving as PDF.', 'success');
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.dateStr === dateStr);
      days.push({ day, dateStr, events: dayEvents });
    }
    return days;
  }, [viewDate, events]);

  // Filtered upcoming events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesDay = selectedDayStr ? e.dateStr === selectedDayStr : true;
      const matchesCategory = selectedCategory === 'ALL' || e.category.toUpperCase() === selectedCategory;
      return matchesDay && matchesCategory;
    });
  }, [events, selectedDayStr, selectedCategory]);

  const getCategoryTheme = (cat: CalendarEventItem['category']) => {
    switch (cat) {
      case 'Academic':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6', icon: 'fa-graduation-cap' };
      case 'Holiday':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444', icon: 'fa-umbrella-beach' };
      case 'Sports':
        return { bg: '#f0fdf4', text: '#15803d', border: '#22c55e', icon: 'fa-running' };
      case 'Exam':
        return { bg: '#fef3c7', text: '#b45309', border: '#f59e0b', icon: 'fa-file-alt' };
      case 'Event':
      default:
        return { bg: '#f5f3ff', text: '#6d28d9', border: '#8b5cf6', icon: 'fa-calendar-star' };
    }
  };

  return (
    <div className="portal-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }}>
      
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--school-primary, #2563eb) 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.25rem',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
          }}>
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
              School Calendar & Key Dates
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Term dates, consultations, sporting fixtures, public holidays, and administrative deadlines.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="portal-btn-ghost"
            style={{ fontWeight: 800, padding: '9px 16px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={handleExportICal}
          >
            <i className="fas fa-calendar-plus" style={{ color: 'var(--school-primary, #2563eb)' }}></i>
            <span>Sync to Calendar (.ics)</span>
          </button>
          <button
            type="button"
            className="portal-btn-primary"
            style={{ fontWeight: 800, padding: '9px 18px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={handleDownloadPlanner}
          >
            <i className="fas fa-print"></i>
            <span>Download Term Planner</span>
          </button>
        </div>
      </div>

      {/* ── TWO-COLUMN CALENDAR & EVENTS LAYOUT ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: INTERACTIVE MONTH CALENDAR WIDGET */}
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          padding: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          {/* Calendar Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--school-primary, #2563eb)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Monthly View
              </div>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '6px 10px', borderRadius: 8, fontSize: '0.8rem' }}
                onClick={() => {
                  const d = new Date(viewDate);
                  d.setMonth(d.getMonth() - 1);
                  setViewDate(d);
                }}
                title="Previous Month"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}
                onClick={() => {
                  setViewDate(new Date());
                  setSelectedDayStr(null);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="portal-btn-ghost"
                style={{ padding: '6px 10px', borderRadius: 8, fontSize: '0.8rem' }}
                onClick={() => {
                  const d = new Date(viewDate);
                  d.setMonth(d.getMonth() + 1);
                  setViewDate(d);
                }}
                title="Next Month"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', marginBottom: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} style={{ height: 42, background: 'transparent' }}></div>;
              }

              const isSelected = selectedDayStr === cell.dateStr;
              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);
              const hasEvents = cell.events.length > 0;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    setSelectedDayStr(isSelected ? null : cell.dateStr);
                  }}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    border: isSelected
                      ? '2px solid var(--school-primary, #2563eb)'
                      : isToday
                      ? '2px solid #0284c7'
                      : '1px solid #f1f5f9',
                    background: isSelected
                      ? 'var(--school-primary-light, #eff6ff)'
                      : hasEvents
                      ? '#f8fafc'
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: isToday || isSelected ? 900 : hasEvents ? 700 : 500,
                    color: isSelected
                      ? 'var(--school-primary, #2563eb)'
                      : isToday
                      ? '#0284c7'
                      : '#334155'
                  }}>
                    {cell.day}
                  </span>

                  {/* Indicator Dot */}
                  {hasEvents && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {cell.events.slice(0, 3).map((e, dotIdx) => (
                        <div
                          key={dotIdx}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: getCategoryTheme(e.category).border
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filter Reset pill when a date is selected */}
          {selectedDayStr && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem'
            }}>
              <span style={{ color: '#1e40af', fontWeight: 700 }}>
                Filtering by: {new Date(selectedDayStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayStr(null)}
                style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Clear Filter ✕
              </button>
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.75rem', color: '#64748b' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></span> Academic
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span> Holiday
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></span> Sports
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}></span> Events
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: UPCOMING EVENTS FEED WITH CATEGORY FILTERS */}
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          padding: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Filter Pills */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-bullhorn" style={{ color: '#ea580c' }}></i>
                <span>Events & Schedules</span>
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                {filteredEvents.length} Event{filteredEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Category filter pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', 'ACADEMIC', 'HOLIDAY', 'SPORTS', 'EVENT', 'EXAM'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    border: 'none',
                    background: selectedCategory === cat ? 'var(--school-primary, #2563eb)' : '#f1f5f9',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SkeletonLoader type="card" count={3} />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#cbd5e1',
                fontSize: '1.25rem'
              }}>
                <i className="far fa-calendar-times"></i>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                No Events Scheduled
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                {selectedDayStr
                  ? 'There are no calendar activities recorded for this specific date.'
                  : 'No scheduled school events found matching your category filter.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredEvents.map(ev => {
                const theme = getCategoryTheme(ev.category);
                const evDate = new Date(ev.rawDate);
                const monthStr = evDate.toLocaleDateString('en-GB', { month: 'short' });
                const dayNum = evDate.getDate();

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      gap: 16,
                      padding: 16,
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                      borderLeft: `4px solid ${theme.border}`
                    }}
                  >
                    {/* Date Pill Block */}
                    <div style={{
                      width: 58,
                      height: 58,
                      borderRadius: 12,
                      background: theme.bg,
                      border: `1px solid ${theme.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <div style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: theme.text,
                        letterSpacing: '0.04em'
                      }}>
                        {monthStr}
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: theme.text, lineHeight: 1 }}>
                        {dayNum}
                      </div>
                    </div>

                    {/* Content Block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                          {ev.title}
                        </h4>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: theme.bg,
                          color: theme.text,
                          padding: '3px 8px',
                          borderRadius: 12,
                          letterSpacing: '0.04em'
                        }}>
                          <i className={`fas ${theme.icon} mr-1`} style={{ fontSize: '0.62rem' }}></i>
                          {ev.category}
                        </span>
                      </div>

                      {ev.description && (
                        <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                          {ev.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <i className="far fa-clock" style={{ color: '#94a3b8' }}></i>
                          {ev.time}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#94a3b8' }}></i>
                          {ev.location}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
