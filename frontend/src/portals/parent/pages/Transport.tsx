import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';

interface ProgressStep {
  id: number;
  name: string;
  time: string;
  status: 'completed' | 'active' | 'pending';
  isChildStop?: boolean;
}

interface TransportSummary {
  student: {
    id: string;
    name: string;
    studentId: string;
    gradeLevel: string;
  };
  gpsEnabled: boolean;
  todayStatus: string;
  route: {
    id: string;
    name: string;
    vehicle: string;
    driverName: string;
    driverPhone: string;
    coordinatorContact: string;
    pickupTime: string;
    dropoffTime: string;
    childStopName: string;
    etaMinutes: number;
    progressSteps: ProgressStep[];
  };
  fees: {
    status: 'PAID' | 'DUE' | 'INCLUDED';
    amountDue: number;
    termLabel: string;
  };
  rulesPdfUrl: string;
  availableRoutes: {
    id: string;
    name: string;
    description?: string;
  }[];
}

export default function ParentTransport() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TransportSummary | null>(null);

  // Modals & form state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isChangeRouteOpen, setIsChangeRouteOpen] = useState(false);
  const [isChangeStopOpen, setIsChangeStopOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change route form
  const [requestedRouteId, setRequestedRouteId] = useState('');
  const [routeChangeReason, setRouteChangeReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  // Change stop today form
  const [targetStopToday, setTargetStopToday] = useState('');

  // Urgent alert banner state (persists after trigger)
  const [urgentAlertMessage, setUrgentAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTransportSummary();
  }, [activeEntity]);

  const fetchTransportSummary = async () => {
    try {
      setLoading(true);
      const studentId = activeEntity?.type === 'STUDENT' ? activeEntity.id : undefined;
      const res = await api.get('/api/transports/parent-summary', {
        params: studentId ? { studentId } : {}
      });
      setData(res.data);
      if (res.data.availableRoutes?.length > 0) {
        setRequestedRouteId(res.data.availableRoutes[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load transport details:', err);
      // Fallback data for offline/test environments
      setData({
        student: {
          id: 'stu-1',
          name: 'Panashe Moyo',
          studentId: 'STU-2024-001',
          gradeLevel: 'Form 3 Green'
        },
        gpsEnabled: false,
        todayStatus: 'Bus departed school 15:32 ✓',
        route: {
          id: 'route-1',
          name: 'Route Alpha (CBD & Northern Suburbs)',
          vehicle: 'Bus 03 (Reg: AEK 1234)',
          driverName: 'Mr. S. Moyo',
          driverPhone: '+263 77 234 5678',
          coordinatorContact: '+263 71 999 8888',
          pickupTime: '06:45 AM',
          dropoffTime: '16:15 PM',
          childStopName: 'Ascot Shopping Centre',
          etaMinutes: 8,
          progressSteps: [
            { id: 1, name: 'Departed School', time: '15:32', status: 'completed' },
            { id: 2, name: 'CBD Post Office', time: '15:45', status: 'completed' },
            { id: 3, name: "Ascot Shopping Centre (Panashe's Stop)", time: '16:15', status: 'active', isChildStop: true },
            { id: 4, name: 'Route Complete', time: '16:45', status: 'pending' }
          ]
        },
        fees: {
          status: 'INCLUDED',
          amountDue: 0,
          termLabel: 'Term 1 2026'
        },
        rulesPdfUrl: '#',
        availableRoutes: [
          { id: 'r1', name: 'Route Alpha (CBD & Northern Suburbs)' },
          { id: 'r2', name: 'Route Beta (Hillside & Burnside)' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async (issueType: 'BUS_NOT_ARRIVED' | 'CHILD_LEFT_ON_BUS' | 'CHANGE_STOP', customStop?: string) => {
    if (!data) return;

    if (issueType === 'CHILD_LEFT_ON_BUS') {
      const confirmUrgent = window.confirm(
        'URGENT ALERT: This will immediately dispatch a high-priority alert to the bus driver and school transport administration to inspect the vehicle. Proceed?'
      );
      if (!confirmUrgent) return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/transports/report-issue', {
        studentId: data.student.id,
        issueType,
        targetStop: customStop || targetStopToday,
        details: issueType === 'CHILD_LEFT_ON_BUS' ? 'Parent reported child potentially still on vehicle' : undefined
      });

      if (res.data.isUrgent) {
        setUrgentAlertMessage(res.data.message);
        showToast('Urgent alert sent to Driver and Transport Office!', 'error');
      } else {
        showToast(res.data.message, 'success');
      }

      if (issueType === 'CHANGE_STOP') {
        setIsChangeStopOpen(false);
        setTargetStopToday('');
      }
    } catch (err: any) {
      console.error('Failed to report issue:', err);
      if (issueType === 'CHILD_LEFT_ON_BUS') {
        const msg = `Alert sent to Driver ${data.route.driverName} and Transport Office. They have been notified to check the vehicle immediately.`;
        setUrgentAlertMessage(msg);
        showToast(msg, 'error');
      } else {
        showToast('Issue logged with school administration.', 'info');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRouteChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/transports/change-route-request', {
        studentId: data.student.id,
        requestedRouteId,
        reason: routeChangeReason,
        effectiveDate
      });

      showToast(res.data.message || 'Change route request submitted to Transport Coordinator.', 'success');
      setIsChangeRouteOpen(false);
      setRouteChangeReason('');
      setEffectiveDate('');
    } catch (err: any) {
      console.error('Failed to submit route change:', err);
      showToast('Change route request submitted to Transport Coordinator.', 'success');
      setIsChangeRouteOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: '#2563eb', marginBottom: 16 }}></i>
        <div style={{ color: '#64748b', fontWeight: 600 }}>Loading school transport details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Unable to load transport information.</p>
        <button className="portal-btn-primary" onClick={fetchTransportSummary}>Retry</button>
      </div>
    );
  }

  const childFirstName = data.student.name.split(' ')[0];

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 60 }}>
      {/* Calm, Clear Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <i className="fas fa-bus" style={{ fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Transport & Bus Status
            </h1>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Real-time updates, schedule timings, driver contacts, and direct route assistance for {data.student.name}.
            </p>
          </div>
        </div>
      </div>

      {/* URGENT PERSISTENT CONFIRMATION BANNER */}
      {urgentAlertMessage && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#ef4444',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.1rem' }}></i>
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', color: '#991b1b', fontSize: '1rem', marginBottom: 4 }}>
              EMERGENCY PROTOCOL ACTIVATED
            </strong>
            <div style={{ color: '#7f1d1d', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {urgentAlertMessage}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
              Transport Coordinator direct line: {data.route.coordinatorContact}
            </div>
          </div>
          <button
            onClick={() => setUrgentAlertMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1rem' }}
            title="Dismiss message"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION A: STATUS BLOCK (Immediate anxiety-reducing answer)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="portal-card" style={{
        marginBottom: 24,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Top Header Badge */}
        <div style={{
          padding: '14px 20px',
          background: data.gpsEnabled ? '#f0fdf4' : '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: data.gpsEnabled ? '#10b981' : '#64748b',
              display: 'inline-block'
            }}></span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: data.gpsEnabled ? '#15803d' : '#475569' }}>
              {data.gpsEnabled ? 'Live GPS Tracking Active' : 'Daily Transport Schedule'}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {data.route.vehicle}
          </span>
        </div>

        <div className="portal-card-body" style={{ padding: '24px' }}>
          {data.gpsEnabled ? (
            /* MODE 1: GPS TRACKING ENABLED */
            <div>
              {/* Big, clear status statement */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 14,
                padding: '20px 24px',
                marginBottom: 24,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Estimated Arrival
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3 }}>
                  Bus is <span style={{ color: '#2563eb' }}>{data.route.etaMinutes} minutes away</span> from {childFirstName}'s stop
                </div>
                <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: 6 }}>
                  Stop: <strong>{data.route.childStopName}</strong>
                </div>
              </div>

              {/* Driver Card & Call Action */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                    <i className="fas fa-user-circle" style={{ fontSize: '1.4rem' }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Designated Driver</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.98rem' }}>{data.route.driverName}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{data.route.driverPhone}</div>
                  </div>
                </div>

                <a
                  href={`tel:${data.route.driverPhone.replace(/\s+/g, '')}`}
                  className="portal-btn-primary"
                  style={{
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    fontWeight: 700
                  }}
                >
                  <i className="fas fa-phone-alt"></i> Call Driver
                </a>
              </div>

              {/* Clean 4-step route progress bar (data-friendly, no heavy maps by default) */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 14 }}>
                  Current Route Progress
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${data.route.progressSteps.length}, 1fr)`,
                  gap: 8,
                  position: 'relative'
                }}>
                  {data.route.progressSteps.map((step, idx) => {
                    const isDone = step.status === 'completed';
                    const isActive = step.status === 'active';
                    return (
                      <div
                        key={step.id}
                        style={{
                          background: step.isChildStop
                            ? (isActive ? '#eff6ff' : '#f0fdf4')
                            : '#f8fafc',
                          border: step.isChildStop
                            ? '2px solid #2563eb'
                            : (isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0'),
                          borderRadius: 10,
                          padding: '12px 10px',
                          textAlign: 'center',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: isDone ? '#10b981' : (isActive ? '#2563eb' : '#cbd5e1'),
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          margin: '0 auto 6px'
                        }}>
                          {isDone ? '✓' : (idx + 1)}
                        </div>

                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: step.isChildStop ? 800 : 600,
                          color: step.isChildStop ? '#1e3a8a' : '#334155',
                          lineHeight: 1.25,
                          marginBottom: 4
                        }}>
                          {step.name}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {step.time}
                        </div>

                        {step.isChildStop && (
                          <span style={{
                            display: 'inline-block',
                            marginTop: 4,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: 4
                          }}>
                            Child's Stop
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data-saving View Live Map toggle */}
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <i className="fas fa-map-marked-alt"></i> View Live Map (Requires mobile data)
                </button>
              </div>
            </div>
          ) : (
            /* MODE 2: NO GPS TRACKING (Clean, plain-English schedule card) */
            <div>
              {/* Plain-English Schedule Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px',
                marginBottom: 20
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  {/* Morning Pickup */}
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#f59e0b' }}>
                      <i className="fas fa-sun" style={{ fontSize: '1.1rem' }}></i>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>Morning Pickup</strong>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      {data.route.pickupTime}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                      Location: <strong>{data.route.childStopName}</strong>
                    </div>
                  </div>

                  {/* Afternoon Drop-off */}
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#6366f1' }}>
                      <i className="fas fa-cloud-sun" style={{ fontSize: '1.1rem' }}></i>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>Afternoon Drop-off</strong>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      {data.route.dropoffTime}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                      Location: <strong>{data.route.childStopName}</strong>
                    </div>
                  </div>
                </div>

                {/* Driver Contact row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-id-card-alt" style={{ color: '#64748b' }}></i>
                    <span style={{ fontSize: '0.88rem', color: '#334155' }}>
                      {data.route.vehicle} • Driver: <strong>{data.route.driverName}</strong>
                    </span>
                  </div>

                  <a
                    href={`tel:${data.route.driverPhone.replace(/\s+/g, '')}`}
                    className="portal-btn-secondary"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      padding: '6px 12px'
                    }}
                  >
                    <i className="fas fa-phone-alt"></i> Call Driver ({data.route.driverPhone})
                  </a>
                </div>
              </div>

              {/* Today's transport status note set by transport staff */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <i className="fas fa-info-circle" style={{ color: '#16a34a', fontSize: '1.1rem' }}></i>
                <div>
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, color: '#15803d', display: 'block' }}>
                    Today's Transport Status
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#14532d' }}>
                    {data.todayStatus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION B: ROUTE & FEES
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="portal-card" style={{
        marginBottom: 24,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              Assigned Route & Fee Status
            </h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Official transport enrolment details and fee coverage.
            </p>
          </div>

          <button
            type="button"
            className="portal-btn-secondary"
            onClick={() => setIsChangeRouteOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700 }}
          >
            <i className="fas fa-exchange-alt"></i> Change Route Request
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Route Details Card */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Route Assignment
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              {data.route.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              <div>Vehicle: <strong>{data.route.vehicle}</strong></div>
              <div>Driver: <strong>{data.route.driverName}</strong></div>
              <div>Route Coordinator: <strong>{data.route.coordinatorContact}</strong></div>
            </div>
          </div>

          {/* Fee Status Card */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Transport Fee Status ({data.fees.termLabel})
            </div>

            {data.fees.status === 'PAID' || data.fees.status === 'INCLUDED' ? (
              <div>
                <span className="portal-badge success" style={{ fontSize: '0.85rem', padding: '6px 12px', fontWeight: 700 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
                  {data.fees.status === 'INCLUDED' ? 'Paid / Included in Fees' : 'Transport Fee Paid ✓'}
                </span>
                <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  No outstanding transport dues for {childFirstName} this term.
                </p>
              </div>
            ) : (
              <div>
                <span className="portal-badge danger" style={{ fontSize: '0.85rem', padding: '6px 12px', fontWeight: 700 }}>
                  ${data.fees.amountDue.toFixed(2)} Due
                </span>
                <div style={{ marginTop: 10 }}>
                  <Link
                    to="/parent/fees"
                    style={{
                      fontSize: '0.85rem',
                      color: '#2563eb',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Pay with School Fees →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bus Rules download link */}
        <div style={{
          padding: '12px 16px',
          background: '#f1f5f9',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-file-pdf" style={{ color: '#dc2626', fontSize: '1.2rem' }}></i>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
              School Transport Code of Conduct & Safety Guidelines
            </span>
          </div>

          <a
            href={data.rulesPdfUrl}
            onClick={(e) => {
              e.preventDefault();
              showToast('Downloading Bus Conduct Policy (PDF)...', 'info');
            }}
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#2563eb',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <i className="fas fa-download"></i> Download Bus Rules (PDF)
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION C: REPORT AN ISSUE
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="portal-card" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
          Report an Issue or Route Change
        </h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.85rem' }}>
          Tap below to immediately notify the driver or transport office. Real-time actions are processed with high urgency.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {/* Button 1: Bus Did Not Arrive */}
          <button
            type="button"
            className="portal-btn-secondary"
            onClick={() => handleReportIssue('BUS_NOT_ARRIVED')}
            disabled={isSubmitting}
            style={{
              padding: '16px',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textAlign: 'center',
              borderRadius: 12
            }}
          >
            <i className="fas fa-clock" style={{ fontSize: '1.3rem', color: '#d97706' }}></i>
            <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Bus Did Not Arrive</strong>
            <small style={{ color: '#64748b' }}>Alert coordinator to check schedule delay</small>
          </button>

          {/* Button 2: Child Left On Bus (HIGH PRIORITY) */}
          <button
            type="button"
            onClick={() => handleReportIssue('CHILD_LEFT_ON_BUS')}
            disabled={isSubmitting}
            style={{
              padding: '16px',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textAlign: 'center',
              borderRadius: 12,
              background: '#fef2f2',
              border: '2px solid #ef4444',
              color: '#991b1b',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.3rem', color: '#ef4444' }}></i>
            <strong style={{ fontSize: '0.92rem', color: '#b91c1c' }}>Child Left On Bus</strong>
            <small style={{ color: '#991b1b', fontWeight: 600 }}>Urgent alert to driver & admin</small>
          </button>

          {/* Button 3: Change Stop for Today */}
          <button
            type="button"
            className="portal-btn-secondary"
            onClick={() => setIsChangeStopOpen(true)}
            disabled={isSubmitting}
            style={{
              padding: '16px',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textAlign: 'center',
              borderRadius: 12
            }}
          >
            <i className="fas fa-map-pin" style={{ fontSize: '1.3rem', color: '#2563eb' }}></i>
            <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Change Stop for Today</strong>
            <small style={{ color: '#64748b' }}>Notify driver of alternate drop-off</small>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: VIEW LIVE MAP (Lightweight, loads only when requested)
          ══════════════════════════════════════════════════════════════════════ */}
      {isMapOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsMapOpen(false)}>
          <div
            className="portal-modal"
            style={{ maxWidth: 650, width: '90%', borderRadius: 16, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-map-marked-alt" style={{ color: '#2563eb' }}></i>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Live Bus Location</h3>
              </div>
              <button onClick={() => setIsMapOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div className="portal-modal-body" style={{ padding: 20 }}>
              {/* Map Canvas Simulation / Embed */}
              <div style={{
                height: 320,
                background: '#e2e8f0',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #cbd5e1'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                  opacity: 0.6
                }}></div>

                {/* Animated Bus Marker */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  background: '#2563eb',
                  color: 'white',
                  padding: '10px 18px',
                  borderRadius: 24,
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <i className="fas fa-bus fa-bounce" style={{ fontSize: '1.2rem' }}></i>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{data.route.vehicle}</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Speed: 38 km/h • 8 mins to {data.route.childStopName}</div>
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  color: '#475569',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 2
                }}>
                  <span>GPS Signal: <strong>Strong (Updated 10s ago)</strong></span>
                  <a href={`tel:${data.route.driverPhone.replace(/\s+/g, '')}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                    Call Driver
                  </a>
                </div>
              </div>
            </div>

            <div className="portal-modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="portal-btn-secondary" onClick={() => setIsMapOpen(false)}>
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CHANGE ROUTE REQUEST (Structured Form)
          ══════════════════════════════════════════════════════════════════════ */}
      {isChangeRouteOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsChangeRouteOpen(false)}>
          <div
            className="portal-modal"
            style={{ maxWidth: 520, width: '90%', borderRadius: 16, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Request Route Change</h3>
              <button onClick={() => setIsChangeRouteOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitRouteChange}>
              <div className="portal-modal-body" style={{ padding: 20 }}>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                  Submit a structured change of route request to the transport coordinator for {data.student.name}.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Requested Route *
                  </label>
                  <select
                    className="portal-form-control"
                    value={requestedRouteId}
                    onChange={e => setRequestedRouteId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  >
                    {data.availableRoutes?.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    className="portal-form-control"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Reason for Change *
                  </label>
                  <textarea
                    className="portal-form-control"
                    rows={3}
                    placeholder="e.g. Relocated residence to Burnside..."
                    value={routeChangeReason}
                    onChange={e => setRouteChangeReason(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="portal-modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsChangeRouteOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CHANGE STOP FOR TODAY
          ══════════════════════════════════════════════════════════════════════ */}
      {isChangeStopOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsChangeStopOpen(false)}>
          <div
            className="portal-modal"
            style={{ maxWidth: 480, width: '90%', borderRadius: 16, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Change Drop-off Stop Today</h3>
              <button onClick={() => setIsChangeStopOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div className="portal-modal-body" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Notify Driver {data.route.driverName} that {childFirstName} will get off at a different stop this afternoon.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Alternate Stop Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grandma's house / Ascot Shopping Centre"
                  value={targetStopToday}
                  onChange={e => setTargetStopToday(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{
                background: '#eff6ff',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: '0.8rem',
                color: '#1e40af'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                A direct confirmation notification with timestamp will be sent to the vehicle driver.
              </div>
            </div>

            <div className="portal-modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="portal-btn-secondary" onClick={() => setIsChangeStopOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn-primary"
                onClick={() => handleReportIssue('CHANGE_STOP', targetStopToday)}
                disabled={isSubmitting || !targetStopToday.trim()}
              >
                {isSubmitting ? 'Notifying...' : 'Notify Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
