import { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface Asset {
  id: string;
  assetNumber?: string;
  name: string;
  category: string;
  serialNumber?: string;
  location?: string;
  department?: string;
  condition: string;
  status: string;
  quantity?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  supplierName?: string;
  invoiceNumber?: string;
  depreciationRate?: number;
  warrantyExpiry?: string;
  photoUrl?: string;
  custodian?: { id: string; name: string; email?: string; role?: string };
  registeredBy?: { id: string; name: string; role?: string };
  approvalStatus?: string;
  hodApprovedAt?: string;
  bursarApprovedAt?: string;
  adminApprovedAt?: string;
  rejectionReason?: string;
  incidents?: any[];
  maintenance?: any[];
  nextMaintenance?: string;
}

export default function SharedAssetManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const isBursar = role === 'BURSAR';
  const isLibrarian = role === 'LIBRARIAN';
  const isTeacher = role === 'TEACHER';
  const isClinic = role === 'CLINIC';
  const isAncillary = role === 'ANCILLARY';
  const isFinancial = isAdmin || isBursar;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    name: '',
    category: 'Furniture',
    quantity: 1,
    location: '',
    department: isLibrarian ? 'Library' : isClinic ? 'Clinic' : isAncillary ? 'Ancillary' : 'General',
    condition: 'good',
    serialNumber: '',
    // Financial / Admin only fields
    supplierName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    invoiceNumber: '',
    depreciationRate: '10',
    warrantyExpiry: '',
    custodianId: ''
  });

  // Type-ahead Assigned To State
  const [custodianQuery, setCustodianQuery] = useState('');
  const [custodianSuggestions, setCustodianSuggestions] = useState<any[]>([]);
  const [isSearchingCustodian, setIsSearchingCustodian] = useState(false);
  const [selectedCustodianUser, setSelectedCustodianUser] = useState<any>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Damage form
  const [damageForm, setDamageForm] = useState({ details: '', issueType: 'DAMAGE' });

  // Transfer form
  const [transferForm, setTransferForm] = useState({ location: '', department: '', custodianId: '' });

  // Rejection form
  const [rejectionReason, setRejectionReason] = useState('');

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, [departmentFilter, statusFilter]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      let query = `?status=${statusFilter}`;
      if (isAdmin || isBursar) {
        query += `&department=${departmentFilter}`;
      }
      const res = await api.get(`/api/assets${query}`);
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Live Type-Ahead for Assigned To
  const handleCustodianSearchChange = (val: string) => {
    setCustodianQuery(val);
    setSelectedCustodianUser(null);
    setRegisterForm(prev => ({ ...prev, custodianId: '' }));

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length < 2) {
      setCustodianSuggestions([]);
      return;
    }

    setIsSearchingCustodian(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/assets/users-search?q=${encodeURIComponent(val)}`);
        setCustodianSuggestions(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setCustodianSuggestions([]);
      } finally {
        setIsSearchingCustodian(false);
      }
    }, 300);
  };

  const handleSelectCustodian = (userItem: any) => {
    setSelectedCustodianUser(userItem);
    setCustodianQuery(`${userItem.name} (${userItem.role})`);
    setRegisterForm(prev => ({ ...prev, custodianId: userItem.id }));
    setCustodianSuggestions([]);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.category) {
      showToast('Please fill in required fields (Name, Category)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: registerForm.name,
        category: registerForm.category,
        quantity: registerForm.quantity,
        location: registerForm.location,
        department: registerForm.department,
        condition: registerForm.condition,
        serialNumber: registerForm.serialNumber
      };

      if (isFinancial) {
        payload.supplierName = registerForm.supplierName;
        payload.purchaseDate = registerForm.purchaseDate;
        payload.purchasePrice = registerForm.purchasePrice;
        payload.invoiceNumber = registerForm.invoiceNumber;
        payload.depreciationRate = registerForm.depreciationRate;
        payload.warrantyExpiry = registerForm.warrantyExpiry;
        payload.custodianId = registerForm.custodianId;
      }

      const res = await api.post('/api/assets', payload);
      const isPending = res.data?.isPendingApproval;
      showToast(
        isPending
          ? 'Asset registration submitted for HOD & Bursar approval!'
          : 'Asset(s) registered successfully on active register!',
        'success'
      );

      setIsRegisterModalOpen(false);
      resetRegisterForm();
      fetchAssets();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to register asset', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRegisterForm = () => {
    setRegisterForm({
      name: '',
      category: 'Furniture',
      quantity: 1,
      location: '',
      department: isLibrarian ? 'Library' : isClinic ? 'Clinic' : isAncillary ? 'Ancillary' : 'General',
      condition: 'good',
      serialNumber: '',
      supplierName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      invoiceNumber: '',
      depreciationRate: '10',
      warrantyExpiry: '',
      custodianId: ''
    });
    setCustodianQuery('');
    setSelectedCustodianUser(null);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!isAdmin) {
      showToast('Only School Administrators have permission to delete assets', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete asset "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/assets/${id}`);
      showToast(`Asset "${name}" deleted from register`, 'success');
      fetchAssets();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete asset', 'error');
    }
  };

  const handleApproveHOD = async (id: string) => {
    try {
      const res = await api.post(`/api/assets/${id}/approve-hod`);
      showToast(res.data.message, 'success');
      fetchAssets();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'HOD Approval failed', 'error');
    }
  };

  const handleApproveBursar = async (id: string) => {
    try {
      const res = await api.post(`/api/assets/${id}/approve-bursar`);
      showToast(res.data.message, 'success');
      fetchAssets();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Bursar Approval failed', 'error');
    }
  };

  const handleApproveAdmin = async (id: string) => {
    try {
      const res = await api.post(`/api/assets/${id}/approve-admin`);
      showToast(res.data.message, 'success');
      fetchAssets();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Admin Approval failed', 'error');
    }
  };

  const handleRejectAsset = async () => {
    if (!selectedAsset) return;
    try {
      await api.post(`/api/assets/${selectedAsset.id}/reject`, { reason: rejectionReason });
      showToast('Asset registration rejected', 'success');
      setIsRejectModalOpen(false);
      setSelectedAsset(null);
      setRejectionReason('');
      fetchAssets();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to reject asset', 'error');
    }
  };

  const handleReportDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await api.post(`/api/assets/${selectedAsset.id}/report-damage`, damageForm);
      showToast('Fault / damage reported successfully. Condition updated.', 'success');
      setIsDamageModalOpen(false);
      setSelectedAsset(null);
      setDamageForm({ details: '', issueType: 'DAMAGE' });
      fetchAssets();
    } catch (err: any) {
      showToast('Failed to report damage', 'error');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await api.post(`/api/assets/${selectedAsset.id}/transfer`, transferForm);
      showToast('Asset transferred successfully', 'success');
      setIsTransferModalOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err: any) {
      showToast('Failed to transfer asset', 'error');
    }
  };

  const handleDisposeAsset = async (id: string, name: string) => {
    if (!window.confirm(`Mark asset "${name}" as officially Disposed?`)) return;
    try {
      await api.post(`/api/assets/${id}/dispose`, { notes: 'Disposed via Asset Register' });
      showToast(`Asset "${name}" marked as disposed`, 'success');
      fetchAssets();
    } catch (err: any) {
      showToast('Failed to dispose asset', 'error');
    }
  };

  // Filtered Assets by search
  const filteredAssets = assets.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.assetNumber && a.assetNumber.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.location && a.location.toLowerCase().includes(q)) ||
      (a.department && a.department.toLowerCase().includes(q)) ||
      (a.custodian?.name && a.custodian.name.toLowerCase().includes(q))
    );
  });

  // Calculate high-level stats
  const totalCount = assets.length;
  const activeCount = assets.filter(a => a.status === 'ACTIVE').length;
  const pendingCount = assets.filter(a => a.status === 'PENDING_APPROVAL').length;
  const damagedCount = assets.filter(a => a.condition === 'damaged' || a.status === 'DAMAGED').length;
  const totalValuation = isFinancial
    ? assets.reduce((sum, a) => sum + ((a.purchasePrice || 0) * (a.quantity || 1)), 0)
    : null;

  return (
    <div className="portal-container animate-in fade-in duration-300" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      
      {/* PAGE HEADER */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
              {isLibrarian ? 'Library Asset Management' : isClinic ? 'Clinic Equipment & Asset Register' : isAncillary ? 'Ancillary & Grounds Asset Register' : 'School-Wide Asset Management'}
            </h1>
            <span style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              ROLE: {role}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Unified institutional property ledger with bulk entry, type-ahead custodian assignment, and multi-tier approval.
          </p>
        </div>

        {/* Action Buttons based on Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Register Asset button - teachers cannot register directly per prompt */}
          {!isTeacher ? (
            <button
              onClick={() => { resetRegisterForm(); setIsRegisterModalOpen(true); }}
              className="portal-btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
              }}
            >
              <i className="fas fa-plus-circle"></i> Register Asset
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '8px 14px', borderRadius: 8 }}>
              <i className="fas fa-info-circle mr-1"></i> Asset Requests managed via HOD
            </span>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="portal-btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <i className="fas fa-clipboard-check mr-1 text-primary"></i> Audit Report
            </button>
          )}

          {isBursar && (
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="portal-btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <i className="fas fa-file-invoice-dollar mr-1 text-success"></i> Financial Report
            </button>
          )}

          <button
            onClick={fetchAssets}
            className="portal-btn-secondary"
            title="Refresh"
            style={{ padding: '10px 14px' }}
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Visible Assets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{totalCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>In current scope</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Units</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', margin: '4px 0' }}>{activeCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#15803d' }}>In service on campus</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Approvals</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>{pendingCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Awaiting HOD / Bursar / Admin</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Damaged / Faulty</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{damagedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Reported issues</div>
        </div>

        {isFinancial && (
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Valuation Sum</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              ${Number(totalValuation || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669' }}>Total purchase value</div>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <input
              type="text"
              placeholder="Search by Asset No, Name, Category, Location, Custodian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px 8px 36px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem'
              }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8', fontSize: '0.85rem' }}></i>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Department Filter (Only for Admin / Bursar who have full school visibility) */}
          {(isAdmin || isBursar) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Department:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="all">All Departments</option>
                <option value="Library">Library</option>
                <option value="Clinic">Clinic</option>
                <option value="Science">Science Department</option>
                <option value="Arts">Arts Department</option>
                <option value="Kitchen">Kitchen / Dining</option>
                <option value="Grounds">Grounds & Maintenance</option>
                <option value="IT">IT & Computer Lab</option>
                <option value="Administration">Administration</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="DAMAGED">Damaged / Faulty</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ASSET MANAGEMENT TABLE */}
      <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Asset No.</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Name & Category</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Location & Dept</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Condition</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Assigned To</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Value / Qty</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 12px' }}></div>
                    Loading asset ledger...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 8 }}><i className="fas fa-boxes"></i></div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#334155' }}>No assets found</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Try clearing your search query or registering a new asset.</div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isPending = asset.status === 'PENDING_APPROVAL';
                  return (
                    <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* 1. Asset No. */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          border: '1px solid #e2e8f0'
                        }}>
                          {asset.assetNumber || asset.id.slice(0, 10)}
                        </span>
                      </td>

                      {/* 2. Name & Category */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{asset.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: 6, marginTop: 2 }}>
                          <span>Cat: <strong>{asset.category}</strong></span>
                          {asset.serialNumber && <span>• SN: {asset.serialNumber}</span>}
                        </div>
                      </td>

                      {/* 3. Location & Department */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>
                          <i className="fas fa-map-marker-alt text-slate-400 mr-1"></i> {asset.location || 'Main Campus'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Dept: <strong>{asset.department || 'General'}</strong>
                        </div>
                      </td>

                      {/* 4. Condition */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          textTransform: 'capitalize',
                          background:
                            asset.condition === 'good' ? '#ecfdf5' :
                            asset.condition === 'fair' ? '#fefce8' :
                            asset.condition === 'damaged' ? '#fee2e2' : '#f1f5f9',
                          color:
                            asset.condition === 'good' ? '#065f46' :
                            asset.condition === 'fair' ? '#854d0e' :
                            asset.condition === 'damaged' ? '#991b1b' : '#475569'
                        }}>
                          ● {asset.condition}
                        </span>
                      </td>

                      {/* 5. Status */}
                      <td style={{ padding: '14px 18px' }}>
                        {isPending ? (
                          <div>
                            <span style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              fontWeight: 800
                            }}>
                              {asset.approvalStatus || 'PENDING APPROVAL'}
                            </span>
                          </div>
                        ) : (
                          <span style={{
                            background: asset.status === 'ACTIVE' ? '#eff6ff' : asset.status === 'DISPOSED' ? '#f1f5f9' : '#fee2e2',
                            color: asset.status === 'ACTIVE' ? '#1d4ed8' : asset.status === 'DISPOSED' ? '#64748b' : '#dc2626',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}>
                            {asset.status}
                          </span>
                        )}
                      </td>

                      {/* 6. Assigned To */}
                      <td style={{ padding: '14px 18px' }}>
                        {asset.custodian ? (
                          <div>
                            <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.85rem' }}>{asset.custodian.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{asset.custodian.role || 'Staff'}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* 7. Value / Quantity */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {isFinancial && asset.purchasePrice !== undefined && asset.purchasePrice !== null ? (
                          <div>
                            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.9rem' }}>
                              ${Number(asset.purchasePrice).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Qty: {asset.quantity || 1}</div>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 800, color: '#475569', fontSize: '0.85rem' }}>
                            Qty: {asset.quantity || 1}
                          </span>
                        )}
                      </td>

                      {/* 8. Role-based Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* Approval Actions for Pending Assets */}
                          {isPending ? (
                            <>
                              {/* HOD approval */}
                              {asset.approvalStatus === 'PENDING_HOD' && (
                                <button
                                  onClick={() => handleApproveHOD(asset.id)}
                                  style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Approve as Department HOD"
                                >
                                  HOD Approve
                                </button>
                              )}

                              {/* Bursar approval */}
                              {(isBursar || isAdmin) && asset.approvalStatus === 'PENDING_BURSAR_ADMIN' && !asset.bursarApprovedAt && (
                                <button
                                  onClick={() => handleApproveBursar(asset.id)}
                                  style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Approve as Bursar"
                                >
                                  Bursar Approve
                                </button>
                              )}

                              {/* Admin approval */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleApproveAdmin(asset.id)}
                                  style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Finalize & Activate (Admin)"
                                >
                                  Admin Approve
                                </button>
                              )}

                              {/* Reject button */}
                              {(isAdmin || isBursar) && (
                                <button
                                  onClick={() => { setSelectedAsset(asset); setIsRejectModalOpen(true); }}
                                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Reject Registration"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Damage / Fault Reporting (All roles) */}
                              <button
                                onClick={() => { setSelectedAsset(asset); setIsDamageModalOpen(true); }}
                                style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                title="Report Damage or Fault"
                              >
                                <i className="fas fa-exclamation-circle mr-1"></i> Report
                              </button>

                              {/* Transfer button (Admin, Bursar, Librarian) */}
                              {(isAdmin || isBursar || isLibrarian) && (
                                <button
                                  onClick={() => { setSelectedAsset(asset); setTransferForm({ location: asset.location || '', department: asset.department || '', custodianId: asset.custodian?.id || '' }); setIsTransferModalOpen(true); }}
                                  style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Transfer Asset"
                                >
                                  <i className="fas fa-exchange-alt"></i>
                                </button>
                              )}

                              {/* Dispose button (Admin / Bursar) */}
                              {(isAdmin || isBursar) && asset.status !== 'DISPOSED' && (
                                <button
                                  onClick={() => handleDisposeAsset(asset.id, asset.name)}
                                  style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Dispose Asset"
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              )}

                              {/* Delete button (Strictly ADMIN only!) */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                  style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                  title="Delete from Register (Admin Only)"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER ASSET (WITH BULK ENTRY & TYPE-AHEAD ASSIGNED TO)       */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 720,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Register Asset</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {isFinancial ? 'Admin/Bursar Direct Registration' : 'Department Registration (Subject to HOD & Bursar Approval)'}
                </p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ padding: 24 }}>
              {/* SECTION A: STANDARD FIELDS (FILLED BY ALL ROLES) */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. General Asset Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Asset Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Student Chairs, Microscope, Barcode Scanner, Clinic Bed"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Category <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={registerForm.category}
                      onChange={(e) => setRegisterForm({ ...registerForm, category: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="Furniture">Furniture (Chairs, Desks, Shelves)</option>
                      <option value="Electronics">Electronics (Laptops, Printers, Scanners)</option>
                      <option value="Lab Equipment">Lab Equipment (Microscopes, Beakers)</option>
                      <option value="Medical">Medical (Clinic Beds, Vitals Monitors)</option>
                      <option value="Books / Media">Books / Media (Textbooks, Reference)</option>
                      <option value="Vehicles">Vehicles & Transport</option>
                      <option value="Maintenance Tools">Maintenance Tools & Machinery</option>
                      <option value="Stationery">Stationery & General Supplies</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Entry Quantity Support */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Quantity (Bulk Entry Support) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={registerForm.quantity}
                      onChange={(e) => setRegisterForm({ ...registerForm, quantity: parseInt(e.target.value) || 1 })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    {registerForm.quantity > 1 && (
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, marginTop: 4, display: 'block' }}>
                        ⚡ Bulk action: {registerForm.quantity} separate asset units will be registered with individual unique sequential IDs.
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Physical Location <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Library Reading Hall, Lab 3, Clinic Bay, Block B"
                      value={registerForm.location}
                      onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Department
                    </label>
                    {isAdmin || isBursar ? (
                      <select
                        value={registerForm.department}
                        onChange={(e) => setRegisterForm({ ...registerForm, department: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      >
                        <option value="General">General Campus</option>
                        <option value="Library">Library</option>
                        <option value="Clinic">Clinic</option>
                        <option value="Science">Science</option>
                        <option value="Arts">Arts</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Grounds">Grounds</option>
                        <option value="IT">IT</option>
                        <option value="Administration">Administration</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={registerForm.department}
                        disabled
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontSize: '0.85rem' }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Condition
                    </label>
                    <select
                      value={registerForm.condition}
                      onChange={(e) => setRegisterForm({ ...registerForm, condition: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="good">Brand New / Good Condition</option>
                      <option value="fair">Fair (Normal Wear)</option>
                      <option value="poor">Poor (Needs Attention)</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION B: ADMIN & BURSAR ONLY EXTRA FIELDS */}
              {isFinancial && (
                <div style={{
                  marginBottom: 20,
                  padding: 16,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}>
                      FINANCIAL ROLES ONLY
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1e3a8a' }}>
                      2. Valuation, Procurement & Depreciation
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                        Supplier / Vendor Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alpha Office Supplies, MedEquip Ltd"
                        value={registerForm.supplierName}
                        onChange={(e) => setRegisterForm({ ...registerForm, supplierName: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={registerForm.purchaseDate}
                        onChange={(e) => setRegisterForm({ ...registerForm, purchaseDate: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                        Purchase Price per Unit ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={registerForm.purchasePrice}
                        onChange={(e) => setRegisterForm({ ...registerForm, purchasePrice: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                        Invoice No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. INV-2024-889"
                        value={registerForm.invoiceNumber}
                        onChange={(e) => setRegisterForm({ ...registerForm, invoiceNumber: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                        Depreciation Rate (% / Year)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="10"
                        value={registerForm.depreciationRate}
                        onChange={(e) => setRegisterForm({ ...registerForm, depreciationRate: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                        Warranty Until
                      </label>
                      <input
                        type="date"
                        value={registerForm.warrantyExpiry}
                        onChange={(e) => setRegisterForm({ ...registerForm, warrantyExpiry: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Type-Ahead Assigned To with live suggestions */}
                  <div style={{ marginTop: 14, position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                      Assigned To (Live Type-Ahead Search)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Type name, email, or staff ID to search staff/teachers..."
                        value={custodianQuery}
                        onChange={(e) => handleCustodianSearchChange(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      {isSearchingCustodian && (
                        <span style={{ position: 'absolute', right: 12, top: 10, fontSize: '0.8rem', color: '#94a3b8' }}>
                          <i className="fas fa-spinner fa-spin"></i>
                        </span>
                      )}
                    </div>

                    {/* Suggestions dropdown */}
                    {custodianSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        maxHeight: 180,
                        overflowY: 'auto',
                        marginTop: 4
                      }}>
                        {custodianSuggestions.map(u => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectCustodian(u)}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email} • Staff ID: {u.staffId}</div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                              {u.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedCustodianUser && (
                      <div style={{
                        marginTop: 6,
                        padding: '6px 10px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        color: '#166534',
                        fontWeight: 700
                      }}>
                        <i className="fas fa-check-circle mr-1"></i> Assigned to: {selectedCustodianUser.name} ({selectedCustodianUser.role})
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Notice for Non-Financial Staff */}
              {!isFinancial && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  color: '#92400e',
                  marginBottom: 16
                }}>
                  <i className="fas fa-exclamation-triangle mr-1"></i> <strong>Approval Notice:</strong> This asset registration will enter <strong>Pending Approval</strong> state. It will be verified by the Department HOD, followed by Bursar and Admin clearance before entering the active register.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="portal-btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="portal-btn-primary"
                  style={{ padding: '10px 24px', fontSize: '0.85rem', fontWeight: 800 }}
                >
                  {isSubmitting ? 'Registering...' : isFinancial ? 'Register Asset Directly' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPORT DAMAGE / FAULT                                            */}
      {/* ========================================================================= */}
      {isDamageModalOpen && selectedAsset && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#991b1b' }}>
                <i className="fas fa-exclamation-triangle mr-2"></i> Report Fault / Damage
              </h3>
              <button onClick={() => setIsDamageModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#991b1b', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleReportDamageSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>Asset</label>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>{selectedAsset.name} ({selectedAsset.assetNumber})</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>Issue Type</label>
                <select
                  value={damageForm.issueType}
                  onChange={(e) => setDamageForm({ ...damageForm, issueType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="DAMAGE">Physical Damage / Broken</option>
                  <option value="FAULT">Functional Fault / Malfunction</option>
                  <option value="THEFT_LOSS">Lost / Missing</option>
                  <option value="USAGE">Wear & Tear / Maintenance Required</option>
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>Details of Damage</label>
                <textarea
                  rows={4}
                  placeholder="Describe what occurred, visible damage, or error symptoms..."
                  value={damageForm.details}
                  onChange={(e) => setDamageForm({ ...damageForm, details: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setIsDamageModalOpen(false)} className="portal-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Submit Damage Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TRANSFER ASSET                                                   */}
      {/* ========================================================================= */}
      {isTransferModalOpen && selectedAsset && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Transfer Asset Location / Department</h3>
              <button onClick={() => setIsTransferModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleTransferSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>Asset</label>
                <div style={{ fontWeight: 800, color: '#1e293b' }}>{selectedAsset.name} ({selectedAsset.assetNumber})</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>New Location</label>
                <input
                  type="text"
                  value={transferForm.location}
                  onChange={(e) => setTransferForm({ ...transferForm, location: e.target.value })}
                  placeholder="e.g. Science Lab 2, Library Annex"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              {isAdmin && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>New Department</label>
                  <select
                    value={transferForm.department}
                    onChange={(e) => setTransferForm({ ...transferForm, department: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Library">Library</option>
                    <option value="Clinic">Clinic</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Grounds">Grounds</option>
                    <option value="IT">IT</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="portal-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 800 }}>Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: AUDIT REPORT OVERVIEW                                            */}
      {/* ========================================================================= */}
      {isAuditModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 640, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  <i className="fas fa-clipboard-check mr-2 text-primary"></i> School Asset Audit Report
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Comprehensive inventory & valuation audit</span>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total Registered Assets</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>{totalCount}</div>
                </div>
                {totalValuation !== null && totalValuation !== undefined && (
                  <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Total Ledger Valuation</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d' }}>${Number(totalValuation || 0).toLocaleString()}</div>
                  </div>
                )}
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Department Distribution</h4>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20 }}>
                {Object.entries(
                  assets.reduce((acc: any, a) => {
                    const dept = a.department || 'General';
                    acc[dept] = (acc[dept] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([deptName, count]: any) => (
                  <div key={deptName} style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>{deptName}</span>
                    <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.85rem' }}>{count} units</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => window.print()} className="portal-btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                  <i className="fas fa-print mr-1"></i> Print Audit
                </button>
                <button onClick={() => setIsAuditModalOpen(false)} className="portal-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REJECT REGISTRATION                                              */}
      {/* ========================================================================= */}
      {isRejectModalOpen && selectedAsset && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#991b1b' }}>Reject Asset Registration</h3>
              <button onClick={() => setIsRejectModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#991b1b', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Please specify a reason for rejecting the registration of <strong>{selectedAsset.name}</strong>:
              </p>
              <textarea
                rows={3}
                placeholder="Reason for rejection (e.g. invalid serial number, budget not approved)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: 16 }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setIsRejectModalOpen(false)} className="portal-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={handleRejectAsset} style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
