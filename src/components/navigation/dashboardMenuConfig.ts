import React from 'react';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ClipboardIcon,
  SettingsIcon,
  CheckSquareIcon,
  ClipboardPenIcon,
} from '../Icons';
import { Trash2, History, BarChart3, ShieldCheck, Trophy } from 'lucide-react';

export interface DashboardMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DashboardMenuSection {
  id: string;
  label: string;
  items: DashboardMenuItem[];
}

const adminMenuItem: DashboardMenuItem = { href: '/admin', label: 'Panel Admin', icon: ShieldCheck };

const baseNavSections: DashboardMenuSection[] = [
  {
    id: 'primary',
    label: 'Utama',
    items: [
      { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
      { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
      { href: '/siswa', label: 'Data Siswa', icon: UsersIcon },
      { href: '/jadwal', label: 'Jadwal Mengajar', icon: CalendarIcon },
      { href: '/tugas', label: 'Manajemen Tugas', icon: CheckSquareIcon },
      { href: '/input-massal', label: 'Input Cepat', icon: ClipboardPenIcon },
    ],
  },
  {
    id: 'insights',
    label: 'Analitik & Kegiatan',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/ekstrakurikuler', label: 'Ekstrakurikuler', icon: Trophy },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    items: [
      { href: '/riwayat', label: 'Riwayat Aksi', icon: History },
      { href: '/sampah', label: 'Sampah', icon: Trash2 },
      { href: '/pengaturan', label: 'Pengaturan Sistem', icon: SettingsIcon },
    ],
  },
];

const baseMoreMenuItems: DashboardMenuItem[] = [
  { href: '/siswa', label: 'Data Siswa', icon: UsersIcon },
  { href: '/input-massal', label: 'Input Cepat', icon: ClipboardPenIcon },
  { href: '/ekstrakurikuler', label: 'Ekstrakurikuler', icon: Trophy },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/riwayat', label: 'Riwayat Aksi', icon: History },
  { href: '/sampah', label: 'Sampah', icon: Trash2 },
  { href: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon },
];

export const getDashboardNavSections = (isAdmin: boolean): DashboardMenuSection[] => {
  const sections = baseNavSections.map((section) => ({
    ...section,
    items: [...section.items],
  }));

  if (!isAdmin) {
    return sections;
  }

  const systemSection = sections.find((section) => section.id === 'system');
  if (systemSection) {
    systemSection.items.push(adminMenuItem);
    return sections;
  }

  sections.push({
    id: 'system',
    label: 'Sistem',
    items: [adminMenuItem],
  });
  return sections;
};

export const getDashboardMoreMenuItems = (isAdmin: boolean): DashboardMenuItem[] => {
  if (!isAdmin) {
    return [...baseMoreMenuItems];
  }
  return [...baseMoreMenuItems, adminMenuItem];
};
