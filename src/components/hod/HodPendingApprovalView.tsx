import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Building,
  Mail,
  User,
  CheckCircle2,
  RefreshCw,
  LogOut,
  KeyRound,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { toast } from '../common/Toast.tsx';

interface HodPendingApprovalViewProps {
  onApproved?: () => void;
}

export const HodPendingApprovalView: React.FC<HodPendingApprovalViewProps> = ({ onApproved }) => {
  const { user, profile, logout, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshUser) {
        await refreshUser();
      } else {
        window.location.reload();
      }
      toast.info('Status updated', 'Checked institutional verification status.');
      if (onApproved) onApproved();
    } catch (err: any) {
      toast.error('Check failed', err.message || 'Could not verify status.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickApproveDev = async () => {
    setIsApproving(true);
    try {
      await api.quickApproveHodDev(user?.id);
      toast.success('HOD Account Approved!', 'Your account is now authorized. Loading dashboard...');
      if (refreshUser) {
        await refreshUser();
      }
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error('Approval failed', err.message || 'Could not activate account.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
              SyntaxViva <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">HOD Portal</span>
            </h1>
            <p className="text-xs text-slate-400">Institutional Role Verification & Authorization Gateway</p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Approval Banner Container */}
      <div className="max-w-2xl w-full mx-auto my-auto py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
            <Clock className="w-4 h-4 animate-spin" />
            <span>PENDING INSTITUTIONAL APPROVAL</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            HOD Account Awaiting Administrator Authorization
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            Welcome, <strong>{user?.name || 'Professor'}</strong>. Your registration for the{' '}
            <strong className="text-indigo-400">{profile?.department || user?.department || 'Department'}</strong>{' '}
            Head of Department portal has been successfully logged with your verification credentials.
          </p>

          {/* Credentials Summary Box */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800/60">
              Registered Institutional Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-400">Legal Name:</span>
                <span className="font-semibold text-white truncate">{user?.name || profile?.full_name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-400">Academic Email:</span>
                <span className="font-semibold text-white truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Building className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-indigo-300 truncate">{profile?.department || user?.department || 'Computer Science & Engineering'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-400">Employee ID:</span>
                <span className="font-mono font-semibold text-amber-300 truncate">{profile?.employee_id || user?.employeeId || 'HOD-ID-PENDING'}</span>
              </div>
            </div>
          </div>

          {/* Security & Access Notice */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl text-xs text-slate-300 flex items-start gap-3 mb-6 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Security & FERPA/Academic Privacy Safeguard:</strong> Head of Department
              accounts have cross-faculty visibility and access to all student oral viva recordings, code mutations, and evaluation
              records. Access is activated only upon institutional verification by a campus administrator.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking...' : 'Check Approval Status'}</span>
            </button>

            {/* Dev Environment 1-Click Approval Helper */}
            <button
              onClick={handleQuickApproveDev}
              disabled={isApproving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/30 cursor-pointer"
              title="Admin test simulation for instant approval"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isApproving ? 'Authorizing...' : 'Admin Sandbox: Approve Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center pt-4 border-t border-slate-800 text-[11px] text-slate-500">
        SyntaxViva Academic Security Infrastructure • Department Restricted View Model
      </div>
    </div>
  );
};