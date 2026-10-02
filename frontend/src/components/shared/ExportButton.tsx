import React, { useState, useRef, useEffect } from 'react';
import { exportData, type ExportColumn, type ExportOptions } from '../../utils/exportService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../context/ToastContext';

export interface ExportButtonProps<T = any> {
  filename?: string;
  title?: string;
  subtitle?: string;
  schoolName?: string;
  columns?: ExportColumn<T>[];
  data?: T[];
  orientation?: 'portrait' | 'landscape';
  metadata?: Record<string, string>;
  visibleFormats?: ('excel' | 'word' | 'pdf' | 'csv')[];
  defaultFormat?: 'excel' | 'word' | 'pdf' | 'csv';
  onExport?: (format: 'excel' | 'word' | 'pdf' | 'csv') => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  buttonLabel?: string;
  align?: 'left' | 'right';
}

export const ExportButton = <T extends any = any>({
  filename = 'export',
  title = 'Data Export',
  subtitle,
  schoolName,
  columns = [],
  data = [],
  orientation,
  metadata,
  visibleFormats,
  defaultFormat: _defaultFormat,
  onExport,
  disabled = false,
  className = '',
  style = {},
  buttonLabel = 'Export',
  align = 'right',
}: ExportButtonProps<T>) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'word' | 'pdf' | 'csv' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const effectiveSchoolName = schoolName || user?.schoolName || user?.school?.name || (user as any)?.tenantName || 'ACADEX SIS';

  const handleExport = async (format: 'excel' | 'word' | 'pdf' | 'csv') => {
    setExportingFormat(format);
    setIsOpen(false);

    try {
      if (onExport) {
        await onExport(format);
      } else {
        const options: ExportOptions<T> = {
          filename,
          title,
          subtitle,
          schoolName: effectiveSchoolName,
          columns,
          data,
          orientation,
          metadata: {
            ...(metadata || {}),
            'School / Tenant': effectiveSchoolName,
            'User / Operator': user?.name || user?.email || 'Authorized User',
          },
        };
        await exportData(format, options);
      }
    } catch (err) {
      console.error(`Export failed for format ${format}:`, err);
      toast.error(`Failed to export document as ${format.toUpperCase()}. Please check browser permissions and try again.`);
    } finally {
      setExportingFormat(null);
    }
  };

  const isExporting = exportingFormat !== null;
  const formatsToShow = visibleFormats ?? ['excel', 'word', 'pdf'];

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block', ...style }}
      className={className}
    >
      <button
        type="button"
        disabled={disabled || isExporting || (!onExport && (!data || data.length === 0))}
        onClick={() => setIsOpen(prev => !prev)}
        className="portal-btn-secondary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '40px',
          padding: '0 16px',
          fontSize: '0.875rem',
          fontWeight: 600,
          borderRadius: '8px',
          cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
          opacity: disabled || (!onExport && (!data || data.length === 0)) ? 0.6 : 1,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#334155',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
        title={!onExport && (!data || data.length === 0) ? 'No records to export' : 'Export current records in 3 formats'}
      >
        {isExporting ? (
          <>
            <i className="fas fa-spinner fa-spin" style={{ color: '#2563eb' }} />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <i className="fas fa-file-export" style={{ color: '#64748b' }} />
            <span>{buttonLabel}</span>
            <i
              className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '2px' }}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 9999,
            minWidth: '220px',
            background: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            padding: '6px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              padding: '6px 10px 4px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Export Options ({data?.length || 0} rows)
          </div>

          {/* Excel Option */}
          {formatsToShow.includes('excel') && (
          <button
            type="button"
            onClick={() => handleExport('excel')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1e293b',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              <i className="fas fa-file-excel" />
            </div>
            <div>
              <div style={{ lineHeight: '1.2' }}>Excel Spreadsheet</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>.xlsx workbook format</div>
            </div>
          </button>
          )}

          {/* Word Option */}
          {formatsToShow.includes('word') && (
          <button
            type="button"
            onClick={() => handleExport('word')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1e293b',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#dbeafe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              <i className="fas fa-file-word" />
            </div>
            <div>
              <div style={{ lineHeight: '1.2' }}>Word Document</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>.docx styled document</div>
            </div>
          </button>
          )}

          {/* PDF Option */}
          {formatsToShow.includes('pdf') && (
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1e293b',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              <i className="fas fa-file-pdf" />
            </div>
            <div>
              <div style={{ lineHeight: '1.2' }}>PDF Document</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>.pdf printable document</div>
            </div>
          </button>
          )}
          
          {/* CSV Option */}
          {formatsToShow.includes('csv') && (
          <button type="button" onClick={() => handleExport('csv')}
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', transition: 'background 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fef9c3', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
              <i className="fas fa-file-csv" />
            </div>
            <div>
              <div style={{ lineHeight: '1.2' }}>CSV Spreadsheet</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>.csv comma-separated</div>
            </div>
          </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
