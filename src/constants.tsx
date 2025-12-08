import React from 'react';
import { AttendanceStatus } from './types';

import { IconH, IconI, IconS, IconA } from './components/Icons';

export const statusOptions = [
    { value: AttendanceStatus.Hadir, label: 'Hadir', icon: IconH, color: 'emerald', gradient: 'from-emerald-400 to-green-500' },
    { value: AttendanceStatus.Izin, label: 'Izin', icon: IconI, color: 'amber', gradient: 'from-amber-400 to-orange-500' },
    { value: AttendanceStatus.Sakit, label: 'Sakit', icon: IconS, color: 'sky', gradient: 'from-sky-400 to-blue-500' },
    { value: AttendanceStatus.Alpha, label: 'Alpha', icon: IconA, color: 'rose', gradient: 'from-rose-400 to-red-500' },
];
