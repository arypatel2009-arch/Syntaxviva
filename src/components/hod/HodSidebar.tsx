import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Clock,
  LineChart,
  FileBarChart,
  ShieldCheck,
  Settings,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export type HodTab =
  | 'overview'
  | 'faculty'
  | 'students'
  | 'assignments'
  | 'subjects'
  | 'evaluations'
  | 'analytics'
  | 'reports'
  | 'settings';

interface HodSidebarProps {
  currentTab: HodTab;
  onSelectTab: (tab: HodTab) => void;
  pendingCount?: number;
  departmentName?: string;
}

export const HodSidebar: React.FC<HodSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingCount = 4,
  departmentName = 'Computer Science & Engineering',
}) => {
  const { user, profile, logout } = useAuth();

  const navItems = [
    { id: 'overview' as HodTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'faculty' as HodTab, label: 'Faculty Monitoring', icon: Users },
    { id: 'students' as HodTab, label: 'Student Submissions', icon: GraduationCap },
    { id: 'assignments' as HodTab, label: 'Assignments', icon: Calendar },
    { id: 'subjects' as HodTab, label: 'Subjects & Classes', icon: BookOpen },
    {
      id: 'evaluations' as HodTab,
      label: 'Pending Evaluations',
      icon: Clock,
      badge: pendingCount ? `${pendingCount}` : '4',
    },
    { id: 'analytics' as HodTab, label: 'Reports & Analytics', icon: LineChart },
    { id: 'reports' as HodTab, label: 'Department Reports', icon: FileBarChart },
    { id: 'settings' as HodTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto select-none">
      <div className="py-4 space-y-4">
        {/* Brand Header */}
        <div className="px-5 pb-1 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 font-black text-sm">
            &lt;/&gt;
          </div>
          <span className="text-slate-900 font-bold text-base tracking-tight">
            SyntaXViva
          </span>
        </div>

        {/* Section label */}
        <div className="px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          NAVIGATION
        </div>

        {/* Navigation Items */}
        <nav className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border-r-2 border-emerald-500'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate text-xs">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] text-slate-400 font-medium px-1">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Smarter Analytics Stronger Academia Card (Matches Screenshot 1:1) */}
      <div className="px-3 pb-3 mt-auto">
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200/80 rounded-2xl p-3 text-center shadow-2xs relative overflow-hidden">
          <div className="w-9 h-9 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs mb-1.5">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">Smarter Analytics</h4>
          <p className="text-[10px] text-slate-500 font-medium">Stronger Academia</p>
          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className="mt-2 w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Explore Insights</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Bottom Profile Pill */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            D
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 text-xs truncate">
              {user?.name || profile?.full_name || 'Dr. Rajesh Sharma'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Head of Department
            </div>
          </div>
        </div>

        <button
          onClick={() => logout?.()}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
