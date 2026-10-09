import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  imageOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showTagline = false,
  className = '',
  imageOnly = false,
}) => {
  const isDark = variant === 'dark';

  const sizeConfig = {
    sm: {
      frame: 'w-7 h-7',
      text: 'text-base',
      tagline: 'text-[9px]',
    },
    md: {
      frame: 'w-9 h-9',
      text: 'text-xl',
      tagline: 'text-[10px]',
    },
    lg: {
      frame: 'w-11 h-11',
      text: 'text-2xl',
      tagline: 'text-xs',
    },
    xl: {
      frame: 'w-14 h-14',
      text: 'text-3xl',
      tagline: 'text-sm',
    },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Brand Logo inside a Round Shape Frame (rounded-full) */}
      <div
        className={`relative flex items-center justify-center rounded-full overflow-hidden border border-emerald-500/30 bg-slate-950 shadow-md shadow-emerald-500/10 transition-transform hover:scale-[1.02] shrink-0 ${sizeConfig.frame}`}
      >
        <img
          src="/assets/syntaxviva-logo.jpg"
          alt="SyntaXViva Official Logo"
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/syntaxviva-logo.jpg';
          }}
        />
      </div>

      {!imageOnly && (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span
              className={`font-extrabold tracking-tight ${sizeConfig.text} ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              SyntaX<span className="text-emerald-500">Viva</span>
            </span>
          </div>
          {showTagline && (
            <span
              className={`font-medium tracking-tight -mt-0.5 ${sizeConfig.tagline} ${
                isDark ? 'text-emerald-200/80' : 'text-slate-500'
              }`}
            >
              Real Skills. Real Proof.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
