import React from 'react';

interface ViewingAsToggleProps {
  actingAs: string;
  onSwitch?: () => void; // if user has both primary and secondary view
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function ViewingAsToggle({ actingAs, onSwitch, primaryLabel = 'My View', secondaryLabel }: ViewingAsToggleProps) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
      <i className="fas fa-user-tag" />
      <span>Acting as: {secondaryLabel || actingAs.replace(/_/g, ' ')}</span>
      {onSwitch && (
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontSize: '0.75rem', padding: '0 4px' }}>
          Switch to {primaryLabel}
        </button>
      )}
    </div>
  );
}
