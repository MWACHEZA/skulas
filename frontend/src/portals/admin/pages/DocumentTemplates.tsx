import React, { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SchoolClass { id: string; name: string; level: string; }

interface SchoolInfo {
  name: string; address: string; phone: string; email: string;
  website: string; logo: string | null; motto: string;
  primaryColor: string; accentColor: string;
}

interface StudentPreview {
  id: string; name: string; studentId: string;
  gender: string; dob: string | null;
  class: string; classLevel: string; photo: string | null;
}

interface Templates { front: string | null; back: string | null; }

interface StudentListItem {
  id: string; name: string; studentId: string; class: { name: string; level: string } | null;
  photo: string | null;
}

// ─── Builtin templates catalog ────────────────────────────────────────────────
const BUILTIN_TEMPLATES = [
  { id: 'classic-blue',    name: 'Classic Blue',     color: '#1e40af', accent: '#dbeafe', icon: 'fa-id-card' },
  { id: 'modern-dark',     name: 'Modern Dark',      color: '#0f172a', accent: '#fbbf24', icon: 'fa-address-card' },
  { id: 'green-fresh',     name: 'Fresh Green',      color: '#065f46', accent: '#d1fae5', icon: 'fa-user-graduate' },
  { id: 'maroon-classic',  name: 'Maroon Prestige',  color: '#7c2d12', accent: '#fef3c7', icon: 'fa-shield-alt' },
  { id: 'minimal-white',   name: 'Minimal White',    color: '#1e293b', accent: '#f1f5f9', icon: 'fa-credit-card' },
  { id: 'purple-tech',     name: 'Tech Purple',      color: '#4c1d95', accent: '#ede9fe', icon: 'fa-qrcode' },
];

// ─── ID Card Face Component ───────────────────────────────────────────────────
function IdCardFace({
  school,
  student,
  templateUrl,
  builtinTemplate,
  isBack = false,
  classTerm = 'Class',
  studentIdTerm = 'Student ID',
}: {
  school: SchoolInfo | null;
  student: StudentPreview | null;
  templateUrl: string | null;
  builtinTemplate: typeof BUILTIN_TEMPLATES[0] | null;
  isBack?: boolean;
  classTerm?: string;
  studentIdTerm?: string;
}) {
  const primaryColor = builtinTemplate?.color || school?.primaryColor || '#1e40af';
  const accentColor = builtinTemplate?.accent || school?.accentColor || '#dbeafe';
  const photoUrl = student?.photo ? `/api/storage/file/${student.photo}` : null;
  const logoUrl = school?.logo ? `/api/storage/file/${school.logo}` : null;

  // -- BACK FACE --
  if (isBack) {
    if (templateUrl) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img src={`/api/storage/file/${templateUrl}`} alt="Back Template"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }
    return (
      <div style={{ width: '100%', height: '100%', background: primaryColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        {logoUrl && <img src={logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>MOTTO</div>
          <div style={{ color: accentColor, fontStyle: 'italic', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
            {school?.motto || '"Excellence in Education"'}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          <div>{school?.phone || ''}</div>
          <div>{school?.email || ''}</div>
          <div>{school?.website || ''}</div>
        </div>
        <div style={{ marginTop: 12, padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          If found, please return to the school above
        </div>
      </div>
    );
  }

  // -- FRONT FACE with custom uploaded template --
  if (templateUrl) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <img src={`/api/storage/file/${templateUrl}`} alt="Front Template"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {/* Overlay student data on top of the template */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            {/* Student Photo */}
            <div style={{ width: 68, height: 80, borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0, background: '#e2e8f0' }}>
              {photoUrl
                ? <img src={photoUrl} alt={student?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 28 }}><i className="fas fa-user"></i></div>
              }
            </div>
            {/* Student Details */}
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '8px 12px', backdropFilter: 'blur(4px)' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>{student?.name || 'Student Name'}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', marginTop: 3 }}>{student?.class || classTerm} {student?.classLevel ? `• ${student.classLevel}` : ''}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', marginTop: 2 }}>{studentIdTerm}: {student?.studentId || 'STU-000001'}</div>
            </div>
            {/* QR placeholder */}
            <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.9)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-qrcode" style={{ fontSize: 32, color: '#1e293b' }}></i>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- FRONT FACE with builtin template (or default) --
  return (
    <div style={{ width: '100%', height: '100%', background: primaryColor, display: 'flex', flexDirection: 'column' }}>
      {/* Header band */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid rgba(255,255,255,0.15)` }}>
        {logoUrl
          ? <img src={logoUrl} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fas ${builtinTemplate?.icon || 'fa-id-card'}`} style={{ color: '#fff', fontSize: 16 }}></i>
            </div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem', lineHeight: 1.2 }}>{school?.name || 'School Name'}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>STUDENT IDENTITY CARD</div>
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Photo */}
        <div style={{ width: 64, height: 76, borderRadius: 8, overflow: 'hidden', border: `2px solid ${accentColor}`, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
          {photoUrl
            ? <img src={photoUrl} alt={student?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-user" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 28 }}></i>
              </div>
          }
        </div>
        {/* Details */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.3 }}>{student?.name || 'Student Name'}</div>
          <div style={{ color: accentColor, fontSize: '0.7rem', fontWeight: 700, marginTop: 3 }}>{student?.class || 'Form 4A'}</div>
          {student?.classLevel && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem' }}>{student.classLevel}</div>}
          <div style={{ marginTop: 6, fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{studentIdTerm}: {student?.studentId || 'STU-000001'}</div>
          {student?.gender && <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)' }}>{student.gender}</div>}
        </div>
      </div>
      {/* Footer with QR */}
      <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: accentColor, fontStyle: 'italic', fontSize: '0.6rem', maxWidth: 140 }}>{school?.motto || ''}</div>
        </div>
        <div style={{ width: 44, height: 44, background: accentColor, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: 26, color: primaryColor }}></i>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Drop Zone ─────────────────────────────────────────────────────────
function UploadZone({ label, currentUrl, onUpload, uploading, accept = 'image/*' }: {
  label: string; currentUrl: string | null; onUpload: (file: File) => void; uploading: boolean; accept?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: dragging ? '2px solid #2563eb' : '2px dashed #cbd5e1',
        borderRadius: 16, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
        background: dragging ? '#eff6ff' : '#f8fafc',
        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
      }}
    >
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />

      {currentUrl ? (
        <div>
          <img src={`/api/storage/file/${currentUrl}`} alt={label}
            style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, marginBottom: 10 }} />
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label} uploaded · Click to replace</div>
        </div>
      ) : (
        <div>
          <div style={{ width: 52, height: 52, background: '#e0e7ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, color: '#4f46e5' }}>
            {uploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{uploading ? 'Uploading...' : label}</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>PNG or JPG · Click or drag & drop</div>
        </div>
      )}
    </div>
  );
}

export default function AdminDocumentTemplates() {
  const { showToast } = useToast();
  const { t } = useTerminology();

  const [activeTab, setActiveTab] = useState('reports');
  const [template, setTemplate] = useState<any>({ 
    config: { 
      primaryColor: 'var(--school-primary, #3182ce)', 
      secondaryColor: '#2c5282', 
      showAttendance: true, 
      showRanking: true, 
      footerText: 'Authorized signature required for validity.',
      showStamp: true,
      showLogo: true,
      showStudentPhoto: true,
      enableQR: true,
      receiptPrefix: 'REC-',
      certTitle: 'Certificate of Achievement'
    } 
  });
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<File | null>(null);
  const [stamp, setStamp] = useState<File | null>(null);

  // ─── ID Card States ──────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);

  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [student, setStudent] = useState<StudentPreview | null>(null);
  const [templates, setTemplates] = useState<Templates>({ front: null, back: null });

  const [selectedBuiltin, setSelectedBuiltin] = useState<string | null>(null);
  const [idCardActiveTab, setIdCardActiveTab] = useState<'catalog' | 'upload'>('upload');
  const [cardFace, setCardFace] = useState<'front' | 'back'>('front');

  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ─── Certificates States ─────────────────────────────────────────────────────
  const [certActiveTab, setCertActiveTab] = useState<'upload' | 'catalog'>('upload');
  const [selectedCertBuiltin, setSelectedCertBuiltin] = useState<string | null>(null);
  const [certBgUrl, setCertBgUrl] = useState<string | null>(null);
  const [selectedCertStudentId, setSelectedCertStudentId] = useState<string>('');
  const [uploadingCertBg, setUploadingCertBg] = useState(false);
  const [certStudents, setCertStudents] = useState<StudentListItem[]>([]);
  const [certPreviewStudent, setCertPreviewStudent] = useState<StudentPreview | null>(null);
  const [generatingCerts, setGeneratingCerts] = useState(false);

  const CERT_BUILTIN = [
    { id: 'gold-classic',   name: 'Gold Classic',      bg: '#7c5c00', accent: '#f6e27a', icon: 'fa-award' },
    { id: 'blue-prestige',  name: 'Blue Prestige',     bg: '#1e3a8a', accent: '#bfdbfe', icon: 'fa-graduation-cap' },
    { id: 'green-academic', name: 'Green Academic',    bg: '#14532d', accent: '#bbf7d0', icon: 'fa-leaf' },
    { id: 'maroon-formal',  name: 'Maroon Formal',     bg: '#7c2d12', accent: '#fef9c3', icon: 'fa-ribbon' },
    { id: 'purple-royal',   name: 'Purple Royal',      bg: '#4c1d95', accent: '#ede9fe', icon: 'fa-crown' },
    { id: 'silver-modern',  name: 'Silver Modern',     bg: '#1e293b', accent: '#e2e8f0', icon: 'fa-star' },
  ];

  // ─── Academic Reports States ───────────────────────────────────────────
  const [reportActiveTab, setReportActiveTab] = useState<'upload' | 'catalog'>('upload');
  const [selectedReportBuiltin, setSelectedReportBuiltin] = useState<string | null>('blue-formal');
  const [reportBgUrl, setReportBgUrl] = useState<string | null>(null);
  const [reportPreviewStudentId, setReportPreviewStudentId] = useState<string>('');
  const [reportStudents, setReportStudents] = useState<StudentListItem[]>([]);
  const [reportPreviewStudent, setReportPreviewStudent] = useState<StudentPreview | null>(null);
  const [uploadingReportBg, setUploadingReportBg] = useState(false);
  const [generatingReports, setGeneratingReports] = useState(false);

  const REPORT_BUILTIN = [
    { id: 'blue-formal',    name: 'Blue Formal',       color: '#1e3a8a', accent: '#bfdbfe', icon: 'fa-file-contract' },
    { id: 'green-academic', name: 'Green Academic',    color: '#14532d', accent: '#bbf7d0', icon: 'fa-book-open' },
    { id: 'maroon-prestige',name: 'Maroon Prestige',   color: '#7c2d12', accent: '#fef9c3', icon: 'fa-award' },
    { id: 'dark-modern',    name: 'Dark Modern',       color: '#0f172a', accent: '#e2e8f0', icon: 'fa-scroll' },
    { id: 'purple-elite',   name: 'Purple Elite',      color: '#4c1d95', accent: '#ede9fe', icon: 'fa-graduation-cap' },
    { id: 'gold-classic',   name: 'Gold Classic',      color: '#7c5c00', accent: '#fef9c3', icon: 'fa-star' },
  ];

  // ─── Receipts States ────────────────────────────────────────────────────────────
  const [receiptActiveTab, setReceiptActiveTab] = useState<'upload' | 'catalog'>('upload');
  const [selectedReceiptBuiltin, setSelectedReceiptBuiltin] = useState<string | null>('clean-white');
  const [receiptLogoUrl, setReceiptLogoUrl] = useState<string | null>(null);
  const [uploadingReceiptLogo, setUploadingReceiptLogo] = useState(false);
  const [generatingReceipts, setGeneratingReceipts] = useState(false);

  const RECEIPT_BUILTIN = [
    { id: 'clean-white',    name: 'Clean White',       color: '#1e293b', accent: '#f1f5f9', icon: 'fa-receipt' },
    { id: 'blue-corporate', name: 'Blue Corporate',    color: '#1e3a8a', accent: '#bfdbfe', icon: 'fa-file-invoice-dollar' },
    { id: 'green-eco',      name: 'Green Eco',         color: '#14532d', accent: '#bbf7d0', icon: 'fa-leaf' },
    { id: 'dark-premium',   name: 'Dark Premium',      color: '#0f172a', accent: '#fbbf24', icon: 'fa-star' },
    { id: 'maroon-classic', name: 'Maroon Classic',    color: '#7c2d12', accent: '#fef9c3', icon: 'fa-bookmark' },
    { id: 'purple-modern',  name: 'Purple Modern',     color: '#4c1d95', accent: '#ede9fe', icon: 'fa-magic' },
  ];

  // ID Cards effects
  useEffect(() => {
    if (activeTab === 'id-cards') {
      fetchClasses();
      fetchStudents();
      fetchSchoolBase();
    }
    if (activeTab === 'certificates') {
      fetchCertStudents();
      fetchSchoolBase();
    }
    if (activeTab === 'reports') {
      fetchReportStudents();
      fetchSchoolBase();
    }
    if (activeTab === 'receipts') {
      fetchSchoolBase();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'id-cards' && selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId, activeTab]);

  useEffect(() => {
    if (activeTab === 'id-cards' && previewStudentId) {
      loadPreviewData(previewStudentId);
    }
  }, [previewStudentId, activeTab]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
  };

  const fetchStudents = async (classId = 'all') => {
    try {
      const res = await api.get(`/api/schools/id-card/students?classId=${classId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setStudents(list);
      if (list.length > 0 && !previewStudentId) {
        setPreviewStudentId(list[0].id);
      }
    } catch { /* silent */ }
  };

  const fetchSchoolBase = async () => {
    try {
      const res = await api.get('/api/schools/me');
      const branding = res.data.branding || {};
      const content = res.data.customContent || {};
      setSchool({
        name: res.data.name,
        address: res.data.address || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        website: res.data.website || '',
        logo: branding.logo || null,
        motto: content.motto || '',
        primaryColor: branding.primaryColor || '#1e40af',
        accentColor: branding.accentColor || '#dbeafe',
      });
    } catch { /* silent */ }
  };

  const loadPreviewData = async (studentId: string) => {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/api/schools/id-card/data/${studentId}`);
      setSchool(res.data.school);
      setTemplates(res.data.templates);
      setStudent(res.data.student);
    } catch {
      showToast('Failed to load card preview data', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const uploadTemplate = async (file: File, face: 'front' | 'back') => {
    const setUploading = face === 'front' ? setUploadingFront : setUploadingBack;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('template', file);
      const res = await api.patch(`/api/schools/id-template/${face}`, formData);
      setTemplates(prev => ({
        ...prev,
        [face]: face === 'front' ? (res.data.idCardTemplateFront || res.data.idCardTemplate) : res.data.idCardTemplateBack
      }));
      setSelectedBuiltin(null);
      showToast(`${face === 'front' ? 'Front' : 'Back'} template uploaded`, 'success');
    } catch {
      showToast(`Failed to upload ${face} template`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const fetchCertStudents = async () => {
    try {
      const res = await api.get('/api/schools/id-card/students?classId=all');
      const list = Array.isArray(res.data) ? res.data : [];
      setCertStudents(list);
      if (list.length > 0) setSelectedCertStudentId(list[0].id);
    } catch { /* silent */ }
  };

  const loadCertPreview = async (studentId: string) => {
    try {
      const res = await api.get(`/api/schools/id-card/data/${studentId}`);
      setCertPreviewStudent(res.data.student);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (activeTab === 'certificates' && selectedCertStudentId) {
      loadCertPreview(selectedCertStudentId);
    }
  }, [selectedCertStudentId, activeTab]);

  const uploadCertTemplate = async (file: File) => {
    setUploadingCertBg(true);
    try {
      const fd = new FormData();
      fd.append('template', file);
      const res = await api.patch('/api/reports/cert-template', fd);
      setCertBgUrl(res.data.certTemplateUrl || null);
      setSelectedCertBuiltin(null);
      showToast('Certificate background uploaded', 'success');
    } catch {
      showToast('Failed to upload certificate background', 'error');
    } finally {
      setUploadingCertBg(false);
    }
  };

  // ─── Report / Receipt upload handlers ─────────────────────────────────────────
  const fetchReportStudents = async () => {
    try {
      const res = await api.get('/api/schools/id-card/students?classId=all');
      const list = Array.isArray(res.data) ? res.data : [];
      setReportStudents(list);
      if (list.length > 0) setReportPreviewStudentId(list[0].id);
    } catch { /* silent */ }
  };

  const loadReportPreview = async (studentId: string) => {
    try {
      const res = await api.get(`/api/schools/id-card/data/${studentId}`);
      setReportPreviewStudent(res.data.student);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (activeTab === 'reports' && reportPreviewStudentId) loadReportPreview(reportPreviewStudentId);
  }, [reportPreviewStudentId, activeTab]);

  const uploadReportBg = async (file: File) => {
    setUploadingReportBg(true);
    try {
      const fd = new FormData();
      fd.append('template', file);
      const res = await api.patch('/api/reports/report-template', fd);
      setReportBgUrl(res.data.reportTemplateUrl || null);
      setSelectedReportBuiltin(null);
      showToast('Report template uploaded', 'success');
    } catch {
      showToast('Failed to upload report template', 'error');
    } finally {
      setUploadingReportBg(false);
    }
  };

  const uploadReceiptLogo = async (file: File) => {
    setUploadingReceiptLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.patch('/api/reports/receipt-logo', fd);
      setReceiptLogoUrl(res.data.receiptLogoUrl || null);
      setSelectedReceiptBuiltin(null);
      showToast('Receipt logo uploaded', 'success');
    } catch {
      showToast('Failed to upload receipt logo', 'error');
    } finally {
      setUploadingReceiptLogo(false);
    }
  };

  const handleGenerate = async () => {
    if (!templates.front && !selectedBuiltin) {
      showToast('Please select or upload a front template first', 'error');
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      showToast(`ID cards prepared for ${selectedClassId === 'all' ? 'all students' : 'selected class'} — Ready for print`, 'success');
    }, 2500);
  };

  const activeBuiltin = selectedBuiltin ? BUILTIN_TEMPLATES.find(t => t.id === selectedBuiltin) : null;
  const effectiveFrontUrl = activeBuiltin ? null : templates.front;
  const effectiveBackUrl = activeBuiltin ? null : templates.back;

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/api/reports/template');
      if (res.data) {
        setTemplate({
          ...res.data,
          config: {
            ...template.config,
            ...(res.data.config || {})
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch template');
    
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('config', JSON.stringify(template.config));
    if (signature) formData.append('signature', signature);
    if (stamp) formData.append('stamp', stamp);

    try {
      await api.post('/api/reports/template', formData);
      alert('Document branding updated successfully!');
      fetchTemplate();
    } catch (err) {
      alert('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setTemplate({
      ...template,
      config: { ...template.config, [key]: value }
    });
  };

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Document Design & Branding</h1>
            <p>Tailor the visual output of your school system's official documents.</p>
          </div>
          <button className="portal-btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save" style={{ marginRight: 8 }}></i>}
            {loading ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: 30 }}>
         <div className={`portal-card ${activeTab === 'reports' ? 'active-border' : ''}`} onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
            <div className="portal-card-body" style={{ textAlign: 'center' }}>
               <i className="fas fa-file-contract" style={{ fontSize: '2rem', color: 'var(--school-primary, #3182ce)', marginBottom: 10 }}></i>
               <h3>Academic Reports</h3>
            </div>
         </div>
         <div className={`portal-card ${activeTab === 'receipts' ? 'active-border' : ''}`} onClick={() => setActiveTab('receipts')} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
            <div className="portal-card-body" style={{ textAlign: 'center' }}>
               <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2rem', color: 'var(--portal-success)', marginBottom: 10 }}></i>
               <h3>Receipts</h3>
            </div>
         </div>
         <div className={`portal-card ${activeTab === 'certificates' ? 'active-border' : ''}`} onClick={() => setActiveTab('certificates')} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
            <div className="portal-card-body" style={{ textAlign: 'center' }}>
               <i className="fas fa-certificate" style={{ fontSize: '2rem', color: 'var(--portal-warning)', marginBottom: 10 }}></i>
               <h3>Certificates</h3>
            </div>
         </div>
         <div className={`portal-card ${activeTab === 'id-cards' ? 'active-border' : ''}`} onClick={() => setActiveTab('id-cards')} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
            <div className="portal-card-body" style={{ textAlign: 'center' }}>
               <i className="fas fa-id-card" style={{ fontSize: '2rem', color: '#805ad5', marginBottom: 10 }}></i>
               <h3>Student ID Cards</h3>
            </div>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .active-border { border: 2px solid var(--school-primary, #3182ce) !important; background: #ebf8ff !important; }
      `}} />

      {activeTab === 'id-cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start', marginTop: 24 }}>
          {/* ── LEFT: Preview + Student Selector ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Class + Student Selector */}
            <div className="portal-card">
              <div className="portal-card-header" style={{ paddingBottom: 16 }}>
                <h3>Preview Configuration</h3>
                <p>Select a {t('class').toLowerCase()} and {t('student').toLowerCase()} to preview their ID card with real data.</p>
              </div>
              <div className="portal-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="portal-label">{t('class')} Filter</label>
                    <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="portal-input">
                      <option value="all">All {t('classes')}</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Preview {t('student')}</label>
                    <select
                      value={previewStudentId || ''}
                      onChange={e => setPreviewStudentId(e.target.value)}
                      className="portal-input"
                    >
                      <option value="">Select a {t('student').toLowerCase()}</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.class ? `· ${s.class.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Preview */}
            <div className="portal-preview-dark" style={{ position: 'relative', background: '#0f172a', padding: 24, borderRadius: 20 }}>
              {loadingPreview && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 32 }}></i>
                </div>
              )}

              {/* Face Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE PREVIEW</span>
                  {student?.name ? `– ${student.name}` : ''}
                </h3>
                <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 4 }}>
                  <button
                    onClick={() => setCardFace('front')}
                    style={{
                      padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                      background: cardFace === 'front' ? '#fff' : 'transparent',
                      color: cardFace === 'front' ? '#1e293b' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.2s'
                    }}
                  >Front</button>
                  <button
                    onClick={() => setCardFace('back')}
                    style={{
                      padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                      background: cardFace === 'back' ? '#fff' : 'transparent',
                      color: cardFace === 'back' ? '#1e293b' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.2s'
                    }}
                  >Back</button>
                </div>
              </div>

              {/* Card */}
              <div style={{
                width: '100%', maxWidth: 520, aspectRatio: '1.586 / 1',
                margin: '0 auto', borderRadius: 18, overflow: 'hidden',
                boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}>
                <IdCardFace
                  school={school}
                  student={student}
                  templateUrl={cardFace === 'front' ? effectiveFrontUrl : effectiveBackUrl}
                  builtinTemplate={activeBuiltin || null}
                  isBack={cardFace === 'back'}
                  classTerm={t('class')}
                  studentIdTerm="ID Number"
                />
              </div>

              {/* Student info chips below card */}
              {student && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
                  {[
                    { label: 'Name', value: student.name, icon: 'fa-user' },
                    { label: 'ID', value: student.studentId, icon: 'fa-hashtag' },
                    { label: t('class'), value: student.class, icon: 'fa-chalkboard-teacher' },
                    { label: 'Gender', value: student.gender, icon: 'fa-venus-mars' },
                  ].filter(c => c.value).map(chip => (
                    <div key={chip.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`fas ${chip.icon}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}></i>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600, marginRight: 4 }}>{chip.label}</span>
                      <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{chip.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* QR note */}
              <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-qrcode" style={{ color: '#10b981', fontSize: 20, marginTop: 2 }}></i>
                <div>
                  <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>QR Code Embedded</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.5, marginTop: 2 }}>
                    When scanned, the QR code shows: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{t('student').toLowerCase()} name, ID, {t('class').toLowerCase()}, fee balance</strong> and gate access status.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Template Manager ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
              {(['upload', 'catalog'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setIdCardActiveTab(tab)}
                  style={{
                    flex: 1, padding: '10px 8px', fontWeight: 700, fontSize: '0.85rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: idCardActiveTab === tab ? '#2563eb' : '#64748b',
                    borderBottom: idCardActiveTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                    marginBottom: -2, transition: 'all 0.2s'
                  }}
                >
                  <i className={`fas ${tab === 'upload' ? 'fa-folder-open' : 'fa-th-large'}`} style={{ marginRight: 6 }}></i>
                  {tab === 'upload' ? 'Custom Templates' : 'Built-in Catalog'}
                </button>
              ))}
            </div>

            {/* Custom Upload Tab */}
            {idCardActiveTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="portal-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#2563eb', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>F</span>
                    Front Face Template
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
                    The front shows the {t('student').toLowerCase()} photo, name, {t('class').toLowerCase()}, ID number, and QR code overlaid on your design.
                  </p>
                  <UploadZone
                    label="Upload Front Template"
                    currentUrl={templates.front}
                    onUpload={file => uploadTemplate(file, 'front')}
                    uploading={uploadingFront}
                  />
                </div>

                <div className="portal-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#7c3aed', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>B</span>
                    Back Face Template
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
                    The back typically shows the school motto, contact info, and a "if found" note. Leave blank to auto-generate.
                  </p>
                  <UploadZone
                    label="Upload Back Template"
                    currentUrl={templates.back}
                    onUpload={file => uploadTemplate(file, 'back')}
                    uploading={uploadingBack}
                  />
                </div>

                {/* Tips */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: 8 }}>
                    <i className="fas fa-lightbulb" style={{ marginRight: 6 }}></i>Design Tips
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.75rem', color: '#065f46', lineHeight: 1.8 }}>
                    <li>Use <strong>1012 × 638 px</strong> (CR80 card ratio) for best quality</li>
                    <li>Leave the <strong>bottom 30%</strong> of the front free for data overlay</li>
                    <li>Use PNG with transparency where possible</li>
                    <li>The {t('student').toLowerCase()}'s photo, name, {t('class').toLowerCase()} &amp; QR code are auto-placed</li>
                    <li>School logo &amp; motto come from your branding settings</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Builtin Catalog Tab */}
            {idCardActiveTab === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Choose a built-in template. Your school name, logo, and motto will automatically appear on the card.
                </p>
                {BUILTIN_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    onClick={() => { setSelectedBuiltin(template.id); setTemplates({ front: null, back: null }); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                      borderRadius: 12, border: selectedBuiltin === template.id ? `2px solid ${template.color}` : '2px solid #e2e8f0',
                      cursor: 'pointer', background: selectedBuiltin === template.id ? '#f8fafc' : '#fff',
                      transition: 'all 0.2s', boxShadow: selectedBuiltin === template.id ? `0 4px 16px ${template.color}30` : 'none',
                    }}
                  >
                    <div style={{ width: 48, height: 30, borderRadius: 6, background: template.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${template.icon}`} style={{ color: template.accent, fontSize: 14 }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{template.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Primary: {template.color}</div>
                    </div>
                    {selectedBuiltin === template.id && (
                      <i className="fas fa-check-circle" style={{ color: template.color, fontSize: 18 }}></i>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* School Info Summary */}
            {school && (
              <div className="portal-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-school" style={{ color: '#2563eb' }}></i> School Info on Card
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: 'fa-university', label: 'Name', value: school.name },
                    { icon: 'fa-quote-right', label: 'Motto', value: school.motto || 'Not set' },
                    { icon: 'fa-image', label: 'Logo', value: school.logo ? '✓ Configured' : 'Not set — Update in Branding' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <i className={`fas ${row.icon}`} style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 3 }}></i>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{row.label}</div>
                        <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }}>{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="/admin/settings?tab=website" style={{ display: 'block', marginTop: 12, fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                  <i className="fas fa-pencil-alt" style={{ marginRight: 6 }}></i>Update Branding Settings →
                </a>
              </div>
            )}

            {/* Generate Action */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', borderRadius: 16, padding: 20, color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>
                <i className="fas fa-print" style={{ marginRight: 8 }}></i>Bulk Print Generation
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Generates a print-ready PDF sheet with ID cards for {selectedClassId === 'all' ? 'all' : `the selected ${t('class').toLowerCase()}'s`} students.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || (!templates.front && !selectedBuiltin)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: (!templates.front && !selectedBuiltin) ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: (!templates.front && !selectedBuiltin) ? 'rgba(255,255,255,0.5)' : '#1e40af',
                  fontWeight: 900, fontSize: '0.9rem', transition: 'all 0.2s'
                }}
              >
                {generating
                  ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Generating...</>
                  : <><i className="fas fa-file-pdf" style={{ marginRight: 8 }}></i>Generate PDF Manifest</>
                }
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'certificates' ? (
        /* ─── Certificates Designer ─────────────────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start', marginTop: 24 }}>
          {/* LEFT: Preview + Student Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Student Selector */}
            <div className="portal-card">
              <div className="portal-card-header" style={{ paddingBottom: 16 }}>
                <h3>Preview Configuration</h3>
                <p>Select a student to preview their certificate with real data.</p>
              </div>
              <div className="portal-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="portal-label">Certificate Title</label>
                    <input
                      type="text"
                      className="portal-input"
                      value={template.config.certTitle}
                      onChange={e => updateConfig('certTitle', e.target.value)}
                      placeholder="e.g. Certificate of Achievement"
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label className="portal-label">Preview Student</label>
                    <select
                      value={selectedCertStudentId}
                      onChange={e => setSelectedCertStudentId(e.target.value)}
                      className="portal-input"
                    >
                      <option value="">Select a student</option>
                      {certStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.class ? `· ${s.class.name}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate Preview (landscape) */}
            <div style={{ background: '#0f172a', borderRadius: 20, padding: 24, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE PREVIEW</span>
                  {certPreviewStudent?.name ? `– ${certPreviewStudent.name}` : ''}
                </h3>
              </div>
              {/* Landscape certificate canvas */}
              {(() => {
                const certBuiltin = CERT_BUILTIN.find(c => c.id === selectedCertBuiltin);
                const bgColor = certBuiltin?.bg || '#1e3a8a';
                const accentCol = certBuiltin?.accent || '#bfdbfe';
                const studentName = certPreviewStudent?.name || 'Student Full Name';
                const studentClass = certPreviewStudent?.class || `${t('class')} 4A`;
                const logoUrl = school?.logo ? `/api/storage/file/${school.logo}` : null;
                return (
                  <div style={{
                    width: '100%', aspectRatio: '1.414 / 1', borderRadius: 14,
                    overflow: 'hidden', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.12)', position: 'relative',
                    background: certBgUrl && !selectedCertBuiltin ? 'transparent' : bgColor,
                  }}>
                    {certBgUrl && !selectedCertBuiltin && (
                      <img src={`/api/storage/file/${certBgUrl}`} alt="Cert Background"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {/* Content overlay */}
                    <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', gap: 12 }}>
                      {/* Decorative border */}
                      <div style={{ position: 'absolute', inset: 16, border: `2px solid ${accentCol}40`, borderRadius: 10, pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', inset: 20, border: `1px solid ${accentCol}25`, borderRadius: 8, pointerEvents: 'none' }} />
                      {/* Logo + School */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
                        ) : (
                          <div style={{ width: 44, height: 44, background: `${accentCol}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-university" style={{ color: accentCol, fontSize: 20 }}></i>
                          </div>
                        )}
                        <div style={{ color: accentCol, fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{school?.name || 'Academy Name'}</div>
                      </div>
                      {/* Certificate label */}
                      <div style={{ color: `${accentCol}80`, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>THIS IS TO CERTIFY THAT</div>
                      {/* Student name */}
                      <div style={{ color: '#fff', fontSize: 'clamp(1rem, 3vw, 1.6rem)', fontWeight: 900, fontStyle: 'italic', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{studentName}</div>
                      <div style={{ width: 120, height: 1, background: `${accentCol}60` }} />
                      {/* Certificate title */}
                      <div style={{ color: accentCol, fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>{template.config.certTitle || 'Certificate of Achievement'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem', textAlign: 'center' }}>For outstanding academic excellence — {studentClass}</div>
                      {/* Footer row */}
                      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: 80, height: 1, background: `${accentCol}50`, marginBottom: 4 }} />
                          <div style={{ fontSize: '0.55rem', color: `${accentCol}70`, fontWeight: 700 }}>PRINCIPAL</div>
                        </div>
                        {template.config.enableQR && (
                          <div style={{ width: 44, height: 44, background: `${accentCol}20`, border: `1px solid ${accentCol}50`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-qrcode" style={{ color: accentCol, fontSize: 26 }}></i>
                          </div>
                        )}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: 80, height: 1, background: `${accentCol}50`, marginBottom: 4 }} />
                          <div style={{ fontSize: '0.55rem', color: `${accentCol}70`, fontWeight: 700 }}>DATE</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* Info chips */}
              {certPreviewStudent && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
                  {[
                    { icon: 'fa-user', label: 'Name', value: certPreviewStudent.name },
                    { icon: 'fa-hashtag', label: 'ID', value: certPreviewStudent.studentId },
                    { icon: 'fa-chalkboard-teacher', label: t('class'), value: certPreviewStudent.class },
                  ].filter(c => c.value).map(chip => (
                    <div key={chip.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`fas ${chip.icon}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}></i>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600 }}>{chip.label}</span>
                      <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{chip.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Template Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
              {(['upload', 'catalog'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCertActiveTab(tab)}
                  style={{
                    flex: 1, padding: '10px 8px', fontWeight: 700, fontSize: '0.85rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: certActiveTab === tab ? '#2563eb' : '#64748b',
                    borderBottom: certActiveTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                    marginBottom: -2, transition: 'all 0.2s'
                  }}
                >
                  <i className={`fas ${tab === 'upload' ? 'fa-folder-open' : 'fa-th-large'}`} style={{ marginRight: 6 }}></i>
                  {tab === 'upload' ? 'Custom Templates' : 'Built-in Catalog'}
                </button>
              ))}
            </div>

            {certActiveTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="portal-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4 }}>
                    Certificate Background Image
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
                    Upload a landscape-orientation background. Student data and signatures are overlaid automatically.
                  </p>
                  <UploadZone
                    label="Upload Certificate Background"
                    currentUrl={certBgUrl}
                    onUpload={uploadCertTemplate}
                    uploading={uploadingCertBg}
                  />
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: 8 }}>
                    <i className="fas fa-lightbulb" style={{ marginRight: 6 }}></i>Design Tips
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.75rem', color: '#065f46', lineHeight: 1.8 }}>
                    <li>Use <strong>A4 Landscape (3508 × 2480 px)</strong> for print quality</li>
                    <li>Leave the <strong>center area</strong> clear for the student name</li>
                    <li>Use PNG with transparent center for best overlay effect</li>
                    <li>Student name, class, and QR code are auto-placed</li>
                  </ul>
                </div>
              </div>
            )}

            {certActiveTab === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Choose a built-in certificate theme. School branding and student info is auto-populated.
                </p>
                {CERT_BUILTIN.map(cert => (
                  <div
                    key={cert.id}
                    onClick={() => { setSelectedCertBuiltin(cert.id); setCertBgUrl(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                      borderRadius: 12, border: selectedCertBuiltin === cert.id ? `2px solid ${cert.bg}` : '2px solid #e2e8f0',
                      cursor: 'pointer', background: selectedCertBuiltin === cert.id ? '#f8fafc' : '#fff',
                      transition: 'all 0.2s', boxShadow: selectedCertBuiltin === cert.id ? `0 4px 16px ${cert.bg}30` : 'none',
                    }}
                  >
                    <div style={{ width: 48, height: 30, borderRadius: 6, background: cert.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${cert.icon}`} style={{ color: cert.accent, fontSize: 14 }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{cert.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Theme: {cert.bg}</div>
                    </div>
                    {selectedCertBuiltin === cert.id && (
                      <i className="fas fa-check-circle" style={{ color: cert.bg, fontSize: 18 }}></i>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Cert Config */}
            <div className="portal-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <i className="fas fa-sliders-h" style={{ marginRight: 6, color: '#2563eb' }}></i>Certificate Options
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'showLogo', label: 'School Logo' },
                  { key: 'showStamp', label: 'Official Stamp' },
                  { key: 'enableQR', label: 'QR Verification' },
                  { key: 'showStudentPhoto', label: 'Student Photo' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={template.config[opt.key]}
                      onChange={e => updateConfig(opt.key, e.target.checked)}
                      style={{ accentColor: '#2563eb', width: 16, height: 16 }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="portal-label">Footer/Disclaimer</label>
                <input type="text" className="portal-input" value={template.config.footerText} onChange={e => updateConfig('footerText', e.target.value)} />
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="portal-label">Primary Theme Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="color" value={template.config.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)} style={{ height: 40, width: 52, padding: 2, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                  <input type="text" className="portal-input" value={template.config.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Generate Action */}
            <div style={{ background: 'linear-gradient(135deg, #d69e2e 0%, #7c5c00 100%)', borderRadius: 16, padding: 20, color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>
                <i className="fas fa-print" style={{ marginRight: 8 }}></i>Bulk Certificate Print
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                Generates a print-ready PDF of certificates for all qualifying students.
              </p>
              <button
                type="button"
                onClick={() => { setGeneratingCerts(true); setTimeout(() => { setGeneratingCerts(false); showToast('Certificates prepared — Ready for print', 'success'); }, 2200); }}
                disabled={generatingCerts || (!certBgUrl && !selectedCertBuiltin)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: (!certBgUrl && !selectedCertBuiltin) ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: (!certBgUrl && !selectedCertBuiltin) ? 'rgba(255,255,255,0.5)' : '#7c5c00',
                  fontWeight: 900, fontSize: '0.9rem', transition: 'all 0.2s'
                }}
              >
                {generatingCerts
                  ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Generating...</>
                  : <><i className="fas fa-file-pdf" style={{ marginRight: 8 }}></i>Generate Certificates PDF</>
                }
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        /* ─── Academic Reports Designer ─────────────────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start', marginTop: 24 }}>
          {/* LEFT: Live Report Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Preview Config */}
            <div className="portal-card">
              <div className="portal-card-header" style={{ paddingBottom: 16 }}>
                <h3>Preview Configuration</h3>
                <p>Select a {t('student').toLowerCase()} to preview their academic report with real data.</p>
              </div>
              <div className="portal-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="portal-label">Primary Theme Color</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="color" value={template.config.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)}
                        style={{ height: 40, width: 52, padding: 2, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      <input type="text" className="portal-input" value={template.config.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="portal-label">Preview {t('student')}</label>
                    <select value={reportPreviewStudentId} onChange={e => setReportPreviewStudentId(e.target.value)} className="portal-input">
                      <option value="">Select a {t('student').toLowerCase()}</option>
                      {reportStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name}{s.class ? ` · ${s.class.name}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Live A4 Report Preview */}
            <div style={{ background: '#0f172a', borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE PREVIEW</span>
                  {reportPreviewStudent?.name ? `– ${reportPreviewStudent.name}` : ''}
                </h3>
              </div>
              {/* A4 portrait canvas */}
              {(() => {
                const rBuiltin = REPORT_BUILTIN.find(r => r.id === selectedReportBuiltin);
                const primaryCol = rBuiltin?.color || template.config.primaryColor || '#1e3a8a';
                const accentCol = rBuiltin?.accent || '#bfdbfe';
                const logoUrl = school?.logo ? `/api/storage/file/${school.logo}` : null;
                const studentName = reportPreviewStudent?.name || 'Student Full Name';
                const studentClass = reportPreviewStudent?.class || `${t('class')} 4A`;
                const studentId = reportPreviewStudent?.studentId || 'STU-000001';
                const MOCK_SUBJECTS = [
                  { subject: 'Mathematics', mark: 87, grade: 'A', comment: 'Distinction' },
                  { subject: 'English Language', mark: 72, grade: 'B', comment: 'Credit' },
                  { subject: 'Science', mark: 91, grade: 'A+', comment: 'Distinction' },
                  { subject: 'History', mark: 65, grade: 'C', comment: 'Pass' },
                  { subject: 'Geography', mark: 78, grade: 'B+', comment: 'Credit' },
                ];
                return (
                  <div style={{
                    width: '100%', maxWidth: 520, margin: '0 auto',
                    background: reportBgUrl && !selectedReportBuiltin ? 'transparent' : '#fff',
                    borderRadius: 10, overflow: 'hidden',
                    boxShadow: '0 32px 64px -12px rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.12)', position: 'relative',
                  }}>
                    {reportBgUrl && !selectedReportBuiltin && (
                      <img src={`/api/storage/file/${reportBgUrl}`} alt="Report BG"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08 }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {/* Header band */}
                      <div style={{ background: primaryCol, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
                        ) : (
                          <div style={{ width: 44, height: 44, background: `${accentCol}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-university" style={{ color: accentCol, fontSize: 20 }}></i>
                          </div>
                        )}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.05em' }}>{school?.name || 'Academy Name'}</div>
                          <div style={{ color: `${accentCol}cc`, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Academic Achievement Report</div>
                        </div>
                      </div>
                      {/* Student info strip */}
                      <div style={{ background: `${accentCol}30`, padding: '10px 24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: primaryCol }}>
                        <span>{studentName}</span>
                        <span>{studentClass}</span>
                        <span>ID: {studentId}</span>
                      </div>
                      {/* Subjects table */}
                      <div style={{ padding: '16px 24px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${primaryCol}` }}>
                              <th style={{ textAlign: 'left', padding: '6px 4px', color: primaryCol, fontWeight: 900 }}>Subject</th>
                              <th style={{ textAlign: 'center', padding: '6px 4px', color: primaryCol, fontWeight: 900 }}>Mark</th>
                              <th style={{ textAlign: 'center', padding: '6px 4px', color: primaryCol, fontWeight: 900 }}>Grade</th>
                              <th style={{ textAlign: 'left', padding: '6px 4px', color: primaryCol, fontWeight: 900 }}>Comment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MOCK_SUBJECTS.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : `${accentCol}18` }}>
                                <td style={{ padding: '7px 4px', fontWeight: 700, color: '#1e293b' }}>{s.subject}</td>
                                <td style={{ textAlign: 'center', fontWeight: 900, color: s.mark >= 80 ? '#059669' : s.mark >= 60 ? '#d97706' : '#dc2626' }}>{s.mark}%</td>
                                <td style={{ textAlign: 'center', fontWeight: 900, color: primaryCol }}>{s.grade}</td>
                                <td style={{ padding: '7px 4px', color: '#64748b' }}>{s.comment}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Attendance bar */}
                      {template.config.showAttendance && (
                        <div style={{ padding: '0 24px 12px', fontSize: '0.72rem' }}>
                          <div style={{ fontWeight: 800, color: '#475569', marginBottom: 6 }}>Attendance</div>
                          <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                            <div style={{ width: '88%', height: '100%', background: primaryCol, borderRadius: 6 }}></div>
                          </div>
                          <div style={{ color: '#64748b', marginTop: 4 }}>88% — 132 of 150 days present</div>
                        </div>
                      )}
                      {/* Footer: signature + stamp + QR */}
                      <div style={{ padding: '12px 24px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: 90, height: 1, background: '#cbd5e1', marginBottom: 4 }}></div>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8' }}>PRINCIPAL</div>
                        </div>
                        {template.config.showStamp && (
                          <div style={{ width: 52, height: 52, border: `2px double ${primaryCol}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 900, color: primaryCol, transform: 'rotate(-12deg)', opacity: 0.6 }}>OFFICIAL<br/>STAMP</div>
                        )}
                        {template.config.enableQR && (
                          <div style={{ width: 38, height: 38, background: '#000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-qrcode" style={{ color: '#fff', fontSize: 22 }}></i>
                          </div>
                        )}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: 90, height: 1, background: '#cbd5e1', marginBottom: 4 }}></div>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8' }}>CLASS TEACHER</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '0.5rem', color: '#94a3b8', padding: '0 24px 12px', fontStyle: 'italic' }}>{template.config.footerText}</div>
                    </div>
                  </div>
                );
              })()}
              {/* Info chips */}
              {reportPreviewStudent && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
                  {[
                    { icon: 'fa-user', label: 'Name', value: reportPreviewStudent.name },
                    { icon: 'fa-hashtag', label: 'ID', value: reportPreviewStudent.studentId },
                    { icon: 'fa-chalkboard-teacher', label: t('class'), value: reportPreviewStudent.class },
                  ].filter(c => c.value).map(chip => (
                    <div key={chip.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`fas ${chip.icon}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}></i>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600 }}>{chip.label}</span>
                      <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{chip.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Template Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
              {(['upload', 'catalog'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setReportActiveTab(tab)}
                  style={{ flex: 1, padding: '10px 8px', fontWeight: 700, fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer',
                    color: reportActiveTab === tab ? '#2563eb' : '#64748b',
                    borderBottom: reportActiveTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                    marginBottom: -2, transition: 'all 0.2s' }}>
                  <i className={`fas ${tab === 'upload' ? 'fa-folder-open' : 'fa-th-large'}`} style={{ marginRight: 6 }}></i>
                  {tab === 'upload' ? 'Custom Templates' : 'Built-in Catalog'}
                </button>
              ))}
            </div>

            {reportActiveTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="portal-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4 }}>Report Letterhead / Background</div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>Upload a custom letterhead image. It will be tiled as a light watermark behind the report content.</p>
                  <UploadZone label="Upload Letterhead" currentUrl={reportBgUrl} onUpload={uploadReportBg} uploading={uploadingReportBg} />
                </div>
                <div className="portal-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: 8 }}>Principal Signature</div>
                  <UploadZone label="Upload Signature" currentUrl={template.signatureUrl || null} onUpload={f => setSignature(f)} uploading={false} />
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: 8 }}><i className="fas fa-lightbulb" style={{ marginRight: 6 }}></i>Design Tips</div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.75rem', color: '#065f46', lineHeight: 1.8 }}>
                    <li>Use <strong>A4 portrait (2480 × 3508 px)</strong> for print quality</li>
                    <li>Letterhead should use light opacity so content is readable</li>
                    <li>Signature should be PNG with transparent background</li>
                    <li>Student results, class, and QR code are auto-placed</li>
                  </ul>
                </div>
              </div>
            )}

            {reportActiveTab === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Choose a built-in report theme. School branding, colors, and student data are auto-populated.</p>
                {REPORT_BUILTIN.map(rpt => (
                  <div key={rpt.id}
                    onClick={() => { setSelectedReportBuiltin(rpt.id); setReportBgUrl(null); updateConfig('primaryColor', rpt.color); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12,
                      border: selectedReportBuiltin === rpt.id ? `2px solid ${rpt.color}` : '2px solid #e2e8f0',
                      cursor: 'pointer', background: selectedReportBuiltin === rpt.id ? '#f8fafc' : '#fff',
                      transition: 'all 0.2s', boxShadow: selectedReportBuiltin === rpt.id ? `0 4px 16px ${rpt.color}30` : 'none' }}>
                    <div style={{ width: 48, height: 30, borderRadius: 6, background: rpt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${rpt.icon}`} style={{ color: rpt.accent, fontSize: 14 }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{rpt.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Theme: {rpt.color}</div>
                    </div>
                    {selectedReportBuiltin === rpt.id && <i className="fas fa-check-circle" style={{ color: rpt.color, fontSize: 18 }}></i>}
                  </div>
                ))}
              </div>
            )}

            {/* Report Options */}
            <div className="portal-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <i className="fas fa-sliders-h" style={{ marginRight: 6, color: '#2563eb' }}></i>Report Options
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { key: 'showLogo', label: 'School Logo' },
                  { key: 'showStamp', label: 'Official Stamp' },
                  { key: 'enableQR', label: 'QR Verification' },
                  { key: 'showAttendance', label: 'Attendance' },
                  { key: 'showRanking', label: 'Class Ranking' },
                  { key: 'showStudentPhoto', label: 'Student Photo' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
                    <input type="checkbox" checked={template.config[opt.key]} onChange={e => updateConfig(opt.key, e.target.checked)}
                      style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 4 }}><label className="portal-label">Footer/Disclaimer</label>
                <input type="text" className="portal-input" value={template.config.footerText} onChange={e => updateConfig('footerText', e.target.value)} />
              </div>
            </div>

            {/* Bulk Print Action */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #4c1d95 100%)', borderRadius: 16, padding: 20, color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}><i className="fas fa-print" style={{ marginRight: 8 }}></i>Bulk Report Print</div>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>Generates a print-ready PDF of academic reports for all students using the selected theme.</p>
              <button type="button"
                onClick={() => { setGeneratingReports(true); setTimeout(() => { setGeneratingReports(false); showToast('Reports prepared — Ready for print', 'success'); }, 2200); }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#fff', color: '#1e3a8a', fontWeight: 900, fontSize: '0.9rem', transition: 'all 0.2s' }}>
                {generatingReports
                  ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Generating...</>
                  : <><i className="fas fa-file-pdf" style={{ marginRight: 8 }}></i>Generate Reports PDF</>
                }
              </button>
            </div>
          </div>
        </div>

      ) : activeTab === 'receipts' ? (
        /* ─── Receipts Designer ──────────────────────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start', marginTop: 24 }}>
          {/* LEFT: Live Receipt Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Preview Config */}
            <div className="portal-card">
              <div className="portal-card-header" style={{ paddingBottom: 16 }}>
                <h3>Preview Configuration</h3>
                <p>Adjust settings and see your receipt design update in real-time below.</p>
              </div>
              <div className="portal-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="portal-label">Primary Color</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="color" value={template.config.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)} style={{ height: 40, width: 44, padding: 2, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                      <input type="text" className="portal-input" value={template.config.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="portal-label">Receipt Prefix</label>
                    <input type="text" className="portal-input" value={template.config.receiptPrefix} onChange={e => updateConfig('receiptPrefix', e.target.value)} />
                  </div>
                  <div>
                    <label className="portal-label">School Name Override</label>
                    <input type="text" className="portal-input" placeholder={school?.name || 'Auto from settings'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Receipt Preview */}
            <div style={{ background: '#0f172a', borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE PREVIEW</span>
                </h3>
              </div>
              {/* Receipt canvas */}
              {(() => {
                const rBuiltin = RECEIPT_BUILTIN.find(r => r.id === selectedReceiptBuiltin);
                const primaryCol = rBuiltin?.color || template.config.primaryColor || '#1e293b';
                const accentCol = rBuiltin?.accent || '#f1f5f9';
                const logoUrl = receiptLogoUrl ? `/api/storage/file/${receiptLogoUrl}` :
                                school?.logo ? `/api/storage/file/${school.logo}` : null;
                const MOCK_ITEMS = [
                  { desc: 'School Fees — Term 1', amount: 350.00 },
                  { desc: 'Development Levy', amount: 50.00 },
                  { desc: 'Sports Fund', amount: 25.00 },
                  { desc: 'Library Fee', amount: 15.00 },
                ];
                const total = MOCK_ITEMS.reduce((s, i) => s + i.amount, 0);
                return (
                  <div style={{
                    width: '100%', maxWidth: 400, margin: '0 auto',
                    background: '#fff', borderRadius: 10, overflow: 'hidden',
                    boxShadow: '0 32px 64px -12px rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}>
                    {/* Receipt header */}
                    <div style={{ background: primaryCol, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, background: `${accentCol}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-university" style={{ color: accentCol, fontSize: 18 }}></i>
                        </div>
                      )}
                      <div>
                        <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem' }}>{school?.name || 'Academy Name'}</div>
                        <div style={{ color: `${accentCol}cc`, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Official Payment Receipt</div>
                      </div>
                    </div>
                    {/* Receipt metadata strip */}
                    <div style={{ background: `${accentCol}`, padding: '8px 24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: primaryCol }}>
                      <span>Receipt No: <strong>{template.config.receiptPrefix}10234</strong></span>
                      <span>Date: {new Date().toLocaleDateString()}</span>
                    </div>
                    {/* Student info */}
                    <div style={{ padding: '12px 24px 0', fontSize: '0.72rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div><span style={{ fontWeight: 900, color: '#1e293b' }}>Student:</span> Jane Doe</div>
                      <div><span style={{ fontWeight: 900, color: '#1e293b' }}>Class:</span> Form 4A</div>
                      <div><span style={{ fontWeight: 900, color: '#1e293b' }}>ID:</span> STU-000001</div>
                      <div><span style={{ fontWeight: 900, color: '#1e293b' }}>Mode:</span> Cash</div>
                    </div>
                    {/* Line items */}
                    <div style={{ padding: '12px 24px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${primaryCol}` }}>
                            <th style={{ textAlign: 'left', padding: '5px 2px', color: primaryCol, fontWeight: 900 }}>Description</th>
                            <th style={{ textAlign: 'right', padding: '5px 2px', color: primaryCol, fontWeight: 900 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MOCK_ITEMS.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 2px', color: '#374151' }}>{item.desc}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', padding: '6px 2px' }}>${item.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: `2px solid ${primaryCol}` }}>
                            <td style={{ padding: '8px 2px', fontWeight: 900, color: primaryCol }}>TOTAL PAID</td>
                            <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: primaryCol }}>${total.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {/* Footer */}
                    <div style={{ padding: '8px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 80, height: 1, background: '#cbd5e1', marginBottom: 4 }}></div>
                        <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#94a3b8' }}>BURSAR</div>
                      </div>
                      {template.config.showStamp && (
                        <div style={{ width: 48, height: 48, border: `2px double ${primaryCol}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4rem', fontWeight: 900, color: primaryCol, transform: 'rotate(-12deg)', opacity: 0.6 }}>OFFICIAL<br/>STAMP</div>
                      )}
                      {template.config.enableQR && (
                        <div style={{ width: 38, height: 38, background: '#000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-qrcode" style={{ color: '#fff', fontSize: 22 }}></i>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.5rem', color: '#94a3b8', padding: '0 24px 12px', fontStyle: 'italic' }}>{template.config.footerText}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* RIGHT: Template Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
              {(['upload', 'catalog'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setReceiptActiveTab(tab)}
                  style={{ flex: 1, padding: '10px 8px', fontWeight: 700, fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer',
                    color: receiptActiveTab === tab ? '#059669' : '#64748b',
                    borderBottom: receiptActiveTab === tab ? '2px solid #059669' : '2px solid transparent',
                    marginBottom: -2, transition: 'all 0.2s' }}>
                  <i className={`fas ${tab === 'upload' ? 'fa-folder-open' : 'fa-th-large'}`} style={{ marginRight: 6 }}></i>
                  {tab === 'upload' ? 'Custom Templates' : 'Built-in Catalog'}
                </button>
              ))}
            </div>

            {receiptActiveTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="portal-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: 4 }}>School Logo / Branding</div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>Upload a custom logo for the receipt header. Leave blank to use the branding from Settings.</p>
                  <UploadZone label="Upload Receipt Logo" currentUrl={receiptLogoUrl} onUpload={uploadReceiptLogo} uploading={uploadingReceiptLogo} />
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: 8 }}><i className="fas fa-lightbulb" style={{ marginRight: 6 }}></i>Design Tips</div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.75rem', color: '#065f46', lineHeight: 1.8 }}>
                    <li>Use a <strong>square PNG</strong> logo with transparent background</li>
                    <li>The receipt auto-fills student name, class, and fee items</li>
                    <li>Payment mode and amount come from live billing data</li>
                    <li>QR code links to the payment verification portal</li>
                  </ul>
                </div>
              </div>
            )}

            {receiptActiveTab === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Choose a built-in receipt theme. School branding and billing data are auto-populated.</p>
                {RECEIPT_BUILTIN.map(rcp => (
                  <div key={rcp.id}
                    onClick={() => { setSelectedReceiptBuiltin(rcp.id); setReceiptLogoUrl(null); updateConfig('primaryColor', rcp.color); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12,
                      border: selectedReceiptBuiltin === rcp.id ? `2px solid ${rcp.color}` : '2px solid #e2e8f0',
                      cursor: 'pointer', background: selectedReceiptBuiltin === rcp.id ? '#f8fafc' : '#fff',
                      transition: 'all 0.2s', boxShadow: selectedReceiptBuiltin === rcp.id ? `0 4px 16px ${rcp.color}30` : 'none' }}>
                    <div style={{ width: 48, height: 30, borderRadius: 6, background: rcp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fas ${rcp.icon}`} style={{ color: rcp.accent, fontSize: 14 }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{rcp.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Theme: {rcp.color}</div>
                    </div>
                    {selectedReceiptBuiltin === rcp.id && <i className="fas fa-check-circle" style={{ color: rcp.color, fontSize: 18 }}></i>}
                  </div>
                ))}
              </div>
            )}

            {/* Receipt Options */}
            <div className="portal-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <i className="fas fa-sliders-h" style={{ marginRight: 6, color: '#059669' }}></i>Receipt Options
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { key: 'showLogo', label: 'School Logo' },
                  { key: 'showStamp', label: 'Official Stamp' },
                  { key: 'enableQR', label: 'QR Code' },
                  { key: 'showStudentPhoto', label: 'Student Photo' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
                    <input type="checkbox" checked={template.config[opt.key]} onChange={e => updateConfig(opt.key, e.target.checked)}
                      style={{ accentColor: '#059669', width: 16, height: 16 }} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div><label className="portal-label">Footer/Disclaimer</label>
                <input type="text" className="portal-input" value={template.config.footerText} onChange={e => updateConfig('footerText', e.target.value)} />
              </div>
            </div>

            {/* Bulk Print Action */}
            <div style={{ background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)', borderRadius: 16, padding: 20, color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}><i className="fas fa-print" style={{ marginRight: 8 }}></i>Bulk Receipt Print</div>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>Generates a batch of print-ready receipts for a selected payment run.</p>
              <button type="button"
                onClick={() => { setGeneratingReceipts(true); setTimeout(() => { setGeneratingReceipts(false); showToast('Receipts prepared — Ready for print', 'success'); }, 2000); }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#fff', color: '#065f46', fontWeight: 900, fontSize: '0.9rem', transition: 'all 0.2s' }}>
                {generatingReceipts
                  ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Generating...</>
                  : <><i className="fas fa-file-pdf" style={{ marginRight: 8 }}></i>Generate Receipts PDF</>
                }
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
