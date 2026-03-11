import React from 'react';
import { ClockIcon } from '../../Icons';
import type { AttendanceSummary, PortalAttendance } from './types';

interface PortalAttendanceTabProps {
    attendance: PortalAttendance[];
    summary: AttendanceSummary;
}

export const PortalAttendanceTab: React.FC<PortalAttendanceTabProps> = ({ attendance, summary }) => {
    return (
        <div className="space-y-6 p-4 sm:p-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Kehadiran</h3>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                        <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-300">Hadir</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200">{summary.present}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/30">
                        <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-300">Izin</p>
                        <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-200">{summary.permission}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-950/30">
                        <p className="text-xs font-bold uppercase text-sky-600 dark:text-sky-300">Sakit</p>
                        <p className="mt-2 text-2xl font-bold text-sky-700 dark:text-sky-200">{summary.sick}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-950/30">
                        <p className="text-xs font-bold uppercase text-rose-600 dark:text-rose-300">Alpha</p>
                        <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-200">{summary.absent}</p>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Riwayat Kehadiran</h4>
                <div className="mt-5 space-y-3">
                    {attendance.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data kehadiran untuk semester ini.</p>
                    ) : attendance.map((record) => {
                        const toneClass = record.status === 'Hadir'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : record.status === 'Sakit'
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                : record.status === 'Izin'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';

                        return (
                            <div key={record.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white">{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{record.notes || 'Tidak ada catatan tambahan.'}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>{record.status}</span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};
