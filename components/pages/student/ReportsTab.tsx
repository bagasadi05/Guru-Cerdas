import React from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, BookOpenIcon, PencilIcon, TrashIcon } from '../../Icons';
import { ReportRow } from './types';

interface ReportsTabProps {
    reports: ReportRow[];
    onAdd: () => void;
    onEdit: (record: ReportRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ reports, onAdd, onEdit, onDelete, isOnline }) => {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div><CardTitle>Catatan Guru</CardTitle><CardDescription>Catatan perkembangan, laporan, atau insiden khusus.</CardDescription></div>
                <Button onClick={onAdd} disabled={!isOnline}><PlusIcon className="w-4 h-4 mr-2" />Tambah Catatan</Button>
            </div>
            {reports.length > 0 ? (
                <div className="space-y-3">
                    {[...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                        <div key={r.id} className="group relative p-4 rounded-lg bg-gray-50 dark:bg-black/20">
                            <div className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(r)} disabled={!isOnline}><PencilIcon className="h-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={() => onDelete(r.id)} disabled={!isOnline}><TrashIcon className="h-4 h-4" /></Button>
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{r.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{new Date(r.date).toLocaleDateString('id-ID')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{r.notes}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400">
                    <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h4 className="font-semibold">Tidak Ada Catatan</h4>
                    <p>Belum ada catatan guru untuk siswa ini.</p>
                </div>
            )}
        </div>
    );
};
