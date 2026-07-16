import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ReportDocument from './ReportDocument';
import { useTerminology } from '../../../hooks/useTerminology';

interface Props {
  role: 'ADMIN' | 'TEACHER';
  allowedTypes?: string[];
}

const ReportGeneratorWizard: React.FC<Props> = ({ role: _role, allowedTypes }) => {
  const [step, setStep] = useState(1);
  const { t, isMedical, isPoly } = useTerminology();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [reportType, setReportType] = useState('ACADEMIC');
  const [filters, setFilters] = useState({ 
    classId: '', 
    term: '', 
    year: new Date().getFullYear().toString() 
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

  const allReportTypes = [
    { id: 'ACADEMIC', label: isMedical ? `${t('grades')} Analysis` : 'Academic Performance', icon: isMedical ? 'fa-hospital-user' : 'fa-graduation-cap' },
    { id: 'ENROLLMENT', label: 'Enrollment Summary', icon: 'fa-users' },
    { id: 'FEES', label: 'Fee Collection Report', icon: 'fa-hand-holding-usd' },
    { id: 'ATTENDANCE', label: 'Attendance Report', icon: 'fa-calendar-check' },
    { id: 'STAFF', label: 'Staff Directory', icon: 'fa-user-tie' },
    { id: 'ASSETS', label: 'Asset Inventory', icon: 'fa-boxes' },
  ];

  const reportTypes = allowedTypes
    ? allReportTypes.filter(r => allowedTypes.includes(r.id))
    : allReportTypes;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => (currentYear - 5 + i).toString());

  useEffect(() => {
    fetchClasses();
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
      let endpoint = `/api/reports/preview?type=${reportType}&term=${filters.term}&year=${filters.year}`;
      if (['ACADEMIC', 'ATTENDANCE'].includes(reportType)) {
        if (!filters.classId) {
          alert('Please select a class for this report type.');
          setLoading(false);
          return;
        }
        endpoint += `&classId=${filters.classId}`;
      }

      const res = await api.get(endpoint);
      setDataList(Array.isArray(res.data) ? res.data : []);
      setStep(2);
    } catch (err) {
      alert('Failed to fetch data for report. Ensure all filters are set.');
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
      alert('Error during generation');
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
      alert('Publication is currently only supported for Academic Reports');
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
      setSummary({ count: selectedIds.length, type: 'PUBLISH' });
    } catch (err) {
      alert('Failed to publish snapshots');
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
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '10px 0' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 600 }}>1. Select Report Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              {reportTypes.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setReportType(t.id)}
                  style={{ 
                    padding: '20px', 
                    border: `2px solid ${reportType === t.id ? '#3182ce' : '#e2e8f0'}`,
                    background: reportType === t.id ? '#ebf8ff' : '#fff',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className={`fas ${t.icon}`} style={{ fontSize: '1.5rem', marginBottom: '10px', color: reportType === t.id ? '#3182ce' : '#718096' }}></i>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '25px', background: '#f8fafc', borderRadius: '12px' }}>
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

              {['ACADEMIC', 'ATTENDANCE', 'FEES'].includes(reportType) && (
                <div className="portal-form-group">
                  <label>Target {t('class')} (Optional for Fees)</label>
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
