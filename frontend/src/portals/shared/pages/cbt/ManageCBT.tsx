import React, { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

export default function ManageCBT() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/teacher';

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Active' | 'Expired' | 'Pending'>('Pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Creation Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    date: '',
    time: '',
    passingPercent: 50,
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/cbt');
      setExams(res.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch exams', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [classRes, subjRes, sectRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/subjects'),
        api.get('/api/classes/sections')
      ]);
      setClasses(classRes.data || []);
      setSubjects(subjRes.data || []);
      setSections(sectRes.data || []);
    } catch (error) {
      console.error('Failed to load initial cbt data');
    
    }
  };

  const [templateConfig, setTemplateConfig] = useState<any>({});
  
  const PAPER_BUILTIN = [
    { id: 'academic-classic',  name: 'Academic Classic',  color: '#1e3a8a', accent: '#eff6ff', icon: 'fa-book-open' },
    { id: 'modern-assessment', name: 'Modern Assessment', color: '#0f172a', accent: '#f8fafc', icon: 'fa-pen-nib' },
    { id: 'formal-exam',       name: 'Formal Exam',       color: '#475569', accent: '#f1f5f9', icon: 'fa-file-signature' },
  ];

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get('/api/reports/template');
      if (data && data.config) setTemplateConfig(data.config);
    } catch (e) { console.error(e); }
  };

  // ─── Shared: build the exam HTML for print/PDF ───────────────────────────
  const buildExamHtml = (forPrint = false): string => {
    const pBuiltin = PAPER_BUILTIN.find(p => p.id === templateConfig?.paperDesign) || PAPER_BUILTIN[0];
    const pColor = pBuiltin.color;

    // School logo: use active user's branding logo first, then fallbacks
    const branding = user?.schoolBranding || previewData.school?.branding as any;
    const rawLogo = branding?.logo || templateConfig?.paperLogo || templateConfig?.consultationLogo || previewData.school?.logo || null;
    const logoSrc = rawLogo
      ? (rawLogo.startsWith('http') ? rawLogo
        : rawLogo.startsWith('/api') ? `${window.location.origin}${rawLogo}`
        : `${window.location.origin}/api/storage/media/global/${rawLogo}`)
      : null;

    // Group questions by page number (as set during exam creation)
    const questions: any[] = previewData.questions || [];
    const pageMap: Record<number, any[]> = {};
    questions.forEach(q => {
      const pg = q.page || 1;
      if (!pageMap[pg]) pageMap[pg] = [];
      pageMap[pg].push(q);
    });
    const pageNumbers = Object.keys(pageMap).map(Number).sort((a, b) => a - b);
    const totalPages = pageNumbers.length;

    // Build each printed page
    const pagesHtml = pageNumbers.map((pageNum, pageIdx) => {
      const pageQuestions = pageMap[pageNum];

      // Group by section within this page
      const sectionMap: Record<string, any[]> = {};
      pageQuestions.forEach((q: any) => {
        const sec = q.section || '';
        if (!sectionMap[sec]) sectionMap[sec] = [];
        sectionMap[sec].push(q);
      });

      const sectionsHtml = Object.entries(sectionMap).map(([sectionName, qs]) => {
        const sectionHeader = sectionName
          ? `<div style="text-align:center;font-weight:800;font-size:1.15rem;text-decoration:underline;margin:1.2rem 0 1rem;text-transform:uppercase">${sectionName}</div>`
          : '';

        const questionsHtml = qs.map((q: any) => {
          const globalIdx = questions.findIndex((gq: any) => gq.id === q.id) + 1;
          const optionsHtml = q.options && q.options.length > 0
            ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-left:1rem;margin-top:8px">${
                q.options.map((opt: string, i: number) =>
                  `<div>${String.fromCharCode(65 + i)}) ${opt || '_________'}</div>`
                ).join('')}</div>`
            : (q.type !== 'True or false'
                ? `<div style="border-bottom:1px dotted #ccc;height:70px;margin:10px 0"></div>`
                : `<div style="margin-top:8px;display:flex;gap:2rem"><span>A) True</span><span>B) False</span></div>`);

          const imageHtml = q.imageUrl
            ? `<div style="margin-bottom:12px"><img src="${q.imageUrl}" alt="figure" style="max-width:100%;max-height:260px"/></div>`
            : '';

          return `<div style="margin-bottom:1.8rem;display:flex;gap:14px;page-break-inside:avoid">
            <div style="font-weight:800;min-width:28px">${globalIdx}.</div>
            <div style="flex:1">
              <p style="white-space:pre-wrap;margin:0 0 8px;font-size:1.05rem">${q.question}</p>
              ${imageHtml}${optionsHtml}
              <div style="text-align:right;font-weight:700;font-style:italic;font-size:0.85rem;margin-top:6px">[${q.mark} mark${q.mark > 1 ? 's' : ''}]</div>
            </div>
          </div>`;
        }).join('');

        return sectionHeader + questionsHtml;
      }).join('');

      // Page 1 includes the cover header + instructions
      const isCoverPage = pageIdx === 0;
      const coverHtml = isCoverPage ? `
        <div style="text-align:center;margin-bottom:2rem;border-top:8px solid ${pColor};padding-top:1.5rem;border-bottom:2px solid ${pColor};padding-bottom:1.5rem">
          ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height:90px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto" crossorigin="anonymous"/>` : ''}
          <h1 style="font-size:2.2rem;text-transform:uppercase;letter-spacing:1px;color:${pColor};margin-bottom:8px">${previewData.school?.name || 'SCHOOL NAME'}</h1>
          <h2 style="font-size:1.6rem;text-transform:uppercase;margin-bottom:16px">${previewData.title || 'Untitled CBT Exam'}</h2>
          <div style="display:flex;justify-content:center;gap:3rem;font-size:1rem;font-weight:600">
            <span>SUBJECT: ${previewData.subject?.name || '_________'}</span>
            <span>DATE: ${new Date(previewData.date).toLocaleDateString()}</span>
            <span>TIME: ${previewData.time}</span>
          </div>
          <div style="margin-top:0.8rem;font-weight:800">PASSING PERCENT: ${previewData.passingPercent}%</div>
        </div>
        <div style="margin-bottom:1.5rem">
          <h3 style="font-size:1rem;font-weight:800;text-decoration:underline;margin-bottom:6px">INSTRUCTIONS TO CANDIDATES</h3>
          ${previewData.instructions
            ? `<p style="font-size:0.98rem;white-space:pre-wrap;line-height:1.6">${previewData.instructions}</p>`
            : `<ul style="padding-left:20px;line-height:1.8;font-size:0.98rem">
                 <li>Read each question carefully before answering.</li>
                 <li>For multiple-choice questions, select the best possible option.</li>
                 <li>Total questions: ${questions.length}</li>
               </ul>`}
        </div>
        <hr style="border:none;border-bottom:1px dashed #999;margin:1rem 0"/>
      ` : `
        <div style="text-align:center;margin-bottom:1rem;border-bottom:1px solid ${pColor};padding-bottom:0.5rem">
          <strong>${previewData.school?.name || 'SCHOOL NAME'}</strong> &bull;
          <em>${previewData.title}</em> &bull; Page ${pageNum} of ${totalPages}
        </div>
      `;

      const isLastPage = pageIdx === pageNumbers.length - 1;
      const pageBreak = !isLastPage ? 'break-after: page; page-break-after: always;' : '';

      return `<div class="exam-page" style="margin-bottom: 20px; ${pageBreak}">${coverHtml}${sectionsHtml}</div>`;
    }).join('');

    const endFooter = `
      <div style="text-align:center;margin-top:3rem;font-weight:800;border-top:1px solid #000;padding-top:1rem">--- END OF EXAMINATION ---</div>
      <div style="text-align:center;font-size:0.78rem;color:#555;margin-top:1rem">
        ${[previewData.school?.name, previewData.school?.address, previewData.school?.phone, previewData.school?.email].filter(Boolean).join(' \u2022 ')}
      </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${previewData.title || 'Exam'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Times New Roman",Times,serif;color:#000;background:#fff;${forPrint ? '' : 'padding:2cm'}}
    @page{margin:2cm}
    @media print{body{padding:0}}
  </style>
</head>
<body>${pagesHtml}${endFooter}</body>
</html>`;
  };

  // ─── Print ────────────────────────────────────────────────────────────────
  const handlePrintExam = () => {
    if (!previewData) return;
    const html = buildExamHtml(true);
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    printWin.onload = () => setTimeout(() => { printWin.print(); printWin.close(); }, 400);
    setTimeout(() => { try { printWin.print(); printWin.close(); } catch (_) {} }, 1200);
  };

  // ─── Download PDF ─────────────────────────────────────────────────────────
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const handleDownloadPDF = () => {
    if (!previewData || generatingPdf) return;
    const html = buildExamHtml(false);
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
    setGeneratingPdf(true);
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    const cleanup = () => { setGeneratingPdf(false); };
    const doPrint = () => {
      // Trigger browser Save as PDF dialog
      printWin.print();
      setTimeout(() => { try { printWin.close(); } catch (_) {} cleanup(); }, 1000);
    };
    printWin.onload = () => setTimeout(doPrint, 400);
    setTimeout(doPrint, 1500);
  };



  // ─── Download Word (.docx) ────────────────────────────────────────────────
  const [generatingWord, setGeneratingWord] = useState(false);
  const handleDownloadWord = async () => {
    if (!previewData || generatingWord) return;
    setGeneratingWord(true);
    try {
      const questions: any[] = previewData.questions || [];
      const branding = previewData.school?.branding as any;
      const schoolName = previewData.school?.name || 'SCHOOL NAME';

      // Group by page then section (same logic as HTML builder)
      const pageMap: Record<number, any[]> = {};
      questions.forEach((q: any) => {
        const pg = q.page || 1;
        if (!pageMap[pg]) pageMap[pg] = [];
        pageMap[pg].push(q);
      });
      const pageNumbers = Object.keys(pageMap).map(Number).sort((a, b) => a - b);

      const children: any[] = [];

      // Cover info
      children.push(
        new Paragraph({ text: schoolName, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: previewData.title || 'Untitled Exam', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
        new Paragraph({
          children: [
            new TextRun({ text: `Subject: ${previewData.subject?.name || ''}   `, bold: true }),
            new TextRun({ text: `Date: ${new Date(previewData.date).toLocaleDateString()}   `, bold: true }),
            new TextRun({ text: `Time: ${previewData.time}`, bold: true }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Passing Percentage: ${previewData.passingPercent}%`, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        new Paragraph({ text: 'INSTRUCTIONS TO CANDIDATES', heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
      );

      if (previewData.instructions) {
        children.push(new Paragraph({ text: previewData.instructions, spacing: { after: 300 } }));
      } else {
        ['Read each question carefully before answering.',
         'For multiple-choice questions, select the best possible option.',
         `Total questions: ${questions.length}`
        ].forEach(line => children.push(new Paragraph({ text: `• ${line}`, spacing: { after: 80 } })));
        children.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // Pages
      pageNumbers.forEach((pageNum, pageIdx) => {
        if (pageIdx > 0) {
          // Page break before each new exam page
          children.push(new Paragraph({ pageBreakBefore: true }));
          children.push(new Paragraph({
            children: [new TextRun({ text: `${schoolName}  •  ${previewData.title}  •  Page ${pageNum} of ${pageNumbers.length}`, italics: true, size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
          }));
        }

        const pageQuestions = pageMap[pageNum];
        const sectionMap: Record<string, any[]> = {};
        pageQuestions.forEach((q: any) => {
          const sec = q.section || '';
          if (!sectionMap[sec]) sectionMap[sec] = [];
          sectionMap[sec].push(q);
        });

        Object.entries(sectionMap).forEach(([sectionName, qs]) => {
          if (sectionName) {
            children.push(new Paragraph({
              children: [new TextRun({ text: sectionName.toUpperCase(), bold: true, underline: {} })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 160 },
            }));
          }

          qs.forEach((q: any) => {
            const globalIdx = questions.findIndex((gq: any) => gq.id === q.id) + 1;
            // Question text
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${globalIdx}. `, bold: true }),
                new TextRun({ text: q.question || '' }),
                new TextRun({ text: `  [${q.mark} mark${q.mark > 1 ? 's' : ''}]`, italics: true, color: '555555' }),
              ],
              spacing: { before: 160, after: 80 },
            }));

            // Options
            if (q.options && q.options.length > 0) {
              q.options.forEach((opt: string, i: number) => {
                children.push(new Paragraph({
                  children: [new TextRun({ text: `    ${String.fromCharCode(65 + i)}) ${opt || '_________'}` })],
                  spacing: { after: 40 },
                }));
              });
              children.push(new Paragraph({ spacing: { after: 80 } }));
            } else if (q.type === 'True or false') {
              children.push(new Paragraph({ children: [new TextRun({ text: '    A) True          B) False' })], spacing: { after: 120 } }));
            } else {
              // Answer line
              children.push(new Paragraph({ children: [new TextRun({ text: '    Answer: _______________________________' })], spacing: { after: 120 } }));
            }
          });
        });
      });

      // End
      children.push(
        new Paragraph({ text: '--- END OF EXAMINATION ---', alignment: AlignmentType.CENTER, spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000' } } }),
        new Paragraph({
          children: [new TextRun({ text: [previewData.school?.name, previewData.school?.address, previewData.school?.phone, previewData.school?.email].filter(Boolean).join(' • '), size: 16, color: '555555' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120 },
        })
      );

      const doc = new Document({
        sections: [{ properties: {}, children }],
        creator: schoolName,
        title: previewData.title || 'Exam',
        description: `CBT Exam - ${previewData.subject?.name}`,
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${(previewData.title || 'exam').replace(/\s+/g, '_')}.docx`);
    } catch (err) {
      console.error('Word export error:', err);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setGeneratingWord(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchInitialData();
    fetchTemplate();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.title || !createFormData.date || !createFormData.time || !createFormData.subjectId) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...createFormData,
        classId: createFormData.classId || null,
        sectionId: createFormData.sectionId || null,
        subjectId: createFormData.subjectId || null
      };
      const res = await api.post('/api/cbt', payload);
      if (res.data?.success) {
        showToast('CBT Exam created successfully!', 'success');
        setCreateFormData({
          title: '',
          description: '',
          instructions: '',
          classId: '',
          sectionId: '',
          subjectId: '',
          date: '',
          time: '',
          passingPercent: 50,
        });
        setIsCreateModalOpen(false);
        fetchExams();
      } else {
        throw new Error(res.data?.error || 'Failed to create exam');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this exam?'))) return;
    try {
      await api.delete(`/api/cbt/${id}`);
      showToast('Exam deleted successfully', 'success');
      fetchExams();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete exam', 'error');
    
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.put(`/api/cbt/${id}`, { status: 'Active' });
      showToast('Exam published successfully', 'success');
      fetchExams();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to publish exam', 'error');
    
    }
  };

  const handlePreview = async (id: string) => {
    setPreviewExamId(id);
    setLoadingPreview(true);
    try {
      const res = await api.get(`/api/cbt/${id}`);
      setPreviewData(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load exam preview', 'error');
      setPreviewExamId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredExams = exams.filter(e => e.status === activeTab);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Manage CBT Exams</h1>
          <p>View and manage all computer-based tests.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="portal-btn-primary">
          <i className="fas fa-plus mr-2"></i> Create CBT Exam
        </button>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ padding: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button 
              style={{ padding: '15px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'Pending' ? '2px solid var(--school-primary, #3182ce)' : 'none', color: activeTab === 'Pending' ? 'var(--school-primary, #3182ce)' : '#4a5568', fontWeight: activeTab === 'Pending' ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => { setActiveTab('Pending'); setCurrentPage(1); }}
            >
              Pending Exams
            </button>
            <button 
              style={{ padding: '15px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'Active' ? '2px solid var(--school-primary, #3182ce)' : 'none', color: activeTab === 'Active' ? 'var(--school-primary, #3182ce)' : '#4a5568', fontWeight: activeTab === 'Active' ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => { setActiveTab('Active'); setCurrentPage(1); }}
            >
              Active Exams
            </button>
            <button 
              style={{ padding: '15px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'Expired' ? '2px solid var(--school-primary, #3182ce)' : 'none', color: activeTab === 'Expired' ? 'var(--school-primary, #3182ce)' : '#4a5568', fontWeight: activeTab === 'Expired' ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => { setActiveTab('Expired'); setCurrentPage(1); }}
            >
              Expired Exams
            </button>
          </div>
        </div>
        <div className="portal-card-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading exams...</div>
          ) : filteredExams.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No {activeTab.toLowerCase()} exams found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Questions</th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const indexOfLastItem = currentPage * itemsPerPage;
                    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                    const currentItems = filteredExams.slice(indexOfFirstItem, indexOfLastItem);
                    if (currentItems.length === 0 && filteredExams.length > 0) setCurrentPage(1);
                    return currentItems.map(exam => (
                    <tr key={exam.id}>
                      <td style={{ fontWeight: 600 }}>{exam.title}</td>
                      <td>{exam.class?.name || 'Any Class'}</td>
                      <td>{exam.subject?.name || 'Any Subject'}</td>
                      <td>
                        {new Date(exam.date).toLocaleDateString()} at {exam.time}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                          backgroundColor: exam.status === 'Active' ? '#c6f6d5' : exam.status === 'Expired' ? '#fed7d7' : '#e2e8f0',
                          color: exam.status === 'Active' ? '#22543d' : exam.status === 'Expired' ? '#822727' : '#4a5568'
                        }}>
                          {exam.status}
                        </span>
                      </td>
                      <td>{exam._count?.questions || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Add Questions" onClick={() => navigate(`${basePath}/cbt/manage/${exam.id}/questions`)}>
                            <i className="fas fa-plus"></i>
                          </button>
                          <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Preview Exam" onClick={() => handlePreview(exam.id)}>
                            <i className="fas fa-eye"></i>
                          </button>
                          {exam.status === 'Pending' && (
                            <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Publish Exam" onClick={() => handlePublish(exam.id)}>
                              <i className="fas fa-upload"></i>
                            </button>
                          )}
                          <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Exam" onClick={() => handleDelete(exam.id)}>
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
              </table>
              
              {filteredExams.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredExams.length)} of {filteredExams.length} entries
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredExams.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredExams.length / itemsPerPage) || filteredExams.length === 0}
                      className="portal-btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {isCreateModalOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: 800, width: '90%', padding: '24px', position: 'relative', background: 'white', color: '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>
                Create CBT Exam
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Exam Title <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. Mid Term Exam" 
                  value={createFormData.title}
                  onChange={e => setCreateFormData({...createFormData, title: e.target.value})}
                  required 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Class / Level <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    className="portal-input" 
                    value={createFormData.classId}
                    onChange={e => setCreateFormData({...createFormData, classId: e.target.value})}
                    required
                  >
                    <option value="">Select Class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Section</label>
                  <select 
                    className="portal-input" 
                    value={createFormData.sectionId}
                    onChange={e => setCreateFormData({...createFormData, sectionId: e.target.value})}
                  >
                    <option value="">All Sections</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Description (Optional)</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  value={createFormData.description}
                  onChange={e => setCreateFormData({...createFormData, description: e.target.value})}
                  placeholder="e.g. Mid-term examination for Science"
                />
              </div>

              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Cover Page Instructions (Optional)</label>
                <textarea 
                  className="portal-input" 
                  value={createFormData.instructions}
                  onChange={e => setCreateFormData({...createFormData, instructions: e.target.value})}
                  placeholder="Enter instructions to be shown on the exam cover page..."
                  rows={4}
                />
              </div>

              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Subject <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="portal-input" 
                  value={createFormData.subjectId}
                  onChange={e => setCreateFormData({...createFormData, subjectId: e.target.value})}
                  required
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '24px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Exam Date <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="date" 
                    className="portal-input" 
                    value={createFormData.date}
                    onChange={e => setCreateFormData({...createFormData, date: e.target.value})}
                    required 
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Time <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="time" 
                    className="portal-input" 
                    value={createFormData.time}
                    onChange={e => setCreateFormData({...createFormData, time: e.target.value})}
                    required 
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Passing Percentage (%) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    className="portal-input" 
                    min="0" max="100"
                    value={createFormData.passingPercent}
                    onChange={e => setCreateFormData({...createFormData, passingPercent: Number(e.target.value)})}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="portal-btn-ghost" style={{ padding: '10px 20px', fontWeight: 800 }}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ padding: '10px 24px', fontWeight: 900 }}>
                  {submitting ? 'Creating...' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exam Preview Modal */}
      {previewExamId && (
        <div className="portal-modal-overlay" onClick={() => setPreviewExamId(null)} style={{ padding: '40px 20px', overflowY: 'auto', alignItems: 'flex-start' }}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: 900, width: '100%', margin: '0 auto', background: 'white', color: '#1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                <i className="fas fa-eye mr-2"></i> Exam Preview
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={handlePrintExam} className="portal-btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem' }} title="Print exam">
                  <i className="fas fa-print mr-1"></i> Print
                </button>
                <button onClick={handleDownloadPDF} disabled={generatingPdf} className="portal-btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem', background: '#dc2626', borderColor: '#dc2626', color: 'white' }} title="Download as PDF">
                  {generatingPdf ? <><i className="fas fa-spinner fa-spin mr-1"></i> PDF…</> : <><i className="fas fa-file-pdf mr-1"></i> PDF</>}
                </button>
                <button onClick={handleDownloadWord} disabled={generatingWord} className="portal-btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem', background: '#2563eb', borderColor: '#2563eb', color: 'white' }} title="Download as Word (.docx)">
                  {generatingWord ? <><i className="fas fa-spinner fa-spin mr-1"></i> Word…</> : <><i className="fas fa-file-word mr-1"></i> Word</>}
                </button>
                <button onClick={() => setPreviewExamId(null)} className="portal-btn-ghost" style={{ padding: '8px', fontSize: '1.2rem', color: '#64748b' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="preview-content" style={{ padding: '40px', background: 'white', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {loadingPreview ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin fa-2x mb-3"></i>
                  <p>Loading exam content...</p>
                </div>
              ) : previewData ? (
                <div>
                  {previewPage === 0 ? (
                    // COVER PAGE
                    <div className="animate-in zoom-in duration-300" style={{ padding: '20px', textAlign: 'center' }}>
                      <h1 style={{ fontSize: '2rem', margin: '0 0 10px', color: '#1e293b' }}>{previewData.school?.name || 'School Name'}</h1>
                      <h2 style={{ fontSize: '1.5rem', color: '#334155', marginBottom: '30px' }}>{previewData.title}</h2>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px', fontSize: '1.1rem', fontWeight: 600 }}>
                        <div>Subject: {previewData.subject?.name || 'General'}</div>
                        <div>Date: {new Date(previewData.date).toLocaleDateString()}</div>
                        <div>Time: {previewData.time}</div>
                      </div>

                      <div style={{ textAlign: 'left', background: '#f8fafc', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '40px' }}>
                        <h3 style={{ marginTop: 0 }}>Instructions to Candidates</h3>
                        {previewData.instructions ? (
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.1rem' }}>
                            {previewData.instructions}
                          </div>
                        ) : (
                          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', fontSize: '1.1rem' }}>
                            <li>Read each question carefully before answering.</li>
                            <li>For multiple-choice questions, select the best possible option.</li>
                            <li>Total questions: {previewData.questions?.length || 0}</li>
                            <li>Passing percentage: {previewData.passingPercent}%</li>
                          </ul>
                        )}
                      </div>

                      <button 
                        className="portal-btn-primary" 
                        style={{ padding: '15px 40px', fontSize: '1.2rem', fontWeight: 'bold' }}
                        onClick={() => setPreviewPage(1)}
                      >
                        Start Exam Preview
                      </button>
                    </div>
                  ) : (
                    // EXAM PAGES
                    <div className="animate-in fade-in duration-300">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{previewData.title}</h2>
                        <div style={{ fontWeight: 600, color: '#64748b' }}>
                          Page {previewPage} of {Math.max(1, ...((previewData.questions || []).map((q: any) => q.page || 1)))}
                        </div>
                      </div>
                      
                      {(() => {
                        const totalPages = Math.max(1, ...((previewData.questions || []).map((q: any) => q.page || 1)));
                        const currentQuestions = (previewData.questions || []).filter((q: any) => (q.page || 1) === previewPage);
                        const sections = currentQuestions.reduce((acc: any, q: any) => {
                          const sectionName = q.section || 'General';
                          if (!acc[sectionName]) acc[sectionName] = [];
                          acc[sectionName].push(q);
                          return acc;
                        }, {});

                        return (
                          <div>
                            {Object.keys(sections).map((sectionName) => (
                              <div key={sectionName} style={{ marginBottom: '40px' }}>
                                {sectionName !== 'General' && (
                                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', color: '#1e293b' }}>
                                    {sectionName}
                                  </h3>
                                )}
                                
                                {sections[sectionName].map((q: any) => {
                                  const globalIdx = previewData.questions.findIndex((gq: any) => gq.id === q.id) + 1;
                                  return (
                                    <div key={q.id} style={{ marginBottom: '30px', padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#334155' }}>{globalIdx}.</div>
                                        <div style={{ flex: 1, fontSize: '1.1rem', lineHeight: '1.6' }}>{q.question}</div>
                                        <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>[{q.mark} mark{q.mark > 1 ? 's' : ''}]</div>
                                      </div>

                                      {q.imageUrl && (
                                        <div style={{ marginBottom: '15px', paddingLeft: '35px' }}>
                                          <img src={q.imageUrl} alt="Question figure" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                        </div>
                                      )}

                                      <div style={{ paddingLeft: '35px' }}>
                                        {q.options && q.options.length > 0 && (
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                            {q.options.map((opt: string, optIdx: number) => (
                                              <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: q.type === 'Multiple choice' ? '4px' : '50%', border: '2px solid #cbd5e0' }}></div>
                                                <span style={{ fontSize: '1.05rem' }}>{opt}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {(!q.options || q.options.length === 0) && q.type !== 'True or false' && (
                                          <div style={{ marginTop: '15px' }}>
                                            <div style={{ borderBottom: '1px dashed #cbd5e0', height: '30px', maxWidth: '400px' }}></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}

                            {currentQuestions.length === 0 && (
                              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                No questions found on this page.
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                              <button 
                                className="portal-btn-ghost" 
                                onClick={() => setPreviewPage(prev => Math.max(0, prev - 1))}
                              >
                                <i className="fas fa-chevron-left mr-2"></i> Previous
                              </button>
                              
                              {previewPage < totalPages ? (
                                <button 
                                  className="portal-btn-primary" 
                                  onClick={() => setPreviewPage(prev => Math.min(totalPages, prev + 1))}
                                >
                                  Next <i className="fas fa-chevron-right ml-2"></i>
                                </button>
                              ) : (
                                <button 
                                  className="portal-btn-secondary"
                                  onClick={() => setPreviewPage(0)}
                                >
                                  Restart Preview
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#ef4444' }}>Could not load preview data.</p>
              )}
            </div>

            {/* Print Only Container */}
            {previewData && (
              <div className="printable-preview" style={{ background: 'white', padding: '20px' }}>
                {(() => {
                  const pBuiltin = PAPER_BUILTIN.find(p => p.id === templateConfig?.paperDesign) || PAPER_BUILTIN[0];
                  const pColor = pBuiltin.color;
                  const logoUrl = templateConfig?.paperLogo || templateConfig?.consultationLogo || previewData.school?.logo;
                  
                  return (
                    <div style={{ 
                      width: '100%', 
                      maxWidth: '800px', 
                      margin: '0 auto', 
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
                          {previewData.school?.name || 'SCHOOL NAME'}
                        </h1>
                        
                        <h2 style={{ textTransform: 'uppercase', fontSize: '1.8rem', marginBottom: '20px' }}>{previewData.title || 'Untitled CBT Exam'}</h2>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', fontSize: '1.1rem', fontWeight: 600 }}>
                          <span>SUBJECT: {previewData.subject?.name || '_________'}</span>
                          <span>DATE: {new Date(previewData.date).toLocaleDateString()}</span>
                          <span>TIME: {previewData.time}</span>
                        </div>
                        <div style={{ marginTop: '1.5rem', fontWeight: 800, fontSize: '1.2rem' }}>PASSING PERCENT: {previewData.passingPercent}%</div>
                      </div>

                      {/* Instructions */}
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textDecoration: 'underline' }}>INSTRUCTIONS TO CANDIDATES</h3>
                        {previewData.instructions ? (
                          <p style={{ fontSize: '1rem', marginTop: '10px', whiteSpace: 'pre-wrap' }}>{previewData.instructions}</p>
                        ) : (
                          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', fontSize: '1rem', marginTop: '10px' }}>
                            <li>Read each question carefully before answering.</li>
                            <li>For multiple-choice questions, select the best possible option.</li>
                            <li>Total questions: {previewData.questions?.length || 0}</li>
                          </ul>
                        )}
                      </div>

                      <div className="cover-page-break" style={{ margin: '40px 0', borderBottom: '1px dashed #ccc' }}></div>
              
                      <div className="subsequent-header" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem', borderBottom: `2px solid ${pColor}`, paddingBottom: '1rem' }}>
                        <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.2rem', color: pColor }}>{previewData.school?.name || 'SCHOOL NAME'}</h3>
                        <h4 style={{ margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '1rem' }}>{previewData.title}</h4>
                      </div>

                      {/* All Questions rendered sequentially for print */}
                      {(() => {
                          const pages = (previewData.questions || []).reduce((acc: any, q: any) => {
                            const pageNum = q.page || 1;
                            if (!acc[pageNum]) acc[pageNum] = [];
                            acc[pageNum].push(q);
                            return acc;
                          }, {});
                          
                          const pageNumbers = Object.keys(pages).map(Number).sort((a, b) => a - b);

                          return (
                            <div>
                              {pageNumbers.map((pageNum, pageIndex) => {
                                const pageQuestions = pages[pageNum];
                                const sections = pageQuestions.reduce((acc: any, q: any) => {
                                  const sectionName = q.section || 'General';
                                  if (!acc[sectionName]) acc[sectionName] = [];
                                  acc[sectionName].push(q);
                                  return acc;
                                }, {});

                                return (
                                  <div key={pageNum} style={{ pageBreakAfter: pageIndex < pageNumbers.length - 1 ? 'always' : 'auto' }}>
                                    {Object.keys(sections).map((sectionName) => (
                                      <div key={sectionName} style={{ marginBottom: '40px' }}>
                                        {sectionName !== 'General' && (
                                          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', textDecoration: 'underline', marginBottom: '1.5rem', color: '#1e293b' }}>
                                            {sectionName.toUpperCase()}
                                          </div>
                                        )}
                                        
                                        {sections[sectionName].map((q: any) => {
                                          const globalIdx = previewData.questions.findIndex((gq: any) => gq.id === q.id) + 1;
                                          return (
                                            <div key={q.id} style={{ marginBottom: '2rem', display: 'flex', gap: '15px' }}>
                                              <div style={{ fontWeight: 800 }}>{globalIdx}.</div>
                                              <div style={{ flex: 1 }}>
                                                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '10px', fontSize: '1.1rem' }}>{q.question || '____________________________________________________?'}</p>
                                                
                                                {q.imageUrl && (
                                                  <div style={{ marginBottom: '15px' }}>
                                                    <img src={q.imageUrl} alt="Question figure" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                                                  </div>
                                                )}

                                                {q.options && q.options.length > 0 && (
                                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '1rem' }}>
                                                    {q.options.map((opt: string, i: number) => (
                                                      <div key={i}>{String.fromCharCode(65 + i)}) {opt || '_________'}</div>
                                                    ))}
                                                  </div>
                                                )}
                                                
                                                {(!q.options || q.options.length === 0) && q.type !== 'True or false' && (
                                                  <div style={{ borderBottom: '1px dotted #ccc', height: '100px', margin: '10px 0' }}></div>
                                                )}

                                                <div style={{ textAlign: 'right', fontWeight: 700, fontStyle: 'italic' }}>[{q.mark} mark{q.mark > 1 ? 's' : ''}]</div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                      })()}

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
                        {previewData.school?.name || 'School Name'} 
                        {previewData.school?.address && ` | ${previewData.school.address}`}
                        {previewData.school?.phone && ` | ${previewData.school.phone}`}
                        {previewData.school?.email && ` | ${previewData.school.email}`}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media screen {
          .print-footer { display: none; }
          .printable-preview { display: none !important; }
        }
        @media print {
          /* Hide all text/elements by default */
          body * {
            visibility: hidden;
          }
          
          /* Flatten the entire DOM tree's layout constraints to prevent clipping/1-page bugs */
          * {
            position: static !important;
            overflow: visible !important;
            transform: none !important;
            height: auto !important;
            max-height: none !important;
          }

          /* Make sure the preview and its children are visible */
          .printable-preview, .printable-preview * {
            visibility: visible !important;
          }
          
          /* Position the preview at the top left of the document */
          .printable-preview {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Completely hide unwanted siblings to prevent them from taking up space */
          .no-print, .preview-content, .portal-sidebar, .portal-header, .portal-page-header {
            display: none !important;
          }
          
          .print-footer {
            display: block !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            text-align: center !important;
            padding: 10px 0 !important;
            background: white !important;
            border-top: 1px solid #ccc !important;
            font-size: 0.85rem !important;
            color: #333 !important;
          }
          .cover-page-break {
            border-bottom: none !important;
            margin: 0 !important;
          }
          .subsequent-header {
            display: block !important;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </>
  );
}
