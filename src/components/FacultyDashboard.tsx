import React, { useState, useEffect } from 'react';
import { useAuth, isProfileComplete } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Assignment } from '../types/index.ts';
import { FacultySidebar, FacultyTab } from './faculty/FacultySidebar.tsx';
import { FacultyHeader } from './faculty/FacultyHeader.tsx';
import { FacultyDashboardView } from './faculty/FacultyDashboardView.tsx';
import { FacultyAssignmentsView } from './faculty/FacultyAssignmentsView.tsx';
import { CreateAssignmentModal } from './faculty/CreateAssignmentModal.tsx';
import { FacultyStudentsView } from './faculty/FacultyStudentsView.tsx';
import { SubmissionReviewModal } from './faculty/SubmissionReviewModal.tsx';
import { LargeSubmissionResultModal } from './common/LargeSubmissionResultModal.tsx';
import { AssignmentSubmissionsReportModal } from './common/AssignmentSubmissionsReportModal.tsx';
import { FacultyAnalyticsView } from './faculty/FacultyAnalyticsView.tsx';
import { StudentProfileView } from './student/StudentProfileView.tsx';
import { BookACallModal } from './common/BookACallModal.tsx';
import { User, X } from 'lucide-react';
import { Button } from './common/UIComponents.tsx';

interface FacultyDashboardProps {
  onOpenRegistry?: () => void;
  onOpenSystemInspector?: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = () => {
  const { user, profile, role } = useAuth();
  const [currentTab, setCurrentTab] = useState<FacultyTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    totalStudents: 0,
    activeAssignments: 0,
    totalAttempts: 0,
    passedAttempts: 0,
  });
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [reviewSubmission, setReviewSubmission] = useState<any | null>(null);
  const [reportAssignmentId, setReportAssignmentId] = useState<string | null>(null);
  const [showProfileGateModal, setShowProfileGateModal] = useState(false);

  const isFacultyProfileComplete = isProfileComplete(user, profile, role);

  const handleOpenCreateAssignment = () => {
    if (!isFacultyProfileComplete) {
      setShowProfileGateModal(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, statsRes] = await Promise.all([
        api.getAssignments(),
        api.getStats().catch(() => ({ stats: null })),
      ]);

      setAssignments(assignmentsRes.assignments || []);
      if (statsRes.stats) {
        setStats({
          totalAssignments:
            statsRes.stats.totalAssignments ?? assignmentsRes.assignments?.length ?? 0,
          totalStudents: statsRes.stats.totalStudents ?? 0,
          activeAssignments: assignmentsRes.assignments?.length ?? 0,
          totalAttempts: statsRes.stats.totalSubmissions ?? 0,
          passedAttempts: statsRes.stats.completedAttempts ?? 0,
        });
      }
    } catch (err) {
      console.error('Failed to load faculty dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Claim faculty session lease and maintain heartbeat
    let heartbeatInterval: any = null;
    api.claimFacultySession()
      .then(() => {
        heartbeatInterval = setInterval(() => {
          api.heartbeatFacultySession().catch((err) => {
            console.warn('Faculty session heartbeat warning:', err);
          });
        }, 30000);
      })
      .catch((err) => {
        console.warn('Faculty session claim notice:', err);
      });

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      api.releaseFacultySession().catch(() => {});
    };
  }, []);

  const handleDeleteAssignment = async (assignmentId: string) => {
    await api.deleteAssignment(assignmentId);
    await loadData();
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen academic-atmosphere flex text-[#172B4D]">
      {/* 1. Persistent Collapsible Global Sidebar */}
      <FacultySidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'create') {
            handleOpenCreateAssignment();
          } else {
            setCurrentTab(tab);
          }
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Content Area */}
      <div
        className={`grow ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        } flex flex-col min-w-0 transition-all duration-200`}
      >
        {/* Header */}
        <FacultyHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          collapsed={sidebarCollapsed}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onCreateAssignment={handleOpenCreateAssignment}
          onNavigateSettings={() => setCurrentTab('settings')}
        />

        {/* Dynamic Tab Body */}
        <main className={currentTab === 'settings' ? 'p-3 sm:p-5 lg:p-7 xl:p-8 grow w-full min-h-[calc(100vh-5rem)]' : 'p-4 sm:p-6 lg:p-8 grow'}>
          {currentTab === 'dashboard' && (
            <FacultyDashboardView
              assignments={filteredAssignments}
              stats={stats}
              onCreateAssignment={handleOpenCreateAssignment}
              onViewAssignments={() => setCurrentTab('assignments')}
              onViewSubmissions={(asg) => setReportAssignmentId(asg.id)}
              onReviewSubmission={(sub) => setReviewSubmission(sub)}
              onRefresh={loadData}
              onDeleteAssignment={handleDeleteAssignment}
              viewMode="dashboard"
            />
          )}

          {currentTab === 'assignments' && (
            <FacultyAssignmentsView
              assignments={filteredAssignments}
              onCreateAssignment={handleOpenCreateAssignment}
              onRefresh={loadData}
              onDeleteAssignment={handleDeleteAssignment}
              onViewSubmissions={(asg) => setReportAssignmentId(asg.id)}
            />
          )}

          {currentTab === 'submissions' && (
            <div className="space-y-6">
              <FacultyDashboardView
                assignments={filteredAssignments}
                stats={stats}
                onCreateAssignment={handleOpenCreateAssignment}
                onViewAssignments={() => setCurrentTab('assignments')}
                onViewSubmissions={(asg) => setReportAssignmentId(asg.id)}
                onReviewSubmission={(sub) => setReviewSubmission(sub)}
                onRefresh={loadData}
                onDeleteAssignment={handleDeleteAssignment}
                viewMode="submissions"
              />
            </div>
          )}

          {currentTab === 'students' && <FacultyStudentsView />}

          {currentTab === 'analytics' && <FacultyAnalyticsView />}

          {currentTab === 'settings' && <StudentProfileView />}
        </main>
      </div>

      {/* Create Assignment Modal (Panel 22) */}
      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Full-Screen Forensic Submission Review Modal (Badi Screen) */}
      {reviewSubmission && (
        <LargeSubmissionResultModal
          submission={reviewSubmission}
          onClose={() => setReviewSubmission(null)}
        />
      )}

      {/* Assignment Submissions & Performance Report Modal */}
      {reportAssignmentId && (
        <AssignmentSubmissionsReportModal
          assignmentId={reportAssignmentId}
          onClose={() => setReportAssignmentId(null)}
          onSelectAssignment={(id) => setReportAssignmentId(id)}
        />
      )}

      {/* Book a Call Inquiry Modal for Faculty Upgrade */}
      <BookACallModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        initialInquiryType="Pro plan pricing"
      />

      {/* Mandatory Profile Gate Modal for Faculty */}
      {showProfileGateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Faculty Profile Required</h3>
                  <p className="text-xs text-slate-500">Identity & Institution verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileGateModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Before you can create new lab assignments, you must complete your faculty profile details (<strong>Full Name</strong> and <strong>Institution Name</strong>).
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileGateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowProfileGateModal(false);
                  setCurrentTab('settings');
                }}
              >
                Complete Profile Now &rarr;
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
