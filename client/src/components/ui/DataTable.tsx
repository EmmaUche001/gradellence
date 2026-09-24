import { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// Design system:
// Header: gray-100 bg, semibold text
// Rows: hover gray-50
// Selection: primary blue
// Pagination: bottom-right

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  pageSize?: number;
  /** Renders when data is empty — use EmptyState component here */
  emptyState?: ReactNode;
  /** Show a loading skeleton instead of rows */
  loading?: boolean;
  /** Number of skeleton rows shown while loading */
  skeletonRows?: number;
  className?: string;
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Callback when rows are selected */
  onSelectionChange?: (selectedKeys: string[]) => void;
  /** Render bulk action toolbar */
  bulkActionToolbar?: (selectedCount: number) => ReactNode;
}

function SortIcon({ column, sortKey, sortDir }: {
  column: string;
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== column) return <ChevronsUpDown size={14} className="text-gray-400 group-hover:text-primary-600 transition-colors duration-150" />;
  return sortDir === 'asc'
    ? <ChevronUp size={14} className="text-primary-600" />
    : <ChevronDown size={14} className="text-primary-600" />;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  pageSize = 10,
  emptyState,
  loading = false,
  skeletonRows = 5,
  className = '',
  selectable = false,
  onSelectionChange,
  bulkActionToolbar,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
      setPage(0);
    }
  };

  const handleSelectRow = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === pageData.length) {
      setSelectedKeys(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelected = new Set(pageData.map(keyExtractor));
      setSelectedKeys(newSelected);
      onSelectionChange?.(Array.from(newSelected));
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = aVal < bVal ? -1 : 1;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = sortedData.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const totalResults = sortedData.length;
  const startResult = totalResults === 0 ? 0 : safePage * pageSize + 1;
  const endResult = Math.min((safePage + 1) * pageSize, totalResults);

  return (
    <div className={`w-full ${className}`}>
      {/* Bulk action toolbar */}
      {selectable && selectedKeys.size > 0 && (
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-primary-900">
            {selectedKeys.size} item{selectedKeys.size !== 1 ? 's' : ''} selected
          </span>
          {bulkActionToolbar && bulkActionToolbar(selectedKeys.size)}
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="min-w-full divide-y divide-border">
          {/* Header — design system: gray-100 bg, semibold — STICKY */}
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-gray-100">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size === pageData.length && pageData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-border cursor-pointer"
                    aria-label="Select all rows on this page"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={[
                    'table-header group',
                    col.sortable !== false ? 'cursor-pointer select-none hover:bg-primary-50 transition-colors duration-150' : '',
                    col.className ?? '',
                  ].join(' ')}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable !== false && (
                      <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-surface divide-y divide-border">
            {loading ? (
              // Skeleton rows
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {selectable && (
                    <td className="w-12 px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-skeleton-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="table-cell">
                      <div className="h-4 bg-gray-200 rounded animate-skeleton-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  {emptyState ?? (
                    <span className="text-sm text-gray-400">No data available</span>
                  )}
                </td>
              </tr>
            ) : (
              pageData.map((item) => {
                const itemKey = keyExtractor(item);
                return (
                  <tr
                    key={itemKey}
                    // Design system: hover gray-50
                    className="table-row"
                  >
                    {selectable && (
                      <td className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(itemKey)}
                          onChange={() => handleSelectRow(itemKey)}
                          className="rounded border-border cursor-pointer"
                          aria-label={`Select row`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`table-cell ${col.className ?? ''}`}>
                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — design system: bottom-right */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{startResult}–{endResult}</span> of{' '}
            <span className="font-medium text-gray-700">{totalResults}</span> results
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              className="px-2 py-1.5 text-sm rounded-lg border border-border text-gray-600
                hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="First page"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-border text-gray-600
                hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700 font-medium">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-border text-gray-600
                hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-border text-gray-600
                hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Last page"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
