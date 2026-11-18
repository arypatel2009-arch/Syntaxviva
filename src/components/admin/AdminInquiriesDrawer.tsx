import React, { useState, useEffect } from 'react';
import { X, MessageSquare, PhoneCall, Building, User, Mail, Phone, Calendar, RefreshCw, Filter, CheckCircle2, Clock, Check } from 'lucide-react';
import { api } from '../../lib/api.ts';

interface AdminInquiriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InquiryRecord {
  id: string;
  name: string;
  institution: string;
  email: string;
  phone: string;
  role: string;
  inquiry_type: string;
  expected_usage: string;
  preferred_time?: string | null;
  message?: string | null;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  created_at: string;
}

export const AdminInquiriesDrawer: React.FC<AdminInquiriesDrawerProps> = ({ isOpen, onClose }) => {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter !== 'ALL' ? `/api/inquiries/admin/list?status=${statusFilter}` : '/api/inquiries/admin/list';
      const token = localStorage.getItem('syntaxviva_token') || sessionStorage.getItem('syntaxviva_token') || '';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.inquiries && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
      }
    } catch (err) {
      console.error('Failed to fetch admin inquiries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInquiries();
    }
  }, [isOpen, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: 'NEW' | 'CONTACTED' | 'CLOSED') => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem('syntaxviva_token') || sessionStorage.getItem('syntaxviva_token') || '';
      const res = await fetch(`/api/inquiries/admin/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq))
        );
      }
    } catch (err) {
      console.error('Failed to update inquiry status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenWhatsApp = (inquiry: InquiryRecord) => {
    const text = `Hello ${inquiry.name},

Thank you for your Book a Call inquiry for SyntaXViva Pro (${inquiry.institution}).

We received your request:
- Role: ${inquiry.role}
- Inquiry: ${inquiry.inquiry_type}
- Scope: ${inquiry.expected_usage}

We would be glad to discuss tailored plans and pricing. Let us know when you are available for a call!`;

    const encodedText = encodeURIComponent(text);
    const cleanPhone = inquiry.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col font-sans">
        {/* Top Bar */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Lead Inquiries Management</h3>
              <p className="text-xs text-slate-400">Authorized Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInquiries}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-sans text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Inquiries ({inquiries.length})</option>
              <option value="NEW">NEW Only</option>
              <option value="CONTACTED">CONTACTED Only</option>
              <option value="CLOSED">CLOSED Only</option>
            </select>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">{inquiries.length} record(s)</span>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading inquiries from database...</p>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="text-center py-16 space-y-2 border-2 border-dashed border-slate-200 rounded-2xl p-6">
              <Building className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Inquiries Found</h4>
              <p className="text-xs text-slate-500">No customer lead inquiries match the selected filter.</p>
            </div>
          ) : (
            inquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-base font-bold text-slate-900">{inq.name}</span>
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5" />
                      <span>{inq.institution}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        inq.status === 'NEW'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : inq.status === 'CONTACTED'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {inq.status}
                    </span>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Email</span>
                    <a href={`mailto:${inq.email}`} className="text-slate-900 font-medium hover:underline">
                      {inq.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Phone</span>
                    <span className="text-slate-900 font-medium font-mono">{inq.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Role / Usage</span>
                    <span>{inq.role} • {inq.expected_usage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Inquiry Type</span>
                    <span className="font-semibold text-slate-800">{inq.inquiry_type}</span>
                  </div>
                </div>

                {inq.message && (
                  <p className="text-xs text-slate-700 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    "{inq.message}"
                  </p>
                )}

                {/* Footer Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Submitted: {new Date(inq.created_at).toLocaleString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <select
                      value={inq.status}
                      disabled={updatingId === inq.id}
                      onChange={(e) => handleUpdateStatus(inq.id, e.target.value as any)}
                      className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none"
                    >
                      <option value="NEW">Mark as NEW</option>
                      <option value="CONTACTED">Mark as CONTACTED</option>
                      <option value="CLOSED">Mark as CLOSED</option>
                    </select>

                    <button
                      onClick={() => handleOpenWhatsApp(inq)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
