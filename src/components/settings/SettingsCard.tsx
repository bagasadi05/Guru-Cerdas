import React from 'react';
import { Card } from '../ui/Card';

const baseClassName =
  'bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-sm hover:shadow-lg transition-all duration-200 backdrop-blur-none';

export const SettingsCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <Card className={[baseClassName, className].filter(Boolean).join(' ')} {...props} />
);
