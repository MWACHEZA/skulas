import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({ 
  icon = 'fas fa-inbox', 
  title, 
  description, 
  actionText, 
  onAction 
}: EmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '64px 24px',
      background: '#f8fafc',
      borderRadius: '20px',
      border: '2px dashed #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#e0e7ff',
        color: '#4f46e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        marginBottom: '8px'
      }}>
        <i className={icon}></i>
      </div>
      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: '#64748b', maxWidth: '400px', lineHeight: '1.5', fontWeight: 500 }}>
        {description}
      </p>
      {actionText && onAction && (
        <button 
          className="portal-btn-primary" 
          onClick={onAction}
          style={{ marginTop: '16px' }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
