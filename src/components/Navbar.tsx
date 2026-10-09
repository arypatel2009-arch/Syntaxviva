import React from 'react';
import { ShieldCheck, LogOut, Database, User as UserIcon, GraduationCap, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

import { Logo } from './common/Logo.tsx';

interface NavbarProps {
  onOpenSystemInspector: () => void;
  onOpenRegistry: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSystemInspector, onOpenRegistry }) => {
  const { user, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <Logo size="md" showTagline variant="light" />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Architecture / Registry quick links */}
          <button
            id="btn-nav-registry"
            onClick={onOpenRegistry}
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="View 27 initial mutation types in database registry"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Mutation Registry (27)</span>
          </button>

          <button
            id="btn-nav-system-inspector"
            onClick={onOpenSystemInspector}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Inspect Database, JWT & Architecture"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">DB & Auth Live</span>
            <span className="inline sm:hidden">Live</span>
          </button>

          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              {/* Role pill */}
              <div className="flex items-center gap-1.5">
                {role === 'faculty' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Faculty
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                    <BookOpen className="w-3.5 h-3.5" />
                    Student
                  </span>
                )}
              </div>

              {/* User details */}
              <div className="hidden lg:block text-right">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{user.email}</div>
              </div>

              {/* Logout button */}
              <button
                id="btn-nav-logout"
                onClick={logout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
