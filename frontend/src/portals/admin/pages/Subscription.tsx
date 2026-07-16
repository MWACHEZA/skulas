import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { DEFAULT_PLANS } from '../../acadex/pages/Subscriptions';

export default function AdminSubscription() {
  const { user } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment card state
  const [cardLast4, setCardLast4] = useState('4242');
  const [cardExpiry, setCardExpiry] = useState('12/27');
  const [cardBrand, setCardBrand] = useState('Visa');

  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newCvv, setNewCvv] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = () => {
    setLoading(true);
    api.get('/api/schools/me')
      .then(({ data }) => setSchoolData(data))
      .catch((err) => console.error('Failed to fetch school details', err))
      .finally(() => setLoading(false));
  };

  const planName = schoolData?.plan?.name || user?.schoolPlan || 'Starter';
  const plan = DEFAULT_PLANS.find(p => p.name === planName) ?? DEFAULT_PLANS[0];
  const status = schoolData?.status || 'Active';

  const handleUpdatePlan = async (targetPlanName: string) => {
    const action = targetPlanName === 'Enterprise' || DEFAULT_PLANS.find(p => p.name === targetPlanName)!.id > plan.id ? 'upgrade' : 'downgrade';
    if (!confirm(`Are you sure you want to ${action} your plan to ${targetPlanName}?`)) return;
    
    setLoading(true);
    try {
      await api.patch('/api/schools/me/plan', { planName: targetPlanName });
      alert(`Successfully updated your subscription to ${targetPlanName}!`);
      fetchSchoolData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update subscription plan.');
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    const nextPlan = planName === 'Starter' ? 'Professional' : 'Enterprise';
    handleUpdatePlan(nextPlan);
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber || !newExpiry || !newCvv) {
      alert('Please fill in all card details');
      return;
    }
    setUpdatingPayment(true);
    setTimeout(() => {
      const cleanCard = newCardNumber.replace(/\s+/g, '');
      const last4Digits = cleanCard.slice(-4) || '4242';
      
      // Determine card brand from first digit
      let brand = 'Visa';
      if (cleanCard.startsWith('5')) brand = 'Mastercard';
      else if (cleanCard.startsWith('3')) brand = 'American Express';
      
      setCardLast4(last4Digits);
      setCardExpiry(newExpiry);
      setCardBrand(brand);
      setUpdatingPayment(false);
      setShowPaymentModal(false);
      alert('Payment details updated successfully!');
    }, 1000);
  };

  const handleDownloadInvoice = (invNo: string) => {
    alert(`Generating invoice receipt for ${invNo}...`);
    const invoiceContent = `
=============================================
               ACADEX INVOICE
=============================================
Invoice Number: ${invNo}
Invoice Date: April 1, 2026
Payment Status: PAID
---------------------------------------------
School Details:
Name: ${schoolData?.name || 'St Patricks School'}
Code: ${user?.schoolCode || 'N/A'}
License: ${schoolData?.id?.substring(0, 12).toUpperCase() || 'N/A'}
---------------------------------------------
Subscription Details:
Plan: ${plan.name} Tier
Amount: ${plan.price}${plan.billingLabel}
---------------------------------------------
Payment Method: ${cardBrand} ending in ${cardLast4}
=============================================
Thank you for partnering with Acadex!
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Subscription & Billing</h1>
        <p>View your school's current plan, included features, and manage your billing information.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--school-primary, #0056b3)' }}></i>
        </div>
      ) : (
        <>
          <div className="portal-grid-2">
            {/* Current Plan */}
            <div className="portal-card" style={{ borderTop: `5px solid ${plan.color}` }}>
              <div className="portal-card-header">
                <h2>Current Plan</h2>
                <span className={`portal-badge ${status === 'Active' ? 'success' : status === 'Suspended' ? 'danger' : 'neutral'}`}>
                  {status}
                </span>
              </div>
              <div className="portal-card-body">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: plan.color }}>{plan.name}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a202c' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.85rem', color: '#718096' }}>{plan.billingLabel}</span>
                </div>
                <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#718096' }}>{plan.tagline}</p>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a0aec0' }}>
                    {plan.features.length} Features Included
                  </p>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                        <i className="fas fa-check-circle" style={{ color: plan.color, flexShrink: 0 }}></i>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {planName !== 'Enterprise' && (
                  <button className="portal-btn-primary" style={{ width: '100%' }} onClick={handleUpgradeClick}>
                    <i className="fas fa-arrow-up" style={{ marginRight: 8 }}></i>Upgrade Plan
                  </button>
                )}
              </div>
            </div>

            {/* Billing Details */}
            <div className="portal-card">
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Payment Details</h2>
                <button className="portal-btn-secondary" onClick={() => setShowPaymentModal(true)}>Update</button>
              </div>
              <div className="portal-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
                  <i className={`fab ${cardBrand.toLowerCase() === 'visa' ? 'fa-cc-visa' : cardBrand.toLowerCase() === 'mastercard' ? 'fa-cc-mastercard' : 'fa-credit-card'}`} style={{ fontSize: '2rem', color: '#1a1f71' }}></i>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{cardBrand} ending in {cardLast4}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#718096' }}>Expires {cardExpiry}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['Plan', planName],
                    ['Billing Cycle', 'Monthly'],
                    ['School Code', user?.schoolCode || 'N/A'],
                    ['License ID', schoolData?.id?.substring(0, 12).toUpperCase() || 'N/A'],
                    ['Next Invoice', 'May 1, 2026'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#718096' }}>{label}:</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="portal-card" style={{ marginTop: 8 }}>
            <div className="portal-card-header">
              <h2><i className="fas fa-layer-group" style={{ marginRight: 8, color: 'var(--school-primary, #0056b3)' }}></i>Available Plans</h2>
              <span style={{ fontSize: '0.82rem', color: '#718096' }}>Your plan: <strong style={{ color: plan.color }}>{planName}</strong></span>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {DEFAULT_PLANS.map(p => (
                  <div
                    key={p.id}
                    style={{
                      padding: 20, borderRadius: 14,
                      border: `2px solid ${p.name === planName ? p.color : '#e2e8f0'}`,
                      background: p.name === planName ? `${p.color}08` : 'white',
                      position: 'relative',
                    }}
                  >
                    {p.name === planName && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        background: p.color, color: 'white', border: 'none',
                        padding: '2px 14px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                      }}>
                        Current Plan
                      </div>
                    )}
                    <div style={{ fontWeight: 800, color: p.color, fontSize: '1.1rem', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a202c' }}>
                      {p.price}<span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 400 }}>{p.billingLabel}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#718096', margin: '8px 0 16px' }}>{p.tagline}</p>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a0aec0' }}>{p.features.length} features</p>
                    {p.name !== planName && (
                      <button
                        className="portal-btn-secondary"
                        style={{ width: '100%', marginTop: 8, fontSize: '0.85rem' }}
                        onClick={() => handleUpdatePlan(p.name)}
                      >
                        {p.id > plan.id ? 'Upgrade' : 'Downgrade'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="portal-card" style={{ marginTop: 8 }}>
            <div className="portal-card-header">
              <h2>Billing History</h2>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>INV-2026-001</td>
                    <td>Apr 1, 2026</td>
                    <td>{plan.price}</td>
                    <td><span className="portal-badge success">Paid</span></td>
                    <td>
                      <button className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleDownloadInvoice('INV-2026-001')}>
                        <i className="fas fa-download" style={{ marginRight: 6 }}></i>PDF
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showPaymentModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Update Payment Details</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Provide new card details for subscription billing.</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleUpdatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Cardholder Name</label>
                  <input 
                    type="text" 
                    required 
                    className="portal-input" 
                    placeholder="e.g. John Doe"
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Card Number <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    required 
                    maxLength={19}
                    className="portal-input" 
                    placeholder="4111 2222 3333 4444"
                    value={newCardNumber} 
                    onChange={e => setNewCardNumber(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="portal-form-group">
                    <label className="portal-label">Expiry Date <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      required 
                      maxLength={5}
                      className="portal-input" 
                      placeholder="MM/YY"
                      value={newExpiry} 
                      onChange={e => setNewExpiry(e.target.value)} 
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">CVV <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="password" 
                      required 
                      maxLength={4}
                      className="portal-input" 
                      placeholder="•••"
                      value={newCvv} 
                      onChange={e => setNewCvv(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="portal-btn-primary" 
                    style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} 
                    disabled={updatingPayment}
                  >
                    {updatingPayment ? 'Updating...' : 'Save Card'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
