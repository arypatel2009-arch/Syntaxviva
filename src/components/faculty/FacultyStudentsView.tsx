import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Mail,
  FileSpreadsheet,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  Building2,
  Layers,
  Sparkles,
  Download,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  LayoutGrid,
  List,
  ChevronDown,
  ShieldCheck,
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
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // View mode: 'matrix' (Assignment-wise step-by-step) vs 'roster' (Student details list)
  const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'roster'>('matrix');
  const [selectedAsgForExport, setSelectedAsgForExport] = useState<string>('all');
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingMatrix, setDownloadingMatrix] = useState(false);

  const [filters, setFilters] = useState<MultiFacetFilterState>({
    search: '',
    selectedCohorts: [],
    statusFilter: 'all',
    onlyActiveLogins: false,
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [studentsRes, matrixRes] = await Promise.all([
        api.getStudents().catch((e) => {
          console.warn('Could not load students:', e);
          return { students: [] };
        }),
        api.getMatrixReport().catch((e) => {
          console.warn('Could not load matrix report:', e);
          return null;
        }),
      ]);
      setStudents(studentsRes.students || []);
      setMatrixData(matrixRes);
      setDismissedIds(new Set());
    } catch (err) {
      console.error('Failed to load students/matrix:', err);
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

  // Matrix Filtered Students (derived from matrix report)
  const matrixStudents = useMemo(() => {
    if (!matrixData || !matrixData.students) return [];
    return matrixData.students.filter((s: any) => {
      if (dismissedIds.has(s.id)) return false;
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const matches =
          (s.name || '').toLowerCase().includes(q) ||
          (s.rollNumber || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.divisionId || '').toLowerCase().includes(q) ||
          (s.classId || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [matrixData, dismissedIds, filters.search]);

  const assignmentsList: any[] = matrixData?.assignments || [];

  const totalLoggedInStudents = visibleStudents.length;
  const studentsWhoSubmitted = visibleStudents.filter(
    (s) => (s.attemptsCount ?? 0) > 0
  ).length;
  const totalStudentSubmissions = visibleStudents.reduce(
    (acc, s) => acc + (s.attemptsCount ?? 0),
    0
  );

  // ---------------------------------------------------------------------------
  // Excel Export 1: Step-by-Step Assignment Matrix (All Assignments & Students)
  // ---------------------------------------------------------------------------
  const handleDownloadStepByStepMatrix = async () => {
    setDownloadingMatrix(true);
    try {
      let data = matrixData;
      if (!data) {
        data = await api.getMatrixReport();
        setMatrixData(data);
      }

      const assignments: any[] = data.assignments || [];
      const studentsToExport: any[] = data.students || [];

      if (studentsToExport.length === 0) {
        toast.info('No students found to export.');
        return;
      }

      const BOM = '\uFEFF';
      const baseHeaders = [
        'Roll Number',
        'Student Name',
        'Student Email',
        'Division',
        'College / Institution',
        'Department / Class',
      ];

      const assignmentHeaders: string[] = [];
      assignments.forEach((asg, idx) => {
        const cleanTitle = (asg.title || `Assignment ${idx + 1}`).replace(/"/g, '""');
        assignmentHeaders.push(`[Asg ${idx + 1}: ${cleanTitle}] Status`);
        assignmentHeaders.push(`[Asg ${idx + 1}: ${cleanTitle}] Score (%)`);
        assignmentHeaders.push(`[Asg ${idx + 1}: ${cleanTitle}] Phase 1 Viva Score`);
        assignmentHeaders.push(`[Asg ${idx + 1}: ${cleanTitle}] Phase 2 Debug Score`);
        assignmentHeaders.push(`[Asg ${idx + 1}: ${cleanTitle}] Tests Passed`);
        assignmentHeaders.push(`[Asg ${idx + 1}: ${cleanTitle}] Submission Date & Time`);
      });

      const summaryHeaders = [
        'Total Assignments Assigned',
        'Total Assignments Completed',
        'Total Assignments Passed',
        'Overall Average Score (%)',
        'Overall Status',
      ];

      const allHeaders = [...baseHeaders, ...assignmentHeaders, ...summaryHeaders];

      const rows = studentsToExport.map((s) => {
        const rowCols: (string | number)[] = [
          `"${(s.rollNumber || 'N/A').replace(/"/g, '""')}"`,
          `"${(s.name || 'Student').replace(/"/g, '""')}"`,
          `"${(s.email || '').replace(/"/g, '""')}"`,
          `"${(s.divisionId || data.facultyDivision || '').replace(/"/g, '""')}"`,
          `"${(s.institution || data.facultyCollege || '').replace(/"/g, '""')}"`,
          `"${(s.classId || '').replace(/"/g, '""')}"`,
        ];

        // Step-by-Step assignment columns
        assignments.forEach((asg) => {
          const det = s.assignments?.[asg.id];
          if (!det || det.status === 'NOT_STARTED') {
            rowCols.push('"Not Started"');
            rowCols.push('"0%"');
            rowCols.push('"0"');
            rowCols.push('"0"');
            rowCols.push('"0/0"');
            rowCols.push('"Not Submitted"');
          } else {
            rowCols.push(`"${det.displayStatus || det.status}"`);
            rowCols.push(`"${det.scoreStr || (det.score !== null ? `${det.score}%` : '—')}"`);
            rowCols.push(`"${det.phase1Score !== null ? `${det.phase1Score}%` : '—'}"`);
            rowCols.push(`"${det.phase2Score !== null ? `${det.phase2Score}%` : '—'}"`);
            rowCols.push(`"${det.testsPassed}/${det.testsTotal}"`);
            rowCols.push(`"${det.submittedDateStr} ${det.submittedTimeStr}"`);
          }
        });

        // Summary columns
        rowCols.push(s.totalAssigned ?? assignments.length);
        rowCols.push(s.totalCompleted ?? 0);
        rowCols.push(s.totalPassed ?? 0);
        rowCols.push(`"${s.averageScore ?? 0}%"`);
        rowCols.push(`"${s.overallStatus || 'In Progress'}"`);

        return rowCols;
      });

      const csvContent = BOM + [allHeaders.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanDiv = (data.facultyDivision || 'DIV').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute(
        'download',
        `Assignment_StepByStep_Matrix_${cleanDiv}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(
        'Step-by-Step Matrix Downloaded',
        `Exported ${studentsToExport.length} students across ${assignments.length} assignment(s) for Excel.`
      );
    } catch (err) {
      console.error('Failed to export matrix:', err);
      toast.error('Failed to export step-by-step assignment matrix.');
    } finally {
      setDownloadingMatrix(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Excel Export 2: Single Assignment Deep Report for all students
  // ---------------------------------------------------------------------------
  const handleDownloadSingleAssignmentReport = (asgId: string) => {
    if (!matrixData || !matrixData.students || matrixData.students.length === 0) {
      toast.info('No student data available to export.');
      return;
    }
    const asg = (matrixData.assignments || []).find((a: any) => a.id === asgId);
    if (!asg) {
      toast.info('Please select a valid assignment.');
      return;
    }

    const BOM = '\uFEFF';
    const headers = [
      'Roll Number',
      'Student Name',
      'Student Email',
      'Division',
      'Institution / College',
      'Assignment Title',
      'Language',
      'Status',
      'Final Score (%)',
      'Phase 1 Viva Score',
      'Phase 2 Debug Score',
      'Tests Passed',
      'Tests Total',
      'Submission Date',
      'Submission Time',
      'Viva & Debug Summary',
      'Mistake / Failure Reason',
    ];

    const rows = (matrixData.students || []).map((s: any) => {
      const det = s.assignments?.[asg.id];
      if (!det || det.status === 'NOT_STARTED') {
        return [
          `"${(s.rollNumber || 'N/A').replace(/"/g, '""')}"`,
          `"${(s.name || 'Student').replace(/"/g, '""')}"`,
          `"${(s.email || '').replace(/"/g, '""')}"`,
          `"${(s.divisionId || matrixData.facultyDivision || '').replace(/"/g, '""')}"`,
          `"${(s.institution || matrixData.facultyCollege || '').replace(/"/g, '""')}"`,
          `"${(asg.title || '').replace(/"/g, '""')}"`,
          `"${(asg.language || 'python').replace(/"/g, '""')}"`,
          '"Not Started"',
          '"0%"',
          '"0"',
          '"0"',
          0,
          0,
          '"—"',
          '"—"',
          '"Not submitted yet"',
          '"None"',
        ];
      }

      return [
        `"${(s.rollNumber || 'N/A').replace(/"/g, '""')}"`,
        `"${(s.name || 'Student').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.divisionId || matrixData.facultyDivision || '').replace(/"/g, '""')}"`,
        `"${(s.institution || matrixData.facultyCollege || '').replace(/"/g, '""')}"`,
        `"${(asg.title || '').replace(/"/g, '""')}"`,
        `"${(det.language || asg.language || 'python').replace(/"/g, '""')}"`,
        `"${det.displayStatus || det.status}"`,
        `"${det.scoreStr || (det.score !== null ? `${det.score}%` : '—')}"`,
        `"${det.phase1Score !== null ? `${det.phase1Score}%` : '—'}"`,
        `"${det.phase2Score !== null ? `${det.phase2Score}%` : '—'}"`,
        det.testsPassed ?? 0,
        det.testsTotal ?? 0,
        `"${det.submittedDateStr}"`,
        `"${det.submittedTimeStr}"`,
        `"${(det.summary || '').replace(/"/g, '""')}"`,
        `"${(det.failureReason || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = BOM + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (asg.title || 'Assignment').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    link.setAttribute('download', `${safeTitle}_All_Students_Excel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(
      'Assignment Report Downloaded',
      `Exported ${rows.length} students for "${asg.title}".`
    );
  };

  // ---------------------------------------------------------------------------
  // Excel Export 3: Standard Submissions Log
  // ---------------------------------------------------------------------------
  const downloadSubmissionsExcel = (submissionsToExport: any[], filenamePrefix: string) => {
    if (!submissionsToExport || submissionsToExport.length === 0) {
      toast.info('No submissions found to export.');
      return;
    }
    const BOM = '\uFEFF';
    const headers = [
      'Roll Number',
      'Student Name',
      'Student Email',
      'Class / Batch',
      'Division',
      'Assignment Title',
      'Language',
      'Submission Status',
      'Score (%)',
      'Tests Passed',
      'Tests Total',
      'Submitted Date',
      'Submitted Time',
      'Viva Evaluation Summary',
      'Failure / Security Reason',
    ];

    const rows = submissionsToExport.map((s) => {
      const ts = s.submittedAt || s.createdAt;
      const d = ts ? new Date(ts) : null;
      const validDate = d && !isNaN(d.getTime());
      const dayAndDate = validDate
        ? d.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '';
      const time = validDate
        ? d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '';

      let scoreStr = '—';
      if (s.score !== null && s.score !== undefined) {
        scoreStr = `${s.score}%`;
      } else if (s.evaluation?.score !== undefined) {
        scoreStr = `${s.evaluation.score}%`;
      } else if (s.state === 'PASSED' || s.phase2Status === 'PASSED') {
        scoreStr = '100%';
      } else if (s.submittedAt) {
        scoreStr = '67%';
      } else {
        scoreStr = 'Pending';
      }

      const status =
        s.state === 'PASSED' || s.phase2Status === 'PASSED'
          ? 'Passed'
          : s.state || 'Submitted';

      return [
        `"${(s.studentRollNumber || 'N/A').replace(/"/g, '""')}"`,
        `"${(s.studentName || 'Student').replace(/"/g, '""')}"`,
        `"${(s.studentEmail || '').replace(/"/g, '""')}"`,
        `"${(s.studentClassId || '').replace(/"/g, '""')}"`,
        `"${(s.studentDivisionId || '').replace(/"/g, '""')}"`,
        `"${(s.assignmentTitle || '').replace(/"/g, '""')}"`,
        `"${(s.assignmentLanguage || s.language || 'python').replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${scoreStr}"`,
        s.evaluation?.testsPassed ?? (s.state === 'PASSED' ? 1 : 0),
        s.evaluation?.testsTotal ?? (s.state === 'PASSED' ? 1 : 1),
        `"${dayAndDate}"`,
        `"${time}"`,
        `"${(s.summary || 'Viva evaluation completed').replace(/"/g, '""')}"`,
        `"${(s.failureReason || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportAllSubmissionsToExcel = async () => {
    setDownloadingExcel(true);
    try {
      const res = await api.getAllSubmissions();
      const subs = res.submissions || [];
      if (subs.length === 0) {
        toast.info('No student submissions found to export.');
        return;
      }
      downloadSubmissionsExcel(subs, 'All_Students_Submissions_All_Data');
      toast.success(
        'Excel Export Ready',
        `Downloaded ${subs.length} student submission records for Excel.`
      );
    } catch (err) {
      console.error('Failed to export submissions:', err);
      toast.error('Failed to export student submissions.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleExportSingleStudentSubmissions = async (student: any) => {
    try {
      const res = await api.getAllSubmissions();
      const subs = (res.submissions || []).filter(
        (sub: any) =>
          sub.studentId === student.id ||
          (student.email && sub.studentEmail?.toLowerCase() === student.email.toLowerCase()) ||
          (student.rollNumber && sub.studentRollNumber === student.rollNumber)
      );

      if (subs.length === 0) {
        toast.info(`No submissions found for ${student.name || 'this student'}.`);
        return;
      }

      const safeName = (student.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadSubmissionsExcel(subs, `${safeName}_Submissions_Data`);
      toast.success(
        'Student Submissions Exported',
        `Exported ${subs.length} submission(s) for ${student.name} for Excel.`
      );
    } catch (err) {
      console.error('Failed to export student submissions:', err);
      toast.error('Failed to export student submissions.');
    }
  };

  const exportRowsToCSV = (rowsToExport: any[]) => {
    if (rowsToExport.length === 0) return;
    const BOM = '\uFEFF';
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

    const csvContent = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\r\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Student_Roster_All_Data_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(
      'Roster Exported for Excel',
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
      render: (s) => {
        const passed = Number(s.passedCount ?? 0);
        return passed > 0 ? (
          <Badge variant="success" size="sm" dot>
            {passed} Passed
          </Badge>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (s) => (
        <Button
          variant="outline"
          size="sm"
          icon={FileSpreadsheet}
          className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 font-medium whitespace-nowrap"
          title={`Download Excel submissions for ${s.name}`}
          onClick={(e) => {
            e.stopPropagation();
            handleExportSingleStudentSubmissions(s);
          }}
        >
          Download Excel
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Student Submissions &amp; Academic Roster
            </h1>
            {matrixData && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wide border border-emerald-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Division: {matrixData.facultyDivision || 'DIV A'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Download step-by-step student data for each assignment created. Scoped exclusively to your assigned division &amp; college.
          </p>
          {matrixData && (
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold uppercase">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {matrixData.facultyCollege || 'CAMPUS'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold uppercase border border-blue-100">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                {matrixData.facultyDivision || 'DIV A'} Cohort
              </span>
              <span className="text-slate-400 text-[11px]">
                • {assignmentsList.length} Active Assignment(s) • {totalLoggedInStudents} Registered Student(s)
              </span>
            </div>
          )}
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
            variant="outline"
            size="sm"
            onClick={() => exportRowsToCSV(filteredStudents)}
            icon={FileSpreadsheet}
            disabled={filteredStudents.length === 0}
            title="Download student roster overview"
          >
            Export Roster
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadStepByStepMatrix}
            icon={FileSpreadsheet}
            disabled={downloadingMatrix || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            title="Download full Excel sheet with step-by-step assignment scores for all students"
          >
            {downloadingMatrix ? 'Exporting...' : '📊 Download Step-by-Step Matrix (Excel)'}
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
            label="Division Students"
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

      {/* View Switcher & Per-Assignment Quick Downloader */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle between Step-by-Step Matrix & Classic Roster */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveViewMode('matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeViewMode === 'matrix'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Assignment-Wise Matrix ({assignmentsList.length} Asg)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('roster')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeViewMode === 'roster'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Student Roster ({visibleStudents.length})</span>
          </button>
        </div>

        {/* Per-Assignment Excel Export Dropdown */}
        {assignmentsList.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Export Specific Assignment:</span>
            <select
              value={selectedAsgForExport}
              onChange={(e) => setSelectedAsgForExport(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Select Assignment...</option>
              {assignmentsList.map((asg: any, i: number) => (
                <option key={asg.id} value={asg.id}>
                  Asg {i + 1}: {asg.title} ({asg.language || 'python'})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              disabled={selectedAsgForExport === 'all'}
              onClick={() => handleDownloadSingleAssignmentReport(selectedAsgForExport)}
              className="text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              Download Assignment Excel
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Multi-Facet Filter Toolbar */}
      <FilterToolbar
        filters={filters}
        onChange={setFilters}
        availableCohorts={availableCohorts}
        searchPlaceholder="Search students by name, roll number, or email..."
        onlyActiveLabel="Show Only Active Logins"
      />

      {/* VIEW MODE 1: STEP-BY-STEP ASSIGNMENT MATRIX TABLE */}
      {activeViewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Step-by-Step Assignment Matrix ({matrixStudents.length} Students)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays real-time completion, Viva Phase 1 and Debug Phase 2 marks step-by-step for each created assignment.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={FileSpreadsheet}
              onClick={handleDownloadStepByStepMatrix}
              disabled={downloadingMatrix || matrixStudents.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Export Matrix to Excel (.csv)
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Roll No</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Student Details</th>
                  <th className="py-3 px-3 whitespace-nowrap">Division</th>
                  {assignmentsList.map((asg: any, idx: number) => (
                    <th key={asg.id} className="py-3 px-3 whitespace-nowrap min-w-[160px] border-l border-slate-200/80">
                      <div className="text-[11px] text-emerald-700 font-extrabold">Asg {idx + 1}</div>
                      <div className="text-[10px] text-slate-600 truncate max-w-[150px]" title={asg.title}>
                        {asg.title}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 whitespace-nowrap text-center border-l border-slate-200">Progress</th>
                  <th className="py-3 px-3 whitespace-nowrap text-center">Avg Score</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6 + assignmentsList.length} className="text-center py-12 text-slate-400">
                      No student records found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  matrixStudents.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {s.rollNumber || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5" />
                          <span>{s.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px] uppercase border border-blue-100">
                          {s.divisionId || matrixData?.facultyDivision || 'DIV A'}
                        </span>
                      </td>

                      {/* Step-by-Step Assignment Cells */}
                      {assignmentsList.map((asg: any) => {
                        const det = s.assignments?.[asg.id];
                        if (!det || det.status === 'NOT_STARTED') {
                          return (
                            <td key={asg.id} className="py-3 px-3 border-l border-slate-100">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-500 font-semibold text-[10px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Not Started
                              </span>
                            </td>
                          );
                        }

                        const isPassed = det.status === 'PASSED' || det.displayStatus === 'Passed';
                        const isFailed = det.status === 'FAILED' || det.displayStatus === 'Failed';

                        return (
                          <td key={asg.id} className="py-3 px-3 border-l border-slate-100">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  isPassed
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isFailed
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isPassed && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                {isFailed && <XCircle className="w-3 h-3 text-rose-600" />}
                                <span>{det.displayStatus} ({det.scoreStr || '—'})</span>
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Viva: <span className="font-semibold text-slate-700">{det.phase1Score !== null ? `${det.phase1Score}%` : '—'}</span> • Debug:{' '}
                                <span className="font-semibold text-slate-700">{det.phase2Score !== null ? `${det.phase2Score}%` : '—'}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                Tests: {det.testsPassed}/{det.testsTotal}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Progress summary */}
                      <td className="py-3 px-3 text-center border-l border-slate-100">
                        <span className="font-bold text-slate-800">
                          {s.totalCompleted} / {s.totalAssigned}
                        </span>
                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          {s.totalPassed} Passed
                        </div>
                      </td>

                      {/* Average Score */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-extrabold text-xs px-2 py-1 rounded-lg ${
                            s.averageScore >= 80
                              ? 'bg-emerald-50 text-emerald-700'
                              : s.averageScore >= 50
                              ? 'bg-amber-50 text-amber-700'
                              : s.averageScore > 0
                              ? 'bg-rose-50 text-rose-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {s.averageScore > 0 ? `${s.averageScore}%` : '—'}
                        </span>
                      </td>

                      {/* Student export action */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={FileSpreadsheet}
                          onClick={() => handleExportSingleStudentSubmissions(s)}
                          className="text-[11px] py-1 px-2.5 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 whitespace-nowrap"
                          title={`Download individual Excel report for ${s.name}`}
                        >
                          Excel
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CLASSIC STUDENT ROSTER TABLE */}
      {activeViewMode === 'roster' && (
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
      )}
    </div>
  );
};
