import React from 'react';
import { BellIcon, BookOpenIcon, CalendarIcon, CheckCircleIcon, DownloadIcon, SendIcon, SettingsIcon, SparklesIcon } from '../../Icons';
import type {
    PortalActivityItem,
    PortalAnnouncement,
    PortalAttentionItem,
    PortalMoreSection,
    PortalPrimaryTab,
    PortalQuickSummary,
    PortalStudentInfo,
} from './types';

interface PortalHomeTabProps {
    student: PortalStudentInfo;
    attentionItems: PortalAttentionItem[];
    quickSummary: PortalQuickSummary;
    recentActivities: PortalActivityItem[];
    recentAnnouncements: PortalAnnouncement[];
    onOpenTab: (tab: PortalPrimaryTab) => void;
    onOpenMoreSection: (section: PortalMoreSection) => void;
    onOpenSettings: () => void;
    onDownloadPdf: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export const PortalHomeTab: React.FC<PortalHomeTabProps> = ({
    student,
    attentionItems,
    quickSummary,
    recentActivities,
    recentAnnouncements,
    onOpenTab,
    onOpenMoreSection,
    onOpenSettings,
    onDownloadPdf,
}) => {
    const summaryCards = [
        {
            label: 'Rata-rata Nilai',
            value: quickSummary.averageScore !== null ? quickSummary.averageScore.toFixed(1) : '-',
            icon: SparklesIcon,
            tone: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40',
        },
        {
            label: 'Kehadiran Hadir',
            value: quickSummary.presentCount,
            icon: CheckCircleIcon,
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
        },
        {
            label: 'Tugas Aktif',
            value: quickSummary.activeTasksCount,
            icon: BookOpenIcon,
            tone: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
        },
        {
            label: 'Pesan Belum Dibaca',
            value: quickSummary.unreadMessagesCount,
            icon: SendIcon,
            tone: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40',
        },
    ];

    const quickActions = [
        {
            label: 'Komunikasi Guru',
            description: 'Buka pesan masuk dan kirim tindak lanjut ke guru kelas.',
            icon: SendIcon,
            action: () => onOpenTab('komunikasi'),
        },
        {
            label: 'Lihat Kehadiran',
            description: 'Periksa presensi siswa pada semester yang sedang dipilih.',
            icon: CalendarIcon,
            action: () => onOpenTab('kehadiran'),
        },
        {
            label: 'Periksa Tugas',
            description: 'Tinjau tugas yang masih aktif dan tenggat terdekat.',
            icon: BookOpenIcon,
            action: () => onOpenMoreSection('tugas'),
        },
        {
            label: 'Unduh Ringkasan',
            description: 'Simpan laporan perkembangan dalam format PDF.',
            icon: DownloadIcon,
            action: onDownloadPdf,
        },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fffdf7_0%,#ffffff_45%,#f8fafc_100%)] p-5 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.9)_100%)] sm:p-7">
                <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Beranda Portal</p>
                        <h3 className="mt-3 font-serif text-3xl leading-tight text-slate-900 dark:text-white">
                            Ringkasan perkembangan {student.name}
                        </h3>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Halaman ini merangkum hal-hal utama yang biasanya dibutuhkan wali murid: progres akademik, kehadiran, komunikasi dengan guru, serta agenda tindak lanjut.
                        </p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {summaryCards.map((card) => (
                                <div key={card.label} className={`rounded-3xl border p-4 ${card.tone}`}>
                                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-white/10">
                                        <card.icon className="h-5 w-5" />
                                    </div>
                                    <p className="mt-5 text-3xl font-semibold">{card.value}</p>
                                    <p className="mt-1 text-sm">{card.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ikhtisar Wali</p>
                        <div className="mt-4 space-y-4">
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nama Wali / Orang Tua</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{student.parent_name || 'Belum diperbarui'}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Kelas</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{student.classes.name}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Kontak Notifikasi</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{student.parent_phone || 'Belum diisi'}</p>
                            </div>
                        </div>
                        <button
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:border-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                            onClick={onOpenSettings}
                        >
                            <SettingsIcon className="h-4 w-4" />
                            Perbarui Data Wali
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Menu Cepat</p>
                        <h4 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Akses yang paling sering dipakai wali murid</h4>
                    </div>
                    <button
                        className="hidden rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex"
                        onClick={onOpenSettings}
                    >
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Pengaturan
                    </button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {quickActions.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.action}
                            className="group rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                <item.icon className="h-5 w-5" />
                            </div>
                            <h5 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{item.label}</h5>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.description}</p>
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Perlu Perhatian</p>
                            <h4 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Hal penting untuk ditindaklanjuti</h4>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{attentionItems.length} item</span>
                    </div>

                    <div className="mt-5 space-y-3">
                        {attentionItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                                Tidak ada item mendesak saat ini.
                            </div>
                        ) : attentionItems.map((item) => {
                            const toneClass = item.severity === 'critical'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-300'
                                : item.severity === 'warning'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-300'
                                    : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/30 dark:bg-sky-950/30 dark:text-sky-300';

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => item.href?.startsWith('lainnya:') ? onOpenMoreSection(item.href.split(':')[1] as PortalMoreSection) : onOpenTab((item.href as PortalPrimaryTab) || 'beranda')}
                                    className={`w-full rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="mt-1 text-sm opacity-90">{item.description}</p>
                                        </div>
                                        {item.badge && <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold dark:bg-black/20">{item.badge}</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center gap-2">
                        <BellIcon className="h-5 w-5 text-amber-500" />
                        <h4 className="text-xl font-semibold text-slate-900 dark:text-white">Pengumuman Sekolah</h4>
                    </div>
                    <div className="mt-5 space-y-3">
                        {recentAnnouncements.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pengumuman baru.</p>
                        ) : recentAnnouncements.map((announcement) => (
                            <div key={announcement.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{announcement.title}</p>
                                    {announcement.date && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{dateFormatter.format(new Date(announcement.date))}</span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{announcement.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Riwayat</p>
                        <h4 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Aktivitas Terbaru</h4>
                    </div>
                    <button
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={onDownloadPdf}
                    >
                        <DownloadIcon className="mr-2 inline-block h-4 w-4" />
                        Unduh PDF
                    </button>
                </div>
                <div className="mt-5 space-y-3">
                    {recentActivities.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada aktivitas terbaru.</p>
                    ) : recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <div className="mt-1 rounded-2xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                <SparklesIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{activity.title}</p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activity.description}</p>
                                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                    {dateFormatter.format(new Date(activity.createdAt))}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
