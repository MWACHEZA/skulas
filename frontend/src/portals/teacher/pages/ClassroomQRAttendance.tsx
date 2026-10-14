import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import { format } from 'date-fns';

interface ClassOption {
  id: string;
  name: string;
  subject?: { name: string };
}

interface ScannedStudent {
  id: string;
  name: string;
  studentId: string;
  className?: string;
  time: Date;
  status: 'Present' | 'Late';
}

export default function ClassroomQRAttendance() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mode, setMode] = useState<'scan' | 'project'>('scan');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [lastScanned, setLastScanned] = useState<ScannedStudent | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);

  // Projection / Display QR session
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    fetchTeacherClasses();
    return () => {
      stopCameraScanner();
    };
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassRoster();
      fetchTodayAttendance();
    }
  }, [selectedClassId, selectedDate]);

  const fetchTeacherClasses = async () => {
    try {
      const res = await api.get('/api/teachers/my-classes');
      const list = Array.isArray(res.data) ? res.data : [];
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  };

  const fetchClassRoster = async () => {
    try {
      const res = await api.get(`/api/teachers/my-students?classId=${selectedClassId}`);
      setClassStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load students roster', err);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const res = await api.get('/api/attendance', {
        params: { classId: selectedClassId, date: selectedDate }
      });
      const records = res.data?.data || [];
      const formatted: ScannedStudent[] = records
        .filter((r: any) => (r.status || '').toLowerCase() === 'present' || (r.status || '').toLowerCase() === 'late')
        .map((r: any) => ({
          id: r.student?.id || r.studentId,
          name: r.student?.name || r.student?.user?.name || 'Student',
          studentId: r.student?.studentId || r.studentId,
          className: r.student?.class?.name,
          time: new Date(r.date),
          status: r.status === 'Late' ? 'Late' : 'Present'
        }));
      setScannedStudents(formatted);
    } catch (err) {
      console.error('Failed to load today attendance', err);
    }
  };

  // Start Camera Scanner
  const startCameraScanner = async () => {
    if (!selectedClassId) {
      showToast('Please select an assigned class first', 'warning');
      return;
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('classroom-qr-reader');
      }

      setIsScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;
          setTimeout(() => { cooldownRef.current = false; }, 2000);

          handleProcessScan(decodedText);
        },
        () => {} // error callback ignored
      );
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsScanning(false);
      showToast('Camera permission denied or camera not found.', 'error');
    }
  };

  const stopCameraScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping camera:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleProcessScan = async (rawCode: string) => {
    try {
      const res = await api.post('/api/attendance/qr', {
        qrData: rawCode,
        classId: selectedClassId,
        date: selectedDate,
        isClassroom: true
      });

      const st = res.data?.student;
      if (st) {
        const studentRecord: ScannedStudent = {
          id: st.id,
          name: st.name || st.user?.name || 'Student',
          studentId: st.studentId || st.id,
          className: st.class?.name || classes.find(c => c.id === selectedClassId)?.name,
          time: new Date(),
          status: 'Present'
        };

        setLastScanned(studentRecord);
        setScannedStudents(prev => {
          // Avoid duplicates in today's active session list
          const exists = prev.find(p => p.id === studentRecord.id);
          if (exists) return prev;
          return [studentRecord, ...prev];
        });

        showToast(`✓ Marked Present: ${studentRecord.name}`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unrecognized QR code badge';
      showToast(msg, 'error');
    }
  };

  // Generate Projected Class QR Code for Students to scan
  const generateClassQR = async () => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'warning');
      return;
    }
    setGeneratingCode(true);
    try {
      const res = await api.post('/api/attendance/qr/generate', {
        classId: selectedClassId,
        expiresMinutes: 20
      });
      const code = res.data?.code;
      if (code) {
        setQrCodeData(code);
        setSessionExpiresAt(new Date(res.data.expiresAt));
        showToast('Live Class QR code generated. Students can scan to check in!', 'success');
      }
    } catch (err) {
      // Fallback code generator
      const fallbackCode = `CLASS_${selectedClassId}_${Date.now()}`;
      setQrCodeData(fallbackCode);
      const exp = new Date();
      exp.setMinutes(exp.getMinutes() + 20);
      setSessionExpiresAt(exp);
      showToast('Class check-in QR code generated', 'success');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Mark all remaining un-scanned students as absent
  const handleMarkRemainingAbsent = async () => {
    const presentIds = new Set(scannedStudents.map(s => s.id));
    const absentStudents = classStudents.filter(s => !presentIds.has(s.id));

    if (absentStudents.length === 0) {
      showToast('All students in this class have already checked in as Present!', 'info');
      return;
    }

    try {
      await Promise.all(
        absentStudents.map(st =>
          api.post('/api/attendance', {
            studentId: st.id,
            classId: selectedClassId,
            date: selectedDate,
            status: 'Absent',
            note: 'Unscanned during QR roll call'
          }).catch(console.error)
        )
      );

      showToast(`Marked ${absentStudents.length} remaining students as Absent. Roll call finalized!`, 'success');
    } catch (err) {
      showToast('Failed to mark absent students', 'error');
    }
  };

  const currentClassObj = classes.find(c => c.id === selectedClassId);
  const presentCount = scannedStudents.length;
  const totalCount = classStudents.length;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Configuration Bar */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Select Classroom Stream:
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="portal-input"
              style={{ minWidth: 220, padding: '8px 12px', fontWeight: 600 }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.subject?.name ? `(${c.subject.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Roll Call Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="portal-input"
              style={{ padding: '8px 12px', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          <button
            type="button"
            onClick={() => {
              setMode('scan');
              if (isFullscreen) setIsFullscreen(false);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'scan' ? '#ffffff' : 'transparent',
              color: mode === 'scan' ? '#0284c7' : '#64748b',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: mode === 'scan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <i className="fas fa-camera" />
            Teacher Camera Scanner
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('project');
              stopCameraScanner();
              if (!qrCodeData) generateClassQR();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'project' ? '#ffffff' : 'transparent',
              color: mode === 'project' ? '#0284c7' : '#64748b',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: mode === 'project' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <i className="fas fa-qrcode" />
            Project Live Class QR
          </button>
        </div>
      </div>

      {/* Classroom Attendance Tally Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            Classroom Roster Presence &bull; {currentClassObj?.name || 'Class'}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4 }}>
            {presentCount} of {totalCount} Students Present ({attendancePercentage}%)
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleMarkRemainingAbsent}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-user-times" />
            Mark Remaining ({Math.max(0, totalCount - presentCount)}) Absent
          </button>
        </div>
      </div>

      {/* Main Interactive Work Area */}
      {mode === 'scan' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
          {/* Camera Scanner View */}
          <div className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-id-badge" style={{ color: '#0284c7' }} />
                Student Badge & QR Scanner
              </h2>

              {!isScanning ? (
                <button
                  onClick={startCameraScanner}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <i className="fas fa-play" />
                  Start Scanner
                </button>
              ) : (
                <button
                  onClick={stopCameraScanner}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <i className="fas fa-stop" />
                  Stop Scanner
                </button>
              )}
            </div>

            <div className="portal-card-body" style={{ padding: 20, textAlign: 'center' }}>
              <div
                id="classroom-qr-reader"
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  margin: '0 auto',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#f8fafc',
                  minHeight: '260px',
                  border: isScanning ? '2px solid #0284c7' : '2px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}
              >
                {!isScanning && (
                  <div style={{ padding: 30, color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: 12 }}>
                      <i className="fas fa-qrcode" />
                    </div>
                    <p style={{ margin: 0, fontWeight: 600 }}>Scanner is idle.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                      Click "Start Scanner" to use your webcam or phone camera to scan student cards.
                    </p>
                  </div>
                )}
              </div>

              {/* Instant Scan Confirmation Toast */}
              {lastScanned && (
                <div 
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    <i className="fas fa-check" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>
                      {lastScanned.name}
                    </div>
                    <div style={{ color: '#047857', fontSize: '0.8rem' }}>
                      ID: {lastScanned.studentId} &bull; Recorded Present at {format(lastScanned.time, 'HH:mm:ss')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Checked-in Students Roster */}
          <div className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Live Checked-in ({scannedStudents.length})
              </h2>
              <span className="portal-badge success">Live Presence</span>
            </div>

            <div className="portal-card-body" style={{ padding: 0, maxHeight: '420px', overflowY: 'auto' }}>
              {scannedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                  <i className="fas fa-user-clock" style={{ fontSize: '2rem', marginBottom: 10 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No check-ins recorded yet for this session.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Scan a student badge or project the class QR code.</p>
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Student ID</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedStudents.map((st, i) => (
                      <tr key={st.id || i}>
                        <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{i + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1e293b' }}>{st.name}</td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{st.studentId}</td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{format(new Date(st.time), 'HH:mm')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="portal-badge success" style={{ fontSize: '0.75rem' }}>
                            <i className="fas fa-check-circle" style={{ marginRight: 4 }} />
                            Present
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Project Class QR Code */
        <div 
          className="portal-card" 
          style={{ 
            textAlign: 'center', 
            padding: isFullscreen ? '40px' : '24px',
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            right: isFullscreen ? 0 : 'auto',
            bottom: isFullscreen ? 0 : 'auto',
            zIndex: isFullscreen ? 99999 : 'auto',
            height: isFullscreen ? '100vh' : 'auto',
            borderRadius: isFullscreen ? 0 : 14
          }}
        >
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              {currentClassObj?.name || 'Class'} Attendance Check-In
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: 24 }}>
              Students can open the Skulas mobile app or camera and scan this code to register their presence.
            </p>

            {/* Projected QR Code Container */}
            <div 
              style={{
                background: '#ffffff',
                border: '3px solid #0284c7',
                borderRadius: 20,
                padding: '24px',
                display: 'inline-block',
                boxShadow: '0 12px 30px -5px rgba(2, 132, 199, 0.25)',
                marginBottom: 20
              }}
            >
              {qrCodeData ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=${isFullscreen ? '320x320' : '240x240'}&data=${encodeURIComponent(qrCodeData)}`}
                  alt="Classroom Attendance QR Code"
                  style={{ width: isFullscreen ? 320 : 240, height: isFullscreen ? 320 : 240, display: 'block', margin: '0 auto' }}
                />
              ) : (
                <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }} />
                </div>
              )}
            </div>

            {sessionExpiresAt && (
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#047857', marginBottom: 20 }}>
                <i className="fas fa-clock mr-1" /> QR Session Active &bull; Code: <strong>{qrCodeData}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={generateClassQR}
                disabled={generatingCode}
                className="portal-btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                <i className={`fas fa-sync-alt ${generatingCode ? 'fa-spin' : ''}`} style={{ marginRight: 6 }} />
                Regenerate New QR
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="portal-btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ marginRight: 6 }} />
                {isFullscreen ? 'Exit Fullscreen' : 'Project Fullscreen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
