import { parseDocumentHtml } from '../../../../lib/modulAjarExport/documentTree';
import { renderPrintHtml } from '../../../../lib/modulAjarExport/printTemplate';

/** Opens native browser printing with the shared A4/F4 layout; false means a blocked pop-up. */
export const printModulAjarHtml = (
  html: string, paperSize: 'A4' | 'F4' | undefined, title = 'Modul Ajar',
): boolean => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return false;
  const source = renderPrintHtml({
    lessonPlanId: '', paperSize: paperSize ?? 'A4', variant: 'guru',
    body: parseDocumentHtml(html),
    identity: { documentType: title, mataPelajaran: '', topik: '', kelas: '', fase: '',
      satuanPendidikan: '', tahunAjaran: '', semester: '', guru: '' },
  });
  printWindow.document.write(source);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint = () => printWindow.close();
  // Wait for embedded images and fonts before handing pagination to the browser.
  const images = Array.from(printWindow.document.images).map(image =>
    image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    }));
  void Promise.all([printWindow.document.fonts?.ready, ...images]).then(() => {
    if (!printWindow.closed) printWindow.print();
  }).catch(error => console.error('Failed to print document:', error));
  return true;
};
