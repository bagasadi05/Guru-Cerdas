import React from 'react';
import { Button } from '../../../ui/Button';
import { Breadcrumb } from '../../../ui/Breadcrumb';
import { ArrowLeftIcon } from '../../../Icons';

interface StudentDetailNavHeaderProps {
    studentName: string;
    classId?: string | null;
    onNavigate: (path: string) => void;
}

export const StudentDetailNavHeader: React.FC<StudentDetailNavHeaderProps> = ({
    studentName,
    classId,
    onNavigate,
}) => {
    const handleBack = () => {
        if (classId) {
            try {
                sessionStorage.setItem('guru_cerdas_active_class_id', classId);
            } catch {
                /* ignore storage error */
            }
            onNavigate(`/siswa?class=${classId}`);
        } else {
            onNavigate('/siswa');
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 shadow-sm rounded-xl font-semibold text-xs sm:text-sm min-h-[44px] cursor-pointer active:scale-95 transition-all duration-200"
            >
                <ArrowLeftIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Kembali ke Data Siswa</span>
            </Button>
            <Breadcrumb
                items={[
                    { label: 'Beranda', path: '/dashboard' },
                    { label: 'Siswa', path: classId ? `/siswa?class=${classId}` : '/siswa' },
                    { label: studentName },
                ]}
            />
        </div>
    );
};
