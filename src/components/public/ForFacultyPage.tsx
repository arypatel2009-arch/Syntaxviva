import React from 'react';
import {
  Users,
  CheckCircle2,
  BookOpen,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface ForFacultyPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const ForFacultyPage: React.FC<ForFacultyPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
              <Users className="w-4 h-4 text-blue-600" />
              <span>For Professors, Instructors & TAs</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Empower Your Teaching. <br />
              <span className="text-emerald-600">Ensure Authentic Learning.</span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed">
              Create meaningful programming assessments, track student mastery with objective
              metrics, and reclaim your weekends from tedious manual viva examinations.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Instant assignment authoring with starter code and custom test suites',
                'Automated viva verification proves the student actually understands their code',
                'Comprehensive class analytics highlight concepts students struggle with most',
                'Audit-proof examination logs ready for university accreditation boards',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onOpenAuth('signup')}
                icon={ArrowRight}
                iconPosition="right"
              >
                Join as Faculty
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onNavigate('/features')}
              >
                View Assessment Features
              </Button>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  FACULTY PORTAL OVERVIEW
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  Active Term
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400">Viva Protocol</span>
                  <div className="text-base font-bold font-mono text-white mt-1">Deterministic</div>
                  <span className="text-[11px] text-emerald-400 font-medium">Non-AI Execution</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400">Fault Injection</span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">AST Mutation</div>
                  <span className="text-[11px] text-slate-400 font-medium">Per-Student Flaw</span>
                </div>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Assessment Verification</span>
                  <span className="text-emerald-400 font-mono">Live Sandbox</span>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Automated test suites verify bug fixes in real time under proctored browser controls.
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Zero AI detector hallucination</span>
                <span className="text-emerald-400 font-semibold">100% Code Proof</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Pillars for Faculty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-7 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Streamline Lab Evaluations</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Eliminate hours of repetitive one-on-one student questioning. SyntaXViva administers the
              viva challenge automatically and gives you reliable scores.
            </p>
          </div>

          <div className="bg-slate-50 p-7 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Pinpoint Knowledge Gaps</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Identify exactly which mutation types or algorithmic edge cases stump your cohort so you
              can review them in lecture.
            </p>
          </div>

          <div className="bg-slate-50 p-7 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Indisputable Evidence</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              No student can claim an AI false accusation. Every grade is anchored in actual test cases
              executed on their repaired code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
