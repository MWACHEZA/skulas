import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
  extra?: any;
}

export interface SearchableComboboxProps {
  options: ComboboxOption[];
  value?: string | string[];
  onChange: (value: any, selectedOption?: ComboboxOption | ComboboxOption[]) => void;
  isMulti?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  name?: string;
  id?: string;
  noOptionsMessage?: string;
  allowCustom?: boolean;
  onCustomAdd?: (val: string) => void;
  width?: string | number;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options = [],
  value,
  onChange,
  isMulti = false,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  label,
  disabled = false,
  loading = false,
  error,
  helperText,
  className = '',
  style = {},
  required = false,
  noOptionsMessage = 'No matching options found',
  allowCustom = false,
  onCustomAdd,
  width,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize selected values
  const selectedValues = useMemo<string[]>(() => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.map(v => String(v));
    return [String(value)].filter(v => v !== '');
  }, [value]);

  // Selected option objects
  const selectedOptions = useMemo<ComboboxOption[]>(() => {
    return selectedValues
      .map(val => options.find(opt => opt.value === val) || { value: val, label: val })
      .filter(Boolean);
  }, [selectedValues, options]);

  // Filter options based on query and multi-select exclusion
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(opt => {
      // For multi-select, hide already selected items from dropdown
      if (isMulti && selectedValues.includes(opt.value)) {
        return false;
      }
      if (!q) return true;
      const labelMatch = opt.label.toLowerCase().includes(q);
      const subLabelMatch = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const badgeMatch = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return labelMatch || subLabelMatch || badgeMatch;
    });
  }, [options, query, isMulti, selectedValues]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions]);

  const handleSelectOption = useCallback(
    (opt: ComboboxOption) => {
      if (opt.disabled) return;
      if (isMulti) {
        const nextValues = [...selectedValues, opt.value];
        const nextOptions = [...selectedOptions, opt];
        onChange(nextValues, nextOptions);
        setQuery('');
      } else {
        onChange(opt.value, opt);
        setIsOpen(false);
        setQuery('');
      }
    },
    [isMulti, selectedValues, selectedOptions, onChange]
  );

  const handleRemoveOption = useCallback(
    (valToRemove: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (isMulti) {
        const nextValues = selectedValues.filter(v => v !== valToRemove);
        const nextOptions = selectedOptions.filter(o => o.value !== valToRemove);
        onChange(nextValues, nextOptions);
      } else {
        onChange('', undefined);
      }
    },
    [isMulti, selectedValues, selectedOptions, onChange]
  );

  const handleClearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(isMulti ? [] : '', isMulti ? [] : undefined);
      setQuery('');
    },
    [isMulti, onChange]
  );

  const handleAddCustom = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onCustomAdd) {
      onCustomAdd(trimmed);
    }
    const customOpt: ComboboxOption = { value: trimmed, label: trimmed };
    handleSelectOption(customOpt);
  }, [query, onCustomAdd, handleSelectOption]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (isOpen && allowCustom && query.trim()) {
        handleAddCustom();
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Backspace' && isMulti && !query && selectedValues.length > 0) {
      // Remove last tag if search input is empty
      const lastVal = selectedValues[selectedValues.length - 1];
      handleRemoveOption(lastVal);
    }
  };

  // Badge default color mapping
  const getBadgeStyle = (badge: string, customColor?: string) => {
    if (customColor) return { backgroundColor: `${customColor}15`, color: customColor };
    const b = badge.toLowerCase();
    if (b.includes('student')) return { backgroundColor: '#e0f2fe', color: '#0369a1' };
    if (b.includes('staff') || b.includes('teacher')) return { backgroundColor: '#fef3c7', color: '#b45309' };
    if (b.includes('parent')) return { backgroundColor: '#f3e8ff', color: '#7e22ce' };
    if (b.includes('admin') || b.includes('bursar')) return { backgroundColor: '#fee2e2', color: '#b91c1c' };
    if (b.includes('supplier')) return { backgroundColor: '#dcfce7', color: '#15803d' };
    return { backgroundColor: '#f1f5f9', color: '#475569' };
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-combobox-root ${className}`}
      style={{
        position: 'relative',
        width: width || '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* Main Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        style={{
          minHeight: '40px',
          padding: '4px 8px',
          borderRadius: '8px',
          border: error ? '1px solid #ef4444' : isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Multi-select Pills */}
        {isMulti &&
          selectedOptions.map(opt => (
            <span
              key={opt.value}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: '1px solid #bfdbfe',
              }}
            >
              <span>{opt.label}</span>
              {opt.badge && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    ...getBadgeStyle(opt.badge, opt.badgeColor),
                  }}
                >
                  {opt.badge}
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={e => handleRemoveOption(opt.value, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    color: '#60a5fa',
                    fontWeight: 'bold',
                    lineHeight: 1,
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </span>
          ))}

        {/* Single-select Active Label */}
        {!isMulti && selectedOptions.length > 0 && !isOpen && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingLeft: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
              {selectedOptions[0].label}
            </span>
            {selectedOptions[0].badge && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  ...getBadgeStyle(selectedOptions[0].badge, selectedOptions[0].badgeColor),
                }}
              >
                {selectedOptions[0].badge}
              </span>
            )}
            {selectedOptions[0].subLabel && (
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                ({selectedOptions[0].subLabel})
              </span>
            )}
          </div>
        )}

        {/* Search Input (embedded when open or when nothing selected) */}
        {(isOpen || (isMulti && selectedOptions.length === 0) || (!isMulti && selectedOptions.length === 0)) && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={
              isMulti
                ? selectedOptions.length > 0
                  ? searchPlaceholder
                  : placeholder
                : selectedOptions.length > 0
                ? selectedOptions[0].label
                : placeholder
            }
            onChange={e => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              minWidth: '120px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.875rem',
              color: '#1e293b',
              padding: '2px 4px',
            }}
          />
        )}

        {/* Right side controls: spinner, clear, chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          {loading && (
            <i
              className="fas fa-spinner fa-spin"
              style={{ color: '#2563eb', fontSize: '0.85rem' }}
            />
          )}

          {selectedOptions.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear selection"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ✕
            </button>
          )}

          <span
            style={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
              pointerEvents: 'none',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = selectedValues.includes(opt.value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={opt.value}
                  onClick={e => {
                    e.stopPropagation();
                    handleSelectOption(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.5 : 1,
                    backgroundColor: isHighlighted
                      ? '#f1f5f9'
                      : isSelected
                      ? '#eff6ff'
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#1d4ed8' : '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            ...getBadgeStyle(opt.badge, opt.badgeColor),
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.subLabel && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.subLabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <i className="fas fa-check" style={{ color: '#2563eb', fontSize: '0.8rem' }} />
                  )}
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '12px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.85rem',
              }}
            >
              {noOptionsMessage}
              {allowCustom && query.trim() && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Use &ldquo;{query.trim()}&rdquo;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helper text or Error message */}
      {(error || helperText) && (
        <span
          style={{
            fontSize: '0.75rem',
            marginTop: '4px',
            color: error ? '#ef4444' : '#64748b',
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
};

export default SearchableCombobox;
