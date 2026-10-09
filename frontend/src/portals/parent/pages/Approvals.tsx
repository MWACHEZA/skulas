import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface TripApproval {
  id: string;
  tripId: string;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  signatureName?: string | null;
  consentedAt?: string | null;
  paymentStatus: string;
  invoiceId?: string | null;
  trip: {
    id: string;
    title: string;
    type: string;
    destination: string;
    purpose?: string | null;
    date: string;
    departureTime?: string | null;
    returnTime?: string | null;
    cost: number;
    currency: string;
    transport?: string | null;
    bus?: { name: string; number: string } | null;
    staff?: { name: string; phone?: string } | null;
    nurseStaff?: { name: string; phone?: string } | null;
    riskAssessmentFile?: string | null;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    itinerary?: string | null;
    consentDeadline?: string | null;
  };
}

interface ExeatApproval {
  id: string;
  type: string;
  reason: string;
  departureAt: string;
  returnAt: string;
  status: string;
  parentSignature?: string | null;
  approvedByHousemaster?: { name: string; phone?: string } | null;
}

interface MedicalApproval {
  id: string;
  consentType: string;
  status: string;
  allergiesConfirmed: boolean;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  signatureName?: string | null;
}

export default function ParentApprovals() {
  const { user, activeEntity } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const childId = activeEntity?.id || 'default-child';
  const childName = activeEntity?.name || 'Child';

  // Module toggles
  const isBoardingEnabled = (user?.school as any)?.modules?.boarding ?? true;
  const isClinicEnabled = (user?.school as any)?.modules?.clinic ?? true;

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<'excursions' | 'exeats' | 'medical'>('excursions');

  // Approvals State
  const [tripsList, setTripsList] = useState<TripApproval[]>([]);
  const [exeatsList, setExeatsList] = useState<ExeatApproval[]>([]);
  const [medicalList, setMedicalList] = useState<MedicalApproval[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected item for legal sign-off modal
  const [selectedTrip, setSelectedTrip] = useState<TripApproval | null>(null);
  const [legalConsentChecked, setLegalConsentChecked] = useState(false);
  const [riskAssessmentChecked, setRiskAssessmentChecked] = useState(false);
  const [agreeToPayChecked, setAgreeToPayChecked] = useState(false);
  const [signatureName, setSignatureName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load approvals from backend
  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/parent/approvals?studentId=${childId}`);
      if (res.data?.success && res.data.approvals) {
        setTripsList(res.data.approvals.excursions || []);
        setExeatsList(res.data.approvals.exeats || []);
        setMedicalList(res.data.approvals.medical || []);
      }
    } catch (err: any) {
      // Fallback demo seed if local test without schoolId
      console.warn('Parent approvals endpoint fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [childId]);

  // Open Sign-off Modal
  const handleOpenSignOff = (item: TripApproval) => {
    setSelectedTrip(item);
    setLegalConsentChecked(false);
    setRiskAssessmentChecked(false);
    setAgreeToPayChecked(item.trip.cost > 0);
    setSignatureName(user?.name || '');
  };

  // Submit Trip Legal Consent
  const handleSubmitConsent = async (action: 'approve' | 'decline') => {
    if (!selectedTrip) return;

    if (action === 'approve') {
      if (!legalConsentChecked) {
        showToast('Please check the parental consent box to proceed.', 'warning');
        return;
      }
      if (!riskAssessmentChecked) {
        showToast('Please acknowledge the safety protocols and risk assessment.', 'warning');
        return;
      }
      if (!signatureName.trim()) {
        showToast('Please type your full legal name as digital signature.', 'warning');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await api.post(`/api/parent/approvals/trips/${selectedTrip.id}/respond`, {
        action,
        signatureName: signatureName.trim(),
        agreedRiskAssessment: riskAssessmentChecked,
        agreedToPay: agreeToPayChecked
      });

      if (res.data?.success) {
        showToast(res.data.message || 'Excursion consent saved.', 'success');
        setSelectedTrip(null);
        fetchApprovals();

        // If newly invoiced and cost > 0, offer prompt to pay
        if (action === 'approve' && selectedTrip.trip.cost > 0) {
          if (window.confirm(`Consent granted! An excursion fee of $${selectedTrip.trip.cost} has been invoiced to ${childName}'s account. Would you like to proceed to the payment portal now?`)) {
            navigate('/parent/fees');
          }
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit legal consent', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action for Exeat
  const handleExeatRespond = async (exeatId: string, action: 'approve' | 'decline') => {
    try {
      const res = await api.post(`/api/parent/approvals/exeats/${exeatId}/respond`, {
        action,
        signatureName: user?.name || 'Parent'
      });
      if (res.data?.success) {
        showToast(res.data.message || 'Exeat request updated.', 'success');
        fetchApprovals();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update exeat', 'error');
    }
  };

  // Counts
  const pendingTrips = tripsList.filter(t => t.status === 'pending');
  const pastTrips = tripsList.filter(t => t.status !== 'pending');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 60px' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <i className="fas fa-file-signature" style={{ fontSize: '1.3rem' }}></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Parental Approvals & Legal Consent
            </h1>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Review, legally sign, and authorize school trips, boarding exeats, and clinic triage for {childName}.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Strictly Separated Consent Categories */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #e2e8f0',
        marginBottom: 24,
        background: '#fff',
        padding: '6px 12px 0',
        borderRadius: '12px 12px 0 0'
      }}>
        <button
          onClick={() => setActiveTab('excursions')}
          style={{
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            color: activeTab === 'excursions' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'excursions' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            marginBottom: -2,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-route"></i>
          Excursions & School Trips
          {pendingTrips.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: 10,
              fontWeight: 800
            }}>
              {pendingTrips.length}
            </span>
          )}
        </button>

        {/* Boarding Exeat tab (Hidden dynamically if boarding is OFF) */}
        {isBoardingEnabled && (
          <button
            onClick={() => setActiveTab('exeats')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: activeTab === 'exeats' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'exeats' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-bed"></i>
            Boarding Exeat Requests ({exeatsList.length})
          </button>
        )}

        {/* Clinic Medical Consent tab (Hidden dynamically if clinic is OFF) */}
        {isClinicEnabled && (
          <button
            onClick={() => setActiveTab('medical')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: activeTab === 'medical' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'medical' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-heartbeat"></i>
            Medical Emergency & Clinic Care ({medicalList.length})
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CATEGORY 1: EXCURSIONS & TRIPS
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'excursions' && (
        <div>
          {/* Pending Action Items */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.8rem'
              }}>
                {pendingTrips.length}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                Pending Excursion Consents Awaiting Sign-off
              </h2>
            </div>

            {pendingTrips.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '32px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#16a34a', marginBottom: 10 }}></i>
                <div style={{ fontWeight: 700, color: '#334155' }}>All Excursions Consented</div>
                <div style={{ fontSize: '0.88rem', marginTop: 4 }}>
                  No pending field trips or tournaments requiring parental sign-off for {childName}.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pendingTrips.map(item => {
                  const t = item.trip;
                  const isExpired = t.consentDeadline && new Date(t.consentDeadline) < new Date();

                  return (
                    <div
                      key={item.id}
                      className="portal-card"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 14,
                        padding: '20px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#eff6ff',
                              color: '#2563eb',
                              textTransform: 'uppercase'
                            }}>
                              {t.type}
                            </span>

                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: t.riskLevel === 'HIGH' ? '#fee2e2' : t.riskLevel === 'MEDIUM' ? '#fef3c7' : '#dcfce7',
                              color: t.riskLevel === 'HIGH' ? '#dc2626' : t.riskLevel === 'MEDIUM' ? '#d97706' : '#16a34a'
                            }}>
                              Risk: {t.riskLevel}
                            </span>

                            {t.consentDeadline && (
                              <span style={{ fontSize: '0.78rem', color: isExpired ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                                <i className="far fa-clock" style={{ marginRight: 4 }}></i>
                                Deadline: {new Date(t.consentDeadline).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>

                          <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                            {t.title}
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.9rem', marginBottom: 10 }}>
                            <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                            <strong>{t.destination}</strong>
                            {t.purpose && <span>— {t.purpose}</span>}
                          </div>
                        </div>

                        {/* Cost Badge */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: t.cost > 0 ? '#16a34a' : '#475569' }}>
                            {t.cost > 0 ? `$${t.cost} ${t.currency}` : 'Free / Included'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {t.cost > 0 ? 'Invoiced upon consent' : 'School sponsored'}
                          </div>
                        </div>
                      </div>

                      {/* Excursion Schedule & Logistics Grid */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 10,
                        fontSize: '0.85rem',
                        color: '#475569',
                        margin: '12px 0 16px'
                      }}>
                        <div>
                          <strong>Date:</strong> {new Date(t.date).toLocaleDateString('en-GB')}
                        </div>
                        <div>
                          <strong>Hours:</strong> {t.departureTime || '07:30'} - {t.returnTime || '16:30'}
                        </div>
                        <div>
                          <strong>Transport:</strong> {t.bus?.name || t.transport || 'School Bus'}
                        </div>
                        <div>
                          <strong>Lead Teacher:</strong> {t.staff?.name || 'Assigned Staff'}
                        </div>
                      </div>

                      {/* Itinerary Preview */}
                      {t.itinerary && (
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 16 }}>
                          <strong>Itinerary:</strong>
                          <div style={{ whiteSpace: 'pre-line', marginTop: 4, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            {t.itinerary}
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                        <div>
                          {t.riskAssessmentFile && (
                            <a
                              href={t.riskAssessmentFile}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: '#4f46e5',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <i className="fas fa-file-pdf"></i>
                              View Risk Assessment & Safety Protocols
                            </a>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => handleOpenSignOff(item)}
                            disabled={Boolean(isExpired)}
                            className="btn btn-primary"
                            style={{
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              cursor: isExpired ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8
                            }}
                          >
                            <i className="fas fa-signature"></i>
                            Review & Legally Sign
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Excursion Consents */}
          {pastTrips.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155', marginBottom: 12 }}>
                Excursion History & Granted Permissions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pastTrips.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.trip.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {p.trip.destination} • {new Date(p.trip.date).toLocaleDateString('en-GB')}
                        {p.signatureName && ` • Signed by: ${p.signatureName}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: p.status === 'approved' ? '#dcfce7' : '#fee2e2',
                        color: p.status === 'approved' ? '#15803d' : '#b91c1c'
                      }}>
                        {p.status}
                      </span>

                      {p.invoiceId && (
                        <button
                          onClick={() => navigate('/parent/fees')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          View Invoice
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CATEGORY 2: BOARDING EXEATS (Hidden if boarding module is OFF)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'exeats' && isBoardingEnabled && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800 }}>
            Boarding Exeat Permissions
          </h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.88rem' }}>
            Authorize weekend leaves, medical appointments, and emergency departure from the boarding hostel.
          </p>

          {exeatsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              No active exeat permission requests on file.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {exeatsList.map(ex => (
                <div key={ex.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <strong style={{ textTransform: 'capitalize' }}>{ex.type} Exeat</strong> — {ex.reason}
                    </div>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: ex.status === 'approved' ? '#dcfce7' : '#fef3c7',
                      color: ex.status === 'approved' ? '#15803d' : '#b45309'
                    }}>
                      {ex.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
                    Departure: {new Date(ex.departureAt).toLocaleString('en-GB')} | Expected Return: {new Date(ex.returnAt).toLocaleString('en-GB')}
                  </div>

                  {ex.status === 'pending_parent' && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleExeatRespond(ex.id, 'decline')}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', borderRadius: 6, fontSize: '0.82rem', cursor: 'pointer' }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleExeatRespond(ex.id, 'approve')}
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', borderRadius: 6, fontSize: '0.82rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Approve Exeat
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CATEGORY 3: CLINIC MEDICAL EMERGENCY CONSENTS
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'medical' && isClinicEnabled && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800 }}>
            Medical Emergency & Clinical Care Clearances
          </h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.88rem' }}>
            Consents for triage triage, emergency medical dispensary, and emergency hospital transfer protocols.
          </p>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  Annual Emergency Triage & Hospital Transfer Indemnity
                </h4>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                  Covers emergency paramedic transfer, allergy triage, and doctor-prescribed emergency injections.
                </div>
              </div>
              <span style={{ padding: '3px 8px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>
                ON FILE
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 8 }}>
              Emergency Contact: {user?.phone || 'Primary Guardian'} • Signed by {user?.name || 'Parent'}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LEGAL DIGITAL SIGN-OFF MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      {selectedTrip && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            maxWidth: 680,
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: 26,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#eff6ff',
                  color: '#2563eb',
                  textTransform: 'uppercase'
                }}>
                  Legal Authorization Document
                </span>
                <h2 style={{ margin: '6px 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  Parental Consent & Indemnity
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                  {selectedTrip.trip.title} • {selectedTrip.trip.destination}
                </div>
              </div>

              <button
                onClick={() => setSelectedTrip(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Trip Briefing Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 16px',
              fontSize: '0.85rem',
              color: '#334155',
              marginBottom: 18
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div><strong>Learner:</strong> {childName}</div>
                <div><strong>Excursion Date:</strong> {new Date(selectedTrip.trip.date).toLocaleDateString('en-GB')}</div>
                <div><strong>Hours:</strong> {selectedTrip.trip.departureTime || '07:30'} - {selectedTrip.trip.returnTime || '16:30'}</div>
                <div><strong>Excursion Fee:</strong> ${selectedTrip.trip.cost} {selectedTrip.trip.currency}</div>
              </div>

              {selectedTrip.trip.riskAssessmentFile && (
                <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
                  <a
                    href={selectedTrip.trip.riskAssessmentFile}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <i className="fas fa-external-link-alt" style={{ marginRight: 5 }}></i>
                    Click to review school risk assessment & indemnity schedule (PDF)
                  </a>
                </div>
              )}
            </div>

            {/* Checkbox Disclosures */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={legalConsentChecked}
                  onChange={e => setLegalConsentChecked(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <span>
                  <strong>Parental Permission:</strong> I hereby grant consent for my child, {childName}, to participate in the school excursion to {selectedTrip.trip.destination}.
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={riskAssessmentChecked}
                  onChange={e => setRiskAssessmentChecked(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <span>
                  <strong>Risk Assessment & Safety Acknowledgement:</strong> I have reviewed the excursion itinerary and safety precautions, and confirm my child is fit to attend.
                </span>
              </label>

              {selectedTrip.trip.cost > 0 && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeToPayChecked}
                    onChange={e => setAgreeToPayChecked(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2 }}
                  />
                  <span>
                    <strong>Fee Agreement:</strong> I agree to settle the excursion fee of ${selectedTrip.trip.cost} {selectedTrip.trip.currency}. I understand an invoice will be automatically posted to my student billing ledger.
                  </span>
                </label>
              )}
            </div>

            {/* Typed Signature Input */}
            <div style={{
              background: '#f1f5f9',
              borderRadius: 10,
              padding: '16px',
              border: '1px solid #cbd5e1',
              marginBottom: 20
            }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: 6 }}>
                Digital Legal Signature (Type Full Legal Name) *
              </label>
              <input
                type="text"
                value={signatureName}
                onChange={e => setSignatureName(e.target.value)}
                placeholder="e.g. Johnathan Moyo"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>
                By submitting this form, you certify under electronic signature law that you are the lawful parent or guardian of {childName}.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitConsent('decline')}
                className="btn btn-secondary"
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Decline Excursion
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitConsent('approve')}
                className="btn btn-primary"
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Recording Signature...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    {selectedTrip.trip.cost > 0 ? 'Approve & Settle' : 'Approve Consent'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
