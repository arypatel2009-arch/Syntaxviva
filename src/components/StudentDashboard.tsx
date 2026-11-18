import React, { useState, useEffect } from 'react';
import { useAuth, isProfileComplete } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Assignment } from '../types/index.ts';
import { Phase1SubmissionView } from './Phase1SubmissionView.tsx';
import { Phase2ChallengeView } from './Phase2ChallengeView.tsx';
import { StudentSidebar, StudentTab } from './student/StudentSidebar.tsx';
import { StudentHeader } from './student/StudentHeader.tsx';
import { StudentDashboardView } from './student/StudentDashboardView.tsx';
import { StudentAssignmentsView } from './student/StudentAssignmentsView.tsx';
import { StudentAssignmentDetailsModal } from './student/StudentAssignmentDetailsModal.tsx';
import { StudentResultsView } from './student/StudentResultsView.tsx';
import { StudentSubmissionsView } from './student/StudentSubmissionsView.tsx';
import { StudentProfileView } from './student/StudentProfileView.tsx';
import { JoinClassroomModal } from './student/JoinClassroomModal.tsx';
import { LargeSubmissionResultModal } from './common/LargeSubmissionResultModal.tsx';
import { AlertCircle, User, X } from 'lucide-react';
import { Button } from './common/UIComponents.tsx';

