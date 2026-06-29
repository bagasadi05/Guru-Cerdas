import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Select } from '../../../ui/Select';
import { Input } from '../../../ui/Input';
import { Skeleton } from '../../../ui/Skeleton';
import { SemesterSelector } from '../../../ui/SemesterSelector';
import { UploadIcon, DownloadIcon, SparklesIcon } from '../../../Icons';

interface ClassRow {
    id: string;
    name: string;
}

interface SettingsCardProps {
    selectedClass: string;
    setSelectedClass: (v: string) => void;
    selectedSemester: string;
    setSelectedSemester: (v: string) => void;
    selectedSubject: string;
    setSelectedSubject: (v: string) => void;
    assessmentName: string;
    setAssessmentName: (v: string) => void;
    kkm: number;
    setKkm: (v: number) => void;
    classes: ClassRow[] | undefined;
    loadingClasses: boolean;
    availableSubjects: string[];
    onShowImportModal: () => void;
    onShowAIPasteModal: () => void;
    onExport: () => void;
    gradesEmpty: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
    selectedClass,
    setSelectedClass,
    selectedSemester,
    setSelectedSemester,
    selectedSubject,
    setSelectedSubject,
    assessmentName,
    setAssessmentName,
    kkm,
    setKkm,
    classes,
    loadingClasses,
    availableSubjects,
    onShowImportModal,
    onShowAIPasteModal,
    onExport,
    gradesEmpty,
}) => {
    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle>Pengaturan</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowImportModal}
                        className="h-9"
                    >
                        <UploadIcon className="w-4 h-4 mr-1.5" />
                        Import Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        disabled={gradesEmpty}
                        className="h-9"
                    >
                        <DownloadIcon className="w-4 h-4 mr-1.5" />
                        Export Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowAIPasteModal}
                        disabled={!selectedClass}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 h-9"
                    >
                        <SparklesIcon className="w-4 h-4 mr-1.5 text-indigo-500" />
                        AI Paste
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Pilih Kelas</label>
                    {loadingClasses ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">-- Pilih Kelas --</option>
                            {classes?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Semester</label>
                    <SemesterSelector
                        value={selectedSemester}
                        onChange={(val) => setSelectedSemester(val)}
                        includeAllOption={false}
                        showIcon={true}
                        className="w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                    <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={availableSubjects.length === 0}>
                        <option value="">-- Pilih Mapel --</option>
                        {availableSubjects.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                    {availableSubjects.length === 0 ? (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Belum ada mapel yang ditugaskan untuk kelas dan semester ini.
                        </p>
                    ) : null}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Nama Penilaian</label>
                    <Input
                        value={assessmentName}
                        onChange={(e) => setAssessmentName(e.target.value)}
                        placeholder="Ulangan Harian 1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">KKM (Kriteria Ketuntasan Minimal)</label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={kkm}
                        onChange={(e) => setKkm(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        placeholder="75"
                    />
                </div>
            </CardContent>
        </Card>
    );
};
