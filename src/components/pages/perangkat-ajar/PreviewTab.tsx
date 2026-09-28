import React, { useState, useRef } from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
  Sliders,
  Building,
  LayoutGrid,
  Info,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '../../../hooks/useToast';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
  KaldikWeek,
  MatrixCell,
} from '../../../types/perangkatAjar';
import {
  exportProtaToExcel,
  exportPromesToExcel,
  exportProtaToWord,
  exportPromesToWord,
} from '../../../utils/exportPerangkatAjar';
import { exportProtaToPdf } from '../../../utils/protaPdfExport';
import { exportPromesToPdf } from '../../../utils/promesPdfExport';

const MONTH_NAMES_SEM_1 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_NAMES_SEM_2 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

interface PreviewTabProps {
  identity: DocumentIdentity;
  onUpdateIdentity: (updates: Partial<DocumentIdentity>) => void;
  protaItems: ProtaItem[];
  validation: ProtaValidationResult;
  kaldikWeeks: KaldikWeek[];
  promesCells: MatrixCell[];
  promesCellsSem2?: MatrixCell[];
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  identity,
  onUpdateIdentity,
  protaItems,
  validation,
  kaldikWeeks,
  promesCells,
  promesCellsSem2,
}) => {
  const toast = useToast();
  const [selectedDoc, setSelectedDoc] = useState<'PROTA' | 'PROMES_1' | 'PROMES_2'>('PROTA');
  // Default orientation is Landscape as required for A4 landscape teacher documents
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showIdentityEditor, setShowIdentityEditor] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Helper to determine cells for a requested semester
  const getPromesCellsForSemester = (sem: 1 | 2): MatrixCell[] => {
    if (sem === 2 && promesCellsSem2 && promesCellsSem2.length > 0) {
      return promesCellsSem2;
    }
    return promesCells;
  };

  // Safe file download helper with delay before revoking Object URL
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 1500);
  };

  const handleExportExcel = async () => {
    setIsExporting('EXCEL');
    try {
      if (selectedDoc === 'PROTA') {
        const blob = await exportProtaToExcel({
          identity,
          items: protaItems,
          validation,
        });
        downloadBlob(blob, `Prota_${identity.subject.replace(/\s+/g, '_')}_${identity.gradeLevel}.xlsx`);
      } else {
        const sem = selectedDoc === 'PROMES_1' ? 1 : 2;
        const targetCells = getPromesCellsForSemester(sem);
        const blob = await exportPromesToExcel({
          identity: { ...identity, semesterNumber: sem },
          items: protaItems,
          weeks: kaldikWeeks,
          cells: targetCells,
        });
        downloadBlob(blob, `Promes_Sem${sem}_${identity.subject.replace(/\s+/g, '_')}_${identity.gradeLevel}.xlsx`);
      }
      toast.success('File Microsoft Excel (.xlsx) berhasil diunduh!');
    } catch (err) {
      console.error('Excel Export Error:', err);
      toast.error('Gagal mengekspor file Excel. Silakan periksa koneksi atau coba kembali.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportWord = async () => {
    setIsExporting('WORD');
    try {
      if (selectedDoc === 'PROTA') {
        const blob = await exportProtaToWord({
          identity,
          items: protaItems,
          validation,
        });
        downloadBlob(blob, `Prota_${identity.subject.replace(/\s+/g, '_')}_${identity.gradeLevel}.docx`);
      } else {
        const sem = selectedDoc === 'PROMES_1' ? 1 : 2;
        const targetCells = getPromesCellsForSemester(sem);
        const blob = await exportPromesToWord({
          identity: { ...identity, semesterNumber: sem },
          items: protaItems,
          weeks: kaldikWeeks,
          cells: targetCells,
        });
        downloadBlob(blob, `Promes_Sem${sem}_${identity.subject.replace(/\s+/g, '_')}_${identity.gradeLevel}.docx`);
      }
      toast.success('File Microsoft Word (.docx) berhasil diunduh!');
    } catch (err) {
      console.error('Word Export Error:', err);
      toast.error('Gagal mengekspor file Word. Silakan coba kembali.');
    } finally {
      setIsExporting(null);
    }
  };

  /**
   * PDF Export Engine
   *
   * For PROTA: Uses programmatic jsPDF + jspdf-autotable (same as Rapor, Jurnal,
   *   Jadwal modules) → produces crisp vector text, proper tables, embedded logos.
   *
   * For PROMES: Falls back to html2canvas screenshot of the live 30-week matrix
   *   grid (too complex for programmatic layout), with base64 image pre-inlining.
   */
  const handleExportPdf = async () => {
    setIsExporting('PDF');
    try {
      if (selectedDoc === 'PROTA') {
        // ── PROTA: Programmatic vector PDF (crisp, professional) ──
        await exportProtaToPdf({ identity, protaItems, validation });
        toast.success('File PDF Prota berhasil diunduh!');
      } else {
        // ── PROMES: Programmatic vector PDF with 30-week matrix ──
        const sem = selectedDoc === 'PROMES_1' ? 1 : 2;
        const targetCells = getPromesCellsForSemester(sem);
        await exportPromesToPdf({
          identity,
          semesterNumber: sem,
          items: protaItems,
          kaldikWeeks,
          cells: targetCells,
        });
        toast.success(`File PDF Promes Semester ${sem} berhasil diunduh!`);
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Gagal membuat PDF otomatis. Mengalihkan ke menu cetak browser...');
      handlePrint();
    } finally {
      setIsExporting(null);
    }
  };

  // Dedicated Print Engine via react-to-print with dynamic A4 Landscape/Portrait page setup
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${selectedDoc}_${identity.subject.replace(/\s+/g, '_')}_${identity.gradeLevel}`,
    pageStyle: `
      @page {
        size: A4 ${orientation};
        margin: 8mm 10mm 8mm 10mm;
      }
      @media print {
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          font-family: 'Times New Roman', 'Arial', sans-serif !important;
        }
        #printable-document {
          box-shadow: none !important;
          border: none !important;
          width: 100% !important;
          max-width: none !important;
          min-height: auto !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        th, td {
          border: 1px solid #1e293b !important;
        }
        tr {
          page-break-inside: avoid;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
      }
    `,
  });

  const currentPromesSemester = selectedDoc === 'PROMES_2' ? 2 : 1;
  const currentPromesItems = protaItems
    .filter((i) => i.semesterNumber === currentPromesSemester)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const monthNames = currentPromesSemester === 1 ? MONTH_NAMES_SEM_1 : MONTH_NAMES_SEM_2;
  const activePromesCells = getPromesCellsForSemester(currentPromesSemester);

  // Prota items grouped by semester
  const protaSem1Items = protaItems
    .filter((i) => (i.semesterNumber ?? 1) === 1)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const protaSem2Items = protaItems
    .filter((i) => i.semesterNumber === 2)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const totalJpSem1 = protaSem1Items.reduce((acc, it) => acc + (it.targetJp || 0), 0);
  const totalJpSem2 = protaSem2Items.reduce((acc, it) => acc + (it.targetJp || 0), 0);
  const totalPromesTargetJp = currentPromesItems.reduce((acc, it) => acc + (it.targetJp || 0), 0);

  return (
    <div className="space-y-6">
      {/* Dynamic CSS injection for standard browser Ctrl+P fallback */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 8mm 10mm 8mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* 1. Action Toolbar & Document Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm print:hidden">
        {/* Document Tabs */}
        <div className="grid grid-cols-3 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedDoc('PROTA')}
            className={`px-2.5 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              selectedDoc === 'PROTA'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">Prota</span>
            <span className="hidden sm:inline">Program Tahunan (Prota)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDoc('PROMES_1');
              setOrientation('landscape');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              selectedDoc === 'PROMES_1'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">Promes 1</span>
            <span className="hidden sm:inline">Promes Semester 1</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDoc('PROMES_2');
              setOrientation('landscape');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
              selectedDoc === 'PROMES_2'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="sm:hidden">Promes 2</span>
            <span className="hidden sm:inline">Promes Semester 2</span>
          </button>
        </div>

        {/* Action Buttons & Orientation Selector */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Orientation Selector */}
          <div className="grid grid-cols-2 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="A4 Landscape (Mendatar: 297 × 210 mm) - Standar Resmi Promes"
            >
              <LayoutGrid className="w-3.5 h-3.5 rotate-90" />
              <span>A4 Landscape</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="A4 Portrait (Tegak: 210 × 297 mm)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 Portrait</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowIdentityEditor(!showIdentityEditor)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
              title="Atur kop surat sekolah dan pihak penandatangan dokumen"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Atur Kop & TTD</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting !== null}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors border border-rose-200 dark:border-rose-800 shadow-sm cursor-pointer active:scale-95"
              title="Unduh langsung sebagai dokumen PDF (.pdf) tanpa kotak dialog cetak"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>{isExporting === 'PDF' ? 'Menyiapkan...' : 'Unduh PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExporting !== null}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer active:scale-95"
              title="Ekspor dokumen resmi ke Microsoft Word (.docx)"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{isExporting === 'WORD' ? 'Mengunduh...' : 'Unduh Word'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting !== null}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer active:scale-95"
              title="Ekspor tabel dan rumus jam ke Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isExporting === 'EXCEL' ? 'Mengunduh...' : 'Unduh Excel'}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint()}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              title="Cetak langsung ke mesin printer fisik atau dialog cetak browser"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Identity Editor Panel */}
      {showIdentityEditor && (
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
              onClick={() => setShowIdentityEditor(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
      )}

      {/* 3. Live A4 Printable Document Container */}
      <div className="bg-slate-200/70 dark:bg-slate-950 p-2 sm:p-6 rounded-2xl flex flex-col items-center overflow-x-auto print:bg-white print:p-0">
        {/* Mobile Horizontal Swipe Hint */}
        <div className="sm:hidden w-full mb-2.5 px-3 py-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-300 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 print:hidden">
          <span className="text-sm">📱</span>
          <span>Pratinjau Cetak ({orientation === 'landscape' ? 'Landscape' : 'Portrait'}): Geser horizontal untuk melihat dokumen penuh.</span>
        </div>

        {/* Information bar above document preview */}
        <div className="flex flex-wrap items-center justify-between w-full max-w-[297mm] mb-3 px-1 text-xs text-slate-500 dark:text-slate-400 print:hidden gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Format: A4 {orientation === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium hidden sm:inline">
              ✓ Kop Resmi Kementerian Agama RI & Satuan Pendidikan
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Gunakan tombol cetak atau pintasan browser Ctrl+P</span>
          </div>
        </div>

        {/* Sheet Card */}
        <div
          ref={printRef}
          id="printable-document"
          className={`bg-white text-slate-900 shadow-2xl transition-all duration-300 mx-auto rounded-sm border border-slate-300 dark:border-slate-800 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0 ${
            orientation === 'landscape'
              ? 'w-[297mm] min-h-[210mm] p-5 sm:p-6'
              : 'w-[210mm] min-h-[297mm] p-6 sm:p-8'
          }`}
          style={{
            width: orientation === 'landscape' ? '297mm' : '210mm',
            minHeight: orientation === 'landscape' ? '210mm' : '297mm',
            boxSizing: 'border-box',
          }}
        >
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

          {/* Table Content */}
          {selectedDoc === 'PROTA' ? (
            /* ============================================================= */
            /* PROTA OFFICIAL LANDSCAPE TABLE                               */
            /* ============================================================= */
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse border border-slate-900 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                    <th className="border border-slate-900 py-1 px-2 w-10 text-center">No</th>
                    <th className="border border-slate-900 py-1 px-2 w-20 text-center">Semester</th>
                    <th className="border border-slate-900 py-1 px-2.5 w-36">
                      {identity.curriculum === 'K13' ? 'Kompetensi Inti' : 'Elemen / Domain'}
                    </th>
                    <th className="border border-slate-900 py-1 px-2.5">
                      {identity.curriculum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Alur Tujuan Pembelajaran (ATP / TP)'}
                    </th>
                    <th className="border border-slate-900 py-1 px-2.5 w-44">Materi Pokok</th>
                    <th className="border border-slate-900 py-1 px-2 w-20 text-center">Alokasi JP</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Semester 1 Items */}
                  {protaSem1Items.length > 0 && (
                    <>
                      <tr className="bg-slate-50/80 font-bold border-y border-slate-900">
                        <td colSpan={6} className="border border-slate-900 py-0.5 px-2.5 text-slate-700">
                          SEMESTER 1 (GANJIL)
                        </td>
                      </tr>
                      {protaSem1Items.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-900">
                          <td className="border border-slate-900 py-1 px-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-900 py-1 px-2 text-center">Sem. 1</td>
                          <td className="border border-slate-900 py-1 px-2.5 font-medium">
                            {item.elementOrDomain || '-'}
                          </td>
                          <td className="border border-slate-900 py-1 px-2.5">
                            <span className="font-bold">{item.learningObjectiveCode}: </span>
                            {item.learningObjectiveText}
                          </td>
                          <td className="border border-slate-900 py-1 px-2.5">{item.coreTopic || '-'}</td>
                          <td className="border border-slate-900 py-1 px-2 text-center font-bold">
                            {item.targetJp} JP
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100/60 font-semibold border-b border-slate-900">
                        <td colSpan={5} className="border border-slate-900 py-0.5 px-2.5 text-right">
                          Subtotal Semester 1
                        </td>
                        <td className="border border-slate-900 py-0.5 px-2 text-center font-bold">
                          {totalJpSem1} JP
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Semester 2 Items */}
                  {protaSem2Items.length > 0 && (
                    <>
                      <tr className="bg-slate-50/80 font-bold border-y border-slate-900">
                        <td colSpan={6} className="border border-slate-900 py-0.5 px-2.5 text-slate-700">
                          SEMESTER 2 (GENAP)
                        </td>
                      </tr>
                      {protaSem2Items.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-900">
                          <td className="border border-slate-900 py-1 px-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-900 py-1 px-2 text-center">Sem. 2</td>
                          <td className="border border-slate-900 py-1 px-2.5 font-medium">
                            {item.elementOrDomain || '-'}
                          </td>
                          <td className="border border-slate-900 py-1 px-2.5">
                            <span className="font-bold">{item.learningObjectiveCode}: </span>
                            {item.learningObjectiveText}
                          </td>
                          <td className="border border-slate-900 py-1 px-2.5">{item.coreTopic || '-'}</td>
                          <td className="border border-slate-900 py-1 px-2 text-center font-bold">
                            {item.targetJp} JP
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100/60 font-semibold border-b border-slate-900">
                        <td colSpan={5} className="border border-slate-900 py-0.5 px-2.5 text-right">
                          Subtotal Semester 2
                        </td>
                        <td className="border border-slate-900 py-0.5 px-2 text-center font-bold">
                          {totalJpSem2} JP
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={5} className="border border-slate-900 py-1 px-2.5 text-right">
                      TOTAL ALOKASI WAKTU TAHUNAN
                    </td>
                    <td className="border border-slate-900 py-1 px-2 text-center font-bold">
                      {validation.allocatedAnnualJp} JP
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            /* ============================================================= */
            /* PROMES OFFICIAL LANDSCAPE 30-WEEK MATRIX TABLE                */
            /* ============================================================= */
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-slate-900 text-[10px]">
                <thead>
                  {/* Tier 1 Header */}
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                    <th rowSpan={2} className="border border-slate-900 py-1.5 px-1 w-7 text-center">
                      No
                    </th>
                    <th rowSpan={2} className="border border-slate-900 py-1.5 px-2 w-24">
                      {identity.curriculum === 'K13' ? 'KI / KD' : 'Elemen'}
                    </th>
                    <th rowSpan={2} className="border border-slate-900 py-1.5 px-2">
                      Tujuan Pembelajaran (TP)
                    </th>
                    <th rowSpan={2} className="border border-slate-900 py-1.5 px-2 w-28">
                      Materi Pokok
                    </th>
                    <th rowSpan={2} className="border border-slate-900 py-1.5 px-1 w-10 text-center">
                      JP
                    </th>

                    {/* 6 Month Group Headers (5 Weeks each) */}
                    {monthNames.map((monthName, mIdx) => (
                      <th
                        key={mIdx}
                        colSpan={5}
                        className="border border-slate-900 py-1 px-1 text-center font-bold uppercase tracking-wider bg-slate-100 text-slate-900 text-[10px]"
                      >
                        {monthName}
                      </th>
                    ))}
                  </tr>

                  {/* Tier 2 Header: Weeks 1-5 per Month */}
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-900">
                    {monthNames.map((_, mIdx) =>
                      [1, 2, 3, 4, 5].map((w) => {
                        const kaldikMonth = currentPromesSemester === 1 ? mIdx + 7 : mIdx + 1;
                        const matchedWeek = kaldikWeeks.find(
                          (kw) => kw.month === kaldikMonth && kw.weekNumber === w
                        );
                        const isLocked = matchedWeek && matchedWeek.type !== 'KBM';

                        return (
                          <th
                            key={`${mIdx}-${w}`}
                            className={`border border-slate-900 py-0.5 px-0.5 w-[18px] text-center font-mono text-[9px] ${
                              isLocked ? 'bg-slate-200 text-slate-500' : 'bg-slate-50 text-slate-800'
                            }`}
                            title={isLocked && matchedWeek ? `Pekan Non-Efektif: ${matchedWeek.type}` : `Pekan ${w}`}
                          >
                            {w}
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>

                <tbody>
                  {currentPromesItems.length === 0 ? (
                    <tr>
                      <td colSpan={35} className="border border-slate-900 py-8 text-center text-slate-400 italic">
                        Belum ada Tujuan Pembelajaran untuk semester ini. Silakan tambahkan materi di tab Program Tahunan (Prota).
                      </td>
                    </tr>
                  ) : (
                    currentPromesItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-900">
                        <td className="border border-slate-900 py-1 px-1 text-center text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-900 py-1 px-2 font-medium">
                          {item.elementOrDomain || '-'}
                        </td>
                        <td className="border border-slate-900 py-1 px-2">
                          <span className="font-bold">{item.learningObjectiveCode}: </span>
                          {item.learningObjectiveText}
                        </td>
                        <td className="border border-slate-900 py-1 px-2">{item.coreTopic || '-'}</td>
                        <td className="border border-slate-900 py-1 px-1 text-center font-bold">
                          {item.targetJp}
                        </td>

                        {/* 30 Week Allocation Cells */}
                        {monthNames.map((_, mIdx) =>
                          [1, 2, 3, 4, 5].map((w) => {
                            const kaldikMonth = currentPromesSemester === 1 ? mIdx + 7 : mIdx + 1;
                            const matchedWeek = kaldikWeeks.find(
                              (kw) => kw.month === kaldikMonth && kw.weekNumber === w
                            );
                            const cell = activePromesCells.find(
                              (c) => c.rowId === item.id && c.monthIndex === mIdx && c.weekNumber === w
                            );
                            const isLocked = cell?.isLocked || (matchedWeek && matchedWeek.type !== 'KBM');

                            if (isLocked) {
                              return (
                                <td
                                  key={`${mIdx}-${w}`}
                                  className="border border-slate-900 py-0.5 px-0.5 text-center bg-slate-200 text-slate-400"
                                  title={`Pekan Non-Efektif (${matchedWeek?.type || 'Non-KBM'})`}
                                >
                                  {/* Shaded cell for locked week */}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`${mIdx}-${w}`}
                                className="border border-slate-900 py-0.5 px-0.5 text-center font-mono text-[9px]"
                              >
                                {cell && cell.allocatedJp > 0 ? (
                                  <span className="font-bold text-slate-900">{cell.allocatedJp}</span>
                                ) : (
                                  <span className="text-slate-200">·</span>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))
                  )}

                  {/* Total Weekly Sums Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={4} className="border border-slate-900 py-1 px-2 text-right">
                      JUMLAH ALOKASI JP MINGGUAN
                    </td>
                    <td className="border border-slate-900 py-1 px-1 text-center font-bold">
                      {totalPromesTargetJp}
                    </td>

                    {/* 30 Column Sums */}
                    {monthNames.map((_, mIdx) =>
                      [1, 2, 3, 4, 5].map((w) => {
                        const kaldikMonth = currentPromesSemester === 1 ? mIdx + 7 : mIdx + 1;
                        const matchedWeek = kaldikWeeks.find(
                          (kw) => kw.month === kaldikMonth && kw.weekNumber === w
                        );
                        const isLocked = matchedWeek && matchedWeek.type !== 'KBM';

                        const colSum = activePromesCells
                          .filter((c) => c.monthIndex === mIdx && c.weekNumber === w)
                          .reduce((sum, c) => sum + (c.allocatedJp || 0), 0);

                        return (
                          <td
                            key={`sum-${mIdx}-${w}`}
                            className={`border border-slate-900 py-0.5 px-0.5 text-center font-mono text-[9px] ${
                              isLocked ? 'bg-slate-200' : ''
                            }`}
                          >
                            {!isLocked && colSum > 0 ? <span className="font-bold">{colSum}</span> : ''}
                          </td>
                        );
                      })
                    )}
                  </tr>
                </tbody>
              </table>

              {/* Shaded legend footnote */}
              <p className="text-[10px] text-slate-600 italic mt-1.5">
                * Keterangan: Kolom berlatar belakang abu-abu adalah pekan non-efektif (libur semester, jeda tengah semester, asesmen, atau peringatan hari besar) sesuai Kalender Pendidikan.
              </p>
            </div>
          )}

          {/* Official Signatures Block (Pas Kanan Kiri Sejajar Batas Tabel) */}
          <div className="flex justify-between items-start text-xs pt-3 mt-3 w-full break-inside-avoid">
            <div className="text-left space-y-0.5">
              <p>Mengetahui,</p>
              <p>{identity.principalRole || 'Kepala Madrasah'}</p>
              <div className="h-10" />
              <p className="font-bold underline">{identity.principalName || 'H. Masturi, S.Pd.I.'}</p>
              <p>{identity.principalNip && identity.principalNip !== '-' ? `NIP. ${identity.principalNip}` : 'NIP. -'}</p>
            </div>

            <div className="text-left space-y-0.5">
              <p>
                {identity.city || 'Madiun'}, {identity.signatureDate || new Date().toLocaleDateString('id-ID')}
              </p>
              <p>{identity.teacherRole || 'Guru Mata Pelajaran'}</p>
              <div className="h-10" />
              <p className="font-bold underline">{identity.teacherName || 'Bagas Riyadi, S.Pd'}</p>
              <p>{identity.teacherNip && identity.teacherNip !== '-' ? `NIP. ${identity.teacherNip}` : 'NIP. -'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
