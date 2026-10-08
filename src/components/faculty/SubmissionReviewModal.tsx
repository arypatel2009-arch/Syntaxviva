import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  Bug,
  ShieldCheck,
  Award,
  Download,
  Clock,
  User,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '../common/UIComponents.tsx';

interface SubmissionReviewModalProps {
  submission: any;
  onClose: () => void;
}

export const SubmissionReviewModal: React.FC<SubmissionReviewModalProps> = ({
  submission,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'tests' | 'forensics'>('diff');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  if (!submission) return null;

  const isPassed = submission.state === 'PHASE2_PASSED' || submission.phase2Status === 'PASSED';
  const isFailed = submission.state === 'PHASE2_FAILED' || submission.phase2Status === 'FAILED';
  const isTerminated = submission.state === 'SECURITY_TERMINATED' || submission.phase2Status === 'SECURITY_TERMINATED';

  const challenge = submission.challenge || {};
  const evaluation = submission.evaluation || {};
  const testResults = Array.isArray(evaluation.testResults) ? evaluation.testResults : [];
  const securityEvents = Array.isArray(submission.securityEvents) ? submission.securityEvents : [];

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(submission, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit-dossier-${submission.id || 'submission'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setDownloadNotice('Audit dossier JSON exported.');
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Attempt ID', submission.id || ''],
      ['Assignment', submission.assignmentTitle || ''],
      ['Student Name', submission.studentName || ''],
      ['Student Email', submission.studentEmail || ''],
      ['Roll Number', submission.studentRollNumber || ''],
      ['Status', submission.state || submission.phase2Status || ''],
      [
        'Submitted At (Day, Date & Time)',
        submission.submittedAt
          ? `${new Date(submission.submittedAt).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })} ${new Date(submission.submittedAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}`
          : '',
      ],
      ['Mutation Injected', challenge.mutationType || 'N/A'],
      ['Tests Passed', evaluation.testsPassed ?? 'N/A'],
      ['Tests Total', evaluation.testsTotal ?? 'N/A'],
      ['Failure Reason', submission.failureReason || 'None'],
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => `"${r[0]}","${(r[1] + '').replace(/"/g, '""')}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `submission-audit-${submission.id || 'attempt'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadNotice('Audit dossier CSV exported.');
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  let aiEval: any = null;
  if (submission.evaluationResultJson) {
    try {
      aiEval = JSON.parse(submission.evaluationResultJson);
    } catch {
      aiEval = null;
    }
  } else if (evaluation.executionMetadataJson) {
    try {
      aiEval = JSON.parse(evaluation.executionMetadataJson);
    } catch {
      aiEval = null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={isPassed ? 'success' : isTerminated || isFailed ? 'danger' : 'neutral'}
                size="sm"
              >
                {isPassed
                  ? 'Passed Viva'
                  : isFailed
                  ? 'Failed Viva'
                  : isTerminated
                  ? 'Exam Cancelled'
                  : submission.state || 'Attempt'}
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                Attempt #{submission.id || 'N/A'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {submission.assignmentTitle || 'Assignment Review'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {submission.studentName || 'Student'}{' '}
                {submission.studentRollNumber ? `(${submission.studentRollNumber})` : ''}
              </span>
              <span>•</span>
              <span>{submission.studentEmail}</span>
              <span>•</span>
              <span className="font-medium text-emerald-700">
                {submission.submittedAt
                  ? `${new Date(submission.submittedAt).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })} • ${new Date(submission.submittedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`
                  : 'Recent Submission'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex gap-4 text-xs font-semibold">
          {[
            { id: 'diff', label: 'Code & Mutation Diff', icon: Bug },
            { id: 'tests', label: `Gemini AI Evaluation (${aiEval?.score !== undefined ? `Score: ${aiEval.score}` : isPassed ? 'PASS' : 'REVIEW'})`, icon: Sparkles },
            { id: 'forensics', label: 'Forensics & Audit Trail', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {isTerminated && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-950 uppercase tracking-wider text-[11px]">
                  Exam Cancelled — Reason for Cancellation
                </div>
                <p className="font-semibold text-sm text-rose-800">
                  {submission.failureReason ||
                    'Exam Cancelled: Student pressed Back, minimized window, or closed browser tab.'}
                </p>
                <p className="text-rose-700/90 text-[11px]">
                  This student&apos;s assignment attempt was automatically cancelled and locked by the proctoring system when they left, minimized, or closed the active assignment screen.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">
                  Injected Mutation: {challenge.mutationType || 'AST Program Mutation'}
                </span>
                <p className="text-amber-800 leading-relaxed">
                  {challenge.mutationMetadata?.description ||
                    'A deterministic single-token AST mutation was injected into the original code. The student had to identify and correct this defect.'}
                </p>
                {challenge.mutationMetadata?.sourceLocation && (
                  <div className="text-[11px] font-mono text-amber-700 mt-1">
                    Location: Line {challenge.mutationMetadata.sourceLocation.line}, Col {challenge.mutationMetadata.sourceLocation.column}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 font-mono">
                      Injected Buggy Code (Given to Student)
                    </span>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-900 text-rose-200 font-mono text-xs overflow-x-auto border border-rose-900/60 max-h-96">
                    <code>{challenge.mutatedCode || '// No mutated challenge code recorded'}</code>
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 font-mono">
                      Student Submitted Solution
                    </span>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto border border-emerald-900/60 max-h-96">
                    <code>{submission.submittedCode || challenge.repairedCode || '// No student submission code recorded'}</code>
                  </pre>
                </div>
              </div>

              {submission.originalCode && (
                <div className="pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono block mb-1.5">
                    Original Reference Solution (Phase 1 Baseline)
                  </span>
                  <pre className="p-4 rounded-2xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800 max-h-60">
                    <code>{submission.originalCode}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" /> Server-Side Gemini AI Code Evaluation
                  </span>
                  <p className="text-slate-600 mt-1">
                    Automated AI evaluation of student source code against assignment requirements and Phase 1 baseline.
                  </p>
                </div>
                {aiEval?.score !== undefined && (
                  <div className="text-right shrink-0">
                    <span className="text-xl font-mono font-extrabold text-blue-900">
                      {aiEval.score} / 100
                    </span>
                    <span className="block text-[10px] text-blue-700 uppercase font-bold">AI Score</span>
                  </div>
                )}
              </div>

              {aiEval ? (
                <div className="p-5 rounded-2xl border bg-white space-y-4 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                      Evaluation Outcome
                    </span>
                    <Badge variant={aiEval.is_correct || aiEval.result === 'PASS' ? 'success' : 'danger'}>
                      {aiEval.result || (aiEval.is_correct ? 'PASS' : 'FAIL')}
                    </Badge>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800 leading-relaxed">
                    {aiEval.summary}
                  </div>

                  {Array.isArray(aiEval.issues) && aiEval.issues.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="font-bold text-rose-800 text-[11px] uppercase tracking-wider">Identified Issues</span>
                      <ul className="list-disc list-inside text-rose-900 space-y-1">
                        {aiEval.issues.map((issue: string, idx: number) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(aiEval.suggestions) && aiEval.suggestions.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Suggestions for Improvement</span>
                      <ul className="list-disc list-inside text-slate-800 space-y-1">
                        {aiEval.suggestions.map((sugg: string, idx: number) => (
                          <li key={idx}>{sugg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  {submission.failureReason || 'No detailed AI evaluation recorded for this attempt.'}
                </div>
              )}
            </div>
          )}

          {activeTab === 'forensics' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Security &amp; Integrity Standing</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {isTerminated
                    ? `Exam was cancelled due to security violation: ${submission.failureReason || 'Student left or minimized the assignment window'}.`
                    : 'Session completed within full integrity parameters. Tab switches and focus transitions were logged.'}
                </p>
                {submission.failureReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[11px]">
                    Cancellation / Failure Reason: {submission.failureReason}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Security Audit Events</h4>
                {securityEvents.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                    No security warning events or focus breaches recorded during this attempt.
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-[11px]">
                    {securityEvents.map((evt: any, idx: number) => {
                      const eventTime = evt.serverTimestamp || evt.createdAt || evt.timestamp;
                      const eventReason = evt.reason || evt.metadata?.reason || evt.metadata?.action;
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-900">{evt.eventType}</span>
                              {eventReason && (
                                <div className="text-rose-700 font-sans font-medium mt-0.5">
                                  {eventReason}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-400 shrink-0">
                            {eventTime ? new Date(eventTime).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="md" onClick={onClose}>
              Close
            </Button>
            {downloadNotice && (
              <span className="text-xs text-emerald-700 font-medium">
                {downloadNotice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              icon={FileSpreadsheet}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExportJSON}
              icon={Download}
            >
              Export Audit JSON
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
