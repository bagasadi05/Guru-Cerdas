import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportToCSV } from '../../src/utils/exportUtils';

describe('student CSV download', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads actual CSV bytes with quoting and formula protection', async () => {
    let downloadedBlob: Blob | undefined;
    let filename = '';
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn((blob: Blob) => { downloadedBlob = blob; return 'blob:test'; });
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download;
    });

    await exportToCSV([
      { Nama: 'Siswa, "Contoh"', NISN: '0012345678', Catatan: '=1+1' },
    ], 'Data_Siswa_Kelas_A');

    expect(filename).toBe('Data_Siswa_Kelas_A.csv');
    expect(downloadedBlob?.type).toBe('text/csv');
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(downloadedBlob!);
    });
    expect(content).toBe('Nama,NISN,Catatan\n"Siswa, ""Contoh""",0012345678,\'=1+1');
  });
});
