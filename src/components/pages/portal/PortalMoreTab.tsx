import React from 'react';
import { BookOpenIcon, CalendarIcon, ClockIcon, DownloadIcon, SettingsIcon, ShieldAlertIcon } from '../../Icons';
import type {
    PortalMoreSection,
    PortalReport,
    PortalSchedule,
    PortalSchoolInfo,
    PortalTask,
    PortalViolation,
} from './types';

interface PortalMoreTabProps {
    activeSection: PortalMoreSection;
    onSectionChange: (section: PortalMoreSection) => void;
    tasks: PortalTask[];
    schedules: PortalSchedule[];
    violations: PortalViolation[];
    reports: PortalReport[];
    schoolInfo: PortalSchoolInfo;
    onDownloadPdf: () => void;
    onOpenSettings: () => void;
}

const sections: PortalMoreSection[] = ['tugas', 'jadwal', 'perilaku', 'dokumen', 'pengaturan'];

const sectionLabels: Record<PortalMoreSection, string> = {
    tugas: 'Tugas',
    jadwal: 'Jadwal',
    perilaku: 'Perilaku',
    dokumen: 'Dokumen',
    pengaturan: 'Pengaturan',
};

export const PortalMoreTab: React.FC<PortalMoreTabProps> = ({
    activeSection,
    onSectionChange,
    tasks,
    schedules,
    violations,
    reports,
    schoolInfo,
    onDownloadPdf,
    onOpenSettings,
}) => {
    return (
        <div className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                    <button
                        key={section}
                        className={`rounded-lg px-4 py-2 text-sm font-medium ${activeSection === section ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                        onClick={() => onSectionChange(section)}
                    >
                        {sectionLabels[section]}
                    </button>
                ))}
            </div>

            {activeSection === 'tugas' && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center gap-2">
                        <BookOpenIcon className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tugas Siswa</h3>
                    </div>
                    <div className="mt-5 space-y-4">
                        {tasks.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada tugas aktif saat ini.</p>
                        ) : tasks.map((task) => (
                            <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{task.description || 'Tidak ada deskripsi detail.'}</p>
                                    </div>
                                    {task.due_date && (
                                        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                            <ClockIcon className="h-4 w-4" />
                                            {new Date(task.due_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {activeSection === 'jadwal' && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Jadwal Pelajaran</h3>
                    </div>
                    <div className="mt-5 space-y-4">
                        {schedules.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada jadwal pelajaran.</p>
                        ) : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => {
                            const daySchedules = schedules.filter((schedule) => schedule.day === day);
                            if (daySchedules.length === 0) return null;
                            return (
                                <div key={day} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-900 dark:bg-slate-800/70 dark:text-white">{day}</div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {daySchedules.map((schedule) => (
                                            <div key={schedule.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{schedule.subject}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {activeSection === 'perilaku' && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center gap-2">
                        <ShieldAlertIcon className="h-5 w-5 text-rose-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Perilaku</h3>
                    </div>
                    <div className="mt-5 space-y-3">
                        {violations.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada catatan perilaku pada semester ini.</p>
                        ) : violations.map((violation) => (
                            <div key={violation.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{violation.type}</p>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{violation.description || 'Tidak ada deskripsi tambahan.'}</p>
                                    </div>
                                    <div className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-rose-700 dark:bg-black/20 dark:text-rose-300">+{violation.points}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {activeSection === 'dokumen' && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Dokumen</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sekolah: {schoolInfo.school_name}</p>
                        </div>
                        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={onDownloadPdf}><DownloadIcon className="mr-2 inline-block h-4 w-4" />Unduh PDF</button>
                    </div>
                    <div className="mt-5 space-y-3">
                        {reports.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada dokumen yang dibagikan.</p>
                        ) : reports.map((report) => (
                            <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                <p className="font-semibold text-slate-900 dark:text-white">{report.title}</p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{report.type}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {activeSection === 'pengaturan' && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pengaturan</h3>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Kelola data orang tua, preferensi kontak, dan akses dokumen dari satu tempat.</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={onOpenSettings}>Buka Pengaturan</button>
                        <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={onDownloadPdf}>Unduh PDF</button>
                    </div>
                </section>
            )}
        </div>
    );
};

