import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { toast } from '../common/Toast.tsx';
import { HodSidebar, HodTab } from './HodSidebar.tsx';
import { HodTopNavbar } from './HodTopNavbar.tsx';
import { HodOverview } from './HodOverview.tsx';
import { HodFacultyView } from './HodFacultyView.tsx';
import { HodStudentsView } from './HodStudentsView.tsx';
import { HodAssignmentsView } from './HodAssignmentsView.tsx';
import { HodSubjectsView } from './HodSubjectsView.tsx';
import { HodEvaluationsView } from './HodEvaluationsView.tsx';
import { HodReportsView } from './HodReportsView.tsx';
import { HodPendingApprovalView } from './HodPendingApprovalView.tsx';
import { StudentProfileView } from '../student/StudentProfileView.tsx';
import {
  Settings,
  ShieldCheck,
  Building,
  Mail,
  User,
  KeyRound,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const HodDashboard: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();
  const [currentTab, setCurrentTab] = useState<HodTab>('overview');
  const [loading, setLoading] = useState(true);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  // Data states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [classroomsList, setClassroomsList] = useState<any[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [vivaAnalytics, setVivaAnalytics] = useState<any>(null);

  const departmentName =
    selectedDepartment || profile?.department || user?.department || overviewData?.department || 'Computer Science & Engineering';

  // Load HOD Data
  const loadData = useCallback(async (deptOverride?: string) => {
    // Check local profile first
    const status = profile?.approval_status || user?.approval_status || user?.approvalStatus;
    if (status === 'PENDING_APPROVAL') {
      setIsPendingApproval(true);
      setLoading(false);
      return;
    }

    const targetDept = deptOverride || selectedDepartment || profile?.department || user?.department || 'Computer Science & Engineering';

    setLoading(true);
    try {
      const [overviewRes, facultyRes, studentsRes, assignmentsRes, classroomsRes, evaluationsRes, auditRes, vivaRes] = await Promise.allSettled([
        api.getHodOverview(targetDept),
        api.getHodFaculty(targetDept),
        api.getHodStudents(targetDept),
        api.getHodAssignments(targetDept),
        api.getHodClassrooms(targetDept),
        api.getHodEvaluations(targetDept),
        api.getHodAuditLogs(targetDept),
        api.getInstitutionalVivaAnalytics({ department: targetDept }),
      ]);

      // Check if overview failed due to pending approval
      if (overviewRes.status === 'rejected') {
        const err = overviewRes.reason;
        if (err?.code === 'hod_pending_approval' || err?.message?.includes('approval')) {
          setIsPendingApproval(true);
          setLoading(false);
          return;
        }
      }

      if (overviewRes.status === 'fulfilled') {
        setOverviewData(overviewRes.value);
        setIsPendingApproval(false);
      }
      if (facultyRes.status === 'fulfilled' && facultyRes.value?.faculty) {
        setFacultyList(facultyRes.value.faculty);
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value?.students) {
        setStudentsList(studentsRes.value.students);
      }
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value?.assignments) {
        setAssignmentsList(assignmentsRes.value.assignments);
      }
      if (classroomsRes.status === 'fulfilled' && classroomsRes.value?.classrooms) {
        setClassroomsList(classroomsRes.value.classrooms);
      }
      if (evaluationsRes.status === 'fulfilled' && evaluationsRes.value?.evaluations) {
        setEvaluationsList(evaluationsRes.value.evaluations);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value?.logs) {
        setAuditLogs(auditRes.value.logs);
      }
      if (vivaRes.status === 'fulfilled' && vivaRes.value) {
        setVivaAnalytics(vivaRes.value);
      }
    } catch (err: any) {
      console.error('[HOD Dashboard Load Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, profile?.department, user?.department, profile?.approval_status, user?.approval_status, user?.approvalStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDepartmentChange = (newDept: string) => {
    setSelectedDepartment(newDept);
    loadData(newDept);
    toast.info('Department Filter', `Switched view to ${newDept}`);
  };

  // If pending approval, render the dedicated pending view
  if (isPendingApproval) {
    return (
      <HodPendingApprovalView
        onApproved={() => {
          setIsPendingApproval(false);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex font-sans antialiased">
      {/* Sidebar */}
      <HodSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingCount={overviewData?.stats?.pendingEvaluations || 0}
        departmentName={departmentName}
      />

      {/* Main Content Area - Full Width */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto max-h-screen bg-[#f4f7fb] w-full min-w-0">
        <div className="w-full">
          {/* Top Navbar matching header screenshot (Except reports tab which has its dedicated Institutional Intelligence header) */}
          {currentTab !== 'reports' && (
            <HodTopNavbar
              userName={user?.name || profile?.full_name || 'Prof. Bhavik'}
              departmentName={departmentName}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'overview' && (
            <HodOverview
              data={overviewData}
              loading={loading}
              onRefresh={() => loadData(departmentName)}
              onNavigateTab={setCurrentTab}
              userName={user?.name || profile?.full_name || 'Prof. Bhavik'}
              departmentName={departmentName}
              departmentOptions={overviewData?.departmentOptions || []}
              onDepartmentChange={handleDepartmentChange}
            />
          )}

          {currentTab === 'faculty' && (
            <HodFacultyView
              facultyList={facultyList.length > 0 ? facultyList : overviewData?.facultyWorkload || []}
              departmentName={departmentName}
            />
          )}

          {currentTab === 'students' && (
            <HodStudentsView
              studentsList={studentsList}
              departmentName={departmentName}
            />
          )}

          {currentTab === 'assignments' && (
            <HodAssignmentsView
              assignmentsList={assignmentsList.length > 0 ? assignmentsList : (overviewData?.upcomingDeadlines || [])}
              departmentName={departmentName}
            />
          )}

          {currentTab === 'subjects' && (
            <HodSubjectsView
              classroomsList={classroomsList}
              departmentName={departmentName}
            />
          )}

          {currentTab === 'evaluations' && (
            <HodEvaluationsView
              pendingEvaluationsList={evaluationsList.length > 0 ? evaluationsList : (overviewData?.pendingEvaluationsList || [])}
              departmentName={departmentName}
            />
          )}

          {currentTab === 'reports' && (
            <HodReportsView
              departmentName={departmentName}
              onNavigateTab={setCurrentTab}
              userName={user?.name || profile?.full_name || 'Prof. Bhavik'}
            />
          )}

          {currentTab === 'analytics' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-200/90">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                  <span>Department Academic Analytics & Insights</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Predictive viva completion metrics and AST mutant survival patterns in {departmentName}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Viva Oral Defense Survival Rate</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        AST mutation survival rate benchmarks across active coursework.
                      </p>
                    </div>
                    {vivaAnalytics && vivaAnalytics.totalVivaAttempts > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {vivaAnalytics.totalVivaAttempts} Attempts
                      </span>
                    )}
                  </div>

                  {vivaAnalytics && vivaAnalytics.totalVivaAttempts > 0 ? (
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600 font-medium">Phase 1 (Compiler & Logic Tests)</span>
                          <span className="font-bold text-emerald-600">
                            {vivaAnalytics.phase1CompilerPassRate || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, vivaAnalytics.phase1CompilerPassRate || 0))}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600 font-medium">Phase 2 (AST Mutation & Code Defense)</span>
                          <span className="font-bold text-teal-600">
                            {vivaAnalytics.defectResolutionRate || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, vivaAnalytics.defectResolutionRate || 0))}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600 font-medium">Oral Viva Audio Authenticity Index</span>
                          <span className="font-bold text-emerald-700">
                            {vivaAnalytics.oralAuthenticityIndex || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, vivaAnalytics.oralAuthenticityIndex || 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center space-y-1.5">
                      <TrendingUp className="w-8 h-8 text-slate-300" />
                      <div className="text-xs font-bold text-slate-700">No Viva Evaluations Logged Yet</div>
                      <div className="text-[11px] text-slate-400 max-w-sm">
                        Real-time AST mutation survival metrics will calculate automatically once students complete coursework and defend code.
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base">Grading Turnaround Velocity</h3>
                  <p className="text-xs text-slate-500">
                    Average time from student submission to faculty review completion.
                  </p>
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-emerald-800">Turnaround Status</div>
                      <div className="text-2xl font-black text-emerald-950 mt-0.5">
                        {overviewData?.stats?.totalSubmissions > 0 ? 'Active Workflow' : 'Awaiting Submissions'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {overviewData?.stats?.totalSubmissions > 0 ? `${overviewData.stats.totalSubmissions} Submitted` : '0 Submitted'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automated oral viva transcription and AST code differential evaluation streamlines
                    faculty grading burden dynamically as coursework progresses.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="w-full">
              <StudentProfileView />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};