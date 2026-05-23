import React from 'react';
import { BookOpenIcon, UsersIcon, TrendingUpIcon, BrainCircuitIcon, FileTextIcon, CheckCircleIcon } from '../../../../Icons';

const COMP_LOADING_STEPS = [
  { id: 1, label: 'Mengelompokkan data Semester 1 & Semester 2', icon: BookOpenIcon },
  { id: 2, label: 'Membandingkan rata-rata nilai dan tren kognitif', icon: TrendingUpIcon },
  { id: 3, label: 'Menganalisis perbandingan kehadiran & pelanggaran', icon: UsersIcon },
  { id: 4, label: 'Merumuskan narasi perkembangan emosional (AI)', icon: BrainCircuitIcon },
  { id: 5, label: 'Menyusun laporan komparatif terpadu', icon: FileTextIcon },
];

export const CompLoadingProgress: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Membandingkan Perkembangan Semester...</h3>
          <p className="text-sm text-gray-500 font-medium">AI sedang menganalisis komparasi Semester 1 & Semester 2</p>
        </div>
      </div>

      <div className="space-y-4">
        {COMP_LOADING_STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isCompleted
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 animate-pulse'
                    : 'bg-gray-50 dark:bg-gray-800/50 opacity-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isCompleted || isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              {isCurrent && (
                <div className="ml-auto">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / COMP_LOADING_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center font-medium">
          Langkah {currentStep} dari {COMP_LOADING_STEPS.length}
        </p>
      </div>
    </div>
  );
};