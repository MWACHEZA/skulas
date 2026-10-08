import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoleTutorial } from '../../../tutorials/types';

interface TutorialChecklistProps {
  tutorial: RoleTutorial;
  completedStepIds: string[];
  onStartStep: (stepId: string) => void;
  onDismissForever: () => void;
}

export const TutorialChecklist: React.FC<TutorialChecklistProps> = ({
  tutorial,
  completedStepIds,
  onStartStep,
  onDismissForever
}) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const totalSteps = tutorial.steps.length;
  const completedCount = tutorial.steps.filter(s => completedStepIds.includes(s.id)).length;
  const isAllComplete = completedCount === totalSteps;

  if (isAllComplete) return null;

  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <aside 
      aria-label="Getting Started Tutorial"
      aria-live="polite"
      style={{
        background: '#ffffff',
        border: '1.5px solid #3b82f6',
        borderRadius: 14,
        padding: collapsed ? '12px 18px' : '20px 24px',
        marginBottom: 24,
        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.12)',
        position: 'relative',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem'
          }}>
            <i className="fas fa-compass" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              {tutorial.welcomeTitle}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Progress: {completedCount} of {totalSteps} tasks completed ({progressPct}%)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="portal-btn-ghost"
            onClick={() => setCollapsed(!collapsed)}
            style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#64748b' }}
            title={collapsed ? 'Expand checklist' : 'Minimize checklist'}
          >
            <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'}`} />
          </button>
          <button
            type="button"
            className="portal-btn-ghost"
            onClick={onDismissForever}
            style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}
            title="Never show this tutorial again"
          >
            Dismiss forever
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
        <div style={{ width: `${progressPct}%`, height: '100%', background: '#3b82f6', transition: 'width 0.4s ease' }} />
      </div>

      {/* Step Items List */}
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {tutorial.steps.map((step, idx) => {
            const isDone = completedStepIds.includes(step.id);
            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isDone ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${isDone ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: 10,
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isDone ? '#16a34a' : '#cbd5e1',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {isDone ? <i className="fas fa-check" /> : idx + 1}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: isDone ? '#15803d' : '#1e293b',
                      textDecoration: isDone ? 'line-through' : 'none'
                    }}>
                      {step.title}
                    </div>
                    {step.description && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>

                {!isDone && (
                  <button
                    type="button"
                    className="portal-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800 }}
                    onClick={() => {
                      onStartStep(step.id);
                      navigate(step.route);
                    }}
                  >
                    Go <i className="fas fa-arrow-right" style={{ marginLeft: 4 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};

export default TutorialChecklist;
