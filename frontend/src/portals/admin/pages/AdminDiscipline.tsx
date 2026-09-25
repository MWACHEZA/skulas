import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

type DisciplineTab = 'conduct' | 'awards';

interface ConductReport {
  id: string;
  studentName: string;
  category: string;
  narrative: string;
  hasPunishment: boolean;
  punishment?: string | null;
  punishmentLocation?: string | null;
  punishmentStatus?: 'PENDING' | 'CLEARED' | null;
  reportedBy?: { name: string; role: string };
  createdAt: string;
}

interface AwardItem {
  id: string;
  awardName: string;
  gift?: string | null;
  amount: number;
  date: string;
  user?: {
    id: string;
    name: string;
    role: string;
    studentId?: string;
  };
}

export default function AdminDiscipline() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: DisciplineTab = (searchParams.get('tab') as DisciplineTab) || 'conduct';

  const [loading, setLoading] = useState(true);
  const [conductReports, setConductReports] = useState<ConductReport[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLEARED'>('ALL');

  // Modals
  const [showConductModal, setShowConductModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Conduct Report Form
  const [conductForm, setConductForm] = useState({
    studentName: '',
    category: 'Disruptive Behaviour',
    narrative: '',
    hasPunishment: true,
    punishment: '',
    punishmentLocation: ''
  });

  // New Award Form
  const [awardForm, setAwardForm] = useState({
    userId: '',
    awardName: '',
    gift: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'conduct') {
        const res = await api.get('/api/prefects/reports');
        setConductReports(Array.isArray(res.data) ? res.data : []);
      } else {
        const [aRes, sRes] = await Promise.all([
          api.get('/api/awards'),
          api.get('/api/students')
        ]);
        setAwards(Array.isArray(aRes.data) ? aRes.data : []);
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
      }
    } catch (err) {
      console.error('Failed to load discipline data', err);
      showToast('Failed to load discipline and awards records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: DisciplineTab) => {
    setSearchParams({ tab });
  };

  // Toggle Punishment Status
  const handleUpdatePunishmentStatus = async (reportId: string, currentStatus?: string | null) => {
    const nextStatus = currentStatus === 'PENDING' ? 'CLEARED' : 'PENDING';
    try {
      await api.patch(`/api/prefects/reports/${reportId}/status`, {
        punishmentStatus: nextStatus
      });
      showToast(`Punishment marked as ${nextStatus}`, 'success');
      setConductReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, punishmentStatus: nextStatus as any } : r))
      );
    } catch (err) {
      showToast('Failed to update incident status', 'error');
    }
  };

  // Submit Conduct Report
  const handleSubmitConduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conductForm.studentName || !conductForm.narrative) {
      showToast('Please specify the student name and description', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/prefects/reports', conductForm);
      showToast('Conduct report registered successfully', 'success');
      setShowConductModal(false);
      setConductForm({
        studentName: '',
        category: 'Disruptive Behaviour',
        narrative: '',
        hasPunishment: true,
        punishment: '',
        punishmentLocation: ''
      });
      setConductReports(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to file conduct incident', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Award
  const handleSubmitAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardForm.userId || !awardForm.awardName) {
      showToast('Please select a student and provide an award name', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/awards', {
        ...awardForm,
        amount: parseFloat(awardForm.amount) || 0
      });
      showToast('Award presented and recorded successfully', 'success');
      setShowAwardModal(false);
      setAwardForm({
        userId: '',
        awardName: '',
        gift: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      setAwards(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to present award', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered lists
  const filteredConduct = conductReports.filter(r => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.narrative.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && r.punishmentStatus === 'PENDING') ||
      (statusFilter === 'CLEARED' && r.punishmentStatus === 'CLEARED');
    return matchesSearch && matchesStatus;
  });

  const filteredAwards = awards.filter(a => {
    const studentName = a.user?.name || '';
    const matchesSearch =
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.awardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.gift || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-balance-scale" style={{ color: '#4f46e5' }}></i>
            Student Discipline & Behaviour
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Unified records of conduct incidents, disciplinary actions, and student merits & awards.
          </p>
        </div>
        <div>
          {activeTab === 'conduct' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowConductModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-plus"></i> File Incident
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAwardModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-award"></i> Present Award
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('conduct')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'conduct' ? 700 : 500,
            color: activeTab === 'conduct' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'conduct' ? '3px solid #4f46e5' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-exclamation-triangle"></i>
          Conduct & Incidents ({conductReports.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('awards')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'awards' ? 700 : 500,
            color: activeTab === 'awards' ? '#059669' : '#64748b',
            borderBottom: activeTab === 'awards' ? '3px solid #059669' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-medal"></i>
          Merits & Awards ({awards.length})
        </button>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          padding: '14px 18px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }}
          ></i>
          <input
            type="text"
            placeholder={activeTab === 'conduct' ? "Search student, category, narrative..." : "Search student, award, gift..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {activeTab === 'conduct' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              style={{
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Punishment</option>
              <option value="CLEARED">Cleared / Resolved</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#4f46e5' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading records...</p>
        </div>
      ) : activeTab === 'conduct' ? (
        /* Conduct Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredConduct.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-shield-alt fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No conduct incidents found</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>All student behaviour records are clear.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Incident Narrative</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Assigned Punishment</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reported Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredConduct.map(report => (
                  <tr key={report.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {report.studentName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {report.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '320px', color: '#334155', fontSize: '0.9rem' }}>
                      {report.narrative}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>
                      {report.hasPunishment ? (
                        <span>
                          <strong>{report.punishment || 'Detention'}</strong>
                          {report.punishmentLocation && ` (${report.punishmentLocation})`}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {report.punishmentStatus === 'CLEARED' ? (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <i className="fas fa-check" style={{ marginRight: 4 }}></i> Cleared
                        </span>
                      ) : report.punishmentStatus === 'PENDING' ? (
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <i className="fas fa-clock" style={{ marginRight: 4 }}></i> Pending
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {report.hasPunishment && (
                        <button
                          type="button"
                          onClick={() => handleUpdatePunishmentStatus(report.id, report.punishmentStatus)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: report.punishmentStatus === 'PENDING' ? '#ecfdf5' : '#fff',
                            color: report.punishmentStatus === 'PENDING' ? '#059669' : '#64748b',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {report.punishmentStatus === 'PENDING' ? 'Mark Cleared' : 'Reopen'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Awards Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredAwards.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-award fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No awards recorded yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Present student merits, certificates, and prizes above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Recipient</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Award Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Prize / Gift</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Monetary Value</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Date Awarded</th>
                </tr>
              </thead>
              <tbody>
                {filteredAwards.map(award => (
                  <tr key={award.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {award.user?.name || 'Student'}
                      {award.user?.studentId && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                          ID: {award.user.studentId}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1e293b' }}>
                        <i className="fas fa-medal" style={{ color: '#f59e0b' }}></i>
                        {award.awardName}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {award.gift || 'Certificate of Merit'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: award.amount > 0 ? '#059669' : '#94a3b8' }}>
                      {award.amount > 0 ? formatCurrency(award.amount) : 'Honorary'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(award.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Conduct Modal */}
      {showConductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>File Conduct Incident</h3>
              <button type="button" onClick={() => setShowConductModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleSubmitConduct}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Takudzwa Moyo"
                  value={conductForm.studentName}
                  onChange={e => setConductForm({ ...conductForm, studentName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Infraction Category *</label>
                <select
                  value={conductForm.category}
                  onChange={e => setConductForm({ ...conductForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Disruptive Behaviour">Disruptive Behaviour</option>
                  <option value="Late to Class">Late to Class / Lateness</option>
                  <option value="Uniform Violation">Uniform / Dress Code Violation</option>
                  <option value="Insubordination">Insubordination / Disrespect</option>
                  <option value="Vandalism">Vandalism / Property Damage</option>
                  <option value="Academic Dishonesty">Academic Dishonesty / Cheating</option>
                  <option value="Bullying">Bullying / Physical Altercation</option>
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Incident Narrative / Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide objective factual description of what happened..."
                  value={conductForm.narrative}
                  onChange={e => setConductForm({ ...conductForm, narrative: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={conductForm.hasPunishment}
                    onChange={e => setConductForm({ ...conductForm, hasPunishment: e.target.checked })}
                  />
                  Assign Disciplinary Consequence / Detention
                </label>
              </div>
              {conductForm.hasPunishment && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Consequence</label>
                    <input
                      type="text"
                      placeholder="e.g. Campus cleanup (1 hr)"
                      value={conductForm.punishment}
                      onChange={e => setConductForm({ ...conductForm, punishment: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Location / Reporting</label>
                    <input
                      type="text"
                      placeholder="e.g. Grounds Office"
                      value={conductForm.punishmentLocation}
                      onChange={e => setConductForm({ ...conductForm, punishmentLocation: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowConductModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Filing...' : 'Save Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Award Modal */}
      {showAwardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Present Student Award</h3>
              <button type="button" onClick={() => setShowAwardModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleSubmitAward}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Recipient *</label>
                <select
                  required
                  value={awardForm.userId}
                  onChange={e => setAwardForm({ ...awardForm, userId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.userId || s.id}>
                      {s.firstName ? `${s.firstName} ${s.lastName}` : s.name} ({s.class?.name || s.studentId || 'Student'})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Award Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Best in Mathematics, Good Conduct Star"
                  value={awardForm.awardName}
                  onChange={e => setAwardForm({ ...awardForm, awardName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Prize / Certificate</label>
                  <input
                    type="text"
                    placeholder="e.g. Trophy, Certificate"
                    value={awardForm.gift}
                    onChange={e => setAwardForm({ ...awardForm, gift: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Cash Prize (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={awardForm.amount}
                    onChange={e => setAwardForm({ ...awardForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Date Awarded</label>
                <input
                  type="date"
                  value={awardForm.date}
                  onChange={e => setAwardForm({ ...awardForm, date: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAwardModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Presenting...' : 'Record Award'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
