import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { EyeIcon, KeyRoundIcon, MoreVerticalIcon } from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { StudentViewProps } from './types';

export const StudentGrid: React.FC<StudentViewProps> = ({ students, isSelected, toggleItem, onAction }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {students.map((student, index) => (
                <Card
                    key={student.id}
                    className="relative p-0 group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-gray-800 rounded-3xl"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className={`h-28 w-full bg-gradient-to-br ${student.gender === 'Laki-laki' ? 'from-sky-400 to-blue-600' : 'from-pink-400 to-rose-600'} opacity-90`}>
                        <div className="absolute top-3 left-3 z-10">
                            <input
                                type="checkbox"
                                checked={isSelected(student.id)}
                                onChange={(e) => { e.stopPropagation(); toggleItem(student.id); }}
                                className="w-5 h-5 rounded border-white/50 bg-white/20 text-indigo-600 focus:ring-indigo-500 checked:bg-indigo-600 checked:border-transparent transition-all cursor-pointer"
                            />
                        </div>
                        <div className="absolute top-3 right-3">
                            <button onClick={() => onAction(student, 'menu')} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors">
                                <MoreVerticalIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="px-5 pb-6 flex flex-col items-center -mt-14">
                        <div className="relative">
                            <img
                                src={getStudentAvatar(student.avatar_url, student.gender, student.id)}
                                alt={student.name}
                                className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg bg-white dark:bg-gray-700"
                            />
                            <div className={`absolute bottom-1 right-1 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-sm ${student.gender === 'Laki-laki' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                <span className="text-white text-[10px] font-bold">{student.gender === 'Laki-laki' ? 'L' : 'P'}</span>
                            </div>
                        </div>

                        <h4 className="mt-4 font-bold text-lg text-gray-900 dark:text-white text-center line-clamp-1 w-full px-2">{student.name}</h4>

                        <div className="mt-2 flex items-center gap-2">
                            {student.access_code ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
                                    <KeyRoundIcon className="w-3 h-3" />
                                    {student.access_code}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium border border-gray-200 dark:border-gray-700">
                                    No Code
                                </span>
                            )}
                        </div>

                        <div className="mt-5 w-full">
                            <Link
                                to={`/siswa/${student.id}`}
                                className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                            >
                                <EyeIcon className="w-4 h-4" />
                                Lihat Detail
                            </Link>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};
