import React from 'react';
import { Card } from '../../ui/Card';

interface StatCardProps {
    icon: React.FC<any>;
    label: string;
    value: string | number;
    color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => (
    <Card className="p-4">
        <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    </Card>
);
