import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TeacherClassAttendance from './ClassAttendance';
import ClassroomQRAttendance from './ClassroomQRAttendance';
import ClassroomAttendanceReports from './ClassroomAttendanceReports';

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
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px 30px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-clipboard-check" style={{ color: '#38bdf8' }} />
            Classroom Attendance & Roll Call
          </h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.92rem' }}>
            Record daily student presence, generate automated QR check-in codes, and review class attendance history.
          </p>
        </div>
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
          padding: '8px 16px 0 16px',
          borderRadius: '12px 12px 0 0'
        }}
      >
        <button
          type="button"
          data-tour="attendance-take-btn"
          onClick={() => handleTabChange('roll-call')}
          style={{
            padding: '12px 20px',
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
            padding: '12px 20px',
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
            padding: '12px 20px',
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
        {activeTab === 'qr' && <ClassroomQRAttendance />}
        {activeTab === 'reports' && <ClassroomAttendanceReports />}
      </div>
    </div>
  );
}
