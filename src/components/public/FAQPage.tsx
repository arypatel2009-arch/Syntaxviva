import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface FAQPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const FAQPage: React.FC<FAQPageProps> = ({ onNavigate, onOpenAuth }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is SyntaXViva?',
      a: 'SyntaXViva is a next-generation computer science assessment platform designed for engineering colleges and universities. Rather than guessing if a student used AI to write code, SyntaXViva uses a controlled mutation engine to inject a single targeted bug into the student’s own submission, challenging them to debug and repair it in a live, timed viva.',
    },
    {
      q: 'How does the evaluation work?',
      a: 'All evaluations are 100% deterministic and sandbox-executed. SyntaXViva executes the student’s repaired code against predefined unit test cases (both public visible tests and hidden verification tests). If all test cases pass within the execution timeout, the challenge is marked as PASSED.',
    },
    {
      q: 'Is it suitable for all programming languages?',
      a: 'Yes! SyntaXViva currently supports Python, JavaScript, TypeScript, Java, C++, and C with syntax-highlighted editing, isolated containerized execution, and targeted AST mutation rules tailored for each language.',
    },
    {
      q: 'Can professors and faculty create custom assignments?',
      a: 'Absolutely. Faculty have full control over assignment creation. You can provide custom problem statements, starter templates, memory/time limits, and define as many public or hidden test cases as needed.',
    },
    {
      q: 'How does the camera proctoring system work?',
      a: 'SyntaXViva uses privacy-first, on-device vision detection. Small natural face movements are ignored. Moderate deviations trigger polite warnings. A multi-warning system allows up to 3 warnings before locking, while critical violations such as detecting a mobile phone or 2+ faces immediately terminate and lock the attempt.',
    },
    {
      q: 'Can we integrate with our university LMS (Moodle, Blackboard, Canvas)?',
      a: 'Yes, our Institution & University plan supports LTI (Learning Tools Interoperability) standards, enabling single sign-on (SSO), roster sync, and direct gradebook writeback for Moodle, Blackboard, and Canvas.',
    },
    {
      q: 'What happens if a student fails the Phase 2 challenge?',
      a: 'The attempt state is permanently recorded as FAILED and locked to guarantee examination integrity. Faculty can review the full diagnostic log, including the original code, the injected mutation, the student’s diff, and any proctoring violation timestamps.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about the SyntaXViva platform, methodology, and security.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden"
                >
                  <span className="text-base sm:text-lg font-bold text-slate-900">{faq.q}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 text-sm leading-relaxed border-t border-emerald-100/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="mt-16 text-center bg-slate-50 border border-slate-200 p-8 rounded-3xl space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Still have questions?</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Our engineering education team is ready to answer your technical and pedagogical questions.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('/contact')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
