import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  FileSpreadsheet,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button, EmptyState, TableSkeleton } from './UIComponents.tsx';

export type SortDirection = 'asc' | 'desc' | null;
export type SortDataType = 'string' | 'number' | 'date';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortType?: SortDataType;
  getSortValue?: (row: T) => string | number | Date | null | undefined;
  align?: 'left' | 'center' | 'right';
  render: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  entityLabel?: string; // e.g. 'students' or 'assignments'
  selectable?: boolean;
  onBulkSetDeadline?: (selectedRows: T[], newDeadline: string) => Promise<void> | void;
  onBulkExportCSV?: (selectedRows: T[]) => void;
  onBulkDelete?: (selectedRows: T[]) => Promise<void> | void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading = false,
  pageSize: initialPageSize = 10,
  entityLabel = 'records',
  selectable = true,
  onBulkSetDeadline,
  onBulkExportCSV,
  onBulkDelete,
  emptyTitle = 'No results found',
  emptyDescription = 'No records matched your search criteria. Try clearing filters.',
  emptyActionLabel,
  onEmptyAction,
}: DataTableProps<T>) {
  // Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Bulk Action Modals
  const [showBulkDeadlineModal, setShowBulkDeadlineModal] = useState(false);
  const [bulkDeadlineDate, setBulkDeadlineDate] = useState('2026-10-25');
  const [bulkSaving, setBulkSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Toggle column sort: null -> 'asc' -> 'desc' -> null
  const handleSortClick = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    if (sortColumn !== col.key) {
      setSortColumn(col.key);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortColumn(null);
      setSortDirection(null);
    } else {
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Stateful Sorting Logic (supporting string, number, and date timestamps)
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;
    const col = columns.find((c) => c.key === sortColumn);
    if (!col) return data;

    const copy = [...data];
    const type: SortDataType = col.sortType || 'string';

    copy.sort((a, b) => {
      const rawA = col.getSortValue ? col.getSortValue(a) : (a as any)[col.key];
      const rawB = col.getSortValue ? col.getSortValue(b) : (b as any)[col.key];

      let cmp = 0;
      if (type === 'number') {
        const numA = Number(rawA ?? 0);
        const numB = Number(rawB ?? 0);
        cmp = numA - numB;
      } else if (type === 'date') {
        const timeA = rawA ? new Date(rawA as any).getTime() || 0 : 0;
        const timeB = rawB ? new Date(rawB as any).getTime() || 0 : 0;
        cmp = timeA - timeB;
      } else {
        const strA = String(rawA ?? '').toLowerCase();
        const strB = String(rawB ?? '').toLowerCase();
        cmp = strA.localeCompare(strB, undefined, { numeric: true });
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return copy;
  }, [data, sortColumn, sortDirection, columns]);

  // Pagination slice
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);

  // Selection helpers
  const visibleIds = paginatedData.map(getRowId);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleRowSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedRows = useMemo(
    () => sortedData.filter((r) => selectedIds.has(getRowId(r))),
    [sortedData, selectedIds, getRowId]
  );

  // Bulk handlers
  const handleConfirmBulkDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBulkSetDeadline || selectedRows.length === 0) return;
    setBulkSaving(true);
    try {
      await onBulkSetDeadline(selectedRows, bulkDeadlineDate);
      setShowBulkDeadlineModal(false);
      setSelectedIds(new Set());
    } finally {
      setBulkSaving(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!onBulkDelete || selectedRows.length === 0) return;
    setBulkDeleting(true);
    try {
      await onBulkDelete(selectedRows);
      setShowDeleteConfirm(false);
      setSelectedIds(new Set());
    } finally {
      setBulkDeleting(false);
    }
  };

  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(totalRecords, safeCurrentPage * pageSize);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-visible relative">
      {loading ? (
        <TableSkeleton rows={5} columns={columns.length + (selectable ? 1 : 0)} />
      ) : sortedData.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-medium text-slate-500 uppercase tracking-wider select-none">
                  {selectable && (
                    <th className="py-3 pl-5 pr-2 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        aria-label="Select all rows"
                        className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer ${
                          allVisibleSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : someVisibleSelected
                            ? 'bg-emerald-100 border-emerald-600 text-emerald-700'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                      >
                        {allVisibleSelected && <Check className="w-3 h-3" />}
                        {someVisibleSelected && (
                          <span className="w-2 h-0.5 bg-emerald-600 rounded" />
                        )}
                      </button>
                    </th>
                  )}

                  {columns.map((col, idx) => {
                    const isSorted = sortColumn === col.key && sortDirection !== null;
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center justify-center'
                        : col.align === 'right'
                        ? 'text-right justify-end'
                        : 'text-left justify-start';

                    return (
                      <th
                        key={col.key}
                        className={`py-3 ${
                          !selectable && idx === 0 ? 'pl-6' : 'px-3'
                        } ${idx === columns.length - 1 ? 'pr-6' : ''}`}
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSortClick(col)}
                            className={`inline-flex items-center gap-1.5 uppercase tracking-wider font-medium hover:text-slate-900 transition cursor-pointer ${alignClass} ${
                              isSorted ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                            )}
                          </button>
                        ) : (
                          <div className={alignClass}>{col.header}</div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((row, rowIdx) => {
                  const id = getRowId(row);
                  const isSelected = selectedIds.has(id);

                  return (
                    <tr
                      key={id}
                      className={`group transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {selectable && (
                        <td className="py-3.5 pl-5 pr-2 w-10">
                          <button
                            type="button"
                            onClick={() => toggleRowSelection(id)}
                            aria-label={`Select row ${id}`}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white group-hover:border-slate-400'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        </td>
                      )}

                      {columns.map((col, colIdx) => {
                        const alignClass =
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : 'text-left';

                        return (
                          <td
                            key={col.key}
                            className={`py-3.5 ${
                              !selectable && colIdx === 0 ? 'pl-6' : 'px-3'
                            } ${colIdx === columns.length - 1 ? 'pr-6' : ''} ${alignClass}`}
                          >
                            {col.render(row, rowIdx)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Client/Server Pagination Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 rounded-b-xl">
            <div className="flex items-center gap-3">
              <span>
                Showing{' '}
                <strong className="font-semibold text-slate-900 tabular-nums">
                  {startRecord}–{endRecord}
                </strong>{' '}
                of{' '}
                <strong className="font-semibold text-slate-900 tabular-nums">
                  {totalRecords}
                </strong>{' '}
                records
              </span>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Rows per page"
                className="py-1 px-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-hidden focus:border-emerald-600 cursor-pointer"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .slice(0, 7)
                  .map((pageNum) => {
                    const active = pageNum === safeCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-md text-xs font-semibold tabular-nums transition cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Floating Bottom Bulk Operations Toolbar */}
      {selectable && selectedRows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-semibold text-xs tabular-nums">
              {selectedRows.length}
            </span>
            <span className="text-xs font-medium text-slate-200">
              {entityLabel} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onBulkSetDeadline && (
              <button
                type="button"
                onClick={() => setShowBulkDeadlineModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 border border-slate-700 transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bulk Set Deadline</span>
              </button>
            )}

            {onBulkExportCSV && (
              <button
                type="button"
                onClick={() => onBulkExportCSV(selectedRows)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 border border-slate-700 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Selected (CSV)</span>
              </button>
            )}

            {onBulkDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Batch Delete</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Set Deadline Dialog */}
      {showBulkDeadlineModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Bulk Set Deadline ({selectedRows.length} selected)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkDeadlineModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmBulkDeadline} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 block">
                  New Submission Deadline Date
                </label>
                <input
                  type="date"
                  required
                  value={bulkDeadlineDate}
                  onChange={(e) => setBulkDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkDeadlineModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={bulkSaving}
                >
                  Apply Deadline
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Confirm Batch Delete
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-slate-800">
                    {selectedRows.length} selected {entityLabel}
                  </strong>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={bulkDeleting}
                onClick={handleConfirmBulkDelete}
              >
                Delete {selectedRows.length} Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
