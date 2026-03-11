import React from 'react';
import { BellIcon, BookOpenIcon, CalendarIcon, CheckCircleIcon, DownloadIcon, SendIcon, SettingsIcon, ShieldAlertIcon, SparklesIcon } from '../../Icons';
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
            value: quickSummary.averageScore ?? 'N/A',
            icon: SparklesIcon,
            tone: 'from-indigo-500 to-purple-500',
        },
        {
            label: 'Kehadiran Hadir',
            value: quickSummary.presentCount,
            icon: CheckCircleIcon,
            tone: 'from-emerald-500 to-teal-500',
        },
        {
            label: 'Tugas Aktif',
            value: quickSummary.activeTasksCount,
            icon: BookOpenIcon,
            tone: 'from-amber-500 to-orange-500',
        },
        {
            label: 'Pesan Belum Dibaca',
            value: quickSummary.unreadMessagesCount,
            icon: SendIcon,
            tone: 'from-sky-500 to-blue-500',
        },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Beranda</p>
                        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Ringkasan untuk {student.name}</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Fokus pada hal yang perlu perhatian lebih dulu, lalu lanjut ke detail perkembangan, kehadiran, dan komunikasi.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <CalendarIcon className="h-4 w-4 text-indigo-500" />
                        <span>Kelas {student.classes.name}</span>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.tone} text-white shadow-sm`}>
                                <card.icon className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={() => onOpenTab('komunikasi')}>Buka Komunikasi</button>
                    <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={() => onOpenMoreSection('tugas')}>Lihat Tugas</button>
                    <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={onDownloadPdf}><DownloadIcon className="mr-2 inline-block h-4 w-4" />Unduh PDF</button>
                    <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={onOpenSettings}><SettingsIcon className="mr-2 inline-block h-4 w-4" />Pengaturan</button>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Perlu Perhatian</p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Hal penting untuk ditindaklanjuti</h4>
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
                                    className={`w-full rounded-2xl border p-4 text-left transition hover:shadow-sm ${toneClass}`}
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

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center gap-2">
                        <BellIcon className="h-5 w-5 text-amber-500" />
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Pengumuman Terbaru</h4>
                    </div>
                    <div className="mt-5 space-y-3">
                        {recentAnnouncements.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pengumuman baru.</p>
                        ) : recentAnnouncements.map((announcement) => (
                            <div key={announcement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{announcement.title}</p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{announcement.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Aktivitas Terbaru</h4>
                <div className="mt-5 space-y-3">
                    {recentActivities.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada aktivitas terbaru.</p>
                    ) : recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <div className="mt-1 rounded-full bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                <SparklesIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{activity.title}</p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activity.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
