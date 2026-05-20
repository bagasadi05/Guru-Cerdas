import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Shield, Zap, Award } from 'lucide-react';

interface CharacterTabProps {
    violationsStats: any;
    quizPointsStats: any;
}

export const CharacterTab: React.FC<CharacterTabProps> = ({ violationsStats, quizPointsStats }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Quiz Points / Engagement */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Pahlawan Kelas (Keaktifan)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {quizPointsStats.total > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center border border-amber-100 dark:border-amber-800">
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{quizPointsStats.totalPoints}</p>
                                    <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">Total Poin Kelas</p>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center border border-green-100 dark:border-green-800">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{quizPointsStats.avgPoints}</p>
                                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">Rata-rata Poin</p>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center border border-blue-100 dark:border-blue-800 col-span-2 md:col-span-1">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quizPointsStats.total}</p>
                                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Total Aktivitas</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-amber-500" /> Top 5 Siswa Teraktif
                                    </h4>
                                    <div className="space-y-2">
                                        {quizPointsStats.topEngaged.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 text-center font-bold text-slate-400">#{i+1}</div>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{item.student?.name}</span>
                                                </div>
                                                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                                                    {item.points} pt
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Distribusi Kategori</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {quizPointsStats.byCategory.map((item: any, i: number) => (
                                            <div key={i} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 flex-1 min-w-[120px]">
                                                <p className="text-xs text-slate-500 mb-1">{item.category}</p>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{item.points} pt</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-full mb-3">
                                <Zap className="w-6 h-6 text-amber-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Belum Ada Poin Keaktifan</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Berikan poin kuis untuk melihat pahlawan kelas Anda.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Violations Analytics */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        Catatan Perilaku (Pelanggaran)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {violationsStats.total > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center border border-red-100 dark:border-red-800">
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{violationsStats.total}</p>
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total Insiden</p>
                                </div>
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center border border-orange-100 dark:border-orange-800">
                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{violationsStats.totalPoints}</p>
                                    <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Poin Pelanggaran</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-red-500" /> Siswa Sering Melanggar
                                    </h4>
                                    <div className="space-y-2">
                                        {violationsStats.topViolators.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{item.student?.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{item.count}x Melanggar</p>
                                                    <p className="text-[10px] text-slate-500">{item.points} poin</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Jenis Pelanggaran</h4>
                                    <div className="space-y-2">
                                        {violationsStats.byType.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{item.type}</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full mb-3">
                                <Shield className="w-6 h-6 text-green-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Tidak Ada Pelanggaran</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Luar biasa! Semua siswa berkelakuan baik.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
