import React from 'react';

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterFieldConfig {
  key: string;
  label: string;
  type?: 'select' | 'text' | 'checkbox';
  options?: FilterOption[];
  placeholder?: string;
  value?: any;
  onChange?: (val: any) => void;
  width?: string;
}

export interface FilterBarProps {
  title?: string;
  activeCount?: number;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  fields?: FilterFieldConfig[];
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  title = 'Refine Filters',
  activeCount = 0,
  hasActiveFilters = false,
  onReset,
  fields,
  children,
  actions,
  className = '',
  style = {},
}) => {
  const showReset = hasActiveFilters || activeCount > 0;

  return (
    <div
      className={className}
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '14px 16px',
        marginBottom: '16px',
        ...style,
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-filter" style={{ color: '#2563eb' }} />
            {title}
          </span>

          {activeCount > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '2px 8px',
              }}
            >
              {activeCount} active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {showReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              style={{
                border: 'none',
                background: 'none',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <i className="fas fa-undo" /> Reset Filters
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Filter Items */}
      {fields && fields.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
          }}
        >
          {fields.map(field => {
            if (field.type === 'checkbox') {
              return (
                <div
                  key={field.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '20px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: field.value ? '#2563eb' : '#475569',
                      background: field.value ? '#eff6ff' : '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: field.value ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(field.value)}
                      onChange={e => field.onChange && field.onChange(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    {field.label}
                  </label>
                </div>
              );
            }

            return (
              <div key={field.key} style={{ minWidth: field.width || 'auto' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '4px',
                  }}
                >
                  {field.label}
                </label>
                {field.type === 'text' ? (
                  <input
                    type="text"
                    className="portal-input"
                    placeholder={field.placeholder || `Filter by ${field.label}`}
                    value={field.value || ''}
                    onChange={e => field.onChange && field.onChange(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                ) : (
                  <select
                    className="portal-input"
                    value={field.value || ''}
                    onChange={e => field.onChange && field.onChange(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%' }}
                  >
                    <option value="">{field.placeholder || `All ${field.label}`}</option>
                    {field.options?.map(opt => (
                      <option key={String(opt.value)} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default FilterBar;
