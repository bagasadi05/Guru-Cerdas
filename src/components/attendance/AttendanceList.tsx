import React from 'react';
import { StudentRow, AttendanceRecord, AttendanceStatus } from '../../types';
import { statusOptions } from '../../constants';
import { InfoIcon, PencilIcon, Share2Icon } from '../Icons';
import { createWhatsAppLink, generateAttendanceMessage } from '../../utils/whatsappUtils';
import { getStudentAvatar } from '../../utils/avatarUtils';

interface AttendanceListProps {
    students: StudentRow[];
    attendanceRecords: Record<string, AttendanceRecord>;
    selectedDate: string;
    onStatusChange: (studentId: string, status: AttendanceStatus) => void;
    onNoteClick: (studentId: string, currentNote: string) => void;
    highlightedStudentId?: string | null;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ students, attendanceRecords, selectedDate, onStatusChange, onNoteClick, highlightedStudentId }) => {
    const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="space-y-2 lg:space-y-3">
            {students.map((student, index) => {
                const record = attendanceRecords[student.id];

                return (
                    <div
                        key={student.id}
                        id={`student-${student.id}`}
                        className={`
                            attendance-student-card group flex flex-col p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/60 sm:backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                            sm:hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] sm:hover:border-emerald-500/20 dark:sm:hover:border-emerald-500/30 sm:hover:-translate-y-0.5
                            transition-colors sm:transition-all duration-200 card-interactive
                            ${highlightedStudentId === student.id ? 'ring-2 ring-emerald-500' : ''}
                        `}
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '220px' }}
                    >
                        {/* 1. Student Info (Top Row) */}
                        <div className="flex items-center gap-4 min-w-0">
                            <span className="hidden lg:block text-slate-300 dark:text-slate-600 font-bold font-mono w-8 text-right flex-shrink-0 text-sm">{index + 1}</span>
                            <div className="relative">
                                <img
                                    src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name)}
                                    alt={student.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm"
                                />
                                {record?.status && (() => {
                                    const statusOpt = statusOptions.find(opt => opt.value === record.status);
                                    if (!statusOpt) return null;
                                    return (
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xxs font-bold
                                            ${statusOpt.value === 'Hadir' ? 'bg-emerald-500' :
                                                statusOpt.value === 'Sakit' ? 'bg-sky-500' :
                                                    statusOpt.value === 'Izin' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        >
                                            <statusOpt.icon className="w-3.5 h-3.5" />
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-sm lg:text-base leading-snug text-slate-800 dark:text-white line-clamp-2 uppercase tracking-wide">
                                    {student.name}
                                </h4>
                                {record?.note ? (
                                    <p className="text-xs text-emerald-600 font-medium truncate flex items-center gap-1 mt-0.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md w-fit">
                                        <InfoIcon className="w-3 h-3" /> {record.note}
                                    </p>
                                ) : (
                                    record?.status ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            Status: <span className="font-semibold text-slate-700 dark:text-slate-200">{record.status}</span>
                                        </p>
                                    ) : (
                                        <p className="text-sm font-semibold text-amber-500 dark:text-amber-400 truncate mt-0.5">
                                            Belum diabsen
                                        </p>
                                    )
                                )}
                            </div>
                        </div>

                        {/* 2. Attendance Buttons (Middle Row) */}
                        <div className="mt-4 sm:mt-5 mb-4 bg-slate-100/50 dark:bg-slate-800/40 backdrop-blur-sm p-2 sm:p-3 rounded-2xl border border-white/60 dark:border-slate-700/50 shadow-inner overflow-x-auto hide-scrollbar">
                            <div className="flex sm:grid sm:grid-cols-5 gap-1.5 lg:gap-2 min-w-max sm:min-w-0 w-full" data-tutorial="attendance-status-group">
                                {statusOptions.map((opt) => {
                                    const isActive = record?.status === opt.value;
                                    const initial = opt.value.charAt(0).toUpperCase();

                                    let circleClass = "";
                                    let textClass = "";

                                    if (isActive) {
                                        if (opt.value === AttendanceStatus.Hadir) {
                                            circleClass = "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800";
                                        } else if (opt.value === AttendanceStatus.Sakit) {
                                            circleClass = "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800";
                                        } else if (opt.value === AttendanceStatus.Izin) {
                                            circleClass = "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800";
                                        } else if (opt.value === AttendanceStatus.Alpha) {
                                            circleClass = "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800";
                                        } else if (opt.value === AttendanceStatus.Libur) {
                                            circleClass = "bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800";
                                        }
                                        textClass = "text-slate-800 dark:text-white font-bold";
                                    } else {
                                        circleClass = "bg-white/50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 group-hover/btn:border-indigo-300 dark:group-hover/btn:border-indigo-500 shadow-sm transition-all";
                                        textClass = "text-slate-500 dark:text-slate-400 font-medium group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400";
                                    }

                                    return (
                                        <button type="button"
                                            key={opt.value}
                                            onClick={() => onStatusChange(student.id, opt.value)}
                                            className="group/btn flex-1 sm:flex-none flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl outline-none min-w-[48px] min-h-[44px]"
                                            title={opt.label}
                                            aria-label={opt.label}
                                            aria-pressed={isActive}
                                        >
                                            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${circleClass}`}>
                                                <span className="text-xs lg:text-sm font-bold">{initial}</span>
                                            </div>
                                            <span className={`text-[10px] lg:text-xs transition-colors ${textClass}`}>
                                                {opt.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Action Buttons (Bottom Row) */}
                        <div className="flex items-center justify-end gap-2">
                            <button type="button"
                                onClick={() => onNoteClick(student.id, record?.note || '')}
                                className={`
                                    w-10 h-10 flex items-center justify-center rounded-xl transition-all
                                    ${record?.note
                                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }
                                `}
                                title={record?.note ? 'Edit catatan' : 'Tambah catatan'}
                                aria-label={record?.note ? 'Edit catatan siswa' : 'Tambah catatan siswa'}
                            >
                                <PencilIcon className="w-4 h-4" aria-hidden="true" />
                                <span className="sr-only">{record?.note ? 'Edit catatan' : 'Tambah catatan'}</span>
                            </button>
                            {(() => {
                                const hasValidPhone = !!(student.parent_phone && student.parent_phone.trim().replace(/\D/g, '').length >= 8);
                                return hasValidPhone ? (
                                    <a
                                        href={createWhatsAppLink(student.parent_phone!, generateAttendanceMessage(student.name, record?.status || 'Belum Diabsen', formattedDate))}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                        title="Kirim notifikasi via WhatsApp"
                                        aria-label={`Kirim notifikasi kehadiran ${student.name} via WhatsApp`}
                                    >
                                        <Share2Icon className="w-4 h-4" aria-hidden="true" />
                                    </a>
                                ) : (
                                    <button type="button"
                                        disabled
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                                        title="Nomor WhatsApp orang tua belum diisi"
                                        aria-label="Kirim via WhatsApp (nomor orang tua tidak tersedia)"
                                    >
                                        <Share2Icon className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
