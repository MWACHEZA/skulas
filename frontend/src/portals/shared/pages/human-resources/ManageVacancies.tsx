import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import { useToast } from '../../../../context/ToastContext';

interface Vacancy {
  id: string;
  jobTitle: string;
  recruiter: { id?: string; name?: string; firstName?: string; lastName?: string; email?: string };
  startDate: string;
  endDate: string;
  status: string;
}

export default function ManageVacancies() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sub-config modal visibility states
  const [isSkillTaggingOpen, setIsSkillTaggingOpen] = useState(false);
  const [isInterviewConfigOpen, setIsInterviewConfigOpen] = useState(false);
  const [isJobTypeConfigOpen, setIsJobTypeConfigOpen] = useState(false);
  const [isExpLevelConfigOpen, setIsExpLevelConfigOpen] = useState(false);

  // Sub-modal input states
  const [newSkillTag, setNewSkillTag] = useState('');
  const [interviewTemplate, setInterviewTemplate] = useState('Standard (3 Rounds: Screening - Technical - Culture)');
  const [interviewRoundCount, setInterviewRoundCount] = useState(3);
  const [jobTypes, setJobTypes] = useState<string[]>(['Full Time', 'Part Time', 'Contract', 'Internship']);
  const [newJobType, setNewJobType] = useState('');
  const [newExpLevelName, setNewExpLevelName] = useState('');
  const [newExpYears, setNewExpYears] = useState('');

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(vacancies.length / itemsPerPage);
  const paginatedVacancies = vacancies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const { register, handleSubmit, reset, setValue, watch } = useForm();

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
      const [deptRes, userRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/users')
      ]);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      const usersData = Array.isArray(userRes.data?.users) ? userRes.data.users : (Array.isArray(userRes.data) ? userRes.data : []);
      setRecruiters(usersData);
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
        jobTitle: data.jobTitle?.trim(),
        departmentId: data.departmentId || departments[0]?.id,
        skills: data.skills?.trim(),
        location: data.location?.trim() || 'Main Campus',
        interviewRounds: parseInt(data.interviewRounds, 10) || 1,
        numberOfVacancies: parseInt(data.numberOfVacancies, 10) || 1,
        startDate: data.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: data.endDate || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        status: data.status || 'Active',
        recruiterId: data.recruiterId || recruiters[0]?.id,
        jobType: data.jobType || 'Full Time',
        workExperience: data.workExperience || 'Entry Level',
        currency: data.currency || 'USD',
        showPaymentMethodBy: data.showPaymentMethodBy || 'Month',
        rate: data.rate || 'Negotiable',
        isRemote: Boolean(data.isRemote),
        discloseSalary: Boolean(data.discloseSalary),
        shortDescription: data.shortDescription || '',
        fullDescription: data.fullDescription || '',
        requiredFields: JSON.stringify(requiredFields)
      };

      if (editingId) {
        await api.put(`/api/hr/vacancies/${editingId}`, payload);
        showToast('Vacancy updated successfully!', 'success');
      } else {
        await api.post('/api/hr/vacancies', payload);
        showToast('Vacancy added successfully!', 'success');
      }
      setIsModalOpen(false);
      setEditingId(null);
      reset();
      fetchVacancies();
    } catch (error: any) {
      console.error('Failed to add vacancy', error?.response?.data || error);
      showToast(`Failed to ${editingId ? 'update' : 'add'} vacancy: ${error?.response?.data?.error || error.message}`, 'error');
    }
  };

  const deleteVacancy = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vacancy?')) return;
    try {
      await api.delete(`/api/hr/vacancies/${id}`);
      showToast('Vacancy deleted successfully!', 'success');
      fetchVacancies();
    } catch (error) {
      console.error('Failed to delete vacancy', error);
      showToast('Failed to delete vacancy', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = ['Job Title', 'Recruiter', 'Start Date', 'End Date', 'Status'];
    const rows = vacancies.map(v => [
      v.jobTitle || '',
      v.recruiter?.name || `${v.recruiter?.firstName || ''} ${v.recruiter?.lastName || ''}`.trim() || 'Unassigned',
      v.startDate ? new Date(v.startDate).toLocaleDateString() : '',
      v.endDate ? new Date(v.endDate).toLocaleDateString() : '',
      v.status || ''
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vacancies_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = () => {
    const rows = vacancies.map(v => `
      <tr>
        <td style="border: 1px solid #cccccc; padding: 8px;">${v.jobTitle || ''}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${v.recruiter?.name || `${v.recruiter?.firstName || ''} ${v.recruiter?.lastName || ''}`.trim() || 'Unassigned'}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${v.startDate ? new Date(v.startDate).toLocaleDateString() : ''}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${v.endDate ? new Date(v.endDate).toLocaleDateString() : ''}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${v.status || ''}</td>
      </tr>
    `).join('');
    
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Vacancies Records</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cccccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Vacancies Records</h2>
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Recruiter</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vacancies_registry_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unified button styling for all 4 inline helper buttons
  const helperBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '0 16px',
    height: '42px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>VACANCIES</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Manage job openings and open recruitment positions</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            reset({
              jobTitle: '',
              departmentId: departments[0]?.id || '',
              skills: '',
              location: 'Main Campus',
              interviewRounds: 3,
              numberOfVacancies: 1,
              startDate: format(new Date(), 'yyyy-MM-dd'),
              endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              status: 'Active',
              recruiterId: recruiters[0]?.id || '',
              jobType: 'Full Time',
              workExperience: '2+ Years',
              currency: 'USD',
              showPaymentMethodBy: 'Month',
              rate: 'Negotiable',
              isRemote: false,
              discloseSalary: true,
              reqPhoto: true,
              reqResume: true,
              reqDob: false,
              reqGender: false,
              shortDescription: '',
              fullDescription: ''
            });
            setIsModalOpen(true);
          }}
          className="portal-btn-primary"
          style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <i className="fas fa-plus-circle"></i> ADD VACANCY
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleExportExcel} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-file-excel"></i> Excel
            </button>
            <button onClick={handleExportWord} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-file-word"></i> Word
            </button>
            <button onClick={handlePrint} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-print"></i> Print
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Search:</span>
            <input type="text" className="portal-input" style={{ width: '200px', padding: '8px 12px' }} placeholder="Search vacancies..." />
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
              ) : paginatedVacancies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b' }}></i>
                      <span>No vacancies registered yet</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVacancies.map((vacancy) => (
                  <tr key={vacancy.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{vacancy.jobTitle}</td>
                    <td>{vacancy.recruiter?.name || `${vacancy.recruiter?.firstName || ''} ${vacancy.recruiter?.lastName || ''}`.trim() || vacancy.recruiter?.email || 'Unassigned'}</td>
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
                        color: vacancy.status === 'Active' ? 'var(--portal-success, #38a169)' : '#718096' 
                      }}>
                        {vacancy.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingId(vacancy.id);
                            const requiredFields = (vacancy as any).requiredFields ? JSON.parse((vacancy as any).requiredFields) : [];
                            reset({
                              ...vacancy,
                              startDate: vacancy.startDate ? format(new Date(vacancy.startDate), 'yyyy-MM-dd') : '',
                              endDate: vacancy.endDate ? format(new Date(vacancy.endDate), 'yyyy-MM-dd') : '',
                              reqPhoto: requiredFields.includes('Photo'),
                              reqResume: requiredFields.includes('Resume'),
                              reqDob: requiredFields.includes('Date of Birth'),
                              reqGender: requiredFields.includes('Gender'),
                            });
                            setIsModalOpen(true);
                          }}
                          className="portal-btn-ghost"
                          style={{ padding: '8px', width: '36px', height: '36px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => deleteVacancy(vacancy.id)}
                          className="portal-btn-ghost"
                          style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {vacancies.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, vacancies.length)} of {vacancies.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || vacancies.length === 0}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Vacancy Modal with Pinned Footer */}
      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            <div className="portal-modal-header" style={{ flexShrink: 0, padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{editingId ? 'EDIT VACANCY' : 'ADD VACANCY'}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{editingId ? 'Update job vacancy details' : 'Register a new job vacancy'}</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit, (err) => { 
              const keys = Object.keys(err || {});
              console.log('FORM VALIDATION FAILED ON FIELDS:', keys);
              keys.forEach(k => console.log(`Field "${k}" failed:`, err[k]?.type));
              showToast(`Missing required field: ${keys.join(', ')}`, 'error'); 
            })} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              <div className="portal-modal-body" style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(90vh - 160px)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label className="portal-label">Job title <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('jobTitle', { required: true })} id="vacancyJobTitleInput" type="text" placeholder="Job title" className="portal-input" />
                  </div>
                  <div>
                    <label className="portal-label">Department <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('departmentId', { required: true })} className="portal-input">
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Skills Field with Unified Add Button */}
                  <div>
                    <label className="portal-label">Skills <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        {...register('skills', { required: true })} 
                        id="vacancySkillsInput" 
                        type="text" 
                        placeholder="e.g. Mathematics, STEM, Robotics" 
                        className="portal-input" 
                      />
                      <button 
                        type="button" 
                        id="openSkillModalBtn"
                        className="portal-btn-secondary" 
                        style={helperBtnStyle} 
                        onClick={() => {
                          setNewSkillTag('');
                          setIsSkillTaggingOpen(true);
                        }}
                      >
                        <i className="fas fa-plus-circle" style={{ color: 'var(--school-primary, #0056b3)' }}></i> Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="portal-label">Location <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('location', { required: true })} id="vacancyLocationInput" type="text" placeholder="e.g. Main Campus, Harare" className="portal-input" />
                  </div>

                  {/* Interview Rounds with Unified Add Button */}
                  <div>
                    <label className="portal-label">Interview rounds <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        {...register('interviewRounds', { required: true })} 
                        id="vacancyInterviewRoundsInput" 
                        type="number" 
                        defaultValue={1}
                        className="portal-input" 
                      />
                      <button 
                        type="button" 
                        id="openInterviewModalBtn"
                        className="portal-btn-secondary" 
                        style={helperBtnStyle} 
                        onClick={() => setIsInterviewConfigOpen(true)}
                      >
                        <i className="fas fa-plus-circle" style={{ color: 'var(--school-primary, #0056b3)' }}></i> Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="portal-label">Number of Vacancies <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('numberOfVacancies', { required: true })} type="number" defaultValue={1} placeholder="Number of Vacancies" className="portal-input" />
                  </div>

                  <div>
                    <label className="portal-label">Start date <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('startDate', { required: true })} type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="portal-input" />
                  </div>
                  <div>
                    <label className="portal-label">End date <span style={{ color: 'red' }}>*</span></label>
                    <input {...register('endDate', { required: true })} type="date" defaultValue={format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')} className="portal-input" />
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
                      {recruiters.map((r: any) => {
                        const displayName = r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email || 'Admin';
                        return (
                          <option key={r.id} value={r.id}>{displayName} {r.role ? `(${r.role})` : ''}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Job Type with Unified Add Button */}
                  <div>
                    <label className="portal-label">Job type <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select {...register('jobType', { required: true })} className="portal-input">
                        {jobTypes.map(jt => (
                          <option key={jt} value={jt}>{jt}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        id="openJobTypeModalBtn"
                        className="portal-btn-secondary" 
                        style={helperBtnStyle} 
                        onClick={() => {
                          setNewJobType('');
                          setIsJobTypeConfigOpen(true);
                        }}
                      >
                        <i className="fas fa-plus-circle" style={{ color: 'var(--school-primary, #0056b3)' }}></i> Add
                      </button>
                    </div>
                  </div>

                  {/* Work Experience with Unified Add Button */}
                  <div>
                    <label className="portal-label">Work experience <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        {...register('workExperience', { required: true })} 
                        id="vacancyWorkExpInput" 
                        type="text" 
                        placeholder="e.g. 3+ Years, Senior" 
                        className="portal-input" 
                      />
                      <button 
                        type="button" 
                        id="openExpModalBtn"
                        className="portal-btn-secondary" 
                        style={helperBtnStyle} 
                        onClick={() => {
                          setNewExpLevelName('');
                          setNewExpYears('');
                          setIsExpLevelConfigOpen(true);
                        }}
                      >
                        <i className="fas fa-plus-circle" style={{ color: 'var(--school-primary, #0056b3)' }}></i> Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="portal-label">Currency <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('currency', { required: true })} className="portal-input">
                      <option value="USD">USD</option>
                      <option value="ZiG">ZiG</option>
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
                    <input {...register('rate', { required: true })} type="text" defaultValue="Negotiable" className="portal-input" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input {...register('isRemote')} type="checkbox" id="isRemote" style={{ width: '16px', height: '16px' }} />
                    <label htmlFor="isRemote" style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 500, cursor: 'pointer' }}>Is this a remote job?</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input {...register('discloseSalary')} type="checkbox" id="discloseSalary" style={{ width: '16px', height: '16px' }} defaultChecked />
                    <label htmlFor="discloseSalary" style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: 500, cursor: 'pointer' }}>Disclose salary on website?</label>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginTop: '10px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px', fontWeight: 600 }}>
                    Required Fields: Selected field will be visible and mandatory during Job Application Form
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqPhoto')} type="checkbox" id="reqPhoto" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqPhoto" style={{ fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}>Photo</label></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqResume')} type="checkbox" id="reqResume" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqResume" style={{ fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}>Resume</label></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqDob')} type="checkbox" id="reqDob" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqDob" style={{ fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}>Date of Birth</label></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input {...register('reqGender')} type="checkbox" id="reqGender" style={{ width: '16px', height: '16px' }} /> <label htmlFor="reqGender" style={{ fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}>Gender</label></div>
                  </div>
                </div>

                <div>
                  <label className="portal-label">Short Description</label>
                  <textarea {...register('shortDescription')} id="vacancyShortDescInput" rows={2} placeholder="Brief summary of the vacancy..." className="portal-input"></textarea>
                </div>

                <div>
                  <label className="portal-label">Full Description</label>
                  <textarea {...register('fullDescription')} id="vacancyFullDescInput" rows={4} placeholder="Detailed role responsibilities and expectations..." className="portal-input"></textarea>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="portal-modal-footer" style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }} className="portal-btn-neutral">
                  Cancel
                </button>
                <button type="submit" id="saveVacancyBtn" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-save"></i> Save Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Skill Tagging Sub-Modal */}
      {isSkillTaggingOpen && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: '440px', width: '90%', padding: '24px' }}>
            <div className="portal-modal-header" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add Skill Tag</h3>
              <button type="button" className="portal-btn-ghost" onClick={() => setIsSkillTaggingOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 0 }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Skill Name / Specialization</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  value={newSkillTag}
                  onChange={(e) => setNewSkillTag(e.target.value)}
                  placeholder="e.g. STEM Education, React.js, Lab Safety" 
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {['Mathematics', 'Physics', 'STEM', 'Curriculum Planning', 'ICT'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewSkillTag(preset)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer' }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="portal-btn-secondary" onClick={() => setIsSkillTaggingOpen(false)}>Cancel</button>
              <button 
                type="button" 
                id="applySkillBtn"
                className="portal-btn-primary" 
                onClick={() => {
                  if (!newSkillTag.trim()) {
                    showToast('Please enter a skill tag name', 'warning');
                    return;
                  }
                  const el = document.getElementById('vacancySkillsInput') as HTMLInputElement;
                  const cur = el?.value || watch('skills') || '';
                  const updated = cur ? `${cur}, ${newSkillTag.trim()}` : newSkillTag.trim();
                  setValue('skills', updated, { shouldValidate: true, shouldDirty: true });
                  if (el) el.value = updated;
                  showToast(`Added skill tag: "${newSkillTag.trim()}"`, 'success');
                  setNewSkillTag('');
                  setIsSkillTaggingOpen(false);
                }}
              >
                Apply Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Advanced Interview Config Sub-Modal */}
      {isInterviewConfigOpen && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: '460px', width: '90%', padding: '24px' }}>
            <div className="portal-modal-header" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Interview Rounds Configuration</h3>
              <button type="button" className="portal-btn-ghost" onClick={() => setIsInterviewConfigOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 0 }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Interview Template Workflow</label>
                <select 
                  className="portal-input"
                  value={interviewTemplate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInterviewTemplate(val);
                    if (val.includes('3 Rounds')) setInterviewRoundCount(3);
                    else if (val.includes('4 Rounds')) setInterviewRoundCount(4);
                    else if (val.includes('2 Rounds')) setInterviewRoundCount(2);
                    else if (val.includes('1 Round')) setInterviewRoundCount(1);
                  }}
                >
                  <option value="Standard (3 Rounds: Screening - Technical - Culture)">Standard (3 Rounds: Screening - Technical - Culture)</option>
                  <option value="Teaching Staff (3 Rounds: Screening - Demo Lesson - Panel)">Teaching Staff (3 Rounds: Screening - Demo Lesson - Panel)</option>
                  <option value="Executive (4 Rounds: Screening - Panel - Board - Reference)">Executive (4 Rounds: Screening - Panel - Board - Reference)</option>
                  <option value="Accelerated (2 Rounds: Screening - Final Interview)">Accelerated (2 Rounds: Screening - Final Interview)</option>
                  <option value="Single Round (1 Round: Comprehensive Interview)">Single Round (1 Round: Comprehensive Interview)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Number of Rounds</label>
                <input 
                  type="number" 
                  min={1} 
                  max={10} 
                  className="portal-input" 
                  value={interviewRoundCount}
                  onChange={(e) => setInterviewRoundCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="portal-btn-secondary" onClick={() => setIsInterviewConfigOpen(false)}>Cancel</button>
              <button 
                type="button" 
                id="applyInterviewConfigBtn"
                className="portal-btn-primary" 
                onClick={() => {
                  setValue('interviewRounds', interviewRoundCount, { shouldValidate: true, shouldDirty: true });
                  const el = document.getElementById('vacancyInterviewRoundsInput') as HTMLInputElement;
                  if (el) el.value = String(interviewRoundCount);
                  showToast(`Configured: ${interviewRoundCount} interview rounds applied`, 'success');
                  setIsInterviewConfigOpen(false);
                }}
              >
                Apply Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Job Type Sub-Modal */}
      {isJobTypeConfigOpen && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: '440px', width: '90%', padding: '24px' }}>
            <div className="portal-modal-header" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Define New Job Type</h3>
              <button type="button" className="portal-btn-ghost" onClick={() => setIsJobTypeConfigOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 0 }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Job Type Title</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  value={newJobType}
                  onChange={(e) => setNewJobType(e.target.value)}
                  placeholder="e.g. Term-Time Only, Adjunct, Locum, Internship" 
                  autoFocus
                />
              </div>
            </div>
            <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="portal-btn-secondary" onClick={() => setIsJobTypeConfigOpen(false)}>Cancel</button>
              <button 
                type="button" 
                id="addJobTypeBtn"
                className="portal-btn-primary" 
                onClick={() => {
                  if (!newJobType.trim()) {
                    showToast('Please specify a job type title', 'warning');
                    return;
                  }
                  const trimmed = newJobType.trim();
                  if (!jobTypes.includes(trimmed)) {
                    setJobTypes(prev => [...prev, trimmed]);
                  }
                  setValue('jobType', trimmed, { shouldValidate: true, shouldDirty: true });
                  showToast(`Added job type "${trimmed}" and selected!`, 'success');
                  setNewJobType('');
                  setIsJobTypeConfigOpen(false);
                }}
              >
                Add & Select Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Experience Level Sub-Modal */}
      {isExpLevelConfigOpen && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: '440px', width: '90%', padding: '24px' }}>
            <div className="portal-modal-header" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Define Experience Level</h3>
              <button type="button" className="portal-btn-ghost" onClick={() => setIsExpLevelConfigOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 0 }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Seniority / Level Designation</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  value={newExpLevelName}
                  onChange={(e) => setNewExpLevelName(e.target.value)}
                  placeholder="e.g. Mid-Weight, Senior, Lead, Entry-Level" 
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Years of Experience Baseline</label>
                <input 
                  type="number" 
                  min={0} 
                  className="portal-input" 
                  value={newExpYears}
                  onChange={(e) => setNewExpYears(e.target.value)}
                  placeholder="e.g. 5" 
                />
              </div>
            </div>
            <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="portal-btn-secondary" onClick={() => setIsExpLevelConfigOpen(false)}>Cancel</button>
              <button 
                type="button" 
                id="applyExpLevelBtn"
                className="portal-btn-primary" 
                onClick={() => {
                  if (!newExpLevelName.trim()) {
                    showToast('Please specify an experience level name', 'warning');
                    return;
                  }
                  const formatted = newExpYears.trim() 
                    ? `${newExpLevelName.trim()} (${newExpYears.trim()}+ Years)` 
                    : newExpLevelName.trim();
                  setValue('workExperience', formatted, { shouldValidate: true, shouldDirty: true });
                  const el = document.getElementById('vacancyWorkExpInput') as HTMLInputElement;
                  if (el) el.value = formatted;
                  showToast(`Set work experience to "${formatted}"`, 'success');
                  setNewExpLevelName('');
                  setNewExpYears('');
                  setIsExpLevelConfigOpen(false);
                }}
              >
                Apply Experience Level
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
