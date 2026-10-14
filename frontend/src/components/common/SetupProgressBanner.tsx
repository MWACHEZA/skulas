import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetup } from '../../hooks/useSetup';

export const SetupProgressBanner: React.FC = () => {
  const { setupStatus, loading } = useSetup();
  const navigate = useNavigate();

  if (loading || !setupStatus || setupStatus.isComplete) {
    return null;
  }

  const { progressPercentage, activeStages, completedStages, currentStep } = setupStatus;
  const completedCount = activeStages.filter(st => completedStages[st]).length;
  const totalCount = activeStages.length;

  return (
    <div 
      className="portal-setup-banner-card"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)',
        borderRadius: 16,
        padding: '22px 26px',
        marginBottom: 24,
        color: '#ffffff',
        border: '1px solid #334155',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35), 0 8px 10px -6px rgba(15, 23, 42, 0.25)'
      }}
    >
      <div 
        className="portal-setup-banner-content"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div className="portal-setup-banner-info" style={{ flex: 1, minWidth: 280 }}>
          <div 
            className="portal-setup-banner-badge-row"
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
          >
            <span 
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '3px 10px',
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}
            >
              SETUP IN PROGRESS ({completedCount}/{totalCount})
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
              {progressPercentage}% Completed
            </span>
          </div>

          <h2 
            className="portal-setup-banner-title"
            style={{
              margin: '0 0 6px 0',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#ffffff'
            }}
          >
            Complete School &amp; Module Onboarding Setup
          </h2>

          <p 
            className="portal-setup-banner-desc"
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#cbd5e1',
              maxWidth: 620,
              lineHeight: 1.5
            }}
          >
            Configure your institutional branding, Chart of Accounts, academic structure, and module settings for smooth operations.
          </p>

          {/* Progress Bar */}
          <div 
            style={{
              marginTop: 14,
              width: '100%',
              maxWidth: 450,
              height: 8,
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                borderRadius: 4,
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
        </div>

        <div 
          className="portal-setup-banner-actions"
          style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <button 
            className="portal-btn-primary portal-setup-banner-btn-resume" 
            onClick={() => navigate(`/admin/setup?step=${currentStep}`)}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'transform 0.15s ease, background 0.15s ease'
            }}
          >
            <i className="fas fa-magic"></i>
            Resume Setup (Step {currentStep})
          </button>

          <button 
            className="portal-btn-secondary portal-setup-banner-btn-checklist" 
            onClick={() => navigate('/admin/setup')}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.15s ease'
            }}
          >
            <i className="fas fa-list-check"></i>
            View Checklist
          </button>
        </div>
      </div>
    </div>
  );
};
