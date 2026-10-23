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
  pageSizeOptions = [10, 12, 20, 50, 100],
  itemLabel = 'entries'
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safeCurrent - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrent * pageSize, totalItems);

  // Build visible page number pills (up to 5 centered around safeCurrent)
  const getPageNumbers = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];
    const start = Math.max(2, safeCurrent - 1);
    const end = Math.min(totalPages - 1, safeCurrent + 1);

    if (start > 2) pages.push('ellipsis-start');
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) pages.push('ellipsis-end');
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const normalizedOptions = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    height: '34px',
    padding: '0 11px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: disabled ? '#f1f5f9' : '#ffffff',
    color: disabled ? '#94a3b8' : '#334155',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.15s ease'
  });

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
        <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
          Showing <strong style={{ color: '#0f172a', fontWeight: 800 }}>{startItem}</strong> to{' '}
          <strong style={{ color: '#0f172a', fontWeight: 800 }}>{endItem}</strong> of{' '}
          <strong style={{ color: '#0f172a', fontWeight: 800 }}>{totalItems}</strong> {itemLabel}
        </span>
        {onPageSizeChange ? (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            {normalizedOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        ) : (
          <span
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {pageSize} / page
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrent <= 1}
          style={navBtnStyle(safeCurrent <= 1)}
          title="First Page"
        >
          « First
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrent - 1))}
          disabled={safeCurrent <= 1}
          style={navBtnStyle(safeCurrent <= 1)}
          title="Previous Page"
        >
          ‹ Prev
        </button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 2px' }}>
          {pageNumbers.map((p) =>
            typeof p === 'string' ? (
              <span key={p} style={{ padding: '0 4px', color: '#94a3b8', fontWeight: 700 }}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: '34px',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '8px',
                  border: p === safeCurrent ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: p === safeCurrent ? '#2563eb' : '#ffffff',
                  color: p === safeCurrent ? '#ffffff' : '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: p === safeCurrent ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrent + 1))}
          disabled={safeCurrent >= totalPages}
          style={navBtnStyle(safeCurrent >= totalPages)}
          title="Next Page"
        >
          Next ›
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrent >= totalPages}
          style={navBtnStyle(safeCurrent >= totalPages)}
          title="Last Page"
        >
          Last »
        </button>
      </div>
    </div>
  );
};

function isSingleColSpanPlaceholderRow(row: React.ReactNode): boolean {
  if (!React.isValidElement(row)) return false;
  const props = row.props as { children?: React.ReactNode };
  const cells = React.Children.toArray(props?.children);
  if (cells.length !== 1) return false;
  const cell = cells[0];
  if (!React.isValidElement(cell)) return false;
  const cellProps = cell.props as { colSpan?: number };
  return typeof cellProps?.colSpan === 'number' && cellProps.colSpan >= 2;
}

export interface PaginatedTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  initialPageSize?: number;
  itemLabel?: string;
}

export const PaginatedTable: React.FC<PaginatedTableProps> = ({
  children,
  initialPageSize = 10,
  itemLabel = 'entries',
  ...tableProps
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  let totalItems = 0;

  const processedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const isTbody =
      child.type === 'tbody' ||
      (typeof child.type === 'string' && child.type.toLowerCase() === 'tbody');

    if (!isTbody) return child;

    const tbodyProps = child.props as { children?: React.ReactNode };
    const rows = React.Children.toArray(tbodyProps.children);

    if (rows.length === 0 || (rows.length === 1 && isSingleColSpanPlaceholderRow(rows[0]))) {
      totalItems = 0;
      return child;
    }

    totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    const slicedRows = rows.slice(start, start + pageSize);

    return React.cloneElement(child as React.ReactElement<any>, {}, slicedRows);
  });

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalItems, pageSize, totalPages, currentPage]);

  return (
    <>
      <table {...tableProps}>{processedChildren}</table>
      {totalItems > 0 && (
        <Pagination
          currentPage={safeCurrent}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel={itemLabel}
        />
      )}
    </>
  );
};

export default Pagination;
