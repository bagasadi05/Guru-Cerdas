import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '../../../../hooks/useToast';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
  KaldikWeek,
  MatrixCell,
} from '../../../../types/perangkatAjar';
import { exportProtaToPdf } from '../../../../utils/protaPdfExport';
import { exportPromesToPdf } from '../../../../utils/promesPdfExport';

// exportPerangkatAjar pulls in docx/JSZip (~400 KB); load it only on export.
const loadOfficeExport = () => import('../../../../utils/exportPerangkatAjar');

export const MONTH_NAMES_SEM_1 = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const MONTH_NAMES_SEM_2 = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

export type PreviewDocType = 'PROTA' | 'PROMES_1' | 'PROMES_2';
export type PreviewOrientation = 'landscape' | 'portrait';

interface UsePreviewTabExportParams {
  identity: DocumentIdentity;
  protaItems: ProtaItem[];
  validation: ProtaValidationResult;
  kaldikWeeks: KaldikWeek[];
  promesCells: MatrixCell[];
  promesCellsSem2?: MatrixCell[];
}

export function usePreviewTabExport({
  identity,
  protaItems,
  validation,
  kaldikWeeks,
  promesCells,
  promesCellsSem2,
}: UsePreviewTabExportParams) {
  const toast = useToast();
  const [selectedDoc, setSelectedDoc] = useState<PreviewDocType>('PROTA');
  const [orientation, setOrientation] = useState<PreviewOrientation>('landscape');
  const [showIdentityEditor, setShowIdentityEditor] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Helper to determine cells for a requested semester
  const getPromesCellsForSemester = (sem: 1 | 2): MatrixCell[] =>
    sem === 2 ? promesCellsSem2 ?? [] : promesCells;

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
      const { exportProtaToExcel, exportPromesToExcel } = await loadOfficeExport();
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
      const { exportProtaToWord, exportPromesToWord } = await loadOfficeExport();
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

  const handleExportPdf = async () => {
    setIsExporting('PDF');
    try {
      if (selectedDoc === 'PROTA') {
        // PROTA: Programmatic vector PDF (crisp, professional)
        await exportProtaToPdf({ identity, protaItems, validation });
        toast.success('File PDF Prota berhasil diunduh!');
      } else {
        // PROMES: Programmatic vector PDF with 30-week matrix
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

  const currentPromesSemester: 1 | 2 = selectedDoc === 'PROMES_2' ? 2 : 1;
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

  return {
    selectedDoc,
    setSelectedDoc,
    orientation,
    setOrientation,
    showIdentityEditor,
    setShowIdentityEditor,
    isExporting,
    printRef,
    handleExportExcel,
    handleExportWord,
    handleExportPdf,
    handlePrint,
    currentPromesSemester,
    currentPromesItems,
    monthNames,
    activePromesCells,
    protaSem1Items,
    protaSem2Items,
    totalJpSem1,
    totalJpSem2,
    totalPromesTargetJp,
  };
}
