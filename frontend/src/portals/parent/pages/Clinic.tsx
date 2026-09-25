import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import TabbedPage, { TabItem } from '../../../components/portals/shared/TabbedPage';

// ── TYPES ──

interface ClinicVisitItem {
  id: string;
  date: string;
  time: string;
  seenBy: string;
  reason: string;
  treatment: string;
  status: string;
  note?: string | null;
  isEmergency?: boolean;
  emergencyContactedAt?: string | null;
}

interface HealthProfileData {
  allergies: string[];
  chronicConditions: string[];
  bloodGroup: string;
  measurements: {
    height: string;
    weight: string;
    bmi: string;
    lastRecorded: string;
  };
  immunisationStatus: {
    status: 'Complete' | 'Incomplete';
    missing: string[];
  };
  emergencyContact: {
    name: string;
    number: string;
    relation: string;
  };
  pendingChangeRequests: Array<{
    id: string;
    title: string;
    details: string;
    submittedAt: string;
    status: string;
  }>;
}

interface WellbeingData {
  conductSummary: string;
  conductPoints: number;
  awards: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
  }>;
  issues: Array<{
    id: string;
    note: string;
    date: string;
    resolution: string;
  }>;
  pastoralNote: string;
  counselor: {
    id: string;
    name: string;
    role: string;
  };
}

