import React, { useState } from 'react';
import { Eye, Search, Code2 } from 'lucide-react';
import { Assignment } from '../../types/index.ts';
import { Badge, Button, RowActionMenu, EmptyState } from '../common/UIComponents.tsx';

interface StudentSubmissionsViewProps {
  assignments: Assignment[];
  onSelectAssignment: (assignmentId: string, phase?: 'phase1' | 'phase2') => void;
  onViewResults: (assignment: Assignment) => void;
}

export const StudentSubmissionsView: React.FC<StudentSubmissionsViewProps> = ({
  assignments,
  onSelectAssignment,
  onViewResults,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const submittedAssignments = assignments
    .filter((asg) => Boolean((asg as any).myAttemptState))
    .filter((asg) => asg.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Title & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Submission History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audited log of your Phase 1 and Phase 2 assignment submissions.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 w-56 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {submittedAssignments.length === 0 ? (
          <EmptyState
            title="No results found"
            description={
              searchQuery
                ? 'No submissions matched your search criteria. Try clearing filters.'
                : 'You have not submitted any assignments yet. Open an active assignment to submit your code.'
            }
            action={
              searchQuery ? (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/60 text-slate-500 font-medium uppercase tracking-wider">
                  <th className="py-3 pl-6">Assignment Title</th>
                  <th className="py-3">Language</th>
                  <th className="py-3">Submission Date</th>
                  <th className="py-3">Phase 1 Intake</th>
                  <th className="py-3">Phase 2 Result</th>
                  <th className="py-3 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submittedAssignments.map((asg) => {
                  const myState = (asg as any).myAttemptState;
                  const p2Status = (asg as any).myPhase2Status;
                  const rawSubmittedAt = (asg as any).mySubmittedAt;
                  const submittedObj = rawSubmittedAt ? new Date(rawSubmittedAt) : null;
                  const isPassed = p2Status === 'PHASE2_PASSED' || myState === 'PASSED' || myState === 'PHASE2_PASSED';
                  const isFailed = p2Status === 'PHASE2_FAILED' || p2Status === 'SECURITY_TERMINATED';

                  return (
                    <tr key={asg.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pl-6">
                        <div className="font-semibold text-slate-900 text-sm tracking-tight">{asg.title}</div>
                      </td>
                      <td className="py-3.5">
                        <span className="font-mono text-slate-600 uppercase bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md text-[10px] font-medium">
                          {asg.language}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600 whitespace-nowrap">
                        {submittedObj ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {submittedObj.toLocaleDateString('en-US', { weekday: 'long' })},{' '}
                              {submittedObj.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {submittedObj.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              })}
                            </div>
                          </div>
                        ) : (
                          'Active Attempt'
                        )}
                      </td>
                      <td className="py-3.5">
                        <Badge variant="success" size="sm" dot>
                          {myState || 'Received'}
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        {isPassed ? (
                          <Badge variant="success" size="sm" dot>
                            PASSED
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="danger" size="sm" dot>
                            {p2Status || 'FAILED'}
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>
                            {p2Status || 'In Progress'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewResults(asg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Results
                          </button>
                          <RowActionMenu
                            items={[
                              {
                                label: 'View Results Report',
                                icon: Eye,
                                onClick: () => onViewResults(asg),
                              },
                              {
                                label: 'Open Workspace',
                                icon: Code2,
                                onClick: () => onSelectAssignment(asg.id, 'phase1'),
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
