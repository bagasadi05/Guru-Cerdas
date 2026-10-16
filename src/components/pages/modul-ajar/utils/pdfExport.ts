import { printModulAjarHtml } from './printDocument';

export interface ExportModulAjarPdfOptions {
  htmlContent: string;
  fileName: string;
  paperSize?: 'A4' | 'F4';
}

/** Uses native print pagination when the server PDF exporter is disabled. */
export async function exportModulAjarToPdf({
  htmlContent, fileName, paperSize = 'A4',
}: ExportModulAjarPdfOptions): Promise<void> {
  if (!htmlContent.trim()) throw new Error('Konten dokumen kosong.');
  if (!printModulAjarHtml(htmlContent, paperSize, fileName.replace(/\.pdf$/i, ''))) {
    throw new Error('Jendela PDF diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.');
  }
}
