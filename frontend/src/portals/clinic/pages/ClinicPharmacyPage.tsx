import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

export type PharmacyTab = 'stock' | 'dispense-log' | 'low-stock' | 'expiry';

export default function ClinicPharmacyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as PharmacyTab) || 'stock';
  const [activeTab, setActiveTab] = useState<PharmacyTab>(currentTab);

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [dispenseLogs, setDispenseLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ drugName: '', category: 'MEDICATION', unit: 'tablets', minStock: 20, location: 'Shelf A-1' });

  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedStockForBatch, setSelectedStockForBatch] = useState<any>(null);
  const [batchForm, setBatchForm] = useState({ batchNumber: '', quantity: 100, expiryDate: '' });

  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispenseStock, setDispenseStock] = useState<any>(null);
  const [dispenseQty, setDispenseQty] = useState(1);
  const [dispenseNotes, setDispenseNotes] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as PharmacyTab;
    if (tabParam && ['stock', 'dispense-log', 'low-stock', 'expiry'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: PharmacyTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, logRes] = await Promise.all([
        api.get('/clinic/pharmacy/catalog'),
        api.get('/clinic/pharmacy/dispense-log')
      ]);
      setCatalog(catRes.data || []);
      setDispenseLogs(logRes.data || []);
    } catch (err) {
      console.error('Failed to load pharmacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.drugName.trim()) return;
    try {
      setProcessing(true);
      setFeedback(null);
      await api.post('/clinic/pharmacy/stock', stockForm);
      setFeedback({ type: 'success', message: `Medication "${stockForm.drugName}" added to formulary.` });
      setShowAddStockModal(false);
      setStockForm({ drugName: '', category: 'MEDICATION', unit: 'tablets', minStock: 20, location: 'Shelf A-1' });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to add drug item' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForBatch || !batchForm.batchNumber || !batchForm.expiryDate) return;
    try {
      setProcessing(true);
      setFeedback(null);
      await api.post('/clinic/pharmacy/batch', {
        stockId: selectedStockForBatch.id,
        batchNumber: batchForm.batchNumber,
        quantity: batchForm.quantity,
        expiryDate: batchForm.expiryDate
      });
      setFeedback({ type: 'success', message: `Batch ${batchForm.batchNumber} received for ${selectedStockForBatch.drugName}.` });
      setShowAddBatchModal(false);
      setSelectedStockForBatch(null);
      setBatchForm({ batchNumber: '', quantity: 100, expiryDate: '' });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to add batch' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDispenseFefo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispenseStock) return;
    try {
      setProcessing(true);
      setFeedback(null);
      const res = await api.post('/clinic/pharmacy/dispense-fefo', {
        stockId: dispenseStock.id,
        quantity: dispenseQty,
        notes: dispenseNotes
      });
      const extraNotice = res.data?.autoRequisitionCreated ? ' (Low stock reached: Automated procurement requisition submitted to Admin/Bursar!)' : '';
      setFeedback({
        type: 'success',
        message: `Successfully dispensed ${dispenseQty} ${dispenseStock.unit} of ${dispenseStock.drugName} via FEFO.${extraNotice}`
      });
      setShowDispenseModal(false);
      setDispenseStock(null);
      setDispenseQty(1);
      setDispenseNotes('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to dispense medication' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredCatalog = catalog.filter((item) =>
    item.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = catalog.filter((item) => item.isLowStock);

  // Batches expiring soon
  const today = new Date();
  const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringBatches: any[] = [];
  catalog.forEach((item) => {
    (item.batches || []).forEach((b: any) => {
      if (b.quantity > 0 && new Date(b.expiryDate) <= ninetyDaysFromNow) {
        expiringBatches.push({
          ...b,
          drugName: item.drugName,
          unit: item.unit
        });
      }
    });
  });

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-pills" style={{ color: 'var(--portal-primary, #4f46e5)' }} />
          Clinic Pharmacy & Dispensary
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          FEFO-enforced batch dispensing, strict negative stock prevention, and automated low-stock procurement requisitions.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: feedback.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
          color: feedback.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} />
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="portal-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => handleTabChange('stock')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'stock' ? 600 : 400,
            color: activeTab === 'stock' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'stock' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-boxes" />
          Medication Stock ({catalog.length})
        </button>

        <button
          onClick={() => handleTabChange('low-stock')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'low-stock' ? 600 : 400,
            color: activeTab === 'low-stock' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'low-stock' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-exclamation-triangle" />
          Low Stock Alerts
          {lowStockItems.length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 10 }}>
              {lowStockItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('expiry')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'expiry' ? 600 : 400,
            color: activeTab === 'expiry' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'expiry' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calendar-times" />
          FEFO Expiry Tracker ({expiringBatches.length})
        </button>

        <button
          onClick={() => handleTabChange('dispense-log')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'dispense-log' ? 600 : 400,
            color: activeTab === 'dispense-log' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'dispense-log' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-history" />
          Dispensing Audit Trail
        </button>
      </div>

      {/* TAB 1: Stock Inventory */}
      {activeTab === 'stock' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flex: 1, maxWidth: 400 }}>
              <input
                type="text"
                placeholder="Search medication name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowAddStockModal(true)}
                style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }} /> Add Formulary Item
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p style={{ marginTop: 10 }}>Loading dispensary stock...</p>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <i className="fas fa-prescription-bottle" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
              <p>No medications found matching your query.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Medication Name</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Location</th>
                    <th style={{ padding: '12px 16px' }}>Total Stock</th>
                    <th style={{ padding: '12px 16px' }}>Min Threshold</th>
                    <th style={{ padding: '12px 16px' }}>Earliest Expiry (FEFO)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {item.drugName}
                        {item.isLowStock && (
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 4 }}>
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.category}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.location || 'Main Cabinet'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: item.totalQty === 0 ? '#ef4444' : '#0f172a' }}>
                        {item.totalQty} {item.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {item.minStock} {item.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {item.earliestExpiry ? new Date(item.earliestExpiry).toLocaleDateString() : 'No active batch'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            onClick={() => { setSelectedStockForBatch(item); setShowAddBatchModal(true); }}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                          >
                            + Batch
                          </button>
                          <button
                            disabled={item.totalQty === 0}
                            onClick={() => { setDispenseStock(item); setShowDispenseModal(true); }}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.8rem',
                              background: item.totalQty === 0 ? '#f1f5f9' : '#dcfce7',
                              color: item.totalQty === 0 ? '#94a3b8' : '#166534',
                              border: 'none',
                              borderRadius: 4,
                              cursor: item.totalQty === 0 ? 'not-allowed' : 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Dispense
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Low Stock Alerts */}
      {activeTab === 'low-stock' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Depleted & Low Stock Requisitions</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Medications falling below safety thresholds automatically raise procurement requisitions directly into the school procurement chain.
          </p>

          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#166534' }}>
              <i className="fas fa-check-circle fa-2x" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 600 }}>All pharmacy stocks are currently within safe thresholds.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Medication</th>
                    <th style={{ padding: '12px 16px' }}>Current Stock</th>
                    <th style={{ padding: '12px 16px' }}>Safety Minimum</th>
                    <th style={{ padding: '12px 16px' }}>Auto-Procurement Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Receive New Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.drugName}</td>
                      <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 700 }}>
                        {item.totalQty} {item.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {item.minStock} {item.unit}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>
                          <i className="fas fa-shopping-cart" style={{ marginRight: 4 }} /> Requisition Raised to Admin/Bursar
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => { setSelectedStockForBatch(item); setShowAddBatchModal(true); }}
                          style={{ padding: '5px 12px', fontSize: '0.8rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                        >
                          + Receive Delivery
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FEFO Expiry Tracker */}
      {activeTab === 'expiry' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>First-Expired, First-Out (FEFO) Batches</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Batches expiring within 90 days. Our FEFO algorithm automatically dispenses from the earliest expiring batch first.
          </p>

          {expiringBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#166534' }}>
              <i className="fas fa-calendar-check fa-2x" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 600 }}>No medication batches expiring within the next 90 days.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Medication</th>
                  <th style={{ padding: '12px 16px' }}>Batch Number</th>
                  <th style={{ padding: '12px 16px' }}>Quantity Available</th>
                  <th style={{ padding: '12px 16px' }}>Expiry Date</th>
                  <th style={{ padding: '12px 16px' }}>FEFO Priority Status</th>
                </tr>
              </thead>
              <tbody>
                {expiringBatches.map((b) => {
                  const isExpired = new Date(b.expiryDate) < today;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.drugName}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{b.batchNumber}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.quantity} {b.unit}</td>
                      <td style={{ padding: '12px 16px', color: isExpired ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: isExpired ? '#fee2e2' : '#fef3c7',
                          color: isExpired ? '#991b1b' : '#92400e'
                        }}>
                          {isExpired ? 'EXPIRED (Quarantine)' : 'ACTIVE FEFO (Dispense Next)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: Dispense Log */}
      {activeTab === 'dispense-log' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Dispensing Transaction History</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Every dose deducted from batch inventory is logged with dispensing clinician credentials.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Medication</th>
                <th style={{ padding: '12px 16px' }}>Batch</th>
                <th style={{ padding: '12px 16px' }}>Quantity</th>
                <th style={{ padding: '12px 16px' }}>Visit Code</th>
                <th style={{ padding: '12px 16px' }}>Dispensed By</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {dispenseLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{log.stock?.drugName}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{log.batch?.batchNumber}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{log.quantity}</td>
                  <td style={{ padding: '12px 16px', color: '#3b82f6' }}>{log.visit?.visitCode || 'Direct Dispense'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{log.dispensedBy?.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {new Date(log.dispensedAt).toLocaleDateString()} {new Date(log.dispensedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Add Stock */}
      {showAddStockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>Add Medication to Formulary</h3>
            <form onSubmit={handleCreateStock}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg"
                  value={stockForm.drugName}
                  onChange={(e) => setStockForm({ ...stockForm, drugName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Unit</label>
                  <input
                    type="text"
                    value={stockForm.unit}
                    onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Min Reorder Level</label>
                  <input
                    type="number"
                    value={stockForm.minStock}
                    onChange={(e) => setStockForm({ ...stockForm, minStock: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Dispensary Location</label>
                <input
                  type="text"
                  value={stockForm.location}
                  onChange={(e) => setStockForm({ ...stockForm, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  {processing ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Receive Batch */}
      {showAddBatchModal && selectedStockForBatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Receive Batch — {selectedStockForBatch.drugName}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>Add incoming supplier delivery with lot/batch tracking.</p>

            <form onSubmit={handleAddBatch}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Batch Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-2026-X9"
                  value={batchForm.batchNumber}
                  onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  {processing ? 'Saving...' : 'Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dispense FEFO */}
      {showDispenseModal && dispenseStock && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Dispense Medication — {dispenseStock.drugName}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
              Total Stock Available: <strong>{dispenseStock.totalQty} {dispenseStock.unit}</strong>. FEFO will allocate from earliest expiring batch automatically.
            </p>

            <form onSubmit={handleDispenseFefo}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Quantity to Dispense</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={dispenseStock.totalQty}
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Dispensing Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dispensed directly for acute mild pain"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{ padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  {processing ? 'Dispensing...' : 'Confirm Dispense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
