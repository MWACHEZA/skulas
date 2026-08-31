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
    <div className="portal-card portal-setup-banner-card">
      <div className="portal-setup-banner-content">
        <div className="portal-setup-banner-info">
          <div className="portal-setup-banner-badge-row">
            <span className="portal-badge warning portal-setup-banner-badge">
              SETUP IN PROGRESS ({completedCount}/{totalCount})
            </span>
            <span className="portal-setup-banner-percentage">
              {progressPercentage}% Completed
            </span>
          </div>
          <h2 className="portal-setup-banner-title">
            Complete School & Module Onboarding Setup
          </h2>
          <p className="portal-setup-banner-desc">
            Configure your institutional branding, Chart of Accounts, academic structure, and module settings for smooth operations.
          </p>

          {/* Progress Bar */}
          <progress 
            className="portal-setup-banner-progress" 
            value={progressPercentage} 
            max={100}
            title="Setup completion percentage"
            aria-label="Setup completion percentage"
          />
        </div>

        <div className="portal-setup-banner-actions">
          <button 
            className="portal-btn-primary portal-setup-banner-btn-resume" 
            onClick={() => navigate(`/admin/setup?step=${currentStep}`)}
          >
            <i className="fas fa-magic portal-mr-6"></i>Resume Setup (Step {currentStep})
          </button>

          <button 
            className="portal-btn-secondary portal-setup-banner-btn-checklist" 
            onClick={() => navigate('/admin/setup')}
          >
            <i className="fas fa-list-check portal-mr-6"></i>View Checklist
          </button>
        </div>
      </div>
    </div>
  );
};
