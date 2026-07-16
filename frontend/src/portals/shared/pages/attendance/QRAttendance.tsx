import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { format } from 'date-fns';

interface GateCheck {
  allowed: boolean;
  reason: string;
  student: {
    name: string;
    studentId: string;
    class?: { name: string };
    user?: { name: string };
  } | null;
  totalFees: number;
  totalPaid: number;
  balance: number;
  gateMinPaid: number;
  gateMinPercent: number;
  gateType: string;
}

interface ScanRecord {
  id?: string;
  studentName: string;
  studentId: string;
  className?: string;
  time: Date;
  allowed: boolean;
  reason: string;
  balance: number;
}

type ScannerState = 'idle' | 'scanning' | 'processing' | 'allowed' | 'denied';

export default function QRAttendance() {
  const { showToast } = useToast();
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [scannedData, setScannedData] = useState<ScanRecord[]>([]);
  const [lastResult, setLastResult] = useState<GateCheck | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-gate-reader');
    }
    setScannerState('scanning');
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        async (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;
          setScannerState('processing');

          try {
            const res = await api.post('/api/attendance/qr', { qrData: decodedText });
            const gateCheck: GateCheck = res.data.gateCheck || {
              allowed: true, reason: 'Attendance marked.', student: res.data.student,
              totalFees: 0, totalPaid: 0, balance: 0, gateMinPaid: 0, gateMinPercent: 0, gateType: 'none'
            };
            setLastResult(gateCheck);
            setScannerState('allowed');

            const student = gateCheck.student || res.data.student;
            setScannedData(prev => [{
              studentName: student?.user?.name || student?.name || 'Unknown',
              studentId: student?.studentId || '—',
              className: student?.class?.name,
              time: new Date(),
              allowed: true,
              reason: gateCheck.reason,
              balance: gateCheck.balance,
            }, ...prev.slice(0, 49)]);

          } catch (error: any) {
            const gateDenied = error.response?.data?.gateDenied;
            const gateCheck: GateCheck = error.response?.data?.gateCheck;
            if (gateDenied && gateCheck) {
              setLastResult(gateCheck);
              setScannerState('denied');
              const student = gateCheck.student;
              setScannedData(prev => [{
                studentName: student?.user?.name || student?.name || 'Unknown',
                studentId: student?.studentId || '—',
                className: student?.class?.name,
                time: new Date(),
                allowed: false,
                reason: gateCheck.reason,
                balance: gateCheck.balance,
              
    }, ...prev.slice(0, 49)]);
            } else {
              showToast(error.response?.data?.error || 'Failed to process QR code', 'error');
              setScannerState('scanning');
            }
          } finally {
            setTimeout(() => {
              cooldownRef.current = false;
              setScannerState(prev => prev !== 'idle' ? 'scanning' : 'idle');
            }, 3000);
          }
        },
        () => { /* Ignore decode failures */ }
      );
    } catch {
      showToast('Camera permission denied or not available', 'error');
      setScannerState('idle');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScannerState('idle');
    setLastResult(null);
  };

  const today = format(new Date(), 'EEEE, do MMMM yyyy');

  const allowedCount = scannedData.filter(r => r.allowed).length;
  const deniedCount = scannedData.filter(r => !r.allowed).length;

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1><i className="fas fa-qrcode" style={{ marginRight: 12 }}></i>Gate Access Scanner</h1>
          <p>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#d1fae5', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>
              <i className="fas fa-check-circle"></i> {allowedCount} Admitted
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.9rem' }}>
              <i className="fas fa-times-circle"></i> {deniedCount} Denied
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Scanner Panel */}
        <div>
          {/* Gate Status Display */}
          <div style={{
            borderRadius: 20,
            padding: '28px 32px',
            marginBottom: 20,
            transition: 'all 0.4s ease',
            background: scannerState === 'allowed'
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : scannerState === 'denied'
              ? 'linear-gradient(135deg, #dc2626, #ef4444)'
              : scannerState === 'processing'
              ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
              : scannerState === 'scanning'
              ? 'linear-gradient(135deg, #1e40af, #2563eb)'
              : 'linear-gradient(135deg, #475569, #64748b)',
            color: '#fff',
            boxShadow: scannerState === 'allowed'
              ? '0 20px 40px rgba(5,150,105,0.35)'
              : scannerState === 'denied'
              ? '0 20px 40px rgba(220,38,38,0.35)'
              : '0 20px 40px rgba(0,0,0,0.15)',
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            {scannerState === 'idle' && (
              <>
                <i className="fas fa-qrcode" style={{ fontSize: 52, marginBottom: 16, opacity: 0.7 }}></i>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Scanner Ready</h2>
                <p style={{ margin: '8px 0 0', opacity: 0.8 }}>Press "Start Scanner" to begin scanning</p>
              </>
            )}
            {scannerState === 'scanning' && (
              <>
                <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 1s linear infinite', marginBottom: 16 }}></div>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Awaiting Scan...</h2>
                <p style={{ margin: '8px 0 0', opacity: 0.8 }}>Point camera at student QR code</p>
              </>
            )}
            {scannerState === 'processing' && (
              <>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 52, marginBottom: 16 }}></i>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Checking Access...</h2>
                <p style={{ margin: '8px 0 0', opacity: 0.8 }}>Verifying fee status and payment plans</p>
              </>
            )}
            {scannerState === 'allowed' && lastResult?.student && (
              <>
                <i className="fas fa-check-circle" style={{ fontSize: 52, marginBottom: 16 }}></i>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>ACCESS GRANTED</h2>
                <p style={{ margin: '8px 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>
                  {lastResult.student.user?.name || lastResult.student.name}
                </p>
                {lastResult.student.class?.name && (
                  <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 600, opacity: 0.9 }}>
                    Class: {lastResult.student.class.name}
                  </p>
                )}
                <p style={{ margin: 0, opacity: 0.85, fontSize: '0.9rem' }}>{lastResult.reason}</p>
              </>
            )}
            {scannerState === 'denied' && lastResult?.student && (
              <>
                <i className="fas fa-ban" style={{ fontSize: 52, marginBottom: 16 }}></i>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>ACCESS DENIED</h2>
                <p style={{ margin: '8px 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>
                  {lastResult.student.user?.name || lastResult.student.name}
                </p>
                {lastResult.student.class?.name && (
                  <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 600, opacity: 0.9 }}>
                    Class: {lastResult.student.class.name}
                  </p>
                )}
                <p style={{ margin: 0, opacity: 0.85, fontSize: '0.9rem' }}>{lastResult.reason}</p>
              </>
            )}
          </div>

          {/* Fee Details (when denied) */}
          {lastResult && scannerState === 'denied' && (
            <div style={{
              background: '#fff', border: '2px solid #fecaca', borderRadius: 16,
              padding: '20px 24px', marginBottom: 20
            }}>
              <h4 style={{ margin: '0 0 16px', color: '#dc2626', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <i className="fas fa-file-invoice-dollar" style={{ marginRight: 8 }}></i>Fee Balance Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Total Fees', value: `$${Number(lastResult.totalFees).toFixed(2)}`, color: '#1e293b' },
                  { label: 'Amount Paid', value: `$${Number(lastResult.totalPaid).toFixed(2)}`, color: '#059669' },
                  { label: 'Balance Due', value: `$${Number(lastResult.balance).toFixed(2)}`, color: '#dc2626' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center', padding: '12px 8px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {lastResult.gateType === 'amount' && (
                <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                  Required gate payment: <strong>${Number(lastResult.gateMinPaid).toFixed(2)}</strong>
                </p>
              )}
              {lastResult.gateType === 'percent' && (
                <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                  Required fee payment: <strong>{lastResult.gateMinPercent}%</strong> of total
                </p>
              )}
            </div>
          )}

          {/* Camera View */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h3 style={{ margin: 0 }}>Camera Feed</h3>
              {scannerState !== 'idle' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: '0.85rem', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', animation: 'pulse 1.5s infinite' }}></span>
                  LIVE
                </span>
              )}
            </div>
            <div className="portal-card-body">
              <div
                id="qr-gate-reader"
                style={{
                  width: '100%',
                  minHeight: 280,
                  background: '#0f172a',
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {scannerState === 'idle' && (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    <i className="fas fa-camera" style={{ fontSize: 48, marginBottom: 12, display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Camera not started</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
                <button
                  className="portal-btn-primary"
                  onClick={startScanning}
                  disabled={scannerState !== 'idle'}
                  style={{ flex: 1 }}
                >
                  <i className="fas fa-play" style={{ marginRight: 8 }}></i>Start Scanner
                </button>
                <button
                  className="portal-btn-secondary"
                  onClick={stopScanning}
                  disabled={scannerState === 'idle'}
                  style={{ flex: 1 }}
                >
                  <i className="fas fa-stop" style={{ marginRight: 8 }}></i>Stop Scanner
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Log */}
        <div className="portal-card" style={{ height: 'fit-content' }}>
          <div className="portal-card-header">
            <h2>Today's Gate Log</h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{scannedData.length} scan(s)</span>
          </div>
          <div style={{ maxHeight: 640, overflowY: 'auto' }}>
            {scannedData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <i className="fas fa-history" style={{ fontSize: 40, marginBottom: 16, display: 'block' }}></i>
                <p style={{ margin: 0 }}>No scans recorded yet today.</p>
              </div>
            ) : (
              scannedData.map((record, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    background: record.allowed ? 'rgba(5,150,105,0.04)' : 'rgba(220,38,38,0.04)',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: record.allowed ? '#d1fae5' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <i
                      className={`fas ${record.allowed ? 'fa-check' : 'fa-times'}`}
                      style={{ color: record.allowed ? '#059669' : '#dc2626', fontSize: 16 }}
                    ></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{record.studentName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {record.studentId}{record.className ? ` · ${record.className}` : ''}
                    </div>
                    {!record.allowed && (
                      <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}>
                        Balance: ${Number(record.balance).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem',
                      fontWeight: 700,
                      background: record.allowed ? '#d1fae5' : '#fee2e2',
                      color: record.allowed ? '#059669' : '#dc2626',
                      marginBottom: 4
                    }}>
                      {record.allowed ? 'ADMITTED' : 'DENIED'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {format(record.time, 'HH:mm:ss')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
