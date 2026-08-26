import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Card } from '../../../ui/Card';

interface MentoringLog {
    id: string;
    date: string;
    notes: string;
    mentor_role: string;
    students?: { name: string } | null;
}

interface PembinaanTabProps {
    mentoringLogs: MentoringLog[];
    isWalas: boolean;
    onOpenMentoringModal: () => void;
    onOpenEditMentoring: (log: MentoringLog) => void;
    onDeleteMentoring: (log: MentoringLog) => void;
}

export const PembinaanTab: React.FC<PembinaanTabProps> = ({
    mentoringLogs,
    isWalas,
    onOpenMentoringModal,
    onOpenEditMentoring,
    onDeleteMentoring,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return mentoringLogs;
        const q = searchQuery.toLowerCase();
        return mentoringLogs.filter(log => {
            const studentName = log.students?.name?.toLowerCase() || '';
            const notes = log.notes?.toLowerCase() || '';
            return studentName.includes(q) || notes.includes(q);
        });
    }, [mentoringLogs, searchQuery]);

    return (
        <div className="space-y-4">
            {/* Header + Add Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-white">Riwayat Pembinaan</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{mentoringLogs.length} catatan tersimpan</p>
                </div>
                {isWalas && (
                    <Button
                        onClick={onOpenMentoringModal}
                        className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white flex items-center gap-1.5 text-sm h-10 px-4 font-medium rounded-xl shadow-sm shadow-brand-600/20"
                    >
                        <Plus size={16} /> Catat Pembinaan
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <Input
                    placeholder="Cari siswa atau catatan..."
                    className="pl-9 w-full text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                        <ClipboardCheck size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {searchQuery.trim() ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan pembinaan.'}
                        </p>
                        {isWalas && (
                            <Button
                                onClick={onOpenMentoringModal}
                                variant="outline"
                                className="mt-4 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800/60"
                            >
                                <Plus size={14} className="mr-1.5" /> Catat Pembinaan Pertama
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80">
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Tanggal</th>
                                    <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Siswa</th>
                                    <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Mentor</th>
                                    <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">Catatan</th>
                                    <th className="py-2.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {new Date(log.date).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                            {log.students?.name || '-'}
                                        </td>
                                        <td className="py-2.5 px-4 text-xs">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                                                {log.mentor_role}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-[300px] truncate" title={log.notes}>
                                            {log.notes}
                                        </td>
                                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenEditMentoring(log)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                                                    title="Edit"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteMentoring(log)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
