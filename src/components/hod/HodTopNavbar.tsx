import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Building,
  Menu,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { toast } from '../common/Toast.tsx';

interface HodTopNavbarProps {
  userName?: string;
  departmentName?: string;
  onSearch?: (query: string) => void;
  onSelectTab?: (tab: any) => void;
}

export const HodTopNavbar: React.FC<HodTopNavbarProps> = ({
  userName = 'Prof. Bhavik',
  departmentName = 'Computer Science & Engineering',
  onSearch,
  onSelectTab,
}) => {
  const { user, profile, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false);
      toast.info('Signing Out', 'Logging out of HOD administrative session...');
      await logout();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Logout error:', err);
      window.location.href = '/';
    }
  };

  const displayName = user?.name || profile?.full_name || userName || 'Prof. Bhavik';
  const displayEmail = user?.email || profile?.email || 'academicc@institute.edu';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-xs mb-5 relative select-none">
      {/* Left: Hamburger Menu & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button className="text-slate-400 hover:text-slate-600 p-1">
          <Menu className="w-4 h-4" />
        </button>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search students, faculty, assignments..."
            className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* System Online badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>System Online</span>
        </div>

        {/* College / Institution Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/90 text-xs font-bold shadow-2xs">
          <Building className="w-3.5 h-3.5 text-teal-600" />
          <span>{profile?.institution_id || user?.institution || 'GU'}</span>
        </div>

        {/* Bell with active status */}
        <button
          onClick={() => toast.info('Notifications', 'Department notifications up to date.')}
          className="relative p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
            1
          </span>
        </button>

        {/* User Account Button with Downward Arrow */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-2 border-l border-slate-100 hover:bg-slate-50 py-1 px-1.5 rounded-xl transition cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              D
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-slate-900 leading-tight group-hover:text-emerald-600 transition truncate max-w-[140px]">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Head of Department
              </div>
            </div>
            {/* Downward Arrow */}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-emerald-600' : 'group-hover:text-slate-600'
              }`}
            />
          </button>

          {/* Account Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    D
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">
                      {displayEmail}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">Role:</span>
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                    HOD
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="text-slate-800 font-semibold truncate max-w-[130px]" title={departmentName}>
                    {departmentName}
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectTab?.('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account & Department Settings</span>
                </button>
              </div>

              {/* Divider & Logout Button */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out / Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
