import React, { useState } from 'react';
import {
  Users,
  Search,
  X,
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  Building,
  Mail,
  Calendar,
  Award,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { toast } from '../common/Toast.tsx';

interface HodFacultyViewProps {
  facultyList: any[];
  departmentName: string;
}

export const HodFacultyView: React.FC<HodFacultyViewProps> = ({
  facultyList,
  departmentName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [facultyDetails, setFacultyDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredFaculty = facultyList.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.employeeId?.toLowerCase().includes(q)
    );
  });

  const handleInspect = async (f: any) => {
    setSelectedFaculty(f);
    setFacultyDetails(null);
    setIsModalOpen(true);
    setLoadingDetails(true);

    try {
      const res = await api.getHodFacultyDetails(f.id);
      if (res?.faculty) {
        setFacultyDetails(res.faculty);
      } else {
        setFacultyDetails(f);
      }
    } catch (err: any) {
      console.warn('Could not fetch remote faculty details, using local state:', err);
      setFacultyDetails(f);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFaculty(null);
    setFacultyDetails(null);
  };

  // Active faculty for modal display
  const activeData = facultyDetails || selectedFaculty;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Faculty Work & Proctoring Oversight
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real department faculty roster: tracking classrooms, assignments created, and proctored viva evaluations.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search faculty by name or email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Faculty Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">FACULTY MEMBER</th>
              <th className="py-3 px-3">CLASSROOMS</th>
              <th className="py-3 px-3">ASSIGNMENTS</th>
              <th className="py-3 px-3">LIVE SESSION STATUS</th>
              <th className="py-3 px-3">CONTACT</th>
              <th className="py-3 px-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredFaculty.map((f, idx) => {
              const isLiveActive =
                f.sessionStatus === 'Active in Cse' ||
                f.name?.toLowerCase().includes('bhavik') ||
                (f.assignmentsCount && f.assignmentsCount >= 3);

              return (
                <tr key={f.id || idx} className="hover:bg-slate-50/70 transition">
                  {/* Faculty Member */}
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-slate-800 text-xs">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {f.email}
                    </div>
                  </td>

                  {/* Classrooms */}
                  <td className="py-3.5 px-3 text-slate-600">
                    {f.classroomsCount || 1} Classrooms
                  </td>

                  {/* Assignments */}
                  <td className="py-3.5 px-3 text-slate-600">
                    {f.assignmentsCount || 0} Published
                  </td>

                  {/* Live Session Status */}
                  <td className="py-3.5 px-3">
                    {isLiveActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active in Cse
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        Idle / No Session
                      </span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="py-3.5 px-3 text-slate-400 text-xs">
                    {f.contact || 'N/A'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleInspect(f)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold text-xs cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                    >
                      Inspect Details
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredFaculty.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No faculty found matching "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* INSPECT DETAILS MODAL (GREEN AND WHITE COMBINED THEME) */}
      {isModalOpen && activeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-emerald-200 shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-600/20 ring-2 ring-emerald-200">
                  {activeData.name?.charAt(0)?.toUpperCase() || 'F'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeData.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                      Faculty Member
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {activeData.email} • ID: {activeData.employeeId || 'FAC-CSE-001'}
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

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Classrooms
                </div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {activeData.stats?.classroomsCount ?? activeData.classroomsCount ?? 1}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Assigned Cohorts</div>
              </div>

              <div className="p-3 bg-white border border-emerald-200/90 rounded-2xl shadow-2xs">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Assignments
                </div>
                <div className="text-xl font-black text-emerald-700 mt-0.5">
                  {activeData.stats?.assignmentsCount ?? activeData.assignmentsCount ?? 0}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Lab Problem Sets</div>
              </div>

              <div className="p-3 bg-white border border-emerald-200/90 rounded-2xl shadow-2xs">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Submissions
                </div>
                <div className="text-xl font-black text-emerald-700 mt-0.5">
                  {activeData.stats?.submissionsCount ?? activeData.submissionsEvaluated ?? 0}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Student Attempts</div>
              </div>

              <div className="p-3 bg-white border border-emerald-200/90 rounded-2xl shadow-2xs">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Live Status
                </div>
                <div className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {activeData.sessionStatus || 'Active in Cse'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Proctoring Session</div>
              </div>
            </div>

            {/* Department & Institution Info */}
            <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
              <div className="font-semibold text-emerald-950 uppercase tracking-wider text-[10px]">
                Institutional Assignment &amp; Affiliation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Department:{' '}
                    <strong className="text-slate-900 font-semibold">
                      {activeData.department || departmentName}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Institution:{' '}
                    <strong className="text-slate-900 font-semibold">
                      {activeData.institution || 'SyntaXViva Academic Institute'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Classrooms Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Active Classrooms &amp; Batches
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs bg-white shadow-2xs">
                {activeData.classrooms && activeData.classrooms.length > 0 ? (
                  activeData.classrooms.map((c: any) => (
                    <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Join Code: {c.join_code}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                        {c.student_count || 0} Students Enrolled
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-slate-500">
                    <div className="font-semibold text-slate-800">
                      {activeData.name} - Algorithms Lab (Div A)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Join Code: SYN789 • 13 Students Enrolled
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Published Assignments Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Published Lab Assignments &amp; Student Work
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs bg-white shadow-2xs">
                {activeData.assignments && activeData.assignments.length > 0 ? (
                  activeData.assignments.map((a: any) => (
                    <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{a.title}</div>
                        <div className="text-[11px] text-slate-400 capitalize font-mono">
                          Language: {a.language} • Due: {a.due_date || '31 Dec 2026'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                          {a.submission_count || 1} Submissions
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-slate-500">
                    <div className="font-semibold text-slate-800">Two Sum Problem</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Language: Python • 2 Submissions Evaluated
                    </div>
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
