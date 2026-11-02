import React, { useState, useEffect } from 'react';
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
  Maximize2,
  CheckCircle,
  Flame,
  HelpCircle,
  Terminal,
  Copy,
  Check,
  FileCode,
  Columns3,
  Columns2,
  ArrowRightLeft,
} from 'lucide-react';
import { Button, Badge } from './UIComponents.tsx';
import { api } from '../../lib/api.ts';

interface LargeSubmissionResultModalProps {
  submission: any;
  onClose: () => void;
}

export const LargeSubmissionResultModal: React.FC<LargeSubmissionResultModalProps> = ({
  submission,
  onClose,
}) => {
  const [codeSubTab, setCodeSubTab] = useState<'three_way' | 'student_vs_solution' | 'phase1_vs_student' | 'solution_only' | 'phase2_bugs' | 'phase1_orig' | 'repaired'>('three_way');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [loadedOriginalCode, setLoadedOriginalCode] = useState<string>('');
  const [loadedSolutionCode, setLoadedSolutionCode] = useState<string>('');

  useEffect(() => {
    const hasOriginal = Boolean(
      submission?.originalCode ||
      submission?.original_code ||
      submission?.phase1Code ||
      submission?.baselineCode
    );
    const targetAsgId = submission?.assignmentId || submission?.assignment_id;
    if (!hasOriginal && targetAsgId) {
      api.getStudentPhase1(targetAsgId).then((p1) => {
        const orig = p1?.submission?.originalCode || (p1 as any)?.attempt?.original_code;
        if (orig) setLoadedOriginalCode(orig);
        const starter = (p1 as any)?.assignment?.starter_code || (p1 as any)?.assignment?.starterCode;
        if (starter) setLoadedSolutionCode(starter);
      }).catch(() => {});
    }
  }, [submission]);

  const handleCopy = (text: string, section: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {}
  };

  if (!submission) return null;

  const isPassed = submission.state === 'PASSED' || submission.phase2Status === 'PASSED';
  const isFailed = submission.state === 'PHASE2_FAILED' || submission.phase2Status === 'FAILED';
  const isTerminated = submission.state === 'SECURITY_TERMINATED' || submission.phase2Status === 'SECURITY_TERMINATED';

  const evaluation = submission.evaluation || {};
  const securityEvents = Array.isArray(submission.securityEvents) ? submission.securityEvents : [];
  
  const rawMutations =
    Array.isArray(submission.bugMutations) && submission.bugMutations.length > 0
      ? submission.bugMutations
      : Array.isArray(submission.bugs) && submission.bugs.length > 0
      ? submission.bugs
      : Array.isArray(submission.evaluation?.bugReports) && submission.evaluation.bugReports.length > 0
      ? submission.evaluation.bugReports
      : Array.isArray(submission.bugReports) && submission.bugReports.length > 0
      ? submission.bugReports
      : [];

  const bugMutations = rawMutations.map((m: any, idx: number) => {
    const lineNo = Number(m.line_number || m.lineNumber || m.location?.line || 1);
    const isBugFixed = isPassed || Boolean(m.fixed || m.isFixed || m.status === 'FIXED');
    return {
      ...m,
      line_number: lineNo,
      lineNumber: lineNo,
      mutation_type: m.mutation_type || m.mutationType || m.name || `Injected Defect #${idx + 1}`,
      title: m.title || m.name || `Defect #${m.bugIndex || idx + 1}`,
      description: m.description || m.explanation || '',
      mutated_fragment: m.mutated_fragment || m.mutatedFragment || m.mutated_line || '',
      original_fragment: m.original_fragment || m.originalFragment || '',
      fixed: isBugFixed,
      isFixed: isBugFixed,
    };
  });

  const rawOriginal = (
    submission.originalCode ||
    submission.original_code ||
    submission.phase1Code ||
    submission.baselineCode ||
    loadedOriginalCode ||
    ''
  ).trim();

  const rawRepaired = (
    submission.repairedCode ||
    submission.repaired_code ||
    submission.finalCode ||
    submission.submittedCode ||
    submission.challenge?.repairedCode ||
    ''
  ).trim();

  const rawMutated = (
    submission.mutatedCode ||
    submission.mutated_code ||
    submission.challenge?.mutatedCode ||
    ''
  ).trim();

  const rawSolution = (
    submission.solutionCode ||
    submission.referenceSolution ||
    submission.expectedSolution ||
    submission.assignmentStarterCode ||
    submission.starterCode ||
    loadedSolutionCode ||
    ''
  ).trim();

  // If student passed (100%), their final repaired code OR verified phase 1 baseline is the correct solution!
  const effectiveSolution = rawSolution || rawOriginal || (isPassed ? rawRepaired : '') || '';
  const effectiveOriginal = rawOriginal || (isPassed ? rawRepaired : '') || effectiveSolution || '';

  const originalCode = effectiveOriginal || '// No Phase 1 baseline code recorded.';
  const mutatedCode = rawMutated || '// No mutated code recorded.';
  const repairedCode = rawRepaired || '// No repaired code submitted.';
  const solutionCode = effectiveSolution || '// No reference solution recorded.';

  // Split lines for line-by-line inspection with wavy underlines
  const mutatedLines = mutatedCode.split('\n');
  const bugLineNumbers = new Set(bugMutations.map((m: any) => Number(m.line_number || m.lineNumber)).filter(Boolean));

  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Attempt ID', submission.id || ''],
      ['Assignment', submission.assignmentTitle || ''],
      ['Student Name', submission.studentName || ''],
      ['Student Email', submission.studentEmail || ''],
      ['Roll Number', submission.studentRollNumber || '—'],
      ['Division', submission.studentDivisionId || '—'],
      ['Status', isPassed ? 'Passed' : isFailed ? 'Failed' : submission.state || 'Submitted'],
      ['Final Score', submission.score !== null ? `${submission.score}%` : '—'],
      ['Tests Passed', evaluation.testsPassed ?? (isPassed ? 1 : 0)],
      ['Tests Total', evaluation.testsTotal ?? (isPassed ? 1 : 1)],
      ['Submitted At', submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('en-IN') : '—'],
      ['Summary', submission.summary || 'Viva evaluation completed.'],
      ['Mistake / Failure Notes', submission.failureReason || 'None'],
    ];

    const csvContent = BOM + [headers.join(','), ...rows.map((r) => `"${r[0]}","${(r[1] + '').replace(/"/g, '""')}"`)].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (submission.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${safeName}_Full_Result_Dossier_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-[98vw] max-w-[1600px] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Header (Badi Screen Top Bar) */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border shadow-2xs ${
                  isPassed
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isFailed
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isFailed && <XCircle className="w-4 h-4 text-rose-600" />}
                {!isPassed && !isFailed && <Clock className="w-4 h-4 text-amber-600" />}
                <span>{isPassed ? 'Passed (100%)' : isFailed ? 'Failed (0%)' : `Submitted (${submission.score ?? 0}%)`}</span>
              </span>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {submission.assignmentTitle || 'Assignment Review'}
              </h2>
              <span className="text-xs font-mono text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
                Language: {submission.assignmentLanguage || submission.language || 'python'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {submission.studentName || 'Student'}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-700">Roll: {submission.studentRollNumber || '—'}</span>
              <span>•</span>
              <span className="font-semibold text-blue-700">Div: {submission.studentDivisionId || 'DIV A'}</span>
              <span>•</span>
              <span className="text-slate-500">{submission.studentEmail}</span>
              <span>•</span>
              <span className="font-medium text-emerald-700">
                {submission.submittedAt
                  ? `Submitted on ${new Date(submission.submittedAt).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })} at ${new Date(submission.submittedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Recent Submission'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={FileSpreadsheet}
              onClick={handleExportCSV}
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
            >
              Export Excel
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              title="Close Full Screen Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inspection Body */}
        <div className="p-6 overflow-y-auto grow space-y-6 bg-slate-50/50">
          <div className="space-y-4">
              {/* Code Sub-tabs Switcher */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-bold flex-wrap">
                  <button
                    onClick={() => setCodeSubTab('three_way')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      codeSubTab === 'three_way'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3-Way Comparison (Phase 1 | Student Code | Solution)</span>
                  </button>
                  <button
                    onClick={() => setCodeSubTab('student_vs_solution')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      codeSubTab === 'student_vs_solution'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Student Code vs Solution</span>
                  </button>
                  <button
                    onClick={() => setCodeSubTab('phase1_vs_student')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      codeSubTab === 'phase1_vs_student'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Phase 1 vs Student Code</span>
                  </button>
                  <button
                    onClick={() => setCodeSubTab('solution_only')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      codeSubTab === 'solution_only'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Solution Only
                  </button>
                  <button
                    onClick={() => setCodeSubTab('repaired')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      codeSubTab === 'repaired'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Student Code Only
                  </button>
                  <button
                    onClick={() => setCodeSubTab('phase1_orig')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      codeSubTab === 'phase1_orig'
                        ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Phase 1 Only
                  </button>
                  <button
                    onClick={() => setCodeSubTab('phase2_bugs')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      codeSubTab === 'phase2_bugs'
                        ? 'bg-white text-rose-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Injected Bugs
                  </button>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Phase 1 Baseline
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Student's Phase 2 Code
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Correct Solution
                  </span>
                </div>
              </div>

              {/* 1. THREE-WAY SIDE-BY-SIDE COMPLETE CODE COMPARISON */}
              {codeSubTab === 'three_way' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 items-stretch">
                  {/* Column 1: Phase 1 Baseline Code */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            <span>1. Phase 1 Baseline Code</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            Student's initial verified submission
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          Original (Pre-Bug)
                        </span>
                        <button
                          onClick={() => handleCopy(originalCode, 'p1')}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                          title="Copy Phase 1 Code"
                        >
                          {copiedSection === 'p1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {originalCode.split('\n').map((line: string, idx: number) => (
                        <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                          <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-slate-200 whitespace-pre">{line || ' '}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Student's Repaired Code (Phase 2 Submission) */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            <span>2. Student's Submitted Code</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            Phase 2 defense submission
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          }`}
                        >
                          {isPassed ? 'All Defects Resolved' : 'Defects Missed (0%)'}
                        </span>
                        <button
                          onClick={() => handleCopy(repairedCode, 'p2')}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                          title="Copy Student Code"
                        >
                          {copiedSection === 'p2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {repairedCode.split('\n').map((line: string, idx: number) => {
                        const lineNum = idx + 1;
                        const isMissedBugLine = isFailed && bugLineNumbers.has(lineNum);
                        return (
                          <div
                            key={lineNum}
                            className={`flex items-start py-0.5 px-1.5 rounded-sm ${
                              isMissedBugLine
                                ? 'bg-rose-950/40 border-l-2 border-rose-500 text-rose-200'
                                : 'hover:bg-slate-900/60 text-slate-200'
                            }`}
                          >
                            <span
                              className={`w-8 shrink-0 select-none text-right pr-2 text-[11px] font-mono ${
                                isMissedBugLine ? 'text-rose-400 font-bold' : 'text-slate-600'
                              }`}
                            >
                              {lineNum}
                            </span>
                            <span className={`whitespace-pre ${isMissedBugLine ? 'underline decoration-wavy decoration-rose-500' : ''}`}>
                              {line || ' '}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3: Correct Bug-Free Solution Code */}
                  <div className="bg-slate-900 rounded-2xl border border-emerald-700/60 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-emerald-950/60 border-b border-emerald-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-emerald-100 flex items-center gap-1.5">
                            <span>3. Correct Solution Code</span>
                          </div>
                          <div className="text-[10px] text-emerald-400/80 font-sans">
                            Verified bug-free reference implementation
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          100% Correct Solution
                        </span>
                        <button
                          onClick={() => handleCopy(solutionCode, 'sol')}
                          className="p-1 rounded hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-200 transition cursor-pointer"
                          title="Copy Solution Code"
                        >
                          {copiedSection === 'sol' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {solutionCode.split('\n').map((line: string, idx: number) => (
                        <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                          <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-emerald-200/90 whitespace-pre">{line || ' '}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. STUDENT CODE VS CORRECT SOLUTION (SIDE-BY-SIDE 2-WAY) */}
              {codeSubTab === 'student_vs_solution' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Student Code */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-100">Student's Submitted Code</div>
                          <div className="text-[10px] text-slate-400">Phase 2 defense submission</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(repairedCode, 'p2')}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Copy Student Code"
                      >
                        {copiedSection === 'p2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {repairedCode.split('\n').map((line: string, idx: number) => {
                        const lineNum = idx + 1;
                        const isMissedBugLine = isFailed && bugLineNumbers.has(lineNum);
                        return (
                          <div
                            key={lineNum}
                            className={`flex items-start py-0.5 px-1.5 rounded-sm ${
                              isMissedBugLine ? 'bg-rose-950/40 border-l-2 border-rose-500 text-rose-200' : 'hover:bg-slate-900/60 text-slate-200'
                            }`}
                          >
                            <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                              {lineNum}
                            </span>
                            <span className={`whitespace-pre ${isMissedBugLine ? 'underline decoration-wavy decoration-rose-500' : ''}`}>
                              {line || ' '}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Correct Solution */}
                  <div className="bg-slate-900 rounded-2xl border border-emerald-700/60 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-emerald-950/60 border-b border-emerald-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-emerald-100">Correct Solution Code</div>
                          <div className="text-[10px] text-emerald-400/80">Verified bug-free reference implementation</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(solutionCode, 'sol')}
                        className="p-1 rounded hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-200 transition cursor-pointer"
                        title="Copy Solution Code"
                      >
                        {copiedSection === 'sol' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {solutionCode.split('\n').map((line: string, idx: number) => (
                        <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                          <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-emerald-200/90 whitespace-pre">{line || ' '}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PHASE 1 BASELINE VS STUDENT CODE (SIDE-BY-SIDE 2-WAY) */}
              {codeSubTab === 'phase1_vs_student' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Phase 1 Code */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-100">Phase 1 Baseline Code</div>
                          <div className="text-[10px] text-slate-400">Student's original submission</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(originalCode, 'p1')}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Copy Phase 1 Code"
                      >
                        {copiedSection === 'p1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {originalCode.split('\n').map((line: string, idx: number) => (
                        <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                          <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-slate-200 whitespace-pre">{line || ' '}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Student's Phase 2 Code */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-100">Student's Submitted Code</div>
                          <div className="text-[10px] text-slate-400">Phase 2 defense submission</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(repairedCode, 'p2')}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Copy Student Code"
                      >
                        {copiedSection === 'p2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {repairedCode.split('\n').map((line: string, idx: number) => {
                        const lineNum = idx + 1;
                        const isMissedBugLine = isFailed && bugLineNumbers.has(lineNum);
                        return (
                          <div
                            key={lineNum}
                            className={`flex items-start py-0.5 px-1.5 rounded-sm ${
                              isMissedBugLine ? 'bg-rose-950/40 border-l-2 border-rose-500 text-rose-200' : 'hover:bg-slate-900/60 text-slate-200'
                            }`}
                          >
                            <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                              {lineNum}
                            </span>
                            <span className={`whitespace-pre ${isMissedBugLine ? 'underline decoration-wavy decoration-rose-500' : ''}`}>
                              {line || ' '}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. INJECTED DEFECTS DIAGNOSTIC VIEW */}
              {codeSubTab === 'phase2_bugs' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left (7 cols): Mutated Code */}
                  <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-rose-900/60 shadow-md overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-rose-950/60 border-b border-rose-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-xs font-bold text-rose-100">Mutated Code (With Injected Bugs)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        {bugMutations.length || 3} Defects Injected
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh] grow">
                      {mutatedLines.map((line, idx) => {
                        const lineNum = idx + 1;
                        const isBugLine = bugLineNumbers.has(lineNum);
                        return (
                          <div
                            key={lineNum}
                            className={`flex items-start py-0.5 px-1.5 rounded-sm ${
                              isBugLine ? 'bg-rose-950/60 border-l-2 border-rose-500 text-rose-200' : 'hover:bg-slate-900/60 text-slate-300'
                            }`}
                          >
                            <span className={`w-8 shrink-0 select-none text-right pr-2 text-[11px] font-mono ${
                              isBugLine ? 'text-rose-400 font-bold' : 'text-slate-600'
                            }`}>
                              {lineNum}
                            </span>
                            <span className={`whitespace-pre ${isBugLine ? 'underline decoration-wavy decoration-rose-500 font-semibold' : ''}`}>
                              {line || ' '}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right (5 cols): Defect Callout Cards */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="text-xs font-bold text-slate-800">Injected Defects Breakdown</div>
                    {bugMutations.map((m: any, idx: number) => {
                      const lineNo = Number(m.line_number || m.lineNumber || 1);
                      return (
                        <div key={idx} className="bg-white rounded-xl border border-rose-200 p-3.5 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{m.title || m.name || `Defect #${idx + 1}`}</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border">
                              Line {lineNo}
                            </span>
                          </div>
                          {m.description && (
                            <p className="text-[11px] text-slate-600 leading-relaxed">{m.description}</p>
                          )}
                          <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                            {m.mutated_fragment && (
                              <div className="p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
                                <span className="text-[10px] uppercase font-sans font-bold text-rose-700">Injected Bug:</span>
                                <code>{m.mutated_fragment}</code>
                              </div>
                            )}
                            {m.original_fragment && (
                              <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                                <span className="text-[10px] uppercase font-sans font-bold text-emerald-700">Expected Fix:</span>
                                <code>{m.original_fragment}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. CORRECT SOLUTION CODE ALONE */}
              {codeSubTab === 'solution_only' && (
                <div className="bg-slate-900 rounded-2xl border border-emerald-700/60 shadow-md overflow-hidden flex flex-col max-w-5xl mx-auto">
                  <div className="px-4 py-2.5 bg-emerald-950/60 border-b border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-100">Correct Bug-Free Solution Code</span>
                    </div>
                    <button
                      onClick={() => handleCopy(solutionCode, 'sol')}
                      className="p-1 rounded hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-200 transition cursor-pointer"
                      title="Copy Solution Code"
                    >
                      {copiedSection === 'sol' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh]">
                    {solutionCode.split('\n').map((line: string, idx: number) => (
                      <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                        <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-emerald-200/90 whitespace-pre">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. STUDENT REPAIRED CODE ALONE */}
              {codeSubTab === 'repaired' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col max-w-5xl mx-auto">
                  <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-100">Student's Repaired Code (Phase 2 Submission)</span>
                    </div>
                    <button
                      onClick={() => handleCopy(repairedCode, 'p2')}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      title="Copy Student Code"
                    >
                      {copiedSection === 'p2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh]">
                    {repairedCode.split('\n').map((line: string, idx: number) => (
                      <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                        <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-slate-200 whitespace-pre">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. PHASE 1 BASELINE CODE ALONE */}
              {codeSubTab === 'phase1_orig' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-md overflow-hidden flex flex-col max-w-5xl mx-auto">
                  <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-100">Phase 1 Baseline Code (Original Submission)</span>
                    </div>
                    <button
                      onClick={() => handleCopy(originalCode, 'p1')}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      title="Copy Phase 1 Code"
                    >
                      {copiedSection === 'p1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3.5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[60vh]">
                    {originalCode.split('\n').map((line: string, idx: number) => (
                      <div key={idx + 1} className="flex items-start py-0.5 px-1.5 hover:bg-slate-900/60 rounded-sm">
                        <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-2 text-[11px] font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-slate-200 whitespace-pre">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>SyntaXViva Large Forensic Code Reviewer</span>
          <Button variant="primary" size="sm" onClick={onClose} className="text-xs font-bold">
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};
