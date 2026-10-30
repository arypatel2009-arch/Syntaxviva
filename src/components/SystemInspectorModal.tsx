import React, { useState, useEffect } from 'react';
import { X, Database, Shield, Server, RefreshCw, CheckCircle2, Table, Key } from 'lucide-react';
import { api } from '../lib/api.ts';
import { SystemHealth } from '../types/index.ts';

interface SystemInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemInspectorModal: React.FC<SystemInspectorModalProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHealth();
      setHealth(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">System Architecture & Health</h2>
              <p className="text-xs text-slate-500">PART 1 Foundation Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          {health ? (
            <>
              {/* Overall status banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Backend & Database Operational
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      SQLite persistence active • JWT authentication active
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                  {health.version}
                </span>
              </div>

              {/* Database Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  Database Engine & Tables
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <div className="text-lg font-bold text-slate-900">{health.database.recordCounts.users}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Users</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <div className="text-lg font-bold text-slate-900">{health.database.recordCounts.assignments}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Assignments</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <div className="text-lg font-bold text-slate-900">{health.database.recordCounts.mutationTypes}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Mutations</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <div className="text-lg font-bold text-slate-900">{health.database.recordCounts.attempts}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Attempts</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">SQLite Tables:</span>
                  {health.database.tables.map((table) => (
                    <span
                      key={table}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-mono text-slate-700"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>

              {/* Security & Authentication */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  Authentication & Cryptography
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[11px]">JWT Auth</div>
                    <div className="font-semibold text-slate-800 mt-0.5">Enabled (Bearer / Cookie)</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[11px]">Token Validity</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{health.auth.tokenExpiry}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[11px]">Password Hashing</div>
                    <div className="font-semibold text-slate-800 mt-0.5">Bcrypt ({health.auth.bcryptRounds} rounds)</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Server Time: {new Date(health.serverTime).toLocaleString()}</span>
                <span className="font-mono">Port 3000 • 0.0.0.0</span>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">Loading health metrics...</div>
          )}
        </div>
      </div>
    </div>
  );
};
