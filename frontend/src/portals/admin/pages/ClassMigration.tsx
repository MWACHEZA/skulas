import React, { useState, useEffect, useCallback } from 'react';
import { PaginatedTable } from '../../../components/shared/Pagination';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import '../../../styles/portal.css';

interface SchoolClass {
  id: string;
  name: string;
  level: string;
  _count?: {
    students?: number;
  };
}

interface EnrichedStudent {
  id: string;
  studentId: string;
  name: string;
  part: number;
  status: string;
  standing: string;
  hostelId: string | null;
  roomId: string | null;
  hostelName: string | null;
  roomNumber: string | null;
  isBoarder: boolean;
  outstandingBalance: number;
  suggestedAction: 'PROMOTE' | 'REPEAT' | 'GRADUATE';
  userRole: string;
}

interface StudentDecision {
  action: 'PROMOTE' | 'REPEAT' | 'GRADUATE';
  targetClassId: string;
  targetPart: number;
  note: string;
}

export default function ClassMigration() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const schoolType = user?.schoolType || 'Secondary';
  const { t } = useTerminology();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'wizard' | 'mapping'>('wizard');

  // Wizard state: 1 (Setup) -> 2 (Decisions) -> 3 (Policies) -> 4 (Review) -> 5 (Receipt)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Common data
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);

  // Wizard Setup (Step 1)
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetAcademicYear, setTargetAcademicYear] = useState<number>(new Date().getFullYear() + 1);
  const [targetTerm, setTargetTerm] = useState<number>(1);
  const [defaultTargetClassId, setDefaultTargetClassId] = useState('');
  const [defaultTargetPart, setDefaultTargetPart] = useState<number>(2);

  // Wizard Registry & Decisions (Step 2)
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [decisions, setDecisions] = useState<Record<string, StudentDecision>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Wizard Rollover Options (Step 3)
  const [carryForwardFees, setCarryForwardFees] = useState(true);
  const [resetBoardingAllocation, setResetBoardingAllocation] = useState(true);
  const [graduatedRoleAlumni, setGraduatedRoleAlumni] = useState(true);

  // Wizard Execution Results (Step 5)
  const [migrationReceipt, setMigrationReceipt] = useState<any>(null);

  // Tab 2: Bulk Mapping state
  const [bulkMappings, setBulkMappings] = useState<Record<string, { targetClassId: string; targetPart: number }>>({});

  const getYearLabel = (typeStr: string) => {
    const type = (typeStr || '').toLowerCase();
    if (
      type.includes('university') ||
      type.includes('varsity') ||
      type.includes('tertiary') ||
      type.includes('college') ||
      type.includes('poly') ||
      type.includes('nursing') ||
      type.includes('medical')
    ) {
      return 'Academic Year (Part)';
    }
    if (type.includes('primary')) return t('grade');
    if (type.includes('secondary') || type.includes('high')) return 'Form';
    return t('grade');
  };

  const getYearValueLabel = (typeStr: string, partValue: number | string | null | undefined) => {
    const part = partValue !== null && partValue !== undefined ? partValue : '1';
    const type = (typeStr || '').toLowerCase();
    if (
      type.includes('university') ||
      type.includes('varsity') ||
      type.includes('tertiary') ||
      type.includes('college') ||
      type.includes('poly') ||
      type.includes('nursing') ||
      type.includes('medical')
    ) {
      return `Part ${part}`;
    }
    if (type.includes('primary')) return `${t('grade')} ${part}`;
    if (type.includes('secondary') || type.includes('high')) return `Form ${part}`;
    return `${t('grade')} ${part}`;
  };

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load classes', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (Array.isArray(classes)) {
      const initial: Record<string, { targetClassId: string; targetPart: number }> = {};
      classes.forEach((c) => {
        initial[c.id] = { targetClassId: '', targetPart: 1 };
      });
      setBulkMappings(initial);
    }
  }, [classes]);

  // Load enriched student registry for Wizard
  const handleLoadClassRegistry = async () => {
    if (!sourceClassId) {
      showToast('Please select a source class registry', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/students/by-class/${sourceClassId}`);
      const list: EnrichedStudent[] = Array.isArray(res.data) ? res.data : [];
      setStudents(list);

      if (list.length === 0) {
        showToast('No students found in the selected class', 'info');
        setLoading(false);
        return;
      }

      // Initialize decisions based on suggestedAction
      const initialDecisions: Record<string, StudentDecision> = {};
      list.forEach((s) => {
        const action = s.suggestedAction || 'PROMOTE';
        let tgtClass = defaultTargetClassId;
        let tgtPart = defaultTargetPart;

        if (action === 'REPEAT') {
          tgtClass = sourceClassId;
          tgtPart = s.part || 1;
        } else if (action === 'GRADUATE') {
          tgtClass = '';
          tgtPart = s.part || 1;
        }

        initialDecisions[s.id] = {
          action,
          targetClassId: tgtClass,
          targetPart: tgtPart,
          note: action === 'REPEAT' ? 'Retained on academic standing recommendation' : ''
        };
      });

      setDecisions(initialDecisions);
      setWizardStep(2);
      showToast(`Loaded ${list.length} learners for migration review`, 'success');
    } catch {
      showToast('Failed to load students for selected class', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk decision helpers in Step 2
  const applyActionToAll = (action: 'PROMOTE' | 'REPEAT' | 'GRADUATE') => {
    setDecisions((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        let tgtClass = defaultTargetClassId;
        let tgtPart = defaultTargetPart;
        if (action === 'REPEAT') {
          tgtClass = sourceClassId;
          tgtPart = s.part || 1;
        } else if (action === 'GRADUATE') {
          tgtClass = '';
          tgtPart = s.part || 1;
        }
        updated[s.id] = {
          action,
          targetClassId: tgtClass,
          targetPart: tgtPart,
          note: updated[s.id]?.note || ''
        };
      });
      return updated;
    });
    showToast(`Set all learners to ${action}`, 'info');
  };

  const autoApplyAcademicStandings = () => {
    setDecisions((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        const action = s.suggestedAction || 'PROMOTE';
        let tgtClass = defaultTargetClassId;
        let tgtPart = defaultTargetPart;
        if (action === 'REPEAT') {
          tgtClass = sourceClassId;
          tgtPart = s.part || 1;
        } else if (action === 'GRADUATE') {
          tgtClass = '';
          tgtPart = s.part || 1;
        }
        updated[s.id] = {
          action,
          targetClassId: tgtClass,
          targetPart: tgtPart,
          note: s.standing === 'Repeat' ? 'Auto-assigned based on academic evaluation' : ''
        };
      });
      return updated;
    });
    showToast('Applied intelligent academic recommendations', 'success');
  };

  const updateStudentDecision = (studentId: string, updates: Partial<StudentDecision>) => {
    setDecisions((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        ...updates
      }
    }));
  };

  // Validate Step 2 before proceeding
  const handleProceedToPolicies = () => {
    const invalidPromotion = students.some((s) => {
      const dec = decisions[s.id];
      return dec?.action === 'PROMOTE' && !dec.targetClassId;
    });

    if (invalidPromotion) {
      showToast('Please select a destination class for all promoted learners', 'warning');
      return;
    }

    setWizardStep(3);
  };

  // Calculate live summary stats
  const summaryCounts = {
    total: students.length,
    promoted: students.filter((s) => decisions[s.id]?.action === 'PROMOTE').length,
    repeated: students.filter((s) => decisions[s.id]?.action === 'REPEAT').length,
    graduated: students.filter((s) => decisions[s.id]?.action === 'GRADUATE').length,
    feesToRollOver: students
      .filter((s) => s.outstandingBalance > 0)
      .reduce((sum, s) => sum + s.outstandingBalance, 0),
    boardersToVacate: students.filter((s) => s.isBoarder).length
  };

  // Execute Migration Wizard
  const handleExecuteMigration = async () => {
    const payloadDecisions = students.map((s) => {
      const dec = decisions[s.id] || {
        action: 'PROMOTE',
        targetClassId: defaultTargetClassId,
        targetPart: defaultTargetPart,
        note: ''
      };
      return {
        studentId: s.id,
        action: dec.action,
        targetClassId: dec.action === 'GRADUATE' ? null : dec.targetClassId || null,
        targetPart: dec.action === 'GRADUATE' ? null : Number(dec.targetPart) || 1,
        note: dec.note || null
      };
    });

    setLoading(true);
    try {
      const res = await api.post('/api/students/migration-wizard', {
        sourceClassId,
        targetAcademicYear: Number(targetAcademicYear),
        targetTerm: Number(targetTerm),
        decisions: payloadDecisions,
        options: {
          carryForwardFees,
          resetBoardingAllocation,
          graduatedRoleAlumni
        }
      });

      setMigrationReceipt(res.data);
      setWizardStep(5);
      fetchClasses();
      showToast('Class Migration executed successfully!', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Migration failed';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tab 2: Bulk stream mapping handler
  const handleBulkMigrate = async () => {
    const mappingsToSend = Object.entries(bulkMappings)
      .filter(([, value]) => !!value.targetClassId)
      .map(([sourceId, value]) => ({
        sourceClassId: sourceId,
        targetClassId: value.targetClassId,
        targetPart: value.targetPart
      }));

    if (mappingsToSend.length === 0) {
      showToast('Please select at least one class destination mapping', 'warning');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to execute bulk class mapping for ${mappingsToSend.length} classes? All students in these classes will be updated.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/students/bulk-migrate', {
        mappings: mappingsToSend
      });
      showToast(`Bulk migration successful! Updated ${res.data.count} students.`, 'success');
      fetchClasses();

      const resetMappings: Record<string, { targetClassId: string; targetPart: number }> = {};
      classes.forEach((c) => {
        resetMappings[c.id] = { targetClassId: '', targetPart: 1 };
      });
      setBulkMappings(resetMappings);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Bulk migration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const sourceClass = classes.find((c) => c.id === sourceClassId);
    const rows = students
      .map((s) => {
        const dec = decisions[s.id];
        const tgtClass = classes.find((c) => c.id === dec?.targetClassId);
        return `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">${s.studentId}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold;">${s.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px;">${s.standing}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold;">${dec?.action || 'PROMOTE'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px;">${
          dec?.action === 'GRADUATE' ? 'Alumni Association' : tgtClass ? tgtClass.name : 'N/A'
        }</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px;">$${s.outstandingBalance.toFixed(2)}</td>
      </tr>
    `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Class Migration Manifest - ${sourceClass?.name || 'Class'}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            h1 { font-size: 1.8rem; font-weight: 900; margin-bottom: 4px; color: #0f172a; }
            p { font-size: 1rem; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 10px; text-align: left; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: #475569; }
            td { font-size: 0.95rem; color: #334155; }
          </style>
        </head>
        <body>
          <h1>Class Migration Manifest</h1>
          <p><strong>Source Registry:</strong> ${sourceClass?.name || 'N/A'} &bull; <strong>Target Academic Year:</strong> ${targetAcademicYear} Term ${targetTerm}</p>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Standing</th>
                <th>Action</th>
                <th>Destination</th>
                <th>Debt Carried Over</th>
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
    const headers = ['Student ID', 'Name', 'Standing', 'Action Decision', 'Target Class', 'Target Part', 'Outstanding Fees'];
    const rows = students.map((s) => {
      const dec = decisions[s.id];
      const tgtClass = classes.find((c) => c.id === dec?.targetClassId);
      return [
        s.studentId,
        s.name,
        s.standing,
        dec?.action || 'PROMOTE',
        dec?.action === 'GRADUATE' ? 'Alumni' : tgtClass?.name || 'N/A',
        dec?.targetPart || 1,
        s.outstandingBalance
      ];
    });
    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `class_migration_${sourceClassId}_${targetAcademicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetWizard = () => {
    setWizardStep(1);
    setStudents([]);
    setDecisions({});
    setMigrationReceipt(null);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container">
      {/* Top Page Header */}
      <div className="portal-page-header">
        <div className="header-content">
          <h1>{t('migration')}</h1>
          <p>
            Promote, repeat, or graduate {t('students').toLowerCase()} with automated fee rollover and boarding allocation reset.
          </p>
        </div>
        <div className="portal-tab-container">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`portal-tab-item ${activeTab === 'wizard' ? 'active' : ''}`}
          >
            <i className="fas fa-magic mr-2" /> Class Migration Wizard
          </button>
          <button
            onClick={() => setActiveTab('mapping')}
            className={`portal-tab-item ${activeTab === 'mapping' ? 'active' : ''}`}
          >
            <i className="fas fa-sitemap mr-2" /> Whole School Stream Mapping
          </button>
        </div>
      </div>

      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Wizard Step Progress Tracker */}
          <div
            className="portal-card"
            style={{
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px'
            }}
          >
            {[
              { num: 1, label: 'Session Setup', icon: 'fa-calendar-alt' },
              { num: 2, label: 'Learner Decisions', icon: 'fa-user-check' },
              { num: 3, label: 'Rollover Policies', icon: 'fa-sliders-h' },
              { num: 4, label: 'Review & Authorize', icon: 'fa-shield-alt' },
              { num: 5, label: 'Receipt & Manifest', icon: 'fa-check-circle' }
            ].map((step, idx) => {
              const isActive = wizardStep === step.num;
              const isPast = wizardStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: isPast ? 'pointer' : 'default',
                      opacity: isActive ? 1 : isPast ? 0.9 : 0.45
                    }}
                    onClick={() => isPast && setWizardStep(step.num as any)}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isPast ? '#10b981' : isActive ? '#2563eb' : '#e2e8f0',
                        color: isPast || isActive ? '#fff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    >
                      {isPast ? <i className="fas fa-check" /> : step.num}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? '#0f172a' : '#64748b'
                        }}
                      >
                        {step.label}
                      </div>
                    </div>
                  </div>
                  {idx < 4 && (
                    <div
                      style={{
                        flex: 1,
                        height: '2px',
                        background: wizardStep > idx + 1 ? '#10b981' : '#e2e8f0',
                        margin: '0 12px'
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* STEP 1: CLASS & SESSION SETUP */}
          {wizardStep === 1 && (
            <div
              className="portal-card animate-in fade-in duration-300"
              style={{ padding: '32px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                  Step 1: Configure Class Registry & Target Session
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                  Select the source class to process and establish the default target session parameters.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label className="portal-label">Source Class Registry *</label>
                  <select
                    value={sourceClassId}
                    onChange={(e) => setSourceClassId(e.target.value)}
                    className="portal-input"
                    style={{ height: '48px', fontWeight: 600 }}
                  >
                    <option value="">-- Select Source Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level}) &bull; {c._count?.students || 0} students
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="portal-label">Target Academic Year *</label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={targetAcademicYear}
                    onChange={(e) => setTargetAcademicYear(Number(e.target.value) || new Date().getFullYear())}
                    className="portal-input"
                    style={{ height: '48px', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="portal-label">Target Term *</label>
                  <select
                    value={targetTerm}
                    onChange={(e) => setTargetTerm(Number(e.target.value) || 1)}
                    className="portal-input"
                    style={{ height: '48px', fontWeight: 600 }}
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="portal-label">Default Target Class (for Promoted)</label>
                  <select
                    value={defaultTargetClassId}
                    onChange={(e) => setDefaultTargetClassId(e.target.value)}
                    className="portal-input"
                    style={{ height: '48px', fontWeight: 600 }}
                  >
                    <option value="">-- Auto/Select Destination --</option>
                    {classes
                      .filter((c) => c.id !== sourceClassId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.level})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="portal-label">Default Target {getYearLabel(schoolType)}</label>
                  <input
                    type="number"
                    min={1}
                    value={defaultTargetPart}
                    onChange={(e) => setDefaultTargetPart(Number(e.target.value) || 1)}
                    className="portal-input"
                    style={{ height: '48px', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: '32px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '20px'
                }}
              >
                <button
                  onClick={handleLoadClassRegistry}
                  disabled={loading || !sourceClassId}
                  className="portal-btn-primary"
                  style={{
                    padding: '12px 28px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-arrow-right" />}
                  Load Class Registry & Launch Wizard
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DECISIONS MATRIX */}
          {wizardStep === 2 && (
            <div
              className="portal-card animate-in fade-in duration-300"
              style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
            >
              {/* Header & Quick Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                    Step 2: Learner Migration Decisions
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                    Assign individual actions: <strong>Promote</strong> (next class), <strong>Repeat</strong> (retained in current grade), or <strong>Graduate</strong> (alumni).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => applyActionToAll('PROMOTE')}
                    className="portal-btn-neutral"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#166534', borderColor: '#bbf7d0' }}
                  >
                    <i className="fas fa-level-up-alt mr-1" /> Promote All
                  </button>
                  <button
                    onClick={() => applyActionToAll('REPEAT')}
                    className="portal-btn-neutral"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#9a3412', borderColor: '#fed7aa' }}
                  >
                    <i className="fas fa-redo mr-1" /> Repeat All
                  </button>
                  <button
                    onClick={() => applyActionToAll('GRADUATE')}
                    className="portal-btn-neutral"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#6b21a8', borderColor: '#e9d5ff' }}
                  >
                    <i className="fas fa-user-graduate mr-1" /> Graduate All
                  </button>
                  <button
                    onClick={autoApplyAcademicStandings}
                    className="portal-btn-neutral"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#1e40af', borderColor: '#bfdbfe', background: '#eff6ff' }}
                  >
                    <i className="fas fa-brain mr-1" /> Auto-Apply Standings
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div style={{ marginBottom: '16px', maxWidth: '350px' }}>
                <input
                  type="text"
                  placeholder="Filter by learner name or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="portal-input"
                  style={{ height: '38px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Decisions Table */}
              <div className="table-responsive" style={{ maxHeight: '520px' }}>
                <PaginatedTable className="management-table" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '12px' }}>Learner ID & Name</th>
                      <th style={{ padding: '12px' }}>Academic Standing</th>
                      <th style={{ padding: '12px' }}>Outstanding Debt</th>
                      <th style={{ padding: '12px' }}>Boarding</th>
                      <th style={{ padding: '12px', minWidth: '220px' }}>Migration Action</th>
                      <th style={{ padding: '12px', minWidth: '180px' }}>Target Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => {
                      const dec = decisions[s.id] || {
                        action: 'PROMOTE',
                        targetClassId: defaultTargetClassId,
                        targetPart: defaultTargetPart,
                        note: ''
                      };

                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                              {s.studentId}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background:
                                  s.standing === 'Repeat' || s.standing === 'Discontinue'
                                    ? '#fee2e2'
                                    : s.standing === 'Carry Over'
                                    ? '#e0e7ff'
                                    : '#dcfce7',
                                color:
                                  s.standing === 'Repeat' || s.standing === 'Discontinue'
                                    ? '#b91c1c'
                                    : s.standing === 'Carry Over'
                                    ? '#3730a3'
                                    : '#15803d'
                              }}
                            >
                              {s.standing}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {s.outstandingBalance > 0 ? (
                              <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem' }}>
                                <i className="fas fa-exclamation-circle mr-1" />${s.outstandingBalance.toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.85rem' }}>
                                $0.00 Cleared
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {s.isBoarder ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#e0f2fe',
                                  color: '#0369a1'
                                }}
                              >
                                <i className="fas fa-bed mr-1" />
                                {s.hostelName || 'Hostel'}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Day Scholar</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {/* Segmented button group for PROMOTE / REPEAT / GRADUATE */}
                            <div
                              style={{
                                display: 'inline-flex',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                overflow: 'hidden'
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateStudentDecision(s.id, {
                                    action: 'PROMOTE',
                                    targetClassId: defaultTargetClassId,
                                    targetPart: defaultTargetPart
                                  })
                                }
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: dec.action === 'PROMOTE' ? '#10b981' : '#fff',
                                  color: dec.action === 'PROMOTE' ? '#fff' : '#475569'
                                }}
                              >
                                Promote
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStudentDecision(s.id, {
                                    action: 'REPEAT',
                                    targetClassId: sourceClassId,
                                    targetPart: s.part || 1
                                  })
                                }
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: 'none',
                                  borderLeft: '1px solid #cbd5e1',
                                  borderRight: '1px solid #cbd5e1',
                                  background: dec.action === 'REPEAT' ? '#f59e0b' : '#fff',
                                  color: dec.action === 'REPEAT' ? '#fff' : '#475569'
                                }}
                              >
                                Repeat
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStudentDecision(s.id, {
                                    action: 'GRADUATE',
                                    targetClassId: '',
                                    targetPart: s.part || 1
                                  })
                                }
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: dec.action === 'GRADUATE' ? '#8b5cf6' : '#fff',
                                  color: dec.action === 'GRADUATE' ? '#fff' : '#475569'
                                }}
                              >
                                Graduate
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {dec.action === 'GRADUATE' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: '#7c3aed',
                                  fontWeight: 700,
                                  fontSize: '0.85rem'
                                }}
                              >
                                <i className="fas fa-graduation-cap" /> Alumni Portal
                              </span>
                            ) : (
                              <select
                                value={dec.targetClassId}
                                onChange={(e) => updateStudentDecision(s.id, { targetClassId: e.target.value })}
                                className="portal-input"
                                style={{ height: '36px', fontSize: '0.85rem' }}
                              >
                                <option value="">-- Choose Target Class --</option>
                                {classes.map((tc) => (
                                  <option key={tc.id} value={tc.id}>
                                    {tc.name} ({tc.level})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </PaginatedTable>
              </div>

              {/* Navigation footer */}
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '20px'
                }}
              >
                <button onClick={() => setWizardStep(1)} className="portal-btn-secondary" style={{ padding: '10px 20px' }}>
                  <i className="fas fa-arrow-left mr-2" /> Back to Setup
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleProceedToPolicies} className="portal-btn-primary" style={{ padding: '10px 24px', fontWeight: 800 }}>
                    Proceed to Rollover Policies <i className="fas fa-arrow-right ml-2" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ROLLOVER POLICIES */}
          {wizardStep === 3 && (
            <div
              className="portal-card animate-in fade-in duration-300"
              style={{ padding: '32px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                  Step 3: Financial & Boarding Rollover Options
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                  Configure automated accounting carry-over and facility resets for the incoming session.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Policy 1: Fee Carry-Over */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: carryForwardFees ? '#f0fdf4' : '#fff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}
                >
                  <input
                    type="checkbox"
                    id="carryForwardFees"
                    checked={carryForwardFees}
                    onChange={(e) => setCarryForwardFees(e.target.checked)}
                    style={{ width: '20px', height: '20px', marginTop: '4px', cursor: 'pointer' }}
                  />
                  <div>
                    <label
                      htmlFor="carryForwardFees"
                      style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', cursor: 'pointer' }}
                    >
                      Carry Forward Unpaid Fee Debts to Year {targetAcademicYear} Term {targetTerm}
                    </label>
                    <p style={{ color: '#475569', fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Automatically rolls over outstanding balances into a formal opening ledger balance for the new session, marking previous unpaid term entries as <code>carried_forward</code>.
                    </p>
                  </div>
                </div>

                {/* Policy 2: Boarding Reset */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: resetBoardingAllocation ? '#eff6ff' : '#fff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}
                >
                  <input
                    type="checkbox"
                    id="resetBoardingAllocation"
                    checked={resetBoardingAllocation}
                    onChange={(e) => setResetBoardingAllocation(e.target.checked)}
                    style={{ width: '20px', height: '20px', marginTop: '4px', cursor: 'pointer' }}
                  />
                  <div>
                    <label
                      htmlFor="resetBoardingAllocation"
                      style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', cursor: 'pointer' }}
                    >
                      Reset Boarding & Hostel Bed Allocations
                    </label>
                    <p style={{ color: '#475569', fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Marks active hostel bed allocations as <code>VACATED</code> and clears hostel and room links on learner profiles, allowing fresh room allocations for the new academic year.
                    </p>
                  </div>
                </div>

                {/* Policy 3: Alumni Conversion */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: graduatedRoleAlumni ? '#faf5ff' : '#fff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}
                >
                  <input
                    type="checkbox"
                    id="graduatedRoleAlumni"
                    checked={graduatedRoleAlumni}
                    onChange={(e) => setGraduatedRoleAlumni(e.target.checked)}
                    style={{ width: '20px', height: '20px', marginTop: '4px', cursor: 'pointer' }}
                  />
                  <div>
                    <label
                      htmlFor="graduatedRoleAlumni"
                      style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', cursor: 'pointer' }}
                    >
                      Transition Graduated Students to Alumni Portal Role
                    </label>
                    <p style={{ color: '#475569', fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Sets user role to <code>ALUMNI</code> for learners marked as graduated, granting them access to alumni association services while preserving their historical grades.
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation footer */}
              <div
                style={{
                  marginTop: '32px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '20px'
                }}
              >
                <button onClick={() => setWizardStep(2)} className="portal-btn-secondary" style={{ padding: '10px 20px' }}>
                  <i className="fas fa-arrow-left mr-2" /> Back to Decisions
                </button>
                <button onClick={() => setWizardStep(4)} className="portal-btn-primary" style={{ padding: '10px 24px', fontWeight: 800 }}>
                  Review Final Summary <i className="fas fa-arrow-right ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & AUTHORIZE */}
          {wizardStep === 4 && (
            <div
              className="portal-card animate-in fade-in duration-300"
              style={{ padding: '32px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                  Step 4: Migration Pre-Flight Audit & Authorization
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                  Review the summary metrics before executing the atomic class migration transaction.
                </p>
              </div>

              {/* Summary Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginBottom: '28px'
                }}
              >
                <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Processed
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                    {summaryCounts.total}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Learners</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                    Promoting
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', margin: '4px 0' }}>
                    {summaryCounts.promoted}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#166534' }}>Advancing to next level</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
                    Repeating
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', margin: '4px 0' }}>
                    {summaryCounts.repeated}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Retained in grade</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Graduating
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#7e22ce', margin: '4px 0' }}>
                    {summaryCounts.graduated}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b21a8' }}>Converted to Alumni</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                    Fee Rollover
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8', margin: '4px 0' }}>
                    ${summaryCounts.feesToRollOver.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>Carried to opening ledger</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                    Beds to Vacate
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#334155', margin: '4px 0' }}>
                    {summaryCounts.boardersToVacate}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>Hostel allocations reset</div>
                </div>
              </div>

              {/* Zero Duplicate Notice */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <i className="fas fa-database" style={{ fontSize: '1.5rem', color: '#059669' }} />
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                    Zero-Duplicate In-Place Continuity
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    All updates occur directly on existing student profiles without duplicating records. Historical grades, medical records, and attendance histories remain permanently intact.
                  </div>
                </div>
              </div>

              {/* Authorization Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '20px'
                }}
              >
                <button onClick={() => setWizardStep(3)} className="portal-btn-secondary" style={{ padding: '10px 20px' }}>
                  <i className="fas fa-arrow-left mr-2" /> Back to Policies
                </button>
                <button
                  onClick={handleExecuteMigration}
                  disabled={loading}
                  className="portal-btn-primary"
                  style={{
                    background: '#059669',
                    padding: '12px 32px',
                    fontWeight: 900,
                    fontSize: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-double" />}
                  AUTHORIZE & EXECUTE CLASS MIGRATION
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: RECEIPT & MANIFEST */}
          {wizardStep === 5 && (
            <div
              className="portal-card animate-in fade-in duration-300"
              style={{ padding: '32px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <i className="fas fa-check" />
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
                  Migration Executed Successfully!
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                  All student transitions, ledger fee rollovers, and facility allocations have been updated in place.
                </p>
              </div>

              {/* Execution Summary Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '32px'
                }}
              >
                <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Total Processed</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                    {migrationReceipt?.summary?.total || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>Promoted</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d' }}>
                    {migrationReceipt?.summary?.promoted || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 700 }}>Repeated</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309' }}>
                    {migrationReceipt?.summary?.repeated || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: '#faf5ff', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: 700 }}>Graduated (Alumni)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#7e22ce' }}>
                    {migrationReceipt?.summary?.graduated || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>Fees Carried Forward</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1d4ed8' }}>
                    ${(migrationReceipt?.summary?.totalAmountCarriedOver || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>Beds Vacated</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#334155' }}>
                    {migrationReceipt?.summary?.boardingResetCount || 0}
                  </div>
                </div>
              </div>

              {/* Action manifest exports */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '28px'
                }}
              >
                <button onClick={handlePrint} className="portal-btn-neutral" style={{ padding: '10px 20px', fontWeight: 700 }}>
                  <i className="fas fa-print mr-2" /> Print Manifest / PDF
                </button>
                <button onClick={handleExportExcel} className="portal-btn-neutral" style={{ padding: '10px 20px', fontWeight: 700 }}>
                  <i className="fas fa-file-excel mr-2" /> Export Excel CSV
                </button>
                <button
                  onClick={handleResetWizard}
                  className="portal-btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 800 }}
                >
                  <i className="fas fa-redo mr-2" /> Start Another Migration
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BULK CLASS MAPPING */}
      {activeTab === 'mapping' && (
        <div className="portal-card animate-in fade-in duration-300">
          <div className="portal-card-header" style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Configure Class-to-Class Mapping</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
              Map current classes to their next year destinations to migrate all streams simultaneously.
            </p>
          </div>
          <div className="table-responsive">
            <PaginatedTable className="management-table">
              <thead>
                <tr>
                  <th>Source Class</th>
                  <th>Level</th>
                  <th>Students Enrolled</th>
                  <th>Destination Class</th>
                  <th>Target {getYearLabel(schoolType)}</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const mapping = bulkMappings[c.id] || { targetClassId: '', targetPart: 1 };
                  const studentCount = c._count?.students ?? 0;

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.name}</td>
                      <td style={{ fontWeight: 600, color: '#64748b' }}>{c.level}</td>
                      <td style={{ fontWeight: 700, color: studentCount > 0 ? '#059669' : '#64748b' }}>
                        {studentCount} {studentCount === 1 ? 'student' : 'students'}
                      </td>
                      <td>
                        <select
                          value={mapping.targetClassId}
                          onChange={(e) =>
                            setBulkMappings((prev) => ({
                              ...prev,
                              [c.id]: { ...prev[c.id], targetClassId: e.target.value }
                            }))
                          }
                          className="portal-input"
                          style={{ height: '40px', fontSize: '0.9rem', padding: '0 12px', width: '220px' }}
                        >
                          <option value="">-- Select Destination --</option>
                          {classes
                            .filter((tc) => tc.id !== c.id)
                            .map((tc) => (
                              <option key={tc.id} value={tc.id}>
                                {tc.name} ({tc.level})
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={mapping.targetPart}
                          onChange={(e) =>
                            setBulkMappings((prev) => ({
                              ...prev,
                              [c.id]: { ...prev[c.id], targetPart: parseInt(e.target.value) || 1 }
                            }))
                          }
                          className="portal-input"
                          style={{ height: '40px', fontSize: '0.9rem', padding: '0 12px', width: '100px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PaginatedTable>
          </div>
          <div
            className="portal-card-footer"
            style={{
              borderTop: '1px solid #edf2f7',
              padding: '20px 32px',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <button
              onClick={handleBulkMigrate}
              className="portal-btn-primary"
              style={{
                background: '#059669',
                padding: '0 32px',
                fontWeight: 900,
                height: '52px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              disabled={loading || Object.values(bulkMappings).every((m) => !m.targetClassId)}
            >
              {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-exchange-alt" />}
              EXECUTE BULK CLASS MAPPING
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
