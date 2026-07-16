import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import ManagementDetailPanel from '../../../components/shared/ManagementDetailPanel';
import UserEditModal from '../../../components/shared/UserEditModal';
import AdminUserCreateModal from '../../../components/shared/AdminUserCreateModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUserForEdit, setActiveUserForEdit] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [pendingSuppliers, setPendingSuppliers] = useState<any[]>([]);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const [{ data }, { data: pendingData }] = await Promise.all([
        api.get('/api/users?role=SUPPLIER'),
        api.get('/api/schools/connections/pending')
      ]);
      setSuppliers(data.users || []);
      setPendingSuppliers(pendingData || []);
    } catch (err) {
      showToast('Failed to fetch vendor records', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: any) => {
    try {
      await api.patch(`/api/schools/connections/${user.id}/approve`);
      showToast('Supplier verified and activated!', 'success');
      fetchSuppliers();
    } catch (err) {
      showToast('Failed to approve supplier', 'error');
    
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!(await toastConfirm(`Reset password for ${user.name} to default "Password"?`))) return;
    try {
      await api.post(`/api/users/${user.id}/reset-password`);
      showToast('Password reset successfully', 'success');
    } catch (err) {
      showToast('Failed to reset password', 'error');
    
    }
  };

  const handleLockToggle = async (user: any) => {
    const action = user.isLocked ? 'unlock' : 'lock';
    try {
      await api.post(`/api/users/${user.id}/${action}`);
      showToast(`Account ${action === 'lock' ? 'locked' : 'unlocked'} successfully`, 'success');
      fetchSuppliers();
    } catch (err) {
      showToast(`Failed to ${action
    } account`, 'error');
    }
  };

  const openDetail = (s: any) => {
    setSelectedSupplier(s);
    setIsDetailOpen(true);
  };

  const openEdit = (supplier: any) => {
    setActiveUserForEdit(supplier);
    setIsEditModalOpen(true);
  };

  const filteredSuppliers = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <h1>Supplier Management</h1>
        <p>Manage external vendors, procurement contracts, and supply chain logistics</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div className="modal-tabs" style={{ background: 'none', border: 'none', padding: 0 }}>
            <button 
              className={`tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActiveTab('ACTIVE')}
            >
              Active Directory
            </button>
            <button 
              className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
              onClick={() => setActiveTab('PENDING')}
              style={{ position: 'relative' }}
            >
              Verification Queue
              {pendingSuppliers.length > 0 && (
                <span style={{ position: 'absolute', top: 5, right: -15, background: 'var(--portal-danger)', color: 'white', fontSize: '0.65rem', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pendingSuppliers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="portal-card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Search vendors..." 
              className="portal-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }}></i>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="portal-btn-secondary" onClick={() => setIsManageCategoriesOpen(true)}>
              <i className="fas fa-tags" style={{ marginRight: 8 }}></i>Manage Categories
            </button>
            <button className="portal-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <i className="fas fa-truck-loading" style={{ marginRight: 8 }}></i>Add Supplier
            </button>
          </div>
        </div>

        <div className="management-table-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p>Loading vendor roster...</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th>Vendor ID (Local)</th>
                  <th>Company & profile</th>
                  <th>Contact Person</th>
                  <th>Specialization</th>
                  <th>Phone</th>
                  <th>Global Registry ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'ACTIVE' ? filteredSuppliers : pendingSuppliers).length > 0 ? (activeTab === 'ACTIVE' ? filteredSuppliers : pendingSuppliers).map(s => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--portal-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                      {activeTab === 'ACTIVE' ? (s.staffId || 'PENDING') : <span style={{ color: '#a0aec0' }}>New Request</span>}
                    </td>
                    <td>
                      <div className="user-info-cell">
                        <div className={`user-avatar supplier`}>
                          {s.avatar ? (
                            <img src={`${BASE_URL}/api/storage/media/${currentUser?.schoolCode}/images/${s.avatar}`} alt="" />
                          ) : (
                            s.name.charAt(0)
                          )}
                        </div>
                        <div className="user-name-wrap">
                          <span className="user-name">{s.metadata?.companyName || s.name}</span>
                          <div className="role-badges-group">
                            <span className="role-badge role-teacher" style={{ background: '#f6ad55' }}>Supplier</span>
                            {(s.secondaryRoles || []).map((r: string, idx: number) => (
                              <span key={idx} className="secondary-role-badge">{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{s.name}</td>
                    <td>{s.metadata?.specialization || s.metadata?.category || 'General Supplies'}</td>
                    <td>{s.phone || 'N/A'}</td>
                    <td style={{ fontSize: '0.75rem', color: '#718096', fontFamily: 'monospace' }}>
                      {s.metadata?.globalId || 'GLB-PENDING'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-view" title="View Profile" onClick={() => openDetail(s)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        {activeTab === 'PENDING' ? (
                          <button className="btn-icon" title="Approve Verification" style={{ background: '#c6f6d5', color: '#22c55e' }} onClick={() => handleApprove(s)}>
                             <i className="fas fa-check"></i>
                          </button>
                        ) : (
                          <>
                            <button className="btn-icon btn-edit" title="Edit Vendor" onClick={() => openEdit(s)}>
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button className="btn-icon btn-lock" title={s.isLocked ? "Unlock Access" : "Lock Access"} onClick={() => handleLockToggle(s)}>
                              <i className={`fas fa-${s.isLocked ? 'unlock' : 'lock'}`}></i>
                            </button>
                            <button className="btn-icon btn-view" title="Purchase History" style={{ background: 'rgba(49, 130, 206, 0.1)', color: 'var(--school-primary, #3182ce)' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                              <i className="fas fa-file-invoice-dollar"></i>
                            </button>
                          </>
                        )}
                        <button className="btn-icon btn-delete" title={activeTab === 'PENDING' ? "Reject" : "Delete Permanent"} onClick={async () => {
                          if (await toastConfirm(activeTab === 'PENDING' ? `Reject connection request from ${s.name}?` : `Permanently delete ${s.name}?`)) {
                            // Can call reject api here later
                            api.delete(`/api/users/${s.id}`).then(() => fetchSuppliers());
                          }
                        }}>
                          <i className={`fas ${activeTab === 'PENDING' ? 'fa-times' : 'fa-trash'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#718096' }}>No vendor records found in {activeTab === 'PENDING' ? 'queue' : 'directory'}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedSupplier && (
        <ManagementDetailPanel
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedSupplier.metadata?.companyName || selectedSupplier.name}
          subTitle={`Local ID: ${selectedSupplier.staffId || 'Unassigned'} | Global: ${selectedSupplier.metadata?.globalId || 'N/A'}`}
          role="Supplier"
          secondaryRoles={selectedSupplier.secondaryRoles}
          avatarFilename={selectedSupplier.avatar}
          avatarText={(selectedSupplier.metadata?.companyName || selectedSupplier.name).charAt(0)}
          onEdit={() => { setIsDetailOpen(false); openEdit(selectedSupplier); }}
          onResetPassword={() => handleResetPassword(selectedSupplier)}
          sections={[
            {
              title: "Business Profile",
              fields: [
                { label: "Company Name", value: selectedSupplier.metadata?.companyName || selectedSupplier.name },
                { label: "Location Type", value: selectedSupplier.metadata?.location || 'Local' },
                { label: "Organization Type", value: selectedSupplier.metadata?.orgType || 'N/A' },
                { label: "Company Owned By", value: selectedSupplier.metadata?.businessOwnedBy || 'General / Other' },
                { label: "Registered with PRAZ?", value: selectedSupplier.metadata?.prazRegistered || 'N/A' },
                { label: "PRAZ Registration No", value: selectedSupplier.metadata?.prazNo || selectedSupplier.metadata?.prazReg || 'N/A' },
                { label: "BP / Registration No", value: selectedSupplier.metadata?.regNo || selectedSupplier.metadata?.vendorNo || 'N/A' },
                { label: "Year of Incorporation", value: selectedSupplier.metadata?.incorpYear || 'N/A' },
                { 
                  label: "Business Categories", 
                  value: selectedSupplier.metadata?.selectedCategories && selectedSupplier.metadata.selectedCategories.length > 0
                    ? selectedSupplier.metadata.selectedCategories.map((c: any) => `${c.code}: ${c.name} (${c.section})`).join(', ')
                    : selectedSupplier.metadata?.category || 'N/A' 
                },
                { label: "Specialization", value: selectedSupplier.metadata?.specialization || 'N/A' },
                { label: "Tax BP Number", value: selectedSupplier.metadata?.taxNumber || 'N/A' },
                { label: "Tax Clearance Expiry", value: selectedSupplier.metadata?.taxExpiry || 'N/A' },
                { label: "PRAZ Expiry", value: selectedSupplier.metadata?.prazExpiry || 'N/A' },
                { label: "NSSA Expiry", value: selectedSupplier.metadata?.nssaExpiry || 'N/A' }
              ]
            },
            {
              title: "Contact & Representative",
              fields: [
                { 
                  label: "Contact Person", 
                  value: selectedSupplier.metadata?.contactFirstName 
                    ? `${selectedSupplier.metadata?.contactTitle || 'Mr'} ${selectedSupplier.metadata?.contactFirstName} ${selectedSupplier.metadata?.contactMiddleName || ''} ${selectedSupplier.metadata?.contactLastName}`
                    : selectedSupplier.name 
                },
                { label: "Gender", value: selectedSupplier.metadata?.contactGender || 'N/A' },
                { label: "Designation/Position", value: selectedSupplier.metadata?.contactPosition || selectedSupplier.metadata?.designation || 'N/A' },
                { label: "Email Address", value: selectedSupplier.metadata?.contactEmail || selectedSupplier.email },
                { label: "Mobile Number", value: selectedSupplier.metadata?.mobileNumber || selectedSupplier.phone || 'N/A' }
              ]
            },
            {
              title: "Address & Logistics",
              fields: [
                { label: "Country", value: selectedSupplier.metadata?.country || 'Zimbabwe' },
                { label: "Province", value: selectedSupplier.metadata?.province || 'N/A' },
                { label: "City/Town/Village", value: selectedSupplier.metadata?.city || 'N/A' },
                { label: "Street Address", value: selectedSupplier.metadata?.address || 'N/A' },
                { 
                  label: "Landline Number", 
                  value: selectedSupplier.metadata?.landlineNumber 
                    ? `+263 (${selectedSupplier.metadata?.landlineAreaCode || ''}) ${selectedSupplier.metadata?.landlineNumber} ${selectedSupplier.metadata?.landlineExtension ? 'Ext ' + selectedSupplier.metadata?.landlineExtension : ''}`
                    : 'N/A' 
                },
                { 
                  label: "Fax Number", 
                  value: selectedSupplier.metadata?.faxNumber 
                    ? `(${selectedSupplier.metadata?.faxAreaCode || ''}) ${selectedSupplier.metadata?.faxNumber} ${selectedSupplier.metadata?.faxExtension ? 'Ext ' + selectedSupplier.metadata?.faxExtension : ''}`
                    : 'N/A' 
                }
              ]
            },
            {
              title: "Bank Details",
              fields: (selectedSupplier.metadata?.bankAccounts && selectedSupplier.metadata.bankAccounts.length > 0)
                ? selectedSupplier.metadata.bankAccounts.map((acc: any, index: number) => ({
                    label: `${acc.accountType || 'Bank'} Account #${index + 1}`,
                    value: `${acc.bankName} (Branch: ${acc.bankBranch}, Code: ${acc.branchCode}) \nName: ${acc.accountName} \nNo: ${acc.accountNumber}`
                  }))
                : [{ label: "Bank Accounts", value: "No bank accounts added" }]
            },
            {
              title: "Category Payment Details",
              fields: selectedSupplier.metadata?.categoryPayment
                ? [
                    { label: "Currency Type", value: selectedSupplier.metadata.categoryPayment.currency || 'N/A' },
                    { label: "Total Amount Paid/Due", value: `${selectedSupplier.metadata.categoryPayment.currency || 'USD'} ${(selectedSupplier.metadata.categoryPayment.amount || 0).toFixed(2)}` },
                    { label: "Disclaimer Confirmed", value: selectedSupplier.metadata.categoryPayment.disclaimerAccepted ? "Yes" : "No" }
                  ]
                : [{ label: "Payment Status", value: "No payment details recorded" }]
            },
            {
              title: "Compliance Attachments",
              fields: selectedSupplier.metadata?.orgType === 'Individual Consultant'
                ? [
                    { label: "Membership Documents", value: selectedSupplier.metadata?.docs?.membershipDocs, type: selectedSupplier.metadata?.docs?.membershipDocs ? 'image' : 'text' },
                    { label: "Profile", value: selectedSupplier.metadata?.docs?.profile, type: selectedSupplier.metadata?.docs?.profile ? 'image' : 'text' },
                    { label: "CV", value: selectedSupplier.metadata?.docs?.cv, type: selectedSupplier.metadata?.docs?.cv ? 'image' : 'text' }
                  ]
                : [
                    { label: "Supporting Document", value: selectedSupplier.metadata?.docs?.supportingDoc, type: selectedSupplier.metadata?.docs?.supportingDoc ? 'image' : 'text' },
                    { label: "Tax Clearance (ITF263)", value: selectedSupplier.metadata?.docs?.taxClearance, type: selectedSupplier.metadata?.docs?.taxClearance ? 'image' : 'text' },
                    { label: "Certificate of Incorporation", value: selectedSupplier.metadata?.docs?.certIncorp, type: selectedSupplier.metadata?.docs?.certIncorp ? 'image' : 'text' },
                    { label: "PRAZ Certificate", value: selectedSupplier.metadata?.docs?.prazCert, type: selectedSupplier.metadata?.docs?.prazCert ? 'image' : 'text' },
                    { label: "NSSA Clearance Doc", value: selectedSupplier.metadata?.docs?.nssaClearance, type: selectedSupplier.metadata?.docs?.nssaClearance ? 'image' : 'text' },
                    { label: "Other Vendor Doc", value: selectedSupplier.metadata?.docs?.vendorRegFile, type: selectedSupplier.metadata?.docs?.vendorRegFile ? 'image' : 'text' }
                  ]
            }
          ]}
        />
      )}

      {/* Edit Modal */}
      {activeUserForEdit && (
        <UserEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={activeUserForEdit}
          currentUserRole={currentUser?.role || ''}
          onSuccess={fetchSuppliers}
        />
      )}

      {/* Create Modal */}
      <AdminUserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSuppliers}
        defaultRole="SUPPLIER"
      />

      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
      />
    </>
  );
}

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CATEGORIES = [
  'ICT / Software',
  'Transport & Logistics',
  'Stationery & Printing',
  'Building & Construction',
  'Food & Catering',
  'General Services'
];

