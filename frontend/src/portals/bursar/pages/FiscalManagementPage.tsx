import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import FiscalReceiptModal, { type FiscalReceiptData } from '../../../components/shared/FiscalReceiptModal';

interface FiscalDevice {
  id: string;
  serialNo: string;
  deviceModel: string;
  location: string;
  apiUrl: string;
  isActive: boolean;
  createdAt: string;
}

interface FiscalInvoice {
  id: string;
  receiptNo: string;
  fiscalCode?: string;
  fiscalDayNo?: number;
  qrCode?: string;
  status: string;
  amount: number;
  vatAmount: number;
  currency: string;
  paymentMethod: string;
  isCreditNote: boolean;
  createdAt: string;
  device?: { serialNo: string; location: string };
  payload?: any;
}

export default function FiscalManagementPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [devices, setDevices] = useState<FiscalDevice[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);

  // Register device modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    serialNo: '',
    deviceModel: 'VIRTUAL_FDMS_V1',
    location: 'Tuckshop Till 1',
    apiUrl: 'https://fdms.zimra.co.zw/api/v1/receipts',
    activationKey: '',
    apiToken: ''
  });

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<FiscalReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await api.get('/fiscal/dashboard');
        setDashboardData(res.data);
      } else if (activeTab === 'devices') {
        const res = await api.get('/fiscal/devices');
        setDevices(res.data);
      } else if (activeTab === 'reports') {
        const res = await api.get('/fiscal/reports');
        setReportsData(res.data);
      }
    } catch (err: any) {
      console.error('Fetch fiscal data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fiscal/devices', newDevice);
      setIsRegisterOpen(false);
      setNewDevice({
        serialNo: '',
        deviceModel: 'VIRTUAL_FDMS_V1',
        location: '',
        apiUrl: 'https://fdms.zimra.co.zw/api/v1/receipts',
        activationKey: '',
        apiToken: ''
      });
      fetchData();
      showToast('Fiscal device registered successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to register device', 'error');
    }
  };

  const handleRetry = async (invoiceId: string) => {
    try {
      await api.post(`/fiscal/retry/${invoiceId}`);
      showToast('Invoice transmission retried', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to retry invoice', 'error');
    }
  };

  const openReceipt = (inv: FiscalInvoice) => {
    setSelectedReceipt({
      schoolName: 'ACADEX Boarding School',
      vatNumber: '100234567',
      receiptNo: inv.receiptNo,
      fiscalCode: inv.fiscalCode,
      fiscalDayNo: inv.fiscalDayNo,
      qrCode: inv.qrCode,
      deviceSerial: inv.device?.serialNo || 'VFD-01',
      date: new Date(inv.createdAt).toLocaleString(),
      paymentMethod: inv.paymentMethod || 'CASH',
      currency: inv.currency || 'USD',
      items: inv.payload?.lines?.map((l: any) => ({
        name: l.itemName || 'Sale Item',
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice || l.totalAmount,
        totalAmount: l.totalAmount,
        taxCode: l.taxCode || 'A'
      })) || [
        {
          name: inv.isCreditNote ? 'Credit Note Reversal' : 'Commercial Sale',
          quantity: 1,
          unitPrice: inv.amount,
          totalAmount: inv.amount,
          taxCode: 'A'
        }
      ],
      grossTotal: inv.amount,
      vatTotal: inv.vatAmount,
      isCreditNote: inv.isCreditNote
    });
    setIsReceiptOpen(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-shield-alt" style={{ color: '#0284c7', marginRight: 10 }} />
              ZIMRA Fiscalisation & FDMS Compliance
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
              Real-time Virtual Fiscal Device (VFD) dispatch for Tuckshop, Uniforms, Bookstore, and Commercial services.
            </p>
          </div>
          {activeTab === 'devices' && (
            <button
              onClick={() => setIsRegisterOpen(true)}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-plus" />
              Register Fiscal Device
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { id: 'dashboard', label: 'Fiscal Dashboard', icon: 'fa-chart-pie' },
          { id: 'devices', label: 'Registered Devices', icon: 'fa-microchip' },
          { id: 'reports', label: 'Z-Reports & Audit', icon: 'fa-file-invoice-dollar' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#0284c7' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #0284c7' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.95rem'
            }}
          >
            <i className={`fas ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading data...</div>}

      {/* TAB 1: DASHBOARD */}
      {!loading && activeTab === 'dashboard' && dashboardData && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Today's Fiscal Sales</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                ${dashboardData.todaySales?.toFixed(2) || '0.00'}
              </div>
              <div style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: 4 }}>
                <i className="fas fa-check-circle" /> {dashboardData.todayCount || 0} fiscal receipts emitted
              </div>
            </div>

            <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>VAT Collected (15%)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: 6 }}>
                ${dashboardData.todayVat?.toFixed(2) || '0.00'}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Inclusive 15/115 standard</div>
            </div>

            <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Offline / Pending Queue</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: dashboardData.pendingQueue > 0 ? '#ea580c' : '#16a34a', marginTop: 6 }}>
                {dashboardData.pendingQueue || 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Auto-retries within 48 hours</div>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '1.05rem' }}>
              Recent Fiscal Invoices & Live Transmissions
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Receipt #</th>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px' }}>Device</th>
                  <th style={{ padding: '12px 16px' }}>Payment</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>VAT (15%)</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentInvoices?.map((inv: FiscalInvoice) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inv.receiptNo}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{inv.device?.serialNo || 'VFD'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0284c7' }}>
                      ${inv.vatAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: inv.status === 'fiscalised' ? '#dcfce7' : '#fef3c7',
                          color: inv.status === 'fiscalised' ? '#166534' : '#b45309'
                        }}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => openReceipt(inv)}
                        style={{
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          marginRight: 6,
                          fontSize: '0.8rem'
                        }}
                      >
                        <i className="fas fa-print" /> Receipt
                      </button>
                      {inv.status !== 'fiscalised' && (
                        <button
                          onClick={() => handleRetry(inv.id)}
                          style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          <i className="fas fa-sync" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!dashboardData.recentInvoices || dashboardData.recentInvoices.length === 0) && (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                      No fiscal sales recorded today yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED DEVICES */}
      {!loading && activeTab === 'devices' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {devices.map(dev => (
            <div
              key={dev.id}
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{dev.serialNo}</span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: dev.isActive ? '#dcfce7' : '#fee2e2',
                    color: dev.isActive ? '#166534' : '#991b1b'
                  }}
                >
                  {dev.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div style={{ marginTop: 12, color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <div><strong>Model:</strong> {dev.deviceModel}</div>
                <div><strong>Location:</strong> {dev.location}</div>
                <div><strong>FDMS Endpoint:</strong> {dev.apiUrl}</div>
                <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 8 }}>
                  <i className="fas fa-lock" /> Activation key secured in Server Vault
                </div>
              </div>
            </div>
          ))}
          {devices.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-microchip" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: 10 }} />
              <div style={{ fontWeight: 600, color: '#475569' }}>No fiscal devices registered yet</div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Click "Register Fiscal Device" to connect a VFD to this tenant.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Z-REPORTS & AUDIT */}
      {!loading && activeTab === 'reports' && reportsData && (
        <div>
          <div style={{ background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>ZIMRA Daily Summary Report</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Taxable Supplies:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>${reportsData.grandTotal?.toFixed(2)}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Output VAT (15%):</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>${reportsData.grandVat?.toFixed(2)}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Receipts:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{reportsData.totalInvoices}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Device Modal */}
      {isRegisterOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px 0', fontWeight: 700 }}>Register ZIMRA Fiscal Device</h3>
            <form onSubmit={handleRegisterDevice} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Device Serial No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REV-00123"
                  value={newDevice.serialNo}
                  onChange={e => setNewDevice({ ...newDevice, serialNo: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Location / Till *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuckshop Till 1, Uniform Store"
                  value={newDevice.location}
                  onChange={e => setNewDevice({ ...newDevice, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Device Model</label>
                <input
                  type="text"
                  value={newDevice.deviceModel}
                  onChange={e => setNewDevice({ ...newDevice, deviceModel: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Activation Key (Stored in Server Vault) *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter ZIMRA activation key"
                  value={newDevice.activationKey}
                  onChange={e => setNewDevice({ ...newDevice, activationKey: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600 }}
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fiscal Receipt Modal */}
      <FiscalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={selectedReceipt}
      />
    </div>
  );
}
