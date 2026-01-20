import React from 'react';
import { Trophy, Calendar, Star, Info } from 'lucide-react';
import { Database } from '../../../services/database.types';

type Extracurricular = Database['public']['Tables']['extracurriculars']['Row'];
type StudentExtracurricular = Database['public']['Tables']['student_extracurriculars']['Row'];
type ExtracurricularAttendance = Database['public']['Tables']['extracurricular_attendance']['Row'];
type ExtracurricularGrade = Database['public']['Tables']['extracurricular_grades']['Row'];

interface ExtracurricularTabProps {
    studentExtracurriculars: (StudentExtracurricular & { extracurriculars: Extracurricular | null })[];
    attendanceRecords: ExtracurricularAttendance[];
    grades: ExtracurricularGrade[];
}

export const ExtracurricularTab: React.FC<ExtracurricularTabProps> = ({
    studentExtracurriculars,
    attendanceRecords,
    grades,
}) => {
    if (studentExtracurriculars.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Trophy className="w-16 h-16 mb-4 opacity-50" />
                <p>Siswa ini belum mengikuti ekstrakurikuler apapun.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
                {studentExtracurriculars.map((enrollment) => {
                    const ekskul = enrollment.extracurriculars;
                    if (!ekskul) return null;

                    // Statistics for this ekskul
                    const ekskulAttendance = attendanceRecords.filter(
                        (a) => a.extracurricular_id === ekskul.id
                    );
                    const totalMeetings = ekskulAttendance.length;
                    const presentCount = ekskulAttendance.filter((a) => a.status === 'Hadir').length;
                    const attendanceRate = totalMeetings > 0 ? Math.round((presentCount / totalMeetings) * 100) : 0;

                    const grade = grades.find((g) => g.extracurricular_id === ekskul.id);

                    return (
                        <div
                            key={enrollment.id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all"
                        >
                            {/* Header */}
                            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-100 dark:border-amber-900/20 flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                                            {ekskul.name}
                                        </h3>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full w-fit">
                                            {ekskul.category || 'Umum'}
                                        </p>
                                    </div>
                                </div>
                                {enrollment.status === 'active' ? (
                                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs px-2 py-1 rounded-full font-medium">
                                        Aktif
                                    </span>
                                ) : (
                                    <span className="bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 text-xs px-2 py-1 rounded-full font-medium">
                                        {enrollment.status}
                                    </span>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-xs font-medium">Kehadiran</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-xl font-bold text-slate-800 dark:text-white">
                                                {attendanceRate}%
                                            </span>
                                            <span className="text-xs text-slate-500 mb-1">
                                                ({presentCount}/{totalMeetings} pertemuan)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                            <Star className="w-4 h-4" />
                                            <span className="text-xs font-medium">Nilai</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className={`text-xl font-bold ${grade?.grade === 'A' ? 'text-green-500' :
                                                grade?.grade === 'B' ? 'text-blue-500' :
                                                    grade?.grade === 'C' ? 'text-yellow-500' :
                                                        'text-slate-800 dark:text-white'
                                                }`}>
                                                {grade?.grade || '-'}
                                            </span>
                                            {grade?.score && (
                                                <span className="text-xs text-slate-500 mb-1">
                                                    (Skor: {grade.score})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Info Details */}
                                <div className="space-y-2 text-sm">
                                    {ekskul.schedule_day && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-slate-500 dark:text-slate-400">Jadwal</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {ekskul.schedule_day} {ekskul.schedule_time && `• ${ekskul.schedule_time}`}
                                            </span>
                                        </div>
                                    )}
                                    {ekskul.coach_name && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-slate-500 dark:text-slate-400">Pembina</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {ekskul.coach_name}
                                            </span>
                                        </div>
                                    )}
                                    {grade?.description && (
                                        <div className="pt-2">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                                <Info className="w-3 h-3" />
                                                <span className="text-xs font-medium">Catatan Penilaian</span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-300 italic bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg text-xs leading-relaxed">
                                                "{grade.description}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
