import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PlusIcon, BarChartIcon, PencilIcon, TrashIcon } from '../../Icons';
import { AcademicRecordRow } from './types';

interface GradesTabProps {
    records: AcademicRecordRow[];
    onAdd: () => void;
    onEdit: (record: AcademicRecordRow) => void;
    onDelete: (id: string) => void;
    isOnline: boolean;
}

const GradesPanel: React.FC<{ records: AcademicRecordRow[], onEdit: (record: AcademicRecordRow) => void, onDelete: (recordId: string) => void, isOnline: boolean }> = ({ records, onEdit, onDelete, isOnline }) => {
    const recordsBySubject = useMemo(() => {
        if (!records || records.length === 0) return {};
        return records.reduce((acc, record) => {
            const subject = record.subject || 'Tanpa Mapel';
            if (!acc[subject]) {
                acc[subject] = [];
            }
            acc[subject].push(record);
            return acc;
        }, {} as Record<string, AcademicRecordRow[]>);
    }, [records]);

    const subjects = Object.keys(recordsBySubject).sort();

    if (subjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <BarChartIcon className="w-16 h-16 mb-4 text-gray-600" />
                <h4 className="text-lg font-semibold">Tidak Ada Data Nilai Mata Pelajaran</h4>
                <p className="text-sm">Nilai yang Anda tambahkan akan muncul di sini.</p>
            </div>
        );
    }

    const getScoreColorClasses = (score: number) => {
        if (score >= 85) return { border: 'border-green-600/50', text: 'text-green-400' };
        if (score >= 70) return { border: 'border-yellow-600/50', text: 'text-yellow-400' };
        return { border: 'border-red-600/50', text: 'text-red-400' };
    };

    return (
        <div className="space-y-6">
            {subjects.map((subject) => {
                const subjectRecords = [...recordsBySubject[subject]].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const averageScore = subjectRecords.length > 0 ? Math.round(subjectRecords.reduce((sum, r) => sum + r.score, 0) / subjectRecords.length) : 0;

                return (
                    <Card key={subject} className="bg-gray-50 dark:bg-black/20">
                        <CardHeader className="border-b border-gray-200 dark:border-white/10">
                            <div className="flex justify-between items-center">
                                <CardTitle>{subject}</CardTitle>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageScore}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Rata-rata</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="divide-y divide-gray-200 dark:divide-white/10 p-0">
                            {subjectRecords.map((record) => {
                                const colors = getScoreColorClasses(record.score);
                                return (
                                    <div key={record.id} className="group relative p-4 hover:bg-gray-100 dark:hover:bg-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border-2 ${colors.border} ${colors.text} shadow-inner`}>
                                                {record.score}
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="font-bold text-base text-gray-900 dark:text-white">{record.assessment_name || 'Penilaian'}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    {new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                {record.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">"{record.notes}"</p>}
                                            </div>
                                        </div>
                                        <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 bg-gray-200 dark:bg-black/30 backdrop-blur-sm" onClick={() => onEdit(record)} aria-label="Edit Catatan Akademik" disabled={!isOnline}><PencilIcon className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 bg-gray-200 dark:bg-black/30 backdrop-blur-sm" onClick={() => onDelete(record.id)} aria-label="Hapus Catatan Akademik" disabled={!isOnline}><TrashIcon className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export const GradesTab: React.FC<GradesTabProps> = ({ records, onAdd, onEdit, onDelete, isOnline }) => {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div><CardTitle>Nilai Akademik</CardTitle><CardDescription>Daftar nilai sumatif atau formatif yang telah diinput.</CardDescription></div>
                <Button onClick={onAdd} disabled={!isOnline}><PlusIcon className="w-4 h-4 mr-2" />Tambah Nilai</Button>
            </div>
            <GradesPanel records={records} onEdit={onEdit} onDelete={onDelete} isOnline={isOnline} />
        </div>
    );
};
