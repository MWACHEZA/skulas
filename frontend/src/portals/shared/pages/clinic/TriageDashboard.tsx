import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

export default function TriageDashboard() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetUserId: '',
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
    presentingComplaint: '',
    triageLevel: 'GREEN',
    conditionDetails: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    status: 'OPEN'
  });

  // Automatically calculate triage level based on vitals
  useEffect(() => {
    let level = 'GREEN'; // Default to Green / Minimal
    const temp = parseFloat(formData.temperature);
    const hr = parseInt(formData.heartRate, 10);
    const rr = parseInt(formData.respiratoryRate, 10);
    const spo2 = parseFloat(formData.oxygenSaturation);
    
    let sys = 0;
    let dia = 0;
    if (formData.bloodPressure && formData.bloodPressure.includes('/')) {
      const parts = formData.bloodPressure.split('/');
      sys = parseInt(parts[0], 10);
      dia = parseInt(parts[1], 10);
    }

    // Critical conditions -> RED (Immediate)
    if (
      (temp && (temp > 40.0 || temp < 35.0)) ||
      (hr && (hr > 130 || hr < 40)) ||
      (rr && (rr > 30 || rr < 8)) ||
      (spo2 && spo2 < 90) ||
      (sys && (sys > 200 || sys < 80)) ||
      (dia && dia > 120)
    ) {
      level = 'RED';
    } 
    // Urgent conditions -> YELLOW (Delayed)
    else if (
      (temp && (temp > 38.5 || temp < 36.0)) ||
      (hr && (hr > 110 || hr < 50)) ||
      (rr && (rr > 24 || rr < 12)) ||
      (spo2 && spo2 < 95) ||
      (sys && (sys > 160 || sys < 90)) ||
      (dia && dia > 100)
    ) {
      level = 'YELLOW';
    }

    // Note: BLACK and WHITE are usually manual overrides based on clinician assessment

    if (formData.triageLevel !== level && formData.triageLevel !== 'BLACK' && formData.triageLevel !== 'WHITE') {
      setFormData(prev => ({ ...prev, triageLevel: level }));
    }
  }, [
    formData.temperature, 
    formData.heartRate, 
    formData.respiratoryRate, 
    formData.oxygenSaturation, 
    formData.bloodPressure
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetUserId) {
      toast.error('Please specify a User ID (Student/Staff)');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/clinic/visits', formData);
      toast.success('Clinic visit recorded successfully!');
      setFormData({
        targetUserId: '',
        temperature: '',
        bloodPressure: '',
        heartRate: '',
        respiratoryRate: '',
        weight: '',
        height: '',
        oxygenSaturation: '',
        presentingComplaint: '',
        triageLevel: 'ROUTINE',
        conditionDetails: '',
        diagnosis: '',
        treatment: '',
        prescription: '',
        notes: '',
        status: 'OPEN'
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page">
      <div className="portal-header">
        <h1>Triage & Clinic Visit</h1>
      </div>

      <div className="portal-content">
        <form onSubmit={handleSubmit} className="portal-form">
          <div className="portal-card">
            <h2>Patient Details</h2>
            <div className="form-group">
              <label>Patient User ID *</label>
              <input 
                type="text" 
                required 
                value={formData.targetUserId}
                onChange={e => setFormData({...formData, targetUserId: e.target.value})}
                placeholder="Enter User ID (e.g. from Student Profile)"
              />
            </div>
            <div className="form-group">
              <label>Presenting Complaint</label>
              <input 
                type="text" 
                value={formData.presentingComplaint}
                onChange={e => setFormData({...formData, presentingComplaint: e.target.value})}
                placeholder="Why are they here?"
              />
            </div>
            <div className="form-group">
              <label>Triage Level (Auto-calculated)</label>
              <select 
                value={formData.triageLevel}
                onChange={e => setFormData({...formData, triageLevel: e.target.value})}
                style={{ 
                  backgroundColor: 
                    formData.triageLevel === 'RED' ? '#fee2e2' : 
                    formData.triageLevel === 'YELLOW' ? '#fef3c7' : 
                    formData.triageLevel === 'GREEN' ? '#dcfce7' :
                    formData.triageLevel === 'BLACK' ? '#e5e7eb' :
                    '#ffffff',
                  fontWeight: 'bold'
                }}
              >
                <option value="RED">🔴 RED - Immediate (Priority 1)</option>
                <option value="YELLOW">🟡 YELLOW - Delayed (Priority 2)</option>
                <option value="GREEN">🟢 GREEN - Minimal (Priority 3)</option>
                <option value="BLACK">⚫ BLACK - Expectant / Deceased</option>
                <option value="WHITE">⚪ WHITE - Dismiss / Minor</option>
              </select>
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: '20px' }}>
            <h2>Vitals</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Temperature (°C)</label>
                <input type="number" step="0.1" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Blood Pressure (e.g. 120/80)</label>
                <input type="text" value={formData.bloodPressure} onChange={e => setFormData({...formData, bloodPressure: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Heart Rate (bpm)</label>
                <input type="number" value={formData.heartRate} onChange={e => setFormData({...formData, heartRate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Respiratory Rate</label>
                <input type="number" value={formData.respiratoryRate} onChange={e => setFormData({...formData, respiratoryRate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Weight (kg)</label>
                <input type="number" step="0.1" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Height (cm)</label>
                <input type="number" step="0.1" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Oxygen Saturation (%)</label>
                <input type="number" step="0.1" value={formData.oxygenSaturation} onChange={e => setFormData({...formData, oxygenSaturation: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: '20px' }}>
            <h2>Consultation & Treatment</h2>
            <div className="form-group">
              <label>Condition Details / Notes</label>
              <textarea value={formData.conditionDetails} onChange={e => setFormData({...formData, conditionDetails: e.target.value})} rows={3} />
            </div>
            <div className="form-group">
              <label>Diagnosis</label>
              <input type="text" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Treatment Provided</label>
              <input type="text" value={formData.treatment} onChange={e => setFormData({...formData, treatment: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Prescription</label>
              <input type="text" value={formData.prescription} onChange={e => setFormData({...formData, prescription: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="OPEN">OPEN - Under Observation</option>
                <option value="ADMITTED">ADMITTED - To Sickbay</option>
                <option value="REFERRED">REFERRED - To Hospital</option>
                <option value="DISCHARGED">DISCHARGED - Sent back to class/home</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="portal-btn" disabled={loading}>
              {loading ? 'Saving...' : 'Record Visit & Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
