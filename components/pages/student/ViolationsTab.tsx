import React from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, ShieldAlertIcon, PencilIcon, TrashIcon } from '../../Icons';
import { ViolationRow } from './types';

interface ViolationsTabProps {
    violations: ViolationRow[];
    onAdd: () => void;
    onEdit: (record: ViolationRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
}

export const ViolationsTab: React.FC<ViolationsTabProps> = ({ violations, onAdd, onEdit, onDelete, isOnline }) => {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div><CardTitle>Riwayat Pelanggaran</CardTitle><CardDescription>Semua catatan pelanggaran tata tertib sekolah.</CardDescription></div>
                <Button onClick={onAdd} disabled={!isOnline}><PlusIcon className="w-4 h-4 mr-2" />Tambah Pelanggaran</Button>
            </div>
            {violations.length > 0 ? (
                <div className="space-y-3">
                    {[...violations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(v => (
                        <div key={v.id} className="group flex items-center gap-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{v.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(v.date).toLocaleDateString('id-ID')} - <span className="font-bold text-red-600 dark:text-red-400">{v.points} poin</span></p>
                            </div>
                            <div className="ml-auto flex opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(v)} disabled={!isOnline}><PencilIcon className="h-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 dark:text-red-400" onClick={() => onDelete(v.id)} disabled={!isOnline}><TrashIcon className="h-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400">
                    <ShieldAlertIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h4 className="font-semibold">Tidak Ada Pelanggaran</h4>
                    <p>Siswa ini memiliki catatan perilaku yang bersih.</p>
                </div>
            )}
        </div>
    );
};
