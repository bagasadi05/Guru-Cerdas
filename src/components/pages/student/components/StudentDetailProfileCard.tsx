import React from 'react';
import { Button } from '../../../ui/Button';
import {
    CameraIcon,
    UserCircleIcon,
    FileTextIcon,
    KeyRoundIcon,
    Share2Icon,
} from '../../../Icons';
import { User, Hash } from 'lucide-react';
import { getStudentAvatar } from '../../../../utils/avatarUtils';
import { createWhatsAppLink } from '../../../../utils/whatsappUtils';
import type { StudentWithClass } from '../types';

interface StudentDetailProfileCardProps {
    student: StudentWithClass;
    studentId?: string;
    canManageStudentProfile: boolean;
    isOnline: boolean;
    photoInputRef: React.RefObject<HTMLInputElement>;
    isUploadingPhoto: boolean;
    onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEditProfile: () => void;
    onPrintReport: () => void;
    onOpenPortalAccess: () => void;
}

export const StudentDetailProfileCard: React.FC<StudentDetailProfileCardProps> = ({
    student,
    canManageStudentProfile,
    isOnline,
    photoInputRef,
    isUploadingPhoto,
    onPhotoChange,
    onEditProfile,
    onPrintReport,
    onOpenPortalAccess,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                {/* Avatar + Info Siswa */}
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative group shrink-0">
                        <img
                            src={getStudentAvatar(student.avatar_url, student.gender, student.id, undefined, 'md')}
                            alt={student.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md dark:ring-slate-600 bg-slate-100 dark:bg-slate-700"
                        />
                        <input
                            type="file"
                            ref={photoInputRef}
                            onChange={onPhotoChange}
                            accept="image/png, image/jpeg"
                            className="hidden"
                            disabled={isUploadingPhoto || !isOnline}
                        />
                        {canManageStudentProfile ? (
                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                disabled={isUploadingPhoto || !isOnline}
                                aria-label="Unggah foto profil siswa"
                                className="absolute -bottom-1.5 -right-1.5 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md transition-transform hover:scale-105 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                            >
                                <CameraIcon className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-2xl text-slate-900 dark:text-white font-bold leading-snug line-clamp-1">
                                {student.name}
                            </h1>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                                {student.classes?.name
                                    ? student.classes.name.toLowerCase().startsWith('kelas')
                                        ? student.classes.name
                                        : `Kelas ${student.classes.name}`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {student.gender && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                    <span>{student.gender}</span>
                                </span>
                            )}
                            {student.nis && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                                    <Hash className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                    <span>NIS: {student.nis}</span>
                                </span>
                            )}
                            {student.nisn && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                                    <Hash className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                    <span>NISN: {student.nisn}</span>
                                </span>
                            )}
                            {student.parent_phone && (
                                <a
                                    href={createWhatsAppLink(student.parent_phone, `Halo Bapak/Ibu wali murid dari ${student.name}.`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                    title="Chat WhatsApp Orang Tua Siswa"
                                >
                                    <Share2Icon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                                    <span>WA: {student.parent_phone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tombol Aksi Profil */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                    {canManageStudentProfile ? (
                        <Button
                            variant="outline"
                            onClick={onEditProfile}
                            disabled={!isOnline}
                            className="flex-1 sm:flex-none h-11 min-h-[44px] px-3.5 gap-2 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer active:scale-95 transition-all duration-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200"
                        >
                            <UserCircleIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            <span>Edit Profil</span>
                        </Button>
                    ) : null}

                    <Button
                        variant="outline"
                        onClick={onPrintReport}
                        className="flex-1 sm:flex-none h-11 min-h-[44px] px-3.5 gap-2 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer active:scale-95 transition-all duration-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200"
                    >
                        <FileTextIcon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                        <span>Cetak Rapor</span>
                    </Button>

                    {canManageStudentProfile ? (
                        <Button
                            onClick={onOpenPortalAccess}
                            className="w-full sm:w-auto flex-1 sm:flex-none h-11 min-h-[44px] px-4 gap-2 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer active:scale-95 transition-all duration-200 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                        >
                            <KeyRoundIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>Akses Portal</span>
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
