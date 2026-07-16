import React from 'react';
import { createPortal } from 'react-dom';
import { BASE_URL } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface DetailField {
  label: string;
  value: any;
  type?: 'text' | 'image';
}

interface DetailSection {
  title: string;
  fields: DetailField[];
}

interface ManagementDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subTitle?: string;
  avatarText?: string;
  avatarUrl?: string; // If provided, used directly
  avatarFilename?: string; // If provided, used with backend URL
  schoolCode?: string; // Optional schoolCode for multi-tenant path
  sections: DetailSection[];
  role?: string;
  secondaryRoles?: string[];
  onEdit?: () => void;
  onResetPassword?: () => void;
  onViewFullProfile?: () => void;
}

const ManagementDetailPanel: React.FC<ManagementDetailPanelProps> = ({
  isOpen,
  onClose,
  title,
  subTitle,
  avatarText,
  avatarUrl,
  avatarFilename,
  sections,
  role,
  secondaryRoles = [],
  schoolCode: providedSchoolCode,
  onEdit,
  onResetPassword,
  onViewFullProfile
}) => {
  const { user } = useAuth();
  const schoolCode = providedSchoolCode || user?.schoolCode;
  const finalAvatarUrl = avatarUrl || (avatarFilename ? `${BASE_URL}/api/storage/media/${schoolCode}/images/${avatarFilename}` : null);

  return createPortal(
    <>
      <div 
        className={`detail-panel-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      <div className={`detail-panel ${isOpen ? 'open' : ''}`}>
        <div className="detail-header">
          <button className="close-panel" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
          <div className="dp-profile">
            <div className={`dp-avatar ${role?.toLowerCase().replace('_', '-')}`}>
              {finalAvatarUrl ? (
                <img src={finalAvatarUrl} alt={title} onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as any).parentElement.innerText = avatarText || title.charAt(0);
                }} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                avatarText || title.charAt(0)
              )}
            </div>
            <div className="dp-info">
              <h3>{title}</h3>
              <div className="role-badges-group">
                <span className={`role-badge role-${role?.toLowerCase().replace('_', '-')}`}>{role}</span>
                {secondaryRoles.map((sRole, idx) => (
                  <span key={idx} className="secondary-role-badge">{sRole}</span>
                ))}
              </div>
              <p className="dp-subtitle">{subTitle}</p>
            </div>
          </div>
        </div>
        <div className="detail-body">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="detail-section">
              <h4>{section.title}</h4>
              <div className="detail-grid">
                {section.fields.map((field, fIdx) => (
                  <div key={fIdx} className={`detail-row ${field.type === 'image' ? 'is-image' : ''}`}>
                    <span className="detail-label">{field.label}</span>
                    <span className="detail-value">
                      {field.type === 'image' && field.value ? (
                        <div className="detail-image-preview" onClick={() => {
                          const win = window.open();
                          win?.document.write(`<img src="${field.value}" style="max-width:100%; height:auto;" />`);
                        }}>
                           <img src={field.value} alt={field.label} style={{ maxWidth: 120, borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0' }} />
                           <div style={{ fontSize: '0.7rem', color: '#3182ce', textAlign: 'center', marginTop: 4 }}>
                              <i className="fas fa-search-plus"></i> View Full
                           </div>
                        </div>
                      ) : (
                        field.value || '—'
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="panel-actions">
             {onViewFullProfile && (
               <button className="btn btn-primary btn-block" onClick={onViewFullProfile} style={{ background: '#3182ce', color: 'white', marginBottom: 10 }}>
                 <i className="fas fa-user-circle"></i> View Full Profile
               </button>
             )}
             {onEdit && (
               <button className="btn btn-secondary btn-block" onClick={onEdit} style={{ marginBottom: 10 }}>
                 <i className="fas fa-edit"></i> Edit Basic Details
               </button>
             )}
             {onResetPassword && (
               <button className="btn btn-secondary btn-block" onClick={onResetPassword}>
                 <i className="fas fa-key"></i> Reset Password
               </button>
             )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ManagementDetailPanel;
