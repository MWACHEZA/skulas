import React, { useState } from 'react';

export default function TeacherTimetable() {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>My Timetable</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Schedule and period distribution for classes and teacher duties.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'today' ? 600 : 400,
            color: activeTab === 'today' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'today' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab('week')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'week' ? 600 : 400,
            color: activeTab === 'week' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'week' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Weekly Grid
        </button>
      </div>

      {activeTab === 'today' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 12 }}>Today's Schedule</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Current period countdown and today's assigned lessons and duties appear here.</p>
        </div>
      )}

      {activeTab === 'week' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 12 }}>Weekly Grid</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Full weekly timetable view combining classes, duties, and free periods.</p>
        </div>
      )}
    </div>
  );
}
