import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Building2,
  GraduationCap,
  Check,
  CheckCircle2,
  Save,
  Upload,
  Camera,
  Trash2,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Bell,
  Search,
  ShieldCheck,
  FileText,
  Briefcase,
  Sprout,
  Hash,
  Layers,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  Clock,
  DoorOpen,
} from 'lucide-react';
import { useAuth, isProfileComplete } from '../../context/AuthContext.tsx';
import { toast } from '../common/UIComponents.tsx';

export const StudentProfileView: React.FC = () => {
  const { user, profile, role, updateUserProfile, refreshUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Left sidebar active navigation tab (Only Profile, Personal, and Education remain)
  const [activeNavTab, setActiveNavTab] = useState<'profile' | 'personal' | 'education'>('profile');
  // Horizontal sub-tabs for quick switching
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'institution' | 'contact'>('basic');
  const [profileSearch, setProfileSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const userId = user?.id || (user as any)?.userId || profile?.id || 'current_user';

  // Helper to load extra metadata from localStorage
  const loadExtraData = () => {
    try {
      const stored = localStorage.getItem(`syntaxviva_extra_profile_${userId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const extra = useMemo(() => loadExtraData(), [userId]);

  // Unified Form State for both Faculty and Student
  const [formData, setFormData] = useState({
    // Profile & Identity
    name: profile?.full_name || user?.name || '',
    email: profile?.email || user?.email || '',
    institution: profile?.institution_id || user?.institution || '',
    rollNumber: profile?.roll_number || user?.rollNumber || (user as any)?.roll_number || '',
    classId: profile?.class_id || user?.classId || (user as any)?.class_id || (user as any)?.department || '',
    divisionId: profile?.division_id || user?.divisionId || (user as any)?.division_id || '',
    avatarUrl: profile?.avatar_url || user?.avatarUrl || (user as any)?.avatar_url || '',
    designation: extra.designation || '',

    // Personal Details
    phone: extra.phone || (user as any)?.mobile_number || (user as any)?.phone || '',
    altEmail: extra.altEmail || '',
    dob: extra.dob || '',
    gender: extra.gender || 'Male',
    address: extra.address || '',
    officeRoom: extra.officeRoom || '',
    officeHours: extra.officeHours || '',
    bio: extra.bio || '',
    parentPhone: extra.parentPhone || '',

    // Education & Academic Background
    highestDegree: extra.highestDegree || '',
    specialization: extra.specialization || '',
    coursesHandled: extra.coursesHandled || '',
    experienceYears: extra.experienceYears || '',
    semester: extra.semester || '',
    cgpa: extra.cgpa || '',
    admissionYear: extra.admissionYear || '',
    almaMater: extra.almaMater || '',
  });

  useEffect(() => {
    if (profile || user) {
      const storedExtra = loadExtraData();
      setFormData((prev) => ({
        ...prev,
        name: profile?.full_name || user?.name || prev.name || '',
        email: profile?.email || user?.email || prev.email || '',
        institution: profile?.institution_id || user?.institution || prev.institution || '',
        rollNumber: profile?.roll_number || user?.rollNumber || (user as any)?.roll_number || prev.rollNumber || '',
        classId: profile?.class_id || user?.classId || (user as any)?.class_id || (user as any)?.department || prev.classId || '',
        divisionId: profile?.division_id || user?.divisionId || (user as any)?.division_id || prev.divisionId || '',
        avatarUrl: profile?.avatar_url || user?.avatarUrl || (user as any)?.avatar_url || prev.avatarUrl || '',
        ...storedExtra,
      }));
    }
  }, [profile, user, userId]);

  // Calculate completeness percentage accurately based on actual fields filled by user
  const { completionPercentage, filledCount, totalFieldsCount } = useMemo(() => {
    const isStaff = role === 'faculty' || role === 'hod';
    const checks =
      isStaff
        ? [
            formData.name,
            formData.institution,
            formData.classId,
            formData.designation,
            formData.rollNumber,
            formData.phone,
            formData.altEmail,
            formData.officeRoom,
            formData.officeHours,
            formData.address,
            formData.highestDegree,
            formData.specialization,
            formData.coursesHandled,
            formData.experienceYears,
            formData.avatarUrl,
          ]
        : [
            formData.name,
            formData.institution,
            formData.rollNumber,
            formData.classId,
            formData.divisionId,
            formData.phone,
            formData.altEmail,
            formData.dob,
            formData.gender,
            formData.address,
            formData.highestDegree,
            formData.specialization,
            formData.semester,
            formData.cgpa,
            formData.admissionYear,
            formData.avatarUrl,
          ];

    const filled = checks.filter((c) => Boolean(c && c.toString().trim().length > 0)).length;
    const total = checks.length;
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    return {
      completionPercentage: pct,
      filledCount: filled,
      totalFieldsCount: total,
    };
  }, [formData, role]);

  const isComplete = Boolean(
    isProfileComplete(user, profile, role) || completionPercentage >= 80
  );

  // Avatar / Photo upload
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
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, avatarUrl: result }));
        try {
          await updateUserProfile({
            avatar_url: result,
          });
          await refreshUser();
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
          console.error('Instant avatar upload note:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      await updateUserProfile({
        avatar_url: '',
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Instant avatar remove note:', err);
    }
  };

  const handleReset = () => {
    const storedExtra = loadExtraData();
    setFormData({
      name: profile?.full_name || user?.name || '',
      email: profile?.email || user?.email || '',
      institution: profile?.institution_id || user?.institution || '',
      rollNumber: profile?.roll_number || user?.rollNumber || (user as any)?.roll_number || '',
      classId: profile?.class_id || user?.classId || (user as any)?.class_id || (user as any)?.department || '',
      divisionId: profile?.division_id || user?.divisionId || (user as any)?.division_id || '',
      avatarUrl: profile?.avatar_url || user?.avatarUrl || (user as any)?.avatar_url || '',
      designation: storedExtra.designation || '',
      phone: storedExtra.phone || '',
      altEmail: storedExtra.altEmail || '',
      dob: storedExtra.dob || '',
      gender: storedExtra.gender || 'Male',
      address: storedExtra.address || '',
      officeRoom: storedExtra.officeRoom || '',
      officeHours: storedExtra.officeHours || '',
      bio: storedExtra.bio || '',
      parentPhone: storedExtra.parentPhone || '',
      highestDegree: storedExtra.highestDegree || '',
      specialization: storedExtra.specialization || '',
      coursesHandled: storedExtra.coursesHandled || '',
      experienceYears: storedExtra.experienceYears || '',
      semester: storedExtra.semester || '',
      cgpa: storedExtra.cgpa || '',
      admissionYear: storedExtra.admissionYear || '',
      almaMater: storedExtra.almaMater || '',
    });
    setSaveError(null);
  };

  // Registered baselines from signup / account
  const registeredCollege = (profile?.institution_id || user?.institution || '').trim().toUpperCase();
  const registeredDivision = (profile?.division_id || user?.divisionId || (user as any)?.division_id || '').trim().toUpperCase();

  const isCollegeChanged = Boolean(
    role === 'student' &&
    registeredCollege &&
    formData.institution.trim().toUpperCase() !== registeredCollege
  );

  const isDivisionChanged = Boolean(
    role === 'student' &&
    registeredDivision &&
    formData.divisionId.trim().toUpperCase() !== registeredDivision
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict Error Validation for Students: Registered College & Division cannot be modified
    if (isCollegeChanged) {
      const msg = `⚠️ College name cannot be changed from your registered college ("${registeredCollege}").`;
      setSaveError(msg);
      toast.error('Modification Blocked', msg);
      return;
    }

    if (isDivisionChanged) {
      const msg = `⚠️ Division cannot be changed from your registered division ("${registeredDivision}").`;
      setSaveError(msg);
      toast.error('Modification Blocked', msg);
      return;
    }

    setSaving(true);
    setSaved(false);
    setSaveError(null);

    try {
      // 1. Sync Core Profile to Server Database
      await updateUserProfile({
        full_name: formData.name,
        institution_id: formData.institution,
        roll_number: formData.rollNumber,
        class_id: formData.classId,
        division_id: formData.divisionId,
        avatar_url: formData.avatarUrl,
      });

      // 2. Persist Extra Personal and Academic Details locally
      const extraPayload = {
        designation: formData.designation,
        phone: formData.phone,
        altEmail: formData.altEmail,
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address,
        officeRoom: formData.officeRoom,
        officeHours: formData.officeHours,
        bio: formData.bio,
        parentPhone: formData.parentPhone,
        highestDegree: formData.highestDegree,
        specialization: formData.specialization,
        coursesHandled: formData.coursesHandled,
        experienceYears: formData.experienceYears,
        semester: formData.semester,
        cgpa: formData.cgpa,
        admissionYear: formData.admissionYear,
        almaMater: formData.almaMater,
      };
      localStorage.setItem(`syntaxviva_extra_profile_${userId}`, JSON.stringify(extraPayload));

      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setSaveError(err.message || 'Failed to save profile. Please check your network connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadProfile = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            full_name: formData.name,
            email: formData.email,
            role: role === 'hod' ? 'Head of Department' : role === 'faculty' ? 'Faculty' : 'Student',
            institution: formData.institution,
            department: formData.classId,
            designation: formData.designation || (role === 'hod' ? 'Head of Department' : undefined),
            roll_number: formData.rollNumber,
            division: formData.divisionId,
            phone: formData.phone,
            alt_email: formData.altEmail,
            office_or_address: role === 'faculty' || role === 'hod' ? formData.officeRoom : formData.address,
            office_hours: role === 'faculty' || role === 'hod' ? formData.officeHours : undefined,
            academic_degree: formData.highestDegree,
            specialization: formData.specialization,
            courses_handled: formData.coursesHandled,
            profile_completion: `${completionPercentage}%`,
            verified: isComplete,
            exported_at: new Date().toISOString(),
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `profile_${(formData.name || (role === 'hod' ? 'hod' : role === 'faculty' ? 'faculty' : 'student')).toLowerCase().replace(/\s+/g, '_')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Display variables
  const isHod = role === 'hod';
  const isFaculty = role === 'faculty';
  const isStaff = isHod || isFaculty;

  const initialLetter = (formData.name || formData.email || (isHod ? 'H' : isFaculty ? 'F' : 'P')).charAt(0).toUpperCase();
  const displayName = formData.name || (user?.email ? user.email.split('@')[0] : (isHod ? 'Head of Department' : isFaculty ? 'Faculty Member' : 'Student'));
  const roleLabel = isHod ? 'Head of Department (HOD)' : isFaculty ? 'Faculty' : 'Student';
  const deptLabel = formData.classId || profile?.department || user?.department || (isHod ? 'Computer Science & Engineering' : isFaculty ? 'Cse' : 'Cse');
  const instLabel = formData.institution || profile?.institution_id || user?.institution || 'GU';

  return (
    <div className="w-full space-y-7 pb-12 min-h-full">
      {/* 1. TOP NAVBAR (ProfileHub Floating Bar - Enlarged Full-Page Design) */}
      <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-sm px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-6">
        {/* Left: ProfileHub Logo & Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100/90 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
            <User className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="font-black text-2xl text-slate-900 tracking-tight font-display">
            Profile<span className="text-emerald-600">Hub</span>
          </span>
        </div>

        {/* Middle: Rounded-Full Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
          <div className="relative w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={profileSearch}
              onChange={(e) => setProfileSearch(e.target.value)}
              placeholder="Search your profile..."
              className="w-full pl-11 pr-5 py-2.5 sm:py-3 rounded-full border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
            />
          </div>
        </div>

        {/* Right: Notification Bell & User Pill */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition cursor-pointer border border-transparent hover:border-slate-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </div>

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200 shadow-2xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                {initialLetter}
              </div>
            )}
            <span className="text-sm font-bold text-slate-900 hidden sm:inline">{displayName}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 2. THREE-COLUMN WORKSPACE: Left Nav | Center Content | Right Stats Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 xl:gap-8 items-start w-full">
        {/* LEFT COLUMN: Clean Nav Links (Experience, Documents, Privacy Removed as requested) */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-3.5 space-y-2">
            {[
              { id: 'profile', label: 'Profile & Identity', icon: User },
              { id: 'personal', label: 'Personal Details', icon: Phone },
              { id: 'education', label: isHod ? 'Academic & Department Leadership' : isFaculty ? 'Academic & Qualifications' : 'Education', icon: GraduationCap },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNavTab(item.id as any)}
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl text-sm font-bold transition cursor-pointer text-left ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Card: "Your profile builds your future" */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-100/50 rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shadow-2xs">
              <Sprout className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Your profile builds your future</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                {isHod
                  ? 'Maintain institutional leadership credentials, department scope, and verified faculty oversight.'
                  : isFaculty
                  ? 'Keep your academic credentials, office hours, and laboratory details up to date.'
                  : 'Keep your information up to date and stay connected with opportunities.'}
              </p>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Forest Hero Card + Sub-Tabs + Active Form Details */}
        <div className="lg:col-span-6 space-y-6">
          {/* Notifications */}
          {saved && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-sm text-emerald-900 flex items-center gap-2.5 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">Profile details saved successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl text-sm text-rose-900 flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{saveError}</span>
            </div>
          )}

          {/* Forest Green Hero Banner (Enlarged) */}
          <div className="bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#047857] rounded-3xl p-7 sm:p-9 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar with Camera Button */}
            <div className="relative group shrink-0">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-emerald-300/70 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-800 border-4 border-emerald-300/70 text-white font-black text-3xl flex items-center justify-center shadow-xl">
                  {initialLetter}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg flex items-center justify-center transition cursor-pointer ring-3 ring-[#064e3b]"
                title="Upload Photo"
              >
                <Camera className="w-4.5 h-4.5 text-white" />
              </button>
            </div>

            {/* Profile Info & Verification Pill */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{displayName}</h2>
                <div
                  className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xs"
                  title="Verified Account"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-emerald-100/95 font-medium leading-relaxed">
                {isHod
                  ? 'Manage your official Head of Department credentials, faculty oversight, and institutional records.'
                  : isFaculty
                  ? 'Manage your academic profile, laboratory assignments, and contact details.'
                  : 'Manage your personal details, profile picture, and institutional affiliation.'}
              </p>

              <div className="pt-1.5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-900/80 border border-emerald-400/60 text-emerald-200 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3.5]" />
                  <span>
                    {completionPercentage === 100
                      ? 'Profile 100% Complete & Verified — All details filled.'
                      : `Profile ${completionPercentage}% Complete (${filledCount}/${totalFieldsCount} details filled)`}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Horizontal Sub-Tabs */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('basic');
                setActiveNavTab('profile');
              }}
              className={`px-5 py-2.5 sm:py-3 rounded-2xl text-sm font-bold transition cursor-pointer border ${
                activeSubTab === 'basic' && activeNavTab === 'profile'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <span>Basic Information</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('institution');
                setActiveNavTab('education');
              }}
              className={`px-5 py-2.5 sm:py-3 rounded-2xl text-sm font-bold transition cursor-pointer border ${
                activeSubTab === 'institution' || activeNavTab === 'education'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <span>{isStaff ? 'Academic & Department Details' : 'Institution Details'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('contact');
                setActiveNavTab('personal');
              }}
              className={`px-5 py-2.5 sm:py-3 rounded-2xl text-sm font-bold transition cursor-pointer border ${
                activeSubTab === 'contact' || activeNavTab === 'personal'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <span>Contact Details</span>
            </button>
          </div>

          {/* MAIN DYNAMIC FORM CARD: Renders according to active left navigation tab */}
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-sm space-y-7"
          >
            {/* Hidden Photo Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* TAB 1: Profile & Identity */}
            {activeNavTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <User className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {isHod
                        ? 'Head of Department Profile & Authority'
                        : isFaculty
                        ? 'Faculty Profile & Academic Identity'
                        : 'Personal Information'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                      {isHod
                        ? 'Update your official HOD details, college affiliation, and administrative leadership.'
                        : isFaculty
                        ? 'Update your official faculty details and college affiliation.'
                        : 'Update your basic details to keep your profile current and professional.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Legal Name */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>Full Legal Name</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        ref={nameInputRef}
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={isHod ? 'Dr. / Prof. Full Name' : isFaculty ? 'Prof. Full Name' : 'Full Legal Name'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>Email Address (Primary Authority)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        disabled
                        value={formData.email}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 text-sm text-slate-500 font-medium cursor-not-allowed shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Institution / College Name */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>Institution / College Name</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${isCollegeChanged ? 'text-rose-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        required
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value.toUpperCase() })}
                        placeholder="INSTITUTION / COLLEGE NAME"
                        className={`w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border text-sm font-bold uppercase transition shadow-2xs ${
                          isCollegeChanged
                            ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-hidden focus:border-rose-600 focus:ring-3 focus:ring-rose-500/20'
                            : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                    </div>
                    {isCollegeChanged && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>⚠️ College name cannot be changed from your registered college ("{registeredCollege}").</span>
                      </div>
                    )}
                  </div>

                  {/* Department (Faculty/HOD) or Class / Batch (Student) */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>{isStaff ? 'Department' : 'Class / Batch'}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value.toUpperCase() })}
                        placeholder={isStaff ? 'E.G. COMPUTER SCIENCE & ENGINEERING' : 'E.G. B.TECH CSE - 4TH SEM'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-bold uppercase placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Faculty/HOD Designation OR Student Roll Number */}
                  {isStaff ? (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>{isHod ? 'HOD Designation' : 'Academic Designation'}</span>
                      </label>
                      <div className="relative">
                        <Award className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          placeholder={isHod ? 'e.g. Professor & Head of Department' : 'e.g. Assistant Professor / Associate Professor'}
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>Roll Number</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={formData.rollNumber}
                          onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                          placeholder="e.g. 21012011001"
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Faculty/HOD Employee ID OR Student Division */}
                  {isStaff ? (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>{isHod ? 'HOD Employee ID' : 'Faculty / Employee ID'}</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.rollNumber}
                          onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                          placeholder={isHod ? 'e.g. HOD-CSE-001' : 'e.g. FAC-2024-042'}
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>Division / Section</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Layers className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${isDivisionChanged ? 'text-rose-500' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          required
                          value={formData.divisionId}
                          onChange={(e) => setFormData({ ...formData, divisionId: e.target.value.toUpperCase() })}
                          placeholder="E.G. DIV A"
                          className={`w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border text-sm font-bold uppercase transition shadow-2xs ${
                            isDivisionChanged
                              ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-hidden focus:border-rose-600 focus:ring-3 focus:ring-rose-500/20'
                              : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          }`}
                        />
                      </div>
                      {isDivisionChanged && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl animate-in fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>⚠️ Division cannot be changed from your registered division ("{registeredDivision}").</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Personal Details */}
            {activeNavTab === 'personal' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Phone className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Personal & Contact Details</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                      {role === 'faculty'
                        ? 'Provide communication numbers, cabin room, and office consultation hours.'
                        : 'Provide your contact number, residential address, and emergency contact details.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>Primary Contact Number</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Alternate Email */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>Alternate / Communication Email</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.altEmail}
                        onChange={(e) => setFormData({ ...formData, altEmail: e.target.value })}
                        placeholder="alt.email@gmail.com"
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Faculty/HOD Office Room OR Student Date of Birth */}
                  {isStaff ? (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>Office / Cabin Room Number</span>
                      </label>
                      <div className="relative">
                        <DoorOpen className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.officeRoom}
                          onChange={(e) => setFormData({ ...formData, officeRoom: e.target.value })}
                          placeholder={isHod ? 'e.g. Room 301, HOD Office, Academic Block A' : 'e.g. Room 304, Computer Science Block'}
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>Date of Birth</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Faculty/HOD Office Hours OR Student Gender */}
                  {isStaff ? (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>Office Consultation Hours</span>
                      </label>
                      <div className="relative">
                        <Clock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.officeHours}
                          onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                          placeholder={isHod ? 'e.g. Mon-Fri: 11:00 AM - 1:00 PM' : 'e.g. Mon-Fri: 3:00 PM - 5:00 PM'}
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>Gender</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  {/* Address / Location */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>{isStaff ? 'Campus / City Location' : 'Residential Address'}</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                      <textarea
                        rows={3}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={role === 'faculty' ? 'e.g. Department of CSE, North Campus, Ahmedabad' : 'e.g. 12, Green Park Society, Ahmedabad'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition resize-none shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Education / Academic & Qualifications */}
            {activeNavTab === 'education' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <GraduationCap className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {isHod
                        ? 'Departmental Leadership & Academic Credentials'
                        : isFaculty
                        ? 'Academic Qualifications & Domain Expertise'
                        : 'Educational Details & Enrollment'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                      {isHod
                        ? 'Detail your doctoral degree, research domain, and institutional programs supervised.'
                        : isFaculty
                        ? 'Detail your highest educational degrees, domain specialization, and teaching assignments.'
                        : 'Detail your current degree, academic standing, and semester enrollment.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Highest Degree / Current Program */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>{isStaff ? 'Highest Qualification / Degree' : 'Current Degree / Program'}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.highestDegree}
                        onChange={(e) => setFormData({ ...formData, highestDegree: e.target.value })}
                        placeholder={isHod ? 'e.g. Ph.D. in Computer Science / D.Sc.' : isFaculty ? 'e.g. Ph.D. in Computer Science / M.Tech' : 'e.g. Bachelor of Technology (B.Tech)'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Specialization / Branch */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>{isStaff ? 'Specialization / Research Area' : 'Branch / Engineering Stream'}</span>
                    </label>
                    <div className="relative">
                      <BookOpen className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        placeholder={isHod ? 'e.g. Distributed Computing, AI, Compiler Architecture' : isFaculty ? 'e.g. Machine Learning, Compiler Design' : 'e.g. Computer Science & Engineering'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Courses Handled OR Student Semester */}
                  {isStaff ? (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span>{isHod ? 'Departmental Programs & Curricula Supervised' : 'Assigned Laboratories & Courses Handled'}</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.coursesHandled}
                          onChange={(e) => setFormData({ ...formData, coursesHandled: e.target.value })}
                          placeholder={isHod ? 'e.g. B.Tech CSE, M.Tech Data Science, PhD Research Labs' : 'e.g. Data Structures Viva Lab, Algorithms Lab, C++ Programming'}
                          className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                          <span>Current Semester / Term</span>
                        </label>
                        <div className="relative">
                          <Clock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.semester}
                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                            placeholder="e.g. 4th Semester"
                            className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                          <span>Current CGPA / Academic Score</span>
                        </label>
                        <div className="relative">
                          <Award className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.cgpa}
                            onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                            placeholder="e.g. 8.65 CGPA"
                            className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Alma Mater / Batch Year */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>{isStaff ? 'Alma Mater / Graduating University' : 'Batch / Admission Years'}</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={isStaff ? formData.almaMater : formData.admissionYear}
                        onChange={(e) =>
                          isStaff
                            ? setFormData({ ...formData, almaMater: e.target.value })
                            : setFormData({ ...formData, admissionYear: e.target.value })
                        }
                        placeholder={isStaff ? 'e.g. Gujarat University / GTU / IIT' : 'e.g. 2023 - 2027'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Teaching Experience */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                      <span>{isStaff ? 'Total Academic & Leadership Experience' : 'Academic Standing'}</span>
                    </label>
                    <div className="relative">
                      <Award className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.experienceYears}
                        onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                        placeholder={isHod ? 'e.g. 15+ Years (Teaching & Academic Leadership)' : isFaculty ? 'e.g. 6+ Years' : 'e.g. Regular Active Student'}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions: Reset on Left | Save Profile Details on Right */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Details...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Profile Details</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Profile Overview Card (Matches Second Picture 1:1 - Enlarged) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Card 1: User Profile Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-7 sm:p-8 text-center space-y-4">
            {/* Centered Avatar with Camera Badge */}
            <div className="relative group inline-block mx-auto">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-emerald-100 shadow-md mx-auto"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-600 text-white font-black text-3xl flex items-center justify-center shadow-md mx-auto">
                  {initialLetter}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center transition cursor-pointer ring-3 ring-white"
                title="Change Photo"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Name & Tagline */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">{displayName}</h3>
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Check className="w-3 h-3 stroke-[3.5]" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold">
                {formData.designation ? `${formData.designation}` : roleLabel} | {deptLabel} | {instLabel}
              </p>
            </div>

            {/* 3 Metric Columns: PROFILE | VERIFIED | ACCESS (Calculated directly from filled fields) */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4 text-center">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Profile
                </span>
                <span className="font-black text-emerald-600 text-sm sm:text-base tabular-nums block">
                  {completionPercentage}%
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">
                  {filledCount}/{totalFieldsCount} filled
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Verified
                </span>
                <span className="font-black text-emerald-600 text-sm sm:text-base block">
                  {completionPercentage >= 70 ? '✓' : 'Pending'}
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">
                  {completionPercentage >= 70 ? 'Verified' : 'Incomplete'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Access
                </span>
                <span className="font-black text-emerald-600 text-sm sm:text-base block">
                  {completionPercentage >= 50 ? 'All' : 'Standard'}
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">
                  Permissions
                </span>
              </div>
            </div>

            {/* Live Faculty Filled Details Overview Box */}
            {(formData.designation ||
              formData.rollNumber ||
              formData.officeRoom ||
              formData.officeHours ||
              formData.highestDegree ||
              formData.phone) && (
              <div className="pt-3 border-t border-slate-100 space-y-2 text-left text-xs bg-slate-50/80 p-3.5 rounded-2xl">
                {formData.designation && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">Designation:</span>
                    <span className="font-bold text-slate-800 truncate text-right">{formData.designation}</span>
                  </div>
                )}
                {formData.rollNumber && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">
                      {isHod ? 'HOD ID:' : isFaculty ? 'Faculty ID:' : 'Roll No:'}
                    </span>
                    <span className="font-bold text-slate-800 truncate text-right">{formData.rollNumber}</span>
                  </div>
                )}
                {isStaff && formData.officeRoom && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">Cabin Room:</span>
                    <span className="font-bold text-slate-800 truncate text-right">{formData.officeRoom}</span>
                  </div>
                )}
                {isStaff && formData.officeHours && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">Hours:</span>
                    <span className="font-bold text-slate-800 truncate text-right">{formData.officeHours}</span>
                  </div>
                )}
                {formData.highestDegree && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">Degree:</span>
                    <span className="font-bold text-slate-800 truncate text-right">{formData.highestDegree}</span>
                  </div>
                )}
                {formData.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium shrink-0">Contact:</span>
                    <span className="font-bold text-slate-800 truncate text-right">{formData.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Quick Actions</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4.5 h-4.5 text-slate-400 group-hover:text-emerald-600" />
                  <span>Upload New Photo</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveNavTab('profile');
                  nameInputRef.current?.focus();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4.5 h-4.5 text-slate-400 group-hover:text-emerald-600" />
                  <span>Update Profile Details</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              <button
                type="button"
                onClick={handleDownloadProfile}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4.5 h-4.5 text-slate-400 group-hover:text-emerald-600" />
                  <span>Download Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>
            </div>
          </div>

          {/* Card 3: Information Security */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 sm:p-6 text-xs sm:text-sm space-y-2 shadow-2xs">
            <div className="flex items-center gap-2.5 text-emerald-950 font-extrabold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Your information is secure</span>
            </div>
            <p className="text-xs text-emerald-800/90 leading-relaxed pl-7 font-medium">
              We use industry-standard security to keep your data safe and private.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
