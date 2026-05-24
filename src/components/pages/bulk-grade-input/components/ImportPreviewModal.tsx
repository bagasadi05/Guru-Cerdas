import React, { useState, useEffect } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Select } from '../../../ui/Select';
import { Input } from '../../../ui/Input';
import { CheckIcon, AlertTriangleIcon, XCircleIcon } from '../../../Icons';
import { findStudentMatch } from '../../../../utils/studentMatcher';

interface Student {
    id: string;
    name: string;
}

interface ParsedImportRow {
    name: string;
    score: string | number;
}

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    parsedData: ParsedImportRow[];
    students: Student[];
    onConfirm: (mappedScores: Record<string, string>) => void;
}

interface MappedRow {
    excelName: string;
    score: string;
    selectedStudentId: string;
    method: 'exact' | 'partial' | 'token' | 'none';
    confidence: number;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
    isOpen,
    onClose,
    parsedData,
    students,
    onConfirm,
}) => {
    const [rows, setRows] = useState<MappedRow[]>([]);

    useEffect(() => {
        if (!isOpen || !parsedData || !students) return;

        const initialRows = parsedData.map(row => {
            const match = findStudentMatch(row.name, students);
            return {
                excelName: row.name,
                score: row.score !== undefined && row.score !== null ? String(row.score) : '',
                selectedStudentId: match.studentId,
                method: match.method,
                confidence: match.confidence,
            };
        });
        setRows(initialRows);
    }, [parsedData, students, isOpen]);

    // Handle manual selection of student
    const handleStudentChange = (index: number, studentId: string) => {
        setRows(prev => {
            const next = [...prev];
            const student = students.find(s => s.id === studentId);
            if (student) {
                // If matched manually, determine if it is exact or manual
                const isExact = student.name.toLowerCase().trim() === next[index].excelName.toLowerCase().trim();
                next[index] = {
                    ...next[index],
                    selectedStudentId: studentId,
                    method: isExact ? 'exact' : 'partial',
                    confidence: isExact ? 100 : 90,
                };
            } else {
                next[index] = {
                    ...next[index],
                    selectedStudentId: '',
                    method: 'none',
                    confidence: 0,
                };
            }
            return next;
        });
    };

    // Handle manual change of score
    const handleScoreChange = (index: number, score: string) => {
        setRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], score };
            return next;
        });
    };

    // Calculate statistics
    const stats = rows.reduce((acc, row) => {
        if (row.method === 'exact') acc.exact++;
        else if (row.method === 'none') acc.unmatched++;
        else acc.fuzzy++;
        return acc;
    }, { exact: 0, fuzzy: 0, unmatched: 0 });

    const totalRows = rows.length;
    const canApply = rows.some(r => r.selectedStudentId !== '');

    const handleApply = () => {
        const mappedScores: Record<string, string> = {};
        rows.forEach(row => {
            if (row.selectedStudentId && row.score.trim() !== '') {
                const parsedVal = parseFloat(row.score);
                if (!isNaN(parsedVal)) {
                    // Round to 2 decimal places
                    const rounded = Math.round(parsedVal * 100) / 100;
                    mappedScores[row.selectedStudentId] = String(Math.min(100, Math.max(0, rounded)));
                }
            }
        });
        onConfirm(mappedScores);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Konfirmasi & Pratinjau Kecocokan Impor" maxWidth="max-w-4xl">
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Berikut adalah pratinjau hasil pembacaan berkas Excel Anda. Silakan verifikasi kecocokan nama dan nilai sebelum menerapkannya ke tabel utama.
                </p>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl text-center">
                        <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Total Baris</span>
                        <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{totalRows}</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl text-center">
                        <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">Cocok Sempurna</span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.exact}</span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl text-center">
                        <span className="block text-xs font-semibold text-amber-600 dark:text-amber-400">Kecocokan Fuzzy</span>
                        <span className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.fuzzy}</span>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-xl text-center">
                        <span className="block text-xs font-semibold text-rose-600 dark:text-rose-400">Tidak Ditemukan</span>
                        <span className="text-xl font-bold text-rose-700 dark:text-rose-400">{stats.unmatched}</span>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl max-h-[350px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 z-10">
                            <tr>
                                <th className="px-4 py-3">Nama di Excel</th>
                                <th className="px-4 py-3">Status Pencocokan</th>
                                <th className="px-4 py-3">Nama Siswa Portal (Manual Override)</th>
                                <th className="px-4 py-3 w-24">Skor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {rows.map((row, index) => {
                                return (
                                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                                            {row.excelName}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.method === 'exact' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                                    <CheckIcon className="w-3.5 h-3.5 mr-1" />
                                                    Sempurna (100%)
                                                </span>
                                            )}
                                            {row.method !== 'exact' && row.method !== 'none' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                                    <AlertTriangleIcon className="w-3.5 h-3.5 mr-1" />
                                                    Fuzzy ({row.confidence}%)
                                                </span>
                                            )}
                                            {row.method === 'none' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                                    <XCircleIcon className="w-3.5 h-3.5 mr-1" />
                                                    Tidak Cocok
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 min-w-[220px]">
                                            <Select
                                                value={row.selectedStudentId}
                                                onChange={(e) => handleStudentChange(index, e.target.value)}
                                                className={`h-9 text-xs rounded-lg ${row.method === 'none' ? 'border-rose-300 dark:border-rose-800' : ''}`}
                                            >
                                                <option value="">-- Hubungkan dengan Siswa --</option>
                                                {students.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </Select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input
                                                type="number"
                                                step="any"
                                                min={0}
                                                max={100}
                                                value={row.score}
                                                onChange={(e) => handleScoreChange(index, e.target.value)}
                                                className="h-9 text-center font-semibold text-xs rounded-lg"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onClose}>
                        Batal
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={!canApply}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                    >
                        Terapkan Nilai
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
