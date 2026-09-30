import { useState, useEffect, useMemo, useCallback } from 'react';

export interface FilterConfig<T> {
  key: string;
  predicate?: (item: T, filterValue: any) => boolean;
}

export interface UseSearchFilterOptions<T> {
  data?: T[];
  searchFields?: (keyof T | ((item: T) => string | number | null | undefined))[];
  initialSearch?: string;
  initialFilters?: Record<string, any>;
  debounceMs?: number;
  filterConfigs?: FilterConfig<T>[];
  serverSearch?: boolean; // if true, client doesn't filter items, only returns debouncedQuery
}

export interface UseSearchFilterReturn<T> {
  // Search
  searchInput: string;
  setSearchInput: (value: string) => void;
  debouncedSearch: string;
  isDebouncing: boolean;
  clearSearch: () => void;

  // Filters
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  resetFilters: () => void;
  activeFiltersCount: number;
  hasActiveFilters: boolean;

  // Filtered data (client-side)
  filteredData: T[];
  totalResults: number;
}

/**
 * Universal search and filter hook for ACADEX.
 * Provides 300ms debounced search, multi-field case-insensitive partial match,
 * and combinable multi-criterion filters.
 */
export function useSearchFilter<T = any>({
  data = [],
  searchFields = [],
  initialSearch = '',
  initialFilters = {},
  debounceMs = 300,
  filterConfigs = [],
  serverSearch = false,
}: UseSearchFilterOptions<T>): UseSearchFilterReturn<T> {
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);

  // 300ms debounce effect
  useEffect(() => {
    if (searchInput !== debouncedSearch) {
      setIsDebouncing(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setIsDebouncing(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchInput, debounceMs]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setIsDebouncing(false);
  }, []);

  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    clearSearch();
    const cleared: Record<string, any> = {};
    Object.keys(filters).forEach(k => {
      cleared[k] = '';
    });
    setFilters(cleared);
  }, [clearSearch, filters]);

  // Count active filters (non-empty strings, non-null, booleans that are true)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchInput.trim()) count++;
    Object.values(filters).forEach(val => {
      if (val !== undefined && val !== null && val !== '' && val !== false && val !== 'ALL') {
        count++;
      }
    });
    return count;
  }, [searchInput, filters]);

  const hasActiveFilters = activeFiltersCount > 0;

  // Filter items matching search and all active filters
  const filteredData = useMemo(() => {
    if (serverSearch) {
      return data;
    }

    const query = debouncedSearch.trim().toLowerCase();

    return data.filter((item, idx) => {
      // 1. Multi-field partial search match
      if (query && searchFields.length > 0) {
        const matchesQuery = searchFields.some(field => {
          let fieldVal: any;
          if (typeof field === 'function') {
            fieldVal = field(item);
          } else if (item && typeof item === 'object') {
            fieldVal = (item as any)[field];
          }
          if (fieldVal === null || fieldVal === undefined) return false;
          return String(fieldVal).toLowerCase().includes(query);
        });

        if (!matchesQuery) return false;
      }

      // 2. Custom filter configurations
      for (const config of filterConfigs) {
        const filterVal = filters[config.key];
        if (filterVal !== undefined && filterVal !== null && filterVal !== '' && filterVal !== 'ALL') {
          if (config.predicate) {
            if (!config.predicate(item, filterVal)) {
              return false;
            }
          } else if (item && typeof item === 'object') {
            const itemVal = (item as any)[config.key];
            if (itemVal !== filterVal) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [data, debouncedSearch, searchFields, filters, filterConfigs, serverSearch]);

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
    isDebouncing,
    clearSearch,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    activeFiltersCount,
    hasActiveFilters,
    filteredData,
    totalResults: filteredData.length,
  };
}
