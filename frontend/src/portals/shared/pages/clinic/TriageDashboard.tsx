import React, { useState } from 'react';
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
    triageLevel: 'ROUTINE',
    conditionDetails: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    status: 'OPEN'
  });

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
              <label>Triage Level</label>
              <select 
                value={formData.triageLevel}
                onChange={e => setFormData({...formData, triageLevel: e.target.value})}
              >
                <option value="CRITICAL">CRITICAL (Immediate)</option>
                <option value="URGENT">URGENT (Soon)</option>
                <option value="ROUTINE">ROUTINE (Standard)</option>
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
