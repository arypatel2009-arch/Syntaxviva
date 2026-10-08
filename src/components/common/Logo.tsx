import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showTagline = false,
}) => {
  const isDark = variant === 'dark'; // dark background (e.g. sidebar or hero banner)

  const sizeConfig = {
    sm: {
      icon: 'w-7 h-7 text-xs',
      text: 'text-base',
      tagline: 'text-[9px]',
    },
    md: {
      icon: 'w-9 h-9 text-sm',
      text: 'text-xl',
      tagline: 'text-[10px]',
    },
    lg: {
      icon: 'w-11 h-11 text-base',
      text: 'text-2xl',
      tagline: 'text-xs',
    },
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Icon Mark: Emerald geometric shield with code braces */}
      <div
        className={`relative flex items-center justify-center rounded-xl font-mono font-extrabold shadow-sm transition ${
          isDark
            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25'
            : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-emerald-600/20'
        } ${sizeConfig.icon}`}
      >
        <span className="tracking-tighter">&lt;/&gt;</span>
      </div>

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
    </div>
  );
};
