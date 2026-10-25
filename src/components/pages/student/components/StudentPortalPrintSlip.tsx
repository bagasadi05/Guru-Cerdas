import React from 'react';
import type { StudentWithClass } from '../types';

interface StudentPortalPrintSlipProps {
    student: StudentWithClass;
}

export const StudentPortalPrintSlip: React.FC<StudentPortalPrintSlipProps> = ({ student }) => {
    return (
        <div className="hidden print:block">
            <div id="printable-slip">
                <div className="p-8 text-black" style={{ width: '12cm', fontFamily: 'sans-serif' }}>
                    <h3 className="text-lg font-bold">Informasi Akses Portal Siswa</h3>
                    <p className="text-sm mb-4">Harap simpan informasi ini dengan baik.</p>
                    <div className="border-t border-b border-gray-300 py-4 my-4">
                        <p className="text-xs">Nama Siswa:</p>
                        <p className="text-base font-semibold">{student.name}</p>
                        <p className="text-xs mt-2">Kelas:</p>
                        <p className="text-base font-semibold">{student.classes?.name || 'N/A'}</p>
                    </div>
                    <p className="text-center text-sm">Gunakan kode berikut untuk masuk:</p>
                    <div className="text-center my-2 p-3 bg-gray-100 rounded-md">
                        <p className="text-3xl font-mono font-bold tracking-widest">{student.access_code}</p>
                    </div>
                    <p className="text-center text-xs mt-4">
                        Masuk melalui: <span className="font-mono">{window.location.origin}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
