import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  createdAt: string;
  reads: { readAt: string }[];
}

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/announcements')
      .then(res => setAnnouncements(res.data.slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = (id: string) => {
    api.post(`/api/announcements/${id}/read`)
      .then(() => {
        setAnnouncements(prev => prev.map(a => 
          a.id === id ? { ...a, reads: [{ readAt: new Date().toISOString() }] } : a
        ));
      })
      .catch(console.error);
  };

  if (loading) {
    return <div>Loading announcements...</div>;
  }

  return (
    <div className="portal-stat-card" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>Announcements</h3>
        <a href="/teacher/announcements" style={{ fontSize: '0.875rem', color: 'var(--school-primary)' }}>View All</a>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {announcements.length === 0 ? (
          <p style={{ color: '#718096', fontSize: '0.875rem' }}>No announcements</p>
        ) : announcements.map(ann => {
          const isRead = ann.reads && ann.reads.length > 0;
          let borderColor = '#e2e8f0';
          if (ann.priority === 'URGENT') borderColor = '#e53e3e';
          else if (ann.category === 'ACADEMIC') borderColor = '#d69e2e';
          else if (ann.category === 'EVENTS') borderColor = '#3182ce';
          else if (ann.category === 'GENERAL') borderColor = '#38a169';

          return (
            <div 
              key={ann.id}
              style={{
                borderLeft: `4px solid ${borderColor}`,
                backgroundColor: isRead ? '#f7fafc' : '#ffffff',
                padding: '12px',
                borderRadius: '0 8px 8px 0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#2d3748', fontWeight: isRead ? 'normal' : 'bold' }}>
                  {ann.title}
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4a5568' }}>{ann.body}</p>
                <small style={{ color: '#a0aec0', display: 'block', marginTop: '4px' }}>
                  {new Date(ann.createdAt).toLocaleDateString()}
                </small>
              </div>
              {!isRead && (
                <button 
                  onClick={() => markAsRead(ann.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--school-primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    padding: '4px 8px'
                  }}
                >
                  Mark Read
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
