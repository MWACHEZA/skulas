import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import '../../../styles/portal.css';

export default function GiveStudentAward() {
  const { t } = useTerminology();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    userId: '',
    awardName: '',
    gift: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/students');
      setStudents(response.data.filter((s: any) => s.userId));
    } catch (error) {
      console.error('Failed to fetch students', error);
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/awards', {
        ...formData,
        amount: parseFloat(formData.amount) || 0
      });
      setSuccessMsg('Award given successfully!');
      setFormData({
        userId: '',
        awardName: '',
        gift: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Failed to give award', error);
    
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Give {t('student')} Award</h1>
          <p>Recognize {t('students').toLowerCase()} for their outstanding achievements, leadership, and positive behavior.</p>
        </div>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ maxWidth: '650px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}><i className="fas fa-medal mr-2"></i> Award Form</h2>
        </div>

        <div style={{ padding: '24px' }}>
          {successMsg && (
            <div className="status-badge status-paid" style={{ padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', width: '100%', fontSize: '0.9rem' }}>
              <i className="fas fa-check-circle mr-2" style={{ color: '#2f855a' }}></i>
              {successMsg}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: '10px' }}>Loading {t('students').toLowerCase()}...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="portal-label">Select {t('student')} <span style={{ color: 'red' }}>*</span></label>
                <select
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="portal-input"
                >
                  <option value="">Select a {t('student').toLowerCase()}...</option>
                  {students.map(student => (
                    <option key={student.userId} value={student.userId}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="portal-label">Award Name / Reason <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  required
                  value={formData.awardName}
                  onChange={(e) => setFormData({ ...formData, awardName: e.target.value })}
                  className="portal-input"
                  placeholder="e.g. Best Behaved in Dorm"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="portal-label">Gift (Optional)</label>
                  <input
                    type="text"
                    value={formData.gift}
                    onChange={(e) => setFormData({ ...formData, gift: e.target.value })}
                    className="portal-input"
                    placeholder="e.g. Certificate, Trophy"
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Monetary Amount (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="portal-input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="portal-label">Date <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="portal-input"
                />
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ background: 'var(--school-primary, #0056b3)', border: 'none', padding: '12px', marginTop: '10px' }}
              >
                Submit Award
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
