import React from 'react';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ClipboardIcon,
  SettingsIcon,
  CheckSquareIcon,
  ClipboardPenIcon,
  BookOpenIcon,
  BarChart3Icon,
} from '../Icons';
import { Trash2, BarChart3, ShieldCheck, Trophy, Archive, Star } from 'lucide-react';

/**
 * Single source of truth for every navigation destination.
 *
 * The desktop sidebar, the mobile bottom bar, the mobile "more" sheet, and the
 * Easy Mode filter are all derived from this one list. They used to be four
 * hand-maintained arrays in three files, which meant changing an href silently
 * left the others pointing at the old route.
 */

export type MenuSectionId = 'primary' | 'academic' | 'insights' | 'system';

/** Who a teacher is, as far as navigation is concerned. */
export interface MenuAudience {
  isAdmin: boolean;
  role?: string | null;
}

export interface MenuEntry {
  href: string;
  /** Label for the sidebar and the mobile "more" sheet. */
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: MenuSectionId;
  /** Position in the mobile "more" sheet. Omit to leave it out of the sheet. */
  moreOrder?: number;
  /** Survives the Easy Mode trim in the sidebar. */
  inEasyMode?: boolean;
  /** Shorter label for the bottom bar, which has far less width. */
  barLabel?: string;
  /** Bottom-bar icon when it differs from the sidebar one. */
  barIcon?: React.ComponentType<{ className?: string }>;
  /** Slot in the 4-item bottom bar, per audience. Omit to keep it off the bar. */
  bar?: { teacher?: number; leadership?: number };
  /** Restricts visibility. Omit to show to everyone. */
  visibleTo?: 'admin';
}

/** Roles that run the school rather than a classroom. */
const LEADERSHIP_ROLES = new Set(['kepala_madrasah', 'waka_kesiswaan']);

export const isLeadershipRole = (role?: string | null): boolean =>
  !!role && LEADERSHIP_ROLES.has(role);

/**
 * Ordered by how the sidebar lists them. `moreOrder` carries the deliberately
 * different ordering the mobile sheet uses.
 */
export const MENU_ENTRIES: MenuEntry[] = [
  {
    href: '/dashboard',
    label: 'Beranda',
    icon: HomeIcon,
    section: 'primary',
    inEasyMode: true,
    bar: { teacher: 0, leadership: 0 },
  },
  {
    href: '/input-massal',
    label: 'Input Penilaian',
    icon: ClipboardPenIcon,
    section: 'primary',
    moreOrder: 7,
    inEasyMode: true,
    barLabel: 'Penilaian',
    bar: { teacher: 1 },
  },
  {
    href: '/siswa',
    label: 'Data Siswa',
    icon: UsersIcon,
    section: 'primary',
    moreOrder: 1,
    inEasyMode: true,
    barLabel: 'Siswa',
    bar: { teacher: 2, leadership: 1 },
  },
  {
    href: '/absensi',
    label: 'Absensi',
    icon: ClipboardIcon,
    section: 'primary',
    inEasyMode: true,
    bar: { teacher: 3, leadership: 2 },
  },
  {
    href: '/bintang',
    label: 'Program Bintang',
    icon: Star,
    section: 'primary',
    moreOrder: 2,
    inEasyMode: true,
  },
  { href: '/jadwal', label: 'Jadwal & Jurnal', icon: CalendarIcon, section: 'academic', moreOrder: 3 },
  { href: '/modul-ajar', label: 'Modul Ajar', icon: BookOpenIcon, section: 'academic', moreOrder: 4 },
  { href: '/tugas', label: 'Penugasan', icon: CheckSquareIcon, section: 'academic', moreOrder: 5 },
  { href: '/brankas', label: 'Arsip Kelas', icon: Archive, section: 'academic', moreOrder: 6 },
  {
    href: '/analytics',
    label: 'Analitik Akademik',
    icon: BarChart3,
    section: 'insights',
    moreOrder: 9,
    barLabel: 'Analitik',
    barIcon: BarChart3Icon,
    bar: { leadership: 3 },
  },
  { href: '/ekstrakurikuler', label: 'Ekstrakurikuler', icon: Trophy, section: 'insights', moreOrder: 8 },
  { href: '/pemulihan', label: 'Pemulihan & Audit', icon: Trash2, section: 'system', moreOrder: 10 },
  { href: '/pengaturan', label: 'Pengaturan Sistem', icon: SettingsIcon, section: 'system', moreOrder: 11 },
  {
    href: '/admin',
    label: 'Panel Admin',
    icon: ShieldCheck,
    section: 'system',
    moreOrder: 12,
    visibleTo: 'admin',
  },
];

export const SECTION_LABELS: Record<MenuSectionId, string> = {
  primary: 'Menu Utama',
  academic: 'Akademik',
  insights: 'Analitik & Kegiatan',
  system: 'Sistem & Maintenance',
};

/** Order the sidebar renders its sections in. */
export const SECTION_ORDER: MenuSectionId[] = ['primary', 'academic', 'insights', 'system'];

export const isEntryVisible = (entry: MenuEntry, audience: MenuAudience): boolean =>
  entry.visibleTo !== 'admin' || audience.isAdmin;

/** Hrefs the sidebar keeps visible while Easy Mode is on. */
export const EASY_MODE_PATHS: ReadonlySet<string> = new Set(
  MENU_ENTRIES.filter((entry) => entry.inEasyMode).map((entry) => entry.href),
);
