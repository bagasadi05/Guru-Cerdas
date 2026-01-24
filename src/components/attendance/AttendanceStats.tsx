import React from 'react';
import { AttendanceStatus } from '../../types';
import { statusOptions } from '../../constants';
import { StatCard } from '../ui/StatCard';

interface AttendanceStatsProps {
    summary: Record<AttendanceStatus, number>;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ summary }) => {
    return (
        <div className="grid grid-cols-4 gap-2 mb-6">
            {statusOptions.map((opt, index) => (
                <StatCard
                    key={opt.value}
                    label={opt.label}
                    value={summary[opt.value]}
                    icon={opt.icon}
                    gradient={opt.gradient}
                    size="md"
                    animated={false}
                    animationIndex={index}
                />
            ))}
        </div>
    );
};
