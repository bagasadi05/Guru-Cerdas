import React, { useState } from 'react';
import { ArrowRightIcon } from '../../../../Icons';
import { MarkdownText } from '../../../../ui/MarkdownText';

export const ActionableRecommendation: React.FC<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actions: string[];
  onStartAction?: () => void;
}> = ({ title, description, priority, category, actions, onStartAction: _onStartAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isLongDescription = description.length > 150;

  const priorityStyles = {
    high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10',
    medium: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10',
    low: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10',
  };

  const priorityLabels = {
    high: { text: 'Prioritas Tinggi', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    medium: { text: 'Prioritas Sedang', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    low: { text: 'Prioritas Rendah', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  };

  return (
    <div className={`rounded-xl border-2 shadow-sm ${priorityStyles[priority]} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityLabels[priority].bg} ${priorityLabels[priority].color}`}>
              {priorityLabels[priority].text}
            </span>
            <span className="text-xs text-gray-400">{category}</span>
          </div>
        </div>

        <h4 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h4>
        <div className={`text-sm text-gray-600 dark:text-gray-400 ${!isDescriptionExpanded && isLongDescription ? 'line-clamp-3' : ''}`}>
          <MarkdownText text={description} />
        </div>
        {isLongDescription && (
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="mt-1 text-xs text-blue-500 hover:underline"
          >
            {isDescriptionExpanded ? 'Tutup' : 'Baca selengkapnya â†’'}
          </button>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
        >
          {isExpanded ? 'Sembunyikan Langkah' : 'Lihat Langkah Aksi'}
          <ArrowRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
          <p className="text-xs font-semibold text-gray-500 mb-2">LANGKAH AKSI:</p>
          <ol className="space-y-2">
            {actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
