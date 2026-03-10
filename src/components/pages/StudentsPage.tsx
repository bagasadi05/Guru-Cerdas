import React from 'react';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import StudentsPageSkeleton from '../skeletons/StudentsPageSkeleton';
import { StudentsPageView } from '../students/StudentsPageView';
import { useStudentsPageViewModel } from '../students/useStudentsPageViewModel';

const StudentsPage: React.FC = () => {
    const toast = useToast();
    const { user } = useAuth();
    const { isLoading, viewProps } = useStudentsPageViewModel({ userId: user?.id, toast });

    if (isLoading) return <StudentsPageSkeleton />;

    return <StudentsPageView {...viewProps} />;
};

export default StudentsPage;
