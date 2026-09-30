import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';

const DENOMINATIONS = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05];

export default function TillCashupComponent() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [expectedSales, setExpectedSales] = useState<any>(null);
  const [variancesHistory, setVariancesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Open modal
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('20.00');

  // Close modal
  const [isCloseModal, setIsCloseModal] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});
  const [electronicCounts, setElectronicCounts] = useState<Record<string, string>>({
    ECOCASH: '',
    INNBUCKS: '',
    CARD: '',
    BANK: ''
  });
  const [closeNotes, setCloseNotes] = useState('');

  useEffect(() => {
    fetchDevices();
    fetchVariances();
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      checkActiveSession(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const fetchDevices = async () => {
    try {
      const res = await api.get('/fiscal/devices');
      setDevices(res.data);
      if (res.data.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(res.data[0].id);
      }
    } catch (err) {
      console.error('Fetch devices error:', err);
    }
  };

  const checkActiveSession = async (deviceId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/tills/active?deviceId=${deviceId}`);
      setActiveSession(res.data.session);
      if (res.data.session) {
        const expRes = await api.get(`/tills/${res.data.session.id}/expected`);
        setExpectedSales(expRes.data);
      } else {
        setExpectedSales(null);
      }
    } catch (err) {
      console.error('Check active session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVariances = async () => {
    try {
      const res = await api.get('/tills/variances');
      setVariancesHistory(res.data);
    } catch (err) {
      console.error('Fetch variances error:', err);
    }
  };

  const handleOpenTill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tills/open', {
        deviceId: selectedDeviceId,
        openingFloat: parseFloat(openingFloat) || 0
      });
      setIsOpenModal(false);
      checkActiveSession(selectedDeviceId);
      fetchVariances();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to open till');
    }
  };

  // Calculate counted cash
  const countedCash = DENOMINATIONS.reduce((sum, denom) => {
    const count = denomCounts[denom] || 0;
    return sum + denom * count;
  }, 0);

  const handleCloseTill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      const denominations = Object.entries(denomCounts).map(([denom, count]) => ({
        denomination: parseFloat(denom),
        count
      }));

      const countedPayments = Object.entries(electronicCounts).map(([pm, amt]) => ({
        paymentMethod: pm,
        countedAmount: parseFloat(amt) || 0
      }));

      await api.post(`/tills/${activeSession.id}/close`, {
        denominations,
        countedPayments,
        notes: closeNotes
      });

      setIsCloseModal(false);
      setDenomCounts({});
      setCloseNotes('');
      checkActiveSession(selectedDeviceId);
      fetchVariances();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to close till');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Device selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 700, color: '#334155' }}>Select Till Location / Device:</label>
          <select
            value={selectedDeviceId}
            onChange={e => setSelectedDeviceId(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.location} ({d.serialNo})
              </option>
            ))}
          </select>
        </div>

        <div>
          {activeSession ? (
            <button
              onClick={() => setIsCloseModal(true)}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-lock" />
              Reconcile & Close Till
            </button>
          ) : (
            <button
              onClick={() => setIsOpenModal(true)}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-key" />
              Open Till Session
            </button>
          )}
        </div>
      </div>

      {/* Active Session Status */}
      <div
        style={{
          background: activeSession ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${activeSession ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 10,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: activeSession ? '#16a34a' : '#dc2626',
                display: 'inline-block'
              }}
            />
            <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
              {activeSession ? `Till is OPEN (${activeSession.sessionNumber})` : 'Till is CLOSED'}
            </h3>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {activeSession
              ? `Opened at ${new Date(activeSession.openedAt).toLocaleTimeString()} with float $${activeSession.openingFloat?.toFixed(2)}. Sales are unlocked.`
              : 'Counter sales are blocked on this device until an authorized operator opens a till session.'}
          </p>
        </div>

        {activeSession && expectedSales && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Expected Cash in Till:</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>
              ${expectedSales.expectedCash?.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              (Float ${expectedSales.openingFloat?.toFixed(2)} + Sales ${expectedSales.salesOnlyCash?.toFixed(2)})
            </div>
          </div>
        )}
      </div>

      {/* Live Sales by Payment Method Grid */}
      {activeSession && expectedSales && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20, marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700 }}>
            Live Sales Breakdown by Tender
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {Object.entries(expectedSales.byPaymentMethod || {}).map(([pm, amt]: any) => (
              <div key={pm} style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{pm}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                  ${amt.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past 7 Days History Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '1.05rem' }}>
          Recent Till Sessions & Cash-Up Variances
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>Session #</th>
              <th style={{ padding: '12px 16px' }}>Closed Date</th>
              <th style={{ padding: '12px 16px' }}>Location</th>
              <th style={{ padding: '12px 16px' }}>Expected Sales</th>
              <th style={{ padding: '12px 16px' }}>Counted Cash</th>
              <th style={{ padding: '12px 16px' }}>Variance</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {variancesHistory.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.sessionNumber}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {row.closedAt ? new Date(row.closedAt).toLocaleDateString() : 'Active'}
                </td>
                <td style={{ padding: '12px 16px' }}>{row.device?.location}</td>
                <td style={{ padding: '12px 16px' }}>${row.expectedSales?.toFixed(2) || '0.00'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>${row.closingCounted?.toFixed(2) || '0.00'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: (row.variance || 0) < 0 ? '#dc2626' : (row.variance || 0) > 0 ? '#16a34a' : '#475569' }}>
                  {row.variance !== null && row.variance !== undefined ? (
                    row.variance >= 0 ? `+$${row.variance.toFixed(2)}` : `-$${Math.abs(row.variance).toFixed(2)}`
                  ) : '-'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: row.status === 'CLOSED' ? '#dcfce7' : row.status === 'VARIANCE_REVIEW' ? '#fee2e2' : '#fef3c7',
                      color: row.status === 'CLOSED' ? '#166534' : row.status === 'VARIANCE_REVIEW' ? '#991b1b' : '#b45309'
                    }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {variancesHistory.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  No completed cash-up sessions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Open Till */}
      {isOpenModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 16px 0', fontWeight: 700 }}>Open Till Session</h3>
            <form onSubmit={handleOpenTill} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Opening Float Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={e => setOpeningFloat(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Transfers float from Cash Office Safe (1020) to Till Cash (1023)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700 }}
                >
                  Open Till
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Till & Denomination Breakdown */}
      {isCloseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontWeight: 800 }}>Cash-Up & Reconcile Till</h3>

            <form onSubmit={handleCloseTill} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Cash Denominations Grid */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>Counted Cash Denominations</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {DENOMINATIONS.map(denom => (
                    <div key={denom} style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>${denom}</div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denomCounts[denom] || ''}
                        onChange={e => setDenomCounts({ ...denomCounts, [denom]: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', marginTop: 4 }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#16a34a' }}>
                  Total Counted Cash: ${countedCash.toFixed(2)}
                </div>
              </div>

              {/* Electronic Tenders */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>Electronic Tenders (Audited Totals)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {['ECOCASH', 'INNBUCKS', 'CARD', 'BANK'].map(pm => (
                    <div key={pm}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pm} ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={electronicCounts[pm] || ''}
                        onChange={e => setElectronicCounts({ ...electronicCounts, [pm]: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 2 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Reconciliation Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for any shortage or overage..."
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsCloseModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700 }}
                >
                  Confirm & Post Cash-Up to GL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