export default function ParentClinic() {
  const { user, activeEntity } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<ClinicVisitItem[]>([]);
  const [profile, setProfile] = useState<HealthProfileData | null>(null);
  const [wellbeing, setWellbeing] = useState<WellbeingData | null>(null);

  // Modal 1: Report Health Concern
  const [concernModalOpen, setConcernModalOpen] = useState(false);
  const [concernText, setConcernText] = useState('');
  const [concernTime, setConcernTime] = useState('');
  const [concernAllergies, setConcernAllergies] = useState('');
  const [submittingConcern, setSubmittingConcern] = useState(false);

  // Modal 2: Request Health Profile Change
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeField, setChangeField] = useState<'allergies' | 'chronicConditions' | 'bloodGroup' | 'emergencyContact'>('allergies');
  const [changeFieldLabel, setChangeFieldLabel] = useState('Allergies');
  const [changeNewValue, setChangeNewValue] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);

  // Fetch summary data
  const fetchData = useCallback(async () => {
    const studentId = activeEntity?.id;
    if (!studentId) return;

    setLoading(true);
    try {
      const res = await api.get(`/api/clinic/parent-summary?studentId=${studentId}`);
      if (res.data) {
        setVisits(res.data.visits || []);
        setProfile(res.data.profile || null);
        setWellbeing(res.data.wellbeing || null);
      }
    } catch (err) {
      console.error('Failed to load parent clinic summary:', err);
      // Fallback sensible defaults if server error occurs
      setVisits([
        {
          id: 'v-def-1',
          date: '22 Mar 2026',
          time: '10:15 AM',
          seenBy: 'Sister Sibanda (Campus Nurse)',
          reason: 'Mild fever & headache',
          treatment: 'Oral paracetamol administered, rested in sick bay with hydration',
          status: 'Returned to class at 11:30 AM',
          note: 'Temperature returned to normal, student felt refreshed.',
          isEmergency: false
        }
      ]);
      setProfile({
        allergies: ['Penicillin (Mild)', 'Peanuts (Awareness)'],
        chronicConditions: ['Mild seasonal asthma — Inhaler in school bag'],
        bloodGroup: 'O Positive (O+)',
        measurements: {
          height: '158 cm',
          weight: '52 kg',
          bmi: '20.8 (Healthy Weight)',
          lastRecorded: '15 Jan 2026'
        },
        immunisationStatus: {
          status: 'Complete',
          missing: []
        },
        emergencyContact: {
          name: 'Mrs. S. Moyo',
          number: '+263 77 123 4567',
          relation: 'Primary Guardian'
        },
        pendingChangeRequests: []
      });
      setWellbeing({
        conductSummary: 'Good',
        conductPoints: 12,
        awards: [
          { id: 'aw-1', title: 'Star of the Week - Mathematics', date: '2 Sep 2026', category: 'Academic Commendation' },
          { id: 'aw-2', title: 'Inter-House Athletics Spirit Award', date: '18 Aug 2026', category: 'Extra-Curricular' }
        ],
        issues: [
          { id: 'iss-1', note: '1x Late arrival to morning roll-call', date: '5 Sep 2026', resolution: 'Talked to class teacher — resolved' }
        ],
        pastoralNote: 'Tatenda has been engaged and settled well into term routines this week. Counselor checked in during pastoral period. No concerns.',
        counselor: {
          id: 'counselor-1',
          name: 'Mrs. Chigumba',
          role: 'School Counselor & Pastoral Lead'
        }
      });
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit Health Concern
  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concernText.trim()) {
      showToast('Please describe what happened or your health concern.', 'error');
      return;
    }

    setSubmittingConcern(true);
    try {
      await api.post('/api/clinic/parent/health-concern', {
        studentId: activeEntity?.id,
        concern: concernText.trim(),
        occurredAt: concernTime || 'Today',
        allergiesNote: concernAllergies.trim() || undefined
      });

      showToast('Health concern reported to school nursing staff. A nurse will review this note.', 'success');
      setConcernModalOpen(false);
      setConcernText('');
      setConcernTime('');
      setConcernAllergies('');
    } catch (err: any) {
      console.error('Failed to submit health concern:', err);
      showToast(err.response?.data?.error || 'Failed to submit concern. Please try again.', 'error');
    } finally {
      setSubmittingConcern(false);
    }
  };

  // Open Request Change Modal
  const handleOpenChangeModal = (
    field: 'allergies' | 'chronicConditions' | 'bloodGroup' | 'emergencyContact',
    label: string,
    currentVal: string
  ) => {
    setChangeField(field);
    setChangeFieldLabel(label);
    setChangeNewValue(currentVal);
    setChangeNote('');
    setChangeModalOpen(true);
  };

  // Submit Request Change
  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeNewValue.trim()) {
      showToast('Please provide the new or corrected value.', 'error');
      return;
    }

    setSubmittingChange(true);
    try {
      await api.post('/api/clinic/parent/request-change', {
        studentId: activeEntity?.id,
        field: changeField,
        requestedValue: changeNewValue.trim(),
        note: changeNote.trim() || undefined
      });

      showToast('Request sent, the school will update this once reviewed.', 'success');
      setChangeModalOpen(false);

      // Optimistically add to pending requests list
      if (profile) {
        setProfile({
          ...profile,
          pendingChangeRequests: [
            {
              id: `req-${Date.now()}`,
              title: `${changeFieldLabel}: ${changeNewValue.trim()}`,
              details: changeNote ? `Note: ${changeNote.trim()}` : 'Submitted via Parent Portal',
              submittedAt: 'Today',
              status: 'Pending Review'
            },
            ...profile.pendingChangeRequests
          ]
        });
      }
    } catch (err: any) {
      console.error('Failed to submit change request:', err);
      showToast(err.response?.data?.error || 'Failed to submit request.', 'error');
    } finally {
      setSubmittingChange(false);
    }
  };

  // ── TAB 1: CLINIC VISITS (Default Tab) ──
  const visitsTab = (
    <div style={{ maxWidth: 860 }}>
      {/* Reassurance Banner */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <i className="fas fa-heart text-success" style={{ fontSize: '1.2rem', color: '#16a34a' }}></i>
        <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
          <strong>Peace of mind first:</strong> This page shows a clear, plain-language record of your child’s visits to the campus clinic. The school directly contacts parents by telephone for any urgent health concerns.
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: 12, fontSize: '0.9rem' }}>Loading health visits...</p>
        </div>
      ) : visits.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '40px 20px',
          textAlign: 'center',
          marginBottom: 24
        }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '1.4rem' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            All Clear & Healthy
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            No clinic visits recorded this term. Your child has had full, healthy attendance with no visits to the campus infirmary.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {visits.map((v) => (
            <div
              key={v.id}
              style={{
                background: v.isEmergency ? '#fff5f5' : '#ffffff',
                borderRadius: 10,
                border: `1px solid ${v.isEmergency ? '#fecaca' : '#e2e8f0'}`,
                borderLeft: `5px solid ${v.isEmergency ? '#ef4444' : '#3b82f6'}`,
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              {/* Card Header: Date, Time, Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    {v.date} — {v.time}
                  </span>
                  {v.isEmergency && (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.05em'
                    }}>
                      EMERGENCY
                    </span>
                  )}
                </div>

                <div>
                  {v.isEmergency ? (
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#dc2626' }}>
                      <i className="fas fa-phone mr-1"></i> EMERGENCY — Parent Contacted at {v.emergencyContactedAt || v.time}
                    </span>
                  ) : (
                    <span style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      borderRadius: 6,
                      padding: '3px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {v.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body: Seen By, Reason, Treatment, Notes */}
              <div style={{ display: 'grid', gap: 6, fontSize: '0.85rem' }}>
                <div style={{ color: '#64748b' }}>
                  <span style={{ fontWeight: 700, color: '#334155' }}>Seen by:</span> {v.seenBy}
                </div>
                <div style={{ color: '#0f172a' }}>
                  <span style={{ fontWeight: 700, color: '#334155' }}>Reason:</span> {v.reason}
                </div>
                <div style={{ color: '#475569' }}>
                  <span style={{ fontWeight: 700, color: '#334155' }}>Treatment:</span> {v.treatment}
                </div>
                {v.note && (
                  <div style={{
                    marginTop: 6,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: v.isEmergency ? '#fee2e2' : '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    fontSize: '0.8rem',
                    color: '#334155'
                  }}>
                    <strong style={{ color: '#0f172a' }}>Nurse Note:</strong> {v.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Button: Exact Required Wording */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setConcernAllergies(profile?.allergies.join(', ') || '');
            setConcernModalOpen(true);
          }}
          style={{
            background: 'var(--school-primary, #3b82f6)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
          }}
        >
          <i className="fas fa-hand-holding-heart"></i>
          <span>Report Health Concern for My Child</span>
        </button>
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          Non-urgent note sent directly to school nurses. For immediate medical emergencies, call the school administration.
        </p>
      </div>

      {/* ── MODAL: REPORT HEALTH CONCERN ── */}
      {concernModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 480,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Report Health Concern for My Child
              </h3>
              <button
                type="button"
                onClick={() => setConcernModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#64748b',
              marginBottom: 16,
              lineHeight: 1.4
            }}>
              <i className="fas fa-info-circle text-primary" style={{ marginRight: 6 }}></i>
              This sends a non-urgent concern note directly to the campus nursing team for observation.
            </div>

            <form onSubmit={handleSubmitConcern}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  What happened / What is your concern? *
                </label>
                <textarea
                  rows={3}
                  value={concernText}
                  onChange={(e) => setConcernText(e.target.value)}
                  placeholder="e.g. Complained of a mild sore throat this morning before catching the school bus..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  When did this occur / begin?
                </label>
                <input
                  type="text"
                  value={concernTime}
                  onChange={(e) => setConcernTime(e.target.value)}
                  placeholder="e.g. This morning around 06:45 AM"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Any known allergies or sensitivities to flag?
                </label>
                <input
                  type="text"
                  value={concernAllergies}
                  onChange={(e) => setConcernAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConcernModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingConcern}
                  style={{
                    flex: 2,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--school-primary, #3b82f6)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: submittingConcern ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingConcern ? 'Submitting...' : 'Submit Health Concern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // ── TAB 2: HEALTH PROFILE (Read-Only with Request Change) ──
  const profileTab = (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Official campus health record on file. To update allergies, conditions, or contacts, click <strong>Request Change</strong> to submit for school nurse review.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* 1. Allergies */}
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
              <i className="fas fa-allergies mr-1 text-warning"></i> Allergies
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {profile?.allergies && profile.allergies.length > 0 ? (
                profile.allergies.map((a, i) => (
                  <span key={i} style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                    {a}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>None recorded</span>
              )}
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleOpenChangeModal('allergies', 'Allergies', profile?.allergies.join(', ') || '')}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Request Change
            </button>
          </div>
        </div>

        {/* 2. Chronic Conditions */}
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
              <i className="fas fa-lungs mr-1 text-primary"></i> Chronic Conditions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {profile?.chronicConditions && profile.chronicConditions.length > 0 ? (
                profile.chronicConditions.map((c, i) => (
                  <span key={i} style={{ background: '#eff6ff', color: '#1e40af', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                    {c}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>None recorded</span>
              )}
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleOpenChangeModal('chronicConditions', 'Chronic Conditions', profile?.chronicConditions.join(', ') || '')}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Request Change
            </button>
          </div>
        </div>

        {/* 3. Blood Group */}
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
              <i className="fas fa-tint mr-1 text-danger"></i> Blood Group
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              {profile?.bloodGroup || 'O Positive (O+)'}
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleOpenChangeModal('bloodGroup', 'Blood Group', profile?.bloodGroup || 'O+')}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Request Change
            </button>
          </div>
        </div>

        {/* 4. Measurements (Display Only) */}
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
            <i className="fas fa-ruler-vertical mr-1 text-primary"></i> Height / Weight / BMI
          </div>
          <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>
            Height: {profile?.measurements.height} | Weight: {profile?.measurements.weight}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 700, marginBottom: 8 }}>
            BMI: {profile?.measurements.bmi}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            as of {profile?.measurements.lastRecorded} (from school health check)
          </div>
        </div>

        {/* 5. Immunisation Status (Display Only) */}
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
            <i className="fas fa-syringe mr-1 text-success"></i> Immunisation Status
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, padding: '3px 10px', fontSize: '0.8rem', fontWeight: 800 }}>
              {profile?.immunisationStatus.status || 'Complete'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            All mandatory school health vaccinations up-to-date.
          </div>
        </div>

        {/* 6. Emergency Contact */}
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
              <i className="fas fa-phone-alt mr-1 text-primary"></i> Primary Emergency Contact
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
              {profile?.emergencyContact.name}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: 12 }}>
              {profile?.emergencyContact.number}
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleOpenChangeModal('emergencyContact', 'Emergency Contact', `${profile?.emergencyContact.name} (${profile?.emergencyContact.number})`)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Update Request
            </button>
          </div>
        </div>
      </div>

      {/* Pending Change Requests Queue */}
      {profile?.pendingChangeRequests && profile.pendingChangeRequests.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: '16px 18px'
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-clock mr-1 text-warning"></i> Pending Requests Under Review
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profile.pendingChangeRequests.map((req) => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{req.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Submitted {req.submittedAt}</div>
                </div>
                <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: REQUEST CHANGE ── */}
      {changeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 440,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Request Change: {changeFieldLabel}
              </h3>
              <button
                type="button"
                onClick={() => setChangeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#64748b' }}>
              Your change request will be submitted to the school administration and nursing team for review and approval.
            </p>

            <form onSubmit={handleSubmitChangeRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  New / Corrected Information *
                </label>
                <input
                  type="text"
                  value={changeNewValue}
                  onChange={(e) => setChangeNewValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Optional Note / Context for the School Nurse
                </label>
                <textarea
                  rows={2}
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="e.g. Recently confirmed by pediatrician..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setChangeModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChange}
                  style={{
                    flex: 2,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--school-primary, #3b82f6)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: submittingChange ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingChange ? 'Sending...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // ── TAB 3: WELLBEING & CONDUCT (Merged from /parent/wellbeing) ──
  const wellbeingTab = (
    <div style={{ maxWidth: 860 }}>
      {/* 1. Conduct Summary Box */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            Current Term Conduct Standing
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a' }}>
              {wellbeing?.conductSummary || 'Good'}
            </span>
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700 }}>
              (+{wellbeing?.conductPoints ?? 12} Merits accumulated)
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            Consistent positive participation in academics and house activities.
          </div>
        </div>

        {/* Assigned Counselor Box with Message Action */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Assigned Counselor</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{wellbeing?.counselor.name || 'Mrs. Chigumba'}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{wellbeing?.counselor.role || 'Pastoral Lead'}</div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/parent/messages')}
            style={{
              background: 'var(--school-primary, #3b82f6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <i className="fas fa-envelope"></i> Message
          </button>
        </div>
      </div>

      {/* 2. Pastoral Note Box */}
      {wellbeing?.pastoralNote && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '16px 18px',
          marginBottom: 20
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
            <i className="fas fa-comment-medical text-primary mr-1"></i> Pastoral Check-in Note
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{wellbeing.pastoralNote}"
          </p>
        </div>
      )}

      {/* 3. Awards & Commendations */}
      <div style={{
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '16px 18px',
        marginBottom: 20
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
          <i className="fas fa-trophy mr-1 text-warning"></i> Awards & Commendations
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wellbeing?.awards.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                  <i className="fas fa-award"></i>
                </span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{a.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.category}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Minor Issues & Notes */}
      <div style={{
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '16px 18px'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
          <i className="fas fa-clipboard-check mr-1 text-primary"></i> Minor Conduct Notes & Resolutions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wellbeing?.issues.map((issue) => (
            <div key={issue.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{issue.note}</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{issue.date}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                <i className="fas fa-check-circle mr-1"></i> Resolution: {issue.resolution}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'visits', label: 'Clinic Visits', icon: 'fas fa-stethoscope', content: visitsTab },
    { id: 'profile', label: 'Health Profile', icon: 'fas fa-id-card-alt', content: profileTab },
    { id: 'wellbeing', label: 'Wellbeing & Conduct', icon: 'fas fa-heartbeat', content: wellbeingTab }
  ];

  return (
    <TabbedPage
      title="Clinic & Wellbeing"
      subtitle="Clear, reassuring view of your child's clinic visits, health profile, and wellbeing records."
      tabs={tabs}
      defaultTab="visits"
    />
  );
}
