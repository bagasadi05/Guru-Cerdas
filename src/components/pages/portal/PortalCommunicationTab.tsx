import React from 'react';
import type { PortalCommunication, PortalStudentInfo, TeacherInfo } from './types';

interface PortalCommunicationTabProps {
    communications: PortalCommunication[];
    student: PortalStudentInfo;
    teacher: TeacherInfo;
    children?: React.ReactNode;
}

export const PortalCommunicationTab: React.FC<PortalCommunicationTabProps> = ({
    communications,
    student,
    teacher,
    children,
}) => {
    return (
        <div className="space-y-4">
            {children ?? (
                <div className="p-4 sm:p-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Komunikasi</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Skeleton komunikasi untuk {student.name}. Jumlah pesan: {communications.length}. Guru terhubung: {teacher?.full_name || 'Belum tersedia'}.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
