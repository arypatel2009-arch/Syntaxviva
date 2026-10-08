import React from 'react';
import {
  Code2,
  FileCheck2,
  Bug,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Cpu,
  Eye,
} from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface HowItWorksPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate, onOpenAuth }) => {
  const steps = [
    {
      number: '01',
      title: 'Create Assignment',
      subtitle: 'Faculty Authoring',
      description:
        'Faculty set up the assessment by specifying the problem title, description, language restrictions (Python, JS, TS, Java, C++, C), starter code, and comprehensive deterministic test suites with public and hidden cases.',
      icon: Code2,
      highlights: [
        'Multi-language language runtime configuration',
        'Custom starter templates and input parameters',
        'Strict deterministic test suite specifications',
      ],
    },
    {
      number: '02',
      title: 'Student Submits Solution',
      subtitle: 'Phase 1: Initial Implementation',
      description:
        'Students open the assignment in our distraction-free, browser-based coding environment. They write their code, execute against public test cases, inspect output, and perform their initial Phase 1 submission.',
      icon: FileCheck2,
      highlights: [
        'Browser-based syntax highlighted editor',
        'Real-time compiler & interpreter feedback',
        'Direct submission into the deterministic evaluation pipeline',
      ],
    },
    {
      number: '03',
      title: 'Interactive Debug Challenge',
      subtitle: 'Phase 2: Verifiable Comprehension',
      description:
        'Instead of unreliable AI text detectors, SyntaXViva introduces a single targeted bug into the student’s own submission. The student is challenged to locate, diagnose, and repair the bug within a timed window under proctoring.',
      icon: Bug,
      highlights: [
        'Deterministic mutation engine targeting specific AST nodes',
        'Time-boxed 5-minute debugging sprint',
        'Proctoring rules preventing unauthorized devices or proxy test-takers',
      ],
    },
    {
      number: '04',
      title: 'Deterministic Verification & Results',
      subtitle: 'Automated Proof of Understanding',
      description:
        'The repaired solution is executed in an isolated sandbox against all validation suites. If the student fixes their own mutated code, they prove authentic understanding without any guesswork or AI hallucination.',
      icon: Award,
      highlights: [
        '100% deterministic test-based grading (Non-AI)',
        'Comprehensive execution diagnostic report generated',
        'Terminal attempt locking guarantees test integrity',
      ],
    },
  ];

  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span>The SyntaXViva Methodology</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            How SyntaXViva Works
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            A simple 4-step process designed to build, assess, and authentically verify coding
            comprehension across technical institutions.
          </p>
        </div>

        {/* Steps Detailed Cards */}
        <div className="space-y-12 max-w-5xl mx-auto">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="bg-slate-50/80 rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-2xs hover:shadow-md transition duration-200 flex flex-col md:flex-row gap-8 items-start"
            >
              {/* Step Number & Icon */}
              <div className="flex md:flex-col items-center gap-4 shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-mono font-extrabold text-2xl shadow-md shadow-emerald-600/20">
                  {step.number}
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <step.icon className="w-5 h-5" />
                </div>
              </div>

              {/* Step Content */}
              <div className="space-y-3 grow">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 font-mono">
                    {step.subtitle}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{step.title}</h2>
                <p className="text-slate-600 text-base leading-relaxed">{step.description}</p>

                <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {step.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-20 max-w-3xl mx-auto text-center bg-gradient-to-br from-emerald-900 to-slate-950 text-white p-10 rounded-3xl shadow-xl space-y-5">
          <h3 className="text-2xl sm:text-3xl font-bold">Ready to try it for your department?</h3>
          <p className="text-emerald-100/80 text-sm max-w-lg mx-auto">
            Experience our deterministic evaluation engine and proctored viva challenge in action.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenAuth('signup')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border-0"
              icon={ArrowRight}
              iconPosition="right"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
