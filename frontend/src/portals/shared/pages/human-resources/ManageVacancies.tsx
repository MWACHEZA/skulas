import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';

interface Vacancy {
  id: string;
  jobTitle: string;
  recruiter: { firstName: string; lastName: string; email: string };
  startDate: string;
  endDate: string;
  status: string;
}

export default function ManageVacancies() {
  const { t } = useTerminology();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [recruiters, setRecruiters] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const { register, handleSubmit, reset, control } = useForm();

  useEffect(() => {
    fetchVacancies();
    fetchFormOptions();
  }, []);

  const fetchVacancies = async () => {
    try {
      const response = await api.get('/api/hr/vacancies');
      setVacancies(response.data);
    } catch (error) {
      console.error('Failed to fetch vacancies', error);
    
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      // Assuming existing endpoints for departments and users exist
      const [deptRes, userRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/users?role=SCHOOL_ADMIN') // Just an example, fetching admins/staff as recruiters
      ]);
      setDepartments(deptRes.data);
      setRecruiters(userRes.data.users || userRes.data);
    } catch (error) {
      console.error('Failed to fetch options', error);
    
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Clean up required fields JSON
      const requiredFields = [
        data.reqPhoto && 'Photo',
        data.reqResume && 'Resume',
        data.reqDob && 'Date of Birth',
        data.reqGender && 'Gender'
      ].filter(Boolean);

      const payload = {
        ...data,
        requiredFields: JSON.stringify(requiredFields)
      };

      await api.post('/api/hr/vacancies', payload);
      alert('Vacancy added successfully!');
      setIsAdding(false);
      reset();
      fetchVacancies();
    } catch (error) {
      console.error('Failed to add vacancy', error);
      alert('Failed to add vacancy');
    }
  };

  const deleteVacancy = async (id: string) => {
    if (!window.confirm('Delete this vacancy?')) return;
    try {
      await api.delete(`/api/hr/vacancies/${id}`);
      fetchVacancies();
    } catch (error) {
      console.error('Failed to delete vacancy', error);
    
    }
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>VACANCIES</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="portal-btn-primary"
          style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fas fa-plus-circle"></i> ADD VACANCY
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
            <input type="text" className="portal-input" style={{ width: '200px', padding: '8px 12px' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="management-table">
            <thead>
              <tr>
                <th>JOB TITLE</th>
                <th>RECRUITER</th>
                <th>START DATE</th>
                <th>END DATE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading vacancies...</td>
                </tr>
              ) : vacancies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b' }}></i>
                      <span>No data available in table</span>
                    </div>
                  </td>
                </tr>
              ) : (
                vacancies.map((vacancy) => (
                  <tr key={vacancy.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{vacancy.jobTitle}</td>
                    <td>{vacancy.recruiter?.firstName} {vacancy.recruiter?.lastName}</td>
                    <td>{vacancy.startDate ? format(new Date(vacancy.startDate), 'dd/MM/yyyy') : 'N/A'}</td>
                    <td>{vacancy.endDate ? format(new Date(vacancy.endDate), 'dd/MM/yyyy') : 'N/A'}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: vacancy.status === 'Active' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(113, 128, 150, 0.1)', 
                        color: vacancy.status === 'Active' ? 'var(--portal-success)' : '#718096' 
                      }}>
                        {vacancy.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => deleteVacancy(vacancy.id)}
                        className="portal-btn-ghost"
                        style={{ color: 'var(--portal-danger)', padding: '6px', minWidth: 'auto', display: 'inline-block' }}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.9rem' }}>
            <span>Showing {vacancies.length > 0 ? 1 : 0} to {vacancies.length} of {vacancies.length} entries</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
              <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '800px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>ADD VACANCY</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Register a new job vacancy</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label className="portal-label">Job title <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('jobTitle', { required: true })} type="text" placeholder="Job title" className="portal-input" />
                  </div>
                  <div>
                    <label className="portal-label">Department <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('departmentId', { required: true })} className="portal-input">
                      <option value="">Select</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Skills <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input {...register('skills', { required: true })} type="text" className="portal-input" />
                      <button type="button" className="portal-btn-ghost" style={{ color: 'var(--school-primary, #0056b3)', whiteSpace: 'nowrap' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-plus-circle"></i> Add</button>
                    </div>
                  </div>

                  <div>
                    <label className="portal-label">Location <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('location', { required: true })} type="text" className="portal-input" />
                  </div>
                  <div>
                    <label className="portal-label">Interview rounds <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input {...register('interviewRounds', { required: true })} type="number" defaultValue={1} className="portal-input" />
                      <button type="button" className="portal-btn-ghost" style={{ color: 'var(--school-primary, #0056b3)', whiteSpace: 'nowrap' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-plus-circle"></i> Add</button>
                    </div>
                  </div>
                  <div>
                    <label className="portal-label">Number of Vacancies <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('numberOfVacancies', { required: true })} type="number" placeholder="Number of Vacancies" className="portal-input" />
                  </div>

                  <div>
                    <label className="portal-label">Start date <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('startDate', { required: true })} type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="portal-input" />
                  </div>
                  <div>
                    <label className="portal-label">End date <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('endDate', { required: true })} type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="portal-input" />
                  </div>
                  <div>
                    <label className="portal-label">Status <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('status', { required: true })} className="portal-input">
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="portal-label">Recruiter <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('recruiterId', { required: true })} className="portal-input">
                      <option value="">Select Recruiter</option>
                      {recruiters.map(r => (
                        <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Job type <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select {...register('jobType', { required: true })} className="portal-input">
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                      <button type="button" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', padding: '10px 16px' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-plus"></i></button>
                    </div>
                  </div>
                  <div>
                    <label className="portal-label">Work experience <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input {...register('workExperience', { required: true })} type="text" className="portal-input" />
                      <button type="button" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', padding: '10px 16px' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-plus"></i></button>
                    </div>
                  </div>

                  <div>
                    <label className="portal-label">Currency <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('currency', { required: true })} className="portal-input">
                      <option value="USD">USD</option>
                      <option value="Zimbabwean Dollar">Zimbabwean Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Show Payment Method By <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('showPaymentMethodBy', { required: true })} className="portal-input">
                      <option value="Month">Month</option>
                      <option value="Hour">Hour</option>
                      <option value="Year">Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Rate <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('rate', { required: true })} type="text" className="portal-input" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input {...register('isRemote')} type="checkbox" id="isRemote" style={{ width: '16px', height: '16px' }} />
                    <label htmlFor="isRemote" style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 500 }}>Is this a remote job?</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input {...register('discloseSalary')} type="checkbox" id="discloseSalary" style={{ width: '16px', height: '16px' }} />
                    <label htmlFor="discloseSalary" style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 500 }}>Disclose salary on website?</label>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginTop: '10px' }}>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px', fontWeight: 500 }}>
                    Required Fields: Selected field will be visible and considered as mandatory field during Job Application Form
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqPhoto')} type="checkbox" id="reqPhoto" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqPhoto" style={{ fontSize: '0.9rem', color: '#475569' }}>Photo</label></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqResume')} type="checkbox" id="reqResume" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqResume" style={{ fontSize: '0.9rem', color: '#475569' }}>Resume</label></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqDob')} type="checkbox" id="reqDob" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqDob" style={{ fontSize: '0.9rem', color: '#475569' }}>Date of Birth</label></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqGender')} type="checkbox" id="reqGender" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqGender" style={{ fontSize: '0.9rem', color: '#475569' }}>Gender</label></div>
                  </div>
                </div>

                <div>
                  <label className="portal-label">Short Description</label>
                  <textarea {...register('shortDescription')} rows={3} className="portal-input"></textarea>
                </div>

                <div>
                  <label className="portal-label">Full Description</label>
                  <textarea {...register('fullDescription')} rows={6} className="portal-input"></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsAdding(false)} className="portal-btn-neutral">
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-plus"></i> Save
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
