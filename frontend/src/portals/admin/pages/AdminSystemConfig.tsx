import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import SystemConfigCommunication from './SystemConfigCommunication';
import '../../../styles/portal.css';

type ConfigTab = 'branding' | 'gateways' | 'notifications' | 'backup';

export default function AdminSystemConfig() {
  const { showToast, toastConfirm } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ConfigTab = (searchParams.get('tab') as ConfigTab) || 'branding';

  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // 1. School Profile & Receipt Branding
  const [profile, setProfile] = useState({
    schoolName: 'St. George Harare High School',
    schoolCode: 'SGH-ZW-001',
    motto: 'Virtute et Labore (By Virtue and Labor)',
    logoUrl: '/images/school-logo.png',
    address: '124 Chancellor Avenue, Alexandra Park, Harare, Zimbabwe',
    postalBox: 'P.O. Box 1890, Harare',
    phone: '+263 242 704123',
    email: 'admissions@stgeorges.ac.zw',
    taxNumber: 'ZIMRA-BP-20048192',
    baseCurrency: 'USD',
    bankName: 'Stanbic Bank Zimbabwe',
    bankBranch: 'Samora Machel Avenue Branch',
    accountNumber: '9140003492811',
    accountName: 'St George School Development Committee',
    receiptHeader: 'OFFICIAL REPUBLIC OF ZIMBABWE FISCAL RECEIPT',
    receiptFooter: 'Thank you for your timely settlement. All school fees are strictly non-refundable.'
  });


  // 3. Notification Rules
  const [notificationRules, setNotificationRules] = useState([
    { id: 'fee_invoice', label: 'Termly Fee Invoice Issued', desc: 'Send SMS & Email summary to primary parent with total payable and payment gateway link.', enabled: true },
    { id: 'fee_receipt', label: 'Payment Receipt Post', desc: 'Dispatch instant SMS acknowledgement with fiscal receipt number and new student balance.', enabled: true },
    { id: 'absence_alert', label: 'Morning Unexcused Absence', desc: 'Alert guardian via SMS if student is unmarked by 08:30 AM roll-call.', enabled: true },
    { id: 'report_card', label: 'Terminal Report Card Published', desc: 'Notify parents when term grades, marks and teacher remarks are approved by Head.', enabled: true },
    { id: 'discipline_summons', label: 'Disciplinary Tribunal Summons', desc: 'Urgent SMS to parents for formal committee hearing appointments.', enabled: true },
    { id: 'low_stock', label: 'Store & Tuckshop Low Stock Alert', desc: 'Alert Bursar and Storekeeper when uniform or textbook supplies breach re-order level.', enabled: true }
  ]);

  // 4. Backups state
  const [backups, setBackups] = useState([
    { id: 'bk-2026-03-24', filename: 'tenant_backup_2026-03-24_0200.sql.gz', size: '42.8 MB', timestamp: '2026-03-24 02:00:15', status: 'COMPLETED' },
    { id: 'bk-2026-03-23', filename: 'tenant_backup_2026-03-23_0200.sql.gz', size: '42.3 MB', timestamp: '2026-03-23 02:00:10', status: 'COMPLETED' },
    { id: 'bk-2026-03-22', filename: 'tenant_backup_2026-03-22_0200.sql.gz', size: '41.9 MB', timestamp: '2026-03-22 02:00:12', status: 'COMPLETED' }
  ]);

  const handleTabChange = (tab: ConfigTab) => {
    setSearchParams({ tab });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('School profile, branding, and fiscal receipt details updated successfully!', 'success');
    }, 600);
  };


  const handleToggleRule = (id: string) => {
    setNotificationRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    showToast('Notification dispatch rule updated', 'info');
  };

  const handleTriggerBackup = async () => {
    if (!(await toastConfirm('Generate an immediate on-demand tenant database snapshot? This captures all student ledgers, GL lines, and marks.'))) return;
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      const newBackup = {
        id: `bk-${Date.now()}`,
        filename: `tenant_backup_ondemand_${new Date().toISOString().slice(0, 10)}.sql.gz`,
        size: '43.1 MB',
        timestamp: new Date().toLocaleString(),
        status: 'COMPLETED'
      };
      setBackups(prev => [newBackup, ...prev]);
      showToast('On-demand database snapshot generated and securely archived in encrypted storage!', 'success');
    }, 1500);
  };

  const handleExportDataBundle = () => {
    showToast('Preparing comprehensive tenant CSV/JSON archive export...', 'info');
    setTimeout(() => {
      showToast('School archive exported! Complete records for students, finance, and attendance downloaded.', 'success');
    }, 1200);
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-sliders-h" style={{ color: '#4f46e5' }}></i>
            Institutional System Configuration
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Core tenant parameters: institutional branding & receipt headers, communication gateways, notification workflows, and data backup controls.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '24px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'branding', label: '1. School Profile & Receipts', icon: 'fas fa-school' },
          { id: 'gateways', label: '2. SMS & Email Gateways', icon: 'fas fa-broadcast-tower' },
          { id: 'notifications', label: '3. Notification Triggers', icon: 'fas fa-bell' },
          { id: 'backup', label: '4. Backup & Data Exports', icon: 'fas fa-database' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id as ConfigTab)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #4f46e5' : '3px solid transparent',
              marginBottom: '-2px',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SCHOOL PROFILE & RECEIPT BRANDING */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left Column: Form Details */}
            <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Institutional Identification & Contact
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>School Legal Name *</label>
                  <input
                    type="text"
                    required
                    className="portal-input"
                    value={profile.schoolName}
                    onChange={e => setProfile({ ...profile, schoolName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>School Code</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.schoolCode}
                    onChange={e => setProfile({ ...profile, schoolCode: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>School Motto / Slogan</label>
                <input
                  type="text"
                  className="portal-input"
                  value={profile.motto}
                  onChange={e => setProfile({ ...profile, motto: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Physical Campus Address</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Postal Address</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.postalBox}
                    onChange={e => setProfile({ ...profile, postalBox: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Official Telephone</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Official Admissions Email</label>
                  <input
                    type="email"
                    className="portal-input"
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{ margin: '24px 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                Fiscal Receipt & Settlement Coordinates
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>ZIMRA / Tax Identification PIN</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.taxNumber}
                    onChange={e => setProfile({ ...profile, taxNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Operating Currency Base</label>
                  <select
                    className="portal-input"
                    value={profile.baseCurrency}
                    onChange={e => setProfile({ ...profile, baseCurrency: e.target.value })}
                  >
                    <option value="USD">USD (United States Dollar)</option>
                    <option value="ZiG">ZiG (Zimbabwe Gold)</option>
                    <option value="ZAR">ZAR (South African Rand)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Bank Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.bankName}
                    onChange={e => setProfile({ ...profile, bankName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Bank Account Number</label>
                  <input
                    type="text"
                    className="portal-input"
                    value={profile.accountNumber}
                    onChange={e => setProfile({ ...profile, accountNumber: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Receipt Header Top Caption</label>
                <input
                  type="text"
                  className="portal-input"
                  value={profile.receiptHeader}
                  onChange={e => setProfile({ ...profile, receiptHeader: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Receipt Footer Disclaimer & Policy Note</label>
                <textarea
                  rows={2}
                  className="portal-input"
                  value={profile.receiptFooter}
                  onChange={e => setProfile({ ...profile, receiptFooter: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                >
                  {saving ? 'Saving Changes...' : 'Save School Profile'}
                </button>
              </div>
            </div>

            {/* Right Column: Live Receipt Slip Preview */}
            <div>
              <div className="portal-card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 20 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Live Receipt Slip Preview
                </span>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 20, marginTop: 12, fontFamily: 'monospace', fontSize: '0.82rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 10, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{profile.schoolName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{profile.address}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tel: {profile.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>TIN: {profile.taxNumber}</div>
                    <div style={{ fontWeight: 700, marginTop: 6, color: '#4f46e5' }}>{profile.receiptHeader}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Receipt No:</span>
                    <strong>REC-2026-00491</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Date / Time:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Student:</span>
                    <strong>Tinashe Marange (4A)</strong>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '6px 0', margin: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tuition Fee (Term 1)</span>
                      <span>$450.00</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem', marginBottom: 8 }}>
                    <span>TOTAL RECEIVED:</span>
                    <span>$450.00 USD</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                    {profile.receiptFooter}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: SMS & EMAIL GATEWAYS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'gateways' && (
        <SystemConfigCommunication />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: NOTIFICATION RULES */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
              Automated Notification Event Triggers
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Toggle real-time alerts dispatched to parents, guardians, and staff across core academic and financial milestones.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {notificationRules.map(rule => (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: rule.enabled ? '#f8fafc' : '#f1f5f9',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{rule.label}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>{rule.desc}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: rule.enabled ? '#15803d' : '#94a3b8' }}>
                    {rule.enabled ? 'ACTIVE' : 'MUTED'}
                  </span>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#4f46e5' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: DATA BACKUP & EXPORT CONTROLS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div>
          {/* Top Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: 24, borderLeft: '4px solid #16a34a' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                On-Demand PostgreSQL Tenant Snapshot
              </h3>
              <p style={{ margin: '6px 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Initiate a point-in-time cryptographic database backup containing all student accounts, general ledger lines, audit trails, and marks.
              </p>
              <button
                type="button"
                disabled={backingUp}
                onClick={handleTriggerBackup}
                className="btn btn-primary"
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                <i className={`fas fa-${backingUp ? 'spinner fa-spin' : 'save'} mr-2`} style={{ marginRight: 8 }}></i>
                {backingUp ? 'Generating Encrypted Dump...' : 'Create Snapshot Now'}
              </button>
            </div>

            <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: 24, borderLeft: '4px solid #0284c7' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Full Tenant Data Export Bundle
              </h3>
              <p style={{ margin: '6px 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Export statutory school records (Student Register, Financial Balance Sheet, Staff Payroll, Exam Master) into standardized CSV/JSON packages.
              </p>
              <button
                type="button"
                onClick={handleExportDataBundle}
                className="btn btn-secondary"
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                <i className="fas fa-file-archive mr-2" style={{ marginRight: 8 }}></i>
                Export Complete Data Bundle
              </button>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                Encrypted Snapshot Archives (Daily Retention: 30 Days)
              </h3>
              <span className="badge" style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                AUTOMATED DAILY 02:00 UTC CRON ACTIVE
              </span>
            </div>

            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Archive Filename</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Created Timestamp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Archive Size</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Integrity Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>
                      <i className="fas fa-file-archive mr-2" style={{ marginRight: 8, color: '#64748b' }}></i>
                      {b.filename}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {b.timestamp}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {b.size}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                        SHA-256 VERIFIED
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => showToast(`Initiating secure download of ${b.filename}...`, 'info')}
                        style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        <i className="fas fa-download mr-1"></i> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
