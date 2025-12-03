import React from 'react';
import { AttendanceStatus } from './types';

// Custom Letter Icons
export const IconH = ({ className }: { className?: string }) => (
    <svg viewBox= "0 0 24 24" fill = "none" className = { className } >
        <circle cx="12" cy = "12" r = "10" stroke = "currentColor" strokeWidth = "2" fill = "none" opacity = "0.2" />
            <text x="12" y = "16" textAnchor = "middle" fontSize = "14" fontWeight = "900" fill = "currentColor" stroke = "none" > H </text>
                </svg>
);
export const IconI = ({ className }: { className?: string }) => (
    <svg viewBox= "0 0 24 24" fill = "none" className = { className } >
        <circle cx="12" cy = "12" r = "10" stroke = "currentColor" strokeWidth = "2" fill = "none" opacity = "0.2" />
            <text x="12" y = "16" textAnchor = "middle" fontSize = "14" fontWeight = "900" fill = "currentColor" stroke = "none" > I </text>
                </svg>
);
export const IconS = ({ className }: { className?: string }) => (
    <svg viewBox= "0 0 24 24" fill = "none" className = { className } >
        <circle cx="12" cy = "12" r = "10" stroke = "currentColor" strokeWidth = "2" fill = "none" opacity = "0.2" />
            <text x="12" y = "16" textAnchor = "middle" fontSize = "14" fontWeight = "900" fill = "currentColor" stroke = "none" > S </text>
                </svg>
);
export const IconA = ({ className }: { className?: string }) => (
    <svg viewBox= "0 0 24 24" fill = "none" className = { className } >
        <circle cx="12" cy = "12" r = "10" stroke = "currentColor" strokeWidth = "2" fill = "none" opacity = "0.2" />
            <text x="12" y = "16" textAnchor = "middle" fontSize = "14" fontWeight = "900" fill = "currentColor" stroke = "none" > A </text>
                </svg>
);

export const statusOptions = [
    { value: AttendanceStatus.Hadir, label: 'Hadir', icon: IconH, color: 'emerald', gradient: 'from-emerald-400 to-green-500' },
    { value: AttendanceStatus.Izin, label: 'Izin', icon: IconI, color: 'amber', gradient: 'from-amber-400 to-orange-500' },
    { value: AttendanceStatus.Sakit, label: 'Sakit', icon: IconS, color: 'sky', gradient: 'from-sky-400 to-blue-500' },
    { value: AttendanceStatus.Alpha, label: 'Alpha', icon: IconA, color: 'rose', gradient: 'from-rose-400 to-red-500' },
];
