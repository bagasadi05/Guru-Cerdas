import React from 'react';
import { Building } from 'lucide-react';
import type { DocumentIdentity } from '../../../../../types/perangkatAjar';

interface PreviewIdentityEditorProps {
  identity: DocumentIdentity;
  onUpdateIdentity: (updates: Partial<DocumentIdentity>) => void;
  onClose: () => void;
}

export const PreviewIdentityEditor: React.FC<PreviewIdentityEditorProps> = ({
  identity,
  onUpdateIdentity,
  onClose,
}) => {
  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5 print:hidden animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Kop Surat Sekolah & Tanda Tangan Resmi</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Sesuaikan data sekolah dan pihak penandatangan agar dokumen siap diarsipkan dan dicetak.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </div>

      {/* Section 1: Instansi & Lembaga Kemenag */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
          1. Instansi Pembina & Nama Satuan Pendidikan
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Kementerian / Dinas Pendidikan Pembina
            </label>
            <input
              type="text"
              value={identity.ministryName ?? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}
              onChange={(e) => onUpdateIdentity({ ministryName: e.target.value })}
              placeholder="KEMENTERIAN AGAMA REPUBLIK INDONESIA"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Kantor Wilayah / Cabang Dinas
            </label>
            <input
              type="text"
              value={identity.regionalOffice ?? 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN'}
              onChange={(e) => onUpdateIdentity({ regionalOffice: e.target.value })}
              placeholder="KANTOR KEMENTERIAN AGAMA KOTA MADIUN"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nama Sekolah / Madrasah
            </label>
            <input
              type="text"
              value={identity.schoolName}
              onChange={(e) => onUpdateIdentity({ schoolName: e.target.value })}
              placeholder="MI AL IRSYAD KOTA MADIUN"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Alamat & Kontak Madrasah */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
          2. Alamat Lengkap & Kontak Resmi
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Alamat Lengkap (Jalan, Kelurahan, Kecamatan)
            </label>
            <input
              type="text"
              value={identity.schoolAddress}
              onChange={(e) => onUpdateIdentity({ schoolAddress: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Kota / Kabupaten
            </label>
            <input
              type="text"
              value={identity.city}
              onChange={(e) => onUpdateIdentity({ city: e.target.value })}
              placeholder="Madiun"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nomor Telepon Kantor
            </label>
            <input
              type="text"
              value={identity.schoolPhone ?? '(0351) 463765'}
              onChange={(e) => onUpdateIdentity({ schoolPhone: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Email Resmi Sekolah / Madrasah
            </label>
            <input
              type="text"
              value={identity.schoolEmail ?? 'mialirsyadkotamadiun@gmail.com'}
              onChange={(e) => onUpdateIdentity({ schoolEmail: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Website / Halaman Web
            </label>
            <input
              type="text"
              value={identity.schoolWebsite ?? 'mialirsyadkotamadiun.sch.id'}
              onChange={(e) => onUpdateIdentity({ schoolWebsite: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center pt-5 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={identity.showLogos ?? true}
                onChange={(e) => onUpdateIdentity({ showLogos: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Tampilkan Logo Instansi & Logo Sekolah pada Kop Surat</span>
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: Penandatanganan Dokumen */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
          3. Pihak Penandatangan Resmi Dokumen
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Sebutan Jabatan Pimpinan
            </label>
            <input
              type="text"
              value={identity.principalRole ?? 'Kepala Madrasah'}
              onChange={(e) => onUpdateIdentity({ principalRole: e.target.value })}
              placeholder="Kepala Madrasah / Kepala Sekolah"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nama Lengkap Pimpinan & Gelar
            </label>
            <input
              type="text"
              value={identity.principalName}
              onChange={(e) => onUpdateIdentity({ principalName: e.target.value })}
              placeholder="H. Masturi, S.Pd.I."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              NIP / NPK Pimpinan
            </label>
            <input
              type="text"
              value={identity.principalNip}
              onChange={(e) => onUpdateIdentity({ principalNip: e.target.value })}
              placeholder="-"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Tanggal Pengesahan Dokumen
            </label>
            <input
              type="text"
              value={identity.signatureDate}
              onChange={(e) => onUpdateIdentity({ signatureDate: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Sebutan Jabatan Guru
            </label>
            <input
              type="text"
              value={identity.teacherRole ?? 'Guru Mata Pelajaran'}
              onChange={(e) => onUpdateIdentity({ teacherRole: e.target.value })}
              placeholder="Guru Mata Pelajaran / Guru Kelas"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nama Lengkap Guru Pengampu & Gelar
            </label>
            <input
              type="text"
              value={identity.teacherName}
              onChange={(e) => onUpdateIdentity({ teacherName: e.target.value })}
              placeholder="Bagas Riyadi, S.Pd"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              NIP / NPK Guru Pengampu
            </label>
            <input
              type="text"
              value={identity.teacherNip}
              onChange={(e) => onUpdateIdentity({ teacherNip: e.target.value })}
              placeholder="-"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
