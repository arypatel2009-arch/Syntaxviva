import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Assignment } from '../types/index.ts';
import { FacultySidebar, FacultyTab } from './faculty/FacultySidebar.tsx';
import { FacultyHeader } from './faculty/FacultyHeader.tsx';
import { FacultyDashboardView } from './faculty/FacultyDashboardView.tsx';
import { FacultyAssignmentsView } from './faculty/FacultyAssignmentsView.tsx';
import { CreateAssignmentModal } from './faculty/CreateAssignmentModal.tsx';
import { FacultyStudentsView } from './faculty/FacultyStudentsView.tsx';
import { SubmissionReviewModal } from './faculty/SubmissionReviewModal.tsx';
import { FacultyAnalyticsView } from './faculty/FacultyAnalyticsView.tsx';
import { StudentProfileView } from './student/StudentProfileView.tsx';
import { BookACallModal } from './common/BookACallModal.tsx';

interface FacultyDashboardProps {
  onOpenRegistry?: () => void;
  onOpenSystemInspector?: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = () => {
  const { user } = useAuth();
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Persistent Collapsible Global Sidebar */}
      <FacultySidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'create') {
            setIsCreateModalOpen(true);
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
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onCreateAssignment={() => setIsCreateModalOpen(true)}
          onNavigateSettings={() => setCurrentTab('settings')}
        />

        {/* Dynamic Tab Body */}
        <main className="p-4 sm:p-6 lg:p-8 grow">
          {currentTab === 'dashboard' && (
            <FacultyDashboardView
              assignments={filteredAssignments}
              stats={stats}
              onCreateAssignment={() => setIsCreateModalOpen(true)}
              onViewAssignments={() => setCurrentTab('assignments')}
              onReviewSubmission={(sub) => setReviewSubmission(sub)}
              onRefresh={loadData}
              onDeleteAssignment={handleDeleteAssignment}
            />
          )}

          {currentTab === 'assignments' && (
            <FacultyAssignmentsView
              assignments={filteredAssignments}
              onCreateAssignment={() => setIsCreateModalOpen(true)}
              onRefresh={loadData}
              onDeleteAssignment={handleDeleteAssignment}
              onViewSubmissions={async (asg) => {
                try {
                  const res = await api.getAssignmentSubmissions(asg.id);
                  if (res.submissions && res.submissions.length > 0) {
                    setReviewSubmission(res.submissions[0]);
                  } else {
                    setReviewSubmission({
                      id: asg.id,
                      assignmentTitle: asg.title,
                      state: 'NO_SUBMISSIONS_YET',
                      studentName: 'No submissions',
                      studentEmail: 'Waiting for student participation',
                      submittedAt: null,
                      evaluation: { testsPassed: 0, testsTotal: 0, testResults: [] },
                    });
                  }
                } catch (err) {
                  console.error('Failed to load assignment submissions:', err);
                  setReviewSubmission({
                    id: asg.id,
                    assignmentTitle: asg.title,
                  });
                }
              }}
            />
          )}

          {currentTab === 'submissions' && (
            <div className="space-y-6">
              <FacultyDashboardView
                assignments={filteredAssignments}
                stats={stats}
                onCreateAssignment={() => setIsCreateModalOpen(true)}
                onViewAssignments={() => setCurrentTab('assignments')}
                onReviewSubmission={(sub) => setReviewSubmission(sub)}
                onRefresh={loadData}
                onDeleteAssignment={handleDeleteAssignment}
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

      {/* Submission Review Modal (Panel 24) */}
      <SubmissionReviewModal
        submission={reviewSubmission}
        onClose={() => setReviewSubmission(null)}
      />

      {/* Book a Call Inquiry Modal for Faculty Upgrade */}
      <BookACallModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        initialInquiryType="Pro plan pricing"
      />
    </div>
  );
};
