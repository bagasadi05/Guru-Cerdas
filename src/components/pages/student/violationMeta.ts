import { AlertTriangleIcon, CheckCircleIcon, ClockIcon } from 'lucide-react';

export const SEVERITY_LEVELS = {
    ringan: { label: 'Ringan', color: 'yellow', points: '1-10', icon: '⚠️', bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', textClass: 'text-yellow-700 dark:text-yellow-400', borderClass: 'border-yellow-200 dark:border-yellow-800' },
    sedang: { label: 'Sedang', color: 'orange', points: '11-25', icon: '🔶', bgClass: 'bg-orange-50 dark:bg-orange-900/20', textClass: 'text-orange-700 dark:text-orange-400', borderClass: 'border-orange-200 dark:border-orange-800' },
    berat: { label: 'Berat', color: 'red', points: '26+', icon: '🔴', bgClass: 'bg-red-50 dark:bg-red-900/20', textClass: 'text-red-700 dark:text-red-400', borderClass: 'border-red-200 dark:border-red-800' },
} as const;

export type SeverityLevel = keyof typeof SEVERITY_LEVELS;

export const FOLLOW_UP_STATUS = {
    pending: { label: 'Belum Ditindak', color: 'gray', icon: ClockIcon },
    in_progress: { label: 'Sedang Diproses', color: 'blue', icon: AlertTriangleIcon },
    resolved: { label: 'Sudah Selesai', color: 'green', icon: CheckCircleIcon },
} as const;

export type FollowUpStatus = keyof typeof FOLLOW_UP_STATUS;
