import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportModulAjarToPdf } from '../../src/components/pages/modul-ajar/utils/pdfExport';
import * as dynamicImports from '../../src/utils/dynamicImports';

describe('exportModulAjarToPdf', () => {
  let mockSave: ReturnType<typeof vi.fn>;
  let mockAddImage: ReturnType<typeof vi.fn>;
  let mockAddPage: ReturnType<typeof vi.fn>;
  let mockHtml2Canvas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSave = vi.fn();
    mockAddImage = vi.fn();
    mockAddPage = vi.fn();
    mockHtml2Canvas = vi.fn().mockResolvedValue({ width: 1588, height: 2246 });

    class MockJsPDF {
      save = mockSave;
      addImage = mockAddImage;
      addPage = mockAddPage;
    }

    vi.spyOn(dynamicImports, 'getJsPDF').mockResolvedValue({ default: MockJsPDF } as never);
    vi.spyOn(dynamicImports, 'getHtml2Canvas').mockResolvedValue({
      default: mockHtml2Canvas,
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,pdf-page',
    );
  });

  it('throws an error if htmlContent is empty', async () => {
    await expect(exportModulAjarToPdf({ htmlContent: '', fileName: 'test.pdf' })).rejects.toThrow(
      'Konten dokumen kosong',
    );
  });

  it('scales content into printable pages and saves with the requested filename', async () => {
    await exportModulAjarToPdf({
      htmlContent: '<div>Modul Ajar Content</div>',
      fileName: 'Modul_Ajar_Kelas_3',
      paperSize: 'A4',
    });
    expect(mockHtml2Canvas).toHaveBeenCalledOnce();
    expect(mockAddImage).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith('Modul_Ajar_Kelas_3.pdf');
  });

  it('uses a second PDF page when rendered content exceeds one printable page', async () => {
    mockHtml2Canvas.mockResolvedValueOnce({ width: 1588, height: 5000 });
    await exportModulAjarToPdf({
      htmlContent: '<section>Konten panjang</section>',
      fileName: 'panjang.pdf',
    });
    expect(mockAddPage).toHaveBeenCalled();
    expect(mockAddImage).toHaveBeenCalledTimes(mockAddPage.mock.calls.length + 1);
  });

  it('cleans up the staging container after export', async () => {
    const initialBodyChildren = document.body.children.length;
    await exportModulAjarToPdf({ htmlContent: '<div>Cleanup Test</div>', fileName: 'cleanup.pdf' });
    expect(document.body.children.length).toBe(initialBodyChildren);
  });
});
