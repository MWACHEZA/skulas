import React from 'react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  onClear?: () => void;
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search records...',
  loading = false,
  onClear,
  width,
  className = '',
  style = {},
  autoFocus = false,
}) => {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: width || '100%',
        minWidth: '240px',
        ...style,
      }}
      className={className}
    >
      <input
        type="text"
        className="portal-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          paddingLeft: '38px',
          paddingRight: value ? '34px' : '14px',
          height: '40px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '0.875rem',
          color: '#1e293b',
          backgroundColor: '#ffffff',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {loading ? (
          <i className="fas fa-spinner fa-spin" style={{ color: '#2563eb', fontSize: '0.9rem' }} />
        ) : (
          <i className="fas fa-search" style={{ fontSize: '0.9rem' }} />
        )}
      </div>

      {value && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear search"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchInput;
