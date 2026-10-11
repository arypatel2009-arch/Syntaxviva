import React, { useState } from 'react';
import { Play, Sparkles, Shield, Code, CheckCircle2 } from 'lucide-react';

export const DEMO_VIDEO_SRC = '/videos/syntaxviva-demo.mp4';

interface MethodologyProps {
  onNavigate?: (path: string) => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
  videoSrc?: string;
}

const METHOD_STEPS = [
  {
    stepNumber: '01.',
    tabTitle: 'Create Assignment',
    tabSubtitle: 'Build controlled coding tasks with test suites.',
    badge: 'AUTHORING',
  },
  {
    stepNumber: '02.',
    tabTitle: 'Student Submits Code',
    tabSubtitle: 'Code, execution and evidence captured live.',
    badge: 'PHASE 1',
  },
  {
    stepNumber: '03.',
    tabTitle: 'Interactive Debug Challenge',
    tabSubtitle: 'Validate understanding with AST mutation viva.',
    badge: 'PHASE 2 VIVA',
  },
  {
    stepNumber: '04.',
    tabTitle: 'Deterministic Verification',
    tabSubtitle: 'Produce tamper-evident proof of mastery.',
    badge: 'VERIFIED',
  },
];

export const MacBookMockup: React.FC<{ videoSrc?: string }> = ({
  videoSrc = DEMO_VIDEO_SRC,
}) => {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-2">
      {/* Ambient glowing atmosphere behind device */}
      <div className="absolute -inset-8 bg-emerald-500/[.07] blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute -inset-4 bg-cyan-500/[.04] blur-[60px] rounded-full pointer-events-none" />

      {/* 3D Container with gentle depth perspective */}
      <div className="relative mx-auto transition-transform duration-500 ease-out transform hover:scale-[1.01]">
        {/* ===================================================================
            MACBOOK DISPLAY / LID
        =================================================================== */}
        <div className="relative rounded-[22px] sm:rounded-[26px] bg-[#14161d] p-2.5 sm:p-3.5 border border-[#2e323e] shadow-2xl shadow-emerald-950/40">
          {/* Inner Display Bezel */}
          <div className="relative rounded-[16px] sm:rounded-[20px] bg-[#08090d] p-1.5 sm:p-2 border border-black/80 overflow-hidden shadow-inner">
            {/* Top Webcam Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 h-3 sm:h-3.5 w-20 sm:w-28 bg-[#08090d] rounded-b-md flex items-center justify-center gap-1.5 border-b border-x border-[#1a1c24]">
              {/* Camera Lens */}
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b2230] border border-[#2d3748] flex items-center justify-center">
                <span className="w-0.5 h-0.5 rounded-full bg-emerald-400/80 animate-pulse" />
              </span>
              {/* Mic Sensor */}
              <span className="w-0.5 h-0.5 rounded-full bg-[#374151]" />
            </div>

            {/* Screen Glass Display Area */}
            <div className="relative aspect-[16/10] w-full rounded-lg sm:rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-lg"
              />

              {/* Glossy glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[.03] via-transparent to-transparent pointer-events-none" />

              {/* Floating live playback indicator */}
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-slate-950/80 border border-white/10 px-2.5 py-1 text-[10px] font-mono text-emerald-400 backdrop-blur-md shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYNTAXVIVA ACTIVE WALKTHROUGH</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            MACBOOK HINGE & LOWER BASE PLATE
        =================================================================== */}
        {/* Recessed Center Hinge */}
        <div className="h-2.5 sm:h-3 w-28 sm:w-36 bg-[#0f1117] rounded-b-md mx-auto border-t border-black/90 shadow-md" />

        {/* Brushed Space-Gray Base Plate */}
        <div className="relative h-3.5 sm:h-4 w-[103%] -mx-[1.5%] bg-gradient-to-b from-[#252833] via-[#1d1f27] to-[#121319] rounded-b-2xl border-t border-white/[.12] shadow-2xl flex items-center justify-center">
          {/* Center Thumb Opening Groove */}
          <div className="w-14 sm:w-20 h-1 sm:h-1.5 bg-[#0a0b0e] rounded-full border-t border-black/60" />
        </div>
      </div>
    </div>
  );
};

export const Methodology: React.FC<MethodologyProps> = ({
  onNavigate,
  onOpenAuth,
  videoSrc = DEMO_VIDEO_SRC,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section
      id="methodology"
      className="py-24 lg:py-32 border-t border-white/[.05] relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-2xl mb-14">
          <div className="text-[11px] uppercase tracking-[.2em] text-emerald-400 font-semibold mb-3">
            Methodology
          </div>

          <h2 className="font-display font-bold tracking-[-.035em] text-3xl sm:text-5xl text-white">
            From assignment creation to{' '}
            <span className="text-emerald-400">verified understanding.</span>
          </h2>

          <p className="mt-4 text-slate-400 leading-7">
            Replace surface-level grading with a structured assessment
            pipeline that measures both implementation and genuine comprehension.
          </p>
        </div>

        {/* Two-Column Grid: Tabs on Left, 3D MacBook Video Mockup on Right */}
        <div className="grid lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 items-center">
          {/* Left Navigation Tabs */}
          <div id="methodTabs" className="space-y-3">
            {METHOD_STEPS.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  data-step={index}
                  onClick={() => setActiveStep(index)}
                  className={`method-tab w-full text-left rounded-xl border px-5 py-4 transition cursor-pointer ${
                    isActive
                      ? 'tab-active bg-slate-900/80 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                      : 'border-white/[.07] bg-slate-950/40 hover:border-white/[.15]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono text-xs ${
                        isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[.03] text-slate-500'
                      }`}
                    >
                      {step.badge}
                    </span>
                  </div>

                  <span className="block text-sm font-semibold text-white">
                    {step.tabTitle}
                  </span>

                  <span className="block mt-1 text-xs text-slate-400 leading-relaxed">
                    {step.tabSubtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Panel: Realistic 3D MacBook Video Display Mockup */}
          <div>
            <MacBookMockup videoSrc={videoSrc} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Methodology;
