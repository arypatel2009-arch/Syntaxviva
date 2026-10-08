import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  Users,
} from 'lucide-react';

export type StatusFilterOption = 'all' | 'Passed' | 'Pending' | 'Lockout';

export interface MultiFacetFilterState {
  search: string;
  selectedCohorts: string[];
  statusFilter: StatusFilterOption;
  onlyActiveLogins: boolean;
  languageFilter?: string;
}

export interface FilterToolbarProps {
  filters: MultiFacetFilterState;
  onChange: (updated: MultiFacetFilterState) => void;
  availableCohorts?: string[];
  showLanguageFilter?: boolean;
  searchPlaceholder?: string;
  onlyActiveLabel?: string;
}

const DEFAULT_COHORTS = [
  'Main Campus',
  'CSE-A',
  'CSE-B',
  'AI-DS',
  'IT-A',
];

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onChange,
  availableCohorts = DEFAULT_COHORTS,
  showLanguageFilter = false,
  searchPlaceholder = 'Search by student name, roll number, email, or assignment...',
  onlyActiveLabel = 'Show Only Active Logins',
}) => {
  const [cohortDropdownOpen, setCohortDropdownOpen] = useState(false);
  const cohortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (cohortRef.current && !cohortRef.current.contains(e.target as Node)) {
        setCohortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleCohort = (cohort: string) => {
    const exists = filters.selectedCohorts.includes(cohort);
    const next = exists
      ? filters.selectedCohorts.filter((c) => c !== cohort)
      : [...filters.selectedCohorts, cohort];
    onChange({ ...filters, selectedCohorts: next });
  };

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.selectedCohorts.length > 0 ||
    filters.statusFilter !== 'all' ||
    filters.onlyActiveLogins ||
    (filters.languageFilter && filters.languageFilter !== 'all');

  const handleReset = () => {
    onChange({
      search: '',
      selectedCohorts: [],
      statusFilter: 'all',
      onlyActiveLogins: false,
      languageFilter: 'all',
    });
  };

  const statusOptions: { value: StatusFilterOption; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Passed', label: 'Passed' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Lockout', label: 'Lockout' },
  ];

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* 1. Search Input */}
        <div className="relative grow max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Multi-Facet Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multi-Select Dropdown for Batch / Cohort */}
          <div ref={cohortRef} className="relative">
            <button
              type="button"
              onClick={() => setCohortDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                filters.selectedCohorts.length > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Batch / Cohort</span>
              {filters.selectedCohorts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-semibold tabular-nums">
                  {filters.selectedCohorts.length}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {cohortDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-56 bg-white border border-slate-200/90 rounded-xl shadow-lg py-1.5 z-40">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Select Batch / Cohort</span>
                  {filters.selectedCohorts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filters, selectedCohorts: [] })}
                      className="text-emerald-600 hover:underline capitalize font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {availableCohorts.map((cohort) => {
                    const checked = filters.selectedCohorts.includes(cohort);
                    return (
                      <button
                        key={cohort}
                        type="button"
                        onClick={() => toggleCohort(cohort)}
                        className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                              checked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                          <span className="font-medium text-slate-700">{cohort}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Assignment Status Filter ("Passed", "Pending", "Lockout") */}
          <div className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-200/90 p-0.5">
            {statusOptions.map((opt) => {
              const active = filters.statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...filters, statusFilter: opt.value })}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Optional Language Filter */}
          {showLanguageFilter && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <select
                value={filters.languageFilter || 'all'}
                onChange={(e) => onChange({ ...filters, languageFilter: e.target.value })}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200/90 text-xs font-medium bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                <option value="all">All Languages</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>
            </div>
          )}

          {/* Toggle Switch: "Show Only Active Logins" */}
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100/70 transition">
            <button
              type="button"
              role="switch"
              aria-checked={filters.onlyActiveLogins}
              onClick={() =>
                onChange({ ...filters, onlyActiveLogins: !filters.onlyActiveLogins })
              }
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                filters.onlyActiveLogins ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  filters.onlyActiveLogins ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
            <span>{onlyActiveLabel}</span>
          </label>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Cohort Chips */}
      {filters.selectedCohorts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Cohorts:</span>
          {filters.selectedCohorts.map((cohort) => (
            <span
              key={cohort}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-medium"
            >
              {cohort}
              <button
                type="button"
                onClick={() => toggleCohort(cohort)}
                className="hover:text-emerald-950 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
