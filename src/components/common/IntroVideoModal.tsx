import React, { useState, useEffect, useRef } from 'react';
import { Play, Volume2, VolumeX, FastForward, Sparkles, AlertCircle } from 'lucide-react';

interface IntroVideoModalProps {
  onClose: () => void;
}

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Make sure muted property is set for initial autoplay attempt
    video.muted = true;
    setIsMuted(true);

    const playVideo = async () => {
      try {
        await video.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Autoplay prevented by browser, waiting for user click:', err);
        setNeedsUserInteraction(true);
      }
    };

    playVideo();

    const handleTimeUpdate = () => {
      if (video.duration && !isNaN(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsUserInteraction(false);
    video.muted = false;
    setIsMuted(false);
    video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoError = () => {
    console.error('Video failed to load or play.');
    setLoadError(true);
  };

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black text-white transition-opacity duration-300 flex items-center justify-center select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Video */}
      {!loadError ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleSkip}
          onError={handleVideoError}
          className="w-full h-full object-contain max-h-screen max-w-full"
        >
          <source src="/SyntaXViva_intro.mp4" type="video/mp4" />
          <source src="./SyntaXViva_intro.mp4" type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      ) : (
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <p className="text-sm text-slate-300">Intro video could not be loaded.</p>
          <button
            onClick={handleSkip}
            className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition cursor-pointer"
          >
            Continue to Website
          </button>
        </div>
      )}

      {/* Play Trigger Overlay if Browser blocks Autoplay */}
      {needsUserInteraction && !loadError && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-4 z-20">
          <button
            onClick={handleManualPlay}
            className="w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 cursor-pointer border-2 border-white/20"
          >
            <Play className="w-8 h-8 ml-1" />
          </button>
          <p className="text-sm font-medium text-slate-200 font-sans">Click to Play Intro Video</p>
        </div>
      )}

      {/* Top Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent z-10">
        {/* Brand Badge */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
          <img
            src="/assets/syntaxviva-logo.jpg"
            alt="SyntaXViva"
            className="w-6 h-6 rounded-full object-cover border border-emerald-400/40"
          />
          <span className="text-xs font-bold tracking-wider text-white uppercase font-mono">
            Synta<span className="text-emerald-400">XViva</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/10 text-white hover:bg-slate-800 transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={handleSkip}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer border border-emerald-400/30"
          >
            <span>Skip Intro</span>
            <FastForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Bottom Progress Bar Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Introducing Next-Gen Assessment Platform</span>
          </span>
          <span>{Math.round(progress)}%</span>
        </div>

        {/* Video Progress Line */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-100 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
