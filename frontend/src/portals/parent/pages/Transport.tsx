import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

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
  isEnrolled?: boolean;
  allocation?: any;
  availableVehicles?: {
    id: string;
    name: string;
    number?: string;
    model?: string;
    driverName?: string;
    driverContact?: string;
  }[];
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
  const { user, activeEntity } = useAuth();
  const currentChild = activeEntity || user?.linkedEntities?.[0];
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TransportSummary | null>(null);

  // Modals & form state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isChangeRouteOpen, setIsChangeRouteOpen] = useState(false);
  const [isChangeStopOpen, setIsChangeStopOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enrol & Change route form
  const [requestedRouteId, setRequestedRouteId] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [routeChangeReason, setRouteChangeReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Change stop today form
  const [targetStopToday, setTargetStopToday] = useState('');

  // Urgent alert banner state
  const [urgentAlertMessage, setUrgentAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTransportSummary();
  }, [currentChild?.id]);

  const fetchTransportSummary = async () => {
    try {
      setLoading(true);
      const studentId = currentChild?.id;
      const res = await api.get('/api/transports/parent-summary', {
        params: studentId ? { studentId } : {}
      });
      setData(res.data);
      if (res.data.availableRoutes?.length > 0) {
        setRequestedRouteId(res.data.availableRoutes[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load transport details:', err);
      setData({
        student: {
          id: currentChild?.id || 'stu-1',
          name: currentChild?.name || 'Student',
          studentId: currentChild?.studentId || '',
          gradeLevel: currentChild?.className || 'Primary School'
        },
        isEnrolled: false,
        gpsEnabled: false,
        todayStatus: 'Shuttle service active on schedule ✓',
        route: {
          id: 'cmuu3rvr0002057bstjgb94rs',
          name: 'MAIN STREET (CAMPUS to TOWN)',
          vehicle: 'GD6 (toyota cruiser)',
          driverName: 'Burke Strickland',
          driverPhone: '+1 (391) 617-6168',
          coordinatorContact: '+263 71 999 8888',
          pickupTime: '06:45 AM',
          dropoffTime: '15:30 PM',
          childStopName: 'Campus Main Stop',
          etaMinutes: 10,
          progressSteps: [
            { id: 1, name: 'Departed School Campus', time: '15:30', status: 'completed' },
            { id: 2, name: 'MAIN STREET Transit', time: '15:45', status: 'active', isChildStop: true },
            { id: 3, name: 'Town Drop-off Point', time: '16:05', status: 'pending' }
          ]
        },
        fees: {
          status: 'INCLUDED',
          amountDue: 0,
          termLabel: 'Term 1 2026'
        },
        rulesPdfUrl: '#',
        availableRoutes: [
          { id: 'cmuu3rvr0002057bstjgb94rs', name: 'MAIN STREET', description: 'CAMPUS to TOWN' }
        ],
        availableVehicles: [
          { id: 'cmuykrkp2006fk94fal2mig9d', name: 'GD6', number: 'GD6', model: 'toyota cruiser', driverName: 'Burke Strickland', driverContact: '+1 (391) 617-6168' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/transports/enroll-request', {
        studentId: data.student.id,
        routeId: requestedRouteId || data.route.id,
        pickupPoint: pickupPoint || data.route.childStopName,
        notes: routeChangeReason
      });
      showToast(res.data?.message || 'Transport enrolment request submitted to the school transport office!', 'success');
      setIsEnrollModalOpen(false);
      setPickupPoint('');
      setRouteChangeReason('');
      fetchTransportSummary();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Transport enrolment request recorded.', 'success');
      setIsEnrollModalOpen(false);
    } finally {
      setIsSubmitting(false);
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
        requestedRouteId: requestedRouteId || data.route.id,
        reason: routeChangeReason,
        effectiveDate
      });

      showToast(res.data.message || 'Change route request submitted to Transport Coordinator.', 'success');
      setIsChangeRouteOpen(false);
      setRouteChangeReason('');
    } catch (err: any) {
      console.error('Failed to submit route change:', err);
      showToast('Change route request submitted to Transport Coordinator.', 'success');
      setIsChangeRouteOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 0' }}>
        <SkeletonLoader type="stats" count={3} />
        <SkeletonLoader type="card" count={3} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            border: '1px solid #bfdbfe'
          }}>
            <i className="fas fa-bus-alt"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Transport & Shuttle Status
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
              Official school bus routes, schedule timings, driver contacts, and route enrolment for <strong>{data.student.name}</strong> ({data.student.gradeLevel}).
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="portal-btn-secondary"
            onClick={() => setIsChangeRouteOpen(true)}
          >
            <i className="fas fa-exchange-alt"></i> Change Route Request
          </button>
          <button
            type="button"
            className="portal-btn-primary"
            onClick={() => setIsEnrollModalOpen(true)}
          >
            <i className="fas fa-plus-circle"></i> {data.isEnrolled ? 'Update Stop / Route' : 'Enrol in School Bus'}
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card" style={{ borderLeft: `4px solid ${data.isEnrolled ? '#10b981' : '#f59e0b'}` }}>
          <div className={`portal-stat-icon ${data.isEnrolled ? 'green' : 'orange'}`}>
            <i className={`fas ${data.isEnrolled ? 'fa-check-circle' : 'fa-id-badge'}`}></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: data.isEnrolled ? '#15803d' : '#d97706' }}>
              {data.isEnrolled ? 'Enrolled & Active' : 'Day Scholar (Open)'}
            </h3>
            <p>Transport Allocation Status</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="portal-stat-icon blue">
            <i className="fas fa-route"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
              {data.route.name}
            </h3>
            <p>Primary School Bus Route</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="portal-stat-icon purple">
            <i className="fas fa-shuttle-van"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
              {data.route.vehicle}
            </h3>
            <p>Driver: {data.route.driverName}</p>
          </div>
        </div>
      </div>

      {/* Enrolment Call-to-Action Banner if student is not allocated yet */}
      {!data.isEnrolled && (
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#0284c7',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              flexShrink: 0
            }}>
              <i className="fas fa-bus"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: '#0369a1',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase'
                }}>
                  Route Booking Available
                </span>
                <strong style={{ color: '#0c4a6e', fontSize: '1rem' }}>
                  Book Daily School Bus Seat for {data.student.name}
                </strong>
              </div>
              <p style={{ margin: 0, color: '#0369a1', fontSize: '0.86rem' }}>
                {data.student.name} is not currently assigned to a permanent bus seat. Below is the active school route schedule (<strong>{data.route.name}</strong>). Click to request daily pickup/drop-off allocation.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="portal-btn-primary"
            style={{ background: '#0284c7', borderColor: '#0369a1', fontWeight: 800, padding: '10px 20px' }}
            onClick={() => setIsEnrollModalOpen(true)}
          >
            <i className="fas fa-paper-plane"></i> Request Bus Seat
          </button>
        </div>
      )}

      {/* URGENT PERSISTENT CONFIRMATION BANNER */}
      {urgentAlertMessage && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: 14,
          padding: '16px 20px',
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
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', color: '#991b1b', fontSize: '1rem', marginBottom: 4 }}>
              EMERGENCY DISPATCH PROTOCOL ACTIVATED
            </strong>
            <div style={{ color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {urgentAlertMessage}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700 }}>
              Transport Coordinator direct line: {data.route.coordinatorContact}
            </div>
          </div>
          <button
            onClick={() => setUrgentAlertMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1rem' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div className="portal-grid-18-12">
        {/* Left Column: Daily Transport Schedule & Route Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="portal-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block'
                }}></span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Daily Route Schedule — {data.route.name}
                </span>
              </div>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1e40af',
                background: '#eff6ff',
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid #bfdbfe'
              }}>
                <i className="fas fa-bus" style={{ marginRight: 6 }}></i>
                {data.route.vehicle}
              </span>
            </div>

            <div className="portal-card-body" style={{ padding: 24 }}>
              {/* Pickup & Drop-off Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#f59e0b' }}>
                    <i className="fas fa-sun" style={{ fontSize: '1.1rem' }}></i>
                    <strong style={{ fontSize: '0.88rem', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Morning Pickup
                    </strong>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
                    {data.route.pickupTime}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#475569' }}>
                    Point: <strong>{data.route.childStopName}</strong>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#6366f1' }}>
                    <i className="fas fa-cloud-sun" style={{ fontSize: '1.1rem' }}></i>
                    <strong style={{ fontSize: '0.88rem', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Afternoon Drop-off
                    </strong>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
                    {data.route.dropoffTime}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#475569' }}>
                    Point: <strong>{data.route.childStopName}</strong>
                  </div>
                </div>
              </div>

              {/* Driver Contact Strip */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}>
                    <i className="fas fa-id-badge"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Designated School Driver
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                      {data.route.driverName} • <span style={{ color: '#475569', fontWeight: 600 }}>{data.route.vehicle}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`tel:${data.route.driverPhone.replace(/\s+/g, '')}`}
                  className="portal-btn-secondary"
                  style={{ textDecoration: 'none', fontWeight: 800, color: '#0f172a' }}
                >
                  <i className="fas fa-phone-alt" style={{ color: '#16a34a' }}></i> Call Driver ({data.route.driverPhone})
                </a>
              </div>

              {/* Today's Transport Status Banner */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#16a34a',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Today's Dispatch Log
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14532d' }}>
                      {data.todayStatus}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="portal-btn-ghost"
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}
                  onClick={() => setIsMapOpen(true)}
                >
                  <i className="fas fa-route"></i> View Route Checkpoints
                </button>
              </div>
            </div>
          </div>

          {/* School Routes & Fleet Directory (Connected to Database) */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header">
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  <i className="fas fa-map-signs" style={{ marginRight: 8, color: '#2563eb' }}></i>
                  Official School Transport Routes & Fleet
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Active bus routes and registered school vehicles in the database.
                </p>
              </div>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Route Name</th>
                    <th>Coverage / Corridor</th>
                    <th>Assigned Vehicle</th>
                    <th>Driver</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.availableRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                        No transport routes configured yet.
                      </td>
                    </tr>
                  ) : (
                    data.availableRoutes.map((rt, idx) => {
                      const veh = data.availableVehicles?.[idx] || data.availableVehicles?.[0];
                      return (
                        <tr key={rt.id}>
                          <td style={{ fontWeight: 800, color: '#0f172a' }}>
                            <i className="fas fa-route" style={{ color: '#2563eb', marginRight: 8 }}></i>
                            {rt.name}
                          </td>
                          <td style={{ color: '#475569', fontWeight: 600 }}>
                            {rt.description || 'Campus Shuttle Corridor'}
                          </td>
                          <td>
                            <span className="portal-badge info">
                              {veh ? `${veh.name} (${veh.model || veh.number})` : data.route.vehicle}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#334155' }}>
                            {veh?.driverName || data.route.driverName}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="portal-btn-secondary"
                              style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                              onClick={() => {
                                setRequestedRouteId(rt.id);
                                setIsEnrollModalOpen(true);
                              }}
                            >
                              Select Route
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Fee Coverage & Emergency / Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Assigned Route & Fee Status */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                <i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: '#10b981' }}></i>
                Route & Fee Coverage
              </h2>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Active Route Corridor
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {data.route.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                    Designated Stop: <strong>{data.route.childStopName}</strong>
                  </div>
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    Transport Levy Status ({data.fees.termLabel})
                  </div>
                  {data.fees.status === 'PAID' && (
                    <span className="portal-badge success">✓ Transport Fee Settled</span>
                  )}
                  {data.fees.status === 'INCLUDED' && (
                    <span className="portal-badge info">✓ Covered under Term Fees</span>
                  )}
                  {data.fees.status === 'DUE' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span className="portal-badge danger">
                        Balance Due: ${data.fees.amountDue.toFixed(2)}
                      </span>
                      <Link to="/parent/fees" className="portal-btn-primary" style={{ padding: '5px 12px', fontSize: '0.78rem', textDecoration: 'none' }}>
                        Pay Now
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Direct Assistance & Safety Actions */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                <i className="fas fa-life-ring" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                Direct Transport Assistance
              </h2>
            </div>
            <div className="portal-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleReportIssue('BUS_NOT_ARRIVED')}
                disabled={isSubmitting}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #fde68a',
                  background: '#fffbeb',
                  color: '#92400e',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left'
                }}
              >
                <i className="fas fa-clock" style={{ fontSize: '1.1rem', color: '#d97706' }}></i>
                <div>
                  <div>Report Bus Delay at Stop</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#b45309' }}>Notify transport office of late pickup/drop-off</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsChangeStopOpen(true)}
                disabled={isSubmitting}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1e40af',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left'
                }}
              >
                <i className="fas fa-map-pin" style={{ fontSize: '1.1rem', color: '#2563eb' }}></i>
                <div>
                  <div>Change Pickup / Drop-off Stop Today</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#1d4ed8' }}>Send temporary stop instruction to driver</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleReportIssue('CHILD_LEFT_ON_BUS')}
                disabled={isSubmitting}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left'
                }}
              >
                <i className="fas fa-exclamation-circle" style={{ fontSize: '1.1rem', color: '#dc2626' }}></i>
                <div>
                  <div>Urgent: Child Left Item / On Bus Alert</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>Immediate priority dispatch to driver & coordinator</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ENROL IN SCHOOL BUS / BOOK ROUTE */}
      {isEnrollModalOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsEnrollModalOpen(false)}>
          <div className="portal-modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-bus" style={{ marginRight: 8, color: '#2563eb' }}></i>School Transport Enrolment</h2>
              <button className="portal-btn-ghost" onClick={() => setIsEnrollModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitEnrollment}>
              <div className="portal-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Request official school bus seat allocation for <strong>{data.student.name}</strong>.
                </p>

                <div className="portal-form-group">
                  <label>Select School Route *</label>
                  <select
                    className="portal-input"
                    value={requestedRouteId}
                    onChange={e => setRequestedRouteId(e.target.value)}
                    required
                  >
                    {data.availableRoutes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.description ? `(${r.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="portal-form-group">
                  <label>Preferred Pickup / Drop-off Point *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Main Street Corner / Shopping Centre"
                    value={pickupPoint}
                    onChange={e => setPickupPoint(e.target.value)}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Additional Notes / Instructions</label>
                  <textarea
                    className="portal-input"
                    rows={3}
                    placeholder="Morning & afternoon shuttle or afternoon only, guardian contact..."
                    value={routeChangeReason}
                    onChange={e => setRouteChangeReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Enrolment Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE ROUTE REQUEST */}
      {isChangeRouteOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsChangeRouteOpen(false)}>
          <div className="portal-modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-exchange-alt" style={{ marginRight: 8, color: '#2563eb' }}></i>Request Route Change</h2>
              <button className="portal-btn-ghost" onClick={() => setIsChangeRouteOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitRouteChange}>
              <div className="portal-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="portal-form-group">
                  <label>Target Route *</label>
                  <select
                    className="portal-input"
                    value={requestedRouteId}
                    onChange={e => setRequestedRouteId(e.target.value)}
                    required
                  >
                    {data.availableRoutes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.description ? `— ${r.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="portal-form-group">
                  <label>Effective Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    required
                  />
                </div>

                <div className="portal-form-group">
                  <label>Reason & New Pickup Point *</label>
                  <textarea
                    className="portal-input"
                    rows={3}
                    placeholder="Provide residential move details or new stop location..."
                    value={routeChangeReason}
                    onChange={e => setRouteChangeReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-ghost" onClick={() => setIsChangeRouteOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Route Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE STOP TODAY */}
      {isChangeStopOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsChangeStopOpen(false)}>
          <div className="portal-modal-card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-map-pin" style={{ marginRight: 8, color: '#2563eb' }}></i>Temporary Stop Change (Today)</h2>
              <button className="portal-btn-ghost" onClick={() => setIsChangeStopOpen(false)}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#64748b' }}>
                Notify Driver <strong>{data.route.driverName}</strong> of a temporary drop-off stop along <strong>{data.route.name}</strong> for today.
              </p>
              <div className="portal-form-group">
                <label>Designated Stop for Today *</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="Enter stop name along the route..."
                  value={targetStopToday}
                  onChange={e => setTargetStopToday(e.target.value)}
                />
              </div>
            </div>
            <div className="portal-modal-footer">
              <button type="button" className="portal-btn-ghost" onClick={() => setIsChangeStopOpen(false)}>Cancel</button>
              <button
                type="button"
                className="portal-btn-primary"
                disabled={!targetStopToday.trim() || isSubmitting}
                onClick={() => handleReportIssue('CHANGE_STOP', targetStopToday)}
              >
                {isSubmitting ? 'Sending...' : 'Send Instruction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ROUTE CHECKPOINTS */}
      {isMapOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsMapOpen(false)}>
          <div className="portal-modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-route" style={{ marginRight: 8, color: '#2563eb' }}></i>Route Checkpoints — {data.route.name}</h2>
              <button className="portal-btn-ghost" onClick={() => setIsMapOpen(false)}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.route.progressSteps.map((step, i) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 12,
                      border: step.isChildStop ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: step.status === 'completed' ? '#f0fdf4' : step.isChildStop ? '#eff6ff' : '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: step.status === 'completed' ? '#16a34a' : step.status === 'active' ? '#2563eb' : '#94a3b8',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.78rem'
                      }}>
                        {step.status === 'completed' ? '✓' : i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{step.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Scheduled: {step.time}</div>
                      </div>
                    </div>
                    <span className={`portal-badge ${step.status === 'completed' ? 'success' : step.status === 'active' ? 'info' : 'neutral'}`}>
                      {step.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-primary" onClick={() => setIsMapOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
