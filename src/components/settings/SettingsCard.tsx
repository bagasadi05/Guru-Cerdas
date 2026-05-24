import React from 'react';
import { Card } from '../ui/Card';

const baseClassName =
  'bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 shadow-xl hover:shadow-2xl hover:border-emerald-500/20 dark:hover:border-emerald-400/20 transition-all duration-300 backdrop-blur-xl rounded-2xl sm:rounded-3xl';

export const SettingsCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <Card className={[baseClassName, className].filter(Boolean).join(' ')} {...props} />
);

