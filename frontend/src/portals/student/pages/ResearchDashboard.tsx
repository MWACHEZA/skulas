import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';

interface ResearchData {
  student: {
    researchTitle: string;
    programLevel: string;
    studyMode: string;
    startDate: string;
    maxCompletionDate: string;
    extensionMonths: number;
  };
  supervisors: Array<{
    teacher: { user: { name: string; title: string } };
    role: string;
  }>;
  progressReports: Array<{
    id: string;
    reportPeriod: string;
    status: string;
    submittedAt: string;
    supervisorNote: string;
  }>;
  extensions: Array<{
    id: string;
    reason: string;
    durationRequested: number;
    status: string;
    createdAt: string;
  }>;
}

export default function ResearchDashboard() {
  const { user } = useAuth();
  const { t } = useTerminology();
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extReason, setExtReason] = useState('');
  const [extDuration, setExtDuration] = useState(6);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/students/me/research');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch research data');
    
    } finally {
      setLoading(false);
    }
  };

  const submitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/extensions', {
        reason: extReason,
        durationRequested: extDuration
      });
      setShowExtensionForm(false);
      setExtReason('');
      fetchData();
    } catch (err) {
      alert('Failed to submit extension request');
    }
  };

  if (loading) return <div className="portal-loader">Loading research details...</div>;
  if (!data) return <div className="portal-alert error">Failed to load research data.</div>;

  const daysLeft = data.student.maxCompletionDate 
    ? Math.ceil((new Date(data.student.maxCompletionDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : 0;

  return (
    <div className="research-portal">
      <div className="portal-page-header">
        <h1>Research Portfolio</h1>
        <p>
          {data.student.programLevel?.replace(/_/g, ' ') || 'Program Level Not Set'} · {data.student.studyMode?.replace(/_/g, ' ') || 'Study Mode Not Set'}
        </p>
      </div>

      <div className="portal-grid-3">
        {/* Timeline Summary */}
        <div className="portal-card gradient-blue" style={{ gridColumn: 'span 2' }}>
          <div className="portal-card-body" style={{ color: 'white' }}>
            <h4 style={{ opacity: 0.8 }}>Current Thesis/Dissertation Title</h4>
            <h2 style={{ margin: '12px 0 24px 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {data.student.researchTitle || 'No title registered yet.'}
            </h2>
            <div style={{ display: 'flex', gap: 40 }}>
              <div>
                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Completion Deadline</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  {data.student.maxCompletionDate ? new Date(data.student.maxCompletionDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Remaining Time</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: daysLeft < 90 ? '#feb2b2' : 'white' }}>
                  {daysLeft} Days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Supervisors */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Supervisory Team</h3>
          </div>
          <div className="portal-card-body">
            {data.supervisors.length === 0 ? (
              <p className="empty-text">No supervisors assigned yet.</p>
            ) : (
              <div className="supervisor-list">
                {data.supervisors.map((s, i) => (
                  <div key={i} className="supervisor-item">
                    <div className="sup-avatar">{s.teacher.user.name[0]}</div>
                    <div className="sup-info">
                      <strong>{s.teacher.user.title} {s.teacher.user.name}</strong>
                      <span className="portal-badge info">{s.role.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="portal-grid-2" style={{ marginTop: 24 }}>
        {/* Progress Reports */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h3>6-Month Progress Reports</h3>
            <button className="portal-btn-sm" onClick={() => alert('This feature is currently under development or disabled.')}>+ New Report</button>
          </div>
          <div className="portal-card-body">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.progressReports.map(report => (
                  <tr key={report.id}>
                    <td>{report.reportPeriod}</td>
                    <td>{new Date(report.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`portal-badge ${
                        report.status === 'SATISFACTORY' ? 'success' : 
                        report.status === 'UNSATISFACTORY' ? 'danger' : 'info'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extension Requests */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Extension Requests</h3>
            {!showExtensionForm && (
              <button className="portal-btn-sm" onClick={() => setShowExtensionForm(true)}>Request Extension</button>
            )}
          </div>
          <div className="portal-card-body">
            {showExtensionForm ? (
              <form onSubmit={submitExtension} className="extension-form">
                <div className="form-group">
                  <label>Duration (Months)</label>
                  <select value={extDuration} onChange={(e) => setExtDuration(Number(e.target.value))}>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (Max)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Reason for Extension</label>
                  <textarea 
                    value={extReason} 
                    onChange={(e) => setExtReason(e.target.value)}
                    placeholder="Provide justification for the extension request..."
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="submit" className="portal-btn-primary">Submit Request</button>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowExtensionForm(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.extensions.map(ext => (
                    <tr key={ext.id}>
                      <td>{ext.durationRequested} Months</td>
                      <td>
                        <span className={`portal-badge ${
                          ext.status === 'APPROVED' ? 'success' : 
                          ext.status === 'REJECTED' ? 'danger' : 'warning'
                        }`}>
                          {ext.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.extensions.length === 0 && (
                    <tr><td colSpan={2} className="empty-text">No active requests.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .research-portal { animation: fadeIn 0.4s ease-out; }
        .gradient-blue {
          background: linear-gradient(135deg, var(--school-primary, #3182ce) 0%, #2c5282 100%);
          border: none !important;
        }
        .sup-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: #edf2f7; display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: #2d3748;
        }
        .supervisor-item { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .sup-info { display: flex; flex-direction: column; }
        .sup-info span { font-size: 0.75rem; margin-top: 2px; }
        .extension-form textarea { width: 100%; height: 80px; margin-top: 8px; border-radius: 6px; padding: 10px; border: 1px solid #e2e8f0; }
        .portal-btn-sm { padding: 4px 12px; font-size: 0.85rem; background: #ebf8ff; color: #2b6cb0; border-radius: 4px; border: none; cursor: pointer; font-weight: 500; }
        .empty-text { color: #a0aec0; font-size: 0.9rem; text-align: center; margin: 20px 0; }
      `}</style>
    </div>
  );
}
