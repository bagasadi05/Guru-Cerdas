import React from 'react';
import { Bot, RefreshCw } from 'lucide-react';

interface AIFieldGeneratorProps {
  label: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: (fieldId: string) => void;
  isLoading: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const AIFieldGenerator: React.FC<AIFieldGeneratorProps> = ({
  label,
  fieldId,
  value,
  onChange,
  onGenerate,
  isLoading,
  placeholder,
  rows = 4,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <button
          type="button"
          onClick={() => onGenerate(fieldId)}
          disabled={isLoading}
          className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:hover:bg-brand-800/50 dark:text-brand-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Bot className="w-3.5 h-3.5" />
          )}
          <span>{isLoading ? 'Menganalisis...' : 'Generate AI'}</span>
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow dark:text-white resize-y"
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
};
