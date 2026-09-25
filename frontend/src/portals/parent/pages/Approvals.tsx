import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface ApprovalItem {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string;
  cost?: number;
  costPaid?: boolean;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  resolvedDate?: string;
  destination?: string;
  transport?: string;
}

export default function ParentApprovals() {
  const { user, activeEntity } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const childId = activeEntity?.id || 'default-child';
  const childName = activeEntity?.name || 'Child';

  // Initial demo/seed list of approvals
  const initialPending: ApprovalItem[] = [
    {
      id: 'app-matobo-1',
      title: 'Matobo Hills Geography & Heritage Excursion',
      date: '10 Oct 2026',
      type: 'Excursion',
      description: 'Educational field trip covering geomorphology and Zimbabwean heritage. Return transport and packed lunch included.',
      cost: 20,
      costPaid: false,
      status: 'PENDING',
      destination: 'Matobo National Park',
      transport: 'School Bus #2'
    },
    {
      id: 'app-museum-1',
      title: 'National Museum History Excursion',
      date: '28 Mar 2026',
      type: 'Academic Excursion',
      description: 'Form 3 History field trip to the National Museum & Botanical Gardens. Transport departs 08:30 AM.',
      cost: 15,
      costPaid: true,
      status: 'PENDING',
      destination: 'National History Museum & Botanical Gardens',
      transport: 'School Bus #4'
    }
  ];

  const initialPast: ApprovalItem[] = [
    {
      id: 'app-swim-1',
      title: 'Interschool Swimming Gala Participation',
      date: '01 Sep 2026',
      type: 'Extra-Curricular',
      description: 'Consent for inter-school swimming gala at City Aquatics Centre.',
      status: 'APPROVED',
      resolvedDate: '01 Sep 2026'
    },
    {
      id: 'app-med-1',
      title: 'Annual Student Medical & Privacy Policy Consent',
      date: '15 Jan 2026',
      type: 'Policy Consent',
      description: 'Consent for school nurse triage and emergency basic clinic care.',
      status: 'APPROVED',
      resolvedDate: '15 Jan 2026'
    }
  ];

  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>(() => {
    try {
      const saved = localStorage.getItem(`acadex_approvals_pending_${childId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return initialPending;
  });

  const [pastItems, setPastItems] = useState<ApprovalItem[]>(() => {
    try {
      const saved = localStorage.getItem(`acadex_approvals_past_${childId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return initialPast;
  });

  // Selected item modal for reviewing full excursion details
  const [selectedDetails, setSelectedDetails] = useState<ApprovalItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`acadex_approvals_pending_${childId}`, JSON.stringify(pendingItems));
      localStorage.setItem(`acadex_approvals_past_${childId}`, JSON.stringify(pastItems));
      
      // Update dashboard cache if present to keep in sync
      const cachedDashStr = localStorage.getItem(`acadex_parent_dash_${childId}`);
      if (cachedDashStr) {
        const cached = JSON.parse(cachedDashStr);
        if (cached.data) {
          cached.data.actionItems = cached.data.actionItems.filter((i: any) => 
            i.type !== 'APPROVAL' || pendingItems.some(p => p.id === i.id || i.label.includes(p.title))
          );
          cached.data.totalActionItemsCount = cached.data.actionItems.length;
          localStorage.setItem(`acadex_parent_dash_${childId}`, JSON.stringify(cached));
        }
      }
    } catch (e) {
      // ignore
    }
  }, [pendingItems, pastItems, childId]);

  // One-tap Approve
  const handleApprove = (item: ApprovalItem) => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const updatedItem: ApprovalItem = {
      ...item,
      status: 'APPROVED',
      resolvedDate: todayStr
    };

    setPendingItems(prev => prev.filter(p => p.id !== item.id));
    setPastItems(prev => [updatedItem, ...prev]);

    showToast(`Consent granted for "${item.title}".`, 'success');
    if (selectedDetails?.id === item.id) setSelectedDetails(null);
  };

  // One-tap Decline
  const handleDecline = (item: ApprovalItem) => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const updatedItem: ApprovalItem = {
      ...item,
      status: 'DECLINED',
      resolvedDate: todayStr
    };

    setPendingItems(prev => prev.filter(p => p.id !== item.id));
    setPastItems(prev => [updatedItem, ...prev]);

    showToast(`Consent declined for "${item.title}".`, 'info');
    if (selectedDetails?.id === item.id) setSelectedDetails(null);
  };

  // Pay Now action (independent of approval state)
  const handlePayNow = (item: ApprovalItem) => {
    showToast(`Redirecting to Fees to settle $${item.cost} for ${item.title}...`, 'info');
    navigate('/parent/fees');
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <i className="fas fa-file-signature" style={{ fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Parental Approvals & Consent
            </h1>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Review, sign, or settle excursion permissions and school policy acknowledgements for {childName}.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: PENDING (Checkbox-Style Action List)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="portal-card" style={{
        marginBottom: 28,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              {pendingItems.length}
            </span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Pending Action ({pendingItems.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            One-tap action required
          </span>
        </div>

        {pendingItems.length === 0 ? (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: '20px',
            textAlign: 'center',
            color: '#15803d'
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '1.8rem', marginBottom: 8, display: 'block' }}></i>
            <strong style={{ fontSize: '1rem', display: 'block', marginBottom: 2 }}>All caught up!</strong>
            <span style={{ fontSize: '0.85rem' }}>No pending consents or sign-offs required for {childName}.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                  transition: 'background 0.2s'
                }}
              >
                {/* Left: Checkbox Icon + Content */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
                  {/* Checkbox-style box indicator */}
                  <div
                    onClick={() => handleApprove(item)}
                    title="Tap to approve directly"
                    style={{
                      width: 22,
                      height: 22,
                      border: '2px solid #94a3b8',
                      borderRadius: 6,
                      marginTop: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      flexShrink: 0
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'transparent' }}>✓</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                        {item.title}
                      </strong>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        borderRadius: 4
                      }}>
                        {item.date}
                      </span>
                      {item.cost !== undefined && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          background: item.costPaid ? '#f0fdf4' : '#fef2f2',
                          color: item.costPaid ? '#15803d' : '#b91c1c',
                          borderRadius: 4
                        }}>
                          ${item.cost} {item.costPaid ? '(Paid)' : '(Unpaid)'}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.4 }}>
                      {item.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => setSelectedDetails(item)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: 0,
                        marginTop: 6,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      View Excursion Details & Schedule →
                    </button>
                  </div>
                </div>

                {/* Right: One-tap Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Approve */}
                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    className="portal-btn-primary"
                    style={{
                      background: '#16a34a',
                      borderColor: '#16a34a',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <i className="fas fa-check"></i> Approve
                  </button>

                  {/* Decline */}
                  <button
                    type="button"
                    onClick={() => handleDecline(item)}
                    className="portal-btn-secondary"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#64748b'
                    }}
                  >
                    Decline
                  </button>

                  {/* Independent Pay Now (if cost is attached & unpaid) */}
                  {item.cost && !item.costPaid && (
                    <button
                      type="button"
                      onClick={() => handlePayNow(item)}
                      className="portal-btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        borderColor: '#bfdbfe',
                        background: '#eff6ff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <i className="fas fa-credit-card"></i> Pay ${item.cost}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: PAST / RESOLVED APPROVALS
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="portal-card" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              ✓
            </span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Past Resolved Approvals ({pastItems.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Historical consent archive
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pastItems.map((item) => {
            const isApproved = item.status === 'APPROVED';
            return (
              <div
                key={item.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Resolved checkbox icon */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: isApproved ? '#dcfce7' : '#fee2e2',
                    color: isApproved ? '#15803d' : '#b91c1c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {isApproved ? '☑' : '☒'}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                      {item.type} • {isApproved ? 'Approved' : 'Declined'} on {item.resolvedDate || item.date}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`portal-badge ${isApproved ? 'success' : 'danger'}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    {isApproved ? 'Consent Given ✓' : 'Consent Declined'}
                  </span>

                  <button
                    type="button"
                    className="portal-btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 10px', color: '#475569' }}
                    onClick={() => showToast(`Generating confirmation slip for ${item.title}...`, 'info')}
                  >
                    View Slip
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: EXCURSION DETAILS
          ══════════════════════════════════════════════════════════════════════ */}
      {selectedDetails && (
        <div className="portal-modal-overlay" onClick={() => setSelectedDetails(null)}>
          <div
            className="portal-modal"
            style={{ maxWidth: 520, width: '90%', borderRadius: 16, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Excursion & Consent Details</h3>
              <button onClick={() => setSelectedDetails(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div className="portal-modal-body" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: '#0f172a' }}>{selectedDetails.title}</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                {selectedDetails.description}
              </p>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: '0.85rem', lineHeight: 1.6 }}>
                <div><strong>Destination:</strong> {selectedDetails.destination || 'School Field Excursion'}</div>
                <div><strong>Date & Time:</strong> {selectedDetails.date}</div>
                <div><strong>Transport:</strong> {selectedDetails.transport || 'Designated School Transport'}</div>
                <div><strong>Fee Status:</strong> {selectedDetails.cost ? `$${selectedDetails.cost} (${selectedDetails.costPaid ? 'Paid' : 'Unpaid'})` : 'Included in activity fees'}</div>
              </div>

              <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem', color: '#1e40af' }}>
                <i className="fas fa-shield-alt" style={{ marginRight: 6 }}></i>
                Signing consent grants standard first-aid authorization and supervisorial care during transport and excursion activities.
              </div>
            </div>

            <div className="portal-modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="portal-btn-secondary" onClick={() => setSelectedDetails(null)}>
                Close
              </button>
              <button
                className="portal-btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={() => handleApprove(selectedDetails)}
              >
                Approve & Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
