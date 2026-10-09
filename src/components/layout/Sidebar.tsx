import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Code2,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Menu,
  Building2,
  ChevronDown,
  Keyboard,
  User as UserIcon,
  Plus,
  Check,
  Sparkles,
  FileCode,
  Award,
  Calendar,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Logo } from '../common/Logo.tsx';
import { Button, toast } from '../common/UIComponents.tsx';
import { api } from '../../lib/api.ts';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

export interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: any) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  portalLabel?: string;
  items?: SidebarNavItem[];
}

export const DEFAULT_FACULTY_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'dashboard', label: 'Overview / Dashboard', icon: LayoutDashboard },
  { id: 'assignments', label: 'Lab Assignments', icon: Code2 },
  { id: 'students', label: 'Submissions & Rosters', icon: Users },
  { id: 'analytics', label: 'Automated Viva Tests', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const DEFAULT_STUDENT_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'dashboard', label: 'Overview / Dashboard', icon: LayoutDashboard },
  { id: 'assignments', label: 'Lab Assignments', icon: Code2 },
  { id: 'submissions', label: 'Submissions & Rosters', icon: FileCode },
  { id: 'results', label: 'Automated Viva Tests', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
  portalLabel = 'Enterprise Workspace',
  items = DEFAULT_FACULTY_NAV_ITEMS,
}) => {
  const { user, profile, role, logout } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayRole =
    role === 'faculty' || role === 'admin'
      ? 'Faculty / Admin'
      : profile?.roll_number
      ? `Roll #${profile.roll_number}`
      : 'Student Examinee';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Persistent Left-Hand White Enterprise Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 ${
          collapsed ? 'w-20' : 'w-64'
        } border-r border-slate-200 bg-white text-slate-900 flex flex-col justify-between transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Section */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size="md" imageOnly={collapsed} variant="light" />
            </div>

            {/* Mobile Close or Desktop Collapse Toggle */}
            <div className="flex items-center">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="py-4 px-2.5 space-y-1">
            {!collapsed && (
              <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Navigation
              </div>
            )}

            {items.map((item) => {
              const isActive =
                currentTab === item.id ||
                (item.id === 'students' && currentTab === 'submissions' && role !== 'student');
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2.5 rounded-l-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold border-r-2 border-emerald-600'
                      : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded-md font-semibold tabular-nums ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Workspace Footer & Quick Sign-Out */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          <div
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'justify-between'
            } gap-2.5 px-2 py-1.5 rounded-lg`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0 text-left">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{displayRole}</div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={() => logout()}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

/* ============================================================================
 * GLOBAL TOP HEADER & PROFILE BAR
 * ========================================================================== */

interface GlobalTopHeaderProps {
  onToggleSidebar: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateAssignment?: () => void;
  onNavigateSettings?: () => void;
  searchPlaceholder?: string;
}

const INSTITUTIONS = [
  { id: 'main-cse', name: 'Main Campus — CSE Dept', code: 'CSE-2026' },
  { id: 'soe-ai', name: 'School of Engineering — AI & DS', code: 'AIDS-2026' },
  { id: 'sys-lab', name: 'Systems & Compiler Lab', code: 'SYS-LAB' },
];

export const GlobalTopHeader: React.FC<GlobalTopHeaderProps> = ({
  onToggleSidebar,
  searchTerm,
  onSearchChange,
  onCreateAssignment,
  onNavigateSettings,
  searchPlaceholder = 'Search assignments, student rosters, submissions...',
}) => {
  const { user, profile, role, logout } = useAuth();

  const [selectedInstitution, setSelectedInstitution] = useState(INSTITUTIONS[0]);
  const [instMenuOpen, setInstMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  const instRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch {
      // ignore background fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('syntaxviva:notifications-updated', handleUpdate);
    const interval = setInterval(fetchNotifications, 8000);
    return () => {
      window.removeEventListener('syntaxviva:notifications-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (instRef.current && !instRef.current.contains(e.target as Node)) {
        setInstMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || 'user@syntaxviva.edu';
  const roleLabel =
    role === 'faculty' || role === 'admin' ? 'Faculty / Admin' : 'Student Examinee';

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      // ignore
    }
    toast.info('All notifications marked as read');
  };

  const handleDeleteNotification = async (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await api.deleteNotification(notifId);
      toast.success('Notification deleted');
    } catch {
      // ignore
    }
  };

  const handleClearAllNotifications = async () => {
    setNotifications([]);
    try {
      await api.clearAllNotifications();
      toast.success('All notifications deleted');
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Search */}
        <div className="flex items-center gap-3 grow max-w-md">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>
        </div>

        {/* Right: System Status Pill, Institution Switcher, Notification Bell & Profile Avatar Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* 1. Live System Status Pill */}
          <div className="hidden xl:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>System Online</span>
          </div>

          {/* 2. Institution Switcher Dropdown */}
          <div ref={instRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setInstMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-700 transition cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="max-w-[160px] truncate">
                {profile?.institution_id || selectedInstitution.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {instMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200/90 rounded-xl shadow-lg py-1.5 z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Switch Institution / Lab
                </div>
                {INSTITUTIONS.map((inst) => {
                  const isSelected = selectedInstitution.id === inst.id;
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => {
                        setSelectedInstitution(inst);
                        setInstMenuOpen(false);
                        toast.success('Institution switched', `Active workspace: ${inst.name}`);
                      }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <div className="font-medium text-slate-800">{inst.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{inst.code}</div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional New Assignment CTA for Faculty */}
          {onCreateAssignment && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateAssignment}
              icon={Plus}
              className="hidden sm:inline-flex"
            >
              New Assignment
            </Button>
          )}

          {/* 3. Notification Bell with Unread Badge Counter */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifMenuOpen((prev) => !prev);
                fetchNotifications();
              }}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-88 bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-900">
                    Notifications ({notifications.length})
                  </span>
                  <div className="flex items-center gap-2.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllNotifications}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete all</span>
                      </button>
                    )}
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center space-y-1.5">
                    <Bell className="w-5 h-5 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium text-slate-700">No notifications</p>
                    <p className="text-[11px] text-slate-400">
                      When faculty publishes an assignment, logged-in students will receive a notification here with the deadline date.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.map((n) => {
                      const formattedDeadline = n.dueDate
                        ? new Date(n.dueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : null;
                      const formattedTime = n.createdAt
                        ? new Date(n.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';

                      return (
                        <div
                          key={n.id}
                          className={`group px-4 py-3 text-xs space-y-1.5 transition-colors ${
                            n.unread ? 'bg-emerald-50/35' : 'bg-white hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-900 leading-snug">
                              {n.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {formattedTime}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteNotification(n.id)}
                                title="Delete notification"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-slate-500 text-[11px]">{n.message}</p>

                          {/* Deadline & Language Info */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {formattedDeadline && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold">
                                <Calendar className="w-3 h-3 text-emerald-600" />
                                <span>Deadline: {formattedDeadline}</span>
                              </span>
                            )}
                            {n.language && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/70 text-slate-600 font-mono text-[10px] uppercase">
                                {n.language}
                              </span>
                            )}
                            {(role === 'faculty' || role === 'admin') &&
                              typeof n.notifiedStudentCount === 'number' && (
                                <span className="text-[10px] text-slate-400">
                                  • Sent to {n.notifiedStudentCount} logged-in student(s)
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. User Profile Avatar Dropdown */}
          <div ref={profileRef} className="relative pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-xs shadow-2xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <div className="text-xs font-semibold text-slate-900 max-w-[120px] truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">{roleLabel}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200/90 rounded-xl shadow-lg py-1.5 z-50">
                {/* User Summary Header */}
                <div className="px-4 py-3 border-b border-slate-100 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {displayName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold shrink-0">
                      {roleLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{displayEmail}</div>
                </div>

                {/* Menu Links */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      if (onNavigateSettings) onNavigateSettings();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShortcutsModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Keyboard Shortcuts</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">
                      ?
                    </kbd>
                  </button>
                </div>

                {/* Red-Accented Sign Out */}
                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Keyboard Shortcuts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {[
                { label: 'Global Search Focus', keys: ['Ctrl', 'K'] },
                { label: 'Create New Lab Assignment', keys: ['Alt', 'N'] },
                { label: 'Format Code in Editor', keys: ['Shift', 'Alt', 'F'] },
                { label: 'Export Table Selection (CSV)', keys: ['Ctrl', 'E'] },
              ].map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                >
                  <span className="text-slate-600 font-medium">{sc.label}</span>
                  <div className="flex items-center gap-1">
                    {sc.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded border border-slate-200 shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
