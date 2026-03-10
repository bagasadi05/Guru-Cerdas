import { LayoutGridIcon, ListIcon } from 'lucide-react';
import type { ComponentType } from 'react';

export type AttendanceViewMode = 'list' | 'calendar';

export const attendanceViewModeOptions: Array<{
  mode: AttendanceViewMode;
  label: string;
  ariaLabel: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    mode: 'list',
    label: 'Daftar',
    ariaLabel: 'Tampilan daftar',
    icon: ListIcon,
  },
  {
    mode: 'calendar',
    label: 'Kalender',
    ariaLabel: 'Tampilan kalender',
    icon: LayoutGridIcon,
  },
];
