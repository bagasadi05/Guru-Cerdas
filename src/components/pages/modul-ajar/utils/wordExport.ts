import { parseDocumentHtml } from '../../../../lib/modulAjarExport/documentTree';
import type { LessonPlanExportData } from '../../../../lib/modulAjarExport/types';
import { downloadBlob } from '../../../../services/documentExportService';

export interface ExportModulAjarWordOptions {
  htmlContent: string;
  fileName: string;
  paperSize?: 'A4' | 'F4';
  title?: string;
}

/** Downloads a native DOCX from the live document, including unsaved preview edits. */
export async function exportModulAjarToWord({
  htmlContent, fileName, paperSize = 'A4', title = 'Modul Ajar',
}: ExportModulAjarWordOptions): Promise<void> {
  if (!htmlContent.trim()) throw new Error('Konten dokumen kosong.');
  const [{ Packer }, { buildModulAjarDocx }] = await Promise.all([
    import('docx'), import('../../../../lib/modulAjarExport/docxBuilder'),
  ]);
  const data: LessonPlanExportData = {
    lessonPlanId: '', paperSize, variant: 'guru', body: parseDocumentHtml(htmlContent),
    identity: { documentType: title, mataPelajaran: '', topik: '', kelas: '', fase: '',
      satuanPendidikan: '', tahunAjaran: '', semester: '', guru: '' },
  };
  const safeName = fileName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').replace(/\.docx?$/i, '');
  const blob = await Packer.toBlob(buildModulAjarDocx(data));
  downloadBlob(blob, `${safeName}.docx`);
}
