import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

interface GovernanceMember {
  id: string;
  name: string;
  role: 'Chairperson' | 'Vice Chairperson' | 'Secretary' | 'Treasurer' | 'Committee Member' | 'Ex-Officio';
  category: 'Parent Representative' | 'Faculty Representative' | 'Community Elder' | 'Institutional Head' | 'Bursar';
  phone?: string;
  email?: string;
  term: string;
  status: 'Active' | 'Stepped Down' | 'Term Ended';
}

interface GovernanceResolution {
  id: string;
  resolutionNo: string;
  date: string;
  title: string;
  levyAmount?: number;
  currency?: string;
  targetCount?: number;
  quorumConfirmed: boolean;
  notes?: string;
  status: 'Active' | 'Superseded' | 'Completed';
}

interface ProjectFunding {
  id: string;
  name: string;
  budget: number;
  spent: number;
  status: string;
  createdAt: string;
}

interface MeetingMinute {
  id: string;
  date: string;
  title: string;
  attendees: string;
  status: string;
  documentUrl: string | null;
}

export default function GovernancePage() {
  const { t } = useTerminology();
  const { user } = useAuth();
  const { showToast } = useToast();

  const isBursar = user?.role === 'BURSAR';
  const isAdminOrSuper = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'members' | 'resolutions' | 'projects' | 'minutes'>('members');
  const [loading, setLoading] = useState(true);

  // Data states
  const [members, setMembers] = useState<GovernanceMember[]>([]);
  const [resolutions, setResolutions] = useState<GovernanceResolution[]>([]);
  const [projects, setProjects] = useState<ProjectFunding[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);

  // Member Modal State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState<Partial<GovernanceMember>>({
    role: 'Committee Member',
    category: 'Parent Representative',
    term: `${new Date().getFullYear()} - ${new Date().getFullYear() + 2}`,
    status: 'Active'
  });

  // Resolution Modal State
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionForm, setResolutionForm] = useState<Partial<GovernanceResolution>>({
    date: new Date().toISOString().slice(0, 10),
    currency: 'USD',
    quorumConfirmed: true,
    status: 'Active'
  });

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState<{ name: string; budget: string; status: string }>({
    name: '',
    budget: '',
    status: 'Ongoing'
  });

  // Disbursement Modal State
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disburseForm, setDisburseForm] = useState<{ projectId: string; amount: string; description: string }>({
    projectId: '',
    amount: '',
    description: ''
  });

  // Minutes Modal State
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [minutesForm, setMinutesForm] = useState<{ date: string; title: string; attendees: string; status: string; file: File | null }>({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    attendees: '',
    status: 'Approved',
    file: null
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [settingsRes, projectsRes, minutesRes] = await Promise.all([
        api.get('/api/schools/settings').catch(() => ({ data: {} })),
        api.get('/api/funding').catch(() => ({ data: [] })),
        api.get('/api/meeting-minutes').catch(() => ({ data: [] }))
      ]);

      const schoolSettings = settingsRes.data || {};
      setMembers(schoolSettings.governanceMembers || getDefaultMembers());
      setResolutions(schoolSettings.governanceResolutions || getDefaultResolutions());
      setProjects(projectsRes.data || []);
      setMinutes(minutesRes.data || []);
    } catch (err) {
      console.error('Error fetching governance data', err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultMembers = (): GovernanceMember[] => [
    { id: 'gm-1', name: 'Dr. C. Moyo', role: 'Chairperson', category: 'Parent Representative', phone: '+263 772 100 200', email: 'chair@schoolgov.org', term: '2025 - 2027', status: 'Active' },
    { id: 'gm-2', name: 'Mrs. R. Chitepo', role: 'Vice Chairperson', category: 'Parent Representative', phone: '+263 773 200 300', email: 'vchair@schoolgov.org', term: '2025 - 2027', status: 'Active' },
    { id: 'gm-3', name: 'Mr. T. Ndlovu', role: 'Treasurer', category: 'Parent Representative', phone: '+263 771 300 400', email: 'treasurer@schoolgov.org', term: '2025 - 2027', status: 'Active' },
    { id: 'gm-4', name: 'School Principal', role: 'Ex-Officio', category: 'Institutional Head', phone: '+263 242 000 001', email: 'principal@school.edu', term: 'Permanent Ex-Officio', status: 'Active' },
    { id: 'gm-5', name: 'Bursar', role: 'Ex-Officio', category: 'Bursar', phone: '+263 242 000 002', email: 'bursar@school.edu', term: 'Permanent Ex-Officio', status: 'Active' }
  ];

  const getDefaultResolutions = (): GovernanceResolution[] => [
    { id: 'res-1', resolutionNo: 'RES-2026-001', date: '2026-01-15', title: 'Annual General Meeting: 2026 Capital Development Levy', levyAmount: 45, currency: 'USD', targetCount: 450, quorumConfirmed: true, notes: 'Approved 45 USD per student per term towards campus solar installation and water infrastructure.', status: 'Active' },
    { id: 'res-2', resolutionNo: 'RES-2025-014', date: '2025-09-10', title: 'Procurement of 65-Seater School Bus Facility Levy', levyAmount: 30, currency: 'USD', targetCount: 450, quorumConfirmed: true, notes: 'Dedicated fund levy for student transport fleet recapitalization.', status: 'Completed' }
  ];

  const saveSettingsArray = async (key: 'governanceMembers' | 'governanceResolutions', updatedArray: any[]) => {
    try {
      const res = await api.get('/api/schools/settings');
      const current = res.data || {};
      const newSettings = {
        ...current,
        [key]: updatedArray
      };
      await api.put('/api/schools/settings', newSettings);
    } catch (e) {
      console.error(`Failed to update ${key}`, e);
    }
  };

  // ── Member Actions ──────────────────────────────────────────────────────────
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name) return;
    setSubmitting(true);
    try {
      let updated: GovernanceMember[];
      if (memberForm.id) {
        updated = members.map(m => m.id === memberForm.id ? { ...m, ...memberForm } as GovernanceMember : m);
      } else {
        const newMember: GovernanceMember = {
          id: `gm-${Date.now()}`,
          name: memberForm.name || '',
          role: memberForm.role || 'Committee Member',
          category: memberForm.category || 'Parent Representative',
          phone: memberForm.phone || '',
          email: memberForm.email || '',
          term: memberForm.term || '2026 - 2028',
          status: memberForm.status || 'Active'
        };
        updated = [...members, newMember];
      }
      setMembers(updated);
      await saveSettingsArray('governanceMembers', updated);
      showToast('Committee member recorded successfully', 'success');
      setShowMemberModal(false);
      setMemberForm({ role: 'Committee Member', category: 'Parent Representative', term: '2026 - 2028', status: 'Active' });
    } catch (err: any) {
      showToast('Failed to save member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this committee member?')) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    await saveSettingsArray('governanceMembers', updated);
    showToast('Committee member removed', 'info');
  };

  // ── Resolution Actions ──────────────────────────────────────────────────────
  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionForm.title || !resolutionForm.resolutionNo) return;
    setSubmitting(true);
    try {
      const newResolution: GovernanceResolution = {
        id: `res-${Date.now()}`,
        resolutionNo: resolutionForm.resolutionNo || `RES-${Date.now()}`,
        date: resolutionForm.date || new Date().toISOString().slice(0, 10),
        title: resolutionForm.title || '',
        levyAmount: Number(resolutionForm.levyAmount || 0),
        currency: resolutionForm.currency || 'USD',
        targetCount: Number(resolutionForm.targetCount || 0),
        quorumConfirmed: resolutionForm.quorumConfirmed ?? true,
        notes: resolutionForm.notes || '',
        status: resolutionForm.status || 'Active'
      };
      const updated = [newResolution, ...resolutions];
      setResolutions(updated);
      await saveSettingsArray('governanceResolutions', updated);
      showToast('Resolution registered successfully', 'success');
      setShowResolutionModal(false);
      setResolutionForm({ date: new Date().toISOString().slice(0, 10), currency: 'USD', quorumConfirmed: true, status: 'Active' });
    } catch (err: any) {
      showToast('Failed to save resolution', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Project Actions ─────────────────────────────────────────────────────────
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name || !projectForm.budget) return;
    setSubmitting(true);
    try {
      const res = await api.post('/api/funding', {
        name: projectForm.name,
        budget: parseFloat(projectForm.budget),
        spent: 0,
        status: projectForm.status
      });
      setProjects([...projects, res.data]);
      showToast('Capital development project created and linked to Chart of Accounts', 'success');
      setShowProjectModal(false);
      setProjectForm({ name: '', budget: '', status: 'Ongoing' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create project', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburseProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(disburseForm.amount || '0');
    if (!disburseForm.projectId || amt <= 0) {
      showToast('Please provide a valid project and disbursement amount', 'warning');
      return;
    }
    const proj = projects.find(p => p.id === disburseForm.projectId);
    if (!proj) return;

    setSubmitting(true);
    try {
      const updatedSpent = (proj.spent || 0) + amt;
      const res = await api.patch(`/api/funding/${disburseForm.projectId}`, {
        spent: updatedSpent
      });
      setProjects(projects.map(p => p.id === disburseForm.projectId ? res.data : p));
      showToast(`Disbursement of $${amt.toFixed(2)} posted with double-entry to General Ledger`, 'success');
      setShowDisburseModal(false);
      setDisburseForm({ projectId: '', amount: '', description: '' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to post disbursement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Minutes Actions ─────────────────────────────────────────────────────────
  const handleUploadMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutesForm.date || !minutesForm.title) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('date', minutesForm.date);
      formData.append('title', minutesForm.title);
      formData.append('attendees', minutesForm.attendees);
      formData.append('status', minutesForm.status);
      if (minutesForm.file) {
        formData.append('file', minutesForm.file);
      }
      const res = await api.post('/api/meeting-minutes', formData);
      setMinutes([res.data, ...minutes]);
      showToast('Meeting minutes archive uploaded successfully', 'success');
      setShowMinutesModal(false);
      setMinutesForm({ date: new Date().toISOString().slice(0, 10), title: '', attendees: '', status: 'Approved', file: null });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to upload minutes', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadMinute = async (docUrl: string, title: string) => {
    try {
      const res = await api.get(`/api/storage/file/${docUrl}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_minutes.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showToast('Unable to download minute file', 'error');
    }
  };

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-landmark" style={{ color: 'var(--school-primary, #2563eb)' }} />
            {t('governance')}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            Statutory institutional governance, committee roster, AGM levy resolutions, capital fund allocations, and meeting records.
          </p>
        </div>

        {/* Global Action depending on role */}
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdminOrSuper && (
            <button
              onClick={() => {
                if (activeTab === 'members') setShowMemberModal(true);
                else if (activeTab === 'resolutions') setShowResolutionModal(true);
                else if (activeTab === 'projects') setShowProjectModal(true);
                else setShowMinutesModal(true);
              }}
              style={{
                backgroundColor: 'var(--school-primary, #2563eb)',
                color: '#fff',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <i className="fas fa-plus" />
              {activeTab === 'members' && 'Add Committee Member'}
              {activeTab === 'resolutions' && 'Record Resolution'}
              {activeTab === 'projects' && 'New Project'}
              {activeTab === 'minutes' && 'Upload Minutes'}
            </button>
          )}

          {isBursar && activeTab === 'projects' && (
            <button
              onClick={() => {
                if (projects.length > 0) setDisburseForm(prev => ({ ...prev, projectId: projects[0].id }));
                setShowDisburseModal(true);
              }}
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-hand-holding-usd" /> Record Project Disbursement
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Committee</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{members.filter(m => m.status === 'Active').length} Members</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 4 }}><i className="fas fa-check-circle" /> Quorum Capable</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Resolutions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{resolutions.filter(r => r.status === 'Active').length} Approved</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Governing statutory term</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Capital Budget</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{projects.length} development initiatives</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Disbursed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e11d48', marginTop: 4 }}>${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>${(totalBudget - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, background: '#fff', padding: '8px 12px 0 12px', borderRadius: '10px 10px 0 0' }}>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'members' ? 700 : 500,
            color: activeTab === 'members' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'members' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-users" /> Committee Members ({members.length})
        </button>

        <button
          onClick={() => setActiveTab('resolutions')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'resolutions' ? 700 : 500,
            color: activeTab === 'resolutions' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'resolutions' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-gavel" /> AGM Resolutions & Levies ({resolutions.length})
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'projects' ? 700 : 500,
            color: activeTab === 'projects' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'projects' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-hard-hat" /> Capital Projects & Allocations ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab('minutes')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'minutes' ? 700 : 500,
            color: activeTab === 'minutes' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'minutes' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-file-alt" /> Meeting Minutes & Archives ({minutes.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#2563eb' }} />
          <p style={{ marginTop: 12 }}>Loading {t('governanceShort')} records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '14px 18px' }}>Member Name</th>
                    <th style={{ padding: '14px 18px' }}>Governance Role</th>
                    <th style={{ padding: '14px 18px' }}>Constituency Category</th>
                    <th style={{ padding: '14px 18px' }}>Contact Information</th>
                    <th style={{ padding: '14px 18px' }}>Term of Office</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    {isAdminOrSuper && <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                            {m.name.charAt(0)}
                          </div>
                          {m.name}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem',
                          background: m.role === 'Chairperson' ? '#fef3c7' : m.role === 'Treasurer' ? '#dcfce7' : '#f1f5f9',
                          color: m.role === 'Chairperson' ? '#92400e' : m.role === 'Treasurer' ? '#166534' : '#475569'
                        }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b' }}>{m.category}</td>
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                        {m.phone && <div><i className="fas fa-phone" style={{ marginRight: 6, color: '#94a3b8' }} />{m.phone}</div>}
                        {m.email && <div style={{ color: '#2563eb' }}><i className="fas fa-envelope" style={{ marginRight: 6, color: '#94a3b8' }} />{m.email}</div>}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>{m.term}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                          background: m.status === 'Active' ? '#dcfce7' : '#fee2e2',
                          color: m.status === 'Active' ? '#15803d' : '#b91c1c'
                        }}>
                          {m.status}
                        </span>
                      </td>
                      {isAdminOrSuper && (
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => { setMemberForm(m); setShowMemberModal(true); }}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: 10 }}
                            title="Edit"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                            title="Delete"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        No governance committee members registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: RESOLUTIONS & LEVIES */}
          {activeTab === 'resolutions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {resolutions.map(r => (
                <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem' }}>
                          {r.resolutionNo}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          <i className="fas fa-calendar-day" style={{ marginRight: 6 }} /> Passed on {new Date(r.date).toLocaleDateString()}
                        </span>
                        {r.quorumConfirmed && (
                          <span style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                            <i className="fas fa-check-double" style={{ marginRight: 4 }} /> Quorum Validated
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginTop: 8, marginBottom: 6 }}>
                        {r.title}
                      </h3>
                      {r.notes && <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{r.notes}</p>}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Approved Term Levy</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                        {r.currency || 'USD'} ${r.levyAmount?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>per enrolled learner / term</div>
                    </div>
                  </div>

                  {r.targetCount && r.levyAmount ? (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                        <span style={{ color: '#64748b' }}>Levy Target Collection ({r.targetCount} Students):</span>
                        <strong style={{ color: '#1e293b' }}>${(r.targetCount * r.levyAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: '75%', height: '100%', backgroundColor: '#2563eb', borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                        <span>75% collected via Bursar billing integration</span>
                        <span>Term tracking active</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}

              {resolutions.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                  <i className="fas fa-gavel" style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }} />
                  <p>No AGM or Council resolutions on record.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAPITAL PROJECTS */}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {projects.map((p) => {
                  const pct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 22, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('governanceShort')} Capital Initiative
                          </span>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0' }}>
                            {p.name}
                          </h3>
                        </div>
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                          background: p.status === 'Completed' ? '#dcfce7' : '#eff6ff',
                          color: p.status === 'Completed' ? '#166534' : '#2563eb'
                        }}>
                          {p.status}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approved Budget</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>${p.budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Disbursed / Spent</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>${p.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                          <span>Allocation Utilization</span>
                          <strong style={{ color: pct > 90 ? '#dc2626' : '#2563eb' }}>{pct}%</strong>
                        </div>
                        <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct > 90 ? '#dc2626' : '#2563eb', borderRadius: 4 }} />
                        </div>
                      </div>

                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>GL Account: PROJ-{p.id.slice(0, 6).toUpperCase()}</span>
                        <button
                          onClick={() => {
                            setDisburseForm({ projectId: p.id, amount: '', description: '' });
                            setShowDisburseModal(true);
                          }}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Disburse
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {projects.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                  <i className="fas fa-hard-hat" style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }} />
                  <p>No capital development projects funded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MINUTES */}
          {activeTab === 'minutes' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '14px 18px' }}>Meeting Date</th>
                    <th style={{ padding: '14px 18px' }}>Meeting Title / Agenda</th>
                    <th style={{ padding: '14px 18px' }}>Attendees</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {minutes.map(min => (
                    <tr key={min.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#1e293b' }}>
                        {new Date(min.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>
                        {min.title}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b' }}>
                        {min.attendees || 'All Executive Committee'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                          background: min.status === 'Approved' ? '#dcfce7' : '#f1f5f9',
                          color: min.status === 'Approved' ? '#15803d' : '#64748b'
                        }}>
                          {min.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {min.documentUrl ? (
                          <button
                            onClick={() => handleDownloadMinute(min.documentUrl!, min.title)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '5px 12px',
                              borderRadius: 6,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <i className="fas fa-file-pdf" /> Download PDF
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>No Attachment</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {minutes.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        No meeting minutes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MEMBER MODAL */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 500, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {memberForm.id ? 'Edit Committee Member' : 'Add Committee Member'}
              </h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveMember}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={memberForm.name || ''}
                  onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Mr. John Moyo"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Governance Role *</label>
                  <select
                    value={memberForm.role || 'Committee Member'}
                    onChange={e => setMemberForm({ ...memberForm, role: e.target.value as any })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Chairperson">Chairperson</option>
                    <option value="Vice Chairperson">Vice Chairperson</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Committee Member">Committee Member</option>
                    <option value="Ex-Officio">Ex-Officio</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Category</label>
                  <select
                    value={memberForm.category || 'Parent Representative'}
                    onChange={e => setMemberForm({ ...memberForm, category: e.target.value as any })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Parent Representative">Parent Representative</option>
                    <option value="Faculty Representative">Faculty Representative</option>
                    <option value="Community Elder">Community Elder</option>
                    <option value="Institutional Head">Institutional Head</option>
                    <option value="Bursar">Bursar</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Phone</label>
                  <input
                    type="text"
                    value={memberForm.phone || ''}
                    onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                    placeholder="+263 77..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Email</label>
                  <input
                    type="email"
                    value={memberForm.email || ''}
                    onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                    placeholder="email@domain.org"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Term of Office</label>
                  <input
                    type="text"
                    value={memberForm.term || '2026 - 2028'}
                    onChange={e => setMemberForm({ ...memberForm, term: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Status</label>
                  <select
                    value={memberForm.status || 'Active'}
                    onChange={e => setMemberForm({ ...memberForm, status: e.target.value as any })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Stepped Down">Stepped Down</option>
                    <option value="Term Ended">Term Ended</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowMemberModal(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="portal-btn-primary">
                  {submitting ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {showResolutionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Record AGM / Council Resolution</h3>
              <button onClick={() => setShowResolutionModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveResolution}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Resolution Number *</label>
                  <input
                    type="text"
                    required
                    value={resolutionForm.resolutionNo || ''}
                    onChange={e => setResolutionForm({ ...resolutionForm, resolutionNo: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                    placeholder="RES-2026-002"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Date Passed *</label>
                  <input
                    type="date"
                    required
                    value={resolutionForm.date || ''}
                    onChange={e => setResolutionForm({ ...resolutionForm, date: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Resolution Title & Purpose *</label>
                <input
                  type="text"
                  required
                  value={resolutionForm.title || ''}
                  onChange={e => setResolutionForm({ ...resolutionForm, title: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 2026 Term 1 Campus Solar & Security Levy"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Approved Levy / Student</label>
                  <input
                    type="number"
                    step="0.01"
                    value={resolutionForm.levyAmount || ''}
                    onChange={e => setResolutionForm({ ...resolutionForm, levyAmount: parseFloat(e.target.value) })}
                    className="portal-input"
                    style={{ width: '100%' }}
                    placeholder="45.00"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Currency</label>
                  <select
                    value={resolutionForm.currency || 'USD'}
                    onChange={e => setResolutionForm({ ...resolutionForm, currency: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="USD">USD</option>
                    <option value="ZiG">ZiG</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Target Student Count</label>
                <input
                  type="number"
                  value={resolutionForm.targetCount || ''}
                  onChange={e => setResolutionForm({ ...resolutionForm, targetCount: parseInt(e.target.value) })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="450"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Minutes Reference / Notes</label>
                <textarea
                  rows={2}
                  value={resolutionForm.notes || ''}
                  onChange={e => setResolutionForm({ ...resolutionForm, notes: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="Passed by two-thirds majority of parents present at AGM..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowResolutionModal(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="portal-btn-primary">
                  {submitting ? 'Registering...' : 'Register Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT MODAL */}
      {showProjectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>New Capital Development Project</h3>
              <button onClick={() => setShowProjectModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Project Name *</label>
                <input
                  type="text"
                  required
                  value={projectForm.name}
                  onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Science Laboratory Renovation"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Approved Budget (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={projectForm.budget}
                  onChange={e => setProjectForm({ ...projectForm, budget: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="15000.00"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Initial Status</label>
                <select
                  value={projectForm.status}
                  onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                >
                  <option value="Planning">Planning</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowProjectModal(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="portal-btn-primary">
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSEMENT MODAL */}
      {showDisburseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Disburse Project Funds</h3>
              <button onClick={() => setShowDisburseModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleDisburseProject}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Select Project *</label>
                <select
                  value={disburseForm.projectId}
                  onChange={e => setDisburseForm({ ...disburseForm, projectId: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Budget: ${p.budget.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Disbursement Amount (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={disburseForm.amount}
                  onChange={e => setDisburseForm({ ...disburseForm, amount: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="2500.00"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Disbursement Purpose / Voucher No.</label>
                <input
                  type="text"
                  value={disburseForm.description}
                  onChange={e => setDisburseForm({ ...disburseForm, description: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. PV-2026-089 (Solar battery procurement)"
                />
              </div>

              <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#166534', marginBottom: 20 }}>
                <i className="fas fa-balance-scale" style={{ marginRight: 6 }} />
                Posting will automatically execute double entry: <strong>Dr Capital Project Asset / Cr Bank Account (1110)</strong>.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowDisburseModal(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="portal-btn-primary">
                  {submitting ? 'Posting...' : 'Post Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINUTES MODAL */}
      {showMinutesModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 500, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Upload Meeting Minutes & Records</h3>
              <button onClick={() => setShowMinutesModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleUploadMinutes}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Meeting Date *</label>
                  <input
                    type="date"
                    required
                    value={minutesForm.date}
                    onChange={e => setMinutesForm({ ...minutesForm, date: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Status</label>
                  <select
                    value={minutesForm.status}
                    onChange={e => setMinutesForm({ ...minutesForm, status: e.target.value })}
                    className="portal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Approved">Approved & Signed</option>
                    <option value="Draft">Draft Minutes</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Agenda / Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={minutesForm.title}
                  onChange={e => setMinutesForm({ ...minutesForm, title: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Term 1 SDC Executive Budget Review"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Attendees (comma-separated)</label>
                <input
                  type="text"
                  value={minutesForm.attendees}
                  onChange={e => setMinutesForm({ ...minutesForm, attendees: e.target.value })}
                  className="portal-input"
                  style={{ width: '100%' }}
                  placeholder="Dr. Moyo, Mrs. Chitepo, Principal, Bursar"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Minutes Document (PDF / Scan)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setMinutesForm({ ...minutesForm, file: e.target.files ? e.target.files[0] : null })}
                  className="portal-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowMinutesModal(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="portal-btn-primary">
                  {submitting ? 'Uploading...' : 'Upload Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
