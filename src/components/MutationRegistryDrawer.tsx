import React, { useState, useEffect } from 'react';
import { X, Layers, Search, CheckCircle2, Sliders, Database } from 'lucide-react';
import { api } from '../lib/api.ts';
import { MutationRegistryEntry } from '../types/index.ts';

interface MutationRegistryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MutationRegistryDrawer: React.FC<MutationRegistryDrawerProps> = ({ isOpen, onClose }) => {
  const [mutations, setMutations] = useState<MutationRegistryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getMutationRegistry()
        .then((res) => {
          setMutations(res.mutations || []);
        })
        .catch((err) => {
          console.error('Failed to load mutation registry:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set(mutations.map((m) => m.category)))];

  const filtered = mutations.filter((m) => {
    const matchesSearch =
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Database Mutation Registry</h2>
              <p className="text-xs text-slate-500">
                Extensible catalog • {mutations.length} initial mutation types registered
              </p>
            </div>
          </div>
          <button
            id="btn-close-registry-drawer"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Architecture Notice */}
        <div className="p-3.5 mx-5 mt-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Extensible Database-Backed Architecture
          </div>
          <p className="text-blue-700 leading-relaxed text-[11px]">
            Designed to scale deterministically from 20+ to 500+ mutation providers without rewriting
            engine code. Stored directly in the SQLite <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">mutation_registry</code> table.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="p-5 space-y-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-registry-search"
              type="text"
              placeholder="Search by code, operator, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of mutations */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              Loading mutation registry from SQLite database...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No mutation types matched your search.</div>
          ) : (
            filtered.map((item, index) => (
              <div
                key={item.id || item.code}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{item.code}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-1">{item.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <span>{filtered.length} of {mutations.length} mutations shown</span>
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Registry Synchronized
          </span>
        </div>
      </div>
    </div>
  );
};
