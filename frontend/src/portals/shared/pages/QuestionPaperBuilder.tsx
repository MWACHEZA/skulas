import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'STRUCTURED' | 'ESSAY';
  text: string;
  marks: number;
  options?: string[];
  answer?: string;
}

interface Section {
  id: string;
  title: string;
  instructions?: string;
  questions: Question[];
}

export default function QuestionPaperBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  
  const [paper, setPaper] = useState({
    title: '',
    description: '',
    subjectId: '',
    duration: 120,
    totalMarks: 100,
    instructions: 'Answer all questions in the space provided.',
    sections: [] as Section[]
  });

  const [templateConfig, setTemplateConfig] = useState<any>({});
  
  const PAPER_BUILTIN = [
    { id: 'academic-classic',  name: 'Academic Classic',  color: '#1e3a8a', accent: '#eff6ff', icon: 'fa-book-open' },
    { id: 'modern-assessment', name: 'Modern Assessment', color: '#0f172a', accent: '#f8fafc', icon: 'fa-pen-nib' },
    { id: 'formal-exam',       name: 'Formal Exam',       color: '#475569', accent: '#f1f5f9', icon: 'fa-file-signature' },
  ];

  useEffect(() => {
    fetchSubjects();
    if (id) fetchPaper();
    fetchSchoolInfo();
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get('/api/reports/template');
      if (data && data.config) setTemplateConfig(data.config);
    } catch (e) { console.error(e); }
  };

  const fetchSchoolInfo = async () => {
    try {
      const res = await api.get('/api/schools/me');
      setSchoolInfo(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/api/subjects');
      setSubjects(data);
    } catch (e) { console.error(e); 
    }
  };

  const fetchPaper = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/academic-tools/question-papers/${id}`);
      setPaper(data);
    } catch (error) {
      showToast('Failed to load paper', 'error');
      navigate(-1);
    
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    const newSection: Section = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Section ${paper.sections.length + 1}`,
      questions: []
    };
    setPaper(p => ({ ...p, sections: [...p.sections, newSection] }));
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'STRUCTURED',
      text: '',
      marks: 5
    };
    setPaper(p => ({
      ...p,
      sections: p.sections.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion] } : s)
    }));
  };

  const updateQuestion = (sectionId: string, qId: string, updates: Partial<Question>) => {
    setPaper(p => ({
      ...p,
      sections: p.sections.map(s => s.id === sectionId ? {
        ...s,
        questions: s.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
      } : s)
    }));
  };

  const removeQuestion = (sectionId: string, qId: string) => {
    setPaper(p => ({
      ...p,
      sections: p.sections.map(s => s.id === sectionId ? {
        ...s,
        questions: s.questions.filter(q => q.id !== qId)
      } : s)
    }));
  };

  const handleSave = async () => {
    if (!paper.title || !paper.subjectId) return showToast('Title and Subject are required', 'warning');
    
    setSaving(true);
    try {
      if (id) {
        await api.put(`/api/academic-tools/question-papers/${id}`, paper);
        showToast('Paper updated successfully', 'success');
      } else {
        await api.post('/api/academic-tools/question-papers', paper);
        showToast('Paper created successfully', 'success');
      }
      navigate(-1);
    } catch (error) {
      showToast('Failed to save paper', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-state">Designing...</div>;

  return (
    <div className="portal-content" style={{ padding: '0' }}>
      <div className="builder-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', height: 'calc(100vh - 120px)' }}>
        
        {/* Editor Side */}
        <div className="editor-side" style={{ overflowY: 'auto', padding: '2rem', borderRight: '1px solid var(--glass-border)' }}>
          <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2><i className="fas fa-edit mr-2"></i> Paper Editor</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => window.print()}><i className="fas fa-print mr-2"></i> Print</button>
              <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (id ? 'Update Paper' : 'Finalize Paper')}
              </button>
            </div>
          </div>

          <div className="form-group glass" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
            <label>Paper Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Mathematics Final Exam 2026"
              value={paper.title}
              onChange={(e) => setPaper(p => ({ ...p, title: e.target.value }))}
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label>Subject *</label>
                <select value={paper.subjectId} onChange={(e) => setPaper(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label>Duration (minutes)</label>
                <input 
                  type="number" 
                  value={paper.duration}
                  onChange={(e) => setPaper(p => ({ ...p, duration: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Sections List */}
          <div className="sections-container">
            {paper.sections.map((section) => (
              <div key={section.id} className="section-block animate-in" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    value={section.title}
                    onChange={(e) => setPaper(p => ({ ...p, sections: p.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s) }))}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', fontSize: '1.1rem', fontWeight: 800, padding: '4px' }}
                    onFocus={(e) => e.target.style.borderBottomColor = 'var(--blue)'}
                    onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                  />
                  <button className="btn-icon btn-delete" onClick={() => setPaper(p => ({ ...p, sections: p.sections.filter(s => s.id !== section.id) }))}><i className="fas fa-trash"></i></button>
                </div>

                <div className="questions-list">
                  {section.questions.map((question, qIdx) => (
                    <div key={question.id} className="question-item" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--blue)' }}>Q{qIdx + 1}.</span>
                        <select 
                          value={question.type} 
                          onChange={(e) => updateQuestion(section.id, question.id, { type: e.target.value as any })}
                          style={{ width: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}
                        >
                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                          <option value="STRUCTURED">Structured</option>
                          <option value="ESSAY">Essay</option>
                        </select>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input 
                            type="number" 
                            value={question.marks} 
                            onChange={(e) => updateQuestion(section.id, question.id, { marks: parseInt(e.target.value) })}
                            style={{ width: '60px', padding: '4px', textAlign: 'center' }} 
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Marks</span>
                        </div>
                        <button className="btn-icon btn-delete" style={{ padding: '4px' }} onClick={() => removeQuestion(section.id, question.id)}><i className="fas fa-times"></i></button>
                      </div>
                      <textarea 
                        placeholder="Type your question here..."
                        value={question.text}
                        onChange={(e) => updateQuestion(section.id, question.id, { text: e.target.value })}
                        style={{ background: 'transparent', resize: 'none' }}
                      />
                      
                      {question.type === 'MULTIPLE_CHOICE' && (
                        <div className="mcq-options" style={{ marginTop: '10px', paddingLeft: '30px' }}>
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{String.fromCharCode(65 + i)})</span>
                              <input 
                                type="text" 
                                placeholder={`Option ${i+1}`}
                                value={question.options?.[i] || ''}
                                onChange={(e) => {
                                  const newOptions = [...(question.options || ['', '', '', ''])];
                                  newOptions[i] = e.target.value;
                                  updateQuestion(section.id, question.id, { options: newOptions });
                                }}
                                style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button className="btn btn-ghost" style={{ width: '100%', border: '1px dashed var(--glass-border)' }} onClick={() => addQuestion(section.id)}>
                  <i className="fas fa-plus mr-2"></i> Add Question to {section.title}
                </button>
              </div>
            ))}

            <button className="btn btn-outline" style={{ width: '100%', marginBottom: '4rem' }} onClick={addSection}>
              <i className="fas fa-layer-group mr-2"></i> Add New Section
            </button>
          </div>
        </div>

        {/* Preview Side */}
        <div className="preview-side" style={{ background: '#f8fafc', overflowY: 'auto', padding: '3rem' }}>
          {(() => {
            const pBuiltin = PAPER_BUILTIN.find(p => p.id === templateConfig?.paperDesign) || PAPER_BUILTIN[0];
            const pColor = pBuiltin.color;
            const logoUrl = templateConfig?.paperLogo || templateConfig?.consultationLogo || schoolInfo?.logo || user?.school?.logo;
            
            return (
              <div className="paper-preview" style={{ 
                background: 'white', 
                minHeight: '100%', 
                width: '100%', 
                maxWidth: '800px', 
                margin: '0 auto', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                borderRadius: '2px',
                padding: '4rem',
                color: 'black',
                fontFamily: '"Times New Roman", Times, serif',
                borderTop: `8px solid ${pColor}`
              }}>
                {/* Paper Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: `2px solid ${pColor}`, paddingBottom: '2rem' }}>
                  {logoUrl && (
                    <img src={logoUrl.startsWith('/api') || logoUrl.startsWith('http') ? logoUrl : `/api/storage/file/${logoUrl}`} alt="School Logo" style={{ height: '100px', marginBottom: '15px' }} />
                  )}
                  <h1 style={{ margin: '0 0 15px', fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '1px', color: pColor }}>
                {schoolInfo?.name || user?.school?.name || 'SCHOOL NAME'}
              </h1>
              
              <h2 style={{ textTransform: 'uppercase', fontSize: '1.8rem', marginBottom: '20px' }}>{paper.title || 'Untitled Examination Paper'}</h2>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', fontSize: '1.1rem', fontWeight: 600 }}>
                <span>SUBJECT: {subjects.find(s => s.id === paper.subjectId)?.name || '_________'}</span>
                <span>TIME: {Math.floor(paper.duration / 60)}h {paper.duration % 60}m</span>
              </div>
              <div style={{ marginTop: '1.5rem', fontWeight: 800, fontSize: '1.2rem' }}>TOTAL MARKS: {paper.sections.reduce((acc, s) => acc + s.questions.reduce((qa, q) => qa + q.marks, 0), 0)}</div>
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textDecoration: 'underline' }}>INSTRUCTIONS TO CANDIDATES</h3>
              <p style={{ fontSize: '1rem', marginTop: '10px' }}>{paper.instructions}</p>
            </div>
            
            <div className="cover-page-break" style={{ margin: '40px 0', borderBottom: '1px dashed #ccc' }}></div>
            
            <div className="subsequent-header" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem', borderBottom: `2px solid ${pColor}`, paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.2rem', color: pColor }}>{schoolInfo?.name || user?.school?.name || 'SCHOOL NAME'}</h3>
              <h4 style={{ margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '1rem' }}>{paper.title || 'Untitled Examination Paper'}</h4>
            </div>

            {/* Sections Content */}
            {paper.sections.map((section) => (
              <div key={section.id} style={{ marginTop: '2.5rem' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', textDecoration: 'underline', marginBottom: '1.5rem' }}>
                  {section.title.toUpperCase()}
                </div>
                {section.questions.map((question, qIdx) => (
                  <div key={question.id} style={{ marginBottom: '2rem', display: 'flex', gap: '15px' }}>
                    <div style={{ fontWeight: 800 }}>{qIdx + 1}.</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ whiteSpace: 'pre-wrap', marginBottom: '10px', fontSize: '1.1rem' }}>{question.text || '____________________________________________________?'}</p>
                      
                      {question.type === 'MULTIPLE_CHOICE' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '1rem' }}>
                          {question.options?.map((opt, i) => (
                            <div key={i}>{String.fromCharCode(65 + i)}) {opt || '_________'}</div>
                          ))}
                        </div>
                      )}

                      {question.type === 'STRUCTURED' && (
                        <div style={{ borderBottom: '1px dotted #ccc', height: '100px', margin: '10px 0' }}></div>
                      )}

                      <div style={{ textAlign: 'right', fontWeight: 700, fontStyle: 'italic' }}>[{question.marks}]</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: '4rem', fontWeight: 800, borderTop: '1px solid black', paddingTop: '1rem' }}>
              --- END OF EXAMINATION ---
            </div>
            
            {templateConfig?.paperSignature && (
              <div style={{ textAlign: 'right', marginTop: '2rem' }}>
                <img src={`/api/storage/file/${templateConfig.paperSignature}`} alt="Signature" style={{ height: '60px', objectFit: 'contain' }} />
                <div style={{ borderTop: '1px dashed #ccc', width: '200px', display: 'inline-block', marginTop: '5px', color: '#2d3748', fontSize: '0.9rem', paddingTop: '5px', textAlign: 'center' }}>Examiner Signature</div>
              </div>
            )}
            
            <div className="print-footer">
              {schoolInfo?.name || 'School Name'} 
              {schoolInfo?.address && ` | ${schoolInfo.address}`}
              {schoolInfo?.phone && ` | ${schoolInfo.phone}`}
              {schoolInfo?.email && ` | ${schoolInfo.email}`}
            </div>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        .builder-layout input, .builder-layout select, .builder-layout textarea {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          width: 100%;
          outline: none;
        }
        .builder-layout label {
          color: var(--gray-400);
          font-size: 0.8rem;
          margin-bottom: 6px;
          display: block;
          font-weight: 600;
        }
        .question-item:hover { border-color: var(--blue) !important; }

        @media print {
          body * {
            visibility: hidden;
          }
          .preview-side, .preview-side * {
            visibility: visible;
          }
          .preview-side {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }
          .paper-preview {
            border: none !important;
            box-shadow: none !important;
            padding: 20px !important;
            margin: 0 !important;
          }
          .print-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            text-align: center;
            padding: 10px 0;
            background: white;
            border-top: 1px solid #ccc;
            font-size: 0.85rem;
            color: #333;
          }
          .cover-page-break {
            border-bottom: none !important;
            margin: 0 !important;
          }
          .subsequent-header {
            display: block !important;
          }
        }
        @media screen {
          .print-footer {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
