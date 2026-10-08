import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener([...toastsState]));
}

export const toast = {
  show(message: string, type: ToastType = 'success', description?: string) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: ToastItem = { id, message, description, type };
    toastsState = [...toastsState, newItem];
    notifyListeners();

    setTimeout(() => {
      toast.dismiss(id);
    }, 3500);
  },
  success(message: string, description?: string) {
    this.show(message, 'success', description);
  },
  error(message: string, description?: string) {
    this.show(message, 'error', description);
  },
  info(message: string, description?: string) {
    this.show(message, 'info', description);
  },
  dismiss(id: string) {
    toastsState = toastsState.filter((t) => t.id !== id);
    notifyListeners();
  },
};

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: ToastListener = (updated) => setItems(updated);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200/90 shadow-lg shadow-slate-900/5 text-slate-900 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          {item.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {item.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          {item.type === 'info' && (
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="grow min-w-0">
            <p className="text-xs font-semibold text-slate-900 leading-snug">
              {item.message}
            </p>
            {item.description && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(item.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
