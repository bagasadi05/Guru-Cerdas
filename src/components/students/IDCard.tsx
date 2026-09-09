import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { GraduationCap } from 'lucide-react';
import { StudentRow } from './types';
import { getStudentAvatar } from '../../utils/avatarUtils';

interface IDCardProps {
  student: StudentRow;
  className?: string;
  schoolName?: string;
  logoUrl?: string | null;
}

const formatBirthDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthIdx = parseInt(month, 10) - 1;
      return `${parseInt(day, 10)} ${months[monthIdx] || month} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const IDCard: React.FC<IDCardProps> = ({
  student,
  className = '-',
  schoolName = 'MI AL IRSYAD KOTA MADIUN',
  logoUrl,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    // Embed student access code or NISN/NIS as scannable QR payload
    const qrPayload = student.access_code || student.nisn || student.nis || student.id;

    QRCode.toDataURL(qrPayload, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Gagal membuat QR code kartu:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [student.access_code, student.nisn, student.nis, student.id]);

  const nisDisplay = student.nis || student.nisn || '-';

  return (
    <div className="w-[85.6mm] h-[53.98mm] bg-white border border-slate-200 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between shadow-sm print:shadow-none print:border-slate-300 rounded-xl text-slate-800 select-none">
      {/* Background Graphic */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[22mm] bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-50 rounded-full blur-2xl opacity-60" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-3.5 pt-2.5 flex justify-between items-start text-white">
        <div className="max-w-[70%]">
          <span className="text-[9px] font-bold tracking-wider uppercase opacity-90 block">
            Kartu Pelajar
          </span>
          <h1 className="text-[11px] font-extrabold leading-tight tracking-tight line-clamp-1">
            {schoolName}
          </h1>
        </div>

        {/* Logo / Badge */}
        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-xs overflow-hidden shrink-0 border border-white/30">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
          ) : (
            <GraduationCap className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-end gap-2.5">
        {/* Photo Avatar */}
        <div className="w-[18mm] h-[22mm] bg-slate-100 rounded-lg overflow-hidden border-2 border-white shadow-md shrink-0 relative">
          <img
            src={getStudentAvatar(student.avatar_url, student.gender, student.id, undefined, 'md')}
            alt={student.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Student Details */}
        <div className="flex-grow min-w-0 pb-0.5">
          <h2 className="text-[12px] font-bold text-slate-900 uppercase leading-snug truncate" title={student.name}>
            {student.name}
          </h2>

          <div className="mt-1 text-[10px] space-y-0.5 text-slate-600 font-medium">
            <div className="flex items-center">
              <span className="w-14 text-slate-400 shrink-0 text-[9px] uppercase tracking-wider">NIS / NISN</span>
              <span className="text-slate-800 font-semibold truncate">: {nisDisplay}</span>
            </div>
            <div className="flex items-center">
              <span className="w-14 text-slate-400 shrink-0 text-[9px] uppercase tracking-wider">Kelas</span>
              <span className="text-slate-800 font-semibold truncate">: {className}</span>
            </div>
            <div className="flex items-center">
              <span className="w-14 text-slate-400 shrink-0 text-[9px] uppercase tracking-wider">Tgl Lahir</span>
              <span className="text-slate-700 truncate">: {formatBirthDate(student.birth_date)}</span>
            </div>
            <div className="flex items-center">
              <span className="w-14 text-slate-400 shrink-0 text-[9px] uppercase tracking-wider">Kode Akses</span>
              <span className="font-mono font-bold text-emerald-700 truncate">: {student.access_code || '-'}</span>
            </div>
          </div>
        </div>

        {/* Real Scannable QR Code */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-[15mm] h-[15mm] bg-white border border-slate-200 rounded-lg p-0.5 flex items-center justify-center shadow-xs">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${student.name}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
            )}
          </div>
          <span className="text-[7px] text-slate-400 mt-0.5 font-semibold tracking-tighter uppercase">
            Scan Login
          </span>
        </div>
      </div>
    </div>
  );
};
