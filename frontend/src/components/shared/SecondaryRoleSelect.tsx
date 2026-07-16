import React, { useState, useRef, useEffect } from 'react';
import { ROLE_GROUPS } from '../../constants/roles';

// ── Which groups belong to which user type ──────────────────────────────────
const STUDENT_GROUPS = ['PREFECTSHIP', 'RELIGION', 'STUDENT_LIBRARY', 'HOUSE', 'DINING', 'SPORTS', 'AGRI_ACADEMIC'];
const ANCILLARY_GROUPS = ['TUCKSHOP', 'BOARDING', 'SECURITY', 'KITCHEN', 'IT', 'TRANSPORT', 'SPORTS', 'MAINTENANCE', 'ADMIN_FINANCE', 'LIBRARY_MGMT', 'FARM_MGT'];
const TEACHER_GROUPS  = ['HOUSE', 'RELIGION', 'SPORTS', 'AGRI_ACADEMIC', 'ADMIN_FINANCE', 'DINING', 'LIBRARY_MGMT'];
const ALL_GROUPS      = Object.keys(ROLE_GROUPS);

// Group colours
const GROUP_COLORS: Record<string, string> = {
  TUCKSHOP: '#e07b00', BOARDING: '#6b46c1', SECURITY: '#c53030', KITCHEN: '#276749',
  IT: '#2b6cb0',       TRANSPORT: '#2c7a7b', SPORTS: '#b7791f',  MAINTENANCE: '#975a16',
  ADMIN_FINANCE: '#285e61', DINING: '#702459', HOUSE: '#44337a', PREFECTSHIP: '#2a4365',
  RELIGION: '#553c9a', LIBRARY: '#234e52',    AGRICULTURE: '#276749',
};

interface SecondaryRoleSelectProps {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
  maxRoles?: number;
  disabled?: boolean;
  primaryRole?: string; // 'STUDENT' | 'ANCILLARY' | 'TEACHER' | etc.
}

export default function SecondaryRoleSelect({
  selectedRoles,
  onChange,
  maxRoles = 4,
  disabled = false,
  primaryRole = '',
}: SecondaryRoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role = primaryRole.toUpperCase();
  const allowedGroupKeys =
    role === 'STUDENT'    ? STUDENT_GROUPS   :
    (role === 'ANCILLARY' || role === 'STAFF' || role === 'SCHOOL_ADMIN') ? ANCILLARY_GROUPS :
    role === 'TEACHER'    ? TEACHER_GROUPS   :
    ALL_GROUPS;

  // Build visible groups, filtered by search
  const visibleGroups = allowedGroupKeys
    .filter(key => ROLE_GROUPS[key as keyof typeof ROLE_GROUPS])
    .map(key => {
      const groupRoles = ROLE_GROUPS[key as keyof typeof ROLE_GROUPS].filter(r =>
        r.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { key, label: key.replace('_', ' '), roles: groupRoles };
    })
    .filter(g => g.roles.length > 0);

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter(r => r !== role));
    } else {
      if (selectedRoles.length >= maxRoles) return;
      onChange([...selectedRoles, role]);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        style={{
          minHeight: 42, padding: '8px 12px', background: 'white',
          border: '1.5px solid #e2e8f0', borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {selectedRoles.length === 0 ? (
          <span style={{ color: '#a0aec0', fontSize: '0.9rem' }}>Assign secondary roles...</span>
        ) : (
          selectedRoles.map(r => {
            const groupKey = Object.keys(ROLE_GROUPS).find(k => ROLE_GROUPS[k as keyof typeof ROLE_GROUPS].includes(r));
            const color = groupKey ? GROUP_COLORS[groupKey] || '#0056b3' : '#0056b3';
            return (
              <span
                key={r}
                style={{
                  background: `${color}18`, color, border: `1px solid ${color}40`,
                  padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {r}
                {!disabled && (
                  <i
                    className="fas fa-times"
                    onClick={e => { e.stopPropagation(); toggleRole(r); }}
                    style={{ cursor: 'pointer', fontSize: '0.6rem', opacity: 0.7 }}
                  />
                )}
              </span>
            );
          })
        )}
        <i
          className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
          style={{ marginLeft: 'auto', color: '#a0aec0', fontSize: '0.75rem' }}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          role="listbox"
          style={{
          position: 'absolute', top: '110%', left: 0, right: 0, background: 'white',
          border: '1.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
          zIndex: 9999, maxHeight: 320, overflowY: 'auto', padding: 8,
        }}>
          {/* Search */}
          <div style={{ position: 'sticky', top: -8, background: 'white', padding: '12px 10px 8px', marginBottom: 8, borderBottom: '1px solid #f1f5f9', zIndex: 10 }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: 10, color: '#a0aec0', fontSize: '0.8rem' }}></i>
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', border: '1.5px solid #e2e8f0',
                  borderRadius: 8, fontSize: '0.85rem', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--portal-primary)'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: 6, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>SELECT UP TO {maxRoles} ROLES</span>
              <span>{selectedRoles.length}/{maxRoles} SELECTED</span>
            </div>
          </div>

          {/* Grouped options */}
          {visibleGroups.map(group => (
            <div key={group.key} style={{ marginBottom: 6 }}>
              <div style={{
                padding: '12px 10px 6px', fontSize: '0.7rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '1.2px',
                color: GROUP_COLORS[group.key] || '#718096',
                display: 'flex', alignItems: 'center', gap: 8,
                background: `${GROUP_COLORS[group.key]}05`,
                borderRadius: '6px 6px 0 0',
              }}>
                <div style={{ width: 4, height: 14, borderRadius: 2, background: GROUP_COLORS[group.key] || '#e2e8f0' }}></div>
                {group.label}
              </div>
              {group.roles.map(role => {
                const isSelected = selectedRoles.includes(role);
                const atMax = selectedRoles.length >= maxRoles;
                return (
                  <div
                    key={role}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => { if (!atMax || isSelected) toggleRole(role); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!atMax || isSelected) toggleRole(role);
                      }
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: 7, cursor: (atMax && !isSelected) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: isSelected ? `${GROUP_COLORS[group.key]}12` : 'transparent',
                      opacity: (atMax && !isSelected) ? 0.4 : 1,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => !atMax && !isSelected && ((e.currentTarget as HTMLDivElement).style.background = '#f7fafc')}
                    onMouseLeave={e => !isSelected && ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isSelected ? GROUP_COLORS[group.key] || '#0056b3' : '#cbd5e0'}`,
                      background: isSelected ? (GROUP_COLORS[group.key] || '#0056b3') : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <i className="fas fa-check" style={{ fontSize: '0.55rem', color: 'white' }} />}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#2d3748' }}>{role}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {visibleGroups.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#a0aec0', fontSize: '0.85rem' }}>
              No matching roles found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
