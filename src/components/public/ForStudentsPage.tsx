import React from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Bug,
  Award,
  Terminal,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface ForStudentsPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const ForStudentsPage: React.FC<ForStudentsPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>For Engineering Students & Examinees</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Learn, Practice, Excel. <br />
              <span className="text-emerald-600">Showcase Your True Skills.</span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed">
              Get hands-on experience, sharpen your algorithmic intuition, and build indisputable
              proof of your programming abilities for professors and top engineering employers.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Interactive browser IDE with multi-language execution',
                'Hands-on debug challenges prove true code comprehension',
                'Deterministic, objective grading with zero AI false accusations',
                'Verifiable completion badges you can share on your portfolio',
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
                Join as Student
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onNavigate('/how-it-works')}
              >
                How Viva Works
              </Button>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 p-8 rounded-3xl border border-emerald-200/80 shadow-md space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-200/60">
                <span className="text-xs font-mono font-semibold text-emerald-800">
                  ASSESSMENT STAGES
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                  Deterministic
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">Stage 1: Code Solution</span>
                    <span className="text-emerald-600 font-semibold font-mono">Test Driven</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Write clean code to pass all visible and hidden deterministic test cases.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">Stage 2: Timed Viva Debug</span>
                    <span className="text-amber-700 font-semibold font-mono">AST Mutation</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Locate and fix a targeted flaw injected into your original code within the time limit.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">Stage 3: Verified Mastery</span>
                    <span className="text-emerald-700 font-semibold font-mono">Proof Generated</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Receive verified proof of authentic code comprehension without false AI accusations.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-600 font-mono">
                <span>Verification Model</span>
                <span className="font-bold text-emerald-700">100% Sandbox Assertions</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Pillars for Students */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-7 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Zero Setup Required</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              No need to configure local IDEs, compilers, or environments. Code directly in the browser
              with lightning fast feedback.
            </p>
          </div>

          <div className="bg-slate-50 p-7 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Build True Debugging Muscle</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Real world programming is 80% debugging. Our viva challenges prepare you for senior
              engineering interviews and technical rigor.
            </p>
          </div>

          <div className="bg-slate-50 p-7 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Fair, Transparent Evaluations</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every score is backed by deterministic test cases. Never suffer from unpredictable AI
              detector false positives or biased grading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
