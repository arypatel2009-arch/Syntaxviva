import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

interface HodSubjectsViewProps {
  classroomsList: any[];
  departmentName: string;
}

export const HodSubjectsView: React.FC<HodSubjectsViewProps> = ({
  classroomsList,
  departmentName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClassrooms = classroomsList.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.join_code?.toLowerCase().includes(q) ||
      c.faculty_name?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Department Subjects, Classrooms & Divisions
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real classroom allocations, division cohorts, and assigned laboratory faculty.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects or join code..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Classrooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClassrooms.map((c, idx) => (
          <div
            key={c.id || idx}
            className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              {/* Top row with join code and active badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-md bg-blue-50/80 border border-blue-200 text-blue-600 text-xs font-mono font-bold tracking-wider">
                  {c.join_code || 'SYN000'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Lab
                </span>
              </div>

              {/* Classroom Name */}
              <h3 className="font-bold text-slate-800 text-sm mt-3 mb-1 line-clamp-1">
                {c.name}
              </h3>

              {/* Faculty Name */}
              <p className="text-xs text-slate-500">
                Faculty:{' '}
                <span className="text-slate-700 font-medium">
                  {c.faculty_name || 'Faculty Member'}
                </span>
              </p>
            </div>

            {/* Bottom row */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[170px]">
                {c.department || departmentName || 'Computer Science & Engineering'}
              </span>
              <span className="shrink-0 font-medium text-slate-500">
                {c.student_count || 0} {c.student_count === 1 ? 'Student' : 'Students'}
              </span>
            </div>
          </div>
        ))}

        {filteredClassrooms.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No department classrooms or subjects found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
