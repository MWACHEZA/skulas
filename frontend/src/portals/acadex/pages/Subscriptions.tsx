import React, { useState } from 'react';
import '../../../styles/portal.css';

// ─── Master catalogue of ALL platform capabilities ───────────────────────────
export const ALL_SYSTEM_FEATURES = [
  // Core Academic
  'Student Management (up to 200)',
  'Student Management (up to 800)',
  'Unlimited Student Management',
  // Higher Education & Research
  'Postgraduate Regulation Engine',
  'Research & Thesis Supervision',
  'Clinical & Practical Assessment',
  'NUST-Compliant Academic Engine',
  'Multi-Supervisor Hierarchy',
  'RPG Progress Reporting',
  'Mandatory Supervisor Alerts',
  'Institutional Research Hub',
  'Nursing Council Compliance',
  'Clinical Rotation Tracking',
  'Ward Performance Assessments',
  // Specialty Portals
  'Sports Management',
  'House Management',
  'Chaplaincy Services',
  'Ancillary Staff Portal',
  'Boarding & Hostel Management',
  'Tuckshop & POS',
  'Transport & Fleet Management',
  'Security & Visitor Log',
  'Kitchen & Dining Management',
  'Agriculture & Farm Management',
  // Technology & Storage
  '5 GB Storage',
  '50 GB Storage',
  '200 GB Storage',
  'Unlimited Storage',
  'Custom School Branding',
  'API Access',
];

export interface Tier {
  id: number;
  name: string;
  price: string;
  billingLabel: string;
  tagline: string;
  schools: number;
  color: string;
  features: string[];
}

