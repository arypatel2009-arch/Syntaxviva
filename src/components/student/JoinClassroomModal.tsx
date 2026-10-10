import React, { useState } from 'react';
import { X, Users, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Button, toast } from '../common/UIComponents.tsx';
import { Classroom } from '../../types/index.ts';

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
      const res = await api.joinClassroom(cleanCode);
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

      if (serverCode === 'cross_college_forbidden' || err.status === 403) {
        setError(
          'Cross-College Enrollment Blocked: This classroom belongs to another college or institution. You can only join classrooms in your college.'
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Join Classroom
              </h2>
              <p className="text-xs text-slate-500">
                Scoped multi-tenant student enrollment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 space-y-5">
          {error && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                errorCode === 'cross_college_forbidden'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : errorCode === 'already_enrolled'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-start gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
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
              className="w-full text-center tracking-[0.35em] font-mono text-2xl font-bold uppercase py-3.5 px-4 rounded-xl border-2 border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 text-slate-900 transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:font-normal"
            />
            <p className="text-[11px] text-slate-500 text-center">
              Enter the unique join code provided by your faculty member.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={loading}
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
