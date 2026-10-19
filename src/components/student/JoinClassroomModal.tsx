import React, { useState } from 'react';
import { X, Users, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Button, toast } from '../common/UIComponents.tsx';
import { Classroom } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const sanitize = (str?: string | null): string => {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Strips spaces, dots, dashes, and casing discrepancies
};

export const normalizeInstitution = sanitize;

interface JoinClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (classroom: Classroom) => void;
}

export const JoinClassroomModal: React.FC<JoinClassroomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(val);
    setError(null);
    setErrorCode(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-character classroom code.');
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      let studentCollegeRaw = profile?.institution_id || (profile as any)?.institution || user?.institution;

      // If studentProfile.institution is undefined in local session state,
      // fetch latest user profile from API / Supabase first before running validation to avoid false rejections.
      if (!studentCollegeRaw) {
        try {
          const me = await api.getMe();
          studentCollegeRaw =
            (me?.profile as any)?.institution ||
            me?.profile?.institution_id ||
            (me?.user as any)?.institution;
        } catch (fetchErr) {
          console.warn('[JoinClassroomModal] Could not hydrate user profile:', fetchErr);
        }
      }

      const res = await api.joinClassroom(cleanCode);

      const studentCollege = sanitize(studentCollegeRaw);
      const facultyCollege = sanitize(
        (res.classroom as any)?.institution ||
        res.classroom?.college_name ||
        (res.classroom as any)?.collegeName
      );

      if (studentCollege && facultyCollege && studentCollege !== facultyCollege) {
        throw new Error(
          'Cross-college enrollment forbidden: You cannot join a classroom from a different college/institution.'
        );
      }

      toast.success(
        'Enrolled Successfully!',
        `You have joined "${res.classroom.name}". Enrolled assignments are now accessible.`
      );
      setCode('');
      onSuccess(res.classroom);
      onClose();
    } catch (err: any) {
      const serverCode = err?.code || err?.data?.code || '';
      const serverMsg = err?.message || err?.data?.error || 'Failed to join classroom.';
      setErrorCode(serverCode);

      if (
        serverCode === 'cross_college_forbidden' ||
        serverMsg.toLowerCase().includes('cross-college') ||
        err.status === 403
      ) {
        setError(
          'Cross-college enrollment forbidden: You cannot join a classroom from a different college/institution.'
        );
      } else if (serverCode === 'already_enrolled' || err.status === 409) {
        setError('You are already enrolled in this classroom.');
      } else if (err.status === 404 || serverMsg.toLowerCase().includes('not found')) {
        setError(`No classroom found with code "${cleanCode}". Please double check with your professor.`);
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl shadow-black/80 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Join Classroom
              </h2>
              <p className="text-xs text-slate-400">
                Scoped multi-tenant student enrollment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 space-y-5">
          {error && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                errorCode === 'cross_college_forbidden' || error.includes('Cross-college')
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : errorCode === 'already_enrolled'
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              6-Character Classroom Code
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="e.g. SYN101"
              className="w-full text-center tracking-[0.35em] font-mono text-2xl font-bold uppercase py-3.5 px-4 rounded-xl border border-slate-700 bg-slate-950/80 focus:outline-hidden focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-white transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:font-normal"
            />
            <p className="text-[11px] text-slate-400 text-center">
              Enter the unique join code provided by your faculty member.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || code.trim().length !== 6}
              icon={loading ? Loader2 : ArrowRight}
            >
              {loading ? 'Verifying & Enrolling...' : 'Join Classroom'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
