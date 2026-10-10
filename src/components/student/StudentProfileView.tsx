import React, { useState, useRef } from 'react';
import { User, Mail, Building, CheckCircle2, Save, Upload, Camera, Trash2, AlertCircle } from 'lucide-react';
import { useAuth, isProfileComplete } from '../../context/AuthContext.tsx';
import { Button } from '../common/UIComponents.tsx';

export const StudentProfileView: React.FC = () => {
  const { user, profile, role, updateUserProfile, refreshUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: profile?.full_name || user?.name || '',
    email: profile?.email || user?.email || '',
    institution: profile?.institution_id || user?.institution || '',
    rollNumber: profile?.roll_number || user?.rollNumber || user?.roll_number || '',
    classId: profile?.class_id || user?.classId || user?.class_id || '',
    divisionId: profile?.division_id || user?.divisionId || user?.division_id || '',
    avatarUrl: profile?.avatar_url || user?.avatarUrl || user?.avatar_url || '',
  });

  React.useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        name: prev.name || profile?.full_name || user?.name || '',
        email: profile?.email || user?.email || prev.email || '',
        institution: prev.institution || profile?.institution_id || user?.institution || '',
        rollNumber: prev.rollNumber || profile?.roll_number || user?.rollNumber || user?.roll_number || '',
        classId: prev.classId || profile?.class_id || user?.classId || user?.class_id || '',
        divisionId: prev.divisionId || profile?.division_id || user?.divisionId || user?.division_id || '',
        avatarUrl: prev.avatarUrl || profile?.avatar_url || user?.avatarUrl || user?.avatar_url || '',
      }));
    }
  }, [profile, user]);

  const isComplete =
    isProfileComplete(user, profile, role) ||
    Boolean(
      formData.name &&
      formData.name.trim().length >= 2 &&
      formData.institution &&
      formData.institution.trim() &&
      (role === 'faculty' ||
        (formData.rollNumber &&
          formData.rollNumber.trim() &&
          formData.classId &&
          formData.classId.trim() &&
          formData.divisionId &&
          formData.divisionId.trim()))
    );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, avatarUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateUserProfile({
        full_name: formData.name,
        institution_id: formData.institution,
        roll_number: formData.rollNumber,
        class_id: formData.classId,
        division_id: formData.divisionId,
        avatar_url: formData.avatarUrl,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setSaveError(err.message || 'Failed to save profile. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const initialLetter = (formData.name || formData.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Profile & Account Identity
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal details, profile picture, and institutional affiliation.
        </p>
      </div>

      {/* Completion Status Alert Banner */}
      {!isComplete ? (
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm text-amber-900">Profile Incomplete</span>
            <p className="text-amber-800 leading-relaxed">
              {role === 'faculty'
                ? 'Please complete your Full Name and Institution Name to create lab assignments.'
                : 'Please complete your Full Name, Roll Number, Institution, Class, and Division to submit lab assignments.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Profile Complete & Verified — All permissions unlocked.</span>
        </div>
      )}

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* PROFILE DETAILS FORM */}
      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
        {/* Photo Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
          <div className="relative group">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt={formData.name || 'User Avatar'}
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-extrabold text-3xl flex items-center justify-center border-4 border-slate-100 shadow-md">
                {initialLetter}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition cursor-pointer"
              title="Upload Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-lg font-bold text-slate-900">{formData.name || 'User Profile'}</h2>
            <p className="text-xs text-slate-500">
              Upload a clear profile photo (PNG, JPG, WebP max 5MB).
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </button>
              {formData.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Identity Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Email Address (Primary Authority)</label>
            <input
              type="email"
              disabled
              value={formData.email}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Institution / College Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g. SyntaXViva Academic Institute"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {role === 'student' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Roll Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g. 2026CS101"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {role === 'faculty' ? 'Department' : 'Class / Batch'} {role === 'student' && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              required={role === 'student'}
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              placeholder={role === 'faculty' ? 'e.g. Computer Science' : 'e.g. Batch 2026'}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {role === 'student' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Division / Section <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.divisionId}
                onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                placeholder="e.g. Div A"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <Button type="submit" variant="primary" size="md" icon={Save} loading={saving}>
            Save Profile Details
          </Button>
        </div>
      </form>
    </div>
  );
};
