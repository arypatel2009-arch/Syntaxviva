import React from 'react';
import {
  Code2,
  Bug,
  Cpu,
  ShieldCheck,
  Award,
  Layers,
  Terminal,
  Clock,
  Lock,
  Zap,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface FeaturesPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate, onOpenAuth }) => {
  const featureList = [
    {
      title: 'Modern Code Editor',
      category: 'Student Environment',
      desc: 'Full-featured browser IDE with instant syntax highlighting, line numbering, auto-formatting, bracket pairing, and multi-language support (Python, JS, TS, Java, C++, C).',
      icon: Code2,
      tags: ['Multi-Language', 'Zero Install', 'Fast Feedback'],
    },
    {
      title: 'Viva Debug Challenges',
      category: 'Comprehension Verification',
      desc: 'Our patent-pending Controlled Mutation Engine injects a single targeted bug into the student’s own submission, evaluating whether they truly understand their program logic.',
      icon: Bug,
      tags: ['AST Mutation', 'Targeted Flaws', 'Real Understanding'],
    },
    {
      title: 'Deterministic Sandbox Evaluation',
      category: 'Evaluation Engine',
      desc: 'Zero reliance on speculative AI detection tools. Assessment grading is 100% deterministic, executing test suites in isolated sandboxes with memory and time caps.',
      icon: Cpu,
      tags: ['Non-AI Graded', 'Objective Score', 'Isolated Runtime'],
    },
    {
      title: 'Enterprise-Grade Proctoring',
      category: 'Security & Integrity',
      desc: 'Enforces camera proctoring with multi-face detection, cell phone prohibition, and multi-strike warning policies to safeguard high-stakes exams without privacy intrusion.',
      icon: ShieldCheck,
      tags: ['Camera Verification', 'Multi-Strike Rule', 'Attempt Locking'],
    },
    {
      title: 'Comprehensive Evidence Reports',
      category: 'Audit & Accreditation',
      desc: 'Generates detailed diagnostic reports with code diffs, mutation records, timestamped event logs, and test execution outcomes suitable for university accreditation audits.',
      icon: Award,
      tags: ['PDF / Print Ready', 'Audit Compliant', 'Full Traceability'],
    },
    {
      title: 'Faculty Analytics & Insights',
      category: 'Teaching Insights',
      desc: 'Track pass rates, identify specific algorithmic concepts where students struggle, and review submissions across classes with clear visual charts.',
      icon: Layers,
      tags: ['Real-Time Stats', 'Class Breakdown', 'Exportable Logs'],
    },
    {
      title: 'Configurable Test Case Suites',
      category: 'Authoring',
      desc: 'Faculty can create visible public test cases for student self-testing alongside hidden private test cases that prevent hardcoding and overfitting.',
      icon: FileSpreadsheet,
      tags: ['Hidden Cases', 'Edge Cases', 'Custom Inputs'],
    },
    {
      title: 'Timed Sprint Architecture',
      category: 'Viva Experience',
      desc: '5-minute live countdown timer prevents reliance on external chat assistants, validating spontaneous recall and active programming skill.',
      icon: Clock,
      tags: ['Strict Deadlines', 'Auto-Lock', 'Live Countdown'],
    },
  ];

  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span>Enterprise Assessment Infrastructure</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Powerful Features for Better Learning Outcomes
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Everything universities, professors, and students need to build, assess, and prove real
            computer science mastery.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((feat) => (
            <div
              key={feat.title}
              className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-lg hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    {feat.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                {feat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center bg-slate-50 border border-slate-200 p-10 rounded-3xl space-y-4 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900">Want to see a live assessment?</h3>
          <p className="text-slate-600 text-sm max-w-lg mx-auto">
            Log in to the examinee portal or explore our faculty assignment authoring workflow.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="primary" size="md" onClick={() => onOpenAuth('signup')}>
              Get Started Now
            </Button>
            <Button variant="outline" size="md" onClick={() => onNavigate('/pricing')}>
              View Plans
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
