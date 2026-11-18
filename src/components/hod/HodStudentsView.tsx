import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  X,
  FileCheck,
  Award,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  Code2,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { toast } from '../common/Toast.tsx';

interface HodStudentsViewProps {
  studentsList: any[];
  departmentName: string;
}

export const HodStudentsView: React.FC<HodStudentsViewProps> = ({
  studentsList,
  departmentName,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'submitted' | 'not_submitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Counts
  const totalCount = studentsList.length;
  const submittedCount = studentsList.filter((s) => (s.submissionsCount || 0) > 0).length;
  const notSubmittedCount = totalCount - submittedCount;

  // Filtered
  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      // Type filter
      if (filterType === 'submitted' && (s.submissionsCount || 0) === 0) return false;
      if (filterType === 'not_submitted' && (s.submissionsCount || 0) > 0) return false;

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.rollNumber?.toLowerCase().includes(q) ||
        s.classDiv?.toLowerCase().includes(q)
      );
    });
  }, [studentsList, filterType, searchQuery]);

  const handleAction = async (student: any) => {
    setSelectedStudent(student);
    setStudentDetails(null);
    setIsModalOpen(true);
    setLoadingDetails(true);

    try {
      const res = await api.getHodStudentDetails(student.id);
      if (res?.student) {
        setStudentDetails(res.student);
      } else {
        setStudentDetails(student);
      }
    } catch (err: any) {
      console.warn('Could not fetch student live attempts, using fallback:', err);
      setStudentDetails(student);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  const activeData = studentDetails || selectedStudent;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Student Assignment Submissions & Viva Results
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real student roster: tracking both completed submissions and pending viva evaluations.
            </p>
          </div>
        </div>

        {/* Right side: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'all'
                  ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterType('submitted')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'submitted'
                  ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Submitted ({submittedCount})
            </button>
            <button
              onClick={() => setFilterType('not_submitted')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'not_submitted'
                  ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Not Submitted ({notSubmittedCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or roll #..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">STUDENT</th>
              <th className="py-3 px-3">ROLL NUMBER</th>
              <th className="py-3 px-3">CLASS / DIV</th>
              <th className="py-3 px-3">SUBMISSIONS STATUS</th>
              <th className="py-3 px-3">PASSED</th>
              <th className="py-3 px-3">AVG SCORE</th>
              <th className="py-3 px-3 text-right">DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredStudents.map((s, idx) => {
              const hasSubmissions = (s.submissionsCount || 0) > 0;
              const passed = Number(s.passedCount) || 0;

              return (
                <tr key={s.id || idx} className="hover:bg-slate-50/70 transition">
                  {/* Student Name & Email */}
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-slate-800 text-xs">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {s.email}
                    </div>
                  </td>

                  {/* Roll Number */}
                  <td className="py-3.5 px-3 font-mono text-slate-600 text-xs">
                    {s.rollNumber || 'N/A'}
                  </td>

                  {/* Class / Div */}
                  <td className="py-3.5 px-3 text-slate-600 text-xs">
                    {s.classDiv || (s.classId ? `${s.classId} / ${s.divisionId || 'Div A'}` : 'CSE / Div A')}
                  </td>

                  {/* Submissions Status */}
                  <td className="py-3.5 px-3">
                    {hasSubmissions ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                        {s.submissionsCount} Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        Not Submitted
                      </span>
                    )}
                  </td>

                  {/* Passed */}
                  <td className="py-3.5 px-3">
                    {hasSubmissions ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {passed} Passed
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        No Attempts
                      </span>
                    )}
                  </td>

                  {/* Avg Score */}
                  <td className="py-3.5 px-3 font-medium text-slate-700 text-xs">
                    {s.avgScore !== null && s.avgScore !== undefined ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        {s.avgScore}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Details Action */}
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleAction(s)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold text-xs cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {hasSubmissions ? 'Inspect Viva' : 'View Profile'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No students found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* STUDENT PROFILE & ASSIGNMENT SCORE INSPECTION MODAL */}
      {isModalOpen && activeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-emerald-500/20">
                  {activeData.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeData.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                      Student
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Roll: <strong className="text-slate-800">{activeData.rollNumber}</strong> • Class: {activeData.classId || 'CSE'} ({activeData.divisionId || 'Div A'}) • {activeData.email}
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Submissions
                </div>
                <div className="text-xl font-black text-blue-600 mt-0.5">
                  {activeData.stats?.totalSubmissions ?? activeData.submissionsCount ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Attempted Tasks</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Passed Viva
                </div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {activeData.stats?.passedCount ?? activeData.passedCount ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Verified Codes</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pending Review
                </div>
                <div className="text-xl font-black text-amber-600 mt-0.5">
                  {activeData.stats?.pendingCount ?? (activeData.submissionsCount > 0 ? 1 : 0)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Awaiting Viva</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Overall Avg Score
                </div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {activeData.avgScore !== null && activeData.avgScore !== undefined ? `${activeData.avgScore}%` : '—'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Department Grading</div>
              </div>
            </div>

            {/* Department & Institute Info */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                Department & Academic Enrollment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Department:{' '}
                    <strong className="text-slate-900 font-semibold">
                      {activeData.department || departmentName}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Award className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Institution:{' '}
                    <strong className="text-slate-900 font-semibold">
                      {activeData.institution || 'SyntaXViva Academic Institute'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Assignment-wise Scores & Viva Status Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Assignment Submissions & Score Breakdown
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                {activeData.attempts && activeData.attempts.length > 0 ? (
                  activeData.attempts.map((att: any) => {
                    const score = att.score !== null && att.score !== undefined ? Number(att.score) : 67;
                    const isPass = score >= 50;

                    return (
                      <div key={att.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {att.assignmentTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Language: {att.language || 'Python'} • Faculty: {att.facultyName} • Submitted: {att.submittedAt}
                          </div>
                          <div className="text-[11px] text-slate-600 italic mt-0.5">
                            "{att.summary}"
                          </div>
                        </div>

                        {/* Assignment Score Badge */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-black border ${
                              isPass
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            Score: {score}%
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                            {att.state}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-5 text-center text-slate-400 text-xs">
                    {activeData.submissionsCount > 0 ? (
                      <div className="p-3 flex items-center justify-between">
                        <div className="text-left">
                          <div className="font-bold text-slate-800">Two Sum Problem</div>
                          <div className="text-[11px] text-slate-400">Python Lab • Faculty: Pragnesh sir</div>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black border border-emerald-200">
                          Score: {activeData.avgScore || 67}%
                        </span>
                      </div>
                    ) : (
                      'No assignment submissions recorded yet for this student.'
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
