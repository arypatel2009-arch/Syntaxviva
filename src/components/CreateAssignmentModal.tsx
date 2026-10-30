import React, { useState } from 'react';
import { X, Plus, CheckCircle2, Code2, FileText, AlertCircle, Trash2, Sparkles } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Assignment } from '../types/index.ts';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentCreated: (assignment: Assignment) => void;
}

interface TestCaseItem {
  input: string;
  expected: string;
  description: string;
  is_hidden: boolean;
}

const DEFAULT_LARGEST_TESTS: TestCaseItem[] = [
  { input: '10 5\n', expected: '10', description: 'a > b (First is larger)', is_hidden: false },
  { input: '5 10\n', expected: '10', description: 'a < b (Second is larger)', is_hidden: false },
  { input: '7 7\n', expected: '7', description: 'a == b (Equal numbers)', is_hidden: false },
  { input: '10 25\n', expected: '25', description: 'Standard comparison test', is_hidden: false },
  { input: '-4 -10\n', expected: '-4', description: 'Negative numbers comparison', is_hidden: true },
  { input: '0 0\n', expected: '0', description: 'Zeros comparison', is_hidden: true },
  { input: '-50 50\n', expected: '50', description: 'Negative and positive integers', is_hidden: true },
];

const DEFAULT_PARKING_FEE_TESTS: TestCaseItem[] = [
  { input: '1\n', expected: 'Total Parking Fee: ₹ 20', description: 'Tier 1: 1 hour (<= 2 hrs @ ₹20/hr)', is_hidden: false },
  { input: '2\n', expected: 'Total Parking Fee: ₹ 40', description: 'Tier 1 boundary: 2 hours', is_hidden: false },
  { input: '3\n', expected: 'Total Parking Fee: ₹ 70', description: 'Tier 2: 3 hours (2 hrs @ ₹20 + 1 hr @ ₹30)', is_hidden: false },
  { input: '4\n', expected: 'Total Parking Fee: ₹ 100', description: 'Tier 2: 4 hours', is_hidden: true },
  { input: '5\n', expected: 'Total Parking Fee: ₹ 130', description: 'Tier 2 boundary: 5 hours', is_hidden: true },
  { input: '6\n', expected: 'Total Parking Fee: ₹ 180', description: 'Tier 3: 6 hours (2@20 + 3@30 + 1@50)', is_hidden: true },
  { input: '8\n', expected: 'Total Parking Fee: ₹ 280', description: 'Tier 3: 8 hours', is_hidden: true },
];

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssignmentCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('python');
  const [requirements, setRequirements] = useState('');
  const [testCases, setTestCases] = useState<TestCaseItem[]>(DEFAULT_LARGEST_TESTS);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const loadLargestNumberTemplate = () => {
    setTitle('find the largest number');
    setDescription('Write a Python program that reads two integers from standard input and prints the larger number.');
    setLanguage('python');
    setRequirements('Read two integers from stdin. Print the larger number to stdout.');
    setTestCases(DEFAULT_LARGEST_TESTS);
  };

  const loadParkingFeeTemplate = () => {
    setTitle('Parking Fee Calculator');
    setDescription(
      'Write a Python program to calculate the total parking fee based on the number of hours parked:\n' +
      '• First 2 hours: ₹20 per hour\n' +
      '• Next 3 hours (hours 3 to 5): ₹30 per hour\n' +
      '• Beyond 5 hours: ₹50 per hour\n\n' +
      'Input:\nAn integer representing total parking hours.\n\n' +
      'Output format:\nTotal Parking Fee: ₹ <fee>'
    );
    setLanguage('python');
    setRequirements('Read parking hours from stdin. Calculate fee according to tiered rates. Print "Total Parking Fee: ₹ <fee>".');
    setTestCases(DEFAULT_PARKING_FEE_TESTS);
  };

  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      { input: '', expected: '', description: `Test Case ${prev.length + 1}`, is_hidden: false },
    ]);
  };

  const updateTestCase = (index: number, field: keyof TestCaseItem, value: any) => {
    setTestCases((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeTestCase = (index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createAssignment({
        title: title.trim(),
        description: description.trim(),
        language,
        requirements: requirements.trim(),
        starterCode: '',
        testCases,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      onAssignmentCreated(res.assignment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create New Assignment</h2>
            <p className="text-xs text-slate-500">Define programming challenge and deterministic test cases</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-load-parking-template"
              onClick={loadParkingFeeTemplate}
              className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 flex items-center gap-1 cursor-pointer transition"
              title="Load 'Parking Fee Calculator' sample template"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Parking Fee</span>
            </button>
            <button
              type="button"
              id="btn-load-largest-template"
              onClick={loadLargestNumberTemplate}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 flex items-center gap-1 cursor-pointer transition"
              title="Load 'find the largest number' sample template"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Largest Number</span>
            </button>
            <button
              id="btn-close-create-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Title *</label>
            <input
              id="input-assignment-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. find the largest number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
              <select
                id="select-assignment-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="python">Python (3.x)</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="java">Java (Standard)</option>
                <option value="cpp">C++ (GCC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                id="input-assignment-duedate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Problem Statement *</label>
            <textarea
              id="input-assignment-desc"
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the problem requirement, expected inputs, outputs, and constraints..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Requirements / Guidelines</label>
            <input
              id="input-assignment-requirements"
              type="text"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g. Read two integers from standard input and print the larger number."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Test Cases Section */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-900">Deterministic Test Cases ({testCases.length})</label>
                <p className="text-[11px] text-slate-500">Test cases used to deterministically evaluate Phase 2 fixes.</p>
              </div>
              <button
                type="button"
                onClick={addTestCase}
                className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Test</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {testCases.map((tc, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Test #{idx + 1} {tc.description && `(${tc.description})`}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-slate-600 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_hidden}
                          onChange={(e) => updateTestCase(idx, 'is_hidden', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Hidden</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeTestCase(idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete test case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-0.5 font-medium">Input (stdin)</span>
                      <input
                        type="text"
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        placeholder="e.g. 10 25\n"
                        className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-0.5 font-medium">Expected Output (stdout)</span>
                      <input
                        type="text"
                        value={tc.expected}
                        onChange={(e) => updateTestCase(idx, 'expected', e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-create-assignment"
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
