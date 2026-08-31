import React from 'react';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  setupStageLink?: {
    step: number;
    label?: string;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fas fa-inbox',
  title,
  description,
  actionLabel,
  onAction,
  setupStageLink
}) => {
  const navigate = useNavigate();

  return (
    <div className="portal-card portal-empty-card-center portal-empty-card-wrapper">
      <div className="portal-stat-icon blue portal-empty-icon-circle">
        <i className={icon}></i>
      </div>
      <h3 className="portal-empty-title">{title}</h3>
      <p className="portal-empty-description">{description}</p>
      
      <div className="portal-empty-actions-row">
        {actionLabel && onAction && (
          <button className="portal-btn-primary" onClick={onAction}>
            <i className="fas fa-plus portal-mr-6"></i>{actionLabel}
          </button>
        )}

        {setupStageLink && (
          <button 
            className="portal-btn-secondary" 
            onClick={() => navigate(`/admin/setup?step=${setupStageLink.step}`)}
          >
            <i className="fas fa-magic portal-mr-6"></i>
            {setupStageLink.label || `Configure in Setup Wizard (Step ${setupStageLink.step})`}
          </button>
        )}
      </div>
    </div>
  );
};
