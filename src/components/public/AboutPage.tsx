import React from 'react';
import {
  ShieldCheck,
  Award,
  Users,
  Building,
  CheckCircle2,
  Code2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface AboutPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onOpenAuth }) => {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span>Our Mission & Principles</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            About SyntaXViva
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            We are on a mission to transform how computer science comprehension is assessed and
            validated in higher education worldwide.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-7 space-y-5 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Why We Built SyntaXViva
            </h2>
            <p className="text-slate-600 leading-relaxed">
              With the explosion of coding assistants and automated code generators, traditional take-home
              programming assignments have lost their ability to measure true student understanding.
              At the same time, probabilistic "AI text detectors" generate frequent false accusations,
              punishing honest students and overwhelming professors with grading disputes.
            </p>
            <p className="text-slate-600 leading-relaxed">
              SyntaXViva was founded in Ahmedabad, Gujarat, by computer science educators and software
              engineers who believed in an objective alternative: <strong>Proof of Comprehension</strong>.
              If a student truly understands the solution they submitted, they can easily locate and fix a
              minor injected flaw in a live, timed debugging viva.
            </p>
            <div className="pt-2 flex items-center gap-3 text-emerald-700 font-semibold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Real Skills. Real Proof. No Guesswork.</span>
            </div>
          </div>

          {/* Architectural Pillars Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-[#064e3b] text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-emerald-400 font-mono">ARCHITECTURAL FOUNDATION</h3>
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="border-l-2 border-emerald-400 pl-3">
                <div className="font-bold text-white">Deterministic Sandbox</div>
                <div className="text-emerald-200/80 text-xs mt-0.5">Isolated test-suite execution with strict memory and time boundaries.</div>
              </div>
              <div className="border-l-2 border-emerald-400 pl-3">
                <div className="font-bold text-white">AST Mutation Engine</div>
                <div className="text-emerald-200/80 text-xs mt-0.5">Targeted semantic fault injection tailored directly to submitted code.</div>
              </div>
              <div className="border-l-2 border-emerald-400 pl-3">
                <div className="font-bold text-white">Zero AI Hallucination</div>
                <div className="text-emerald-200/80 text-xs mt-0.5">100% test-assertion verification with no probabilistic scoring.</div>
              </div>
              <div className="border-l-2 border-emerald-400 pl-3">
                <div className="font-bold text-white">Proof of Comprehension</div>
                <div className="text-emerald-200/80 text-xs mt-0.5">Objective demonstration of debugging ability under proctored timing.</div>
              </div>
            </div>
            <div className="pt-4 border-t border-emerald-800/60 text-xs text-emerald-200/70">
              Engineered for integrity, pedagogical clarity, and equitable assessment in computer science education.
            </div>
          </div>
        </div>

        {/* 3 Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Pedagogical Integrity</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We empower students to learn genuine debugging and troubleshooting skills that prepare them
              for demanding software engineering roles.
            </p>
          </div>

          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Deterministic Objectivity</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We reject arbitrary AI-scored grades. Every evaluation is deterministic, backed by concrete
              unit test assertions and clear diagnostics.
            </p>
          </div>

          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Accessibility & Fairness</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We build browser-based tools that work on modest lab computers, ensuring high-stakes technical
              assessments are fair and accessible to all students.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-emerald-50 border border-emerald-200 p-10 rounded-3xl space-y-4 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900">Join the SyntaXViva Network</h3>
          <p className="text-slate-600 text-sm max-w-lg mx-auto">
            Ready to bring evidence-based viva assessments to your department or university?
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="primary" size="md" onClick={() => onOpenAuth('signup')}>
              Get Started Now
            </Button>
            <Button variant="outline" size="md" onClick={() => onNavigate('/contact')}>
              Contact Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
