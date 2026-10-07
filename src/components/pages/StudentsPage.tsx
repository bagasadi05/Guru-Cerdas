import React from 'react';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import StudentsPageSkeleton from '../skeletons/StudentsPageSkeleton';
import { StudentsPageView } from '../students/StudentsPageView';
import { useStudentsPageViewModel } from '../students/useStudentsPageViewModel';
import { ErrorState } from '../ui/ErrorState';

const StudentsPage: React.FC = () => {
    const toast = useToast();
    const { user, userRole, isAdmin } = useAuth();
    const isLeadership = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum';
    const { isLoading, isError, retryData, viewProps } = useStudentsPageViewModel({ userId: user?.id, toast, isAdmin, canViewAll: isLeadership });

    if (isLoading) return <StudentsPageSkeleton />;
    if (isError) {
        return (
            <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
                <ErrorState
                    title="Gagal Memuat Data Siswa"
                    message="Data siswa belum dapat dimuat. Periksa koneksi Anda, lalu coba lagi."
                    onRetry={() => { void retryData(); }}
                    fullWidth
                />
            </div>
        );
    }

    return <StudentsPageView {...viewProps} />;
};

export default StudentsPage;
