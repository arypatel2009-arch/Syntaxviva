import React, { useState, useMemo } from 'react';
import {
  Plus,
  Eye,
  Calendar,
  Check,
  Trash2,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react';
import { Assignment } from '../../types/index.ts';
import {
  Button,
  Badge,
  RowActionMenu,
  toast,
} from '../common/UIComponents.tsx';
import {
  FilterToolbar,
  MultiFacetFilterState,
} from '../common/FilterToolbar.tsx';
import { DataTable, DataTableColumn } from '../common/DataTable.tsx';
import { api } from '../../lib/api.ts';

interface FacultyAssignmentsViewProps {
  assignments: Assignment[];
  onCreateAssignment: () => void;
  onViewSubmissions: (assignment: Assignment) => void;
  onDeleteAssignment?: (assignmentId: string) => Promise<void> | void;
  onRefresh?: () => void;
}

export const FacultyAssignmentsView: React.FC<FacultyAssignmentsViewProps> = ({
  assignments,
  onCreateAssignment,
  onViewSubmissions,
  onDeleteAssignment,
  onRefresh,
}) => {
  const [filters, setFilters] = useState<MultiFacetFilterState>({
    search: '',
    selectedCohorts: [],
    statusFilter: 'all',
    onlyActiveLogins: false,
    languageFilter: 'all',
  });

  const [deadlineDrafts, setDeadlineDrafts] = useState<Record<string, string>>({});
  const [savingDeadlineId, setSavingDeadlineId] = useState<string | null>(null);
  const [savedDeadlineId, setSavedDeadlineId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockingAll, setUnlockingAll] = useState(false);
  const [phase2Overrides, setPhase2Overrides] = useState<Record<string, boolean>>({});

  const isPhase2UnlockedFor = (asg: Assignment) => {
    if (phase2Overrides[asg.id] !== undefined) return phase2Overrides[asg.id];
    return Boolean(asg.phase2Unlocked || asg.phase2_unlocked);
  };

  const handleTogglePhase2Unlock = async (asg: Assignment, nextUnlocked?: boolean) => {
    const targetUnlocked = nextUnlocked !== undefined ? nextUnlocked : !isPhase2UnlockedFor(asg);
    setUnlockingId(asg.id);
    setPhase2Overrides((prev) => ({ ...prev, [asg.id]: targetUnlocked }));
    try {
      await api.toggleAssignmentPhase2Unlock(asg.id, targetUnlocked);
      toast.success(
        targetUnlocked
          ? 'Phase 2 Unlocked for All Students!'
          : 'Phase 2 Locked',
        targetUnlocked
          ? `All students in "${asg.title}" can now start Phase 2 AST Viva.`
          : `Phase 2 access for "${asg.title}" has been locked.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setPhase2Overrides((prev) => ({
        ...prev,
        [asg.id]: Boolean(asg.phase2Unlocked || asg.phase2_unlocked),
      }));
      toast.error('Failed to update Phase 2 status', err?.message || 'Please try again.');
    } finally {
      setUnlockingId(null);
    }
  };

  const handleUnlockAllPhase2 = async () => {
    if (assignments.length === 0) return;
    setUnlockingAll(true);
    const nextOverrides: Record<string, boolean> = {};
    assignments.forEach((a) => {
      nextOverrides[a.id] = true;
    });
    setPhase2Overrides((prev) => ({ ...prev, ...nextOverrides }));
    try {
      const res = await api.unlockAllAssignmentsPhase2(true);
      toast.success(
        'All Students Phase 2 Unlocked!',
        `Unlocked Phase 2 across ${res.updatedCount || assignments.length} assignment(s) for all students in 1 click.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Failed to unlock all Phase 2', err?.message || 'Please try again.');
    } finally {
      setUnlockingAll(false);
    }
  };

  const filtered = useMemo(() => {
    return assignments.filter((asg) => {
      const q = filters.search.trim().toLowerCase();
      if (q && !asg.title.toLowerCase().includes(q)) return false;

      if (
        filters.languageFilter &&
        filters.languageFilter !== 'all' &&
        asg.language.toLowerCase() !== filters.languageFilter.toLowerCase()
      ) {
        return false;
      }

      if (filters.statusFilter !== 'all') {
        const hasSubmissions = (asg.submissionCount ?? 0) > 0;
        if (filters.statusFilter === 'Passed' && !hasSubmissions) return false;
        if (filters.statusFilter === 'Pending' && hasSubmissions) return false;
        if (filters.statusFilter === 'Lockout' && asg.status !== 'archived')
          return false;
      }

      if (filters.onlyActiveLogins && (asg.submissionCount ?? 0) === 0) {
        return false;
      }

      return true;
    });
  }, [assignments, filters]);

  const handleAutoSaveDeadline = async (assignmentId: string, newDate: string) => {
    setDeadlineDrafts((prev) => ({ ...prev, [assignmentId]: newDate }));
    if (!newDate) return;

    setSavingDeadlineId(assignmentId);
    try {
      await api.updateAssignmentDeadline(assignmentId, newDate);
      setSavedDeadlineId(assignmentId);
      toast.success('Assignment updated successfully', `Deadline set to ${newDate}.`);
      setTimeout(() => {
        setSavedDeadlineId((prev) => (prev === assignmentId ? null : prev));
      }, 2000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to update deadline:', err);
      toast.error('Failed to update deadline', err?.message || 'Please try again.');
    } finally {
      setSavingDeadlineId(null);
    }
  };

  const handleDelete = async (asg: Assignment) => {
    setDeletingId(asg.id);
    try {
      if (onDeleteAssignment) {
        await onDeleteAssignment(asg.id);
      } else {
        await api.deleteAssignment(asg.id);
        if (onRefresh) onRefresh();
      }
      toast.success('Assignment deleted successfully', `"${asg.title}" has been removed.`);
    } catch (err: any) {
      console.error('Failed to delete assignment:', err);
      toast.error('Failed to delete assignment', err?.message || 'Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkSetDeadline = async (selected: Assignment[], newDate: string) => {
    try {
      await Promise.all(
        selected.map((asg) => api.updateAssignmentDeadline(asg.id, newDate))
      );
      const nextDrafts = { ...deadlineDrafts };
      selected.forEach((asg) => {
        nextDrafts[asg.id] = newDate;
      });
      setDeadlineDrafts(nextDrafts);
      if (onRefresh) onRefresh();
      toast.success(
        'Bulk deadline updated',
        `Updated deadline to ${newDate} for ${selected.length} assignment(s).`
      );
    } catch (err: any) {
      toast.error('Failed to bulk update deadlines', err?.message);
    }
  };

  const handleBulkExportCSV = (selected: Assignment[]) => {
    const headers = [
      'Assignment ID',
      'Title',
      'Language',
      'Students Submitted',
      'Deadline Date',
      'Status',
    ];
    const rows = selected.map((a) => [
      `"${a.id}"`,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${a.language}"`,
      a.submissionCount ?? 0,
      `"${a.dueDate ? String(a.dueDate).slice(0, 10) : '2026-10-20'}"`,
      `"${a.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `syntaxviva-assignments-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(
      'Assignments exported',
      `Exported ${selected.length} assignment(s) to CSV.`
    );
  };

  const handleBulkDelete = async (selected: Assignment[]) => {
    try {
      for (const asg of selected) {
        if (onDeleteAssignment) {
          await onDeleteAssignment(asg.id);
        } else {
          await api.deleteAssignment(asg.id);
        }
      }
      if (onRefresh) onRefresh();
      toast.success(
        'Batch delete completed',
        `Deleted ${selected.length} assignment(s).`
      );
    } catch (err: any) {
      toast.error('Batch delete failed', err?.message);
    }
  };

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: 'title',
      header: 'Assignment Title',
      sortable: true,
      sortType: 'string',
      getSortValue: (asg) => asg.title,
      render: (asg) => (
        <div className="font-medium text-slate-900 text-sm tracking-tight">
          {asg.title}
        </div>
      ),
    },
    {
      key: 'language',
      header: 'Language',
      sortable: true,
      sortType: 'string',
      getSortValue: (asg) => asg.language,
      render: (asg) => (
        <span className="font-mono text-slate-600 uppercase bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded text-[11px] font-medium">
          {asg.language}
        </span>
      ),
    },
    {
      key: 'submissionCount',
      header: 'Students Submitted',
      sortable: true,
      sortType: 'number',
      getSortValue: (asg) => Number(asg.submissionCount ?? 0),
      render: (asg) => (
        <span className="font-medium text-slate-700 tabular-nums">
          {asg.submissionCount ?? 0}{' '}
          <span className="text-slate-400 font-normal">
            {(asg.submissionCount ?? 0) === 1 ? 'student' : 'students'}
          </span>
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Deadline Date',
      sortable: true,
      sortType: 'date',
      getSortValue: (asg) =>
        deadlineDrafts[asg.id] ||
        (asg.dueDate ? String(asg.dueDate).slice(0, 10) : '2026-10-20'),
      render: (asg) => {
        const dateValue =
          deadlineDrafts[asg.id] !== undefined
            ? deadlineDrafts[asg.id]
            : asg.dueDate
            ? String(asg.dueDate).slice(0, 10)
            : '2026-10-20';

        return (
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                value={dateValue}
                onChange={(e) => handleAutoSaveDeadline(asg.id, e.target.value)}
                className="pl-8 pr-2.5 py-1 rounded-lg border border-slate-200/80 hover:border-slate-300 text-xs bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors cursor-pointer"
              />
            </div>
            {savingDeadlineId === asg.id && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                Saving
              </span>
            )}
            {savedDeadlineId === asg.id && savingDeadlineId !== asg.id && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'phase2Access',
      header: 'Phase 2 Access (All Students)',
      render: (asg) => {
        const unlocked = isPhase2UnlockedFor(asg);
        const isBusy = unlockingId === asg.id;

        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {unlocked ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleTogglePhase2Unlock(asg, false)}
                title="Click to lock Phase 2 for all students"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Phase 2 Unlocked</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleTogglePhase2Unlock(asg, true)}
                title="1-Click Unlock Phase 2 for all students in this assignment"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-white" />
                )}
                <span>Unlock Phase 2</span>
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortType: 'string',
      getSortValue: (asg) => asg.status,
      render: (asg) => (
        <Badge
          variant={asg.status === 'active' ? 'success' : 'neutral'}
          size="sm"
          dot
        >
          {asg.status === 'active'
            ? 'Active'
            : asg.status === 'draft'
            ? 'Draft'
            : 'Archived'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (asg) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onViewSubmissions(asg)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            Submissions
          </button>
          <RowActionMenu
            fadeOnHover={false}
            items={[
              {
                label: 'View Submissions',
                icon: Eye,
                onClick: () => onViewSubmissions(asg),
              },
              {
                label: isPhase2UnlockedFor(asg)
                  ? 'Lock Phase 2 for Students'
                  : 'Unlock Phase 2 for All Students',
                icon: isPhase2UnlockedFor(asg) ? Lock : Unlock,
                onClick: () => handleTogglePhase2Unlock(asg),
              },
              {
                label:
                  deletingId === asg.id ? 'Deleting...' : 'Delete Assignment',
                icon: Trash2,
                variant: 'danger',
                disabled: deletingId === asg.id,
                onClick: () => handleDelete(asg),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Lab Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Unlock Phase 2 AST Viva for all students in 1 click, or manage deadlines and submissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleUnlockAllPhase2}
            disabled={unlockingAll || assignments.length === 0}
            icon={Unlock}
          >
            {unlockingAll ? 'Unlocking Phase 2...' : '1-Click Unlock All Phase 2'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onCreateAssignment}
            icon={Plus}
          >
            Create New Assignment
          </Button>
        </div>
      </div>

      {/* Multi-Facet Filter Toolbar */}
      <FilterToolbar
        filters={filters}
        onChange={setFilters}
        showLanguageFilter
        searchPlaceholder="Search lab assignments by title..."
        onlyActiveLabel="With Active Submissions"
      />

      {/* Enterprise Data Table */}
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(a) => a.id}
        pageSize={10}
        entityLabel="assignments"
        selectable
        onBulkSetDeadline={handleBulkSetDeadline}
        onBulkExportCSV={handleBulkExportCSV}
        onBulkDelete={handleBulkDelete}
        emptyTitle="No results found"
        emptyDescription="No assignments matched your search criteria. Try clearing filters."
        emptyActionLabel="Clear filters"
        onEmptyAction={() =>
          setFilters({
            search: '',
            selectedCohorts: [],
            statusFilter: 'all',
            onlyActiveLogins: false,
            languageFilter: 'all',
          })
        }
      />
    </div>
  );
};
