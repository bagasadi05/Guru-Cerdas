import React from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { BookOpen, Users, TrendingUp, TrendingDown, Minus, ClipboardPenIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SubjectStats } from '../../../../services/academicAnalyticsService';
import type { StudentBelowKKTP } from '../../../../services/academicAnalyticsService';

interface SubjectDetailModalProps {
    subject: SubjectStats | null;
    studentsBelowKKTP: StudentBelowKKTP[];
    onClose: () => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({ subject, studentsBelowKKTP, onClose }) => {
    const navigate = useNavigate();

    if (!subject) return null;

    const subjectStudents = studentsBelowKKTP.filter((s) => s.subject === subject.subject);

    const handleInputGrade = () => {
        navigate('/input-massal', {
            state: {
                prefill: {
                    mode: 'subject_grade',
                    subject: subject.subject,
                },
            },
        });
    };

    return (
        <Modal
            isOpen={!!subject}
            onClose={onClose}
            title={subject.subject}
            maxWidth="max-w-2xl"
            icon={<BookOpen className="w-5 h-5 text-brand-500" />}
        >
            <div className="space-y-5 p-1 max-h-[75vh] overflow-y-auto">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{subject.average}</p>
                        <p className="text-[11px] text-slate-500">Rata-rata</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{subject.highest}</p>
                        <p className="text-[11px] text-slate-500">Tertinggi</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                        <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{subject.lowest}</p>
                        <p className="text-[11px] text-slate-500">Terendah</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Users className="w-4 h-4 text-slate-500" />
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{subject.studentCount}</p>
                        </div>
                        <p className="text-[11px] text-slate-500">Siswa</p>
                    </div>
                </div>

                {/* Trend */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        {subject.trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
                        {subject.trend === 'down' && <TrendingDown className="w-5 h-5 text-rose-500" />}
                        {subject.trend === 'stable' && <Minus className="w-5 h-5 text-slate-400" />}
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Tren: {subject.trend === 'up' ? 'Naik' : subject.trend === 'down' ? 'Turun' : 'Stabil'}
                                {subject.trendDelta !== 0 && ` (${subject.trendDelta > 0 ? '+' : ''}${subject.trendDelta} poin)`}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Dibandingkan periode sebelumnya
                            </p>
                        </div>
                    </div>
                </div>

                {/* Distribution */}
                <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                        Distribusi Nilai
                    </h4>
                    <div className="space-y-2">
                        {subject.distribution.map((d, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-6">{d.label}</span>
                                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${d.percentage}%`, backgroundColor: d.color }}
                                    />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-16 text-right">
                                    {d.count} ({d.percentage}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Students Below KKTP */}
                {subjectStudents.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" />
                            Siswa Di Bawah KKTP ({subjectStudents.length})
                        </h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Siswa</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Kelas</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Rata-rata</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Gap</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {subjectStudents.map((s) => (
                                        <tr key={`${s.studentId}-${s.subject}`}>
                                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.studentName}</td>
                                            <td className="px-3 py-2 text-slate-500">{s.className}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">{s.average}</td>
                                            <td className="px-3 py-2 text-right text-rose-500">{s.gap}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {subjectStudents.length === 0 && subject.kktpStatus === 'safe' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            Semua siswa telah memenuhi target KKTP untuk mapel ini.
                        </p>
                    </div>
                )}

                {/* Action Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        onClick={handleInputGrade}
                        className="w-full gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl"
                    >
                        <ClipboardPenIcon className="w-4 h-4" />
                        Input Nilai {subject.subject}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
