import { sanitizeContent } from '../../../../services/securityEnhanced';
import { getJsPDF, getHtml2Canvas } from '../../../../utils/dynamicImports';

export interface ExportModulAjarPdfOptions {
  htmlContent: string;
  fileName: string;
  paperSize?: 'A4' | 'F4';
}

/** Renders the Modul Ajar HTML to page-sized PDF images with fixed printable margins. */
export async function exportModulAjarToPdf({
  htmlContent,
  fileName,
  paperSize = 'A4',
}: ExportModulAjarPdfOptions): Promise<void> {
  if (!htmlContent) throw new Error('Konten dokumen kosong.');

  const [{ default: jsPDF }, html2canvasModule] = await Promise.all([getJsPDF(), getHtml2Canvas()]);
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const pdfFormat: [number, number] = paperSize === 'F4' ? [612, 936] : [595.28, 841.89];
  const margin = 28;
  const printableWidth = pdfFormat[0] - margin * 2;
  const printableHeight = pdfFormat[1] - margin * 2;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Times New Roman', Times, serif";
  container.innerHTML = sanitizeContent(htmlContent);
  document.body.appendChild(container);

  try {
    const renderedCanvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
    if (!renderedCanvas.width || !renderedCanvas.height)
      throw new Error('Konten dokumen tidak dapat dirender.');

    const sourcePageHeight = Math.floor((printableHeight / printableWidth) * renderedCanvas.width);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: pdfFormat });

    for (
      let sourceY = 0, pageIndex = 0;
      sourceY < renderedCanvas.height;
      sourceY += sourcePageHeight, pageIndex += 1
    ) {
      const sliceHeight = Math.min(sourcePageHeight, renderedCanvas.height - sourceY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = renderedCanvas.width;
      pageCanvas.height = sliceHeight;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('Kanvas PDF tidak tersedia.');
      context.drawImage(
        renderedCanvas,
        0,
        sourceY,
        renderedCanvas.width,
        sliceHeight,
        0,
        0,
        renderedCanvas.width,
        sliceHeight,
      );

      if (pageIndex > 0) doc.addPage(pdfFormat);
      doc.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        printableWidth,
        (sliceHeight / renderedCanvas.width) * printableWidth,
        undefined,
        'FAST',
      );
    }

    doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } finally {
    container.remove();
  }
}
