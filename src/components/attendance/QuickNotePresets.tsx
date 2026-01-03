/**
 * Quick Note Presets Component
 * 
 * Provides quick note templates for attendance records
 */

import React from 'react';
import { FileText, Thermometer, Stethoscope, Calendar, Users, Home, Clock } from 'lucide-react';

interface NotePreset {
    id: string;
    text: string;
    icon: React.ReactNode;
    category: 'health' | 'family' | 'school' | 'other';
    color: string;
    bgColor: string;
}

interface QuickNotePresetsProps {
    onSelectPreset: (note: string) => void;
    currentNote?: string;
}

const notePresets: NotePreset[] = [
    {
        id: 'sick',
        text: 'Sakit demam',
        icon: <Thermometer className="w-4 h-4" />,
        category: 'health',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
    },
    {
        id: 'doctor',
        text: 'Ke dokter',
        icon: <Stethoscope className="w-4 h-4" />,
        category: 'health',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700/50',
    },
    {
        id: 'family-event',
        text: 'Acara keluarga',
        icon: <Users className="w-4 h-4" />,
        category: 'family',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50',
    },
    {
        id: 'family-sick',
        text: 'Anggota keluarga sakit',
        icon: <Home className="w-4 h-4" />,
        category: 'family',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/50',
    },
    {
        id: 'school-activity',
        text: 'Mengikuti kegiatan sekolah',
        icon: <Calendar className="w-4 h-4" />,
        category: 'school',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
    },
    {
        id: 'late',
        text: 'Terlambat',
        icon: <Clock className="w-4 h-4" />,
        category: 'other',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50',
    },
    {
        id: 'no-info',
        text: 'Tanpa keterangan',
        icon: <FileText className="w-4 h-4" />,
        category: 'other',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    },
];

export const QuickNotePresets: React.FC<QuickNotePresetsProps> = ({
    onSelectPreset,
    currentNote = '',
}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Catatan Cepat
                </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {notePresets.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.text)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 ${preset.bgColor} transition-all hover:shadow-md active:scale-95 ${currentNote === preset.text ? 'ring-2 ring-indigo-500' : ''
                            }`}
                    >
                        <div className={`${preset.color}`}>
                            {preset.icon}
                        </div>
                        <span className={`text-xs font-medium ${preset.color} truncate flex-1 text-left`}>
                            {preset.text}
                        </span>
                    </button>
                ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Klik untuk menggunakan template catatan, atau ketik manual di bawah
            </p>
        </div>
    );
};
