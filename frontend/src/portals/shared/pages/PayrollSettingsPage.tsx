import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import '../../../styles/portal.css';

export default function PayrollSettingsPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<'allowances' | 'deductions' | 'taxTables'>('allowances');
  const [allowances, setAllowances] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [taxTables, setTaxTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [showAddTaxTable, setShowAddTaxTable] = useState(false);

  // Allowance/Deduction Form payload
  const [formData, setFormData] = useState({
    name: '',
    isRecurring: false,
    isPercentage: false,
    defaultValue: 0,
  });

  // Tax Table Form payload
  const [taxData, setTaxData] = useState({
    name: '(Monthly) Zimbabwe (Effective: 1/1/2025 - 12/31/2025)',
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31',
    bands: [
      { minIncome: 0, maxIncome: 100, rate: 0, fixedAmount: 0 },
      { minIncome: 100.01, maxIncome: 300, rate: 20, fixedAmount: 20 }
    ]
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'allowances') {
        const { data } = await api.get('/api/payroll/allowances');
        setAllowances(Array.isArray(data) ? data : []);
      } else if (activeTab === 'deductions') {
        const { data } = await api.get('/api/payroll/deductions');
        setDeductions(Array.isArray(data) ? data : []);
      } else {
        const { data } = await api.get('/api/payroll/tax-tables');
        setTaxTables(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      toast.error(`Failed to synchronize ${activeTab} configurations`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModifier = async (type: 'allowances' | 'deductions', e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/api/payroll/${type}`, formData);
      if (type === 'allowances') {
        setAllowances([...allowances, data]);
        setShowAddAllowance(false);
      } else {
        setDeductions([...deductions, data]);
        setShowAddDeduction(false);
      }
      toast.success(`${type === 'allowances' ? 'Allowance' : 'Deduction'} strategy archived successfully`);
      setFormData({ name: '', isRecurring: false, isPercentage: false, defaultValue: 0 });
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to archive ${type} configuration`);
    }
  };

  const handleDeleteModifier = async (type: 'allowances' | 'deductions' | 'tax-tables', id: string) => {
    if (!window.confirm('Are you sure you want to purge this payroll configuration? This may impact future salary calculations.')) return;
    try {
      await api.delete(`/api/payroll/${type}/${id}`);
      if (type === 'allowances') setAllowances(allowances.filter(a => a.id !== id));
      else if (type === 'deductions') setDeductions(deductions.filter(d => d.id !== id));
      else setTaxTables(taxTables.filter(t => t.id !== id));
      toast.success('Configuration purged from institutional registry');
    } catch (error) {
      toast.error('Failed to purge payroll configuration');
    }
  };

  const handleCreateTaxTable = async () => {
    try {
      const { data } = await api.post('/api/payroll/tax-tables', taxData);
      setTaxTables([data, ...taxTables]);
      setShowAddTaxTable(false);
      toast.success('Strategic tax table authorized');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to authorize tax table');
    }
  };

  const updateTaxBand = (index: number, field: string, value: string | number) => {
    const newBands = [...taxData.bands];
    newBands[index] = { ...newBands[index], [field]: value };
    setTaxData({ ...taxData, bands: newBands });
  };

  const addTaxBand = () => {
    const lastBand = taxData.bands[taxData.bands.length - 1];
    setTaxData({
      ...taxData,
      bands: [
        ...taxData.bands, 
        { minIncome: (lastBand?.maxIncome || 0) + 0.01, maxIncome: null as any, rate: 0, fixedAmount: 0 }
      ]
    });
  };

  const innerContent = (
    <>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', background: '#f8fafc', padding: '8px', borderRadius: '16px', border: '1px solid #f1f5f9', width: 'fit-content' }}>
        <button 
          className={`portal-btn-${activeTab === 'allowances' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('allowances')}
          style={{ minWidth: '180px', padding: '12px 24px', fontWeight: 900, borderRadius: '12px' }}
        >
          <i className="fas fa-hand-holding-usd mr-2"></i> Secondary Allowances
        </button>
        <button 
          className={`portal-btn-${activeTab === 'deductions' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('deductions')}
          style={{ minWidth: '180px', padding: '12px 24px', fontWeight: 900, borderRadius: '12px' }}
        >
          <i className="fas fa-cut mr-2"></i> Fiscal Deductions
        </button>
        <button 
          className={`portal-btn-${activeTab === 'taxTables' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('taxTables')}
          style={{ minWidth: '180px', padding: '12px 24px', fontWeight: 900, borderRadius: '12px' }}
        >
          <i className="fas fa-percentage mr-2"></i> Statutory Tax Tables
        </button>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
              {activeTab === 'allowances' ? 'Standard Allowance Matrix' : activeTab === 'deductions' ? 'Standard Deduction Matrix' : 'Institutional Tax Architectures'}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>
               Manage localized {activeTab} parameters for automated payroll reconciliation.
            </p>
          </div>
          <button 
            className="portal-btn-primary"
            onClick={() => {
              if (activeTab === 'allowances') setShowAddAllowance(!showAddAllowance);
              else if (activeTab === 'deductions') setShowAddDeduction(!showAddDeduction);
              else setShowAddTaxTable(!showAddTaxTable);
            }}
            style={{ padding: '12px 28px', fontWeight: 900 }}
          >
            <i className={`fas fa-${(activeTab === 'allowances' ? showAddAllowance : activeTab === 'deductions' ? showAddDeduction : showAddTaxTable) ? 'times' : 'plus'} mr-2`}></i> 
            {(activeTab === 'allowances' ? showAddAllowance : activeTab === 'deductions' ? showAddDeduction : showAddTaxTable) ? 'Cancel Process' : `Define ${activeTab === 'allowances' ? 'Allowance' : activeTab === 'deductions' ? 'Deduction' : 'Tax Table'}`}
          </button>
        </div>

        {((activeTab === 'allowances' && showAddAllowance) || (activeTab === 'deductions' && showAddDeduction)) && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ background: '#f8fafc', padding: '40px', borderRadius: '24px', border: '1px solid #f1f5f9', marginBottom: '40px' }}>
            <form onSubmit={(e) => handleCreateModifier(activeTab === 'allowances' ? 'allowances' : 'deductions', e)}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="portal-label">Descriptor (e.g. {activeTab === 'allowances' ? 'Transport Subsidy' : 'Statutory NSSA Contribution'})</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    style={{ fontWeight: 800 }}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Default Strategic Value</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="portal-input"
                      value={formData.defaultValue} 
                      onChange={e => setFormData({...formData, defaultValue: parseFloat(e.target.value)})} 
                      style={{ fontWeight: 900, color: '#2563eb' }}
                    />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>{formData.isPercentage ? '%' : '$'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '32px', paddingBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', fontSize: '1rem', fontWeight: 800, color: '#475569' }}>
                    <input type="checkbox" style={{ width: '22px', height: '22px', accentColor: '#2563eb' }} checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} /> Recurring
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', fontSize: '1rem', fontWeight: 800, color: '#475569' }}>
                    <input type="checkbox" style={{ width: '22px', height: '22px', accentColor: '#059669' }} checked={formData.isPercentage} onChange={e => setFormData({...formData, isPercentage: e.target.checked})} /> Percentage
                  </label>
                </div>
                <button type="submit" className="portal-btn-primary" style={{ height: '56px', fontWeight: 900, background: '#059669' }}>Authorize Configuration</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'taxTables' && showAddTaxTable && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500" style={{ background: '#f8fafc', padding: '40px', borderRadius: '24px', border: '1px solid #f1f5f9', marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div className="form-group" style={{ flex: 1, marginRight: '40px' }}>
                 <label className="portal-label">Tax Table Designation</label>
                 <input 
                  type="text" 
                  className="portal-input"
                  value={taxData.name} 
                  onChange={e => setTaxData({...taxData, name: e.target.value})} 
                  style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e40af' }}
                />
              </div>
              <button onClick={handleCreateTaxTable} className="portal-btn-primary" style={{ fontWeight: 900, padding: '16px 40px', background: '#059669' }}>AUTHORIZE TAX TABLE</button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <button onClick={addTaxBand} className="portal-btn-ghost" style={{ fontSize: '0.9rem', fontWeight: 900, padding: '10px 24px', borderRadius: '12px' }}>
                <i className="fas fa-plus-circle mr-2"></i> Append Tax Bracket
              </button>
            </div>

            <div className="table-responsive" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '8px' }}>
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Min Principal</th>
                    <th>Max Principal</th>
                    <th style={{ textAlign: 'center' }}>Marginal Rate %</th>
                    <th>Statutory Fixed Sum</th>
                    <th style={{ textAlign: 'right' }}>Management</th>
                  </tr>
                </thead>
                <tbody>
                  {taxData.bands.map((band, idx) => (
                    <tr key={idx}>
                      <td><input type="number" className="portal-input" value={band.minIncome} onChange={e => updateTaxBand(idx, 'minIncome', parseFloat(e.target.value))} style={{ width: '160px', fontWeight: 900 }} /></td>
                      <td><input type="number" className="portal-input" value={band.maxIncome || ''} onChange={e => updateTaxBand(idx, 'maxIncome', parseFloat(e.target.value))} style={{ width: '160px', fontWeight: 900 }} placeholder="MAX" /></td>
                      <td style={{ textAlign: 'center' }}><input type="number" className="portal-input" value={band.rate} onChange={e => updateTaxBand(idx, 'rate', parseFloat(e.target.value))} style={{ width: '120px', fontWeight: 900, textAlign: 'center', color: '#2563eb' }} /></td>
                      <td><input type="number" className="portal-input" value={band.fixedAmount} onChange={e => updateTaxBand(idx, 'fixedAmount', parseFloat(e.target.value))} style={{ width: '160px', fontWeight: 900, color: '#059669' }} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => setTaxData({...taxData, bands: taxData.bands.filter((_, i) => i !== idx)})} className="portal-btn-ghost" style={{ color: '#dc2626', padding: '10px' }}><i className="fas fa-minus-circle"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab !== 'taxTables' ? (
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Configuration Descriptor</th>
                  <th style={{ textAlign: 'center', width: '15%' }}>Operational Logic</th>
                  <th style={{ textAlign: 'center', width: '15%' }}>Valuation Type</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Strategic Default</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Management</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '100px' }}>
                      <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                      <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing strategic parameters...</p>
                    </td>
                  </tr>
                ) : (Array.isArray(activeTab === 'allowances' ? allowances : deductions) ? (activeTab === 'allowances' ? allowances : deductions) : []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '120px 24px', color: '#94a3b8' }}>
                      <i className="fas fa-cog" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                      <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Configurations cataloged</h3>
                      <p style={{ margin: 0, fontWeight: 600 }}>Localized payroll parameters will be rendered here.</p>
                    </td>
                  </tr>
                ) : (activeTab === 'allowances' ? allowances : deductions).map((item) => (
                  <tr key={item.id}>
                    <td><div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{item.name}</div></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="status-badge" style={{ 
                        background: item.isRecurring ? '#ecfdf5' : '#f1f5f9', 
                        color: item.isRecurring ? '#059669' : '#475569',
                        fontWeight: 900, fontSize: '0.7rem', border: `1px solid ${item.isRecurring ? '#d1fae5' : '#f1f5f9'}`
                      }}>
                        {item.isRecurring ? 'RECURRING CYCLE' : 'AD-HOC ADJUSTMENT'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="status-badge" style={{ 
                        background: item.isPercentage ? '#eff6ff' : '#f8fafc', 
                        color: item.isPercentage ? '#2563eb' : '#64748b',
                        fontWeight: 900, fontSize: '0.7rem', border: `1px solid ${item.isPercentage ? '#dbeafe' : '#f1f5f9'}`
                      }}>
                        {item.isPercentage ? 'PERCENTAGE BASED' : 'FLAT MONETARY'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                       <span style={{ fontWeight: 900, color: item.isPercentage ? '#2563eb' : '#059669', fontSize: '1.1rem' }}>
                        {item.isPercentage ? `${item.defaultValue}%` : `$${(item.defaultValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                       </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button className="portal-btn-ghost" style={{ padding: '8px', color: '#2563eb' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-pencil-alt"></i></button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', color: '#dc2626' }} onClick={() => handleDeleteModifier(activeTab as any, item.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '40px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px' }}>
                <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing tax architectures...</p>
              </div>
            ) : (Array.isArray(taxTables) ? taxTables : []).length === 0 ? (
               <div style={{ textAlign: 'center', padding: '120px 24px', color: '#94a3b8' }}>
                <i className="fas fa-percentage" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Statutory Tax Tables cataloged</h3>
                <p style={{ margin: 0, fontWeight: 600 }}>Authorized statutory tax configurations will be rendered here.</p>
              </div>
            ) : (Array.isArray(taxTables) ? taxTables : []).map(t => (
              <div key={t.id} style={{ background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1e40af' }}>{t.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                       <span className="status-badge" style={{ fontSize: '0.65rem', fontWeight: 900, background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}>
                        AUTHORIZED ARCHITECTURE
                      </span>
                    </div>
                  </div>
                  <div className="action-buttons">
                    <button className="portal-btn-ghost" style={{ padding: '8px', color: '#2563eb' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-pencil-alt"></i></button>
                    <button className="portal-btn-ghost" style={{ padding: '8px', color: '#dc2626' }} onClick={() => handleDeleteModifier('tax-tables', t.id)}><i className="fas fa-trash"></i></button>
                  </div>
                </div>
                <div className="table-responsive" style={{ padding: '16px' }}>
                  <table className="management-table" style={{ background: 'transparent' }}>
                    <thead>
                      <tr>
                        <th>Bracket Min</th>
                        <th>Bracket Max</th>
                        <th style={{ textAlign: 'center' }}>Marginal Rate %</th>
                        <th style={{ textAlign: 'right' }}>Statutory Fixed Sum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(t.bands) ? t.bands : []).map((band: any) => (
                        <tr key={band.id}>
                          <td><span style={{ fontWeight: 900, color: '#1e293b' }}>${(band.minIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                          <td><span style={{ fontWeight: 800, color: '#64748b' }}>{band.maxIncome ? `$${(band.maxIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'FISCAL CEILING'}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="status-badge" style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 900, fontSize: '0.85rem', padding: '6px 16px', border: '1px solid #dbeafe' }}>
                              {(band.rate || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 900, color: '#059669', fontSize: '1rem' }}>${(band.fixedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (isEmbedded) {
    return innerContent;
  }

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Institutional Payroll Strategy</h1>
          <p>Configure automated tax tables, strategic allowances, and mandatory deductions for centralized human capital management.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', fontWeight: 900 }}>
           <i className="fas fa-calculator mr-2"></i>FISCAL CONFIGURATION
        </div>
      </div>
      {innerContent}
    </div>
  );
}
