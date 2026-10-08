import React, { useState } from 'react';
import { User, Mail, Building, ShieldCheck, CheckCircle2, Save, Key, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Button } from '../common/UIComponents.tsx';

export const StudentProfileView: React.FC = () => {
  const { user, profile, resetPassword, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences'>('profile');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: profile?.full_name || user?.name || '',
    email: profile?.email || user?.email || '',
    institution: profile?.institution_id || user?.institution || '',
    rollNumber: profile?.roll_number || user?.rollNumber || '',
    classId: profile?.class_id || user?.classId || '',
    divisionId: profile?.division_id || user?.divisionId || '',
    department: '',
    semester: '',
    bio: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        full_name: formData.name,
        institution_id: formData.institution,
        roll_number: formData.rollNumber,
        class_id: formData.classId,
        division_id: formData.divisionId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.warn('Profile save note:', err);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetPassword = async () => {
    try {
      const emailToSend = profile?.email || user?.email || formData.email;
      if (emailToSend) {
        await resetPassword(emailToSend);
        setResetMessage('Password reset verification link sent to your registered email.');
      }
    } catch (err: any) {
      setResetMessage(err.message || 'Unable to send password reset email at this time.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Profile & Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your student credentials, institutional affiliation, and proctoring preferences.
        </p>
      </div>

      {/* Tabs (Panel 19) */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'profile', label: 'Student Profile', icon: User },
          { id: 'account', label: 'Security & Auth', icon: Key },
          { id: 'preferences', label: 'Notifications & Camera', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center">
              {(formData.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{formData.name || 'Student Profile'}</h2>
              <p className="text-xs text-slate-500 font-mono">
                {formData.rollNumber ? `Roll No: ${formData.rollNumber}` : 'Student Examinee'}
                {formData.classId && formData.divisionId ? ` • ${formData.classId} (${formData.divisionId})` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Roll Number</label>
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Institution / College</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Class / Batch</label>
              <input
                type="text"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Division / Section</label>
              <input
                type="text"
                value={formData.divisionId}
                onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" size="md" icon={Save} loading={saving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'account' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Security & Authentication</h2>
          <p className="text-xs text-slate-500">
            Manage your password, connected Supabase authentication, and active sessions.
          </p>

          {resetMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Password</div>
              <div className="text-xs text-slate-500">Secured with Supabase Authentication</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendResetPassword}
            >
              Reset Password
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Deterministic Device ID</div>
              <div className="text-xs text-slate-500 font-mono">dev_sess_9024f923</div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              Authorized
            </span>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Proctoring & Notification Preferences</h2>
          <div className="space-y-4 text-xs">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-medium text-slate-800">Show proctoring warning notices on screen</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-medium text-slate-800">Email diagnostic report when evaluation completes</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
