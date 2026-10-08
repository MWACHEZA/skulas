import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ReportDocument from './ReportDocument';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

export interface AcademicReportCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  requiredFilters: Array<'class' | 'term' | 'year' | 'examType' | 'subject'>;
}

export const ACADEMIC_REPORT_CATEGORIES: AcademicReportCategory[] = [
  {
    id: 'TERMLY_REPORTS',
    label: 'Termly Report Cards',
    description: 'Comprehensive student report cards with subject grades, remarks, and GPA summaries',
    icon: 'fa-graduation-cap',
    requiredFilters: ['term', 'year', 'class', 'examType']
  },
  {
    id: 'BROADSHEET',
    label: 'Class Broadsheet / Marksheet',
    description: 'Cross-subject master marksheet, totals, averages, and class position rankings',
    icon: 'fa-table',
    requiredFilters: ['term', 'year', 'class', 'examType']
  },
  {
    id: 'SUBJECT_ANALYSIS',
    label: 'Subject Analysis',
    description: 'Subject-specific pass rates, grade distribution charts, and cohort variance',
    icon: 'fa-chart-pie',
    requiredFilters: ['term', 'year', 'class', 'subject', 'examType']
  },
  {
    id: 'MERIT_FAILURE',
    label: 'Failure / Merit List',
    description: 'Honor roll academic merit lists and academic intervention / failure tracking',
    icon: 'fa-award',
    requiredFilters: ['term', 'year', 'class', 'examType']
  },
  {
    id: 'CA_SUMMARY',
    label: 'Continuous Assessment Summary',
    description: 'Cumulative aggregates of assignments, coursework, tests, and practicals',
    icon: 'fa-tasks',
    requiredFilters: ['term', 'year', 'class']
  }
];

export const EXAM_TYPES = [
  'End-of-Term Examination',
  'Mid-Term Assessment',
  'Continuous Assessment (CA)',
  'Mock / Trial Examination',
  'National Exam Preparedness'
] as const;

interface Props {
  role: 'ADMIN' | 'TEACHER';
  allowedTypes?: string[];
}

