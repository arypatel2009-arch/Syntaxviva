import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { PublicNavbar } from './components/public/PublicNavbar.tsx';
import { PublicFooter } from './components/public/PublicFooter.tsx';
import { HomePage } from './components/public/HomePage.tsx';
import { HowItWorksPage } from './components/public/HowItWorksPage.tsx';
import { FeaturesPage } from './components/public/FeaturesPage.tsx';
import { ForStudentsPage } from './components/public/ForStudentsPage.tsx';
import { ForFacultyPage } from './components/public/ForFacultyPage.tsx';
import { PricingPage } from './components/public/PricingPage.tsx';
import { AboutPage } from './components/public/AboutPage.tsx';
import { FAQPage } from './components/public/FAQPage.tsx';
import { ContactPage } from './components/public/ContactPage.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';
import { FacultyDashboard } from './components/FacultyDashboard.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { SystemInspectorModal } from './components/SystemInspectorModal.tsx';
import { MutationRegistryDrawer } from './components/MutationRegistryDrawer.tsx';
import { IntroVideoModal } from './components/common/IntroVideoModal.tsx';
import { AdminInquiriesDrawer } from './components/admin/AdminInquiriesDrawer.tsx';
import { Toaster } from './components/common/Toast.tsx';

const AppContent: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [showIntroVideo, setShowIntroVideo] = useState<boolean>(true);

  // Simple, robust client-side routing
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSystemInspectorOpen, setIsSystemInspectorOpen] = useState(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [isAdminInquiriesOpen, setIsAdminInquiriesOpen] = useState(false);

  // Sync with browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    navigate(mode === 'signup' ? '/signup' : '/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200/80 shadow-xs rounded-xl p-6 space-y-4">
          <div className="h-4 w-36 animate-pulse bg-slate-200 rounded" />
          <div className="h-3 w-full animate-pulse bg-slate-200 rounded" />
          <div className="h-3 w-4/5 animate-pulse bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LOGGED IN USER EXPERIENCE (Student or Faculty Dashboard)
  // --------------------------------------------------------------------------
  if (user) {
    if (role === 'faculty' || role === 'admin') {
      return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <FacultyDashboard />
          <SystemInspectorModal
            isOpen={isSystemInspectorOpen}
            onClose={() => setIsSystemInspectorOpen(false)}
          />
          <MutationRegistryDrawer
            isOpen={isRegistryOpen}
            onClose={() => setIsRegistryOpen(false)}
          />
          {role === 'admin' && (
            <AdminInquiriesDrawer
              isOpen={isAdminInquiriesOpen}
              onClose={() => setIsAdminInquiriesOpen(false)}
            />
          )}
        </div>
      );
    }

    // Default to Student Dashboard
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <StudentDashboard />
        <SystemInspectorModal
          isOpen={isSystemInspectorOpen}
          onClose={() => setIsSystemInspectorOpen(false)}
        />
        <MutationRegistryDrawer
          isOpen={isRegistryOpen}
          onClose={() => setIsRegistryOpen(false)}
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTH & RECOVERY PAGES
  // --------------------------------------------------------------------------
  const isHashSignup = typeof window !== 'undefined' && (window.location.hash.includes('type=signup') || window.location.hash.includes('type=email_verification'));
  const isHashRecovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

  if (
    currentPath === '/login' ||
    currentPath === '/signup' ||
    currentPath === '/forgot-password' ||
    currentPath === '/reset-password' ||
    currentPath === '/email-verified' ||
    isHashSignup ||
    isHashRecovery
  ) {
    let mode: 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'email-verified' = 'login';
    if (currentPath === '/signup') mode = 'signup';
    else if (currentPath === '/forgot-password') mode = 'forgot-password';
    else if (currentPath === '/reset-password' || isHashRecovery) mode = 'reset-password';
    else if (currentPath === '/email-verified' || isHashSignup) mode = 'email-verified';

    return (
      <AuthPage
        initialMode={mode}
        onNavigateHome={() => navigate('/')}
        onSuccess={() => navigate('/login')}
      />
    );
  }

  // --------------------------------------------------------------------------
  // PROTECTED ROUTE ENFORCEMENT FOR UNAUTHENTICATED USERS
  // --------------------------------------------------------------------------
  if (!user && (currentPath.startsWith('/student') || currentPath.startsWith('/faculty') || currentPath.startsWith('/admin'))) {
    return (
      <AuthPage
        initialMode="login"
        onNavigateHome={() => navigate('/')}
        onSuccess={() => navigate(currentPath)}
      />
    );
  }

  return (
    <div className="min-h-screen syntaxviva-landing flex flex-col font-sans antialiased">
      {showIntroVideo && <IntroVideoModal onClose={() => setShowIntroVideo(false)} />}
      {/* Public Top Navigation */}
      <PublicNavbar
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />

      {/* Main Public Page Content */}
      <main className="grow">
        {currentPath === '/' && (
          <HomePage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/how-it-works' && (
          <HowItWorksPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/features' && (
          <FeaturesPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/for-students' && (
          <ForStudentsPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/for-faculty' && (
          <ForFacultyPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/pricing' && (
          <PricingPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/about' && (
          <AboutPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/faq' && (
          <FAQPage onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentPath === '/contact' && (
          <ContactPage onNavigate={navigate} />
        )}

        {/* Fallback to HomePage if unmatched */}
        {![
          '/',
          '/how-it-works',
          '/features',
          '/for-students',
          '/for-faculty',
          '/pricing',
          '/about',
          '/faq',
          '/contact',
        ].includes(currentPath) && (
          <HomePage onNavigate={navigate} onOpenAuth={openAuth} />
        )}
      </main>

      {/* Public Footer */}
      <PublicFooter onNavigate={navigate} />

      {/* Global Inspector Modal */}
      <SystemInspectorModal
        isOpen={isSystemInspectorOpen}
        onClose={() => setIsSystemInspectorOpen(false)}
      />
      <MutationRegistryDrawer
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
      />
    </div>
  );
};

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  public state: { hasError: boolean; errorMsg: string } = {
    hasError: false,
    errorMsg: '',
  };

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMsg: error?.message || 'Unexpected UI error occurred.',
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[SyntaXViva] UI Error Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-slate-200/80 shadow-xs rounded-xl p-6 space-y-4 text-center">
            <h2 className="text-base font-semibold text-slate-900">
              Recovering Workspace
            </h2>
            <p className="text-xs text-slate-500">{this.state.errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                (this as any).setState({ hasError: false, errorMsg: '' });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </RootErrorBoundary>
  );
}
