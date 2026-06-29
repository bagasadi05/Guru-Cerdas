import React from 'react';
import { Card } from '../../ui/Card';

interface StatCardProps {
    icon: React.FC<any>;
    label: string;
    value: string | number;
    color: string;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, className = '' }) => (
    <Card className={`p-3 sm:p-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4">
            <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-sm ${color}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight truncate">{label}</p>
            </div>
        </div>
    </Card>
);