const ReportGeneratorWizard: React.FC<Props> = ({ role: _role, allowedTypes }) => {
  const [step, setStep] = useState(1);
  const { t, isMedical: _isMedical, isPoly } = useTerminology();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [reportType, setReportType] = useState('TERMLY_REPORTS');
  const [filters, setFilters] = useState({ 
    classId: '', 
    term: '', 
    year: new Date().getFullYear().toString(),
    examType: 'End-of-Term Examination',
    subjectId: ''
  });

  useEffect(() => {
    if (!filters.term) {
       setFilters(prev => ({ ...prev, term: isPoly ? 'Semester 1' : 'Term 1' }));
    }
  }, [isPoly]);

  const [dataList, setDataList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{ count: number, type: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [publishConfig, setPublishConfig] = useState({ 
    toStudent: true, 
    toParent: true 
  });
  const [globalComment, setGlobalComment] = useState('');
  const [autoPublish, setAutoPublish] = useState(false);

  const categories = useMemo(() => {
    return allowedTypes
      ? ACADEMIC_REPORT_CATEGORIES.filter(c => allowedTypes.includes(c.id) || (c.id === 'TERMLY_REPORTS' && allowedTypes.includes('ACADEMIC')))
      : ACADEMIC_REPORT_CATEGORIES;
  }, [allowedTypes]);

  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === reportType) || categories[0] || ACADEMIC_REPORT_CATEGORIES[0];
  }, [categories, reportType]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => (currentYear - 5 + i).toString());

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchTemplate();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/reports/classes');
      const classData = Array.isArray(res.data) ? res.data : [];
      setClasses(classData);
      
      // Auto-select if only one class exists (common for Class Teachers)
      if (classData.length === 1) {
        setFilters(prev => ({ ...prev, classId: classData[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch classes');
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      const subData = Array.isArray(res.data) ? res.data : [];
      setSubjects(subData);
    } catch (err) {
      console.error('Failed to fetch subjects');
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/api/reports/template');
      setTemplate(res.data);
    } catch (err) {
      console.error('Failed to fetch template');
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let endpoint = `/api/reports/preview?type=${reportType}&term=${filters.term}&year=${filters.year}&examType=${encodeURIComponent(filters.examType)}`;
      if (filters.classId) {
        endpoint += `&classId=${filters.classId}`;
      }
      if (filters.subjectId) {
        endpoint += `&subjectId=${filters.subjectId}`;
      }

      const res = await api.get(endpoint);
      setDataList(Array.isArray(res.data) ? res.data : []);
      setStep(2);
    } catch (err) {
      showToast('Failed to fetch data for academic report. Ensure all filters are set.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === dataList.length) setSelectedIds([]);
    else setSelectedIds(dataList.map(item => item.id));
  };

  const generatePDFBatch = async (isZip: boolean) => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setProgress(0);
    const zip = isZip ? new JSZip() : null;
    
    // Hidden container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const item = dataList.find(d => d.id === selectedIds[i]);
        if (!item) continue;

        // Render ReportDocument to the container
        const wrapper = document.createElement('div');
        container.appendChild(wrapper);
        
        const root = createRoot(wrapper);
        flushSync(() => {
          root.render(
            <ReportDocument 
              data={{ 
                ...item, 
                type: reportType, 
                term: filters.term, 
                year: filters.year,
                globalComment,
                schoolType: template?.school?.type
              }} 
              template={template || { config: { primaryColor: '#3182ce' } }} 
            />
          );
        });

        // Small delay to ensure styles/images are loaded if needed
        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(wrapper.firstChild as HTMLElement, { 
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        if (zip) {
          const pdfBlob = pdf.output('blob');
          zip.file(`${item.id}_Report.pdf`, pdfBlob);
        } else {
          pdf.save(`${item.id}_Report.pdf`);
        }

        setProgress(Math.round(((i + 1) / selectedIds.length) * 100));
        
        // Cleanup
        root.unmount();
        wrapper.remove();
      }

      if (zip) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${reportType}_Reports_${filters.year}.zip`);
      }

      setSummary({ count: selectedIds.length, type: 'PDF_BATCH' });

      // Auto-publish if enabled
      if (autoPublish && reportType === 'ACADEMIC') {
        await publishSnapshots();
      }

      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showToast('Error during generation', 'error');
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setLoading(false);
    }
  };

  const publishSnapshots = async () => {
    if (selectedIds.length === 0) return;
    if (reportType !== 'ACADEMIC') {
      showToast('Publication is currently only supported for Academic Reports', 'warning');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/reports/snapshot', {
        studentIds: selectedIds,
        term: filters.term,
        year: filters.year,
        publishStudent: publishConfig.toStudent,
        publishParent: publishConfig.toParent
      });
      showToast(`Successfully published ${selectedIds.length} report snapshot(s)`, 'success');
      setSummary({ count: selectedIds.length, type: 'PUBLISH' });
    } catch (err) {
      showToast('Failed to publish snapshots', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectDownload = async (item: any) => {
    setLoading(true);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
      const wrapper = document.createElement('div');
      container.appendChild(wrapper);
      const root = createRoot(wrapper);
      
      flushSync(() => {
        root.render(
          <ReportDocument 
            data={{ 
              ...item, 
              type: reportType, 
              term: filters.term, 
              year: filters.year,
              globalComment,
              schoolType: template?.school?.type
            }} 
            template={template || { config: { primaryColor: '#3182ce' } }} 
          />
        );
      });

      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(wrapper.firstChild as HTMLElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
      pdf.save(`${item.studentId || item.id}_Report.pdf`);
      
      root.unmount();
    } catch (err) {
      console.error(err);
    } finally {
      container.remove();
      setLoading(false);
    }
  };

  const filteredData = dataList.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2><i className="fas fa-magic" style={{ marginRight: 10 }}></i>Report Generation Wizard</h2>
        {step === 2 && (
          <button className="portal-btn-secondary" onClick={() => setStep(1)}>
            <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>Back to Setup
          </button>
        )}
      </div>
      <div className="portal-card-body">
        {step === 1 ? (
          <div style={{ maxWidth: '850px', margin: '0 auto', padding: '10px 0' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
              1. Select Report Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              {categories.map(t => {
                const isSelected = reportType === t.id;
                return (
                  <div 
                    key={t.id} 
                    onClick={() => setReportType(t.id)}
                    style={{ 
                      padding: '18px', 
                      border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                      background: isSelected ? '#eff6ff' : '#fff',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: isSelected ? '#2563eb' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}>
                        <i className={`fas ${t.icon}`}></i>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#1e3a8a' : '#1e293b' }}>
                        {t.label}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      {t.description}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '25px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: 16, fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                2. Configure Report Parameters & Target
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="portal-form-group">
                  <label>Academic Period</label>
                  <select 
                    className="portal-input" 
                    value={filters.term} 
                    onChange={e => setFilters({...filters, term: e.target.value})}
                  >
                    {isPoly ? (
                        <>
                            <option>Semester 1</option>
                            <option>Semester 2</option>
                        </>
                    ) : (
                        <>
                            <option>Term 1</option>
                            <option>Term 2</option>
                            <option>Term 3</option>
                        </>
                    )}
                    <option>Year End</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label>Calendar Year</label>
                  <select 
                    className="portal-input" 
                    value={filters.year} 
                    onChange={e => setFilters({...filters, year: e.target.value})}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {activeCategory.requiredFilters.includes('class') && (
                  <div className="portal-form-group">
                    <label>Target {t('class')} / Stream</label>
                    <select 
                      className="portal-input"
                      value={filters.classId}
                      onChange={e => setFilters({...filters, classId: e.target.value})}
                    >
                      <option value="">Apply to all {t('student').toLowerCase()}s</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {activeCategory.requiredFilters.includes('examType') && (
                  <div className="portal-form-group">
                    <label>Exam Type</label>
                    <select 
                      className="portal-input"
                      value={filters.examType}
                      onChange={e => setFilters({...filters, examType: e.target.value})}
                    >
                      {EXAM_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                )}

                {activeCategory.requiredFilters.includes('subject') && (
                  <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Target Subject</label>
                    <select 
                      className="portal-input"
                      value={filters.subjectId}
                      onChange={e => setFilters({...filters, subjectId: e.target.value})}
                    >
                      <option value="">All Assessed Subjects</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button 
                className="portal-btn-primary" 
                style={{ width: '100%', padding: '14px', marginTop: '10px' }}
                onClick={fetchReportData}
                disabled={loading}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Continue to Data Selection'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {summary ? (
               <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: '#def7ec', 
                    color: '#047857', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    margin: '0 auto 20px'
                  }}>
                     <i className="fas fa-check-circle"></i>
                  </div>
                  <h2 style={{ color: '#065f46', marginBottom: '10px' }}>Action Successful!</h2>
                  <p style={{ color: '#4a5568', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 30px' }}>
                     {summary.type === 'PDF_BATCH' 
                        ? `A batch of ${summary.count} reports has been successfully compiled and downloaded. Check your downloads folder.`
                        : `${summary.count} report snapshots have been securely published to the database and are now visible to ${publishConfig.toStudent ? 'Students' : ''} ${publishConfig.toStudent && publishConfig.toParent ? '&' : ''} ${publishConfig.toParent ? 'Parents' : ''} in their respective portals.`
                     }
                  </p>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                     <button className="portal-btn-primary" onClick={() => { setSummary(null); setStep(1); }}>
                        Start New Selection
                     </button>
                     <button className="portal-btn-neutral" onClick={() => setSummary(null)}>
                        Back to Table
                     </button>
                  </div>
               </div>
            ) : (
               <>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ position: 'relative' }}>
                       <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}></i>
                       <input 
                         type="text" 
                         placeholder="Search records..." 
                         className="portal-input" 
                         style={{ paddingLeft: '40px' }}
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                       />
                     </div>
                   </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="portal-btn-secondary" onClick={handleSelectAll}>
                        {selectedIds.length === dataList.length ? 'Deselect All' : 'Select All'}
                      </button>
                      
                      {reportType === 'ACADEMIC' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '10px', background: '#f8fafc', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                           <input type="checkbox" id="autoPublish" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} />
                           <label htmlFor="autoPublish" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a5568', cursor: 'pointer' }}>Publish to Portal after Export</label>
                        </div>
                      )}

                      {reportType === 'ACADEMIC' && (
                        <button 
                          className="portal-btn-primary" 
                          style={{ background: '#38a169' }}
                          onClick={publishSnapshots}
                          disabled={selectedIds.length === 0 || loading}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ marginRight: 8 }}></i>Publish ({selectedIds.length})
                        </button>
                      )}
                      <button 
                         className="portal-btn-primary" 
                         disabled={selectedIds.length === 0 || loading}
                         onClick={() => generatePDFBatch(true)}
                      >
                         {loading ? `Compiling (${progress}%)...` : (
                           <>
                             <i className="fas fa-file-pdf" style={{ marginRight: 8 }}></i>Export PDFs
                           </>
                         )}
                      </button>
                    </div>
                  </div>

                  {reportType === 'ACADEMIC' && (
                    <div style={{ marginBottom: '20px', padding: '16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                       <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
                          <i className="fas fa-comment-medical" style={{ marginRight: 8 }}></i>
                          GLOBAL APPRAISAL / COMMON COMMENT (APPLIES TO ALL SELECTED {t('student').toUpperCase()}S)
                       </label>
                       <textarea 
                          placeholder={isMedical ? "e.g. Trainee has demonstrated consistent clinical proficiency..." : "e.g. Student has shown significant effort and progress this term..."}
                          className="portal-input"
                          style={{ minHeight: '60px', fontSize: '0.85rem' }}
                          value={globalComment}
                          onChange={e => setGlobalComment(e.target.value)}
                       />
                    </div>
                  )}

                 {reportType === 'ACADEMIC' && (
                   <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', padding: '12px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                         <input type="checkbox" checked={publishConfig.toStudent} onChange={e => setPublishConfig({...publishConfig, toStudent: e.target.checked})} />
                         Visible to Students
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                         <input type="checkbox" checked={publishConfig.toParent} onChange={e => setPublishConfig({...publishConfig, toParent: e.target.checked})} />
                         Visible to Parents
                      </label>
                   </div>
                 )}

                 <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: '12px' }}>
                   <table className="portal-table">
                     <thead>
                       <tr>
                         <th style={{ width: '50px' }}>Select</th>
                         <th>Name / Reference</th>
                         <th>{reportType === 'ASSETS' ? 'Serial Number' : (reportType === 'STAFF' ? 'Staff ID' : t('student') + ' ID')}</th>
                         <th>{reportType === 'FEES' ? 'Balance' : 'Status / Highlights'}</th>
                         <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredData.map(item => (
                         <tr key={item.id}>
                           <td>
                             <input 
                               type="checkbox" 
                               checked={selectedIds.includes(item.id)}
                               onChange={() => handleToggleId(item.id)}
                               style={{ width: '18px', height: '18px' }}
                             />
                           </td>
                           <td style={{ fontWeight: 600 }}>{item.name}</td>
                           <td>{item.studentId || item.staffId || item.assetId || item.id}</td>
                           <td>
                             <span className={`portal-badge ${item.complete ? 'success' : 'neutral'}`}>
                                {item.statusText || 'Ready for Export'}
                             </span>
                           </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button 
                                  className="btn-icon btn-view" 
                                  onClick={() => setPreviewItem(item)}
                                  title="Preview Document"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button 
                                  className="btn-icon btn-download" 
                                  onClick={() => handleDirectDownload(item)}
                                  style={{ color: '#e53e3e', background: 'rgba(229, 62, 62, 0.05)' }}
                                  title="Quick Download PDF"
                                >
                                  <i className="fas fa-file-pdf"></i>
                                </button>
                              </div>
                            </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 {/* Preview Modal */}
                 {previewItem && (
                    <div className="portal-modal-overlay" onClick={() => setPreviewItem(null)}>
                       <div className="portal-modal-card" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
                          <div className="portal-modal-header">
                             <div className="header-titles">
                                <h2>Live Preview</h2>
                                <span>Verifying layout for {previewItem.name}</span>
                             </div>
                             <button className="close-panel" onClick={() => setPreviewItem(null)}>
                                <i className="fas fa-times"></i>
                             </button>
                          </div>
                          <div className="portal-modal-body" style={{ background: '#f1f5f9' }}>
                             <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
                                <ReportDocument 
                                   data={{ 
                                     ...previewItem, 
                                     type: reportType, 
                                     term: filters.term, 
                                     year: filters.year,
                                     globalComment,
                                     schoolType: template?.school?.type 
                                   }} 
                                   template={template || { config: { primaryColor: '#3182ce' } }} 
                                />
                             </div>
                          </div>
                          <div className="portal-modal-footer">
                             <button className="portal-btn-neutral" onClick={() => setPreviewItem(null)}>Close Preview</button>
                             <button className="portal-btn-primary" onClick={() => setPreviewItem(null)}>Confirm & Close</button>
                          </div>
                       </div>
                    </div>
                 )}
               </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGeneratorWizard;
