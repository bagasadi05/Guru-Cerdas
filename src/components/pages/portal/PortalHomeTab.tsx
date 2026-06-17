import React from 'react';
import { BellIcon, BookOpenIcon, BrainCircuitIcon, CalendarIcon, CheckCircleIcon, DownloadIcon, SendIcon, SparklesIcon } from '../../Icons';
import type {
    PortalActivityItem,
    PortalAnnouncement,
    PortalAttentionItem,
    PortalGuardianSummary,
    PortalMoreSection,
    PortalPrimaryTab,
    PortalQuickSummary,
    PortalStudentInfo,
    PortalWeeklySummary,
} from './types';

interface PortalHomeTabProps {
    student: PortalStudentInfo;
    attentionItems: PortalAttentionItem[];
    guardianSummary: PortalGuardianSummary | null;
    weeklySummary: PortalWeeklySummary | null;
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
    student: _student,
    attentionItems,
    guardianSummary,
    weeklySummary,
    quickSummary,
    recentActivities,
    recentAnnouncements,
    onOpenTab,
    onOpenMoreSection,
    onOpenSettings: _onOpenSettings,
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

    const _guardianStatusTone = guardianSummary?.status === 'perhatian'
        ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-100'
        : guardianSummary?.status === 'pantau'
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-100'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-100';

    const handleGuardianAction = (target: PortalGuardianSummary['actions'][number]['target']) => {
        if (target === 'download') {
            onDownloadPdf();
            return;
        }

        if (target.startsWith('lainnya:')) {
            onOpenMoreSection(target.split(':')[1] as PortalMoreSection);
            return;
        }

        onOpenTab(target as PortalPrimaryTab);
    };

