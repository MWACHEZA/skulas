import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import '../../../../styles/portal.css';

interface Inquiry {
  id: string;
  name: string;
  phone: string;
  source: string;
  classId: string | null;
  class: { name: string } | null;
  inquiryDate: string;
  lastFollowUpDate: string | null;
  nextFollowUpDate: string | null;
  status: string;
}

export default function AdmissionInquiryPage() {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [classId, setClassId] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  useEffect(() => {
    fetchInquiries();
    fetchClasses();
  }, []);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/reception/inquiries');
      setInquiries(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load inquiries', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load classes');
    
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/reception/inquiries', {
        name,
        phone,
        source,
        classId,
        inquiryDate,
        nextFollowUpDate
      });
      showToast('Inquiry added successfully!', 'success');
      setShowAddModal(false);
      setName(''); setPhone(''); setSource(''); setClassId(''); setInquiryDate(''); setNextFollowUpDate('');
      fetchInquiries();
    } catch (error) {
      showToast('Failed to add inquiry', 'error');
    
    }
  };

  const filtered = inquiries.filter(i => {
    if (filterClass && i.classId !== filterClass) return false;
    if (filterSource && i.source !== filterSource) return false;
    if (filterStatus !== 'All' && i.status !== filterStatus) return false;
    // Basic date filtering
    if (filterDateFrom && new Date(i.inquiryDate) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(i.inquiryDate) > new Date(filterDateTo)) return false;
    return true;
  });

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Admission Inquiry</h1>
          <p>Manage prospective student inquiries.</p>
        </div>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Admission Enquiry</h2>
          <button className="portal-btn-primary" onClick={() => setShowAddModal(true)} style={{ background: '#22c55e', border: 'none' }}>
            + Add
          </button>
        </div>
        <div style={{ padding: '16px' }}>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label className="portal-label">Class</label>
              <select className="portal-input" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-label">Source</label>
              <select className="portal-input" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                <option value="">Select source</option>
                <option value="Front Office">Front Office</option>
                <option value="Advertisement">Advertisement</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div>
              <label className="portal-label">Enquiry from date</label>
              <input type="date" className="portal-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="portal-label">Enquiry to date</label>
              <input type="date" className="portal-input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
            <div>
              <label className="portal-label">Status</label>
              <select className="portal-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Passive">Passive</option>
                <option value="Dead">Dead</option>
                <option value="Won">Won</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="portal-btn-primary" style={{ background: '#22c55e', border: 'none', height: '38px', width: '100%' }} onClick={() => alert('This feature is currently under development or disabled.')}>Find</button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PHONE</th>
                  <th>SOURCE</th>
                  <th>INQUIRY DATE</th>
                  <th>LAST FOLLOW UP DATE</th>
                  <th>NEXT FOLLOW UP DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '8px' }}>
                        <i className="fas fa-file-invoice" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                      </div>
                      <div style={{ fontWeight: 600 }}>No Inquiry Found</div>
                      <div style={{ fontSize: '0.8rem' }}>Select class, status, date and others to view.</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(inq => (
                    <tr key={inq.id}>
                      <td style={{ fontWeight: 600 }}>{inq.name}</td>
                      <td>{inq.phone}</td>
                      <td>{inq.source}</td>
                      <td>{new Date(inq.inquiryDate).toLocaleDateString()}</td>
                      <td>{inq.lastFollowUpDate ? new Date(inq.lastFollowUpDate).toLocaleDateString() : '-'}</td>
                      <td>{inq.nextFollowUpDate ? new Date(inq.nextFollowUpDate).toLocaleDateString() : '-'}</td>
                      <td><span className="status-badge status-paid">{inq.status}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="portal-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-phone mr-2"></i> Follow Up</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in fade-in zoom-in-95 duration-200" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Add Admission Inquiry</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="portal-label">Name <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Phone <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="portal-input" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Class <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={classId} onChange={e => setClassId(e.target.value)} required>
                    <option value="">Select</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Source <span style={{color:'red'}}>*</span></label>
                  <select className="portal-input" value={source} onChange={e => setSource(e.target.value)} required>
                    <option value="">Select source</option>
                    <option value="Front Office">Front Office</option>
                    <option value="Advertisement">Advertisement</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Inquiry Date <span style={{color:'red'}}>*</span></label>
                  <input type="date" className="portal-input" value={inquiryDate} onChange={e => setInquiryDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Next Follow Up Date</label>
                  <input type="date" className="portal-input" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#22c55e', border: 'none' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
