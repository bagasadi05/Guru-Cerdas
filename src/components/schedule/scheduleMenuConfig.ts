import type { ComponentType } from 'react';
import { LayoutGridIcon, ListIcon } from '../Icons';

export type ScheduleViewMode = 'daily' | 'weekly';

export const scheduleViewModeOptions: Array<{
  mode: ScheduleViewMode;
  title: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    mode: 'daily',
    title: 'Tampilan Harian',
    icon: ListIcon,
  },
  {
    mode: 'weekly',
    title: 'Tampilan Mingguan',
    icon: LayoutGridIcon,
  },
];
