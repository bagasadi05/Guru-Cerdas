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
    <Card className={`f-stat-card rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${className}`}>
        <div className="flex items-center f-gap-row">
            <div className={`f-stat-icon-wrap bg-gradient-to-br shadow-sm ${color}`}>
                <Icon className="f-icon-sm text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="f-stat-value text-slate-900 dark:text-white">{value}</p>
                <p className="f-stat-label text-slate-500 dark:text-slate-400">{label}</p>
            </div>
        </div>
    </Card>
);
