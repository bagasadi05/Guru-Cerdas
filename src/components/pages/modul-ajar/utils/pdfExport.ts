import { getJsPDF, getHtml2Canvas } from '../../../../utils/dynamicImports';

export interface ExportModulAjarPdfOptions {
  htmlContent: string;
  fileName: string;
  paperSize?: 'A4' | 'F4';
}

/**
 * Directly renders and downloads the Modul Ajar HTML as a PDF document (.pdf)
 * without triggering the browser's native print preview dialog.
 */
export async function exportModulAjarToPdf({
  htmlContent,
  fileName,
  paperSize = 'A4',
}: ExportModulAjarPdfOptions): Promise<void> {
  if (!htmlContent) {
    throw new Error('Konten dokumen kosong.');
  }

  const { default: jsPDF } = await getJsPDF();
  const html2canvasModule = await getHtml2Canvas();
  const html2canvas = html2canvasModule.default || html2canvasModule;

  // Ensure html2canvas is available on window for jsPDF internal html worker
  if (typeof window !== 'undefined' && !(window as any).html2canvas) {
    (window as any).html2canvas = html2canvas;
  }

  const isF4 = paperSize === 'F4';
  // A4: 595.28 x 841.89 pt | F4: 612 x 936 pt
  const pdfFormat: [number, number] = isF4 ? [612, 936] : [595.28, 841.89];

  // Create an off-screen staging element with standard paper width (794px ~ 210mm @ 96DPI)
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Times New Roman', Times, serif";
  container.innerHTML = htmlContent;

  document.body.appendChild(container);

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: pdfFormat,
    });

    await new Promise<void>((resolve, reject) => {
      doc.html(container, {
        callback: (pdfDoc) => {
          try {
            const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
            pdfDoc.save(cleanName);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        x: 0,
        y: 0,
        width: pdfFormat[0],
        windowWidth: 794,
        autoPaging: 'text',
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
        },
        margin: [28, 28, 28, 28],
      });
    });
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
