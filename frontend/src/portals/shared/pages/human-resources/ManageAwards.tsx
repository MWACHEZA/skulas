import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';

interface AwardEntry {
  id: string;
  awardName: string;
  gift: string;
  amount: number;
  date: string;
  user: { name: string };
}

export default function ManageAwards() {
  const { t } = useTerminology();
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchOptions();
    fetchAwards();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/api/payroll/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    
    }
  };

  const fetchAwards = async () => {
    try {
      const response = await api.get('/api/awards');
      setAwards(response.data);
    } catch (error) {
      console.error('Failed to fetch awards', error);
    
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        amount: parseFloat(data.amount)
      };
      await api.post('/api/awards', payload);
      alert('Award saved successfully!');
      reset();
      fetchAwards();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to save award', error);
      alert('Failed to save award.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* List Awards Table */}
      <div className="portal-card" style={{ width: '100%' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>RECORDS OF AWARDS</h3>
            <p>View history of all recognized {t('staff').toLowerCase()} accomplishments</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="portal-btn-primary"
            style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-plus-circle"></i> ADD {t('staff').toUpperCase()} AWARD
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Copy</button>
              <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>CSV</button>
              <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Excel</button>
              <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>PDF</button>
              <button className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Print</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Search:</span>
              <input type="text" className="portal-input" style={{ width: '150px', padding: '8px 12px' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="management-table">
              <thead>
                <tr>
                  <th>AWARD NAME</th>
                  <th>GIFT</th>
                  <th>AMOUNT</th>
                  <th>AWARDED {t('staff').toUpperCase()}</th>
                  <th>DATE</th>
                  <th style={{ textAlign: 'center' }}>OPTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading awards...</td>
                  </tr>
                ) : awards.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b' }}></i>
                        <span>No data available in table</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  awards.map(award => (
                    <tr key={award.id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{award.awardName}</td>
                      <td>{award.gift}</td>
                      <td style={{ fontWeight: 600, color: 'var(--portal-success)' }}>${award.amount.toFixed(2)}</td>
                      <td style={{ fontWeight: 500 }}>{award.user?.name}</td>
                      <td>{award.date ? format(new Date(award.date), 'dd/MM/yyyy') : 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                          <button className="portal-btn-ghost" style={{ color: '#00bcd4', padding: '6px', minWidth: 'auto', display: 'inline-block' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="portal-btn-ghost" style={{ color: 'var(--portal-danger)', padding: '6px', minWidth: 'auto', display: 'inline-block' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.9rem' }}>
              <span>Showing {awards.length > 0 ? 1 : 0} to {awards.length} of {awards.length} entries</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
                <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Award Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>ADD {t('staff').toUpperCase()} AWARD</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Recognize and award achievements of the school {t('staff').toLowerCase()} members</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label className="portal-label">Award name <span style={{ color: 'red' }}>*</span></label>
                  <input {...register('awardName', { required: true })} type="text" className="portal-input" />
                </div>
                <div>
                  <label className="portal-label">Gift / Reward</label>
                  <input {...register('gift')} type="text" className="portal-input" />
                </div>
                <div>
                  <label className="portal-label">Cash Amount ($) <span style={{ color: 'red' }}>*</span></label>
                  <input {...register('amount', { required: true })} type="number" className="portal-input" />
                </div>
                <div>
                  <label className="portal-label">Awarded {t('staff')} <span style={{ color: 'red' }}>*</span></label>
                  <select {...register('userId', { required: true })} className="portal-input">
                    <option value="">Select {t('staff')}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="portal-label">Date</label>
                  <input {...register('date')} type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="portal-input" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-neutral">
                    Cancel
                  </button>
                  <button disabled={submitting} type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Save Award
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
