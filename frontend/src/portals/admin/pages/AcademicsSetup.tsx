import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSubjects from './Subjects';
import AdminClasses from './Classes';
import GradingSettingsPage from '../../shared/pages/GradingSettingsPage';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type SetupTab = 'subjects' | 'classes' | 'grading' | 'academic-year';

interface AcademicTerm {
  id: string;
  termName: string;
  startDate: string;
  endDate: string;
  midTermStart?: string;
  midTermEnd?: string;
  teachingWeeks: number;
  isActive: boolean;
  isLocked: boolean;
  examStartDate: string;
  examEndDate: string;
}

interface AcademicYearRecord {
  id: string;
  year: number;
  label: string;
  isCurrent: boolean;
  terms: AcademicTerm[];
}

function AcademicYearManager() {
  const { showToast, toastConfirm } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([
    {
      id: 'ay-2026',
      year: 2026,
      label: '2026 Academic Calendar',
      isCurrent: true,
      terms: [
        {
          id: 't1-2026',
          termName: 'Term 1 (Autumn)',
          startDate: '2026-01-13',
          endDate: '2026-04-10',
          midTermStart: '2026-02-20',
          midTermEnd: '2026-02-24',
          teachingWeeks: 13,
          isActive: true,
          isLocked: false,
          examStartDate: '2026-03-23',
          examEndDate: '2026-04-03'
        },
        {
          id: 't2-2026',
          termName: 'Term 2 (Winter)',
          startDate: '2026-05-05',
          endDate: '2026-08-07',
          midTermStart: '2026-06-19',
          midTermEnd: '2026-06-23',
          teachingWeeks: 14,
          isActive: false,
          isLocked: false,
          examStartDate: '2026-07-20',
          examEndDate: '2026-07-31'
        },
        {
          id: 't3-2026',
          termName: 'Term 3 (Spring / Exams)',
          startDate: '2026-09-08',
          endDate: '2026-12-04',
          midTermStart: '2026-10-16',
          midTermEnd: '2026-10-20',
          teachingWeeks: 13,
          isActive: false,
          isLocked: false,
          examStartDate: '2026-11-09',
          examEndDate: '2026-11-27'
        }
      ]
    },
    {
      id: 'ay-2025',
      year: 2025,
      label: '2025 Academic Calendar',
      isCurrent: false,
      terms: [
        {
          id: 't1-2025',
          termName: 'Term 1',
          startDate: '2025-01-14',
          endDate: '2025-04-11',
          teachingWeeks: 13,
          isActive: false,
          isLocked: true,
          examStartDate: '2025-03-24',
          examEndDate: '2025-04-04'
        },
        {
          id: 't2-2025',
          termName: 'Term 2',
          startDate: '2025-05-06',
          endDate: '2025-08-08',
          teachingWeeks: 14,
          isActive: false,
          isLocked: true,
          examStartDate: '2025-07-21',
          examEndDate: '2025-08-01'
        },
        {
          id: 't3-2025',
          termName: 'Term 3',
          startDate: '2025-09-09',
          endDate: '2025-12-05',
          teachingWeeks: 13,
          isActive: false,
          isLocked: true,
          examStartDate: '2025-11-10',
          examEndDate: '2025-11-28'
        }
      ]
    }
  ]);

  const [selectedYearId, setSelectedYearId] = useState('ay-2026');
  const [isEditingTerm, setIsEditingTerm] = useState<AcademicTerm | null>(null);

  const selectedYear = academicYears.find(y => y.id === selectedYearId) || academicYears[0];

  const handleSetActiveTerm = async (termId: string) => {
    setAcademicYears(prev =>
      prev.map(y => ({
        ...y,
        isCurrent: y.terms.some(t => t.id === termId),
        terms: y.terms.map(t => ({
          ...t,
          isActive: t.id === termId
        }))
      }))
    );
    showToast('Active institutional term updated across all portals!', 'success');
  };

  const handleToggleTermLock = async (termId: string, currentLock: boolean) => {
    const action = currentLock ? 'unlock' : 'lock';
    if (!(await toastConfirm(`Are you sure you want to ${action} this term? ${!currentLock ? 'Locking prevents retroactive marks entry and fee journal postings.' : 'Unlocking allows authorized edits.'}`))) {
      return;
    }

    setAcademicYears(prev =>
      prev.map(y => ({
        ...y,
        terms: y.terms.map(t => (t.id === termId ? { ...t, isLocked: !currentLock } : t))
      }))
    );
    showToast(`Term successfully ${currentLock ? 'unlocked' : 'locked'}!`, 'success');
  };

  const handleSaveTermDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingTerm) return;

    setAcademicYears(prev =>
      prev.map(y => ({
        ...y,
        terms: y.terms.map(t => (t.id === isEditingTerm.id ? isEditingTerm : t))
      }))
    );
    setIsEditingTerm(null);
    showToast('Term dates and calendar milestones saved successfully!', 'success');
  };

  return (
    <div>
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Select Calendar Year:</label>
          <select
            className="portal-input"
            value={selectedYearId}
            onChange={e => setSelectedYearId(e.target.value)}
            style={{ width: 220 }}
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>
                {y.label} {y.isCurrent ? '(Active Year)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => showToast('Syncing term calendars with Ministry of Primary and Secondary Education gazetted dates...', 'info')}
            style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
          >
            <i className="fas fa-sync-alt mr-1"></i> Verify Ministry Dates
          </button>
        </div>
      </div>

      {/* Terms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {selectedYear.terms.map(term => (
          <div
            key={term.id}
            className="portal-card"
            style={{
              background: '#fff',
              borderRadius: 8,
              border: term.isActive ? '2px solid #2563eb' : '1px solid #e2e8f0',
              padding: 20,
              position: 'relative'
            }}
          >
            {term.isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4
                }}
              >
                CURRENT ACTIVE TERM
              </span>
            )}

            <div style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>{term.termName}</h3>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{term.teachingWeeks} Scheduled Teaching Weeks</span>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div><strong>Term Duration:</strong> {term.startDate} &rarr; {term.endDate}</div>
              {term.midTermStart && (
                <div><strong>Mid-Term Break:</strong> {term.midTermStart} &rarr; {term.midTermEnd}</div>
              )}
              <div><strong>Final Examination:</strong> {term.examStartDate} &rarr; {term.examEndDate}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong>Status:</strong>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: term.isLocked ? '#fee2e2' : '#dcfce7',
                    color: term.isLocked ? '#dc2626' : '#15803d'
                  }}
                >
                  {term.isLocked ? 'LOCKED (Protected)' : 'OPEN FOR MARKS & BILLING'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              {!term.isActive && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSetActiveTerm(term.id)}
                  style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Set as Active
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditingTerm(term)}
                style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
              >
                <i className="fas fa-edit mr-1"></i> Edit Dates
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleToggleTermLock(term.id, term.isLocked)}
                style={{
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  background: term.isLocked ? '#fef3c7' : '#fee2e2',
                  color: term.isLocked ? '#b45309' : '#dc2626',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                title={term.isLocked ? 'Unlock term for modifications' : 'Lock term to freeze grades and financials'}
              >
                <i className={`fas fa-${term.isLocked ? 'unlock' : 'lock'}`}></i> {term.isLocked ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Term Dates Modal */}
      {isEditingTerm && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 520, background: '#fff', borderRadius: 8, padding: 24 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>Configure {isEditingTerm.termName}</h3>
              <button onClick={() => setIsEditingTerm(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveTermDates} style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Term Start Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    required
                    value={isEditingTerm.startDate}
                    onChange={e => setIsEditingTerm({ ...isEditingTerm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Term End Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    required
                    value={isEditingTerm.endDate}
                    onChange={e => setIsEditingTerm({ ...isEditingTerm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Exam Window Start</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={isEditingTerm.examStartDate}
                    onChange={e => setIsEditingTerm({ ...isEditingTerm, examStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Exam Window End</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={isEditingTerm.examEndDate}
                    onChange={e => setIsEditingTerm({ ...isEditingTerm, examEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Teaching Weeks Count</label>
                <input
                  type="number"
                  className="portal-input"
                  min="4"
                  max="20"
                  value={isEditingTerm.teachingWeeks}
                  onChange={e => setIsEditingTerm({ ...isEditingTerm, teachingWeeks: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setIsEditingTerm(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}>Save Milestones</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AcademicsSetup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as SetupTab) || 'subjects';

  const handleTabChange = (tab: SetupTab) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Academic Structure & Setup</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Configure institutional curricula: subject catalogue, classes and streams, grading benchmark scales, and calendar terms.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'subjects', label: 'Subjects Catalogue', icon: 'fas fa-book-open' },
          { id: 'classes', label: 'Classes & Sections', icon: 'fas fa-chalkboard' },
          { id: 'grading', label: 'Grading Scales', icon: 'fas fa-sliders-h' },
          { id: 'academic-year', label: 'Academic Years & Terms', icon: 'fas fa-calendar-alt' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as SetupTab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === t.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === t.id ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'subjects' && <AdminSubjects />}
        {activeTab === 'classes' && <AdminClasses />}
        {activeTab === 'grading' && <GradingSettingsPage />}
        {activeTab === 'academic-year' && <AcademicYearManager />}
      </div>
    </>
  );
}
