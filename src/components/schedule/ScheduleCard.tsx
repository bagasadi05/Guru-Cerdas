import React, { useMemo } from 'react';
import { ScheduleRow } from '../../types';
import { formatTimeRange, getColorForSubject } from '../../utils/scheduleUtils';
import { ClockIcon, UsersIcon, BookOpenIcon, EditIcon, CopyIcon, TrashIcon, MoreVerticalIcon } from '../Icons';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';

export interface ScheduleCardProps {
    item: ScheduleRow;
    isOngoing: boolean;
    isPast: boolean;
    onEdit: (item: ScheduleRow) => void;
    onDuplicate: (item: ScheduleRow) => void;
    onDelete: (item: ScheduleRow) => void;
    getDuration: (start: string, end: string) => number;
    onIsiJurnal?: (item: ScheduleRow) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ item, isOngoing, isPast, onEdit, onDuplicate, onDelete, getDuration, onIsiJurnal }) => {
    const colorClass = useMemo(() => getColorForSubject(item.subject), [item.subject]);

    return (
        <div
            className={`
            group relative overflow-hidden rounded-2xl transition-all duration-200
            bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md
            ${isOngoing ? 'ring-1 ring-green-500/50' : ''}
            flex flex-col border-l-4 ${colorClass}
        `}
        >
            <div className="p-3 sm:p-4 flex flex-col h-full gap-3">
                {/* Top Row: Time & Menu */}
                <div className="flex justify-between items-start">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-300">
                            {formatTimeRange(item.start_time, item.end_time)}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownTrigger className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors">
                            <MoreVerticalIcon className="w-4 h-4" />
                        </DropdownTrigger>
                        <DropdownContent>
                            <DropdownItem icon={<EditIcon className="w-4 h-4" />} onClick={() => onEdit(item)}>Edit</DropdownItem>
                            <DropdownItem icon={<CopyIcon className="w-4 h-4" />} onClick={() => onDuplicate(item)}>Duplikat</DropdownItem>
                            <DropdownItem icon={<TrashIcon className="w-4 h-4 text-red-500" />} onClick={() => onDelete(item)} className="text-red-400">Hapus</DropdownItem>
                        </DropdownContent>
                    </DropdownMenu>
                </div>

                {/* Subject & Class */}
                <div className="mb-auto space-y-1 min-h-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
                        {item.subject}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <UsersIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Kelas {item.class_id}</span>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOngoing ? 'bg-green-500 animate-pulse' : isPast ? 'bg-slate-400 dark:bg-slate-600' : 'bg-emerald-500'}`}></div>
                        <span className={`text-xxs font-medium ${isOngoing ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {isOngoing ? 'Berlangsung' : isPast ? 'Selesai' : 'Nanti'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xxs font-mono text-slate-400 dark:text-slate-600">
                            {getDuration(item.start_time, item.end_time)}m
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                onIsiJurnal?.(item);
                            }}
                            className="text-xxs px-2 py-0.5 h-6 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg flex items-center gap-1 shrink-0"
                        >
                            <BookOpenIcon className="w-2.5 h-2.5 text-emerald-500" />
                            Isi Jurnal
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
