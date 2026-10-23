import React, { useState, useMemo, useEffect } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export function usePagination<T>(items: T[] = [], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalItems, pageSize, totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return safeItems.slice(start, start + pageSize);
  }, [safeItems, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalItems,
    totalPages,
    paginatedItems
  };
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'entries'
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 18px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.83rem', color: '#64748b' }}>
          Showing <strong style={{ color: '#0f172a' }}>{startItem}</strong> to{' '}
          <strong style={{ color: '#0f172a' }}>{endItem}</strong> of{' '}
          <strong style={{ color: '#0f172a' }}>{totalItems}</strong> {itemLabel}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: currentPage <= 1 ? '#f1f5f9' : '#fff',
            color: currentPage <= 1 ? '#94a3b8' : '#334155',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          First
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: currentPage <= 1 ? '#f1f5f9' : '#fff',
            color: currentPage <= 1 ? '#94a3b8' : '#334155',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Prev
        </button>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', padding: '0 8px' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: currentPage >= totalPages ? '#f1f5f9' : '#fff',
            color: currentPage >= totalPages ? '#94a3b8' : '#334155',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: currentPage >= totalPages ? '#f1f5f9' : '#fff',
            color: currentPage >= totalPages ? '#94a3b8' : '#334155',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Last
        </button>
      </div>
    </div>
  );
};

export default Pagination;
