import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { StudentsPageView } from '../../students/StudentsPageView';
import { useStudentsPageViewModel } from '../../students/useStudentsPageViewModel';
import StudentsPageSkeleton from '../../skeletons/StudentsPageSkeleton';

export const StudentsMasterDataTab: React.FC = () => {
    const toast = useToast();
    const { user, isAdmin } = useAuth();
    
    // We reuse the same view model as the main students page, 
    // because it already handles all the data fetching, filtering, and RBAC via isAdmin.
    const { isLoading, viewProps } = useStudentsPageViewModel({ 
        userId: user?.id, 
        toast, 
        isAdmin 
    });

    if (isLoading) {
        return <StudentsPageSkeleton />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-1">
                {/* We wrap StudentsPageView here to render the full master data management UI */}
                <StudentsPageView {...viewProps} />
            </div>
        </div>
    );
};
