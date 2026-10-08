import React from 'react';

interface PublicFooterProps {
  onNavigate: (path: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const scrollToTarget = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    if (window.location.pathname !== '/') {
      onNavigate('/');
      setTimeout(scrollToTarget, 60);
    } else {
      scrollToTarget();
    }
  };

  return (
    <footer
      id="resources"
      className="border-t border-white/[.06] bg-[#090D14]"
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <a
              href="#product"
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

              <span className="font-display font-bold text-white">
                Syntax<span className="text-emerald-400">Viva</span>
              </span>
            </a>

            <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">
              Automated computer science assessment infrastructure for
              universities, departments and educators.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Platform
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <a
                href="#product"
                onClick={(e) => handleSectionClick(e, 'product')}
                className="block hover:text-white transition"
              >
                Product
              </a>

              <a
                href="#features"
                onClick={(e) => handleSectionClick(e, 'features')}
                className="block hover:text-white transition"
              >
                Features
              </a>

              <a
                href="#methodology"
                onClick={(e) => handleSectionClick(e, 'methodology')}
                className="block hover:text-white transition"
              >
                Methodology
              </a>

              <a
                href="#pricing"
                onClick={(e) => handleSectionClick(e, 'pricing')}
                className="block hover:text-white transition"
              >
                Pricing
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Company
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/about');
                }}
                className="block hover:text-white transition"
              >
                About
              </a>

              <a
                href="#methodology"
                onClick={(e) => handleSectionClick(e, 'methodology')}
                className="block hover:text-white transition"
              >
                Documentation
              </a>

              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/contact');
                }}
                className="block hover:text-white transition"
              >
                Contact
              </a>

              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/about');
                }}
                className="block hover:text-white transition"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[.06] flex flex-col sm:flex-row justify-between gap-3">
          <span className="text-xs text-slate-600">
            © 2026 SyntaxViva. All rights reserved.
          </span>

          <span className="font-mono text-[9px] text-slate-700">
            ASSESSMENT_INFRASTRUCTURE / V1.0
          </span>
        </div>
      </div>
    </footer>
  );
};
