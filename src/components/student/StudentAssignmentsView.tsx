import React, { useState } from 'react';
import {
  Search,
  Filter,
  Play,
  Bug,
  Eye,
  Lock,
} from 'lucide-react';
import { Assignment } from '../../types/index.ts';
import {
  Badge,
  Button,
  RowActionMenu,
  EmptyState,
} from '../common/UIComponents.tsx';

function isAssignmentDeadlinePassed(dueDate?: string | null): boolean {
  if (!dueDate || typeof dueDate !== 'string' || !dueDate.trim()) return false;
  const trimmed = dueDate.trim();
  let deadlineMs: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    deadlineMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  } else {
    deadlineMs = new Date(trimmed).getTime();
  }
  if (Number.isNaN(deadlineMs)) return false;
  return Date.now() > deadlineMs;
}

interface StudentAssignmentsViewProps {
  assignments: Assignment[];
  onSelectAssignment: (assignmentId: string, phase?: 'phase1' | 'phase2') => void;
  onViewDetails: (assignment: Assignment) => void;
}

export const StudentAssignmentsView: React.FC<StudentAssignmentsViewProps> = ({
  assignments,
  onSelectAssignment,
  onViewDetails,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');

  const filtered = assignments.filter((asg) => {
    const matchesSearch =
      asg.title.toLowerCase().includes(search.toLowerCase()) ||
      asg.description.toLowerCase().includes(search.toLowerCase());
    const matchesLanguage =
      languageFilter === 'all' || asg.language.toLowerCase() === languageFilter.toLowerCase();

    const myState = (asg as any).myAttemptState;
    const p2Status = (asg as any).myPhase2Status;
    const isPassed = myState === 'PASSED' || myState === 'PHASE2_PASSED' || p2Status === 'PHASE2_PASSED';
    const isFacultyUnlocked = Boolean(
      asg.phase2Unlocked ||
        asg.phase2_unlocked ||
        myState === 'PHASE2_ACTIVE' ||
        p2Status === 'PHASE2_ACTIVE'
    );
    const isPhase1Done = Boolean(
      (asg as any).mySubmittedAt ||
        myState === 'PHASE1_SUBMITTED' ||
        myState === 'MUTATION_READY' ||
        myState === 'MUTATION_PROCESSING_FAILED' ||
        myState === 'PHASE2_READY' ||
        myState === 'PHASE2_ACTIVE' ||
        myState === 'PHASE2_MUTATION_GENERATED' ||
        p2Status === 'PHASE2_READY' ||
        p2Status === 'PHASE2_ACTIVE'
    );
    const isPhase2 = !isPassed && isPhase1Done && isFacultyUnlocked;

    if (filterTab === 'completed') return matchesSearch && matchesLanguage && isPassed;
    if (filterTab === 'in_progress') return matchesSearch && matchesLanguage && !isPassed && isPhase1Done;
    if (filterTab === 'pending')
      return matchesSearch && matchesLanguage && !isPassed && !isPhase1Done;

    return matchesSearch && matchesLanguage;
  });

  const hasFilters = search.trim() !== '' || languageFilter !== 'all' || filterTab !== 'all';

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            My Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View, implement, and verify your enrolled computer science assessments.
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: 'all', label: 'All Assignments' },
            { id: 'pending', label: 'Pending' },
            { id: 'in_progress', label: 'In Progress (Phase 2 Ready)' },
            { id: 'completed', label: 'Completed & Passed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Language Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative grow w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assignments by title or keyword..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full sm:w-44 py-1.5 px-3 rounded-lg border border-slate-200/80 text-xs sm:text-sm bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="all">All Languages</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table / List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-visible">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No results found"
            description="No assignments matched your search criteria. Try clearing filters."
            actionLabel={hasFilters ? 'Clear filters' : undefined}
            onAction={
              hasFilters
                ? () => {
                    setSearch('');
                    setLanguageFilter('all');
                    setFilterTab('all');
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-3 pl-6">Assignment Title</th>
                  <th className="py-3">Language</th>
                  <th className="py-3">Created By</th>
                  <th className="py-3">Deadline Date</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((asg) => {
                  const myState = (asg as any).myAttemptState;
                  const p2Status = (asg as any).myPhase2Status;
                  const isPassed =
                    myState === 'PASSED' ||
                    myState === 'PHASE2_PASSED' ||
                    p2Status === 'PHASE2_PASSED';
                  const isPhase1Done = Boolean(
                    (asg as any).mySubmittedAt ||
                      myState === 'PHASE1_SUBMITTED' ||
                      myState === 'MUTATION_READY' ||
                      myState === 'MUTATION_PROCESSING_FAILED' ||
                      myState === 'PHASE2_READY' ||
                      myState === 'PHASE2_ACTIVE' ||
                      myState === 'PHASE2_MUTATION_GENERATED' ||
                      p2Status === 'PHASE2_READY' ||
                      p2Status === 'PHASE2_ACTIVE'
                  );
                  const isFacultyUnlocked = Boolean(
                    asg.phase2Unlocked ||
                      asg.phase2_unlocked ||
                      myState === 'PHASE2_ACTIVE' ||
                      p2Status === 'PHASE2_ACTIVE'
                  );
                  const isPhase2 = !isPassed && isPhase1Done && isFacultyUnlocked;
                  const isWaitingFacultyUnlock = !isPassed && isPhase1Done && !isFacultyUnlocked;

                  const rawDueDate = asg.dueDate || (asg as any).due_date;
                  const isDeadlineExpired =
                    !isPhase1Done &&
                    !isPassed &&
                    (Boolean((asg as any).isDeadlinePassed) ||
                      isAssignmentDeadlinePassed(rawDueDate));

                  return (
                    <tr key={asg.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6">
                        <div
                          onClick={() => onViewDetails(asg)}
                          className="font-medium text-slate-900 text-sm tracking-tight hover:text-emerald-700 cursor-pointer"
                        >
                          {asg.title}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="font-mono text-slate-600 uppercase bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded text-[11px] font-medium">
                          {asg.language}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {asg.createdByName || 'Faculty'}
                      </td>
                      <td className="py-3.5 text-slate-700 font-medium whitespace-nowrap tabular-nums">
                        {rawDueDate
                          ? new Date(rawDueDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'No deadline'}
                      </td>
                      <td className="py-3.5">
                        {isPassed ? (
                          <Badge variant="success" size="sm" dot>
                            Passed &amp; Verified
                          </Badge>
                        ) : isPhase2 ? (
                          <Badge variant="warning" size="sm" dot>
                            Phase 2 Unlocked
                          </Badge>
                        ) : isWaitingFacultyUnlock ? (
                          <Badge variant="neutral" size="sm" dot>
                            Phase 2 Locked by Faculty
                          </Badge>
                        ) : isDeadlineExpired ? (
                          <Badge variant="danger" size="sm" dot>
                            Deadline Expired — Not Submitted
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm" dot>
                            Phase 1 Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewDetails(asg)}
                            title="View Details"
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPassed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectAssignment(asg.id, 'phase1')}
                            >
                              Review
                            </Button>
                          ) : isPhase2 ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onSelectAssignment(asg.id, 'phase2')}
                              icon={Bug}
                            >
                              Start Phase 2
                            </Button>
                          ) : isWaitingFacultyUnlock ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectAssignment(asg.id, 'phase1')}
                            >
                              Waiting for Faculty
                            </Button>
                          ) : isDeadlineExpired ? (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled
                              icon={Lock}
                            >
                              Deadline Expired
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onSelectAssignment(asg.id, 'phase1')}
                              icon={Play}
                            >
                              Start Phase 1
                            </Button>
                          )}

                          <RowActionMenu
                            fadeOnHover={false}
                            items={[
                              {
                                label: 'View Problem Details',
                                icon: Eye,
                                onClick: () => onViewDetails(asg),
                              },
                              {
                                label: isPassed
                                  ? 'Review Attempt'
                                  : isPhase2
                                  ? 'Start Phase 2'
                                  : isWaitingFacultyUnlock
                                  ? 'View Phase 1 Submission'
                                  : isDeadlineExpired
                                  ? 'Deadline Expired (Cannot Submit)'
                                  : 'Start Phase 1',
                                icon: isPhase2 ? Bug : isDeadlineExpired ? Lock : Play,
                                disabled: isDeadlineExpired,
                                onClick: () => {
                                  if (isDeadlineExpired) return;
                                  onSelectAssignment(asg.id, isPhase2 ? 'phase2' : 'phase1');
                                },
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
