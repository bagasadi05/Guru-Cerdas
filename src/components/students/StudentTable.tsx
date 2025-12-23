import React from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, PencilIcon, TrashIcon, ClipboardIcon, MoreVerticalIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { useToast } from '../../hooks/useToast';
import { StudentTableProps } from './types';
import { Button } from '../ui/Button';

export const StudentTable: React.FC<StudentTableProps> = ({
    students,
    isSelected,
    toggleItem,
    isAllSelected,
    toggleAll,
    onAction,
    sortConfig,
    onSort
}) => {
    const toast = useToast();

    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-4 h-4 inline ml-1" /> : <ChevronDownIcon className="w-4 h-4 inline ml-1" />;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block table-responsive">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4 w-12">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleAll}
                                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none" onClick={() => onSort('name')}>
                                Siswa {renderSortIcon('name')}
                            </th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none" onClick={() => onSort('gender')}>
                                Gender {renderSortIcon('gender')}
                            </th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none" onClick={() => onSort('access_code')}>
                                Kode Akses {renderSortIcon('access_code')}
                            </th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {students.map((student) => (
                            <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${isSelected(student.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={isSelected(student.id)}
                                        onChange={() => toggleItem(student.id)}
                                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <img src={getStudentAvatar(student.avatar_url, student.gender, student.id)} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                                        <span className="font-medium text-gray-900 dark:text-white">{student.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.gender === 'Laki-laki'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                                        }`}>
                                        {student.gender}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {student.access_code ? (
                                        <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs border border-gray-200 dark:border-gray-600">
                                                {student.access_code}
                                            </code>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(student.access_code || ''); toast.success("Disalin!"); }}
                                                className="text-gray-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Salin"
                                            >
                                                <ClipboardIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic text-xs">Belum ada kode</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link to={`/siswa/${student.id}`} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                            <EyeIcon className="w-4 h-4" />
                                        </Link>
                                        <button onClick={() => onAction(student, 'edit')} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onAction(student, 'delete')} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View */}
            <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student) => (
                    <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => onAction(student, 'menu')}>
                        <div className="relative flex-shrink-0">
                            <img src={getStudentAvatar(student.avatar_url, student.gender, student.id)} alt={student.name} className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center ${student.gender === 'Laki-laki' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                <span className="text-white text-[8px] font-bold">{student.gender === 'Laki-laki' ? 'L' : 'P'}</span>
                            </div>
                        </div>
                        <div className="flex-grow min-w-0">
                            <h4 className="font-bold text-gray-900 dark:text-white truncate">{student.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                {student.access_code ? (
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{student.access_code}</span>
                                ) : (
                                    <span className="text-xs text-gray-400">No Code</span>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-gray-400">
                            <MoreVerticalIcon className="w-5 h-5" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};
