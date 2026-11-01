import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Lock,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface HodAuditViewProps {
  auditLogs: any[];
  departmentName: string;
  onRefresh?: () => void;
}

export const HodAuditView: React.FC<HodAuditViewProps> = ({
  auditLogs,
  departmentName,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    return (
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Institutional Compliance & Security Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of role authorization events, HOD approvals, and access verifications in {departmentName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Action / Event</th>
                <th className="pb-3 font-medium">Target User</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/70 transition text-xs">
                    <td className="py-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3 font-bold text-blue-600 whitespace-nowrap text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 text-slate-900 text-[11px]">
                      {log.target_email || log.target_user_id || 'System'}
                    </td>
                    <td className="py-3 text-slate-600 font-sans text-[11px]">
                      {log.department || departmentName}
                    </td>
                    <td className="py-3 text-slate-600 font-sans break-words max-w-xs text-[11px]">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};