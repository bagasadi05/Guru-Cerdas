import React from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, TrendingUpIcon, CheckCircleIcon, PencilIcon, TrashIcon } from '../../Icons';
import { QuizPointRow } from './types';

interface ActivityTabProps {
    quizPoints: QuizPointRow[];
    onAdd: () => void;
    onEdit: (record: QuizPointRow) => void;
    onDelete: (id: number) => void;
    onApplyPoints: () => void;
    isOnline: boolean;
}

const ActivityPointsHistory: React.FC<{ records: QuizPointRow[], onEdit: (record: QuizPointRow) => void, onDelete: (recordId: number) => void, isOnline: boolean }> = ({ records, onEdit, onDelete, isOnline }) => {
    if (!records || records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <CheckCircleIcon className="w-16 h-16 mb-4 text-gray-600" />
                <h4 className="text-lg font-semibold">Tidak Ada Poin Keaktifan</h4>
                <p className="text-sm">Poin yang Anda tambahkan akan muncul di sini.</p>
            </div>
        );
    }

    const sortedRecords = [...records].sort((a, b) => new Date(b.quiz_date).getTime() - new Date(a.quiz_date).getTime());

    return (
        <div className="space-y-3">
            {sortedRecords.map((record) => (
                <div key={record.id} className="group flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 transition-all">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200">
                        +1
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-900 dark:text-white">{record.quiz_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {record.subject} &middot; {new Date(record.quiz_date).toLocaleDateString('id-ID')}
                        </p>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(record)} aria-label="Edit Poin" disabled={!isOnline}><PencilIcon className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-400" onClick={() => onDelete(record.id)} aria-label="Hapus Poin" disabled={!isOnline}><TrashIcon className="h-4 w-4" /></Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const ActivityTab: React.FC<ActivityTabProps> = ({ quizPoints, onAdd, onEdit, onDelete, onApplyPoints, isOnline }) => {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div><CardTitle>Poin Keaktifan Kelas</CardTitle><CardDescription>Catatan poin untuk keaktifan siswa saat pelajaran.</CardDescription></div>
                <Button onClick={onAdd} disabled={!isOnline}><PlusIcon className="w-4 h-4 mr-2" />Tambah Poin</Button>
            </div>
            {quizPoints.length > 0 && (
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-between animate-fade-in">
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">Total {quizPoints.length} Poin Tersedia</p>
                        <p className="text-sm text-purple-600 dark:text-purple-300">Gunakan poin ini untuk menambah nilai akhir mata pelajaran.</p>
                    </div>
                    <Button onClick={onApplyPoints} variant="outline" className="bg-white/50 dark:bg-white/10 border-purple-200 dark:border-purple-400/50 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white">
                        <TrendingUpIcon className="w-4 h-4 mr-2" /> Gunakan Poin
                    </Button>
                </div>
            )}
            <ActivityPointsHistory records={quizPoints} onEdit={onEdit} onDelete={onDelete} isOnline={isOnline} />
        </div>
    );
};
