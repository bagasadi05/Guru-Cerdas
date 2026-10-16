import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportModulAjarToPdf } from '../../src/components/pages/modul-ajar/utils/pdfExport';

afterEach(() => vi.restoreAllMocks());

describe('native PDF fallback', () => {
  it('rejects an empty document', async () => {
    await expect(exportModulAjarToPdf({ htmlContent: '', fileName: 'empty' })).rejects.toThrow('Konten dokumen kosong');
  });
  it('reports a blocked print window', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    await expect(exportModulAjarToPdf({ htmlContent: '<p>Isi</p>', fileName: 'test' })).rejects.toThrow('diblokir');
  });
  it('hands safe HTML, explicit breaks, F4 geometry and margins to native printing', async () => {
    const popupDocument = document.implementation.createHTMLDocument();
    const print = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: popupDocument, focus: vi.fn(), print, closed: false,
    } as unknown as Window);
    await exportModulAjarToPdf({
      htmlContent: '<div style="page-break-after: always">Sampul</div><p>Isi</p><script>unsafe</script>',
      fileName: 'Modul.pdf', paperSize: 'F4',
    });
    const source = popupDocument.documentElement.outerHTML;
    expect(source).toContain('215mm 330mm');
    expect(source).toContain('margin: 20mm');
    expect(source).toContain('page-break-after: always');
    expect(source).not.toContain('<script');
    expect(popupDocument.title).toBe('Modul');
    await vi.waitFor(() => expect(print).toHaveBeenCalledOnce());
  });
});
