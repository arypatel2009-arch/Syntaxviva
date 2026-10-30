import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Mail,
  FileSpreadsheet,
  RefreshCw,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  Badge,
  Button,
  StatCard,
  StatCardSkeleton,
  toast,
} from '../common/UIComponents.tsx';
import {
  FilterToolbar,
  MultiFacetFilterState,
} from '../common/FilterToolbar.tsx';
import { DataTable, DataTableColumn } from '../common/DataTable.tsx';
import { api } from '../../lib/api.ts';

export const FacultyStudentsView: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<MultiFacetFilterState>({
    search: '',
    selectedCohorts: [],
    statusFilter: 'all',
    onlyActiveLogins: false,
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.getStudents();
      setStudents(res.students || []);
      setDismissedIds(new Set());
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const visibleStudents = useMemo(
    () => students.filter((s) => !dismissedIds.has(s.id)),
    [students, dismissedIds]
  );

  const availableCohorts = useMemo(() => {
    const set = new Set<string>(['Main Campus', 'CSE-A', 'CSE-B', 'AI-DS', 'IT-A']);
    visibleStudents.forEach((s) => {
      if (s.classId && s.divisionId) {
        set.add(`${s.classId}-${s.divisionId}`);
      } else if (s.classId) {
        set.add(s.classId);
      }
      if (s.institution) {
        set.add(s.institution);
      }
    });
    return Array.from(set);
  }, [visibleStudents]);

  const filteredStudents = useMemo(() => {
    return visibleStudents.filter((s) => {
      // 1. Search query
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const matchesSearch =
          (s.name || '').toLowerCase().includes(q) ||
          (s.rollNumber || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.classId || '').toLowerCase().includes(q) ||
          (s.institution || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Multi-select Batch / Cohort
      if (filters.selectedCohorts.length > 0) {
        const studentCohort =
          s.classId && s.divisionId
            ? `${s.classId}-${s.divisionId}`
            : s.classId || s.institution || 'Main Campus';
        const inst = s.institution || 'Main Campus';
        const cohortMatch = filters.selectedCohorts.some(
          (c) =>
            c.toLowerCase() === studentCohort.toLowerCase() ||
            c.toLowerCase() === inst.toLowerCase()
        );
        if (!cohortMatch) return false;
      }

      // 3. Status Filter ("Passed", "Pending", "Lockout")
      if (filters.statusFilter !== 'all') {
        const passed = (s.passedCount ?? 0) > 0;
        const locked = s.status === 'locked' || s.status === 'SECURITY_TERMINATED';
        if (filters.statusFilter === 'Passed' && !passed) return false;
        if (filters.statusFilter === 'Pending' && (passed || locked)) return false;
        if (filters.statusFilter === 'Lockout' && !locked) return false;
      }

      // 4. Toggle Switch: Show Only Active Logins
      if (filters.onlyActiveLogins) {
        const hasLogin = Boolean(s.lastLoginAt || s.createdAt);
        if (!hasLogin) return false;
      }

      return true;
    });
  }, [visibleStudents, filters]);

  const totalLoggedInStudents = visibleStudents.length;
  const studentsWhoSubmitted = visibleStudents.filter(
    (s) => (s.attemptsCount ?? 0) > 0
  ).length;
  const totalStudentSubmissions = visibleStudents.reduce(
    (acc, s) => acc + (s.attemptsCount ?? 0),
    0
  );

  const exportRowsToCSV = (rowsToExport: any[]) => {
    if (rowsToExport.length === 0) return;
    const headers = [
      'ID',
      'Student Name',
      'Email',
      'Institution',
      'Roll Number',
      'Class',
      'Division',
      'Assignments Submitted',
      'Viva Passed',
      'Account Login Day & Date',
      'Account Login Time',
    ];
    const rows = rowsToExport.map((s) => {
      const loginDate =
        s.lastLoginAt || s.createdAt
          ? new Date(s.lastLoginAt || s.createdAt)
          : null;
      return [
        `"${s.id || ''}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.institution || '').replace(/"/g, '""')}"`,
        `"${(s.rollNumber || '').replace(/"/g, '""')}"`,
        `"${(s.classId || '').replace(/"/g, '""')}"`,
        `"${(s.divisionId || '').replace(/"/g, '""')}"`,
        s.attemptsCount ?? 0,
        s.passedCount ?? 0,
        `"${
          loginDate
            ? loginDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : ''
        }"`,
        `"${
          loginDate
            ? loginDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : ''
        }"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `syntaxviva-students-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(
      'CSV exported successfully',
      `Exported ${rowsToExport.length} student record(s).`
    );
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: 'name',
      header: 'Student Name',
      sortable: true,
      sortType: 'string',
      getSortValue: (s) => s.name || '',
      render: (s) => (
        <div>
          <div className="font-medium text-slate-900 text-sm tracking-tight">
            {s.name}
          </div>
          <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3" />
            <span>{s.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'rollNumber',
      header: 'Roll Number',
      sortable: true,
      sortType: 'string',
      getSortValue: (s) => s.rollNumber || '',
      render: (s) => (
        <span className="font-medium text-slate-700 tabular-nums">
          {s.rollNumber || '—'}
        </span>
      ),
    },
    {
      key: 'institution',
      header: 'Batch / Cohort',
      sortable: true,
      sortType: 'string',
      getSortValue: (s) => s.classId || s.institution || 'Main Campus',
      render: (s) => (
        <div className="text-slate-600">
          <div className="font-medium text-slate-800">
            {s.institution || 'Main Campus'}
          </div>
          {(s.classId || s.divisionId) && (
            <div className="text-[11px] text-slate-400">
              {s.classId} {s.divisionId ? `Div ${s.divisionId}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Account Login Date',
      sortable: true,
      sortType: 'date',
      getSortValue: (s) => s.lastLoginAt || s.createdAt || '',
      render: (s) => {
        const loginTs = s.lastLoginAt || s.createdAt;
        const loginDate = loginTs ? new Date(loginTs) : null;
        return loginDate && !isNaN(loginDate.getTime()) ? (
          <div className="whitespace-nowrap">
            <div className="font-medium text-slate-800">
              {loginDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
              {loginDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        ) : (
          <span className="text-slate-500">Logged In</span>
        );
      },
    },
    {
      key: 'attemptsCount',
      header: 'Submitted',
      sortable: true,
      sortType: 'number',
      align: 'center',
      getSortValue: (s) => Number(s.attemptsCount ?? 0),
      render: (s) => (
        <span className="font-semibold text-slate-900 tabular-nums">
          {s.attemptsCount ?? 0}
        </span>
      ),
    },
    {
      key: 'passedCount',
      header: 'Viva Passed',
      sortable: true,
      sortType: 'number',
      align: 'center',
      getSortValue: (s) => Number(s.passedCount ?? 0),
      render: (s) => (
        <span className="font-semibold text-emerald-700 tabular-nums">
          {s.passedCount ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Submission Status',
      align: 'right',
      render: (s) => {
        const isCancelled =
          (s.terminatedCount ?? 0) > 0 || s.status === 'SECURITY_TERMINATED';
        const passed = (s.passedCount ?? 0) > 0;
        const missingList: any[] = Array.isArray(s.missingAssignments)
          ? s.missingAssignments
          : [];
        const hasNotSubmitted =
          (s.attemptsCount ?? 0) === 0 || missingList.length > 0;
        const missedDeadline =
          (s.missedDeadlineCount ?? 0) > 0 ||
          missingList.some((m) => m.isDeadlinePassed);

        if (isCancelled) {
          return (
            <div className="inline-flex flex-col items-end gap-1">
              <Badge variant="danger" size="sm" dot>
                Exam Cancelled
              </Badge>
              <div className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-2 py-0.5 max-w-[240px] text-right leading-snug">
                {s.latestFailureReason ||
                  'Exam Cancelled: Student pressed Back, minimized window, or closed tab'}
              </div>
            </div>
          );
        }

        if (hasNotSubmitted) {
          return (
            <div className="inline-flex flex-col items-end gap-1">
              <Badge variant="danger" size="sm" dot>
                {missedDeadline
                  ? 'Deadline Over — Not Submitted'
                  : (s.attemptsCount ?? 0) === 0
                  ? 'Assignment Not Submitted'
                  : `${missingList.length} Not Submitted`}
              </Badge>
              {missingList.length > 0 && (
                <div className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-2 py-0.5 max-w-[260px] text-right leading-snug">
                  Not Submitted: {missingList.map((m) => m.title).join(', ')}
                </div>
              )}
            </div>
          );
        }

        return (
          <Badge variant={passed ? 'success' : 'neutral'} size="sm" dot>
            {passed ? 'Passed' : 'Submitted'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Submissions &amp; Student Roster
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Interactive enterprise grid with multi-column sorting, cohort filters, and bulk operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStudents}
            icon={RefreshCw}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportRowsToCSV(filteredStudents)}
            icon={FileSpreadsheet}
            disabled={filteredStudents.length === 0}
          >
            Export All CSV
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Students Logged In"
            value={totalLoggedInStudents}
            icon={Users}
          />
          <StatCard
            label="Students Who Submitted"
            value={studentsWhoSubmitted}
            icon={FileCheck}
          />
          <StatCard
            label="Total Submissions"
            value={totalStudentSubmissions}
            icon={CheckCircle2}
          />
        </div>
      )}

      {/* Advanced Multi-Facet Filter Toolbar */}
      <FilterToolbar
        filters={filters}
        onChange={setFilters}
        availableCohorts={availableCohorts}
        searchPlaceholder="Search students by name, roll number, or email..."
        onlyActiveLabel="Show Only Active Logins"
      />

      {/* Enterprise Data Table */}
      <DataTable
        data={filteredStudents}
        columns={columns}
        getRowId={(s) => String(s.id)}
        loading={loading}
        pageSize={10}
        entityLabel="students"
        selectable
        onBulkExportCSV={(selected) => exportRowsToCSV(selected)}
        onBulkDelete={(selected) => {
          const next = new Set(dismissedIds);
          selected.forEach((s) => next.add(s.id));
          setDismissedIds(next);
          toast.success(
            'Batch action completed',
            `Removed ${selected.length} student row(s) from current view.`
          );
        }}
        emptyTitle="No results found"
        emptyDescription="No students matched your search criteria. Try clearing filters."
        emptyActionLabel="Clear filters"
        onEmptyAction={() =>
          setFilters({
            search: '',
            selectedCohorts: [],
            statusFilter: 'all',
            onlyActiveLogins: false,
          })
        }
      />
    </div>
  );
};
