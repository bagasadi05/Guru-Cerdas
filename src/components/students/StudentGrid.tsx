import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { EyeIcon, KeyRoundIcon, MoreVerticalIcon } from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { StudentViewProps } from './types';

export const StudentGrid: React.FC<StudentViewProps> = ({ students, isSelected, toggleItem, onAction }) => {
    const windowSize = 24;
    const [visibleCount, setVisibleCount] = useState(() => Math.min(windowSize, students.length));
    const clampedCount = Math.min(visibleCount, students.length);
    const visibleStudents = useMemo(() => students.slice(0, clampedCount), [students, clampedCount]);
    const hasMore = clampedCount < students.length;

    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + windowSize, students.length));
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 ">
                {visibleStudents.map((student, index) => (
                    <Card
                        key={student.id}
                        className="relative p-0 group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className={`h-20 sm:h-28 w-full bg-gradient-to-br ${student.gender === 'Laki-laki' ? 'from-slate-400/90 to-slate-600/90' : 'from-pink-300/90 to-rose-500/90'} opacity-90`}>
                            <div className="absolute top-3 left-3 z-10">
                                <input
                                    type="checkbox"
                                    checked={isSelected(student.id)}
                                    onChange={(e) => { e.stopPropagation(); toggleItem(student.id); }}
                                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-white/50 bg-white/20 text-emerald-600 focus:ring-emerald-500 checked:bg-emerald-600 checked:border-transparent transition-all cursor-pointer"
                                />
                            </div>
                            <div className="absolute top-3 right-3">
                                <button type="button"
                                    onClick={() => onAction(student, 'menu')}
                                    aria-label={`Menu aksi siswa ${student.name}`}
                                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                                >
                                    <MoreVerticalIcon className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                        <div className="px-3 sm:px-5 pb-4 sm:pb-6 flex flex-col items-center -mt-10 sm:-mt-14">
                            <div className="relative">
                                <img
                                    src={getStudentAvatar(student.avatar_url, student.gender, student.id)}
                                    alt={student.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-3 sm:border-4 border-white dark:border-gray-800 shadow-lg bg-white dark:bg-gray-700"
                                />
                                <div className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-3 sm:border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-sm ${student.gender === 'Laki-laki' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                    <span className="text-white text-xxs font-bold">{student.gender === 'Laki-laki' ? 'L' : 'P'}</span>
                                </div>
                            </div>

                            <h4 className="mt-2 sm:mt-4 font-bold text-sm sm:text-lg text-gray-900 dark:text-white text-center line-clamp-1 w-full px-1 sm:px-2">{student.name}</h4>

                            <div className="mt-1 sm:mt-2 flex items-center gap-2">
                                {student.access_code ? (
                                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
                                        <KeyRoundIcon className="w-3 h-3" />
                                        {student.access_code}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-medium border border-amber-200 dark:border-amber-900/30">
                                        <KeyRoundIcon className="w-3 h-3" />
                                        Butuh Kode
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 sm:mt-5 w-full">
                                <Link
                                    to={`/siswa/${student.id}`}
                                    className="flex w-full items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                >
                                    <EyeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    Lihat Detail
                                </Link>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {hasMore && (
                <div className="flex justify-center py-2">
                    <button type="button"
                        onClick={handleLoadMore}
                        className="px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    >
                        Tampilkan Lebih Banyak ({students.length - clampedCount} tersisa)
                    </button>
                </div>
            )}
        </div>
    );
};
