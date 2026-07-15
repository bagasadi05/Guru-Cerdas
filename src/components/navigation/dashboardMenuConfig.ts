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
} from '../Icons';
import { Trash2, History, BarChart3, ShieldCheck, Trophy, Archive, Star } from 'lucide-react';

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
    label: 'Menu Utama',
    items: [
      { href: '/dashboard', label: 'Beranda', icon: HomeIcon },
      { href: '/input-massal', label: 'Input Penilaian', icon: ClipboardPenIcon },
      { href: '/siswa', label: 'Data Siswa', icon: UsersIcon },
      { href: '/absensi', label: 'Absensi', icon: ClipboardIcon },
    ],
  },
  {
    id: 'academic',
    label: 'Akademik',
    items: [
      { href: '/jadwal', label: 'Jadwal Kelas', icon: CalendarIcon },
      { href: '/jurnal', label: 'Jurnal Harian', icon: BookOpenIcon },
      { href: '/modul-ajar', label: 'Modul Ajar', icon: BookOpenIcon },
      { href: '/tugas', label: 'Penugasan', icon: CheckSquareIcon },
      { href: '/brankas', label: 'Arsip Kelas', icon: Archive },
    ],
  },
  {
    id: 'insights',
    label: 'Analitik & Kegiatan',
    items: [
      { href: '/analytics', label: 'Analitik Akademik', icon: BarChart3 },
      { href: '/ekstrakurikuler', label: 'Ekstrakurikuler', icon: Trophy },
    ],
  },
  {
    id: 'bintang',
    label: 'Program BINTANG',
    items: [
      { href: '/bintang', label: 'Program Bintang', icon: Star },
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
  { href: '/brankas', label: 'Arsip Kelas', icon: Archive },
  { href: '/jurnal', label: 'Jurnal Harian', icon: BookOpenIcon },
  { href: '/modul-ajar', label: 'Modul Ajar', icon: BookOpenIcon },
  { href: '/input-massal', label: 'Input Penilaian', icon: ClipboardPenIcon },
  { href: '/ekstrakurikuler', label: 'Ekstrakurikuler', icon: Trophy },
  { href: '/analytics', label: 'Analitik Akademik', icon: BarChart3 },
  { href: '/bintang', label: 'Program Bintang', icon: Star },
  { href: '/riwayat', label: 'Riwayat Aksi', icon: History },
  { href: '/sampah', label: 'Sampah', icon: Trash2 },
  { href: '/pengaturan', label: 'Pengaturan Sistem', icon: SettingsIcon },
];

export const getDashboardNavSections = (isAdmin: boolean, role?: string | null, isHomeroomTeacher: boolean = false, _isEasyMode: boolean = false): DashboardMenuSection[] => {

  let sections = baseNavSections.map((section) => ({
    ...section,
    items: [...section.items],
  }));

  if (!isAdmin && !isHomeroomTeacher) {
    sections = sections.filter(section => section.id !== 'bintang');
  }

  if (role === 'kepala_madrasah' || role === 'waka_kesiswaan') {
    const insightsSection = sections.find(s => s.id === 'insights');
    if (insightsSection) {
      insightsSection.items.push({ href: '/tindak-lanjut', label: 'Tindak Lanjut', icon: ShieldCheck });
    }
  }

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

export const getDashboardMoreMenuItems = (isAdmin: boolean, role?: string | null, isHomeroomTeacher: boolean = false, _isEasyMode: boolean = false): DashboardMenuItem[] => {

  let items = [...baseMoreMenuItems];
  
  if (!isAdmin && !isHomeroomTeacher) {
    items = items.filter(item => item.href !== '/bintang');
  }
  
  if (role === 'kepala_madrasah' || role === 'waka_kesiswaan') {
    items.push({ href: '/tindak-lanjut', label: 'Tindak Lanjut', icon: ShieldCheck });
  }

  if (!isAdmin) {
    return items;
  }
  return [...items, adminMenuItem];
};