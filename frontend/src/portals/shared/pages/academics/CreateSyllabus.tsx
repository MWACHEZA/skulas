import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { useAcademicConfig } from '../../../../hooks/useAcademicConfig';

interface WeekItem {
  week: string;
  topic: string;
  content: string;
}

export default function CreateSyllabus() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { 
    t, 
    isTertiary, 
    isK12, 
    syllabusLabel, 
    classLabel, 
    subjectLabel 
  } = useAcademicConfig();

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Multi-week Add Syllabus State
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [weeksCount, setWeeksCount] = useState<number>(12);
  const [weekEntries, setWeekEntries] = useState<WeekItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Edit single item state
  const [editFormData, setEditFormData] = useState({
    id: '',
    week: '',
    topic: '',
    content: ''
  });

  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSession, setFilterSession] = useState('2026-2027');
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Initialize week entries whenever weeksCount changes or modal opens
  const initWeeks = (count: number) => {
    const list: WeekItem[] = [];
    for (let i = 1; i <= count; i++) {
      const weekLabel = isTertiary ? `Week ${i} / Unit ${i}` : `Week ${i}`;
      list.push({
        week: weekLabel,
        topic: '',
        content: ''
      });
    }
    setWeekEntries(list);
  };

  const handleOpenAddModal = () => {
    setTargetClassId(filterClass || (classes[0]?.id || ''));
    setTargetSubjectId(filterSubject || (subjects[0]?.id || ''));
    setWeeksCount(12);
    initWeeks(12);
    setIsModalOpen(true);
  };

  const handleWeeksCountChange = (newCount: number) => {
    const count = Math.max(1, Math.min(30, newCount));
    setWeeksCount(count);
    setWeekEntries(prev => {
      const nextList: WeekItem[] = [];
      for (let i = 1; i <= count; i++) {
        const weekLabel = isTertiary ? `Week ${i} / Unit ${i}` : `Week ${i}`;
        if (prev[i - 1]) {
          nextList.push(prev[i - 1]);
        } else {
          nextList.push({
            week: weekLabel,
            topic: '',
            content: ''
          });
        }
      }
      return nextList;
    });
  };

  const handleWeekEntryChange = (index: number, field: 'topic' | 'content', value: string) => {
    setWeekEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

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
      showToast(`Select a ${classLabel.toLowerCase()} and ${subjectLabel.toLowerCase()} to view ${syllabusLabel.toLowerCase()}`, 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/syllabus?classId=${filterClass}&subjectId=${filterSubject}`);
      setSyllabuses(res.data);
    } catch (error) {
      showToast(`Failed to load ${syllabusLabel.toLowerCase()}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId || !targetSubjectId) {
      showToast(`Please select both ${classLabel.toLowerCase()} and ${subjectLabel.toLowerCase()}`, 'error');
      return;
    }

    const validWeeks = weekEntries.filter(w => w.topic.trim() || w.content.trim());
    if (validWeeks.length === 0) {
      showToast('Please enter at least one topic for your weeks', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/syllabus/bulk', {
        classId: targetClassId,
        subjectId: targetSubjectId,
        weeks: validWeeks
      });

      showToast(`${syllabusLabel} generated successfully with ${validWeeks.length} weeks!`, 'success');
      setIsModalOpen(false);

      // Auto update filters and reload
      setFilterClass(targetClassId);
      setFilterSubject(targetSubjectId);
      const res = await api.get(`/api/syllabus?classId=${targetClassId}&subjectId=${targetSubjectId}`);
      setSyllabuses(res.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || `Failed to save ${syllabusLabel.toLowerCase()}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setEditFormData({
      id: item.id,
      week: item.week,
      topic: item.topic,
      content: item.content
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.topic.trim()) {
      showToast('Topic cannot be empty', 'error');
      return;
    }

    try {
      await api.put(`/api/syllabus/${editFormData.id}`, {
        week: editFormData.week,
        topic: editFormData.topic,
        content: editFormData.content
      });

      showToast(`${syllabusLabel} entry updated!`, 'success');
      setIsEditModalOpen(false);
      loadSyllabus();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to update entry', 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${syllabusLabel.toLowerCase()} entry?`)) {
      return;
    }

    try {
      await api.delete(`/api/syllabus/${id}`);
      showToast('Entry removed successfully', 'success');
      setSyllabuses(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete entry', 'error');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const selectedClass = classes.find(c => c.id === filterClass);
    const selectedSubject = subjects.find(s => s.id === filterSubject);
    
    const rows = syllabuses.map(s => `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: bold; width: 140px; vertical-align: top;">${s.week}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; vertical-align: top;">
          <div style="font-weight: bold; margin-bottom: 6px; color: #0f172a;">${s.topic}</div>
          <div style="font-size: 0.9rem; color: #475569; white-space: pre-wrap;">${s.content}</div>
        </td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${isTertiary ? 'Course Outline & Curriculum' : 'Academic Syllabus / Scheme of Work'}</title>
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
          <h1>${isTertiary ? 'Official Course Outline' : 'Academic Syllabus / Scheme of Work'}</h1>
          <p>
            <strong>${classLabel}:</strong> ${selectedClass ? selectedClass.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <strong>${subjectLabel}:</strong> ${selectedSubject ? selectedSubject.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <strong>Session:</strong> ${filterSession}
          </p>
          <table>
            <thead>
              <tr>
                <th>${isTertiary ? 'Week / Unit' : 'Week'}</th>
                <th>Topic & Content Breakdown</th>
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
    const headers = [isTertiary ? 'Week/Unit' : 'Week', 'Topic', 'Content'];
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
    link.setAttribute("download", `${isTertiary ? 'course_outline' : 'syllabus'}_${filterClass}_${filterSubject}_${new Date().toISOString().slice(0, 10)}.csv`);
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
          <title>${syllabusLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cccccc; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${isTertiary ? 'Course Outline & Curriculum' : 'Academic Syllabus / Scheme of Work'}</h2>
          <p>
            <b>${classLabel}:</b> ${selectedClass ? selectedClass.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <b>${subjectLabel}:</b> ${selectedSubject ? selectedSubject.name : 'N/A'} &nbsp;&nbsp;&nbsp;&nbsp;
            <b>Session:</b> ${filterSession}
          </p>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">${isTertiary ? 'Week / Unit' : 'Week'}</th>
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
    link.setAttribute("download", `${isTertiary ? 'course_outline' : 'syllabus'}_${filterClass}_${filterSubject}_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{syllabusLabel} Manager</h1>
          <p>Define weekly topics, units, and curriculum guidelines for each {subjectLabel.toLowerCase()}.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          style={{ padding: '0 28px', fontWeight: 800, height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }} 
          onClick={handleOpenAddModal}
        >
          <i className="fas fa-plus-circle"></i> ADD {syllabusLabel.toUpperCase()}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        
        {/* SCHEME OF WORK / COURSE OUTLINE VIEWER */}
        <div className="portal-card" style={{ padding: '24px' }}>
          <div className="portal-card-header" style={{ background: 'var(--school-primary, #3182ce)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px 24px', borderRadius: '12px 12px 0 0' }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              {isTertiary ? 'COURSE OUTLINE BREAKDOWN' : 'SCHEME OF WORK'}
            </h2>
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
          <div className="portal-card-body" style={{ background: '#f8fafc', padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 20 }}>
               <div className="portal-form-group" style={{ marginBottom: 0 }}>
                  <label className="portal-label">{classLabel} <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ padding: '8px 12px', height: '42px' }}>
                    <option value="">Select {classLabel.toLowerCase()}</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div className="portal-form-group" style={{ marginBottom: 0 }}>
                  <label className="portal-label">{subjectLabel} <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ padding: '8px 12px', height: '42px' }}>
                    <option value="">Select {subjectLabel.toLowerCase()}</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div className="portal-form-group" style={{ marginBottom: 0 }}>
                  <label className="portal-label">Session <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={filterSession} onChange={e => setFilterSession(e.target.value)} style={{ padding: '8px 12px', height: '42px' }}>
                    <option value="2026-2027">2026-2027</option>
                  </select>
               </div>
               <button className="portal-btn-primary" onClick={loadSyllabus} style={{ padding: '8px 24px', height: '42px', background: 'var(--portal-success, #059669)', borderColor: 'var(--portal-success, #059669)' }}>
                 Load
               </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin mr-2"></i> Loading...</div>
            ) : syllabuses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#718096', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                 <i className="fas fa-file-alt fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
                 <p style={{ fontWeight: 600, color: '#4a5568' }}>No {syllabusLabel} Entries Found</p>
                 <p style={{ fontSize: '0.85rem' }}>Select a {classLabel.toLowerCase()} and a {subjectLabel.toLowerCase()} to view entries, or click "ADD {syllabusLabel.toUpperCase()}".</p>
              </div>
            ) : (
              <table className="portal-table" style={{ background: 'white', width: '100%', borderCollapse: 'collapse' }}>
                 <thead style={{ background: '#edf2f7' }}>
                   <tr>
                     <th style={{ color: '#4a5568', fontWeight: 700, textAlign: 'left', padding: '12px', width: '140px' }}>
                       {isTertiary ? 'WEEK / UNIT' : 'WEEK'}
                     </th>
                     <th style={{ color: '#4a5568', fontWeight: 700, textAlign: 'left', padding: '12px' }}>
                       TOPIC & CONTENT
                     </th>
                     <th style={{ color: '#4a5568', fontWeight: 700, textAlign: 'right', padding: '12px', width: '120px' }}>
                       ACTIONS
                     </th>
                   </tr>
                 </thead>
                 <tbody>
                   {syllabuses.map((s) => (
                     <tr key={s.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                       <td style={{ fontWeight: 'bold', padding: '12px', verticalAlign: 'top', color: '#1e293b' }}>
                         <span className="portal-badge neutral">{s.week}</span>
                       </td>
                       <td style={{ padding: '12px' }}>
                         <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: '1rem' }}>{s.topic}</div>
                         <div style={{ fontSize: '0.9rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                           {s.content || 'No detailed content description.'}
                         </div>
                       </td>
                       <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'top' }}>
                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                           <button
                             onClick={() => handleOpenEditModal(s)}
                             className="portal-btn-ghost"
                             title="Edit"
                             style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}
                           >
                             <i className="fas fa-edit"></i>
                           </button>
                           <button
                             onClick={() => handleDeleteItem(s.id)}
                             className="portal-btn-ghost"
                             title="Delete"
                             style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                           >
                             <i className="fas fa-trash-alt"></i>
                           </button>
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

      {/* ADD SYLLABUS / COURSE OUTLINE MODAL (Weeks -> Topic + Content) */}
      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header" style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <div className="header-titles">
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>
                  Add {syllabusLabel} Structure
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>
                  Define how many weeks the {syllabusLabel.toLowerCase()} covers, then enter weekly topics and content.
                </p>
              </div>
              <button className="close-panel" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>&times;</button>
            </div>

            <div className="portal-modal-body">
              <form onSubmit={handleSaveBulk}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 20, background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label className="portal-label">{classLabel} <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className="portal-input" 
                      value={targetClassId}
                      onChange={e => setTargetClassId(e.target.value)}
                      required
                    >
                      <option value="">Select {classLabel.toLowerCase()}</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label className="portal-label">{subjectLabel} <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className="portal-input" 
                      value={targetSubjectId}
                      onChange={e => setTargetSubjectId(e.target.value)}
                      required
                    >
                      <option value="">Select {subjectLabel.toLowerCase()}</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label className="portal-label">Duration (Total Weeks) <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="number"
                      min={1}
                      max={30}
                      className="portal-input"
                      value={weeksCount}
                      onChange={e => handleWeeksCountChange(parseInt(e.target.value) || 1)}
                      required
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    Weekly Curriculum Schedule ({weekEntries.length} Weeks)
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => handleWeeksCountChange(weeksCount + 1)}
                      className="portal-btn-neutral"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      <i className="fas fa-plus mr-1"></i> Add Week
                    </button>
                    {weeksCount > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleWeeksCountChange(weeksCount - 1)}
                        className="portal-btn-neutral"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#dc2626' }}
                      >
                        <i className="fas fa-minus mr-1"></i> Remove Week
                      </button>
                    )}
                  </div>
                </div>

                {/* WEEK CARDS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 24 }}>
                  {weekEntries.map((item, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '10px', 
                        padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span className="portal-badge primary" style={{ fontWeight: 800 }}>
                          {item.week}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Entry #{idx + 1}</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                        <div className="portal-form-group" style={{ margin: 0 }}>
                          <label className="portal-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                            Topic Name <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input 
                            type="text"
                            className="portal-input"
                            placeholder="e.g. Introduction to Dynamics"
                            value={item.topic}
                            onChange={e => handleWeekEntryChange(idx, 'topic', e.target.value)}
                            required={idx === 0}
                          />
                        </div>
                        <div className="portal-form-group" style={{ margin: 0 }}>
                          <label className="portal-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                            Content & Practical Breakdown
                          </label>
                          <input 
                            type="text"
                            className="portal-input"
                            placeholder="Detailed objectives, textbook chapters, lab tasks..."
                            value={item.content}
                            onChange={e => handleWeekEntryChange(idx, 'content', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="portal-btn-primary" 
                    disabled={saving}
                    style={{ background: 'var(--portal-success, #059669)', borderColor: 'var(--portal-success, #059669)', padding: '0 28px', height: '46px', fontWeight: 800 }}
                  >
                    {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i> Generating...</> : <><i className="fas fa-save mr-2"></i> Save All {weekEntries.length} Weeks</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SINGLE SYLLABUS ENTRY MODAL */}
      {isEditModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '560px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Edit {syllabusLabel} Entry</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Update topic, content, or week label</p>
              </div>
              <button className="close-panel" onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleUpdateItem}>
                <div className="portal-form-group" style={{ marginBottom: 14 }}>
                  <label className="portal-label">Week / Period Label <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text"
                    className="portal-input"
                    value={editFormData.week}
                    onChange={e => setEditFormData({ ...editFormData, week: e.target.value })}
                    required
                  />
                </div>
                <div className="portal-form-group" style={{ marginBottom: 14 }}>
                  <label className="portal-label">Topic <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text"
                    className="portal-input"
                    value={editFormData.topic}
                    onChange={e => setEditFormData({ ...editFormData, topic: e.target.value })}
                    required
                  />
                </div>
                <div className="portal-form-group" style={{ marginBottom: 20 }}>
                  <label className="portal-label">Content Breakdown</label>
                  <textarea 
                    rows={4}
                    className="portal-input"
                    value={editFormData.content}
                    onChange={e => setEditFormData({ ...editFormData, content: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" style={{ background: 'var(--portal-success, #059669)', borderColor: 'var(--portal-success, #059669)' }}>
                    <i className="fas fa-check mr-2"></i> Update Entry
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