interface StudentDashboardProps {
  onOpenSystemInspector?: () => void;
  onOpenRegistry?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = () => {
  const { user, profile, role } = useAuth();
  const [currentTab, setCurrentTab] = useState<StudentTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'phase1' | 'phase2'>('phase1');
  const [inspectAssignment, setInspectAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedResultAssignment, setSelectedResultAssignment] = useState<Assignment | null>(null);
  const [showProfileGateModal, setShowProfileGateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [fullScreenSubmission, setFullScreenSubmission] = useState<any | null>(null);
  const [loadingFullResult, setLoadingFullResult] = useState<boolean>(false);

  const userProfileComplete = isProfileComplete(user, profile, role);

  const handleViewFullResult = async (assignment: Assignment) => {
    try {
      setLoadingFullResult(true);
      const res = await api.getStudentSubmissionDossier(assignment.id);
      if (res?.submission) {
        setFullScreenSubmission(res.submission);
        return;
      }
    } catch (err) {
      console.warn('Could not fetch student submission dossier, trying fallback:', err);
    }

    try {
      const p2 = await api.getStudentPhase2(assignment.id);
      const rawP2 = p2 as any;
      if (rawP2) {
        setFullScreenSubmission({
          id: rawP2.challengeId || assignment.id,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentLanguage: assignment.language,
          studentName: profile?.full_name || user?.name || 'Student',
          studentEmail: profile?.email || user?.email || '',
          studentRollNumber: profile?.roll_number || '—',
          studentDivisionId: profile?.division_id || 'DIV A',
          state: rawP2.state,
          phase2Status: rawP2.challengeStatus,
          score: rawP2.score !== undefined ? rawP2.score : (rawP2.challengeStatus === 'PASSED' ? 100 : 0),
          summary: rawP2.summary || 'Phase 2 evaluation completed.',
          failureReason: rawP2.evaluation?.failureReason,
          originalCode: rawP2.originalCode || (assignment as any).starterCode || '',
          phase1Code: rawP2.originalCode || (assignment as any).starterCode || '',
          mutatedCode: rawP2.mutatedCode || '',
          repairedCode: rawP2.finalCode || rawP2.repairedCode || '',
          submittedCode: rawP2.finalCode || rawP2.repairedCode || '',
          solutionCode: rawP2.originalCode || (assignment as any).starterCode || '',
          referenceSolution: rawP2.originalCode || (assignment as any).starterCode || '',
          bugMutations: rawP2.bugs || rawP2.bugReports || [],
          evaluation: rawP2.evaluation,
          submittedAt: rawP2.submittedAt,
          challenge: {
            id: rawP2.challengeId,
            status: rawP2.challengeStatus,
            mutatedCode: rawP2.mutatedCode,
            repairedCode: rawP2.finalCode || rawP2.repairedCode,
          },
        });
        return;
      }
    } catch (p2Err) {
      console.warn('Phase 2 details not found, switching to results tab:', p2Err);
    }

    setSelectedResultAssignment(assignment);
    setCurrentTab('results');
  };

  const loadAssignments = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .getAssignments()
      .then((res) => {
        setAssignments(res?.assignments || []);
      })
      .catch((err) => {
        if (!silent) {
          console.error('Failed to load student assignments:', err);
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    loadAssignments(false);
    const interval = setInterval(() => {
      loadAssignments(true);
    }, 3000);
    const handleFocus = () => loadAssignments(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const myAttemptsCount = (assignments || []).filter((a) => Boolean((a as any).myAttemptState)).length;
  const passedAttemptsCount = (assignments || []).filter(
    (a) => (a as any).myAttemptState === 'PASSED' || (a as any).myPhase2Status === 'PHASE2_PASSED'
  ).length;

  const handleOpenAssignment = (assignmentId: string, phase: 'phase1' | 'phase2' = 'phase1') => {
    if (!userProfileComplete) {
      setShowProfileGateModal(true);
      return;
    }
    setSelectedAssignmentId(assignmentId);
    setCurrentPhase(phase);
  };

  // If student opened an active assignment code editor or viva challenge
  if (selectedAssignmentId) {
    if (currentPhase === 'phase2') {
      return (
        <Phase2ChallengeView
          assignmentId={selectedAssignmentId}
          onBack={() => {
            setCurrentPhase('phase1');
            setSelectedAssignmentId(null);
            loadAssignments();
          }}
        />
      );
    }

    return (
      <Phase1SubmissionView
        assignmentId={selectedAssignmentId}
        onBack={() => {
          setSelectedAssignmentId(null);
          loadAssignments();
        }}
        onOpenPhase2={() => {
          setCurrentPhase('phase2');
        }}
      />
    );
  }

  // Filter assignments by global search if typed
  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen academic-atmosphere flex text-[#172B4D]">
      {/* 1. Persistent Collapsible Global Sidebar */}
      <StudentSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
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
        {/* Header with Search & User Pill */}
        <StudentHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          collapsed={sidebarCollapsed}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onNavigateSettings={() => setCurrentTab('settings')}
        />

        {/* Page Content View */}
        <main className={currentTab === 'settings' || currentTab === 'profile' ? 'p-3 sm:p-5 lg:p-7 xl:p-8 grow w-full min-h-[calc(100vh-5rem)]' : 'p-4 sm:p-6 lg:p-8 grow'}>
          {currentTab === 'dashboard' && (
            <StudentDashboardView
              assignments={filteredAssignments}
              stats={{
                activeAssignments: assignments.length,
                myAttempts: myAttemptsCount,
                passedAttempts: passedAttemptsCount,
              }}
              onSelectAssignment={handleOpenAssignment}
              onViewAllAssignments={() => setCurrentTab('assignments')}
              onJoinClassroom={() => setShowJoinModal(true)}
              onViewFullResult={handleViewFullResult}
            />
          )}

          {currentTab === 'assignments' && (
            <StudentAssignmentsView
              assignments={filteredAssignments}
              onSelectAssignment={handleOpenAssignment}
              onViewDetails={(asg) => setInspectAssignment(asg)}
              onRefresh={() => loadAssignments(false)}
              onViewFullResult={handleViewFullResult}
            />
          )}

          {currentTab === 'results' && (
            <StudentResultsView
              assignment={selectedResultAssignment || assignments.find((a) => Boolean((a as any).myAttemptState)) || assignments[0] || null}
              onBackToDashboard={() => setCurrentTab('dashboard')}
              onReviewSubmission={() => {
                const target = selectedResultAssignment || assignments.find((a) => Boolean((a as any).myAttemptState)) || assignments[0];
                if (target) {
                  handleOpenAssignment(target.id, 'phase1');
                }
              }}
              onViewFullResult={handleViewFullResult}
            />
          )}

          {currentTab === 'submissions' && (
            <StudentSubmissionsView
              assignments={filteredAssignments}
              onSelectAssignment={handleOpenAssignment}
              onViewResults={(asg) => {
                setSelectedResultAssignment(asg);
                setCurrentTab('results');
              }}
              onViewFullResult={handleViewFullResult}
            />
          )}

          {(currentTab === 'profile' || currentTab === 'settings') && <StudentProfileView />}
        </main>
      </div>

      {/* Full-Screen Result Dossier (Badi Screen) */}
      {fullScreenSubmission && (
        <LargeSubmissionResultModal
          submission={fullScreenSubmission}
          onClose={() => setFullScreenSubmission(null)}
        />
      )}

      {/* Assignment Details Modal (Panel 14) */}
      <StudentAssignmentDetailsModal
        assignment={inspectAssignment}
        onClose={() => setInspectAssignment(null)}
        onStart={(id, phase) => handleOpenAssignment(id, phase)}
      />

      {/* Join Classroom Modal */}
      <JoinClassroomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => loadAssignments(false)}
      />

      {/* Mandatory Profile Gate Modal */}
      {showProfileGateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Profile Completion Required</h3>
                  <p className="text-xs text-slate-500">Academic identity verification</p>
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
              Before you can start or submit lab assignments, you must complete your student profile details (<strong>Full Name</strong>, <strong>Roll Number</strong>, <strong>Institution</strong>, <strong>Class</strong>, and <strong>Division</strong>).
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
                  setCurrentTab('profile');
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
