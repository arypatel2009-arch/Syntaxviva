import React, { useState } from 'react';
import { Play, Sparkles, Shield, Code, CheckCircle2 } from 'lucide-react';

export const DEMO_VIDEO_SRC = 'https://wnjgfklesylchvkuwfjr.supabase.co/storage/v1/object/public/Videos/Screen%20Recording%202026-10-17%20173044%20(1).mp4';

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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const animFrameRef = React.useRef<number | null>(null);

  // Always initialized to 1 so the device is NEVER invisible on screen
  const [animationProgress, setAnimationProgress] = React.useState<number>(1);
  const [hasEntered, setHasEntered] = React.useState<boolean>(false);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = React.useState<number>(1916 / 908);

  const trigger3DSpinAnimation = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setAnimationProgress(0);

    const startTime = performance.now();
    const duration = 1250; // 1.25s silky smooth 360-degree round spin

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Apple-style smooth cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimationProgress(eased);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
        setAnimationProgress(1);
        if (videoRef.current) {
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  React.useEffect(() => {
    let triggered = false;

    const checkArrival = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      // Triggers when user scrolls and arrives at the Methodology section
      if (rect.top <= windowHeight * 0.85 && rect.bottom >= 100) {
        if (!triggered) {
          triggered = true;
          setHasEntered(true);
          trigger3DSpinAnimation();
        } else {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }
      } else if (rect.top > windowHeight) {
        // Reset when user scrolls back to top so it re-triggers on returning
        triggered = false;
        setHasEntered(false);
      }
    };

    window.addEventListener('scroll', checkArrival, { passive: true });
    // Check immediately on mount in case user lands on or refreshes section
    checkArrival();

    // IntersectionObserver secondary guarantee with low threshold
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          setHasEntered(true);
          trigger3DSpinAnimation();
        }
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', checkArrival);
      observer.disconnect();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Compute 3D rotation transforms:
  // Spins from -360° to 0° round, expanding from 0.72 to 1.0!
  // Opacity is ALWAYS at least 0.85 -> 1.0, so the device is NEVER invisible!
  const remaining = 1 - animationProgress;
  const rotateY = (-360 * remaining).toFixed(2);
  const rotateX = (28 * remaining).toFixed(2);
  const rotateZ = (-8 * remaining).toFixed(2);
  const scale = (0.72 + animationProgress * 0.28).toFixed(3);
  const translateZ = (-350 * remaining).toFixed(1);
  const translateY = (50 * remaining).toFixed(1);
  const opacity = (0.85 + animationProgress * 0.15).toFixed(2);

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReplayClick = () => {
    setHasEntered(true);
    trigger3DSpinAnimation();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto py-6"
      style={{ perspective: '1800px' }}
    >
      {/* Ambient glowing atmosphere behind device */}
      <div className="absolute -inset-10 bg-cyan-400/[.09] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -inset-6 bg-emerald-400/[.07] blur-[70px] rounded-full pointer-events-none" />

      {/* 3D Animated Container - Rotates a full 360° round from inside to outside upon arriving at methodology */}
      <div
        style={{
          transform: `translateY(${translateY}px) translateZ(${translateZ}px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
          transformStyle: 'preserve-3d',
          opacity: Number(opacity),
          transition: animFrameRef.current ? 'none' : 'transform 0.15s ease-out, opacity 0.2s ease-out',
        }}
        className="relative mx-auto will-change-transform"
      >
        {/* ===================================================================
            WHITE CERAMIC MACBOOK DISPLAY / LID
        =================================================================== */}
        <div className="relative rounded-[22px] sm:rounded-[26px] bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#e2e8f0] p-2 sm:p-3 border-2 border-slate-200/90 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65),0_0_40px_rgba(255,255,255,0.25)]">
          {/* Subtle Silver Chamfer Highlight */}
          <div className="absolute inset-0 rounded-[20px] sm:rounded-[24px] pointer-events-none border border-white/80" />

          {/* Inner Display Bezel */}
          <div className="relative rounded-[16px] sm:rounded-[20px] bg-[#0c0d12] pt-2 sm:pt-2.5 pb-1.5 sm:pb-2 px-1.5 sm:px-2 border border-slate-800/80 shadow-inner flex flex-col">
            {/* Integrated Top Bezel Camera & Sensors (Never cuts or covers video content) */}
            <div className="flex items-center justify-center gap-2 mb-1.5 pointer-events-none">
              {/* Left Light Sensor */}
              <span className="w-1 h-1 rounded-full bg-[#1e293b]" />
              {/* Studio Camera Lens with active status indicator */}
              <span className="w-2 h-2 rounded-full bg-[#1b2230] border border-slate-500/40 flex items-center justify-center shadow-inner">
                <span className="w-0.5 h-0.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              {/* Microphone Sensor */}
              <span className="w-1 h-1 rounded-full bg-[#1e293b]" />
            </div>

            {/* Screen Glass Display Area - 100% Original Lossless Quality, Zero Cropping, Zero Cuts */}
            <div
              className="relative w-full rounded-lg sm:rounded-xl overflow-hidden bg-black flex items-center justify-center group cursor-pointer"
              style={{ aspectRatio: `${aspectRatio}` }}
              onClick={togglePlayback}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                loop
                muted
                preload="auto"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth && v.videoHeight) {
                    setAspectRatio(v.videoWidth / v.videoHeight);
                  }
                }}
                className="w-full h-full object-contain block rounded-lg select-none"
              >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Glossy glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[.04] via-transparent to-transparent pointer-events-none" />

              {/* Play/Pause Hover Center Button */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-14 h-14 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-2xl backdrop-blur-xs transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className={`w-6 h-6 ml-0.5 ${isPlaying ? 'opacity-40' : 'opacity-100'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            WHITE MACBOOK HINGE & LOWER BASE PLATE
        =================================================================== */}
        {/* Sleek Aluminum Silver/White Center Hinge */}
        <div className="h-2.5 sm:h-3 w-32 sm:w-44 bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] rounded-b-md mx-auto border-t border-slate-300 shadow-sm" />

        {/* Pure White / Silver Brushed Base Plate */}
        <div className="relative h-4 sm:h-5 w-[104%] -mx-[2%] bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#d8e0ea] rounded-b-2xl border-t border-white shadow-[0_20px_45px_rgba(0,0,0,0.5)] flex items-center justify-center">
          {/* Chamfer Top Rim */}
          <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent" />

          {/* Center Precision Thumb Opening Groove */}
          <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-[#cbd5e1] rounded-full border-t border-slate-400/60 shadow-inner" />
        </div>

        {/* Outer Control Bar (Replay 3D Spin) */}
        <div className="mt-4 flex items-center justify-center px-2">
          <button
            type="button"
            onClick={handleReplayClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] hover:bg-white/[.12] border border-white/10 px-3.5 py-1.5 text-xs text-slate-300 transition-all hover:text-white cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Replay 360-degree 3D round entrance animation"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Replay 3D Spin</span>
          </button>
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