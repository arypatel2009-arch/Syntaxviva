import React, { useState } from 'react';
import { X, PhoneCall, MessageSquare, CheckCircle2, Building, User, Mail, Phone, FileText, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.ts';

interface BookACallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInquiryType?: string;
}

export const BookACallModal: React.FC<BookACallModalProps> = ({ isOpen, onClose, initialInquiryType }) => {
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Faculty');
  const [inquiryType, setInquiryType] = useState(initialInquiryType || 'Pro plan pricing');
  const [expectedUsage, setExpectedUsage] = useState('Individual faculty');
  const [preferredTime, setPreferredTime] = useState('');
  const [message, setMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!institution.trim() || institution.trim().length < 2) {
      setErrorMsg('Please enter your institution or organization name.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid work or institutional email address.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 7) {
      setErrorMsg('Please enter a valid contact phone number with country code (e.g. +91 98765 43210).');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit to backend API first
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          institution: institution.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role,
          inquiryType,
          expectedUsage,
          preferredTime: preferredTime.trim() || null,
          message: message.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit inquiry. Please try again.');
      }

      setSubmittedId(data.inquiryId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit inquiry. Please check your details or network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchWhatsApp = () => {
    const text = `Hello SyntaXViva Team,

I submitted a Book a Call inquiry.

Name: ${fullName.trim()}
Institution: ${institution.trim()}
Role: ${role}
Inquiry: ${inquiryType}
Expected usage: ${expectedUsage}

I would like to discuss SyntaXViva plans and pricing.

Please let me know the next steps.`;

    const encodedText = encodeURIComponent(text);

    // Business numbers configuration
    const targetPhone1 = (import.meta as any)?.env?.VITE_WHATSAPP_NUMBER || '916351003457';
    const targetPhone2 = '919104115655';

    const whatsappUrl1 = `https://wa.me/${targetPhone1}?text=${encodedText}`;
    const whatsappUrl2 = `https://wa.me/${targetPhone2}?text=${encodedText}`;

    window.open(whatsappUrl1, '_blank');
    setTimeout(() => {
      window.open(whatsappUrl2, '_blank');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Book a Consultation Call</h3>
              <p className="text-xs text-slate-300">Submit inquiry to discuss SyntaXViva Pro plans</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body or Success Confirmation */}
        <div className="overflow-y-auto p-6 space-y-4 font-sans">
          {submittedId ? (
            /* Success Handoff Screen */
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-slate-900">Inquiry Stored Successfully!</h4>
                <p className="text-xs text-slate-500 font-mono">Reference ID: {submittedId}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-900">Next Steps:</p>
                <p>
                  1. Your inquiry has been securely recorded in our database. Our team will review your requirements.
                </p>
                <p>
                  2. Click <strong className="text-slate-900">Continue on WhatsApp</strong> below to open WhatsApp with your prefilled inquiry details.
                </p>
                <p className="text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  ⚠️ Note: Opening WhatsApp is a separate action. You must press <strong>Send</strong> in WhatsApp to deliver the message to our team.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Continue on WhatsApp ➔</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Inquiry Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" /> Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Prof. Rajesh Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              {/* Institution */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-600" /> Institution / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Gujarat Technological University (GTU)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Work / Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="r.patel@gtu.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact Phone (with Country Code) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>
              </div>

              {/* Role & Inquiry Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    Your Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans bg-white"
                  >
                    <option value="Faculty">Faculty Instructor</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="Institution Administrator">Institution Administrator</option>
                    <option value="Other">Other Role</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    Inquiry Type *
                  </label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans bg-white"
                  >
                    <option value="Pro plan pricing">Pro Plan Pricing</option>
                    <option value="Institutional pricing">Institutional / Campus License</option>
                    <option value="Product demo">Live Product Demo</option>
                    <option value="Other">Other Inquiry</option>
                  </select>
                </div>
              </div>

              {/* Expected Usage */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  Expected Usage Scope *
                </label>
                <select
                  value={expectedUsage}
                  onChange={(e) => setExpectedUsage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans bg-white"
                >
                  <option value="Individual faculty">Individual Faculty (Single Course)</option>
                  <option value="Small department">Small Department (Multiple Courses)</option>
                  <option value="Entire institution">Entire College / University System</option>
                </select>
              </div>

              {/* Preferred Time & Message */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> Preferred Contact Time (Optional)
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. Weekdays 2 PM - 5 PM IST"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Additional Notes / Requirements (Optional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about student volume, LMS integration needs, or semester start dates..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans resize-none"
                />
              </div>

              {/* Consent Statement */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                🔒 <strong>Privacy Consent:</strong> Your contact details will only be used by SyntaXViva to respond to this consultation inquiry. We never share your data.
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-4 h-4" />
                      <span>Submit Inquiry &amp; Book Call</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
