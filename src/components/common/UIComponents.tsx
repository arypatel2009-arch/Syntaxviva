import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon, MoreHorizontal, Inbox } from 'lucide-react';
export { toast, Toaster } from './Toast.tsx';

/* -------------------------------------------------------------------------- */
/* Button Component                                                           */
/* -------------------------------------------------------------------------- */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  }[size];

  const variants = {
    primary:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:bg-emerald-800',
    secondary:
      'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs hover:border-slate-300',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:bg-rose-800',
    dark:
      'bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:bg-slate-950',
  }[variant];

  return (
    <button
      className={`${base} ${sizes} ${variants} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Badge Component (Unified Brand Palette — No Clashing Multi-Color Mix)      */
/* -------------------------------------------------------------------------- */
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'emerald' | 'error';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
}) => {
  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
  }[size];

  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50/80 text-amber-800 border border-amber-200/80',
    info: 'bg-emerald-50/70 text-emerald-800 border border-emerald-200/70',
    neutral: 'bg-slate-100/80 text-slate-700 border border-slate-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    error: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    emerald: 'bg-emerald-600 text-white border border-emerald-700 shadow-xs',
  }[variant];

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-emerald-500',
    neutral: 'bg-slate-400',
    danger: 'bg-rose-500',
    error: 'bg-rose-500',
    emerald: 'bg-white',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-md tracking-tight ${sizes} ${variants}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />}
      {children}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Card Component                                                             */
/* -------------------------------------------------------------------------- */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  padding = 'md',
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs ${paddings} ${
        hoverEffect
          ? 'transition-all duration-200 hover:shadow-sm hover:border-slate-300'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Stat Card Component (Modern Sans-Serif Numbers & Unified Emerald Accent)   */
/* -------------------------------------------------------------------------- */
export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  color?: 'emerald' | 'blue' | 'amber' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg border border-emerald-200/60 bg-emerald-50/70 text-emerald-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trendPositive ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Circular Progress Gauge                                                    */
/* -------------------------------------------------------------------------- */
export interface CircularProgressProps {
  value: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 140,
  strokeWidth = 12,
  label = `${Math.round(value)}%`,
  sublabel = 'Overall Progress',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90 w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#059669"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
            {label}
          </span>
        </div>
      </div>
      {sublabel && (
        <span className="text-xs font-medium text-slate-500 mt-2">
          {sublabel}
        </span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Three-Dot Row Action Menu (`···` MoreHorizontal Dropdown)                  */
/* -------------------------------------------------------------------------- */
export interface RowActionItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface RowActionMenuProps {
  items: RowActionItem[];
  fadeOnHover?: boolean;
}

export const RowActionMenu: React.FC<RowActionMenuProps> = ({
  items,
  fadeOnHover = true,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div
      ref={menuRef}
      className={`relative inline-block text-left ${
        fadeOnHover && !open
          ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150'
          : 'opacity-100'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200/80 transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
        aria-label="Row actions"
        title="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white border border-slate-200/90 shadow-lg shadow-slate-900/5 py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isDanger = item.variant === 'danger';
            return (
              <button
                key={idx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer disabled:opacity-50 ${
                  isDanger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {Icon && (
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isDanger ? 'text-rose-500' : 'text-slate-400'
                    }`}
                  />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Skeleton Loaders (StatCardSkeleton & TableSkeleton)                        */
/* -------------------------------------------------------------------------- */
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 animate-pulse bg-slate-200 rounded" />
      <div className="w-9 h-9 animate-pulse bg-slate-200 rounded-lg" />
    </div>
    <div className="h-7 w-16 animate-pulse bg-slate-200 rounded" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 4,
  columns = 5,
}) => (
  <div className="w-full divide-y divide-slate-100">
    <div className="grid grid-cols-5 gap-4 py-3 px-6 bg-slate-50/70">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-3 w-20 animate-pulse bg-slate-200 rounded" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <div key={rIdx} className="grid grid-cols-5 gap-4 py-4 px-6 items-center">
        {Array.from({ length: columns }).map((_, cIdx) => (
          <div
            key={cIdx}
            className={`h-4 animate-pulse bg-slate-200 rounded ${
              cIdx === 0 ? 'w-36' : cIdx === columns - 1 ? 'w-8 ml-auto' : 'w-24'
            }`}
          />
        ))}
      </div>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Polished Empty State Component                                             */
/* -------------------------------------------------------------------------- */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title = 'No results found',
  description = 'No records matched your search criteria. Try clearing filters.',
  actionLabel,
  onAction,
}) => (
  <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-500 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
    <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);