function ManageCategoriesModal({ isOpen, onClose }: ManageCategoriesModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const { showToast } = useToast();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/schools/me');
      const customContent = data.customContent || {};
      const savedCats = customContent.supplierCategories || [];
      setCategories(savedCats.length > 0 ? savedCats : DEFAULT_CATEGORIES);
    } catch (err) {
      showToast('Failed to load categories', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast('Category already exists', 'warning');
      return;
    }
    const updated = [...categories, trimmed];
    try {
      await api.patch('/api/schools/supplier-categories', { categories: updated });
      setCategories(updated);
      setNewCategory('');
      showToast('Category added successfully', 'success');
    } catch (err) {
      showToast('Failed to add category', 'error');
    
    }
  };

  const handleDelete = async (catToDelete: string) => {
    const updated = categories.filter(c => c !== catToDelete);
    try {
      await api.patch('/api/schools/supplier-categories', { categories: updated });
      setCategories(updated);
      showToast('Category removed successfully', 'success');
    } catch (err) {
      showToast('Failed to delete category', 'error');
    
    }
  };

  if (!isOpen) return null;

  return (
    <div className="portal-modal-overlay">
      <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '600px', padding: 0 }}>
        <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Manage Supplier Categories</h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Add or remove categories available for registration.</p>
          </div>
          <button onClick={onClose} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
        </div>
        <div className="portal-modal-body" style={{ padding: '40px' }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              className="portal-input"
              placeholder="Enter new category name..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{ fontWeight: 700, flex: 1, height: '48px' }}
              required
            />
            <button type="submit" className="portal-btn-primary" style={{ padding: '0 24px', height: '48px', fontWeight: 900 }}>
              Add
            </button>
          </form>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="fas fa-spinner fa-spin" style={{ color: 'var(--portal-primary)' }}></i>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {categories.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="portal-btn-ghost"
                    style={{ padding: '8px', color: '#dc2626' }}
                    title="Delete Category"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="portal-modal-footer" style={{ padding: '24px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose} className="portal-btn-primary" style={{ padding: '12px 32px', fontWeight: 900 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
