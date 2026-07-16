import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { StockTab, SuppliersTab } from '../../../portals/shared/pages/UniformsPage';
import type { Supplier, UniformItem, StockOrder } from '../../../portals/shared/pages/UniformsPage';
import { useToast } from '../../../context/ToastContext';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface Props {
  mode: 'RAISE_ONLY' | 'MANAGE' | 'FULL';
}

const ProcurementUI: React.FC<Props> = ({ mode }) => {
  const { t } = useTerminology();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('requisitions');
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', estimatedAmount: '', department: '' });

  // Uniform stock & suppliers state
  const [items, setItems] = useState<UniformItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [uniformsLoading, setUniformsLoading] = useState(false);

  const canManageUniforms = user?.role === 'SCHOOL_ADMIN' || user?.role === 'BURSAR';

  useEffect(() => {
    fetchData();
    if (canManageUniforms) {
      fetchUniformsData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/procurement/requisitions');
      setRequisitions(res.data);
    } catch (err) {
      console.error('Failed to fetch requisitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniformsData = async () => {
    setUniformsLoading(true);
    try {
      const [itemsRes, suppsRes, ordersRes] = await Promise.all([
        api.get("/api/uniforms/items"),
        api.get("/api/uniforms/suppliers"),
        api.get("/api/uniforms/stock-orders")
      ]);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setSuppliers(Array.isArray(suppsRes.data) ? suppsRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } catch (error) {
      console.error("Failed to fetch uniforms data in procurement page", error);
    } finally {
      setUniformsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/procurement/requisitions', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', estimatedAmount: '', department: user?.dept?.name || 'Central Administration' });
      fetchData();
    } catch (err) {
      alert('Failed to submit requisition');
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.patch(`/api/procurement/requisitions/${id}/approve`, { action });
      setSelectedReq(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="portal-badge success">Approved (Final)</span>;
      case 'REJECTED': return <span className="portal-badge danger">Rejected</span>;
      case 'PENDING': return <span className="portal-badge warning">Waiting for HOD</span>;
      case 'HOD_APPROVED': return <span className="portal-badge info">Waiting for Bursar</span>;
      case 'BURSAR_APPROVED': return <span className="portal-badge info">Waiting for Admin</span>;
      default: return <span className="portal-badge">{status}</span>;
    }
  };

  const canApprove = (req: any) => {
    if (user?.role === 'SCHOOL_ADMIN') return true;
    if (req.status === 'PENDING' && user?.secondaryRoles?.includes('HOD')) return true;
    if (req.status === 'HOD_APPROVED' && user?.role === 'BURSAR') return true;
    if (req.status === 'BURSAR_APPROVED' && user?.role === 'SCHOOL_ADMIN') return true;
    return false;
  };

  const tabs = [
    { id: "requisitions", label: "Requisitions", icon: "fa-clipboard-list" },
    { id: "stock", label: "Uniform Stock Orders", icon: "fa-truck-loading" },
    { id: "suppliers", label: "Supplier Directory", icon: "fa-address-book" }
  ];

  const renderApprovalProgress = (status: string) => {
    if (status === 'REJECTED') {
      return (
        <span className="portal-badge danger" style={{ fontSize: '0.75rem' }}>
          <i className="fas fa-times-circle mr-1"></i> Rejected
        </span>
      );
    }

    const isHodDone = ['HOD_APPROVED', 'BURSAR_APPROVED', 'APPROVED'].includes(status);
    const isBursarDone = ['BURSAR_APPROVED', 'APPROVED'].includes(status);
    const isAdminDone = status === 'APPROVED';

    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span 
          style={{ 
            fontSize: '0.7rem', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            background: isHodDone ? '#d1fae5' : '#f1f5f9', 
            color: isHodDone ? '#065f46' : '#64748b',
            border: `1px solid ${isHodDone ? '#a7f3d0' : '#cbd5e1'}`,
            display: 'inline-flex',
            alignItems: 'center'
          }}
          title={isHodDone ? "HOD Approved" : "Awaiting HOD Approval"}
        >
          <i className={`fas ${isHodDone ? 'fa-check-circle' : 'fa-circle-notch fa-spin'} mr-1`}></i> HOD
        </span>
        <span 
          style={{ 
            fontSize: '0.7rem', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            background: isBursarDone ? '#d1fae5' : '#f1f5f9', 
            color: isBursarDone ? '#065f46' : '#64748b',
            border: `1px solid ${isBursarDone ? '#a7f3d0' : '#cbd5e1'}`,
            display: 'inline-flex',
            alignItems: 'center'
          }}
          title={isBursarDone ? "Bursar Approved" : (isHodDone ? "Awaiting Bursar Approval" : "Pending HOD")}
        >
          <i className={`fas ${isBursarDone ? 'fa-check-circle' : (isHodDone ? 'fa-circle-notch fa-spin' : 'fa-clock')} mr-1`}></i> Bursar
        </span>
        <span 
          style={{ 
            fontSize: '0.7rem', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            background: isAdminDone ? '#d1fae5' : '#f1f5f9', 
            color: isAdminDone ? '#065f46' : '#64748b',
            border: `1px solid ${isAdminDone ? '#a7f3d0' : '#cbd5e1'}`,
            display: 'inline-flex',
            alignItems: 'center'
          }}
          title={isAdminDone ? "Admin Approved" : (isBursarDone ? "Awaiting Admin Approval" : "Pending Prior Steps")}
        >
          <i className={`fas ${isAdminDone ? 'fa-check-circle' : (isBursarDone ? 'fa-circle-notch fa-spin' : 'fa-clock')} mr-1`}></i> Admin
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {canManageUniforms && (
        <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '16px', border: '1px solid #f1f5f9', width: 'fit-content' }} className="no-print">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`portal-btn-${activeTab === tab.id ? 'primary' : 'ghost'}`}
              style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 900, fontSize: '0.85rem' }}
            >
              <i className={`fas ${tab.icon} mr-2`}></i>{tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'requisitions' && (
        <>
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0 }}>
                  <i className="fas fa-shopping-cart" style={{ marginRight: 8, color: '#d69e2e' }}></i>
                  Procurement & Requisitions
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
                <button 
                  onClick={() => {
                    const headers = ['Ref #', 'Title', 'Requester', 'Department', 'Est. Budget', 'Status'];
                    const rows = requisitions.map(r => [
                      r.refNumber,
                      r.title,
                      r.requester?.name || 'N/A',
                      r.department,
                      `$${r.estimatedAmount.toLocaleString()}`,
                      r.status
                    ]);
                    exportToCSV('Procurement_Requisitions', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Export to CSV"
                >
                  <i className="fas fa-file-csv mr-1"></i> CSV
                </button>
                <button 
                  onClick={() => {
                    const headers = ['Ref #', 'Title', 'Requester', 'Department', 'Est. Budget', 'Status'];
                    const rows = requisitions.map(r => [
                      r.refNumber,
                      r.title,
                      r.requester?.name || 'N/A',
                      r.department,
                      `$${r.estimatedAmount.toLocaleString()}`,
                      r.status
                    ]);
                    exportToWord('Procurement_Requisitions', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Export to Word"
                >
                  <i className="fas fa-file-word mr-1"></i> Word
                </button>
                <button 
                  onClick={() => window.print()}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Print / PDF"
                >
                  <i className="fas fa-print mr-1"></i> Print/PDF
                </button>
                {mode !== 'MANAGE' && (
                  <button className="portal-btn-primary" onClick={() => {
                    setFormData({
                      title: '',
                      description: '',
                      estimatedAmount: '',
                      department: user?.dept?.name || 'Central Administration'
                    });
                    setShowModal(true);
                  }} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Raise Requisition
                  </button>
                )}
              </div>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Title / Requestor</th>
                      <th>Department</th>
                      <th>Est. Budget</th>
                      <th>Approvals Flow</th>
                      <th>Overall Status</th>
                      <th className="no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#718096' }}>No requisitions found.</td></tr>
                    ) : (
                      requisitions.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2b6cb0' }}>{r.refNumber}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>By {r.requester?.name}</div>
                          </td>
                          <td>{r.department}</td>
                          <td style={{ fontWeight: 700 }}>${r.estimatedAmount.toLocaleString()}</td>
                          <td>{renderApprovalProgress(r.status)}</td>
                          <td>{getStatusBadge(r.status)}</td>
                          <td className="no-print">
                            {mode !== 'RAISE_ONLY' ? (
                              <button className="portal-link-btn" onClick={() => setSelectedReq(r)}>Review</button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>View Only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {showModal && (
            <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 500 }}>
                <div className="portal-modal-header">
                  <h2>Raise New Requisition</h2>
                  <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem' }} onClick={() => setShowModal(false)}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="portal-modal-body">
                    <div className="portal-form-group">
                      <label>Title</label>
                      <input type="text" className="portal-input" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="portal-form-group">
                      <label>Department</label>
                      <input type="text" className="portal-input" required disabled value={formData.department} />
                    </div>
                    <div className="portal-form-group">
                      <label>Estimated Total ($)</label>
                      <input type="number" className="portal-input" required value={formData.estimatedAmount} onChange={e => setFormData({...formData, estimatedAmount: e.target.value})} />
                    </div>
                    <div className="portal-form-group">
                      <label>Description / Usage</label>
                      <textarea className="portal-input" style={{ height: 100 }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                  </div>
                  <div className="portal-modal-footer">
                    <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="portal-btn-primary">Submit for Approval</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {selectedReq && (
            <div className="portal-modal-overlay">
              <div className="portal-modal-card" style={{ maxWidth: 500 }}>
                <div className="portal-modal-header">
                  <h2>Requisition Review</h2>
                  <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem' }} onClick={() => setSelectedReq(null)}>&times;</button>
                </div>
                <div className="portal-modal-body">
                  <div style={{ marginBottom: 20 }}>
                    <span className="portal-label">Request</span>
                    <h3 style={{ margin: '4px 0 0' }}>{selectedReq.title}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{selectedReq.description}</p>
                  </div>
                  <div className="portal-grid-2" style={{ gap: 20, marginBottom: 20 }}>
                    <div>
                      <span className="portal-label">Budget</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>${selectedReq.estimatedAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="portal-label">Status</span>
                      <div>{getStatusBadge(selectedReq.status)}</div>
                    </div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                     <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Approval Timeline</p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas fa-check-circle ${selectedReq.hod ? 'text-success' : 'text-muted'}`} style={{ color: selectedReq.hod ? '#38a169' : '#cbd5e1' }}></i>
                            <div style={{ fontSize: '0.85rem' }}>
                                <strong>HOD Approval:</strong> {selectedReq.hod?.name || <span style={{ color: '#94a3b8' }}>Pending</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas fa-check-circle ${selectedReq.bursar ? 'text-success' : 'text-muted'}`} style={{ color: selectedReq.bursar ? '#38a169' : '#cbd5e1' }}></i>
                            <div style={{ fontSize: '0.85rem' }}>
                                <strong>Financial Review (Bursar):</strong> {selectedReq.bursar?.name || <span style={{ color: '#94a3b8' }}>Pending</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas fa-check-circle ${selectedReq.admin ? 'text-success' : 'text-muted'}`} style={{ color: selectedReq.admin ? '#38a169' : '#cbd5e1' }}></i>
                            <div style={{ fontSize: '0.85rem' }}>
                                <strong>Final Admin Approval:</strong> {selectedReq.admin?.name || <span style={{ color: '#94a3b8' }}>Pending</span>}
                            </div>
                        </div>
                     </div>
                  </div>
                </div>
                <div className="portal-modal-footer">
                  <button className="portal-btn-danger" onClick={() => handleAction(selectedReq.id, 'REJECT')}>Reject Request</button>
                  {canApprove(selectedReq) ? (
                    <button className="portal-btn-primary" onClick={() => handleAction(selectedReq.id, 'APPROVE')}>Approve Stage</button>
                  ) : (
                    <button className="portal-btn-neutral" disabled>Approval Not Possible</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'stock' && canManageUniforms && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="portal-page-header" style={{ margin: 0, paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Uniform Stock Management</h2>
              <p>Authorize new stock orders and monitor apparel procurement history.</p>
            </div>
            <button 
              onClick={() => setShowRestockModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '12px 32px', fontWeight: 900, background: '#059669' }}
            >
              <i className="fas fa-truck-loading mr-2"></i>Authorize Restock
            </button>
          </div>
          {uniformsLoading ? (
            <div className="portal-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
              <p style={{ fontWeight: 900, color: '#64748b' }}>Loading stock order registries...</p>
            </div>
          ) : (
            <StockTab 
              items={items} 
              suppliers={suppliers} 
              orders={orders} 
              onUpdate={fetchUniformsData} 
              canManage={true} 
              showModal={showRestockModal} 
              setShowModal={setShowRestockModal} 
            />
          )}
        </div>
      )}

      {activeTab === 'suppliers' && canManageUniforms && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {uniformsLoading ? (
            <div className="portal-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
              <p style={{ fontWeight: 900, color: '#64748b' }}>Loading supplier registries...</p>
            </div>
          ) : (
            <SuppliersTab suppliers={suppliers} onUpdate={fetchUniformsData} canManage={true} />
          )}
        </div>
      )}
    </div>
  );
};

export default ProcurementUI;
