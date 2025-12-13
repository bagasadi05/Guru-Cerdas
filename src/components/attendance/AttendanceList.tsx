import React from 'react';
import { StudentRow, AttendanceRecord, AttendanceStatus } from '../../types';
import { statusOptions } from '../../constants';
import { InfoIcon, PencilIcon, Share2Icon } from '../Icons';
import { createWhatsAppLink, generateAttendanceMessage } from '../../utils/whatsappUtils';

interface AttendanceListProps {
    students: StudentRow[];
    attendanceRecords: Record<string, AttendanceRecord>;
    onStatusChange: (studentId: string, status: AttendanceStatus) => void;
    onNoteClick: (studentId: string, currentNote: string) => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ students, attendanceRecords, onStatusChange, onNoteClick }) => {
    return (
        <div className="space-y-3">
            {students.map((student, index) => {
                const record = attendanceRecords[student.id];

                return (
                    <div
                        key={student.id}
                        className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 card-interactive animate-list-item`}
                        style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                    >
                        {/* Student Info */}
                        <div className="flex items-center gap-4 flex-grow min-w-0">
                            <span className="text-slate-300 dark:text-slate-600 font-bold font-mono w-8 text-right flex-shrink-0 text-sm">{index + 1}</span>
                            <div className="relative">
                                <img src={student.avatar_url} alt={student.name} className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                                {record?.status && (() => {
                                    const statusOpt = statusOptions.find(opt => opt.value === record.status);
                                    if (!statusOpt) return null;
                                    return (
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-[10px] font-bold
                                            ${statusOpt.value === 'Hadir' ? 'bg-emerald-500' :
                                                statusOpt.value === 'Sakit' ? 'bg-sky-500' :
                                                    statusOpt.value === 'Izin' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        >
                                            <statusOpt.icon className="w-3 h-3" />
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-semibold text-base text-slate-800 dark:text-white truncate">{student.name}</h4>
                                {record?.note ? (
                                    <p className="text-xs text-indigo-500 font-medium truncate flex items-center gap-1 mt-0.5 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md w-fit">
                                        <InfoIcon className="w-3 h-3" /> {record.note}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                        {record?.status ? `Status: ${record.status}` : 'Belum diabsen'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
                                {statusOptions.map((opt) => {
                                    const isActive = record?.status === opt.value;

                                    let activeClass = "";
                                    if (isActive) {
                                        if (opt.value === AttendanceStatus.Hadir) activeClass = "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5";
                                        else if (opt.value === AttendanceStatus.Sakit) activeClass = "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm ring-1 ring-black/5";
                                        else if (opt.value === AttendanceStatus.Izin) activeClass = "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-black/5";
                                        else if (opt.value === AttendanceStatus.Alpha) activeClass = "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-black/5";
                                    } else {
                                        activeClass = "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5";
                                    }

                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => onStatusChange(student.id, opt.value)}
                                            className={`
                                                flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                                                ${activeClass}
                                            `}
                                            title={opt.label}
                                        >
                                            <opt.icon className={`w-5 h-5`} />
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => onNoteClick(student.id, record?.note || '')}
                                className={`
                                    w-10 h-10 flex items-center justify-center rounded-xl transition-all ml-1 border border-transparent
                                    ${record?.note
                                        ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                        : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }
                                `}
                                title="Catatan"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <a
                                href={createWhatsAppLink(student.parent_phone || '', generateAttendanceMessage(student.name, record?.status || 'Belum Diabsen', new Date().toLocaleDateString('id-ID')))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all ml-1 border border-transparent text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                                title="Kirim via WhatsApp"
                            >
                                <Share2Icon className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
