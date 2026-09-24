import React from 'react';
import { XIcon } from 'lucide-react';
import { statusOptions } from '../../constants';

interface AttendanceBatchActionBarProps {
    selectedStudents: Set<string>;
    setSelectedStudents: (students: Set<string>) => void;
    handleBatchStatusChange: (status: string) => void;
}

export const AttendanceBatchActionBar: React.FC<AttendanceBatchActionBarProps> = ({
    selectedStudents,
    setSelectedStudents,
    handleBatchStatusChange,
}) => {
    if (selectedStudents.size === 0) return null;

    return (
        <div className="mb-4 p-3 bg-brand-600 rounded-2xl shadow-lg border border-brand-500/30 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-white flex-shrink-0">
                <span className="font-bold text-sm">{selectedStudents.size} siswa dipilih</span>
                <button
                    type="button"
                    onClick={() => setSelectedStudents(new Set())}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
                    aria-label="Batal pilih semua"
                >
                    <XIcon className="w-5 h-5 text-white" />
                </button>
            </div>
            <div className="flex-1 flex flex-wrap gap-1.5">
                {statusOptions.map((opt) => {
                    let btnStyle = 'bg-white/20 hover:bg-white/30 text-white border border-white/20';
                    if (opt.value === 'Hadir') btnStyle = 'bg-white text-emerald-700 hover:bg-emerald-50 font-bold shadow-sm';
                    else if (opt.value === 'Sakit') btnStyle = 'bg-white/20 hover:bg-white/30 text-white border border-white/20';
                    else if (opt.value === 'Izin') btnStyle = 'bg-white/20 hover:bg-white/30 text-white border border-white/20';
                    else if (opt.value === 'Alpha') btnStyle = 'bg-white/20 hover:bg-white/30 text-white border border-white/20';
                    else if (opt.value === 'Libur') btnStyle = 'bg-white/20 hover:bg-white/30 text-white border border-white/20';

                    return (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => handleBatchStatusChange(opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600 ${btnStyle}`}
                        >
                            <opt.icon className="w-3.5 h-3.5" />
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
