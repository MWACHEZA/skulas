import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetup } from '../../hooks/useSetup';

export const RoleOrientationModal: React.FC = () => {
  const { roleOrientation, dismissRoleOrientation } = useSetup();
  const navigate = useNavigate();

  if (!roleOrientation || roleOrientation.dismissed) {
    return null;
  }

  return (
    <div className="portal-card portal-role-orientation-card">
      <div className="portal-role-orientation-header">
        <div className="portal-role-orientation-body">
          <div className="portal-role-orientation-icon-box">
            <i className={roleOrientation.icon}></i>
          </div>
          <div>
            <h3 className="portal-role-orientation-title">
              {roleOrientation.title}
            </h3>
            <p className="portal-role-orientation-desc">
              {roleOrientation.description}
            </p>
          </div>
        </div>

        <button 
          className="portal-btn-ghost portal-role-orientation-dismiss-btn" 
          onClick={dismissRoleOrientation}
          title="Dismiss orientation"
          aria-label="Dismiss orientation"
        >
          &times;
        </button>
      </div>

      <div className="portal-role-orientation-actions-row">
        {roleOrientation.actions.map((act, idx) => (
          <button 
            key={idx} 
            className="portal-btn-primary portal-btn-sm-compact" 
            onClick={() => navigate(act.link)}
          >
            <i className="fas fa-arrow-right portal-mr-6"></i>{act.label}
          </button>
        ))}
        <button 
          className="portal-btn-secondary portal-btn-sm-compact" 
          onClick={dismissRoleOrientation}
        >
          Got it, dismiss
        </button>
      </div>
    </div>
  );
};
