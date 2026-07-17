import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';

export default function CreateSyllabus() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTerminology();

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    topic: '',
    content: '',
    week: 'Week 1'
  });

  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSession, setFilterSession] = useState('2026-2027');
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classRes, subjRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/subjects')
      ]);
      setClasses(classRes.data);
      setSubjects(subjRes.data);
    } catch (error) {
      showToast('Failed to load initial data', 'error');
    
    }
  };

  const loadSyllabus = async () => {
    if (!filterClass || !filterSubject) {
      showToast(`Select a ${t('class').toLowerCase()} and ${t('subject').toLowerCase()} to view syllabus`, 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/syllabus?classId=${filterClass}&subjectId=${filterSubject}`);
      setSyllabuses(res.data);
    } catch (error) {
      showToast('Failed to load syllabus', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.subjectId || !formData.topic || !formData.content) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    try {
      await api.post('/api/syllabus', formData);
      showToast('Syllabus added successfully', 'success');
      
      // Clear form topic and content
      setFormData({ ...formData, topic: '', content: '' });
      setIsModalOpen(false);
      
      // Auto reload if the currently viewed filter matches the saved data
      if (filterClass === formData.classId && filterSubject === formData.subjectId) {
        loadSyllabus();
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save syllabus', 'error');
    
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const selectedClass = classes.find(c => c.id === filterClass);
    const selectedSubject = subjects.find(s => s.id === filterSubject);
    
    const rows = syllabuses.map(s => `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: bold; width: 120px; vertical-align: top;">${s.week}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; vertical-align: top;">
          <div style="font-weight: bold; margin-bottom: 6px; color: #0f172a;">${s.topic}</div>
          <div style="font-size: 0.9rem; color: #475569; white-space: pre-wrap;">${s.content}</div>
        </td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Academic Syllabus / Scheme of Work</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            h1 { font-size: 1.8rem; font-weight: 900; margin-bottom: 4px; color: #0f172a; }
            p { font-size: 1rem; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: #475569; }
            td { font-size: 0.95rem; color: #334155; }
          </style>
        </head>
        <body>
          <h1>Academic Syllabus / Scheme of Work</h1>
          <p>
            <strong>${t('class')}:</strong> ${selectedClass ? selectedClass.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <strong>${t('subject')}:</strong> ${selectedSubject ? selectedSubject.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <strong>Session:</strong> ${filterSession}
          </p>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Topic & Content</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const headers = ['Week', 'Topic', 'Content'];
    const rows = syllabuses.map(s => [
      s.week,
      s.topic,
      s.content
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `syllabus_${filterClass}_${filterSubject}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = () => {
    const selectedClass = classes.find(c => c.id === filterClass);
    const selectedSubject = subjects.find(s => s.id === filterSubject);
    
    const rows = syllabuses.map(s => `
      <tr>
        <td style="border: 1px solid #cccccc; padding: 10px; font-weight: bold; vertical-align: top;">${s.week}</td>
        <td style="border: 1px solid #cccccc; padding: 10px; vertical-align: top;">
          <div style="font-weight: bold; margin-bottom: 5px;">${s.topic}</div>
          <div style="font-size: 0.95rem; color: #333333; white-space: pre-wrap;">${s.content}</div>
        </td>
      </tr>
    `).join('');
    
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Academic Syllabus</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cccccc; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Academic Syllabus / Scheme of Work</h2>
          <p>
            <b>${t('class')}:</b> ${selectedClass ? selectedClass.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <b>${t('subject')}:</b> ${selectedSubject ? selectedSubject.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <b>Session:</b> ${filterSession}
          </p>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Week</th>
                <th>Topic & Content</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `syllabus_${filterClass}_${filterSubject}_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Create Syllabus</h1>
          <p>Define topics and contents for each {t('subject').toLowerCase()} syllabus.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }} 
          onClick={() => setIsModalOpen(true)}
        >
          <i className="fas fa-plus-circle"></i> ADD SYLLABUS SECTION
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        
        {/* SCHEME OF WORK VIEWER */}
        <div className="portal-card" style={{ padding: '24px' }}>
          <div className="portal-card-header" style={{ background: 'var(--school-primary, #3182ce)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px 24px', borderRadius: '12px 12px 0 0' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>SCHEME OF WORK</h2>
            {syllabuses.length > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handlePrint} className="portal-btn-neutral" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <i className="fas fa-print"></i> Print / PDF
                </button>
                <button onClick={handleExportExcel} className="portal-btn-neutral" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <i className="fas fa-file-excel"></i> Excel
                </button>
                <button onClick={handleExportWord} className="portal-btn-neutral" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <i className="fas fa-file-word"></i> Word
                </button>
              </div>
            )}
          </div>
          <div className="portal-card-body" style={{ background: '#f7fafc', padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 20 }}>
               <div className="portal-form-group" style={{ marginBottom: 0 }}>
                  <label className="portal-label">{t('class')} <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ padding: '8px 12px', height: '42px' }}>
                    <option value="">Select {t('class').toLowerCase()}</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div className="portal-form-group" style={{ marginBottom: 0 }}>
                  <label className="portal-label">{t('subject')} <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ padding: '8px 12px', height: '42px' }}>
                    <option value="">Select {t('subject').toLowerCase()}</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div className="portal-form-group" style={{ marginBottom: 0 }}>
                  <label className="portal-label">Session <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={filterSession} onChange={e => setFilterSession(e.target.value)} style={{ padding: '8px 12px', height: '42px' }}>
                    <option value="2026-2027">2026-2027</option>
                  </select>
               </div>
               <button className="portal-btn-primary" onClick={loadSyllabus} style={{ padding: '8px 24px', height: '42px', background: 'var(--portal-success)', borderColor: 'var(--portal-success)' }}>
                 Load
               </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
            ) : syllabuses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#718096', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                 <i className="fas fa-file-alt fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
                 <p style={{ fontWeight: 600, color: '#4a5568' }}>No Academic Syllabus Found</p>
                 <p style={{ fontSize: '0.85rem' }}>Select a {t('class').toLowerCase()} and a {t('subject').toLowerCase()} to view syllabus.</p>
              </div>
            ) : (
              <table className="portal-table" style={{ background: 'white', width: '100%', borderCollapse: 'collapse' }}>
                 <thead style={{ background: '#edf2f7' }}>
                   <tr>
                     <th style={{ color: '#4a5568', fontWeight: 600, textAlign: 'left', padding: '12px' }}>WEEK</th>
                     <th style={{ color: '#4a5568', fontWeight: 600, textAlign: 'left', padding: '12px' }}>TOPIC/CONTENT</th>
                   </tr>
                 </thead>
                 <tbody>
                   {syllabuses.map((s) => (
                     <tr key={s.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                       <td style={{ fontWeight: 'bold', padding: '12px', verticalAlign: 'top', width: '120px' }}>{s.week}</td>
                       <td style={{ padding: '12px' }}>
                         <div style={{ fontWeight: 'bold', marginBottom: 5 }}>{s.topic}</div>
                         <div style={{ fontSize: '0.9rem', color: '#4a5568', whiteSpace: 'pre-wrap' }}>
                           {s.content}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ADD SYLLABUS MODAL */}
      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '650px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Add Syllabus Section</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Upload curriculum topics and content guidelines</p>
              </div>
              <button className="close-panel" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="portal-form-group">
                    <label className="portal-label">{t('class')} <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className="portal-input" 
                      value={formData.classId}
                      onChange={e => setFormData({ ...formData, classId: e.target.value })}
                      required
                    >
                      <option value="">Select {t('class').toLowerCase()}</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">{t('subject')} <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className="portal-input" 
                      value={formData.subjectId}
                      onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                      required
                    >
                      <option value="">Select {t('subject').toLowerCase()}</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Topic <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Introduction to Physics" 
                    value={formData.topic}
                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Content <span style={{ color: 'red' }}>*</span></label>
                  <textarea 
                    className="portal-input" 
                    placeholder="Content e.g. Definition of Physics, branches, etc." 
                    rows={4}
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 20 }}>
                  <label className="portal-label">Week <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    className="portal-input" 
                    value={formData.week}
                    onChange={e => setFormData({ ...formData, week: e.target.value })}
                    required
                  >
                    {[...Array(15)].map((_, i) => (
                      <option key={i} value={`Week ${i + 1}`}>Week {i + 1}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)' }}>
                    <i className="fas fa-save" style={{ marginRight: 5 }}></i> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
