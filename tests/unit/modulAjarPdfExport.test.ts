import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportModulAjarToPdf } from '../../src/components/pages/modul-ajar/utils/pdfExport';
import * as dynamicImports from '../../src/utils/dynamicImports';

describe('exportModulAjarToPdf', () => {
  let mockSave: ReturnType<typeof vi.fn>;
  let mockHtml: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSave = vi.fn();
    mockHtml = vi.fn((_element, options) => {
      if (options?.callback) {
        options.callback({ save: mockSave });
      }
      return Promise.resolve();
    });

    const mockJsPdfInstance = {
      html: mockHtml,
      save: mockSave,
    };

    class MockJsPDF {
      constructor() {
        return mockJsPdfInstance;
      }
    }

    vi.spyOn(dynamicImports, 'getJsPDF').mockResolvedValue({ default: MockJsPDF as any } as any);
    vi.spyOn(dynamicImports, 'getHtml2Canvas').mockResolvedValue({ default: vi.fn() } as any);
  });

  it('throws an error if htmlContent is empty', async () => {
    await expect(exportModulAjarToPdf({ htmlContent: '', fileName: 'test.pdf' })).rejects.toThrow('Konten dokumen kosong');
  });

  it('renders HTML to PDF and saves with correct filename', async () => {
    await exportModulAjarToPdf({
      htmlContent: '<div>Modul Ajar Content</div>',
      fileName: 'Modul_Ajar_Kelas_3',
      paperSize: 'A4',
    });

    expect(dynamicImports.getJsPDF).toHaveBeenCalled();
    expect(mockHtml).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith('Modul_Ajar_Kelas_3.pdf');
  });

  it('cleans up staging container from DOM after export', async () => {
    const initialBodyChildren = document.body.children.length;

    await exportModulAjarToPdf({
      htmlContent: '<div>Cleanup Test</div>',
      fileName: 'cleanup.pdf',
    });

    expect(document.body.children.length).toBe(initialBodyChildren);
  });
});
