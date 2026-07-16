import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function StudentEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/api/website-settings/noticeboard');
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch noticeboard events', error);
    
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = 'var(--school-primary, #3182ce)';

  return (
    <>
      <div className="portal-page-header">
        <h1>Events Noticeboard</h1>
        <p>Upcoming school events, calendar notices, and activities.</p>
      </div>
      
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin"></i> Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="portal-card" style={{ padding: '40px 20px', textAlign: 'center', color: '#718096' }}>
          <i className="far fa-calendar-alt fa-3x" style={{ marginBottom: '15px', color: '#cbd5e0' }}></i>
          <h3>No events found</h3>
          <p style={{ margin: 0 }}>There are currently no events posted on the school noticeboard.</p>
        </div>
      ) : (
        <div className="portal-grid-3">
          {events.map((e) => (
            <div key={e.id} className="portal-card" style={{ marginBottom: 0, borderTop: `4px solid ${primaryColor}` }}>
              <div className="portal-card-body" style={{ padding: 24 }}>
                <span className="portal-badge info" style={{ marginBottom: 10, display: 'inline-block' }}>School Notice</span>
                <h3 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800 }}>{e.title}</h3>
                <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#4a5568', lineHeight: 1.5 }}>{e.content}</p>
                <div style={{ fontSize: '0.82rem', color: '#718096', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><i className="fas fa-calendar-day" style={{ width: 20, color: 'var(--portal-primary)' }}></i> {new Date(e.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
