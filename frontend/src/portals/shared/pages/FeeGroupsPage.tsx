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
  isRecurring: boolean;
  remindersEnabled: boolean;
  _count?: { fees: number };
  classAmounts?: { classId: string; amount: number }[];
}

interface Class {
  id: string;
  name: string;
}

export default function FeeGroupsPage() {
  const { t } = useTerminology();
  const [groups, setGroups] = useState<FeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    amount: '',
    year: new Date().getFullYear().toString(),
    billingType: '',
    isRecurring: false,
    remindersEnabled: true
  });

  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classAmounts, setClassAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGroups();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load classes');
    
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/fees/groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load institutional fee structures', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.billingType) {
      return showToast('Mandatory fee parameters (Name, Amount, Type) required', 'warning');
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        year: parseInt(formData.year),
        classAmounts: Object.entries(classAmounts)
          .filter(([_, amount]) => amount && !isNaN(parseFloat(amount)))
          .map(([classId, amount]) => ({ classId, amount: parseFloat(amount as string) }))
      };
      
      const { data } = await api.post('/api/fees/groups', payload);
      
      if (formData.id) {
        setGroups(groups.map(g => g.id === data.id ? data : g));
        showToast('Authorized fee structure updated successfully', 'success');
      } else {
        setGroups([data, ...groups]);
        showToast('New institutional fee group defined and archived', 'success');
      }
      
      handleReset();
      setIsModalOpen(false);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to authorize fee structure', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (group: FeeGroup) => {
    setFormData({
      id: group.id,
      name: group.name,
      amount: group.amount.toString(),
      year: group.year.toString(),
      billingType: group.billingType,
      isRecurring: group.isRecurring,
      remindersEnabled: group.remindersEnabled
    });
    
    const amountsMap: Record<string, string> = {};
    if (group.classAmounts) {
      group.classAmounts.forEach(ca => {
        amountsMap[ca.classId] = ca.amount.toString();
      });
    }
    setClassAmounts(amountsMap);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Authorize permanent removal of this fee group? This action will impact historical audit trails.')) return;
    try {
      await api.delete(`/api/fees/groups/${id}`);
      setGroups(groups.filter(g => g.id !== id));
      showToast('Fee group purged from institutional registry', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to authorize registry purge', 'error');
    
    }
  };

  const handleReset = () => {
    setFormData({
      id: '',
      name: '',
      amount: '',
      year: new Date().getFullYear().toString(),
      billingType: '',
      isRecurring: false,
      remindersEnabled: true
    });
    setClassAmounts({});
    setIsModalOpen(false);
  };

  const years = Array.from(new Set((Array.isArray(groups) ? groups : []).map(g => g.year))).sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  const filteredGroups = (Array.isArray(groups) ? groups : []).filter(g => 
    g.year === activeYear && 
    (g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.billingType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Fee Registry & Structures</h1>
          <p>Configure institutional fee groups, recurring charges, and automated billing cycles for the academic fiscal year.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 24px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', fontWeight: 900 }}>
          <i className="fas fa-file-invoice-dollar mr-2"></i>BILLING GOVERNANCE
        </div>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay no-print" onClick={() => handleReset()}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200"
            style={{ maxWidth: '800px', width: '90%', padding: '24px', background: 'white', color: '#1e293b', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <i className="fas fa-edit"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b' }}>
                    {formData.id ? 'Modify Authorized Parameter' : 'Define Strategic Fee Group'}
                  </h3>
                </div>
              </div>
              <button onClick={() => handleReset()} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="portal-label">Institutional Fee Descriptor</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Standard Tuition, Boarding Levy"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    style={{ fontWeight: 800, height: '48px' }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Default Financial Valuation ($)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 900 }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="portal-input"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: e.target.value})}
                      style={{ paddingLeft: '32px', fontWeight: 900, color: '#059669', height: '48px' }}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="portal-label">Target Fiscal Audit Year</label>
                  <input
                    type="number"
                    className="portal-input"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: e.target.value})}
                    style={{ fontWeight: 800, height: '48px' }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Billing Cycle Classification</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Termly, Annual, Monthly"
                    value={formData.billingType}
                    onChange={e => setFormData({...formData, billingType: e.target.value})}
                    style={{ fontWeight: 800, height: '48px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <label className="portal-label" style={{ marginBottom: '4px' }}>Class Specific Pricing (Optional overrides)</label>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '12px' }}>Leave blank to use the default financial valuation for a class.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {classes.map(cls => (
                    <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.8rem', width: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cls.name}>{cls.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        className="portal-input"
                        placeholder="Amount"
                        value={classAmounts[cls.id] || ''}
                        onChange={e => setClassAmounts({ ...classAmounts, [cls.id]: e.target.value })}
                        style={{ height: '36px', fontSize: '0.85rem', flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                    checked={formData.isRecurring} 
                    onChange={e => setFormData({...formData, isRecurring: e.target.checked})} 
                  />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', display: 'block' }}>Automated Recurring Fee</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                    checked={formData.remindersEnabled} 
                    onChange={e => setFormData({...formData, remindersEnabled: e.target.checked})} 
                  />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', display: 'block' }}>Enable Arrears Notifications</span>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button type="button" onClick={handleReset} className="portal-btn-ghost" style={{ padding: '10px 20px', fontWeight: 800 }}>Abort</button>
                <button type="submit" className="portal-btn-primary" disabled={saving} style={{ padding: '10px 24px', fontWeight: 900 }}>
                  {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className={`fas fa-${formData.id ? 'check-circle' : 'plus-circle'} mr-2`}></i>}
                  {formData.id ? 'Authorize Updates' : 'Archive Strategic Fee Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', border: '1px solid #d1fae5' }}>
                <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.2rem' }}></i>
             </div>
             <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Institutional Fee Registry</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Management of authorized financial structures by academic year.</p>
             </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="portal-tab-container" style={{ margin: 0 }}>
                {(Array.isArray(years) ? years : []).map(year => (
                <button
                    key={year}
                    onClick={() => setActiveYear(year)}
                    className={`portal-tab-item ${activeYear === year ? 'active' : ''}`}
                    style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                >
                    {year}
                </button>
                ))}
            </div>
            <div style={{ position: 'relative', width: '300px' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                <input
                type="text"
                placeholder="Search fees..."
                className="portal-input"
                style={{ paddingLeft: '44px', height: '44px', fontSize: '0.9rem' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button 
                  onClick={() => { handleReset(); setIsModalOpen(true); }}
                  className="portal-btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#2563eb', borderColor: '#2563eb', fontWeight: 900, height: '44px' }}
              >
                <i className="fas fa-plus mr-1"></i> Define Fee Group
              </button>
              <button 
                  onClick={() => {
                    const headers = ['Fee Categorization', 'Standard Cost', 'Billing Cycle', 'Year'];
                    const rows = filteredGroups.map(g => [
                      g.name,
                      g.amount.toString(),
                      g.billingType,
                      g.year.toString()
                    ]);
                    exportToCSV('Fee_Groups', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', height: '44px' }}
                  title="Export to CSV"
              >
                <i className="fas fa-file-csv mr-1"></i> CSV
              </button>
              <button 
                  onClick={() => {
                    const headers = ['Fee Categorization', 'Standard Cost', 'Billing Cycle', 'Year'];
                    const rows = filteredGroups.map(g => [
                      g.name,
                      g.amount.toString(),
                      g.billingType,
                      g.year.toString()
                    ]);
                    exportToWord('Fee_Groups', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', height: '44px' }}
                  title="Export to Word"
              >
                <i className="fas fa-file-word mr-1"></i> Word
              </button>
              <button 
                  onClick={() => window.print()}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', height: '44px' }}
                  title="Print / PDF"
              >
                <i className="fas fa-print mr-1"></i> Print/PDF
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '30%', padding: '24px' }}>Fee Categorization</th>
                <th style={{ width: '15%' }}>Standard Cost</th>
                <th style={{ width: '15%' }}>Billing Cycle</th>
                <th style={{ width: '10%' }}>Year</th>
                <th style={{ textAlign: 'center', width: '15%' }}>Audit Meta</th>
                <th style={{ textAlign: 'right', width: '15%', paddingRight: '40px' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
                    <p style={{ fontWeight: 900, color: '#64748b' }}>Synchronizing fee registry...</p>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '120px 24px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid #f1f5f9' }}>
                        <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e1', opacity: 0.5 }}></i>
                    </div>
                    <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.25rem' }}>No Fee Structures Identified</h3>
                    <p style={{ color: '#64748b', fontWeight: 700, maxWidth: '360px', margin: '12px auto 0' }}>No authorized fee groups found for the fiscal year {activeYear}. Use the form above to define a new structure.</p>
                  </td>
                </tr>
              ) : (Array.isArray(filteredGroups) ? filteredGroups : []).map(group => (
                <tr key={group.id}>
                  <td style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', border: '1px solid #dbeafe' }}>
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.05rem' }}>{group.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AUDIT REF: {group.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>{formatCurrency(group.amount)}</span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: '#f8fafc', color: '#475569', fontWeight: 900, padding: '6px 16px', border: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                      {group.billingType?.toUpperCase()}
                    </span>
                  </td>
                  <td><span style={{ fontWeight: 900, color: '#64748b', fontSize: '0.95rem' }}>{group.year}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                      {group.isRecurring && <span title="Automated Recurring Active" style={{ color: '#2563eb', fontSize: '1.2rem', background: '#eff6ff', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}><i className="fas fa-sync-alt"></i></span>}
                      {group.remindersEnabled && <span title="Arrears Notifications Active" style={{ color: '#059669', fontSize: '1.2rem', background: '#ecfdf5', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}><i className="fas fa-bell"></i></span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button onClick={() => handleEdit(group)} className="portal-btn-ghost" title="Modify Structure" style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#2563eb' }}><i className="fas fa-pencil-alt"></i></button>
                      <button 
                        onClick={() => handleDelete(group.id)} 
                        className="portal-btn-ghost" 
                        title="Purge Group Record"
                        style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#dc2626' }}
                        disabled={(group._count?.fees || 0) > 0}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        @media print {
          .no-print, .portal-page-header, .portal-card, .portal-sidebar, .portal-header {
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
          }
          table { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
