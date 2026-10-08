import React, { useState } from 'react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

const METHOD_STEPS = [
  {
    stepNumber: '01.',
    tabTitle: 'Create Assignment',
    tabSubtitle: 'Build controlled coding tasks.',
    title: 'assignment_builder',
    status: 'CONFIGURED',
  },
  {
    stepNumber: '02.',
    tabTitle: 'Student Submits',
    tabSubtitle: 'Code and evidence captured.',
    title: 'student_submission',
    status: 'SUBMISSION_CAPTURED',
  },
  {
    stepNumber: '03.',
    tabTitle: 'Interactive Debug Challenge',
    tabSubtitle: 'Validate understanding.',
    title: 'viva_debug_session',
    status: 'LIVE_SESSION',
  },
  {
    stepNumber: '04.',
    tabTitle: 'Deterministic Verification',
    tabSubtitle: 'Produce defensible evidence.',
    title: 'verification_engine',
    status: 'VERIFIED',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuth }) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [previewEntering, setPreviewEntering] = useState<boolean>(false);

  const handleSelectStep = (index: number) => {
    if (index === activeStep) return;
    setPreviewEntering(true);
    setTimeout(() => {
      setActiveStep(index);
      setPreviewEntering(false);
    }, 100);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentMethod = METHOD_STEPS[activeStep];

  return (
    <div id="product" className="syntaxviva-landing min-h-screen font-sans antialiased">
      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative min-h-screen pt-32 pb-20 overflow-hidden grid-bg noise">
        {/* Glow */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-500/[.055] blur-[130px] -top-48 right-[-150px]" />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
          <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-14 lg:gap-16 items-center">
            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-3.5 py-2 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold tracking-wide uppercase text-emerald-300">
                  Next-Gen Computer Science Assessment Platform
                </span>
              </div>

              <h1 className="font-display font-bold tracking-[-.045em] text-[46px] sm:text-[58px] lg:text-[67px] leading-[1.02] text-gradient">
                Build Real Coding Skills Through Smart Assessments.
              </h1>

              <p className="mt-7 max-w-xl text-[16px] sm:text-[18px] leading-8 text-slate-400">
                SyntaxViva helps educators create, conduct, and evaluate coding
                assessments with evidence-based verification and hands-on
                debug viva challenges.
              </p>

              {/* CTA */}
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <button
                  id="hero-btn-get-started"
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition shadow-xl shadow-emerald-950/30 cursor-pointer"
                >
                  Get Started Free
                  <span className="group-hover:translate-x-1 transition">→</span>
                </button>

                <a
                  id="hero-btn-how-it-works"
                  href="#methodology"
                  onClick={(e) => scrollToSection(e, 'methodology')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-white/[.02] hover:bg-white/[.05] px-6 py-3.5 text-sm font-semibold text-slate-200 transition"
                >
                  How It Works
                  <span>▷</span>
                </a>
              </div>
            </div>

            {/* RIGHT / IDE */}
            <div className="relative animate-float">
              <div className="absolute -inset-8 bg-emerald-500/[.035] blur-3xl rounded-full" />

              <div className="relative rounded-2xl border border-white/[.10] bg-[#0d131d] terminal-shadow overflow-hidden">
                {/* Window Header */}
                <div className="h-12 border-b border-white/[.07] flex items-center justify-between px-4 bg-[#111722]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      solution.py
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-md border border-red-400/20 bg-red-400/[.06] px-2.5 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="font-mono text-[9px] sm:text-[10px] text-red-300">
                      LIVE VIVA COUNTDOWN
                    </span>
                    <span className="font-mono font-semibold text-[10px] text-white">
                      04:12
                    </span>
                  </div>
                </div>

                {/* IDE Labels */}
                <div className="grid grid-cols-2 border-b border-white/[.06]">
                  <div className="px-4 py-3 border-r border-white/[.06]">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Before Mutation
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <span className="text-[10px] uppercase tracking-wider text-red-300/80">
                      After Mutation
                    </span>
                  </div>
                </div>

                {/* Code */}
                <div className="grid grid-cols-2 font-mono text-[10px] sm:text-[11px] leading-6">
                  {/* BEFORE */}
                  <div className="border-r border-white/[.06] py-3">
                    <div className="code-line">
                      <span className="line-number">01</span>
                      <span>
                        <span className="text-purple-300">def</span>
                        <span className="text-blue-300"> find_max</span>
                        <span className="text-slate-300">(nums):</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">02</span>
                      <span className="text-slate-500">    # find maximum</span>
                    </div>

                    <div className="code-line valid-line">
                      <span className="line-number">03</span>
                      <span>
                        <span className="text-slate-300">    max_val = </span>
                        <span className="text-yellow-300">nums[0]</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">04</span>
                      <span>
                        <span className="text-purple-300">    for</span>
                        <span className="text-slate-300"> value </span>
                        <span className="text-purple-300">in</span>
                        <span className="text-slate-300"> nums:</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">05</span>
                      <span>
                        <span className="text-purple-300">        if</span>
                        <span className="text-slate-300"> value &gt; max_val:</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">06</span>
                      <span className="text-slate-300">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;max_val = value
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">07</span>
                      <span>
                        <span className="text-purple-300">    return</span>
                        <span className="text-slate-300"> max_val</span>
                      </span>
                    </div>
                  </div>

                  {/* AFTER */}
                  <div className="py-3">
                    <div className="code-line">
                      <span className="line-number">01</span>
                      <span>
                        <span className="text-purple-300">def</span>
                        <span className="text-blue-300"> find_max</span>
                        <span className="text-slate-300">(nums):</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">02</span>
                      <span className="text-slate-500">    # find maximum</span>
                    </div>

                    <div className="code-line bug-line">
                      <span className="line-number text-red-400">03</span>
                      <span>
                        <span className="text-slate-300">    max_val = </span>
                        <span className="text-red-300">nums[0] + 10</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">04</span>
                      <span>
                        <span className="text-purple-300">    for</span>
                        <span className="text-slate-300"> value </span>
                        <span className="text-purple-300">in</span>
                        <span className="text-slate-300"> nums:</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">05</span>
                      <span>
                        <span className="text-purple-300">        if</span>
                        <span className="text-slate-300"> value &gt; max_val:</span>
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">06</span>
                      <span className="text-slate-300">
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;max_val = value
                      </span>
                    </div>

                    <div className="code-line">
                      <span className="line-number">07</span>
                      <span>
                        <span className="text-purple-300">    return</span>
                        <span className="text-slate-300"> max_val</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* AST Diff */}
                <div className="border-t border-white/[.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        AST Mutation Detected
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-red-300">
                      +10 injected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-[9px] text-slate-400">
                      BinaryOperation
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1 text-[9px] text-red-300">
                      Constant +10
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t border-white/[.06] bg-[#0a1018] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[10px] text-emerald-300">
                      All 5 Deterministic Tests Passed
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">
                    VIVA_PROOF_READY
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          METHODOLOGY
      ========================================================== */}
      <section
        id="methodology"
        className="py-24 lg:py-32 border-t border-white/[.05]"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] uppercase tracking-[.2em] text-emerald-400 font-semibold mb-4">
              Methodology
            </div>

            <h2 className="font-display font-bold tracking-[-.035em] text-3xl sm:text-5xl text-white">
              From assignment creation to{' '}
              <span className="text-emerald-400">verified understanding.</span>
            </h2>

            <p className="mt-5 text-slate-400 leading-7">
              Replace surface-level grading with a structured assessment
              pipeline that measures both implementation and understanding.
            </p>
          </div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-6 lg:gap-10">
            {/* Tabs */}
            <div id="methodTabs" className="space-y-2">
              {METHOD_STEPS.map((step, index) => {
                const isActive = activeStep === index;
                return (
                  <button
                    key={step.stepNumber}
                    type="button"
                    data-step={index}
                    onClick={() => handleSelectStep(index)}
                    className={`method-tab w-full text-left rounded-xl border px-5 py-5 transition cursor-pointer ${
                      isActive
                        ? 'tab-active'
                        : 'border-white/[.07] hover:border-white/[.14]'
                    }`}
                  >
                    <span
                      className={`block font-mono text-xs mb-2 ${
                        isActive ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    >
                      {step.stepNumber}
                    </span>

                    <span className="block text-sm font-semibold">
                      {step.tabTitle}
                    </span>

                    <span className="block mt-1 text-xs text-slate-500">
                      {step.tabSubtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preview */}
            <div className="relative min-h-[440px] rounded-2xl border border-white/[.08] bg-[#0E141E] overflow-hidden terminal-shadow">
              <div className="scan-line" />

              <div className="h-12 border-b border-white/[.06] px-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  </div>

                  <span
                    id="stepTitle"
                    className="font-mono text-[10px] text-slate-400"
                  >
                    {currentMethod.title}
                  </span>
                </div>

                <span
                  id="stepStatus"
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-2.5 py-1 text-[9px] text-emerald-300"
                >
                  {currentMethod.status}
                </span>
              </div>

              <div
                id="methodPreview"
                className="p-6 sm:p-9 transition-all duration-250 ease-out"
                style={{
                  opacity: previewEntering ? 0 : 1,
                  transform: previewEntering ? 'translateY(5px)' : 'translateY(0)',
                }}
              >
                {activeStep === 0 && (
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.18em] text-emerald-400">
                        Assignment Builder
                      </div>

                      <h3 className="mt-3 font-display font-bold text-2xl text-white">
                        Create structured coding assessments.
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-slate-400">
                        Define problems, languages, test cases, constraints,
                        evaluation rules and viva challenge policies from one
                        instructor workspace.
                      </p>

                      <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="text-emerald-400">✓</span>
                          Multi-language assignments
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="text-emerald-400">✓</span>
                          Hidden deterministic tests
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="text-emerald-400">✓</span>
                          Configurable viva mutations
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[.07] bg-[#090D14] p-5 font-mono text-[10px]">
                      <div className="text-slate-600 mb-4">
                        ASSIGNMENT_CONFIG.yaml
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-purple-300">language:</span>
                          <span className="text-emerald-300"> python</span>
                        </div>

                        <div>
                          <span className="text-purple-300">difficulty:</span>
                          <span className="text-yellow-300"> intermediate</span>
                        </div>

                        <div>
                          <span className="text-purple-300">tests:</span>
                          <span className="text-blue-300"> 12</span>
                        </div>

                        <div>
                          <span className="text-purple-300">mutation:</span>
                          <span className="text-emerald-300"> enabled</span>
                        </div>

                        <div>
                          <span className="text-purple-300">viva:</span>
                          <span className="text-emerald-300"> required</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.18em] text-blue-400">
                        Student Workspace
                      </div>

                      <h3 className="mt-3 font-display font-bold text-2xl text-white">
                        Students submit code in a controlled environment.
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-slate-400">
                        Capture source code, execution results and assessment
                        signals without forcing students through disconnected
                        tools.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[9px] text-slate-400">
                          Python
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[9px] text-slate-400">
                          Java
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[9px] text-slate-400">
                          C++
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[.07] bg-[#090D14] overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/[.06] flex justify-between">
                        <span className="font-mono text-[9px] text-slate-500">
                          student_solution.py
                        </span>
                        <span className="text-[9px] text-emerald-400">
                          SAVED
                        </span>
                      </div>

                      <div className="p-4 font-mono text-[10px] leading-6">
                        <div>
                          <span className="text-slate-600">01</span>
                          <span className="text-purple-300 ml-4">def</span>
                          <span className="text-blue-300"> calculate</span>
                          <span className="text-slate-300">(a, b):</span>
                        </div>

                        <div>
                          <span className="text-slate-600">02</span>
                          <span className="text-slate-300 ml-4">return a + b</span>
                        </div>

                        <div className="mt-3 text-emerald-400">
                          ✓ Submission compiled successfully
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div>
                        <div className="text-[10px] uppercase tracking-[.18em] text-red-400">
                          Interactive Debug Challenge
                        </div>

                        <h3 className="mt-3 font-display font-bold text-2xl text-white">
                          Test understanding, not memorization.
                        </h3>
                      </div>

                      <div className="rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3">
                        <div className="text-[8px] uppercase tracking-widest text-red-400/70">
                          VIVA TIMER
                        </div>

                        <div className="mt-1 font-mono font-semibold text-lg text-red-300">
                          04:12
                        </div>
                      </div>
                    </div>

                    <div className="mt-7 grid lg:grid-cols-3 gap-3">
                      <div className="lg:col-span-2 rounded-xl border border-white/[.07] bg-[#090D14] p-5 font-mono text-[10px]">
                        <div className="text-slate-600 mb-4">
                          MUTATED_FUNCTION
                        </div>

                        <div className="space-y-1">
                          <div>
                            <span className="text-slate-600">03</span>
                            <span className="ml-4 text-slate-300">
                              max_val = nums[0]
                            </span>
                          </div>

                          <div className="rounded bg-red-500/[.08] border-l-2 border-red-500 px-2">
                            <span className="text-red-400">04</span>
                            <span className="ml-4 text-red-300">
                              max_val = nums[0] + 10
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-600">05</span>
                            <span className="ml-4 text-slate-300">
                              return max_val
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[.07] bg-[#090D14] p-5">
                        <div className="text-[9px] uppercase tracking-widest text-slate-600">
                          Challenge
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          Identify the mutation and explain why it changes
                          the program&apos;s behaviour.
                        </p>

                        <div className="mt-5 flex items-center gap-2 text-[9px] text-emerald-400">
                          <span>●</span>
                          Session recording active
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.18em] text-emerald-400">
                        Verification Engine
                      </div>

                      <h3 className="mt-3 font-display font-bold text-2xl text-white">
                        Produce evidence that can be trusted.
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-slate-400">
                        Combine deterministic execution, test outcomes, mutation
                        responses and session signals into a single assessment
                        record.
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-white/[.02] border border-white/[.06] p-3">
                          <div className="text-[9px] text-slate-600">
                            TESTS
                          </div>
                          <div className="mt-1 font-mono text-sm text-emerald-400">
                            5 / 5
                          </div>
                        </div>

                        <div className="rounded-lg bg-white/[.02] border border-white/[.06] p-3">
                          <div className="text-[9px] text-slate-600">
                            VIVA
                          </div>
                          <div className="mt-1 font-mono text-sm text-emerald-400">
                            PASS
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[.07] bg-[#090D14] p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-slate-500">
                          ASSESSMENT_RESULT
                        </span>
                        <span className="text-[9px] text-emerald-400">
                          VERIFIED
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Compilation</span>
                          <span className="text-emerald-400">PASS</span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Deterministic tests</span>
                          <span className="text-emerald-400">5 / 5</span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Mutation challenge</span>
                          <span className="text-emerald-400">PASS</span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Evidence capture</span>
                          <span className="text-emerald-400">COMPLETE</span>
                        </div>
                      </div>

                      <div className="mt-5 h-px bg-white/[.06]" />

                      <div className="mt-4 text-center font-mono text-[9px] text-slate-600">
                        REPORT_READY
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FEATURES
      ========================================================== */}
      <section
        id="features"
        className="py-24 lg:py-32 border-t border-white/[.05]"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-[11px] uppercase tracking-[.2em] text-emerald-400 font-semibold mb-4">
                Platform
              </div>

              <h2 className="font-display font-bold tracking-[-.035em] text-3xl sm:text-5xl text-white">
                Built for serious{' '}
                <span className="text-slate-500">assessment infrastructure.</span>
              </h2>
            </div>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Purpose-built workflows for instructors, departments and
              institutions that need measurable coding competency.
            </p>
          </div>

          {/* BENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* HERO CARD */}
            <div className="feature-card lg:col-span-4 rounded-2xl border border-white/[.08] bg-[#0F1520] p-6 sm:p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/[.04] blur-3xl rounded-full" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[.18em] text-emerald-400">
                      Core Engine
                    </div>

                    <h3 className="mt-2 font-display font-bold text-xl text-white">
                      Viva Debug Challenges
                    </h3>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-emerald-500/[.08] border border-emerald-400/10 flex items-center justify-center">
                    <span className="font-mono text-emerald-400 text-sm">
                      AST
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400 max-w-lg">
                  Controlled AST mutations introduce targeted defects into
                  student code, allowing evaluators to test whether the
                  student genuinely understands the implementation.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[.06] bg-black/20 p-4">
                    <div className="font-mono text-[9px] text-slate-600 mb-3">
                      AST_NODE_TREE
                    </div>

                    <div className="font-mono text-[10px] leading-6 text-slate-400">
                      <div>Function</div>
                      <div className="pl-3">└── Return</div>
                      <div className="pl-6">└── BinaryOp</div>
                      <div className="pl-9 text-red-300">
                        └── + Constant
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-500/10 bg-red-500/[.025] p-4">
                    <div className="font-mono text-[9px] text-red-400/70 mb-3">
                      MUTATION
                    </div>

                    <div className="font-mono text-[10px] leading-6">
                      <div className="text-slate-500">expected:</div>
                      <div className="text-emerald-300">max_val = nums[0]</div>
                      <div className="mt-2 text-slate-500">injected:</div>
                      <div className="text-red-300">max_val = nums[0] + 10</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[9px] text-slate-400">
                    Deterministic
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[9px] text-slate-400">
                    Language-aware
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[9px] text-slate-400">
                    Evidence-based
                  </span>
                </div>
              </div>
            </div>

            {/* SMALL FEATURE */}
            <div className="feature-card lg:col-span-2 rounded-2xl border border-white/[.08] bg-[#0F1520] p-6 flex flex-col sm:flex-row gap-6">
              <div className="w-12 h-12 shrink-0 rounded-xl border border-white/[.07] bg-white/[.02] flex items-center justify-center">
                <svg width="20" height="20" fill="none" stroke="#6ee7b7" strokeWidth="1.5">
                  <path d="M5 4h10v12H5z" />
                  <path d="M8 8h4M8 11h4" />
                </svg>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Deterministic Verification
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 max-w-xl">
                  Execute standardized test cases, compiler checks and
                  mutation-aware validation to reduce subjective grading
                  and produce reproducible results.
                </p>
              </div>
            </div>

            {/* SMALL FEATURE */}
            <div className="feature-card lg:col-span-2 rounded-2xl border border-white/[.08] bg-[#0F1520] p-6 flex flex-col sm:flex-row gap-6">
              <div className="w-12 h-12 shrink-0 rounded-xl border border-white/[.07] bg-white/[.02] flex items-center justify-center">
                <svg width="20" height="20" fill="none" stroke="#6ee7b7" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="7" />
                  <path d="M10 6v4l3 2" />
                </svg>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Live Viva Sessions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 max-w-xl">
                  Run structured debugging challenges with controlled
                  timers, session states and instructor visibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          STATS
      ========================================================== */}
      <section className="border-y border-white/[.05]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[.06]">
            <div className="py-10 px-5 text-center">
              <div className="font-display font-bold text-3xl text-white">
                100%
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Deterministic execution
              </div>
            </div>

            <div className="py-10 px-5 text-center">
              <div className="font-display font-bold text-3xl text-white">
                AST
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Mutation-based validation
              </div>
            </div>

            <div className="py-10 px-5 text-center">
              <div className="font-display font-bold text-3xl text-white">
                24/7
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Cloud assessment access
              </div>
            </div>

            <div className="py-10 px-5 text-center">
              <div className="font-display font-bold text-3xl text-white">
                PDF
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Evidence-ready reporting
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PRICING
      ========================================================== */}
      <section id="pricing" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] uppercase tracking-[.2em] text-emerald-400 font-semibold">
              Pricing
            </div>

            <h2 className="mt-4 font-display font-bold tracking-[-.035em] text-3xl sm:text-5xl text-white">
              Start small.{' '}
              <span className="text-slate-500">
                Scale across your department.
              </span>
            </h2>

            <p className="mt-5 text-slate-400 leading-7">
              Flexible plans designed for individual educators and
              university-wide assessment infrastructure.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {/* FREE */}
            <div className="rounded-2xl border border-white/[.08] bg-[#0F1520] p-7">
              <div className="text-sm font-semibold text-white">Free</div>

              <p className="mt-2 text-xs text-slate-500">
                For exploring the platform.
              </p>

              <div className="mt-7">
                <span className="font-display font-bold text-4xl text-white">
                  $0
                </span>
                <span className="text-xs text-slate-500"> /month</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="mt-7 w-full block text-center rounded-xl border border-slate-700 hover:border-slate-500 py-3 text-sm font-semibold text-white transition cursor-pointer"
              >
                Get Started
              </button>

              <div className="mt-8 space-y-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Includes
                </div>

                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    3 active assignments
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Basic test execution
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Student submissions
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Basic reports
                  </div>
                </div>
              </div>
            </div>

            {/* PRO */}
            <div className="relative rounded-2xl border border-emerald-500/40 bg-[#101B19] p-7 shadow-[0_0_70px_rgba(16,185,129,.08)]">
              <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                Most Popular
              </div>

              <div className="text-sm font-semibold text-white">
                Pro Faculty
              </div>

              <p className="mt-2 text-xs text-slate-500">
                For serious individual educators.
              </p>

              <div className="mt-7">
                <span className="font-display font-bold text-4xl text-white">
                  $19
                </span>
                <span className="text-xs text-slate-500"> /month</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="mt-7 w-full block text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-semibold text-white transition cursor-pointer"
              >
                Start Pro
              </button>

              <div className="mt-8 space-y-4">
                <div className="text-[10px] uppercase tracking-wider text-emerald-500/70">
                  Everything in Free, plus
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Unlimited assignments
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    AST mutation engine
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Live viva sessions
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Advanced evidence reports
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Integrity controls
                  </div>
                </div>
              </div>
            </div>

            {/* INSTITUTION */}
            <div className="rounded-2xl border border-white/[.08] bg-[#0F1520] p-7">
              <div className="text-sm font-semibold text-white">
                Institution &amp; University
              </div>

              <p className="mt-2 text-xs text-slate-500">
                For departments and university systems.
              </p>

              <div className="mt-7">
                <span className="font-display font-bold text-4xl text-white">
                  Custom
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="mt-7 w-full block text-center rounded-xl bg-white text-slate-950 hover:bg-slate-200 py-3 text-sm font-semibold transition cursor-pointer"
              >
                Talk to Sales
              </button>

              <div className="mt-8 space-y-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Includes
                </div>

                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Department-wide deployment
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    SSO &amp; role management
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    LMS integration
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Advanced analytics
                  </div>

                  <div className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    Dedicated support
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================== */}
      <section
        id="demo"
        className="py-24 lg:py-32 border-t border-white/[.05]"
      >
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/15 bg-[#0E1717] p-8 sm:p-12 lg:p-16 text-center">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/[.08] blur-[100px] rounded-full" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.05] px-3 py-1.5 text-[10px] text-emerald-300">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                BUILT FOR MODERN CS EDUCATION
              </div>

              <h2 className="mt-6 font-display font-bold tracking-[-.04em] text-3xl sm:text-5xl lg:text-6xl text-white">
                Make coding assessments{' '}
                <span className="text-emerald-400">
                  prove understanding.
                </span>
              </h2>

              <p className="mt-5 max-w-2xl mx-auto text-slate-400 leading-7">
                Give instructors better evidence, students better feedback,
                and institutions a more defensible way to measure technical
                competency.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white transition cursor-pointer"
                >
                  Book a Demo →
                </button>

                <a
                  href="#methodology"
                  onClick={(e) => scrollToSection(e, 'methodology')}
                  className="rounded-full border border-slate-700 hover:bg-white/[.04] px-7 py-3.5 text-sm font-semibold text-slate-200 transition"
                >
                  Explore Documentation
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
