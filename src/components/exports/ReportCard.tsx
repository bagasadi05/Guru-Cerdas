import React from 'react';
import { PortalData } from '../pages/ParentPortalPage';

interface ReportCardProps {
    data: PortalData;
}

export const ReportCard = React.forwardRef<HTMLDivElement, ReportCardProps>(({ data }, ref) => {
    // Get school info from data if available
    const schoolName = (data as any).schoolInfo?.school_name || 'SMK Portal Guru';
    const schoolAddress = (data as any).schoolInfo?.school_address || 'Jl. Pendidikan No. 1, Jakarta';
    const semester = (data as any).schoolInfo?.semester || 'Ganjil';
    const academicYear = (data as any).schoolInfo?.academic_year || '2024/2025';

    return (
        <div ref={ref} className="p-12 font-serif text-slate-900 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Header with Logo */}
            <div className="text-center mb-8 border-b-2 border-slate-900 pb-4">
                <div className="flex items-center justify-center gap-6 mb-4">
                    {/* School Logo */}
                    <img
                        src="/logo_sekolah.png"
                        alt="Logo Sekolah"
                        className="w-20 h-20 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">Laporan Hasil Belajar Peserta Didik</h1>
                        <h2 className="text-xl font-bold">{schoolName}</h2>
                        <p className="text-sm">{schoolAddress}</p>
                    </div>
                </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                <div>
                    <p className="mb-1"><span className="font-bold w-32 inline-block">Nama Peserta Didik</span>: {data.student.name}</p>
                    <p className="mb-1"><span className="font-bold w-32 inline-block">Kelas</span>: {data.student.classes.name}</p>
                    <p className="mb-1"><span className="font-bold w-32 inline-block">NIS/NISN</span>: {data.student.id.slice(0, 10).toUpperCase()}</p>
                </div>
                <div>
                    <p className="mb-1"><span className="font-bold w-32 inline-block">Semester</span>: {semester}</p>
                    <p className="mb-1"><span className="font-bold w-32 inline-block">Tahun Pelajaran</span>: {academicYear}</p>
                </div>
            </div>

            {/* Academic Records */}
            <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 border-b border-slate-400 pb-1">A. Nilai Akademik</h3>
                <table className="w-full border-collapse border border-slate-800 text-sm">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-800 p-2 text-center w-12">No</th>
                            <th className="border border-slate-800 p-2 text-left">Mata Pelajaran</th>
                            <th className="border border-slate-800 p-2 text-center w-20">Nilai</th>
                            <th className="border border-slate-800 p-2 text-left">Catatan Guru</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.academicRecords.length > 0 ? (
                            data.academicRecords.map((record, index) => (
                                <tr key={index}>
                                    <td className="border border-slate-800 p-2 text-center">{index + 1}</td>
                                    <td className="border border-slate-800 p-2 font-medium">{record.subject}</td>
                                    <td className="border border-slate-800 p-2 text-center font-bold">
                                        {record.score}
                                    </td>
                                    <td className="border border-slate-800 p-2 text-slate-700">{record.notes || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="border border-slate-800 p-4 text-center italic">Belum ada nilai akademik.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Attendance */}
            <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 border-b border-slate-400 pb-1">B. Kehadiran</h3>
                <div className="border border-slate-800 rounded-lg p-4">
                    <div className="grid grid-cols-4 divide-x divide-slate-800">
                        <div className="text-center px-4">
                            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Hadir</p>
                            <p className="text-xl font-bold">{data.attendanceRecords.filter(r => r.status === 'Hadir').length}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Sakit</p>
                            <p className="text-xl font-bold">{data.attendanceRecords.filter(r => r.status === 'Sakit').length}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Izin</p>
                            <p className="text-xl font-bold">{data.attendanceRecords.filter(r => r.status === 'Izin').length}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Alpha</p>
                            <p className="text-xl font-bold">{data.attendanceRecords.filter(r => r.status === 'Alpha').length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signature Section */}
            <div className="mt-24 grid grid-cols-3 gap-8 text-center text-sm">
                <div>
                    <p className="mb-24">Orang Tua / Wali</p>
                    <p className="font-bold border-b border-slate-800 inline-block min-w-[150px] pb-1">{data.student.parent_name || '...................'}</p>
                </div>
                <div></div>
                <div>
                    <p className="mb-2">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="mb-20">Wali Kelas</p>
                    <p className="font-bold border-b border-slate-800 inline-block min-w-[150px] pb-1">{data.teacher?.full_name || '...................'}</p>
                </div>
            </div>
            <div className="mt-12 text-center text-[10px] text-slate-400">
                Dokumen ini dicetak secara otomatis melalui aplikasi Portal Guru.
            </div>
        </div>
    );
});

ReportCard.displayName = 'ReportCard';