// ─── Shared plan state (exported so AcadexLanding can read it) ────────────────
export const DEFAULT_PLANS: Tier[] = [
  {
    id: 1,
    name: 'Starter',
    price: '$49',
    billingLabel: '/mo',
    tagline: 'Academic Basics. For Primary & Secondary schools (up to 200 students).',
    schools: 142,
    color: 'var(--portal-success)',
    features: [
      'Student Management (up to 200)',
      'Admin & Teacher Portals',
      'Finance & Fee Collection',
      'Attendance & Grades',
      'Parent & Student Portals',
      '5 GB Storage',
    ],
  },
  {
    id: 2,
    name: 'Professional',
    price: '$149',
    billingLabel: '/mo',
    tagline: 'Institutional Advanced. For High Schools & Colleges (up to 800 students).',
    schools: 285,
    color: 'var(--school-primary, #3182ce)',
    features: [
      'Everything in Starter',
      'Student Management (up to 800)',
      'Clinical & Practical Assessment',
      'Clinical Rotation Tracking',
      'Agriculture & Farm Management',
      'Boarding & Hostel Management',
      'Library & Alumni Portals',
      '50 GB Storage',
    ],
  },
  {
    id: 3,
    name: 'Enterprise',
    price: 'Custom',
    billingLabel: 'pricing',
    tagline: 'University & Research. Full academic horsepower for Higher Ed.',
    schools: 42,
    color: '#805ad5',
    features: [
      'Everything in Professional',
      'Postgraduate Regulation Engine',
      'Research & Thesis Supervision',
      'NUST-Compliant Academic Engine',
      'RPG Progress Reporting',
      'Nursing Council Compliance',
      'Ward Performance Assessments',
      'Multi-Campus & API Access',
      'Unlimited Storage & Support',
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AcadexPlans() {
  const [plans, setPlans] = useState<Tier[]>(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState<Tier | null>(null);
  const [addingFeature, setAddingFeature] = useState('');

  const openEdit = (plan: Tier) => {
    setEditingPlan({ ...plan, features: [...plan.features] });
  };

  const closeModal = () => setEditingPlan(null);

  const handleSave = () => {
    if (!editingPlan) return;
    setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan : p));
    closeModal();
  };

  const addSelectedFeature = () => {
    if (!editingPlan || !addingFeature) return;
    if (editingPlan.features.includes(addingFeature)) return; // no duplicates
    setEditingPlan({ ...editingPlan, features: [...editingPlan.features, addingFeature] });
    setAddingFeature('');
  };

  const removeFeature = (feat: string) => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, features: editingPlan.features.filter(f => f !== feat) });
  };

  // Features NOT yet in this plan → available to add
  const availableFeatures = ALL_SYSTEM_FEATURES.filter(
    f => editingPlan && !editingPlan.features.includes(f)
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Global Subscription Plans</h1>
        <p>Define pricing tiers, manage feature entitlement, and monitor subscription health across the platform. Changes reflect on the public website instantly.</p>
      </div>

      {/* Tier Cards */}
      <div className="portal-grid-3">
        {plans.map(plan => (
          <div
            key={plan.id}
            className="portal-card"
            style={{ borderTop: `5px solid ${plan.color}`, overflow: 'visible' }}
          >
            <div className="portal-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{
                display: 'inline-flex',
                background: `${plan.color}18`,
                color: plan.color,
                borderRadius: 8,
                padding: '4px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 12,
              }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1a202c' }}>{plan.price}</span>
                <span style={{ fontSize: '0.85rem', color: '#718096' }}>{plan.billingLabel}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#718096', margin: '0 0 16px', lineHeight: 1.5 }}>{plan.tagline}</p>
            </div>
            <div className="portal-card-body" style={{ paddingTop: 0 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                {plan.features.length} Features Included
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', maxHeight: 200, overflowY: 'auto' }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.85rem', color: '#2d3748' }}>
                    <i className="fas fa-check-circle" style={{ color: plan.color, flexShrink: 0 }}></i> {f}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 16 }}>
                Powering <strong style={{ color: '#2d3748' }}>{plan.schools} schools</strong>
              </p>
              <button
                onClick={() => openEdit(plan)}
                className="portal-btn-secondary"
                style={{ width: '100%' }}
              >
                <i className="fas fa-pen" style={{ marginRight: 8 }}></i> Edit Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add-ons */}
      <div className="portal-card" style={{ marginTop: 8 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-tags" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Global Plan Add-ons</h2>
          <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}>+ Create New Add-on</button>
        </div>
        <div className="portal-card-body">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Add-on Service</th><th>Default Price</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>SMS Gateway (Bulker)</td>
                <td>$0.02 / msg</td>
                <td><span className="portal-badge success">Active</span></td>
                <td><button className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Manage</button></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Premium AI Tutoring</td>
                <td>$10 / student / mo</td>
                <td><span className="portal-badge info">Beta</span></td>
                <td><button className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Manage</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
      {editingPlan && (
        <div className="portal-modal-overlay" onClick={closeModal}>
          <div
            className="portal-modal-card"
            style={{ maxWidth: 640 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="portal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${editingPlan.color}18`,
                  color: editingPlan.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                }}>
                  <i className="fas fa-layer-group"></i>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1a202c' }}>Edit Tier: {editingPlan.name}</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>Changes are reflected on the public pricing page</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#a0aec0', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="portal-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label className="portal-label">Tier Name</label>
                  <input
                    className="portal-input"
                    value={editingPlan.name}
                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label className="portal-label">Monthly Price</label>
                  <input
                    className="portal-input"
                    value={editingPlan.price}
                    onChange={e => setEditingPlan({ ...editingPlan, price: e.target.value })}
                    placeholder="e.g. $49 or Custom"
                  />
                </div>
                <div className="portal-form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label className="portal-label">Tier Tagline / Description</label>
                  <input
                    className="portal-input"
                    value={editingPlan.tagline}
                    onChange={e => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                  />
                </div>
              </div>

              {/* Features / Services */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="portal-label" style={{ margin: 0 }}>
                    Included Features & Services
                    <span style={{ marginLeft: 8, background: '#ebf8ff', color: 'var(--school-primary, #3182ce)', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {editingPlan.features.length} selected
                    </span>
                  </label>
                </div>

                {/* Add feature row */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <select
                    className="portal-input"
                    style={{ flex: 1 }}
                    value={addingFeature}
                    onChange={e => setAddingFeature(e.target.value)}
                  >
                    <option value="">— Select a feature to add —</option>
                    {availableFeatures.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <button
                    onClick={addSelectedFeature}
                    className="portal-btn-primary"
                    style={{ whiteSpace: 'nowrap', padding: '10px 18px' }}
                    disabled={!addingFeature}
                  >
                    <i className="fas fa-plus" style={{ marginRight: 6 }}></i> Add
                  </button>
                </div>

                {/* Current features list */}
                <div style={{
                  border: '1px solid var(--portal-border)',
                  borderRadius: 12,
                  maxHeight: 280,
                  overflowY: 'auto',
                  background: '#f8fafc',
                }}>
                  {editingPlan.features.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#a0aec0', padding: '30px 20px', margin: 0, fontSize: '0.85rem' }}>
                      No features assigned. Add some from the dropdown above.
                    </p>
                  ) : (
                    editingPlan.features.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: i < editingPlan.features.length - 1 ? '1px solid #edf2f7' : 'none',
                          background: 'white',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
                          <i className="fas fa-check-circle" style={{ color: editingPlan.color }}></i>
                          <span>{f}</span>
                        </div>
                        <button
                          onClick={() => removeFeature(f)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--portal-danger)',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: '0.85rem',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="portal-modal-footer">
              <button onClick={closeModal} className="portal-btn-secondary">Cancel</button>
              <button onClick={handleSave} className="portal-btn-primary">
                <i className="fas fa-save" style={{ marginRight: 8 }}></i>Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
