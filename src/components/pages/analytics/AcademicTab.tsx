import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { GraduationCapIcon, AlertCircleIcon, BookOpenIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { GradeDistribution } from './types';
import GradeCompletionAnalysis from './GradeCompletionAnalysis';

interface AcademicTabProps {
    gradeStats: { distribution: GradeDistribution[]; overallAverage: number; totalStudentsWithGrades: number };
    classes: any[];
    students: any[];
    academicRecords: any[];
    selectedClassId: string;
}

export const AcademicTab: React.FC<AcademicTabProps> = ({ gradeStats, classes, students, academicRecords, selectedClassId }) => {
    const [showDetails, setShowDetails] = useState(false);

    const GradeDistributionChart = ({ data, average }: { data: GradeDistribution[]; average: number }) => {
        return (
            <div className="relative">
                <div className="flex items-end justify-between mb-6 px-2">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{average}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Rata-rata Kelas</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
                            Total {data.reduce((a, b) => a + b.count, 0)} Siswa
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Dinilai</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div key={index} className="group relative">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="font-semibold text-slate-700 dark:text-gray-200 w-8">{item.label}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {item.range}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {item.count} <span className="text-slate-400 font-normal text-xs ml-0.5">({item.percentage}%)</span>
                                </span>
                            </div>
                            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                    style={{
                                        width: `${item.percentage}%`,
                                        backgroundColor: item.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {average > 0 && average < 75 && (
                    <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-lg h-fit">
                            <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Perhatian Akademik</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                                Rata-rata nilai kelas di bawah 75. Pertimbangkan untuk mengadakan remedial atau kelas tambahan.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GraduationCapIcon className="w-5 h-5 text-indigo-600" />
                        Status Akademik (Nilai)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {gradeStats.totalStudentsWithGrades > 0 ? (
                        <GradeDistributionChart data={gradeStats.distribution} average={gradeStats.overallAverage} />
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                                <BookOpenIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Belum Ada Data Nilai</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Input nilai siswa melalui menu Input Nilai Cepat untuk melihat sebaran nilai di sini.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-center">
                <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
                >
                    {showDetails ? (
                        <><ChevronUpIcon className="w-4 h-4" /> Sembunyikan Detail Lengkap</>
                    ) : (
                        <><ChevronDownIcon className="w-4 h-4" /> Tampilkan Analisis Kelengkapan Nilai</>
                    )}
                </button>
            </div>

            {showDetails && (
                <div className="animate-fade-in">
                    <GradeCompletionAnalysis
                        classes={classes}
                        students={students}
                        academicRecords={academicRecords}
                        selectedClassId={selectedClassId}
                    />
                </div>
            )}
        </div>
    );
};
