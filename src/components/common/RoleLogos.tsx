import React from 'react';

interface RoleLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  sm: 'w-7 h-7',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-18 h-18',
};

/**
 * Professional Official Logo for Student / Scholar
 */
export const StudentRoleLogo: React.FC<RoleLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      title="Student Academic Insignia"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-sm transition-transform duration-200 ${glow ? 'drop-shadow-md' : ''}`}
      >
        <defs>
          <linearGradient id="studentBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="studentCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
          <linearGradient id="studentGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <radialGradient id="studentGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Circular Shield Base */}
        <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#studentBg)" />
        <rect x="5.5" y="5.5" width="89" height="89" rx="24.5" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2.5" />
        <circle cx="50" cy="35" r="32" fill="url(#studentGlow)" />

        {/* Mortarboard Graduation Cap Diamond */}
        <polygon points="50,22 82,34 50,46 18,34" fill="url(#studentCapGrad)" filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.25))" />
        
        {/* Cap Skull Underlay */}
        <path d="M30 40.5 V52 C30 58, 70 58, 70 52 V40.5" fill="#065f46" stroke="#ffffff" strokeWidth="1.5" />

        {/* Graduation Tassel & Button */}
        <circle cx="50" cy="34" r="3" fill="url(#studentGold)" />
        <path d="M50 34 C64 36, 72 42, 73 50" stroke="url(#studentGold)" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="71,50 75,50 74,58 72,58" fill="url(#studentGold)" />

        {/* Open Academic Knowledge Book */}
        <path
          d="M26 64 C36 60, 47 62, 50 66 C53 62, 64 60, 74 64 V78 C64 74, 53 76, 50 80 C47 76, 36 74, 26 78 Z"
          fill="#ffffff"
          stroke="#064e3b"
          strokeWidth="1.5"
        />
        <line x1="50" y1="66" x2="50" y2="80" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />

        {/* Left Book Page Lines */}
        <line x1="32" y1="67" x2="44" y2="67" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="32" y1="72" x2="42" y2="72" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

        {/* Right Book Page Lines */}
        <line x1="56" y1="67" x2="68" y2="67" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="58" y1="72" x2="68" y2="72" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

        {/* Academic Star of Excellence */}
        <path
          d="M50 8 C51 11, 53 12, 56 12 C53 13, 51 14, 50 17 C49 14, 47 13, 44 12 C47 12, 49 11, 50 8 Z"
          fill="url(#studentGold)"
        />
      </svg>
    </div>
  );
};

/**
 * Professional Official Logo for Faculty / Educator
 */
export const FacultyRoleLogo: React.FC<RoleLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      title="Faculty Instructor Insignia"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-sm transition-transform duration-200 ${glow ? 'drop-shadow-md' : ''}`}
      >
        <defs>
          <linearGradient id="facultyBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="facultyGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <radialGradient id="facultyGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Circular Shield Base */}
        <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#facultyBg)" />
        <rect x="5.5" y="5.5" width="89" height="89" rx="24.5" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2.5" />
        <circle cx="50" cy="35" r="32" fill="url(#facultyGlow)" />

        {/* Faculty Blackboard / Screen Frame */}
        <rect x="22" y="20" width="56" height="38" rx="6" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
        <rect x="25" y="23" width="50" height="32" rx="4" fill="#064e3b" />
        
        {/* Code / Algorithm Chalkboard Lines */}
        <path d="M29 32 L34 36 L29 40" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="38" y1="40" x2="47" y2="40" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
        <line x1="29" y1="47" x2="65" y2="47" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />

        {/* Professor / Instructor Podium / Desk */}
        <path
          d="M32 64 L36 84 H64 L68 64 Z"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="1.5"
        />
        <rect x="28" y="59" width="44" height="6" rx="3" fill="url(#facultyGold)" stroke="#b45309" strokeWidth="1" />

        {/* Verified Teaching Star Emblem */}
        <circle cx="50" cy="73" r="6" fill="#0284c7" />
        <polygon points="50,69 51.5,72 55,72 52,74 53,77 50,75 47,77 48,74 45,72 48.5,72" fill="#ffffff" />

        {/* Academic Laurel Leaves on Left and Right */}
        <path d="M12 48 C10 40, 16 34, 18 30 C16 38, 16 46, 14 54" stroke="url(#facultyGold)" strokeWidth="2" strokeLinecap="round" />
        <path d="M88 48 C90 40, 84 34, 82 30 C84 38, 84 46, 86 54" stroke="url(#facultyGold)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

