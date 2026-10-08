import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import * as XLSX from 'xlsx';
import '../../../styles/portal.css';

interface SetupStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: SetupStep[] = [
  { id: 1, title: 'School Identity', description: 'Core branding, contact details, currency, and academic calendar' },
  { id: 2, title: 'Academic Structure', description: 'Levels, grade streams, student houses, and grading scales' },
  { id: 3, title: 'Subjects & Departments', description: 'Subject catalog, faculties, and class curricular linkages' },
  { id: 4, title: 'Users & Roles', description: 'Establish foundational administrators and bulk import teaching faculty' },
  { id: 5, title: 'Fee Structure', description: 'Standard billing items, class fees, and approved payment methods' },
  { id: 6, title: 'Timetable Defaults', description: 'Daily period structure, bell schedule, and instruction days' },
  { id: 7, title: 'Go Live', description: 'Verification summary and system activation for campus operations' }
];

export default function AdminSetupWizard() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [liveCounts, setLiveCounts] = useState({ classes: 0, subjects: 0, teachers: 0, departments: 0, students: 0 });

  // Step 1: School Identity
  const [step1, setStep1] = useState({
    name: '',
    motto: 'Excellence in Education',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    baseCurrency: 'USD',
    altCurrency: 'ZiG',
    currentTerm: 'Term 1',
    academicYearStart: `${new Date().getFullYear()}-01-15`
  });

  // Step 2: Academic Structure
  const [step2, setStep2] = useState({
    levels: ['PRIMARY'],
    classes: ['Grade 1A', 'Grade 1B', 'Grade 2A', 'Grade 2B', 'Grade 3A', 'Grade 4A', 'Grade 5A', 'Grade 6A', 'Grade 7A'],
    houses: ['Yellow (Chitepo)', 'Green (Tongogara)', 'Blue (Nkomo)', 'Red (Muzenda)'],
    gradingSystem: 'ZIMSEC',
    gradeA: 75,
    gradeB: 60,
    gradeC: 50
  });
  const [newClassInput, setNewClassInput] = useState('');
  const [newHouseInput, setNewHouseInput] = useState('');

  // Step 3: Subjects & Departments
  const [step3, setStep3] = useState({
    departments: ['Languages & Humanities', 'Mathematics & Science', 'Practical Arts & Commercials'],
    subjects: [
      { name: 'Mathematics', code: 'MATH', dept: 'Mathematics & Science' },
      { name: 'English Language', code: 'ENG', dept: 'Languages & Humanities' },
      { name: 'Indigenous Language (Shona/Ndebele)', code: 'LANG', dept: 'Languages & Humanities' },
      { name: 'General Science', code: 'SCI', dept: 'Mathematics & Science' },
      { name: 'Agriculture', code: 'AGRI', dept: 'Practical Arts & Commercials' },
      { name: 'Social Sciences & Heritage', code: 'SOC', dept: 'Languages & Humanities' }
    ]
  });
  const [newDeptInput, setNewDeptInput] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubDept, setNewSubDept] = useState('');

  // Step 4: Key Users & Faculty
  const [step4, setStep4] = useState({
    bursarName: '',
    bursarEmail: '',
    hodName: '',
    hodEmail: '',
    clerkName: '',
    clerkEmail: ''
  });
  const [uploadedTeachers, setUploadedTeachers] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Step 5: Fee Structure
  const [step5, setStep5] = useState({
    tuitionFeeUSD: 250,
    sdcLevyUSD: 50,
    transportFeeUSD: 80,
    paymentMethods: ['USD Cash', 'ZiG Bank Transfer', 'EcoCash', 'InnBucks', 'Swipe / POS']
  });

  // Step 6: Timetable Defaults
  const [step6, setStep6] = useState({
    periodsPerDay: 8,
    startTime: '07:30',
    endTime: '15:30',
    teaBreak: '10:00 - 10:30',
    lunchBreak: '12:30 - 13:30',
    instructionDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  // Fetch initial setup status and saved progress
  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    setFetchingStatus(true);
    try {
      const res = await api.get('/api/schools/setup-status');
      const { isOnboarded, currentStep: savedStep, setupProgress, school, counts } = res.data;

      if (isOnboarded && user?.role === 'SCHOOL_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      if (counts) setLiveCounts(counts);
      if (savedStep && savedStep >= 1 && savedStep <= 7) setCurrentStep(savedStep);

      // Populate step 1 defaults
      if (school) {
        setStep1(prev => ({
          ...prev,
          name: school.name || '',
          address: school.address || '',
          phone: school.phone || '',
          email: school.email || '',
          logoUrl: school.branding?.logo || ''
        }));
      }

      // Restore saved step progress if any
      if (setupProgress) {
        if (setupProgress.step1) setStep1(prev => ({ ...prev, ...setupProgress.step1 }));
        if (setupProgress.step2) setStep2(prev => ({ ...prev, ...setupProgress.step2 }));
        if (setupProgress.step3) setStep3(prev => ({ ...prev, ...setupProgress.step3 }));
        if (setupProgress.step4) setStep4(prev => ({ ...prev, ...setupProgress.step4 }));
        if (setupProgress.step5) setStep5(prev => ({ ...prev, ...setupProgress.step5 }));
        if (setupProgress.step6) setStep6(prev => ({ ...prev, ...setupProgress.step6 }));
      }
    } catch (err) {
      console.error('Failed to load setup status:', err);
    } finally {
      setFetchingStatus(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!step1.name.trim()) {
        showToast('School name is required.', 'error');
        return false;
      }
      if (!step1.email.trim()) {
        showToast('Official school email is required.', 'error');
        return false;
      }
    }
    if (currentStep === 2) {
      if (step2.classes.length === 0) {
        showToast('Please specify at least one class stream.', 'error');
        return false;
      }
    }
    if (currentStep === 3) {
      if (step3.subjects.length === 0) {
        showToast('Please specify at least one academic subject.', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      let stepData: any = {};
      if (currentStep === 1) stepData = step1;
      else if (currentStep === 2) stepData = step2;
      else if (currentStep === 3) stepData = step3;
      else if (currentStep === 4) stepData = { ...step4, teacherCount: uploadedTeachers.length };
      else if (currentStep === 5) stepData = step5;
      else if (currentStep === 6) stepData = step6;

      await api.post('/api/schools/setup-step', {
        step: currentStep,
        data: stepData
      });

      if (currentStep < 7) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save step progress', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      await api.post('/api/schools/setup-complete');
      showToast('School Setup Successfully Finalized! Welcome to your dashboard.', 'success');
      updateUser({ isOnboarded: true });
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to finalize onboarding', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTeacherTemplate = () => {
    const templateData = [
      { 'Full Name': 'Mr. John Moyo', 'Email': 'j.moyo@school.ac.zw', 'Phone': '+263771234567', 'National ID': '63-123456-A-75', 'Specialization': 'Mathematics', 'Gender': 'Male' },
      { 'Full Name': 'Mrs. Sarah Ncube', 'Email': 's.ncube@school.ac.zw', 'Phone': '+263772345678', 'National ID': '08-654321-B-80', 'Specialization': 'English Language', 'Gender': 'Female' },
      { 'Full Name': 'Mr. Tendai Sibanda', 'Email': 't.sibanda@school.ac.zw', 'Phone': '+263773456789', 'National ID': '29-987654-C-82', 'Specialization': 'Agriculture & Science', 'Gender': 'Male' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
    XLSX.writeFile(wb, 'Faculty_Import_Template.xlsx');
  };

  const handleTeacherFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const errors: string[] = [];
        const validTeachers: any[] = [];

        data.forEach((row, idx) => {
          const name = row['Full Name'] || row['Name'];
          const email = row['Email'];
          if (!name) {
            errors.push(`Row ${idx + 2}: Full Name is missing.`);
          } else if (!email || !email.includes('@')) {
            errors.push(`Row ${idx + 2} (${name}): Valid email is required.`);
          } else {
            validTeachers.push({
              name,
              email,
              phone: row['Phone'] || '',
              specialization: row['Specialization'] || 'General Teacher'
            });
          }
        });

        setUploadErrors(errors);
        setUploadedTeachers(validTeachers);
        if (validTeachers.length > 0) {
          showToast(`${validTeachers.length} teacher(s) verified from file`, 'success');
        }
      } catch (err) {
        showToast('Error reading Excel spreadsheet. Ensure format matches the template.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  if (fetchingStatus) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 15 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#2563eb' }}></i>
        <h3 style={{ color: '#475569' }}>Loading Setup Assistant...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '30px auto', padding: '0 20px 60px' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: 16, padding: '30px 36px', color: '#fff', marginBottom: 25, boxShadow: '0 10px 25px rgba(37,99,235,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
          <div>
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Initial School Configuration
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.8rem', fontWeight: 900 }}>Admin Setup Wizard</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', maxWidth: 600 }}>
              Configure institutional structure, faculty rosters, curricular standards, and fee schedules before entering operational mode.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 900 }}>{currentStep}</span>
            <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>/7</span>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Steps Completed</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, marginTop: 24, overflow: 'hidden' }}>
          <div style={{ width: `${(currentStep / 7) * 100}%`, height: '100%', background: '#60a5fa', transition: 'width 0.4s ease' }}></div>
        </div>
      </div>

      {/* Steps Navigation Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 25 }}>
        {STEPS.map(s => {
          const isDone = s.id < currentStep;
          const isCurrent = s.id === currentStep;
          return (
            <div 
              key={s.id}
              onClick={() => s.id <= currentStep && setCurrentStep(s.id)}
              style={{
                padding: '10px 8px',
                borderRadius: 8,
                background: isCurrent ? '#eff6ff' : isDone ? '#f8fafc' : '#ffffff',
                border: `1.5px solid ${isCurrent ? '#2563eb' : isDone ? '#86efac' : '#e2e8f0'}`,
                textAlign: 'center',
                cursor: s.id <= currentStep ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: isCurrent ? '#2563eb' : isDone ? '#16a34a' : '#94a3b8' }}>
                {isDone ? <i className="fas fa-check-circle" /> : `Step ${s.id}`}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isCurrent ? '#1e293b' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Step Body Card */}
      <div className="portal-card" style={{ padding: 32, borderRadius: 16 }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
            {STEPS[currentStep - 1].title}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            {STEPS[currentStep - 1].description}
          </p>
        </div>

        {/* STEP 1: School Identity */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="portal-form-group">
                <label>Official School Name *</label>
                <input 
                  className="portal-input" 
                  value={step1.name} 
                  placeholder="e.g. Lobengula High School"
                  onChange={e => setStep1({ ...step1, name: e.target.value })} 
                />
              </div>
              <div className="portal-form-group">
                <label>School Motto</label>
                <input 
                  className="portal-input" 
                  value={step1.motto} 
                  placeholder="e.g. Virtus et Labor"
                  onChange={e => setStep1({ ...step1, motto: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="portal-form-group">
                <label>Official Email Address *</label>
                <input 
                  type="email"
                  className="portal-input" 
                  value={step1.email} 
                  placeholder="admin@school.ac.zw"
                  onChange={e => setStep1({ ...step1, email: e.target.value })} 
                />
              </div>
              <div className="portal-form-group">
                <label>Campus Telephone / WhatsApp</label>
                <input 
                  className="portal-input" 
                  value={step1.phone} 
                  placeholder="+263 292 123456"
                  onChange={e => setStep1({ ...step1, phone: e.target.value })} 
                />
              </div>
            </div>

            <div className="portal-form-group">
              <label>Physical Campus Address</label>
              <textarea 
                className="portal-input" 
                rows={2}
                value={step1.address} 
                placeholder="Stand 452, Lobengula West, Bulawayo, Zimbabwe"
                onChange={e => setStep1({ ...step1, address: e.target.value })} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <div className="portal-form-group">
                <label>Primary Currency</label>
                <select 
                  className="portal-input" 
                  value={step1.baseCurrency}
                  onChange={e => setStep1({ ...step1, baseCurrency: e.target.value })}
                >
                  <option value="USD">USD ($)</option>
                  <option value="ZiG">ZiG (ZWG)</option>
                  <option value="ZAR">ZAR (R)</option>
                </select>
              </div>
              <div className="portal-form-group">
                <label>Current Operating Term</label>
                <select 
                  className="portal-input" 
                  value={step1.currentTerm}
                  onChange={e => setStep1({ ...step1, currentTerm: e.target.value })}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div className="portal-form-group">
                <label>Academic Year Commencement</label>
                <input 
                  type="date"
                  className="portal-input" 
                  value={step1.academicYearStart}
                  onChange={e => setStep1({ ...step1, academicYearStart: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Academic Structure */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10, color: '#334155' }}>
                Operational School Levels
              </label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {['ECD / Pre-School', 'Primary (Grade 1 - 7)', 'Secondary (Form 1 - 4)', 'High School (A-Level)', 'Tertiary / Vocational'].map(level => {
                  const isChecked = step2.levels.includes(level);
                  return (
                    <label key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {
                          setStep2(prev => ({
                            ...prev,
                            levels: isChecked ? prev.levels.filter(l => l !== level) : [...prev.levels, level]
                          }));
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{level}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                Classes & Grade Streams ({step2.classes.length} Configured)
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input 
                  className="portal-input" 
                  placeholder="e.g. Form 1A or Grade 4 Blue" 
                  value={newClassInput}
                  onChange={e => setNewClassInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newClassInput.trim()) {
                      e.preventDefault();
                      setStep2({ ...step2, classes: [...step2.classes, newClassInput.trim()] });
                      setNewClassInput('');
                    }
                  }}
                />
                <button 
                  className="portal-btn-primary" 
                  onClick={() => {
                    if (newClassInput.trim()) {
                      setStep2({ ...step2, classes: [...step2.classes, newClassInput.trim()] });
                      setNewClassInput('');
                    }
                  }}
                >
                  <i className="fas fa-plus mr-1" /> Add Class
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {step2.classes.map((cls, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#eff6ff', color: '#1e40af', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 }}>
                    {cls}
                    <i 
                      className="fas fa-times" 
                      style={{ cursor: 'pointer', opacity: 0.6 }} 
                      onClick={() => setStep2({ ...step2, classes: step2.classes.filter((_, i) => i !== idx) })}
                    />
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                Houses / Dormitories ({step2.houses.length} Configured)
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input 
                  className="portal-input" 
                  placeholder="e.g. Blue House (Eagle)" 
                  value={newHouseInput}
                  onChange={e => setNewHouseInput(e.target.value)}
                />
                <button 
                  className="portal-btn-secondary" 
                  onClick={() => {
                    if (newHouseInput.trim()) {
                      setStep2({ ...step2, houses: [...step2.houses, newHouseInput.trim()] });
                      setNewHouseInput('');
                    }
                  }}
                >
                  Add House
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {step2.houses.map((h, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f1f5f9', color: '#334155', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600 }}>
                    {h}
                    <i 
                      className="fas fa-times" 
                      style={{ cursor: 'pointer', opacity: 0.6 }} 
                      onClick={() => setStep2({ ...step2, houses: step2.houses.filter((_, i) => i !== idx) })}
                    />
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: 12, color: '#1e293b' }}>
                Grading System & Thresholds ({step2.gradingSystem})
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Curriculum Body</label>
                  <select 
                    className="portal-input" 
                    value={step2.gradingSystem}
                    onChange={e => setStep2({ ...step2, gradingSystem: e.target.value })}
                  >
                    <option value="ZIMSEC">ZIMSEC Standard</option>
                    <option value="CAMBRIDGE">Cambridge International</option>
                    <option value="HEXCO">HEXCO Technical</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Grade A Distinction (%)</label>
                  <input 
                    type="number" 
                    className="portal-input" 
                    value={step2.gradeA}
                    onChange={e => setStep2({ ...step2, gradeA: parseInt(e.target.value) || 75 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Grade B Credit (%)</label>
                  <input 
                    type="number" 
                    className="portal-input" 
                    value={step2.gradeB}
                    onChange={e => setStep2({ ...step2, gradeB: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Grade C Pass (%)</label>
                  <input 
                    type="number" 
                    className="portal-input" 
                    value={step2.gradeC}
                    onChange={e => setStep2({ ...step2, gradeC: parseInt(e.target.value) || 50 })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Subjects & Departments */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                Academic Departments
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input 
                  className="portal-input" 
                  placeholder="e.g. Commercials & ICT" 
                  value={newDeptInput}
                  onChange={e => setNewDeptInput(e.target.value)}
                />
                <button 
                  className="portal-btn-secondary" 
                  onClick={() => {
                    if (newDeptInput.trim()) {
                      setStep3({ ...step3, departments: [...step3.departments, newDeptInput.trim()] });
                      setNewDeptInput('');
                    }
                  }}
                >
                  Add Department
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {step3.departments.map((dept, idx) => (
                  <span key={idx} style={{ padding: '6px 14px', background: '#e0f2fe', color: '#0369a1', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                    <i className="fas fa-sitemap mr-1" /> {dept}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                Subject Catalog ({step3.subjects.length} Subjects Configured)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 10, marginBottom: 15 }}>
                <input 
                  className="portal-input" 
                  placeholder="Subject Name (e.g. Chemistry)" 
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                />
                <input 
                  className="portal-input" 
                  placeholder="Code (CHEM)" 
                  value={newSubCode}
                  onChange={e => setNewSubCode(e.target.value)}
                />
                <select 
                  className="portal-input"
                  value={newSubDept}
                  onChange={e => setNewSubDept(e.target.value)}
                >
                  <option value="">Assign Department</option>
                  {step3.departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button 
                  className="portal-btn-primary"
                  onClick={() => {
                    if (newSubName.trim()) {
                      setStep3({
                        ...step3,
                        subjects: [
                          ...step3.subjects,
                          {
                            name: newSubName.trim(),
                            code: newSubCode.trim().toUpperCase() || newSubName.substring(0, 4).toUpperCase(),
                            dept: newSubDept || step3.departments[0] || 'General'
                          }
                        ]
                      });
                      setNewSubName('');
                      setNewSubCode('');
                    }
                  }}
                >
                  <i className="fas fa-plus" />
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <table className="portal-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Code</th>
                      <th>Assigned Department</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step3.subjects.map((sub, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{sub.name}</td>
                        <td style={{ fontFamily: 'monospace', color: '#2563eb' }}>{sub.code}</td>
                        <td>{sub.dept}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="portal-btn-ghost" 
                            style={{ padding: '4px 8px', color: '#dc2626' }}
                            onClick={() => setStep3({ ...step3, subjects: step3.subjects.filter((_, i) => i !== idx) })}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Users & Roles */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800 }}>Foundational Officers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 12 }}>
                <input 
                  className="portal-input" 
                  placeholder="Bursar Full Name" 
                  value={step4.bursarName} 
                  onChange={e => setStep4({ ...step4, bursarName: e.target.value })} 
                />
                <input 
                  className="portal-input" 
                  placeholder="Bursar Email" 
                  value={step4.bursarEmail} 
                  onChange={e => setStep4({ ...step4, bursarEmail: e.target.value })} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 12 }}>
                <input 
                  className="portal-input" 
                  placeholder="Head of Department (Senior HOD)" 
                  value={step4.hodName} 
                  onChange={e => setStep4({ ...step4, hodName: e.target.value })} 
                />
                <input 
                  className="portal-input" 
                  placeholder="HOD Email" 
                  value={step4.hodEmail} 
                  onChange={e => setStep4({ ...step4, hodEmail: e.target.value })} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <input 
                  className="portal-input" 
                  placeholder="Admissions / Reception Clerk" 
                  value={step4.clerkName} 
                  onChange={e => setStep4({ ...step4, clerkName: e.target.value })} 
                />
                <input 
                  className="portal-input" 
                  placeholder="Clerk Email" 
                  value={step4.clerkEmail} 
                  onChange={e => setStep4({ ...step4, clerkEmail: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.4rem' }}>
                <i className="fas fa-file-excel" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800 }}>Bulk Import Teaching Faculty</h3>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                Download our formatted spreadsheet template, enter your teaching staff, and upload here.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                <button className="portal-btn-secondary" onClick={downloadTeacherTemplate}>
                  <i className="fas fa-download mr-1" /> Download Excel Template
                </button>
                <label className="portal-btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                  <i className="fas fa-upload mr-1" /> Upload Completed Sheet
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleTeacherFileUpload} />
                </label>
              </div>

              {uploadedTeachers.length > 0 && (
                <div style={{ marginTop: 18, textAlign: 'left', background: '#f0fdf4', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 800, color: '#166534', marginBottom: 6 }}>
                    <i className="fas fa-check-circle mr-1" /> {uploadedTeachers.length} Faculty Member(s) Ready to Onboard:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d' }}>
                    {uploadedTeachers.slice(0, 5).map(t => t.name).join(', ')}
                    {uploadedTeachers.length > 5 && ` and ${uploadedTeachers.length - 5} more.`}
                  </div>
                </div>
              )}

              {uploadErrors.length > 0 && (
                <div style={{ marginTop: 14, textAlign: 'left', background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 800, color: '#991b1b', marginBottom: 4 }}>Validation Errors Detected:</div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8rem', color: '#b91c1c' }}>
                    {uploadErrors.slice(0, 3).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Fee Structure */}
        {currentStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="portal-form-group">
                <label>Tuition Fee per Term (USD)</label>
                <input 
                  type="number" 
                  className="portal-input" 
                  value={step5.tuitionFeeUSD} 
                  onChange={e => setStep5({ ...step5, tuitionFeeUSD: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="portal-form-group">
                <label>SDC Capital Levy per Term (USD)</label>
                <input 
                  type="number" 
                  className="portal-input" 
                  value={step5.sdcLevyUSD} 
                  onChange={e => setStep5({ ...step5, sdcLevyUSD: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="portal-form-group">
                <label>Day-Scholar Transport Option (USD)</label>
                <input 
                  type="number" 
                  className="portal-input" 
                  value={step5.transportFeeUSD} 
                  onChange={e => setStep5({ ...step5, transportFeeUSD: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 10, color: '#334155' }}>
                Authorized Fee Payment Channels
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['USD Cash', 'ZiG Bank Transfer', 'EcoCash', 'InnBucks', 'Swipe / POS Terminal', 'Direct Bank Deposit'].map(pm => {
                  const isSelected = step5.paymentMethods.includes(pm);
                  return (
                    <label key={pm} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: isSelected ? '#ecfdf5' : '#f8fafc', border: `1px solid ${isSelected ? '#a7f3d0' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {
                          setStep5(prev => ({
                            ...prev,
                            paymentMethods: isSelected ? prev.paymentMethods.filter(p => p !== pm) : [...prev.paymentMethods, pm]
                          }));
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#065f46' : '#334155' }}>{pm}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Timetable Defaults */}
        {currentStep === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="portal-form-group">
                <label>Teaching Periods per Day</label>
                <input 
                  type="number" 
                  className="portal-input" 
                  value={step6.periodsPerDay} 
                  onChange={e => setStep6({ ...step6, periodsPerDay: parseInt(e.target.value) || 8 })} 
                />
              </div>
              <div className="portal-form-group">
                <label>First Bell / Assembly Time</label>
                <input 
                  type="time" 
                  className="portal-input" 
                  value={step6.startTime} 
                  onChange={e => setStep6({ ...step6, startTime: e.target.value })} 
                />
              </div>
              <div className="portal-form-group">
                <label>Final Period Dismissal</label>
                <input 
                  type="time" 
                  className="portal-input" 
                  value={step6.endTime} 
                  onChange={e => setStep6({ ...step6, endTime: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="portal-form-group">
                <label>Morning Tea Break Window</label>
                <input 
                  className="portal-input" 
                  value={step6.teaBreak} 
                  placeholder="10:00 - 10:30"
                  onChange={e => setStep6({ ...step6, teaBreak: e.target.value })} 
                />
              </div>
              <div className="portal-form-group">
                <label>Lunch Break Window</label>
                <input 
                  className="portal-input" 
                  value={step6.lunchBreak} 
                  placeholder="12:30 - 13:30"
                  onChange={e => setStep6({ ...step6, lunchBreak: e.target.value })} 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Go Live Verification */}
        {currentStep === 7 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem' }}>
              <i className="fas fa-rocket" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#065f46', margin: '0 0 10px' }}>
              Your School Configuration is Ready!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', maxWidth: 600, margin: '0 auto 25px' }}>
              All 6 structural stages have been verified and synchronized. Finalizing setup will unlock the full master administration suite.
            </p>

            {/* Live Counts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginBottom: 30, textAlign: 'left' }}>
              <div style={{ background: '#eff6ff', padding: 18, borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Classes & Streams</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e3a8a' }}>{Math.max(step2.classes.length, liveCounts.classes)}</div>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Configured</div>
              </div>
              <div style={{ background: '#f5f3ff', padding: 18, borderRadius: 12, border: '1px solid #ddd6fe' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>Academic Subjects</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4c1d95' }}>{Math.max(step3.subjects.length, liveCounts.subjects)}</div>
                <div style={{ fontSize: '0.8rem', color: '#8b5cf6' }}>Catalogued</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: 18, borderRadius: 12, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Teaching Faculty</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#14532d' }}>{Math.max(uploadedTeachers.length, liveCounts.teachers)}</div>
                <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>Identified</div>
              </div>
              <div style={{ background: '#fef3c7', padding: 18, borderRadius: 12, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Departments</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#78350f' }}>{Math.max(step3.departments.length, liveCounts.departments)}</div>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Established</div>
              </div>
            </div>

            <button 
              className="portal-btn-primary" 
              style={{ padding: '16px 36px', fontSize: '1.1rem', fontWeight: 800, borderRadius: 12, boxShadow: '0 8px 20px rgba(37,99,235,0.3)' }}
              onClick={handleFinishSetup}
              disabled={loading}
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2" /> : <i className="fas fa-check-circle mr-2" />}
              Finish Setup & Go to Dashboard
            </button>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        {currentStep < 7 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
            <button 
              className="portal-btn-secondary" 
              onClick={handleBack} 
              disabled={currentStep === 1 || loading}
            >
              <i className="fas fa-arrow-left mr-2" /> Back
            </button>
            <button 
              className="portal-btn-primary" 
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2" /> : null}
              Next: {STEPS[currentStep].title} <i className="fas fa-arrow-right ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
