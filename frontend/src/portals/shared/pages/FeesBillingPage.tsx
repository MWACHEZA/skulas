import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

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

interface FeeGroup {
  id: string;
  name: string;
  amount: number;
  year: number;
  billingType: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  boardingStatus: string;
  class?: { name: string };
}

interface Class {
  id: string;
  name: string;
}

export default function FeesBillingPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeFeeYear, setActiveFeeYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Standard Invoicing State
  const [selectedFeeGroupIds, setSelectedFeeGroupIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  
  // Shared Invoice Data
  const [discount, setDiscount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');

  // Custom Invoicing State
  const [customFeeGroupId, setCustomFeeGroupId] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'standard') {
      fetchStudents();
    }
  }, [selectedClassIds, selectedCategory, activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [groupsRes, classesRes] = await Promise.all([
        api.get('/api/fees/groups'),
        api.get('/api/classes')
      ]);
      const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
      setFeeGroups(groups);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      
      if (groups.length > 0) {
        const uniqueYears = Array.from(new Set(groups.map((g: any) => g.year))) as number[];
        if (!uniqueYears.includes(new Date().getFullYear())) {
          setActiveFeeYear(Math.max(...uniqueYears));
        }
      }
    } catch (error) {
      showToast('Failed to load billing registry data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClassIds.length > 0) params.append('classIds', selectedClassIds.join(','));
      if (selectedCategory) params.append('category', selectedCategory);
      
      const { data } = await api.get(`/api/fees/students-list?${params.toString()}`);
      const studentData = Array.isArray(data) ? data : [];
      setStudents(studentData);
      setSelectedStudentIds(studentData.map((s: any) => s.id));
    } catch (error) {
      showToast('Failed to synchronize student roster', 'error');
    
    }
  };

  const handleProcessStandard = async () => {
    if (selectedFeeGroupIds.length === 0) return showToast('Institutional fee group selection required', 'warning');
    if (selectedStudentIds.length === 0) return showToast('No students identified for invoicing', 'warning');

    setProcessing(true);
    try {
      const { data } = await api.post('/api/fees/invoice/standard', {
        feeGroupIds: selectedFeeGroupIds,
        studentIds: selectedStudentIds,
        dueDate,
        discount,
        paymentStatus,
        paymentMethod,
        description
      });
      showToast('Institutional billing batch authorized and processed', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Standard invoicing process failed', 'error');
    
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessCustom = async () => {
    if (!customFeeGroupId) return showToast('Fee category categorization required', 'warning');
    if (!customAmount) return showToast('Authorized settlement amount required', 'warning');
    if (selectedStudentIds.length === 0) return showToast('No students identified for custom billing', 'warning');

    setProcessing(true);
    try {
      const { data } = await api.post('/api/fees/invoice/custom', {
        feeGroupId: customFeeGroupId,
        studentIds: selectedStudentIds,
        customAmount,
        dueDate,
        discount,
        paymentStatus,
        paymentMethod,
        description
      });
      showToast('Custom ad-hoc billing authorized and archived', 'success');
      setIsModalOpen(false);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Custom invoicing process failed', 'error');
    
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = () => {
    const studentList = Array.isArray(students) ? students : [];
    if (selectedStudentIds.length === studentList.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentList.map(s => s.id));
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Financial Billing & Invoicing</h1>
          <p>Authorize institutional fee assessments, generate automated invoices, and manage custom student debits.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', fontWeight: 900 }}>
          <i className="fas fa-file-invoice-dollar mr-2"></i>INVOICE ENGINE
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', width: 'fit-content' }} className="animate-in fade-in slide-in-from-top-2 duration-300">
        <button
          onClick={() => setActiveTab('standard')}
          className={`portal-btn-${activeTab === 'standard' ? 'primary' : 'ghost'}`}
          style={{ minWidth: '240px', borderRadius: '12px', fontWeight: 900, padding: '14px', fontSize: '0.95rem' }}
        >
          <i className="fas fa-layer-group mr-2"></i>Standard Bulk Invoicing
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`portal-btn-${activeTab === 'custom' ? 'primary' : 'ghost'}`}
          style={{ minWidth: '240px', borderRadius: '12px', fontWeight: 900, padding: '14px', fontSize: '0.95rem' }}
        >
          <i className="fas fa-user-edit mr-2"></i>Custom Ad-Hoc Billing
        </button>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay no-print" onClick={() => setIsModalOpen(false)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200"
            style={{ maxWidth: '640px', width: '90%', padding: '24px', background: 'white', color: '#1e293b', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <i className="fas fa-sliders-h"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b' }}>
                    Configure Billing Parameters ({activeTab === 'standard' ? 'Standard Bulk' : 'Custom Ad-Hoc'})
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="portal-card" style={{ padding: '0px', border: 'none', boxShadow: 'none' }}>
              {activeTab === 'standard' ? (
                <>
                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="portal-label">Strategic Fee Group Registry</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {Array.from(new Set((Array.isArray(feeGroups) ? feeGroups : []).map(g => g.year))).sort((a, b) => b - a).map(year => (
                        <button
                          key={year}
                          type="button"
                          onClick={() => setActiveFeeYear(year)}
                          className={`portal-btn-${activeFeeYear === year ? 'primary' : 'ghost'}`}
                          style={{ padding: '10px 24px', fontSize: '0.9rem', fontWeight: 900, borderRadius: '10px', minWidth: '100px' }}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '20px', background: '#f8fafc', padding: '12px' }} className="custom-scrollbar">
                      {(Array.isArray(feeGroups) ? feeGroups : []).filter(g => g.year === activeFeeYear).length === 0 ? (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 800 }}>
                              <i className="fas fa-folder-open fa-2x mb-3 opacity-20"></i>
                              <p>No fee structures identified for {activeFeeYear}</p>
                          </div>
                      ) : (Array.isArray(feeGroups) ? feeGroups : []).filter(g => g.year === activeFeeYear).map(group => (
                        <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', cursor: 'pointer', borderRadius: '14px', marginBottom: '8px', border: '1px solid transparent', transition: 'all 0.2s' }} className="hover-card">
                          <input
                            type="checkbox"
                            checked={selectedFeeGroupIds.includes(group.id)}
                            onChange={() => setSelectedFeeGroupIds(prev => 
                              prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                            )}
                            style={{ width: '24px', height: '24px', accentColor: '#2563eb' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b' }}>{group.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span className="status-badge" style={{ background: '#fff', padding: '2px 10px', fontSize: '0.7rem' }}>{group.billingType?.toUpperCase()}</span>
                              <span style={{ color: '#059669', fontWeight: 900, fontSize: '1rem' }}>{formatCurrency(group.amount)}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="portal-label">Institutional {t('class')} Entities</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                      {(Array.isArray(classes) ? classes : []).map(cls => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setSelectedClassIds(prev => prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id])}
                          className={`portal-btn-${selectedClassIds.includes(cls.id) ? 'primary' : 'ghost'}`}
                          style={{ padding: '10px', fontSize: '0.85rem', fontWeight: 900, borderRadius: '10px' }}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="portal-label">Enrollment Classification Audit</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {['', 'Day', 'Boarder'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`portal-btn-${selectedCategory === cat ? 'primary' : 'ghost'}`}
                          style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 900, borderRadius: '12px' }}
                        >
                          {cat || 'Aggregated Registry'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="portal-label">Ad-Hoc Fee Categorization</label>
                    <select
                      className="portal-input"
                      value={customFeeGroupId}
                      onChange={e => setCustomFeeGroupId(e.target.value)}
                      style={{ fontWeight: 800, height: '52px' }}
                    >
                      <option value="">-- Select Authorized Fee Entity --</option>
                      {(Array.isArray(feeGroups) ? feeGroups : []).map(group => (
                        <option key={group.id} value={group.id}>{group.name} ({group.billingType} {group.year})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="portal-label">Defined Ad-Hoc Settlement Amount ($)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 900, fontSize: '1.25rem' }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="portal-input"
                        placeholder="0.00"
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        style={{ paddingLeft: '48px', fontWeight: 900, color: '#e11d48', height: '60px', fontSize: '1.5rem', borderRadius: '16px' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="portal-label">Authorization Due Date</label>
                <input
                  type="date"
                  className="portal-input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ fontWeight: 800, height: '52px', borderRadius: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="portal-label">Payment Discount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="portal-input"
                    placeholder="0.00"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    style={{ height: '48px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Payment Status</label>
                  <select className="portal-input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={{ height: '48px' }}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                {paymentStatus === 'paid' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-label">Payment Method</label>
                    <select className="portal-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ height: '48px' }}>
                      <option value="">-- Select Method --</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Ecocash">Ecocash</option>
                    </select>
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="portal-label">Description (Optional Override)</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="Custom invoice description..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ height: '48px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="portal-btn-ghost"
                  style={{ flex: 1, height: '56px', borderRadius: '14px', fontWeight: 800 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={activeTab === 'standard' ? handleProcessStandard : handleProcessCustom}
                  disabled={processing}
                  className="portal-btn-primary"
                  style={{ flex: 2, height: '56px', fontSize: '1rem', fontWeight: 900, background: '#059669', border: 'none', borderRadius: '14px', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.2)' }}
                >
                  {processing ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check-double mr-2"></i>}
                  {processing ? 'AUTHORIZING BATCH...' : 'AUTHORIZE INVOICES'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%' }}>
        {/* Student List */}
        <div className="management-table-card animate-in fade-in duration-500" style={{ padding: 0 }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                Recipient Registry ({(Array.isArray(students) ? students : []).length})
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>Authorized recipients for the current institutional cycle</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
              <button
                onClick={() => setIsModalOpen(true)}
                className="portal-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#2563eb', borderColor: '#2563eb', fontWeight: 900, height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-sliders-h"></i> Configure Parameters
              </button>
              <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const headers = [t('student') + ' Name', 'Reg ID', t('class'), 'Boarding Status'];
                    const rows = students.map(s => [
                      s.name,
                      s.studentId,
                      s.class?.name || 'UNASSIGNED',
                      s.boardingStatus || 'GENERAL'
                    ]);
                    exportToCSV('Billing_Recipients', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Export to CSV"
              >
                <i className="fas fa-file-csv mr-1"></i> CSV
              </button>
              <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const headers = [t('student') + ' Name', 'Reg ID', t('class'), 'Boarding Status'];
                    const rows = students.map(s => [
                      s.name,
                      s.studentId,
                      s.class?.name || 'UNASSIGNED',
                      s.boardingStatus || 'GENERAL'
                    ]);
                    exportToWord('Billing_Recipients', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Export to Word"
              >
                <i className="fas fa-file-word mr-1"></i> Word
              </button>
              <button 
                onClick={toggleAllStudents}
                className="portal-btn-ghost"
                style={{ fontSize: '0.9rem', padding: '12px 24px', fontWeight: 900, borderRadius: '14px', color: '#2563eb' }}
              >
                <i className={`fas fa-${selectedStudentIds.length === (Array.isArray(students) ? students : []).length ? 'minus-circle' : 'check-circle'} mr-2`}></i>
                {selectedStudentIds.length === (Array.isArray(students) ? students : []).length ? 'DESELECT REGISTRY' : 'SELECT ENTIRE ROSTER'}
              </button>
            </div>
          </div>
          
          <div className="table-responsive" style={{ maxHeight: '720px' }}>
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '22px', height: '22px', accentColor: '#2563eb' }}
                      checked={(Array.isArray(students) ? students : []).length > 0 && selectedStudentIds.length === (Array.isArray(students) ? students : []).length}
                      onChange={toggleAllStudents}
                    />
                  </th>
                  <th>{t('student')} Identity</th>
                  <th>{t('class')} Registry</th>
                  <th style={{ textAlign: 'center' }}>Classification</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(students) ? students : []).map(student => (
                  <tr 
                    key={student.id} 
                    onClick={() => toggleStudent(student.id)}
                    style={{ cursor: 'pointer', background: selectedStudentIds.includes(student.id) ? '#f0f9ff' : 'transparent', transition: 'background 0.2s' }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '22px', height: '22px', accentColor: '#2563eb' }}
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => {}}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{student.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>REG ID: {student.studentId}</div>
                    </td>
                    <td><span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#475569' }}>{student.class?.name || 'UNASSIGNED'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="status-badge" style={{ 
                        fontWeight: 900, 
                        background: student.boardingStatus === 'Boarder' ? '#fff7ed' : '#f0f9ff',
                        color: student.boardingStatus === 'Boarder' ? '#c2410c' : '#0369a1',
                        border: `1px solid ${student.boardingStatus === 'Boarder' ? '#ffedd5' : '#e0f2fe'}`,
                        fontSize: '0.7rem',
                        padding: '4px 14px'
                      }}>
                        {student.boardingStatus?.toUpperCase() || 'GENERAL'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(Array.isArray(students) ? students : []).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '140px 24px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid #f1f5f9' }}>
                        <i className="fas fa-user-clock fa-2x" style={{ color: '#cbd5e1', opacity: 0.5 }}></i>
                      </div>
                      <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.25rem' }}>Synchronizing Student Registry</h3>
                      <p style={{ color: '#64748b', fontWeight: 700, maxWidth: '300px', margin: '12px auto 0', lineHeight: 1.5 }}>Define institutional filters to identify and synchronize target students for the invoicing cycle.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 24px 24px' }}>
             <div style={{ fontWeight: 900, color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb' }}></div>
                Audit Count: <span style={{ color: '#1e293b' }}>{selectedStudentIds.length}</span> / {(Array.isArray(students) ? students : []).length} Recipient Entities
             </div>
             <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Projected Invoice Batch: <span style={{ fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>{selectedStudentIds.length * (activeTab === 'standard' ? selectedFeeGroupIds.length : 1)}</span>
             </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          .no-print, .portal-page-header, .portal-card, .portal-sidebar, .portal-header, .portal-btn-ghost, .portal-tab-container {
            display: none !important;
          }
          .portal-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .management-table-card {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
          }
          table { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
