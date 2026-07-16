import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO
} from 'date-fns';
import api from '../lib/api';

interface NoticeboardEvent {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function Noticeboard() {
  const school = useSchool();
  const { schoolCode: urlSchoolCode } = useParams<{ schoolCode: string }>();
  const schoolCode = (urlSchoolCode || school?.code || 'AX-EMBAKWE').toUpperCase();
  const schoolName = school?.name || 'our school';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<NoticeboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<NoticeboardEvent | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [schoolCode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/public/noticeboard', { params: { schoolCode } });
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch public noticeboard events', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  // Filters events by search term
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${schoolCode}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  // Calendar render parts
  const renderHeader = () => {
    const dateFormat = "MMMM yyyy";
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={prevMonth} className="portal-btn-secondary" style={{ padding: '8px 14px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button onClick={nextMonth} className="portal-btn-secondary" style={{ padding: '8px 14px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button onClick={today} className="portal-btn-secondary" style={{ padding: '8px 16px', background: 'var(--school-primary, #0056b3)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Today
          </button>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {format(currentDate, dateFormat)}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div style={{ textAlign: 'center', fontWeight: 'bold', padding: '12px 0', color: 'white', backgroundColor: 'var(--school-primary, #0056b3)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }} key={i}>
          {format(addDays(startDate, i), "EEE")}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e2e8f0', borderBottom: 'none' }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.date), cloneDay));
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isSameDay(day, new Date());

        days.push(
          <div
            style={{
              minHeight: '120px',
              padding: '10px',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              position: 'relative',
              backgroundColor: !isCurrentMonth ? '#f8fafc' : isCurrentDay ? 'rgba(0, 86, 179, 0.04)' : '#ffffff',
              color: !isCurrentMonth ? '#94a3b8' : isCurrentDay ? 'var(--school-primary, #0056b3)' : '#334155',
              transition: 'background-color 0.2s',
            }}
            key={day.toString()}
          >
            <span style={isCurrentDay ? {
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--school-primary, #0056b3)',
              color: 'white',
              borderRadius: '50%',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            } : { fontSize: '0.85rem', fontWeight: 600 }}>
              {formattedDate}
            </span>
            
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {dayEvents.map(event => (
                <div 
                  key={event.id} 
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '6px 8px',
                    backgroundColor: 'var(--school-primary, #0056b3)',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'transform 0.15s ease'
                  }}
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderLeft: '1px solid #e2e8f0' }} key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <>
      <section className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '15px', color: 'var(--banner-title-color, white)' }}>School Noticeboard</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto', opacity: 0.9 }}>Check out calendar events, announcements, and key notice items at <span className="acadex-school-name">{schoolName}</span></p>
        </div>
      </section>

      <section style={{ padding: '60px 20px', minHeight: '60vh' }}>
        <div className="container">
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`portal-btn-${viewMode === 'calendar' ? 'primary' : 'neutral'}`}
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="far fa-calendar-alt"></i> Calendar View
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`portal-btn-${viewMode === 'list' ? 'primary' : 'neutral'}`}
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-list"></i> List View
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', color: '#94a3b8' }}></i>
              <input 
                type="text" 
                placeholder="Search notices..." 
                className="portal-input"
                style={{ paddingLeft: '36px', width: '280px', borderRadius: '8px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: '15px', color: '#64748b' }}>Loading noticeboard events...</p>
            </div>
          ) : viewMode === 'calendar' ? (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '24px' }}>
              {renderHeader()}
              <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                {renderDays()}
                {renderCells()}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                  <i className="far fa-bell-slash fa-4x" style={{ color: '#cbd5e1', marginBottom: '20px' }}></i>
                  <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No notices matching your filters.</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="portal-card" 
                    onClick={() => setSelectedEvent(event)}
                    style={{ padding: '24px', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(0, 86, 179, 0.08)', color: 'var(--school-primary, #0056b3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                          Notice item
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                          {format(parseISO(event.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', color: '#1e293b', margin: '0 0 12px 0', fontWeight: 800 }}>{event.title}</h3>
                      <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {event.content.length > 120 ? event.content.substring(0, 120) + '...' : event.content}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--school-primary, #0056b3)', fontWeight: 700 }}>
                        View details <i className="fas fa-arrow-right ml-1"></i>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* Notice Detail Overlay Modal */}
      {selectedEvent && (
        <div className="portal-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedEvent(null)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: '600px', width: '95%', padding: '30px', borderRadius: '16px', position: 'relative', background: 'white', color: '#1e293b', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', background: 'rgba(0, 86, 179, 0.08)', color: 'var(--school-primary, #0056b3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, display: 'inline-block', marginBottom: '6px' }}>
                  Notice detail
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px', color: '#475569', fontSize: '1.05rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
              {selectedEvent.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#94a3b8', fontSize: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <span>Event Date: <strong>{format(parseISO(selectedEvent.date), 'MMMM dd, yyyy')}</strong></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