    const getWeeklyTone = (tone: PortalWeeklySummary['stats'][number]['tone']) => {
        switch (tone) {
            case 'danger':
                return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-100';
            case 'warning':
                return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-100';
            case 'success':
                return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-100';
            case 'info':
            default:
                return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/30 dark:bg-sky-950/30 dark:text-sky-100';
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
            {/* 1. Sleek Top Summary Grid with Parent-Centric Terminology */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {summaryCards.map((card) => {
                    const isNewMessage = card.label === 'Pesan Belum Dibaca' && Number(card.value) > 0;
                    return (
                        <div 
                            key={card.label} 
                            className={`group relative overflow-hidden rounded-3xl border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${card.tone}`}
                        >
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                                        {card.label === 'Rata-rata Nilai' ? 'Rata-rata Rapor' :
                                         card.label === 'Kehadiran Hadir' ? 'Presensi Hadir' :
                                         card.label === 'Tugas Aktif' ? 'Tugas Berjalan' :
                                         card.label === 'Pesan Belum Dibaca' ? 'Pesan Baru' : card.label}
                                    </span>
                                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/10 shadow-sm transition-transform duration-300 group-hover:scale-110 ${isNewMessage ? 'animate-bounce bg-rose-100 text-rose-600' : ''}`}>
                                        <card.icon className="h-4.5 w-4.5" />
                                    </span>
                                </div>
                                <div className="mt-5 flex items-baseline gap-1">
                                    <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                                        {card.value}
                                    </p>
                                    {card.label === 'Kehadiran Hadir' && <span className="text-xs font-medium opacity-75">hari</span>}
                                    {card.label === 'Tugas Aktif' && <span className="text-xs font-medium opacity-75">tugas</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* 2. Main Two-Column Layout (Left: Primary Insights, Right: School/Timeline) */}
            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                {/* ==================== LEFT COLUMN ==================== */}
                <div className="space-y-6">
                    {/* A. AI Guardian Summary with dynamic HSL background */}
                    {guardianSummary && (
                        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
                            <div className={`p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br ${
                                guardianSummary.status === 'perhatian'
                                    ? 'from-rose-50/40 via-red-50/20 to-white/50 dark:from-rose-950/10 dark:via-red-950/5 dark:to-slate-900/40 border-l-[6px] border-l-rose-500'
                                    : guardianSummary.status === 'pantau'
                                        ? 'from-amber-50/40 via-yellow-50/20 to-white/50 dark:from-amber-950/10 dark:via-yellow-950/5 dark:to-slate-900/40 border-l-[6px] border-l-amber-500'
                                        : 'from-emerald-50/40 via-teal-50/20 to-white/50 dark:from-emerald-950/10 dark:via-teal-950/5 dark:to-slate-900/40 border-l-[6px] border-l-emerald-500'
                            }`}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-teal-50/70 px-3 py-1 text-xxs font-bold uppercase tracking-wider text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-200">
                                            <BrainCircuitIcon className="h-3.5 w-3.5" />
                                            AI Kesimpulan Wali Murid
                                        </div>
                                        <h4 className="mt-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                                            {guardianSummary.title}
                                        </h4>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                            {guardianSummary.message}
                                        </p>
                                    </div>
                                    <div className={`self-start rounded-2xl border px-3 py-1.5 text-xs font-bold shadow-sm ${
                                        guardianSummary.status === 'perhatian'
                                            ? 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-200'
                                            : guardianSummary.status === 'pantau'
                                                ? 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200'
                                                : 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-200'
                                    }`}>
                                        {guardianSummary.status === 'baik' ? '🟢 Kondisi Baik & Stabil' : 
                                         guardianSummary.status === 'pantau' ? '🟡 Perlu Dipantau Bersama' : '🔴 Butuh Perhatian Khusus'}
                                    </div>
                                </div>

                                {/* Mini stats grid from AI summary */}
                                <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
                                    {guardianSummary.highlights.map((item) => (
                                        <div key={item.label} className="rounded-2xl border border-white/60 bg-white/70 p-3.5 shadow-sm dark:border-white/5 dark:bg-slate-800/40">
                                            <p className="text-xxs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</p>
                                            <p className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">{item.value}</p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons from AI summary */}
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {guardianSummary.actions.map((action) => {
                                        const actionTone = action.tone === 'danger'
                                            ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/50'
                                            : action.tone === 'warning'
                                                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50'
                                                : 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 dark:border-teal-900/30 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-950/50';

                                        return (
                                            <button
                                                key={action.id}
                                                type="button"
                                                onClick={() => handleGuardianAction(action.target)}
                                                className={`rounded-2xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${actionTone}`}
                                            >
                                                <p className="text-xs font-bold tracking-wide uppercase opacity-75">Saran Tindakan</p>
                                                <p className="mt-1 font-semibold text-sm leading-relaxed">{action.label}</p>
                                                <p className="mt-0.5 text-xs opacity-85">{action.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* B. Weekly summary & Suggestions */}
                    {weeklySummary && (
                        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
                            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                                <div className="bg-slate-950 p-5 text-white dark:bg-slate-900 sm:p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xxs font-extrabold uppercase tracking-wider text-emerald-400">{weeklySummary.title}</p>
                                        <h4 className="mt-2.5 text-xl font-bold">Catatan Singkat Pekan Ini</h4>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-300">{weeklySummary.narrative}</p>
                                    </div>
                                    <div className="mt-5 space-y-2">
                                        {weeklySummary.suggestions.map((suggestion) => (
                                            <div key={suggestion} className="rounded-2xl bg-white/10 px-4 py-3 text-xs leading-relaxed text-slate-200 backdrop-blur-sm border border-white/5">
                                                💡 {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-5 sm:p-6 flex flex-col justify-center">
                                    <p className="text-xxs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">Statistik Mingguan</p>
                                    <div className="grid gap-3 grid-cols-2">
                                        {weeklySummary.stats.map((stat) => (
                                            <div key={stat.label} className={`rounded-2xl border p-3.5 ${getWeeklyTone(stat.tone)}`}>
                                                <p className="text-xxs font-bold uppercase tracking-wider opacity-75">{stat.label}</p>
                                                <p className="mt-2 text-2xl font-black">{stat.value}</p>
                                                <p className="mt-0.5 text-[11px] leading-relaxed opacity-85">{stat.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* C. Quick actions grid */}
                    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 transition-all duration-300 hover:shadow-md">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Menu Cepat Orang Tua</h4>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Akses cepat ke fitur yang paling sering dibutuhkan oleh ayah & bunda.</p>
                        
                        <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4">
                            {quickActions.map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={item.action}
                                    className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                                >
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white dark:bg-amber-400 dark:text-slate-950 shadow-sm transition-transform duration-300 group-hover:scale-105">
                                        <item.icon className="h-4.5 w-4.5" />
                                    </div>
                                    <h5 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{item.label}</h5>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ==================== RIGHT COLUMN ==================== */}
                <div className="space-y-6">
                    {/* A. Attention Items (Perlu Perhatian) */}
                    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Perlu Tindak Lanjut</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Pemberitahuan penting yang butuh perhatian orang tua.</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {attentionItems.length}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {attentionItems.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-400 leading-relaxed">
                                    ✨ <b>Semua Aman!</b><br />
                                    Anak Anda mengikuti kegiatan sekolah dengan sangat baik pekan ini.
                                </div>
                            ) : (
                                attentionItems.map((item) => {
                                    const toneClass = item.severity === 'critical'
                                        ? 'border-rose-200 bg-rose-50/50 text-rose-850 hover:bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-250 dark:hover:bg-rose-950/30'
                                        : item.severity === 'warning'
                                            ? 'border-amber-200 bg-amber-50/50 text-amber-850 hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-250 dark:hover:bg-amber-950/30'
                                            : 'border-sky-200 bg-sky-50/50 text-sky-850 hover:bg-sky-50 dark:border-sky-900/30 dark:bg-sky-950/20 dark:text-sky-250 dark:hover:bg-sky-950/30';

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => item.href?.startsWith('lainnya:') ? onOpenMoreSection(item.href.split(':')[1] as PortalMoreSection) : onOpenTab((item.href as PortalPrimaryTab) || 'beranda')}
                                            className={`w-full rounded-2xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm flex items-start gap-2.5 ${toneClass}`}
                                        >
                                            <span className="text-base select-none mt-0.5">⚠️</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs uppercase tracking-wider opacity-75">{item.severity === 'critical' ? 'Penting Sekali' : 'Pemberitahuan'}</p>
                                                <p className="font-semibold text-sm leading-relaxed mt-0.5">{item.title}</p>
                                                <p className="text-xs opacity-90 leading-relaxed mt-0.5">{item.description}</p>
                                            </div>
                                            {item.badge && (
                                                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xxs font-bold dark:bg-black/20 self-center">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* B. School Announcements (Pengumuman Sekolah) */}
                    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                            <BellIcon className="h-5 w-5 text-amber-500 animate-pulse" />
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Pengumuman Sekolah</h4>
                        </div>
                        
                        <div className="mt-4 space-y-3.5">
                            {recentAnnouncements.length === 0 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">Belum ada pengumuman baru dari sekolah.</p>
                            ) : (
                                recentAnnouncements.map((announcement) => (
                                    <div key={announcement.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 hover:-translate-y-0.5 transition-transform duration-300">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">{announcement.title}</p>
                                            {announcement.date && (
                                                <span className="text-xxs font-medium text-slate-400 whitespace-nowrap">{dateFormatter.format(new Date(announcement.date))}</span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{announcement.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* C. Recent Activities (Riwayat Aktivitas) */}
                    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Aktivitas Terbaru Siswa</h4>
                            <button
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-800 transition-all"
                                onClick={onDownloadPdf}
                            >
                                📥 Ekspor PDF
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                            {recentActivities.length === 0 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">Belum ada aktivitas tercatat.</p>
                            ) : (
                                recentActivities.map((activity) => (
                                    <div key={activity.id} className="relative pl-9 group">
                                        {/* Activity dot indicator */}
                                        <span className="absolute left-3.5 top-2.5 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900 transition-transform duration-300 group-hover:scale-125 shadow-sm shadow-indigo-500/25" />
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{activity.title}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{activity.description}</p>
                                            <p className="mt-2 text-xxs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                {dateFormatter.format(new Date(activity.createdAt))}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
