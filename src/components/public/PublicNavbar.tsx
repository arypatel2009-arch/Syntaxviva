import React, { useState, useEffect } from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export interface PublicNavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentPath,
  onNavigate,
  onOpenAuth,
}) => {
  const { user, role, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const scrollToTarget = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    if (currentPath !== '/') {
      onNavigate('/');
      setTimeout(scrollToTarget, 60);
    } else {
      scrollToTarget();
    }
  };

  return (
    <header
      id="header"
      className={`fixed top-0 left-0 right-0 z-50 border-b border-white/[.06] glass transition-shadow ${
        scrolled ? 'shadow-2xl shadow-black/20' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="h-[72px] flex items-center justify-between">
          {/* Brand */}
          <a
            href="#product"
            id="nav-logo"
            onClick={(e) => handleSectionClick(e, 'product')}
            className="flex items-center gap-3"
          >
            <div className="logo-mark w-9 h-9 rounded-xl flex items-center justify-center">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M7 4L3 8l4 4" />
                <path d="M17 4l4 4-4 4" />
                <path d="M14 3l-4 18" />
              </svg>
            </div>

            <div>
              <div className="font-display font-bold tracking-tight text-white">
                Syntax<span className="text-emerald-400">Viva</span>
              </div>
              <div className="text-[9px] uppercase tracking-[.2em] text-slate-500">
                Assessment OS
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a
              href="#product"
              onClick={(e) => handleSectionClick(e, 'product')}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Product
            </a>

            <a
              href="#features"
              onClick={(e) => handleSectionClick(e, 'features')}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Features
            </a>

            <a
              href="#methodology"
              onClick={(e) => handleSectionClick(e, 'methodology')}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Methodology
            </a>

            <a
              href="#pricing"
              onClick={(e) => handleSectionClick(e, 'pricing')}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Pricing
            </a>

            <a
              href="#resources"
              onClick={(e) => handleSectionClick(e, 'resources')}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Resources
            </a>
          </nav>

          {/* Header Actions */}
          <div className="hidden md:flex items-center gap-5">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    onNavigate(
                      role === 'faculty' ? '/faculty' : role === 'admin' ? '/admin' : '/student'
                    )
                  }
                  className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-emerald-900/20 cursor-pointer"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>
                    {role === 'faculty'
                      ? 'Faculty Portal'
                      : role === 'admin'
                      ? 'Admin Portal'
                      : 'Student Portal'}
                  </span>
                </button>
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[.06] transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  id="btn-nav-login"
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="text-sm font-medium text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  id="btn-nav-signup"
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-emerald-900/20 cursor-pointer"
                >
                  Book Demo
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            id="mobileMenuBtn"
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 text-slate-300 cursor-pointer"
            aria-label="Open navigation"
          >
            <svg width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          id="mobileMenu"
          className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:hidden pb-5 border-t border-white/[.06]`}
        >
          <div className="flex flex-col gap-4 pt-5">
            <a
              href="#product"
              onClick={(e) => handleSectionClick(e, 'product')}
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Product
            </a>
            <a
              href="#features"
              onClick={(e) => handleSectionClick(e, 'features')}
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Features
            </a>
            <a
              href="#methodology"
              onClick={(e) => handleSectionClick(e, 'methodology')}
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Methodology
            </a>
            <a
              href="#pricing"
              onClick={(e) => handleSectionClick(e, 'pricing')}
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Pricing
            </a>
            <a
              href="#resources"
              onClick={(e) => handleSectionClick(e, 'resources')}
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Resources
            </a>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(
                    role === 'faculty' ? '/faculty' : role === 'admin' ? '/admin' : '/student'
                  );
                }}
                className="inline-flex justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                {role === 'faculty'
                  ? 'Faculty Portal'
                  : role === 'admin'
                  ? 'Admin Portal'
                  : 'Student Portal'}
              </button>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="inline-flex justify-center rounded-full border border-white/[.12] px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="inline-flex justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white cursor-pointer"
                >
                  Book Demo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
