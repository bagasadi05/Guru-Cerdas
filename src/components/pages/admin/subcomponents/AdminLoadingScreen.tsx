import React from 'react';
import { Loader2 } from 'lucide-react';

export const AdminLoadingScreen: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
            <Loader2 className="w-12 h-12 animate-spin text-brand-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Memuat Dasbor Admin...</p>
        </div>
    );
};
