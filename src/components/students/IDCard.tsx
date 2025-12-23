import React from 'react';
import { StudentRow, ClassRow } from './types';
import { getStudentAvatar } from '../../utils/avatarUtils';
import { QrCode } from 'lucide-react';

interface IDCardProps {
    student: StudentRow;
    className?: string;
    schoolName?: string;
}

export const IDCard: React.FC<IDCardProps> = ({ student, className = 'VII-A', schoolName = 'MI AL IRSYAD KOTA MADIUN' }) => {
    return (
        <div className="w-[85.6mm] h-[53.98mm] bg-white border border-gray-200 relative overflow-hidden flex shadow-sm print:shadow-none print:border-black/10">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-indigo-700 to-purple-800"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl transform translate-x-10 translate-y-10"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full p-4 flex flex-col justify-between">
                {/* Header */}
                <div className="flex justify-between items-start text-white">
                    <div>
                        <h3 className="text-[10px] font-medium opacity-90 uppercase tracking-wider">KARTU PELAJAR</h3>
                        <h1 className="text-xs font-bold leading-tight mt-0.5">{schoolName}</h1>
                    </div>
                    {/* Logo Placeholder */}
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex items-end gap-3 mt-4">
                    {/* Photo */}
                    <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        <img
                            src={getStudentAvatar(student.avatar_url, student.gender, student.id)}
                            alt={student.name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Details */}
                    <div className="flex-grow pb-1">
                        <h2 className="text-sm font-bold text-gray-900 uppercase leading-snug line-clamp-2">{student.name}</h2>

                        <div className="mt-2 text-[9px] space-y-0.5 text-gray-600">
                            <div className="flex">
                                <span className="w-12 font-medium">BORN</span>
                                <span>: -</span>
                            </div>
                            <div className="flex">
                                <span className="w-12 font-medium">CLASS</span>
                                <span>: {className}</span>
                            </div>
                            <div className="flex">
                                <span className="w-12 font-medium">CODE</span>
                                <span className="font-mono font-bold text-indigo-700">: {student.access_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-white border border-gray-100 rounded flex items-center justify-center">
                            <QrCode className="w-10 h-10 text-gray-800" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
