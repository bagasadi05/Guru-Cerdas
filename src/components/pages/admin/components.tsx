import React from 'react';
import { Loader2 } from 'lucide-react';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'indigo' | 'blue' | 'green' | 'orange' | 'purple' | 'pink';
    loading?: boolean;
}

const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
    green: 'from-green-500 to-green-600 shadow-green-500/20',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
    pink: 'from-pink-500 to-pink-600 shadow-pink-500/20',
};

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, loading }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white mb-3 shadow-lg`}>
            {icon}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-300 mt-1" />
        ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
        )}
    </div>
);

/**
 * Get CSS class for role badge
 */
export const getRoleBadgeClass = (role: string): string => {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'teacher': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'student': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'parent': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
};
