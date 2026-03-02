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
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ students, attendanceRecords, selectedDate, onStatusChange, onNoteClick }) => {
    const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="space-y-3">
            {students.map((student, index) => {
                const record = attendanceRecords[student.id];

                return (
                    <div
                        key={student.id}
                        id={`student-${student.id}`}
                        className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all duration-300 card-interactive animate-list-item`}
                        style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                    >
                        {/* Student Info */}
                        <div className="flex items-center gap-4 flex-grow min-w-0">
                            <span className="text-slate-300 dark:text-slate-600 font-bold font-mono w-8 text-right flex-shrink-0 text-sm">{index + 1}</span>
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
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-[10px] font-bold
                                            ${statusOpt.value === 'Hadir' ? 'bg-emerald-500' :
                                                statusOpt.value === 'Sakit' ? 'bg-sky-500' :
                                                    statusOpt.value === 'Izin' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        >
                                            <statusOpt.icon className="w-3.5 h-3.5" />
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-semibold text-[15px] leading-snug text-slate-800 dark:text-white line-clamp-2">
                                    {student.name}
                                </h4>
                                {record?.note ? (
                                    <p className="text-xs text-green-600 font-medium truncate flex items-center gap-1 mt-0.5 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md w-fit">
                                        <InfoIcon className="w-3 h-3" /> {record.note}
                                    </p>
                                ) : (
                                    record?.status ? (
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                                            Status: <span className="font-medium text-slate-700 dark:text-slate-200">{record.status}</span>
                                        </p>
                                    ) : (
                                        <p className="text-[13px] font-medium text-amber-500 dark:text-amber-400 truncate">
                                            Belum diabsen
                                        </p>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="grid grid-cols-5 sm:flex sm:flex-nowrap sm:items-center gap-2 bg-slate-100/80 dark:bg-slate-800/60 p-2 rounded-2xl w-full sm:w-auto">
                                {statusOptions.map((opt) => {
                                    const isActive = record?.status === opt.value;

                                    let activeClass = "";
                                    if (isActive) {
                                        if (opt.value === AttendanceStatus.Hadir) activeClass = "bg-emerald-500 text-white shadow-md shadow-emerald-500/30";
                                        else if (opt.value === AttendanceStatus.Sakit) activeClass = "bg-sky-500 text-white shadow-md shadow-sky-500/30";
                                        else if (opt.value === AttendanceStatus.Izin) activeClass = "bg-amber-500 text-white shadow-md shadow-amber-500/30";
                                        else if (opt.value === AttendanceStatus.Alpha) activeClass = "bg-rose-500 text-white shadow-md shadow-rose-500/30";
                                        else if (opt.value === AttendanceStatus.Libur) activeClass = "bg-purple-500 text-white shadow-md shadow-purple-500/30";
                                    } else {
                                        activeClass = "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5";
                                    }

                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => onStatusChange(student.id, opt.value)}
                                            className={`
                                                flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200
                                                ${activeClass}
                                            `}
                                            title={opt.label}
                                            aria-pressed={isActive}
                                        >
                                            <opt.icon className="w-5 h-5" />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-end sm:justify-start gap-2">
                                <button
                                    onClick={() => onNoteClick(student.id, record?.note || '')}
                                    className={`
                                        w-11 h-11 flex items-center justify-center rounded-lg transition-all border border-transparent
                                        ${record?.note
                                            ? 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : 'text-slate-400 hover:text-green-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }
                                    `}
                                    title="Catatan"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <a
                                    href={createWhatsAppLink(student.parent_phone || '', generateAttendanceMessage(student.name, record?.status || 'Belum Diabsen', formattedDate))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-11 h-11 flex items-center justify-center rounded-lg transition-all border border-transparent text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    title="Kirim via WhatsApp"
                                >
                                    <Share2Icon className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
