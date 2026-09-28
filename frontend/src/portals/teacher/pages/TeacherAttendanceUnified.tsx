import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TeacherClassAttendance from './ClassAttendance';
import QRAttendance from '../../shared/pages/attendance/QRAttendance';
import DailyStudentAttendanceReport from '../../shared/pages/attendance/DailyStudentAttendanceReport';

export type TeacherAttendanceTab = 'roll-call' | 'qr' | 'reports';

export default function TeacherAttendanceUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TeacherAttendanceTab) || 'roll-call';
  const [activeTab, setActiveTab] = useState<TeacherAttendanceTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TeacherAttendanceTab;
    if (tabParam && ['roll-call', 'qr', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TeacherAttendanceTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-clipboard-check" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Classroom Attendance & Roll Call
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Record daily student presence, generate automated QR check-in codes, and review class attendance history.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('roll-call')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'roll-call' ? 700 : 500,
            color: activeTab === 'roll-call' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'roll-call' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-user-check" />
          Roll Call Register
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('qr')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'qr' ? 700 : 500,
            color: activeTab === 'qr' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'qr' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-qrcode" />
          QR Code Attendance
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('reports')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'reports' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-chart-line" />
          Attendance Reports
        </button>
      </div>

      <div>
        {activeTab === 'roll-call' && <TeacherClassAttendance />}
        {activeTab === 'qr' && <QRAttendance />}
        {activeTab === 'reports' && <DailyStudentAttendanceReport />}
      </div>
    </div>
  );
}
