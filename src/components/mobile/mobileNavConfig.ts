/**
 * Mobile Navigation Configuration
 * Shared constants for mobile navigation items
 */

import {
  HomeIcon,
  ClipboardIcon,
  CalendarIcon,
  CheckSquareIcon,
  UsersIcon,
  BarChart3Icon,
} from '../Icons';

export interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Main 4 items for mobile bottom nav
export const getMobileNavItems = (role?: string | null): MobileNavItem[] => {
  if (role === 'kepala_madrasah' || role === 'waka_kesiswaan') {
    return [
      { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
      { href: '/siswa', label: 'Siswa', icon: UsersIcon },
      { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
      { href: '/analytics', label: 'Analitik', icon: BarChart3Icon },
    ];
  }
  return [
    { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
    { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
    { href: '/jadwal', label: 'Jadwal', icon: CalendarIcon },
    { href: '/tugas', label: 'Tugas', icon: CheckSquareIcon },
  ];
};