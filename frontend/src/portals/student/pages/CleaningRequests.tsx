import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import TabbedPage, { type TabItem } from '../../../components/portals/shared/TabbedPage';

interface LeadershipAssignment {
  id: string;
  leadershipRole: string;
  hostelId: string | null;
  hostel?: { id: string; name: string };
  term: string;
  academicYear: string;
}

interface AllowedItem {
  id: string;
  itemSku: string;
  itemName: string;
  category: string;
}

interface StudentRequest {
  id: string;
  refNumber: string;
  title: string;
  description?: string;
  status: string;
  displayStatus?: string;
  items: any;
  rejectionReason?: string;
  hostelReq?: { name: string };
  createdAt: string;
}

interface StockRecord {
  id: string;
  date: string;
  quantity: number;
  product?: { name: string; unit: string; quantity: number };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_HOD_BOARDING: 'Waiting for Matron',
  PENDING_ADMIN: 'Waiting for Admin',
  PENDING_BURSAR: 'Waiting for Bursar',
  ISSUED: 'Ready for collection ✓',
  RECEIVED: 'Received ✓',
  REJECTED: 'Declined',
};

export default function CleaningRequests() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [assignment, setAssignment] = useState<LeadershipAssignment | null>(null);
  
  const [allowedItems, setAllowedItems] = useState<AllowedItem[]>([]);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  
  const [hostels, setHostels] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedItems, setSelectedItems] = useState<{sku: string, name: string, quantity: number, reason: string}[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');
  const [generalReason, setGeneralReason] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: leadershipData } = await api.get('/api/student-requests/leadership-check');
      if (leadershipData.isLeader) {
        setIsLeader(true);
        setAssignment(leadershipData.assignment);
        if (leadershipData.assignment?.hostelId) {
          setSelectedHostelId(leadershipData.assignment.hostelId);
        }
        
        await Promise.all([
          fetchAllowedItems(),
          fetchRequests(),
          fetchHostels()
        ]);

        if (leadershipData.assignment?.leadershipRole === 'HOSTEL_PREFECT') {
          fetchHostelStock();
        }
      } else {
        setIsLeader(false);
      }
    } catch (error) {
      console.error(error);
      setIsLeader(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowedItems = async () => {
    try {
      const { data } = await api.get('/api/student-requests/allowed-items');
      setAllowedItems(data || []);
    } catch (e) {
      showToast('Failed to load allowed items', 'error');
    }
  };

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/api/student-requests');
      setRequests(data || []);
    } catch (e) {
      showToast('Failed to load requests', 'error');
    }
  };
  
  const fetchHostels = async () => {
    try {
      const { data } = await api.get('/api/schools/settings');
      // If hostels endpoint is separate:
      const hRes = await api.get('/api/hostels').catch(() => null);
      if (hRes && Array.isArray(hRes.data)) {
        setHostels(hRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHostelStock = async () => {
    try {
      const { data } = await api.get('/api/student-requests/hostel-stock');
      setStockRecords(data?.records || []);
    } catch (e) {
      console.error('Failed to load hostel stock', e);
    }
  };

  const addItemToRequest = (sku: string) => {
    const item = allowedItems.find(i => i.itemSku === sku);
    if (!item) return;
    
    if (selectedItems.find(i => i.sku === sku)) {
      showToast('Item already added to request list', 'info');
      return;
    }
    
    setSelectedItems([...selectedItems, { sku: item.itemSku, name: item.itemName, quantity: 1, reason: '' }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      showToast('Please add at least one item from the approved list', 'error');
      return;
    }
    if (!selectedHostelId) {
      showToast('Please select the hostel for this supplies request', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/api/student-requests', {
        hostelId: selectedHostelId,
        items: selectedItems,
        reason: generalReason
      });
      showToast('Cleaning supplies request submitted successfully! Awaiting Matron approval.', 'success');
      setSelectedItems([]);
      setGeneralReason('');
      fetchRequests();
    } catch (e: any) {
      showToast(e.response?.data?.error || e.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceived = async (id: string) => {
    try {
      await api.patch(`/api/student-requests/${id}/confirm-received`);
      showToast('Supplies receipt confirmed successfully!', 'success');
      fetchRequests();
      if (assignment?.leadershipRole === 'HOSTEL_PREFECT') {
        fetchHostelStock();
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to confirm receipt', 'error');
    }
  };

  if (loading) {
    return (
      <div className="portal-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
        <p>Loading leader credentials...</p>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="portal-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="portal-card" style={{ maxWidth: 500, margin: '0 auto', padding: '2.5rem' }}>
          <i className="fas fa-lock" style={{ fontSize: '3rem', color: '#e53e3e', marginBottom: 20 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ color: '#718096', fontSize: '0.95rem' }}>
            The Cleaning Supplies Request portal is reserved exclusively for appointed student leaders (Prefects, SRC Members, and Boarding Representatives) with an active assignment for the current term.
          </p>
        </div>
      </div>
    );
  }

  const isHostelPrefect = assignment?.leadershipRole === 'HOSTEL_PREFECT';

  const formTab = (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Request Hostel Cleaning Supplies</h2>
        <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>
          Submit required sanitation items. Requests route to your hostel's Matron, then School Admin, and are issued by the Stores department.
        </p>
      </div>
      <div className="portal-card-body">
        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label" style={{ fontWeight: 600 }}>Hostel</label>
              <select 
                className="portal-input" 
                value={selectedHostelId} 
                onChange={e => setSelectedHostelId(e.target.value)}
                disabled={isHostelPrefect}
                required
              >
                <option value="">-- Choose Hostel --</option>
                {assignment?.hostel && (
                  <option value={assignment.hostel.id}>{assignment.hostel.name} (Assigned)</option>
                )}
                {hostels.filter(h => h.id !== assignment?.hostel?.id).map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              {isHostelPrefect && (
                <small className="text-muted d-block mt-1">
                  Locked to your assigned hostel: <strong>{assignment?.hostel?.name || 'Your Hostel'}</strong>
                </small>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label" style={{ fontWeight: 600 }}>Add Supply Item</label>
              <select 
                className="portal-input"
                onChange={e => {
                  if (e.target.value) addItemToRequest(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">-- Choose item from approved catalog --</option>
                {allowedItems.map(item => (
                  <option key={item.itemSku} value={item.itemSku}>
                    {item.itemName} ({item.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedItems.length > 0 ? (
            <div className="table-responsive mb-4">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: '130px' }}>Quantity (1-20)</th>
                    <th>Item Note / Reason</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, idx) => (
                    <tr key={item.sku}>
                      <td>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>SKU: {item.sku}</div>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="portal-input" 
                          min="1" 
                          max="20" 
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="portal-input" 
                          value={item.reason}
                          onChange={e => updateItem(idx, 'reason', e.target.value)}
                          placeholder="e.g. Ground floor bathrooms"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" className="portal-btn-danger btn-sm" onClick={() => removeItem(idx)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem', background: '#f7fafc', borderRadius: 8, textAlign: 'center', marginBottom: '1.5rem' }}>
              <i className="fas fa-shopping-basket fa-2x text-muted mb-2"></i>
              <p className="text-muted mb-0">No items selected yet. Choose an item from the dropdown above to add it to your request.</p>
            </div>
          )}

          <div className="form-group mb-4">
            <label className="form-label" style={{ fontWeight: 600 }}>Overall Justification / Reason</label>
            <textarea
              className="portal-input"
              rows={3}
              value={generalReason}
              onChange={e => setGeneralReason(e.target.value)}
              placeholder="Explain the necessity (e.g. Weekly deep cleaning preparation before weekend inspection)..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button 
              type="submit" 
              className="portal-btn-primary" 
              disabled={submitting || selectedItems.length === 0}
              style={{ minWidth: 160 }}
            >
              {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Submitting...</> : <><i className="fas fa-paper-plane mr-2"></i> Submit Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const historyTab = (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Supplies Requests</h2>
        <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>Track real-time approval stages from Matron and Admin to collection at the Store.</p>
      </div>
      <div className="portal-card-body p-0">
        <div className="table-responsive">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Hostel</th>
                <th>Items Requested</th>
                <th>Current Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const isIssued = req.status === 'ISSUED';
                const isRejected = req.status === 'REJECTED';
                const isReceived = req.status === 'RECEIVED';
                const statusBadgeClass = isRejected ? 'badge-danger' : isReceived ? 'badge-success' : isIssued ? 'badge-info' : 'badge-warning';

                return (
                  <tr key={req.id}>
                    <td>
                      <strong>{req.refNumber}</strong>
                    </td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>{req.hostelReq?.name || 'Assigned Hostel'}</td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.9rem' }}>
                        {Array.isArray(req.items) && req.items.map((i: any, idx: number) => (
                          <li key={idx}><strong>{i.quantity}x</strong> {i.name || i.itemName}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        {STATUS_LABELS[req.status] || req.displayStatus || req.status}
                      </span>
                      {req.rejectionReason && (
                        <div style={{ fontSize: '0.8rem', color: '#e53e3e', marginTop: 4 }}>
                          <i className="fas fa-info-circle mr-1"></i> {req.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isIssued && (
                        <button 
                          className="portal-btn-success btn-sm" 
                          onClick={() => handleConfirmReceived(req.id)}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <i className="fas fa-check-circle mr-1"></i> Confirm Received
                        </button>
                      )}
                      {isReceived && (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          <i className="fas fa-check-double text-success mr-1"></i> Collected
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>
                    <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                    No supplies requests submitted yet. Use the "Submit Request" tab above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const stockTab = (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hostel Inventory & Supplies On Hand</h2>
        <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>
          Read-only log of cleaning and maintenance supplies dispatched to <strong>{assignment?.hostel?.name || 'Your Hostel'}</strong>.
        </p>
      </div>
      <div className="portal-card-body p-0">
        <div className="table-responsive">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Dispatched Date</th>
                <th>Supply Item</th>
                <th>Dispatched Quantity</th>
                <th>Current Central Stock</th>
              </tr>
            </thead>
            <tbody>
              {stockRecords.map(rec => (
                <tr key={rec.id}>
                  <td>{new Date(rec.date).toLocaleDateString()}</td>
                  <td><strong>{rec.product?.name || 'Supply Item'}</strong></td>
                  <td>{rec.quantity} {rec.product?.unit || 'Units'}</td>
                  <td>{rec.product?.quantity ?? '-'} {rec.product?.unit || ''}</td>
                </tr>
              ))}
              {stockRecords.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>
                    <i className="fas fa-box-open fa-2x mb-2 d-block"></i>
                    No central store dispatches logged for this hostel yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'new', label: 'Request Supplies', icon: 'fas fa-plus-circle', content: formTab },
    { id: 'history', label: 'My Requests', icon: 'fas fa-clipboard-list', badge: requests.length, content: historyTab },
  ];

  if (isHostelPrefect) {
    tabs.push({ id: 'stock', label: 'Hostel Stock', icon: 'fas fa-boxes', content: stockTab });
  }

  return (
    <TabbedPage
      title="Student Leader Supplies"
      subtitle={`Active leadership: ${assignment?.leadershipRole?.replace('_', ' ') || 'Leader'} ${assignment?.hostel?.name ? `(${assignment.hostel.name})` : ''}`}
      tabs={tabs}
      defaultTab="new"
    />
  );
}
