import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { Breadcrumb } from '../../ui/Breadcrumb';
import { Modal } from '../../ui/Modal';
import { EditStudentForm } from './forms/EditStudentForm';
import { getStudentAvatar } from '../../../utils/avatarUtils';
import {
    ArrowLeftIcon,
    CameraIcon,
    UserCircleIcon,
    FileTextIcon,
    KeyRoundIcon,
    CopyIcon,
    CopyCheckIcon,
    Share2Icon
} from '../../Icons';
import { StudentWithClass, ClassRow } from './types';
import { EditStudentFormValues } from './schemas';

interface StudentProfileHeaderProps {
    studentId: string;
    student: StudentWithClass;
    canManageStudentProfile: boolean;
    isOnline: boolean;
    handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingPhoto: boolean;
    photoInputRef: React.RefObject<HTMLInputElement>;
    handleEditStudentSubmit: (data: EditStudentFormValues) => void;
    isSubmittingEdit: boolean;
    handleCopyAccessCode: () => void;
    copied: boolean;
    handleGenerateAccessCode: () => void;
    handleShare: () => void;
    classes: ClassRow[];
}

export const StudentProfileHeader: React.FC<StudentProfileHeaderProps> = ({
    studentId,
    student,
    canManageStudentProfile,
    isOnline,
    handlePhotoChange,
    isUploadingPhoto,
    photoInputRef,
    handleEditStudentSubmit,
    isSubmittingEdit,
    handleCopyAccessCode,
    copied,
    handleGenerateAccessCode,
    handleShare,
    classes
}) => {
    const navigate = useNavigate();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

    const onEditSubmit = (data: EditStudentFormValues) => {
        handleEditStudentSubmit(data);
        setIsEditModalOpen(false);
    };

    return (
        <div className="no-print">
            {/* Breadcrumb Navigation */}
            <Breadcrumb
                items={[
                    { label: 'Beranda', path: '/dashboard' },
                    { label: 'Siswa', path: '/siswa' },
                    { label: student.name }
                ]}
                className="mb-4"
            />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali" className="flex-shrink-0 h-10 w-10 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-transform hover:-translate-x-1">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                    <div className="relative group flex-shrink-0">
                        <img src={getStudentAvatar(student.avatar_url, student.gender, student.id)} alt={student.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:shadow-lg transition-all duration-300 dark:border-white/10 group-hover:scale-105" />
                        <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/png, image/jpeg" className="hidden" disabled={isUploadingPhoto || !isOnline} />
                        {canManageStudentProfile ? (
                            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto || !isOnline} aria-label="Unggah foto profil siswa" className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-md hover:scale-110 transition-transform">
                                <CameraIcon className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">{student.name}</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate">Kelas {student.classes?.name || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto self-start md:self-center flex-wrap">
                    {canManageStudentProfile ? (
                        <Button
                            variant="outline"
                            onClick={() => setIsEditModalOpen(true)}
                            disabled={!isOnline}
                            className="flex-1 sm:flex-none h-10 px-3 sm:px-4 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-all hover:-translate-y-0.5"
                        >
                            <UserCircleIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Edit Profil</span>
                        </Button>
                    ) : null}

                    <Link to={`/cetak-rapot/${studentId}`} className="flex-1 sm:flex-none flex">
                        <Button variant="outline" className="w-full h-10 px-3 sm:px-4 bg-white/50 dark:bg-white/10 border-gray-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-all hover:-translate-y-0.5">
                            <FileTextIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Cetak Rapor</span>
                        </Button>
                    </Link>

                    {canManageStudentProfile ? (
                        <Button
                            onClick={() => setIsPortalModalOpen(true)}
                            className="flex-1 sm:flex-none h-10 px-3 sm:px-4 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-900 hover:to-emerald-900 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                        >
                            <KeyRoundIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Akses Portal</span>
                        </Button>
                    ) : null}
                </div>
            </header>

            {/* Modal Edit Student */}
            {isEditModalOpen && (
                <Modal isOpen={true} onClose={() => setIsEditModalOpen(false)} title="Edit Profil Siswa">
                    <EditStudentForm
                        defaultValues={student}
                        classes={classes}
                        onSubmit={onEditSubmit}
                        onClose={() => setIsEditModalOpen(false)}
                        isPending={isSubmittingEdit}
                    />
                </Modal>
            )}

            {/* Modal Portal Access */}
            {isPortalModalOpen && (
                <Modal isOpen={true} onClose={() => setIsPortalModalOpen(false)} title="Akses Portal Siswa">
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Informasi Penting</h4>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-4">
                                <li>Kode akses digunakan siswa untuk masuk ke portal pembelajaran mandiri.</li>
                                <li>Setiap siswa memiliki kode akses yang unik dan berbeda.</li>
                                <li>Jaga kerahasiaan kode akses, bagikan hanya kepada siswa yang bersangkutan atau orang tuanya.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kode Akses Saat Ini</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xl text-center font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                                    {student.access_code}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCopyAccessCode}
                                    className="h-[52px] px-4 shrink-0 transition-all"
                                >
                                    {copied ? <CopyCheckIcon className="w-5 h-5 text-emerald-500" /> : <CopyIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleGenerateAccessCode}
                                disabled={!isOnline}
                                className="flex-1 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                            >
                                Generate Ulang Kode
                            </Button>
                            <Button
                                type="button"
                                onClick={handleShare}
                                className="flex-1 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Share2Icon className="w-4 h-4 mr-2" />
                                Bagikan Kode
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
