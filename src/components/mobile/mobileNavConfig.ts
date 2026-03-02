/**
 * Mobile Navigation Configuration
 * Shared constants for mobile navigation items
 */

import {
  HomeIcon,
  ClipboardIcon,
  CalendarIcon,
  CheckSquareIcon,
} from '../Icons';

export interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Main 4 items for mobile bottom nav
export const mobileNavItems: MobileNavItem[] = [
  { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
  { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
  { href: '/jadwal', label: 'Jadwal', icon: CalendarIcon },
  { href: '/tugas', label: 'Tugas', icon: CheckSquareIcon },
];
