import React, { useState } from 'react';

export default function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState('roll-call');
  const [classId, setClassId] = useState('');
  const [session, setSession] = useState('Morning');

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>Attendance & Roll Call</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage daily roll call, instant QR code check-ins, and chronic absenteeism analytics.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('roll-call')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'roll-call' ? 600 : 400,
            color: activeTab === 'roll-call' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'roll-call' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Daily Roll Call
        </button>
        <button
          onClick={() => setActiveTab('qr-scan')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'qr-scan' ? 600 : 400,
            color: activeTab === 'qr-scan' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'qr-scan' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          QR Scanner
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'reports' ? 600 : 400,
            color: activeTab === 'reports' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'reports' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Reports & Analytics
        </button>
      </div>

      {activeTab === 'roll-call' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Daily Roll Call</h2>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 4 }}>Class ID</label>
              <input
                type="text"
                value={classId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassId(e.target.value)}
                placeholder="e.g. Form 1A"
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 4 }}>Session</label>
              <select
                value={session}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSession(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
              </select>
            </div>
          </div>
          <button style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
            Fetch Roll Call
          </button>
        </div>
      )}

      {activeTab === 'qr-scan' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>QR Code Session</h2>
          <button style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
            Generate QR Code
          </button>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#64748b' }}>
            Students can scan this expiring code to mark attendance for the current period.
          </p>
        </div>
      )}

      {activeTab === 'reports' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Attendance Reports</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Chronic absentee flags and historical roll-call logs will appear here.</p>
        </div>
      )}
    </div>
  );
}
