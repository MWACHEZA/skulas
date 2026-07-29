import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface Leave {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface Payslip {
  id: string;
  period: string;
  month: number;
  year: number;
  basicSalary: number;
  netSalary: number;
  grossSalary: number;
  deductions: number;
  createdAt: string;
}

export default function AncillaryHRServices() {
  const { showToast } = useToast();

  // Leave state
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Payslip state
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipLoading, setPayslipLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
    fetchPayslips();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/api/leave/my');
      setLeaves(res.data);
    } catch {
      showToast('Failed to load leave history', 'error');
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchPayslips = async () => {
    try {
      const res = await api.get('/api/payslips/my');
      setPayslips(res.data);
    } catch {
      showToast('Failed to load payslips', 'error');
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleSubmitLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return showToast('Please fill in all fields', 'error');
    }
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      return showToast('End date cannot be before start date', 'error');
    }
    setSubmitting(true);
    try {
      await api.post('/api/leave', {
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: `${leaveForm.leaveType}: ${leaveForm.reason}`
      });
      showToast('Leave request submitted successfully!', 'success');
      setLeaveForm({ leaveType: 'Annual Leave', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch {
      showToast('Failed to submit leave request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPayslip = (payslip: Payslip) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Payslip - ${payslip.period}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #1a202c; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2d3748; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 1.8rem; color: #2d3748; }
    .header p { margin: 4px 0; color: #718096; }
    h2 { background: #f7fafc; padding: 10px 16px; border-left: 4px solid #3182ce; margin: 24px 0 12px; }
    .row { display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #f1f5f9; }
    .row.total { font-weight: bold; font-size: 1.1rem; background: #ebf8ff; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; background: #c6f6d5; color: #276749; font-size: 0.85rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Payslip</h1>
    <p>Period: <strong>${payslip.period}</strong></p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
    <span class="badge">OFFICIAL PAYSLIP</span>
  </div>
  <h2>Earnings</h2>
  <div class="row"><span>Basic Salary</span><span>$${(payslip.basicSalary || 0).toFixed(2)}</span></div>
  <div class="row"><span>Gross Salary</span><span>$${(payslip.grossSalary || 0).toFixed(2)}</span></div>
  <h2>Deductions</h2>
  <div class="row"><span>Total Deductions</span><span>-$${(payslip.deductions || 0).toFixed(2)}</span></div>
  <h2>Net Pay</h2>
  <div class="row total"><span>Net Salary (Take-Home)</span><span>$${(payslip.netSalary || 0).toFixed(2)}</span></div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    showToast('Payslip ready to print/download', 'success');
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'success';
    if (status === 'Rejected') return 'danger';
    return 'warning';
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>HR Services</h1>
        <p>Access your employment records, request leave, and view payslip history.</p>
      </div>

      <div className="portal-grid-2">
        {/* Leave Request */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-calendar-plus" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Request Leave</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>Leave Type</label>
              <select
                className="portal-input"
                style={{ width: '100%' }}
                value={leaveForm.leaveType}
                onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
              >
                <option>Annual Leave</option>
                <option>Sick Leave</option>
                <option>Maternity/Paternity</option>
                <option>Special Leave</option>
                <option>Compassionate Leave</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>Start Date</label>
                <input
                  type="date"
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={leaveForm.startDate}
                  onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>End Date</label>
                <input
                  type="date"
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={leaveForm.endDate}
                  onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>Reason</label>
              <textarea
                className="portal-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                placeholder="Briefly describe the reason for leave..."
                value={leaveForm.reason}
                onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              />
            </div>
            <button
              className="portal-btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
              onClick={handleSubmitLeave}
              disabled={submitting}
            >
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} style={{ marginRight: 8 }}></i>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>

        {/* Payslips */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Recent Payslips</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {payslipLoading ? (
              <div style={{ padding: 30, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
            ) : payslips.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No payslips available yet.</div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Net Pay</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.slice(0, 6).map(ps => (
                    <tr key={ps.id}>
                      <td style={{ fontWeight: 600 }}>{ps.period}</td>
                      <td style={{ color: 'var(--portal-success)', fontWeight: 700 }}>
                        ${(ps.netSalary || 0).toFixed(2)}
                      </td>
                      <td>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontSize: '1rem' }}
                          title="Download / Print payslip"
                          onClick={() => handleDownloadPayslip(ps)}
                        >
                          <i className="fas fa-download"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Leave History */}
      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: '#805ad5' }}></i>My Leave History</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {leaveLoading ? (
            <div style={{ padding: 30, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : leaves.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No leave applications found.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                    <td style={{ color: '#718096' }}>{new Date(l.startDate).toLocaleDateString()}</td>
                    <td style={{ color: '#718096' }}>{new Date(l.endDate).toLocaleDateString()}</td>
                    <td style={{ color: '#a0aec0', fontSize: '0.8rem' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td><span className={`portal-badge ${getStatusColor(l.status)}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
