import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface UrgentAnnouncement {
  id: string;
  title: string;
  body: string;
  category: string;
}

export default function UrgentAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<UrgentAnnouncement[]>([]);

  useEffect(() => {
    api.get('/api/announcements/urgent')
      .then(res => setAnnouncements(res.data))
      .catch(console.error);
  }, []);

  const markAsRead = (id: string) => {
    api.post(`/api/announcements/${id}/read`)
      .then(() => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      })
      .catch(console.error);
  };

  if (announcements.length === 0) return null;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      {announcements.map(ann => (
        <div 
          key={ann.id}
          style={{
            backgroundColor: '#e53e3e',
            color: 'white',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <div>
            <strong>URGENT:</strong> {ann.title} - {ann.body}
          </div>
          <button 
            onClick={() => markAsRead(ann.id)}
            style={{
              backgroundColor: 'white',
              color: '#e53e3e',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              marginLeft: '16px'
            }}
          >
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
