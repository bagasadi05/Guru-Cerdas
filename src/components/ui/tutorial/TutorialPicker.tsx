import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  X,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  MousePointerClick,
} from 'lucide-react';
import { tutorialFlows } from './tutorialFlowsData';
import { resetTutorialProgress } from './tutorialStorage';
import { useInteractiveTutorial } from './useInteractiveTutorial';

interface TutorialPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialPicker: React.FC<TutorialPickerProps> = ({ isOpen, onClose }) => {
  const { startFlow, completedFlows } = useInteractiveTutorial();
  const [filter, setFilter] = useState<'semua' | 'dasar' | 'lanjutan'>('semua');

  const handleStart = (flowId: string) => {
    onClose();
    setTimeout(() => startFlow(flowId), 250);
  };

  const handleReset = () => {
    resetTutorialProgress();
    window.location.reload();
  };

  const filteredFlows = tutorialFlows.filter(
    (f) => filter === 'semua' || f.category === filter
  );
  const completedCount = completedFlows.length;
  const totalCount = tutorialFlows.length;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Tutorial Praktik"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Tutorial Praktik</h2>
                <p className="text-white/70 text-xs">Belajar langsung di halaman asli</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress summary */}
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2">
            <div className="flex-1">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs font-medium text-white/80">
              {completedCount}/{totalCount} selesai
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 pt-3 pb-2 flex gap-2 border-b border-slate-100 dark:border-slate-700">
          {(['semua', 'dasar', 'lanjutan'] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab
                  ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'semua' ? 'Semua' : tab === 'dasar' ? '⭐ Dasar' : '🚀 Lanjutan'}
            </button>
          ))}
        </div>

        {/* Tutorial list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredFlows.map((flow) => {
            const isCompleted = completedFlows.includes(flow.id);
            return (
              <button
                type="button"
                key={flow.id}
                onClick={() => handleStart(flow.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left group ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-700 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : flow.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isCompleted
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {flow.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {flow.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xxs text-slate-400 font-medium">
                    {flow.steps.length} langkah
                  </span>
                  {isCompleted ? (
                    <span className="text-xxs text-emerald-500 font-medium flex items-center gap-0.5">
                      <RotateCcw className="w-2.5 h-2.5" /> Ulangi
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <p className="text-xxs text-slate-400 flex items-center gap-1.5">
            <MousePointerClick className="w-3 h-3" />
            Praktik langsung di halaman asli
          </p>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xxs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset progress
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
