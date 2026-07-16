import React from 'react';
import { useTerminology } from '../../../hooks/useTerminology';

interface ReportFilterBarProps {
  filters: { term: string; year: string };
  setFilters: (f: any) => void;
  onRefresh?: () => void;
  title?: string;
  showTerm?: boolean;
}

export default function ReportFilterBar({ filters, setFilters, onRefresh, title, showTerm = true }: ReportFilterBarProps) {
  const { t, isPoly } = useTerminology();
  
  // Generate dynamic years: Current Year +/- 5 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());

  const terms = isPoly 
    ? [`${t('term')} 1`, `${t('term')} 2`] 
    : ['Term 1', 'Term 2', 'Term 3'];

  return (
    <div className="portal-card" style={{ marginBottom: 20 }}>
      <div className="portal-card-body" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {title && <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#2d3748' }}>{title}</h2>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#718096' }}>Academic Year:</label>
            <select 
              className="portal-input" 
              style={{ width: 120, padding: '6px 10px' }}
              value={filters.year}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, year: e.target.value }))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {showTerm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#718096' }}>{t('term')}:</label>
              <select 
                className="portal-input" 
                style={{ width: 120, padding: '6px 10px' }}
                value={filters.term}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, term: e.target.value }))}
              >
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {onRefresh && (
          <button 
            className="portal-btn-primary" 
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            onClick={onRefresh}
          >
            <i className="fas fa-sync-alt" style={{ marginRight: 8 }}></i>Update View
          </button>
        )}
      </div>
    </div>
  );
}
