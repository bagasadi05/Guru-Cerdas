import React from 'react';
import { Sparkles } from 'lucide-react';

export interface AiButtonProps {
  field: string;
  label?: string;
  onAiFillField?: (field: string) => void;
  fieldLoading?: Record<string, boolean>;
}

export const AiButton: React.FC<AiButtonProps> = ({ field, label, onAiFillField, fieldLoading }) => {
  if (!onAiFillField) return null;
  const loading = fieldLoading?.[field] ?? false;
  return (
    <button
      type="button"
      onClick={() => onAiFillField(field)}
      disabled={loading}
      className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      {label || (loading ? 'Memproses...' : 'AI')}
    </button>
  );
};