/**
 * Professional Official Logo for HOD (Head of Department)
 */
export const HodRoleLogo: React.FC<RoleLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      title="Head of Department Executive Insignia"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-sm transition-transform duration-200 ${glow ? 'drop-shadow-md' : ''}`}
      >
        <defs>
          <linearGradient id="hodBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="50%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="hodGoldMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="hodPillars" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ecfdf5" />
          </linearGradient>
          <radialGradient id="hodGlow" cx="50%" cy="25%" r="55%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Circular Shield Base */}
        <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#hodBg)" />
        <rect x="5.5" y="5.5" width="89" height="89" rx="24.5" stroke="url(#hodGoldMain)" strokeWidth="2.5" />
        <circle cx="50" cy="30" r="34" fill="url(#hodGlow)" />

        {/* University Classical Pediment / Triangular Roof */}
        <polygon points="50,15 80,29 20,29" fill="url(#hodGoldMain)" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.3))" />
        <rect x="22" y="29" width="56" height="4" fill="#ffffff" rx="1" />

        {/* Classical Columns / Academic Pillars (4 Pillars) */}
        <rect x="26" y="34" width="7" height="30" rx="2" fill="url(#hodPillars)" />
        <rect x="40" y="34" width="7" height="30" rx="2" fill="url(#hodPillars)" />
        <rect x="53" y="34" width="7" height="30" rx="2" fill="url(#hodPillars)" />
        <rect x="67" y="34" width="7" height="30" rx="2" fill="url(#hodPillars)" />

        {/* Pillar Plinth / Base Steps */}
        <rect x="20" y="64" width="60" height="4" rx="1" fill="#ffffff" />
        <rect x="16" y="68" width="68" height="5" rx="2" fill="url(#hodGoldMain)" />

        {/* Executive Laurel Wreath of Leadership */}
        <path
          d="M14 62 C10 46, 14 32, 22 22 C18 34, 18 50, 24 64"
          stroke="url(#hodGoldMain)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M86 62 C90 46, 86 32, 78 22 C82 34, 82 50, 76 64"
          stroke="url(#hodGoldMain)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Executive Department Shield with Gold Star */}
        <g filter="drop-shadow(0px 3px 5px rgba(0,0,0,0.4))">
          <path
            d="M50 38 C58 38, 64 42, 64 50 C64 62, 50 69, 50 71 C50 69, 36 62, 36 50 C36 42, 42 38, 50 38 Z"
            fill="url(#hodGoldMain)"
          />
          <path
            d="M50 40.5 C56 40.5, 61.5 43.5, 61.5 50 C61.5 60, 50 66.5, 50 68 C50 66.5, 38.5 60, 38.5 50 C38.5 43.5, 44 40.5, 50 40.5 Z"
            fill="#064e3b"
          />
          {/* Central Star */}
          <polygon
            points="50,44 52.5,49 58,49.5 54,53 55.5,58 50,55 44.5,58 46,53 42,49.5 47.5,49"
            fill="url(#hodGoldMain)"
          />
        </g>

        {/* "HOD" Monogram Ribbon Banner */}
        <g filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.35))">
          <rect x="33" y="77" width="34" height="15" rx="5" fill="#ffffff" stroke="url(#hodGoldMain)" strokeWidth="1.5" />
          <text
            x="50"
            y="88.5"
            textAnchor="middle"
            fill="#065f46"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="10"
            letterSpacing="1"
          >
            HOD
          </text>
        </g>
      </svg>
    </div>
  );
};
