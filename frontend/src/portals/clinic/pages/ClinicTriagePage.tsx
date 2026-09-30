import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import SearchInput from '../../../components/shared/SearchInput';

export default function ClinicTriagePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [patientBanner, setPatientBanner] = useState<any>(null);

  // Form Fields
  const [source, setSource] = useState('WALK_IN');
  const [acuity, setAcuity] = useState('GREEN');
  const [presentingComplaint, setPresentingComplaint] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [consentOverride, setConsentOverride] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const quickSymptoms = ['Headache', 'Fever', 'Upset stomach', 'Sore throat', 'Ankle sprain', 'Minor abrasion', 'Cough', 'Fatigue'];

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/clinic/reports/patients-search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.get(`/clinic/triage/patient-banner/${student.id}`);
      setPatientBanner(res.data);
    } catch (err) {
      console.error('Failed to load patient banner:', err);
    }
  };

  const addSymptom = (sym: string) => {
    if (!presentingComplaint) {
      setPresentingComplaint(sym);
    } else if (!presentingComplaint.includes(sym)) {
      setPresentingComplaint(`${presentingComplaint}, ${sym}`);
    }
  };

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage('Please select a student first');
      return;
    }
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const res = await api.post('/clinic/triage/record', {
        studentId: selectedStudent.id,
        source,
        acuity,
        presentingComplaint,
        isConfidential,
        isEmergency,
        temp,
        bp,
        pulse,
        spo2,
        weight,
        height,
        consentOverride
      });

      setSuccessMessage(`Triage recorded successfully! Episode Code: ${res.data.visit?.visitCode}. Patient transferred to consultation queue.`);
      // Reset form
      setSelectedStudent(null);
      setPatientBanner(null);
      setPresentingComplaint('');
      setTemp('');
      setBp('');
      setPulse('');
      setSpo2('');
      setWeight('');
      setHeight('');
      setIsConfidential(false);
      setIsEmergency(false);
      setConsentOverride(false);
    } catch (err: any) {
      if (err.response?.data?.requiresConsentOverride) {
        setErrorMessage('Warning: Student does not have treatment consent on file. Check "Override Consent" to proceed if deemed necessary by nurse.');
      } else {
        setErrorMessage(err.response?.data?.error || 'Failed to record triage');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-stethoscope" style={{ color: '#10b981' }} />
          Clinical Patient Intake &amp; Triage
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Universal entry point for walk-ins, teacher referrals, student bookings, and hostel emergency alerts.
        </p>
      </div>

      {successMessage && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: 14, borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-check-circle" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 14, borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-exclamation-circle" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Patient Search Section */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>1. Search &amp; Identify Patient</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            placeholder="Search by student name or admission number (e.g. STU-001)..."
            value={searchQuery}
            onChange={setSearchQuery}
            loading={searching}
            onClear={() => setSearchResults([])}
            width="100%"
          />
        </div>

        {searchResults.length > 0 && (
          <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 6, maxHeight: 200, overflowY: 'auto' }}>
            {searchResults.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <div>
                  <strong>{s.name}</strong> ({s.studentId}) &bull; Class: {s.class?.name || 'N/A'}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>Select &rarr;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Red Alert Banner for Allergies and Chronic Conditions */}
      {patientBanner && (
        <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 8, padding: 16, marginBottom: 24, boxShadow: '0 2px 4px rgba(239,68,68,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#991b1b', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
            <i className="fas fa-exclamation-triangle fa-lg" />
            CRITICAL MEDICAL ALERT BANNER: {patientBanner.name} ({patientBanner.studentId})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.9rem', color: '#7f1d1d' }}>
            <div><strong>Class:</strong> {patientBanner.className} | <strong>Hostel:</strong> {patientBanner.hostelName}</div>
            <div><strong>Blood Group:</strong> {patientBanner.bloodGroup}</div>
            <div><strong>Allergies:</strong> <span style={{ color: '#b91c1c', fontWeight: 700 }}>{patientBanner.allergies}</span></div>
            <div><strong>Chronic Conditions:</strong> <span style={{ color: '#b91c1c', fontWeight: 700 }}>{patientBanner.chronicConditions}</span></div>
            <div>
              <strong>Treatment Consent:</strong>{' '}
              {patientBanner.treatmentConsent ? (
                <span style={{ color: '#15803d', fontWeight: 700 }}>On File &#10003;</span>
              ) : (
                <span style={{ color: '#b91c1c', fontWeight: 700 }}>MISSING / NOT ON FILE &#9888;</span>
              )}
            </div>
            <div><strong>Emergency Contact:</strong> {patientBanner.emergencyContact?.name} ({patientBanner.emergencyContact?.phone || 'No phone'})</div>
          </div>
        </div>
      )}

      {/* Triage Form */}
      {selectedStudent && (
        <form onSubmit={handleSubmitTriage} style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: 18 }}>
            2. Vitals Assessment &amp; Clinical Triage Form
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Intake Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              >
                <option value="WALK_IN">Walk-in Patient</option>
                <option value="TEACHER_REFERRAL">Teacher Classroom Referral</option>
                <option value="STUDENT_APPOINTMENT">Student Appt Booking</option>
                <option value="MATRON_ALERT">Hostel Matron Urgent Alert</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Triage Acuity</label>
              <select
                value={acuity}
                onChange={(e) => setAcuity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '2px solid',
                  borderColor: acuity === 'RED' ? '#ef4444' : acuity === 'YELLOW' ? '#f59e0b' : '#10b981',
                  fontWeight: 600
                }}
              >
                <option value="GREEN">GREEN &bull; Routine / Non-Urgent</option>
                <option value="YELLOW">YELLOW &bull; Moderate Urgency</option>
                <option value="RED">RED &bull; High Acuity / Immediate Attention</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                />
                Confidential Visit (Hidden from Parent)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                />
                Emergency Incident
              </label>
            </div>
          </div>

          {/* Vitals Grid */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 12 }}>Vital Signs Measurement</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="37.0"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>BP (mmHg)</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Pulse (bpm)</label>
                <input
                  type="number"
                  placeholder="75"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>SpO2 (%)</label>
                <input
                  type="number"
                  placeholder="98"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="55.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Height (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="165"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>

          {/* Quick Symptoms & Complaint */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
              Presenting Complaint / Symptoms
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {quickSymptoms.map((sym) => (
                <button
                  type="button"
                  key={sym}
                  onClick={() => addSymptom(sym)}
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  + {sym}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={presentingComplaint}
              onChange={(e) => setPresentingComplaint(e.target.value)}
              placeholder="Describe student's symptoms, duration, reported onset, and observations..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              required
            />
          </div>

          {!patientBanner?.treatmentConsent && !isEmergency && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: 12, borderRadius: 6, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consentOverride}
                  onChange={(e) => setConsentOverride(e.target.checked)}
                />
                Override missing consent (Nurse clinical emergency discretion)
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-arrow-right" />}
              Save &amp; Transfer to Consultations
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
