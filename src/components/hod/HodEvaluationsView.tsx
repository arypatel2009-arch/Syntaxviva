import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar,
  Sparkles,
  FileCheck,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
  Send,
  Eye,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { toast } from '../common/Toast.tsx';

interface StudentAttemptItem {
  id: string;
  name: string;
  roll: string;
  email: string;
  state?: string;
  status?: string;
  score?: number | null;
  submittedAt?: string;
}

interface EvaluationAssignmentItem {
  id: string;
  assignment_id?: string;
  assignment_title?: string;
  title?: string;
  subject?: string;
  faculty_name?: string;
  faculty?: string;
  deadline?: string;
  submitted_count?: number;
  submissions?: number;
  pending_count?: number;
  pending?: number;
  total_enrolled?: number;
  pendingNamesSummary?: string;
  submitted_students?: StudentAttemptItem[];
  pending_students?: StudentAttemptItem[];
  submittedStudents?: StudentAttemptItem[];
  pendingStudents?: StudentAttemptItem[];
  status?: string;
}

interface HodEvaluationsViewProps {
  pendingEvaluationsList: EvaluationAssignmentItem[];
  departmentName: string;
}

export const HodEvaluationsView: React.FC<HodEvaluationsViewProps> = ({
  pendingEvaluationsList = [],
  departmentName = 'Computer Science & Engineering',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending_only' | 'completed_only'>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeTabPerCard, setActiveTabPerCard] = useState<Record<string, 'pending' | 'submitted'>>({});

  // Normalize list items with robust fallbacks ensuring no mismatched states
  const normalizedAssignments = useMemo(() => {
    return pendingEvaluationsList.map((item, idx) => {
      const id = item.id || item.assignment_id || `eval_asg_${idx}`;
      const title = item.assignment_title || item.title || 'Coursework Assignment';
      const subject = (item.subject || 'CPP').toUpperCase();
      const faculty = item.faculty_name || item.faculty || 'Faculty Member';
      const deadline = item.deadline || '31 Dec 2026';

      const submittedList: StudentAttemptItem[] =
        item.submitted_students || item.submittedStudents || [];
      let pendingList: StudentAttemptItem[] =
        item.pending_students || item.pendingStudents || [];

      const submittedCount =
        item.submitted_count ?? item.submissions ?? submittedList.length ?? 0;
      let pendingCount =
        item.pending_count ?? item.pending ?? pendingList.length ?? 0;

      // If pendingList has items, align pendingCount with actual list length
      if (pendingList.length > 0) {
        pendingCount = pendingList.length;
      }

      const totalEnrolled =
        item.total_enrolled ?? Math.max(1, submittedCount + pendingCount);

      return {
        id,
        title,
        subject,
        faculty,
        deadline,
        submittedCount,
        pendingCount,
        totalEnrolled,
        submittedStudents: submittedList,
        pendingStudents: pendingList,
        pendingNamesSummary: item.pendingNamesSummary || '',
      };
    });
  }, [pendingEvaluationsList]);

  // Overall totals for top summary cards
  const totals = useMemo(() => {
    let totalAssignments = normalizedAssignments.length;
    let totalSubmitted = 0;
    let totalPending = 0;

    for (const a of normalizedAssignments) {
      totalSubmitted += a.submittedCount;
      totalPending += a.pendingCount;
    }

    return { totalAssignments, totalSubmitted, totalPending };
  }, [normalizedAssignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return normalizedAssignments.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.faculty.toLowerCase().includes(q) ||
        item.pendingStudents.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.roll.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q)
        ) ||
        item.submittedStudents.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.roll.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q)
        );

      if (!matchesSearch) return false;

      if (filterType === 'pending_only') {
        return item.pendingCount > 0;
      }
      if (filterType === 'completed_only') {
        return item.pendingCount === 0;
      }
      return true;
    });
  }, [normalizedAssignments, searchQuery, filterType]);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const setCardTab = (id: string, tab: 'pending' | 'submitted') => {
    setActiveTabPerCard((prev) => ({
      ...prev,
      [id]: tab,
    }));
  };

  const handleSendReminder = (studentName: string) => {
    toast.success(
      'Notification Sent',
      `Direct coursework reminder delivered to ${studentName}.`
    );
  };

  return (
    <div className="space-y-6 w-full font-sans antialiased text-slate-800">
      {/* 1. Header Bar (Clean White & Emerald Green Aesthetics) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Department Evaluation &amp; Viva Defense Queue</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Real-time submission monitoring, evaluation status, and oral viva readiness for{' '}
              <strong className="text-slate-700">{departmentName}</strong>
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by assignment, student or faculty..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
          />
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Coursework */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Coursework
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {totals.totalAssignments}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Active assignments in department
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs">
            <BookOpen className="w-6 h-6 text-slate-700" />
          </div>
        </div>

        {/* Card 2: Submitted Work */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs flex items-center justify-between bg-gradient-to-br from-white via-white to-emerald-50/40">
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed Submissions</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {totals.totalSubmitted}
            </div>
            <div className="text-xs text-emerald-800 font-semibold mt-0.5">
              Evaluated and ready for viva defense
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shadow-2xs">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* Card 3: Pending Submissions */}
        <div className="bg-white rounded-2xl border border-amber-200/90 p-5 shadow-xs flex items-center justify-between bg-gradient-to-br from-white via-white to-amber-50/50">
          <div>
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending Submissions</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
              {totals.totalPending}
            </div>
            <div className="text-xs text-amber-800 font-semibold mt-0.5">
              Students needing submission or viva review
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shadow-2xs">
            <UserX className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* 3. Filter Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
            filterType === 'all'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          All Coursework ({normalizedAssignments.length})
        </button>
        <button
          onClick={() => setFilterType('pending_only')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
            filterType === 'pending_only'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          Pending Submissions ({normalizedAssignments.filter((a) => a.pendingCount > 0).length})
        </button>
        <button
          onClick={() => setFilterType('completed_only')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
            filterType === 'completed_only'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          100% Completed ({normalizedAssignments.filter((a) => a.pendingCount === 0).length})
        </button>
      </div>

      {/* 4. Assignment Queue Cards: Detailed Breakdown */}
      <div className="space-y-5">
        {filteredAssignments.map((item) => {
          const isExpanded = expandedCards[item.id] !== false; // expanded by default
          const activeTab = activeTabPerCard[item.id] || (item.pendingCount > 0 ? 'pending' : 'submitted');
          const completionPercent = item.totalEnrolled > 0
            ? Math.min(100, Math.round((item.submittedCount / item.totalEnrolled) * 100))
            : 0;

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition hover:border-slate-300"
            >
              {/* Card Header Bar */}
              <div className="p-5 sm:p-6 bg-slate-50/60 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100/90 text-emerald-800 border border-emerald-300">
                      {item.subject}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg truncate">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-400">Faculty:</span>
                      <strong className="text-slate-800">{item.faculty}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Deadline: {item.deadline}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-bold">
                      {completionPercent}% Completed
                    </span>
                  </div>
                </div>

                {/* Metric Summary Badges: Submitted & Pending */}
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left text-xs">
                      <span className="font-extrabold text-emerald-900">{item.submittedCount}</span>
                      <span className="text-emerald-700 ml-1 font-semibold">Submitted</span>
                    </div>
                  </div>

                  <div
                    className={`px-3.5 py-1.5 rounded-2xl border flex items-center gap-2 shadow-2xs ${
                      item.pendingCount > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {item.pendingCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div className="text-left text-xs">
                      <span className="font-extrabold">
                        {item.pendingCount > 0 ? item.pendingCount : '0'}
                      </span>
                      <span className="ml-1 font-semibold">
                        {item.pendingCount > 0 ? 'Pending' : 'Completed'}
                      </span>
                    </div>
                  </div>

                  {/* Collapse / Expand Button */}
                  <button
                    onClick={() => toggleCard(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                    title={isExpanded ? 'Collapse list' : 'Expand list'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body: Interactive Tabs showing Pending and Submitted Students */}
              {isExpanded && (
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Tab Selector Inside Card */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCardTab(item.id, 'pending')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                          activeTab === 'pending'
                            ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pending Students ({item.pendingCount})</span>
                      </button>

                      <button
                        onClick={() => setCardTab(item.id, 'submitted')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                          activeTab === 'submitted'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Submitted Students ({item.submittedCount})</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                      <span>
                        Total Class Enrolled: <strong className="text-slate-700">{item.totalEnrolled}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Rate: <strong className="text-emerald-700">{completionPercent}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* TAB 1: PENDING STUDENTS */}
                  {activeTab === 'pending' && (
                    <div>
                      {item.pendingCount > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3.5">#</th>
                                <th className="py-2.5 px-3.5">STUDENT NAME</th>
                                <th className="py-2.5 px-3.5">ROLL NUMBER</th>
                                <th className="py-2.5 px-3.5">OFFICIAL EMAIL</th>
                                <th className="py-2.5 px-3.5">STATUS</th>
                                <th className="py-2.5 px-3.5 text-right">ACTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {item.pendingStudents.map((stu, sIdx) => (
                                <tr key={stu.id || sIdx} className="hover:bg-amber-50/30 transition">
                                  <td className="py-2.5 px-3.5 text-slate-400 font-mono font-medium">
                                    {sIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-bold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {(stu.name || 'S').charAt(0).toUpperCase()}
                                      </div>
                                      <span>{stu.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono text-slate-600 font-semibold">
                                    {stu.roll || 'CS201'}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">
                                    {stu.email || 'student@syntaxviva.com'}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span>{stu.status || 'Pending Submission'}</span>
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleSendReminder(stu.name)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>Send Reminder</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 px-4 text-center rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col items-center justify-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                          <div className="font-bold text-emerald-900 text-sm">
                            All Students Have Completed This Coursework
                          </div>
                          <div className="text-xs text-emerald-700">
                            100% submission rate achieved with all oral defenses logged.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SUBMITTED STUDENTS */}
                  {activeTab === 'submitted' && (
                    <div>
                      {item.submittedStudents.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3.5">#</th>
                                <th className="py-2.5 px-3.5">STUDENT NAME</th>
                                <th className="py-2.5 px-3.5">ROLL NUMBER</th>
                                <th className="py-2.5 px-3.5">SUBMISSION TIME</th>
                                <th className="py-2.5 px-3.5">SCORE</th>
                                <th className="py-2.5 px-3.5 text-right">STATUS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {item.submittedStudents.map((stu, sIdx) => (
                                <tr key={stu.id || sIdx} className="hover:bg-emerald-50/30 transition">
                                  <td className="py-2.5 px-3.5 text-slate-400 font-mono font-medium">
                                    {sIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-bold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {(stu.name || 'S').charAt(0).toUpperCase()}
                                      </div>
                                      <span>{stu.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono text-slate-600 font-semibold">
                                    {stu.roll || '201'}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">
                                    {stu.submittedAt || 'Recent'}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className="font-bold text-emerald-700 font-mono">
                                      {stu.score !== null && stu.score !== undefined ? `${stu.score} / 100` : 'Completed'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Completed (Phase 2 Ready)</span>
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-1">
                          <Users className="w-7 h-7 text-slate-400" />
                          <div className="font-bold text-slate-700 text-xs">No Submissions Recorded Yet</div>
                          <div className="text-[11px] text-slate-400">
                            Awaiting student code submissions for this assignment.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
