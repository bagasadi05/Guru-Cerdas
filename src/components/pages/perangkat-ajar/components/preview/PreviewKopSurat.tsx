import React from 'react';
import type { DocumentIdentity } from '../../../../../types/perangkatAjar';
import type { PreviewDocType } from '../../hooks/usePreviewTabExport';

interface PreviewKopSuratProps {
  identity: DocumentIdentity;
  selectedDoc: PreviewDocType;
  currentPromesSemester: 1 | 2;
}

export const PreviewKopSurat: React.FC<PreviewKopSuratProps> = ({
  identity,
  selectedDoc,
  currentPromesSemester,
}) => {
  return (
    <>
      {/* Official Kop Surat Kementerian Agama & Madrasah */}
      <div className="pb-2.5 border-b-4 border-double border-slate-900">
        <div className="flex items-center justify-between gap-4">
          {/* Logo Madrasah / Sekolah (Kiri) */}
          {(identity.showLogos ?? true) && (
            <div className="flex-shrink-0 flex items-center justify-center w-24 sm:w-28 print:w-28 h-16 sm:h-20 print:h-20">
              <img
                src="/logo_sekolah.png"
                alt="Logo Madrasah"
                className="h-full w-auto max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            </div>
          )}

          {/* Teks Kop Surat Resmi Kemenag & Madrasah (Tengah) */}
          <div className="flex-1 text-center px-2">
            <p className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-800">
              {identity.ministryName || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}
            </p>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-800 mt-0.5">
              {identity.regionalOffice || 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN'}
            </p>
            <h2 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wide text-slate-950 mt-1 font-serif">
              {identity.schoolName || 'MADRASAH IBTIDAIYAH AL IRSYAD KOTA MADIUN'}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-700 mt-0.5 leading-snug">
              {identity.schoolAddress || 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122'}
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-sans">
              {[
                identity.schoolPhone ? `Telp: ${identity.schoolPhone}` : 'Telp: (0351) 463765',
                identity.schoolEmail ? `Email: ${identity.schoolEmail}` : 'Email: mialirsyadkotamadiun@gmail.com',
                identity.schoolWebsite ? `Website: ${identity.schoolWebsite}` : 'Website: mialirsyadkotamadiun.sch.id',
              ].join(' | ')}
            </p>
          </div>

          {/* Logo Kemenag (Kanan) */}
          {(identity.showLogos ?? true) && (
            <div className="flex-shrink-0 flex items-center justify-center w-20 sm:w-24 print:w-24 h-16 sm:h-20 print:h-20">
              <img
                src="/logo_kemenag.png"
                alt="Logo Kemenag"
                className="h-full w-auto max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-2.5">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
          {selectedDoc === 'PROTA'
            ? 'PROGRAM TAHUNAN (PROTA)'
            : `PROGRAM SEMESTER (PROMES) — SEMESTER ${currentPromesSemester === 1 ? '1 (GANJIL)' : '2 (GENAP)'}`}
        </h3>
        <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
          TAHUN AJARAN {identity.academicYear}
        </p>
      </div>

      {/* Identity Metadata Table (Pas Kanan Kiri) */}
      <div className="text-[11px] flex justify-between items-start mb-3 border border-slate-300 p-2 rounded bg-slate-50/50 w-full">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 font-medium text-slate-600">Satuan Pendidikan</span>
            <span>: <strong>{identity.schoolName || 'MI AL IRSYAD KOTA MADIUN'}</strong></span>
          </div>
          <div className="flex">
            <span className="w-28 font-medium text-slate-600">Mata Pelajaran</span>
            <span>: <strong>{identity.subject}</strong></span>
          </div>
          <div className="flex">
            <span className="w-28 font-medium text-slate-600">Kelas / Fase</span>
            <span>: {identity.gradeLevel} {identity.phase ? `(${identity.phase})` : ''}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-24 font-medium text-slate-600">Kurikulum</span>
            <span>: {identity.curriculum === 'K13' ? 'Kurikulum 2013' : 'Kurikulum Merdeka'}</span>
          </div>
          <div className="flex">
            <span className="w-24 font-medium text-slate-600">Tahun Ajaran</span>
            <span>: {identity.academicYear}</span>
          </div>
          <div className="flex">
            <span className="w-24 font-medium text-slate-600">Semester</span>
            <span>: {selectedDoc === 'PROTA' ? '1 (Ganjil) & 2 (Genap)' : (currentPromesSemester === 1 ? '1 (Ganjil)' : '2 (Genap)')}</span>
          </div>
        </div>
      </div>
    </>
  );
};
