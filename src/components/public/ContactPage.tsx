import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    institution: '',
    message: '',
  });

  const handleLaunchWhatsApp = (customMsg?: string) => {
    const text = `Hello SyntaXViva Team,

I submitted an inquiry through the Contact page.

Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}
Institution: ${formData.institution || 'N/A'}
Message:
${customMsg || formData.message}

Please get back to me.`;

    const encoded = encodeURIComponent(text);
    const url1 = `https://wa.me/919104115655?text=${encoded}`;
    const url2 = `https://wa.me/916351003457?text=${encoded}`;

    window.open(url1, '_blank');
    setTimeout(() => {
      window.open(url2, '_blank');
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          institution: formData.institution.trim() || 'General Inquiry',
          email: formData.email.trim().toLowerCase(),
          phone: '+91 91041 15655 / +91 63510 03457',
          role: 'Contact Inquirer',
          inquiryType: formData.subject,
          expectedUsage: 'Contact Form',
          message: formData.message.trim(),
        }),
      });
    } catch (err) {
      console.warn('Inquiry background record note:', err);
    }

    handleLaunchWhatsApp();
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen pt-28 sm:pt-32 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>We're Here to Help</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Have questions about institutional licensing, faculty onboarding, or custom sandbox
            deployments? Our team will get back to you within 24 hours.
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
          {/* Left: Contact Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-[#064e3b] to-[#022c22] text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-8">
              <div>
                <h2 className="text-2xl font-bold">Contact Information</h2>
                <p className="text-emerald-200/80 text-sm mt-1">
                  Reach out directly to our institutional partnership desk.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                      Email
                    </span>
                    <div className="text-sm font-medium text-white font-mono mt-0.5">
                      support@syntaxviva.com
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                      Phone &amp; WhatsApp
                    </span>
                    <div className="text-sm font-medium text-white font-mono mt-1 space-y-1">
                      <div>
                        <a
                          href="https://wa.me/919104115655"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-300 transition flex items-center gap-1.5"
                        >
                          <span>+91 91041 15655</span>
                        </a>
                      </div>
                      <div>
                        <a
                          href="https://wa.me/916351003457"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-300 transition flex items-center gap-1.5"
                        >
                          <span>+91 63510 03457</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                      Headquarters
                    </span>
                    <div className="text-sm font-medium text-white mt-0.5 leading-relaxed">
                      SyntaXViva EdTech Labs <br />
                      Ahmedabad, Gujarat 380015, India
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-emerald-800/80 text-xs text-emerald-200/70 leading-relaxed">
                Operating hours: Monday – Saturday, 9:00 AM – 7:00 PM IST.
              </div>
            </div>
          </div>

          {/* Right: Interactive Message Form */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-2xs">
              {submitted ? (
                <div className="text-center py-12 space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Message Received!</h3>
                  <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                    Thank you, <strong>{formData.name}</strong>. Your message has been sent to our team at <strong>+91 91041 15655</strong> and <strong>+91 63510 03457</strong>, and we will respond to <strong>{formData.email}</strong> shortly.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp()}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Resend on WhatsApp</span>
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          name: '',
                          email: '',
                          subject: 'General Inquiry',
                          institution: '',
                          message: '',
                        });
                      }}
                    >
                      Send Another Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your full name"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. ramesh@college.edu"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Institution / College</label>
                      <input
                        type="text"
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                        placeholder="e.g. University / Department name"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Topic</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Campus License">Campus License / Pricing</option>
                        <option value="LMS Integration">LMS Integration (Moodle/Canvas)</option>
                        <option value="Faculty Pilot">Faculty Pilot Request</option>
                        <option value="Technical Support">Technical Support</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your student cohort, courses, or specific assessment needs..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    icon={Send}
                    iconPosition="right"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
