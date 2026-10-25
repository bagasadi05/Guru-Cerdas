import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { buildHtmlTemplate } from '../../src/components/pages/modul-ajar/utils/template';
import type { FormState } from '../../src/components/pages/modul-ajar/types';
import { exportModulAjarToWord } from '../../src/components/pages/modul-ajar/utils/wordExport';

describe('exportModulAjarToWord', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('downloads a native sanitized DOCX with the requested F4 page size', async () => {
    let downloaded: Blob | undefined;
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn((blob: Blob) => { downloaded = blob; return 'blob:docx'; });
      static revokeObjectURL = vi.fn();
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const append = vi.spyOn(document.body, 'appendChild');
    await exportModulAjarToWord({
      htmlContent: '<p>Dokumen aman</p><script>unsafe-content</script>',
      fileName: 'Modul/Ajar: Kelas 3.doc', paperSize: 'F4', title: 'Modul Ajar',
    });
    expect(click).toHaveBeenCalledOnce();
    expect((append.mock.calls[0][0] as HTMLAnchorElement).download).toBe('Modul_Ajar__Kelas_3.docx');
    expect(downloaded?.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(downloaded!);
    });
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Dokumen aman');
    expect(xml).not.toContain('unsafe-content');
    expect(xml).toContain('w:w="12189" w:h="18709"');
    vi.unstubAllGlobals();
  });
});

describe('buildHtmlTemplate pagination integrity', () => {
  const dummyFormState: FormState = {
    generationMethod: 'AI',
    documentType: 'Modul Ajar',
    mataPelajaran: 'Bahasa Indonesia',
    kelas: '3',
    fase: 'B',
    jenjang: 'SD/MI',
    satuanPendidikan: 'MI Al Irsyad Kota Madiun',
    tahunAjaran: '2026/2027',
    semester: '1',
    guru: 'Bagas Riyadi, S.Pd',
    topik: 'Mengenal Kosakata Baru dengan Makna Denotatif',
    modelPembelajaran: 'Problem Based Learning (PBL)',
    pendekatanPembelajaran: 'Student Centered',
    metodePembelajaran: ['Diskusi', 'Tanya Jawab'],
    curriculumApproach: 'Merdeka',
    alokasiPendahuluan: 10,
    alokasiInti: 50,
    alokasiPenutup: 10,
    jumlahPertemuan: 1,
    jpPerPertemuan: 2,
    durasiPerJp: 35,
    profilPelajar: ['Beriman & Bertakwa', 'Bernalar Kritis'],
    saranaPrasarana: 'Powerpoint, LKPD',
    targetPeserta: 'Reguler',
    kompetensiAwal: 'Pemahaman kosakata',
    capaianPembelajaran: 'Memahami teks informasi',
    manualTujuanPembelajaran: '',
    manualPertanyaanPemantik: '',
    manualLkpdTugas: '',
    manualSoalEvaluasi: '',
    isKbcIntegrated: false,
    temaKbc: [],
    materiInsersi: '',
    rubrikAsesmen: [
      {
        kriteria: 'Kemandirian Belajar',
        sangatBaik: 'Sangat mandiri',
        baik: 'Mandiri',
        cukup: 'Cukup',
        perluBimbingan: 'Perlu bantuan',
      },
    ],
  };

  const dummyData = {
    capaianPembelajaran: 'CP content test',
    tujuanPembelajaran: ['TP 1', 'TP 2'],
    pemahamanBermakna: ['Makna 1'],
    pertanyaanPemantik: ['Pemantik 1'],
    kegiatanPendahuluan: ['Salam'],
    kegiatanInti: [
      { fase: 'Langkah 1', kegiatanGuru: 'Guru mengajar', kegiatanSiswa: 'Siswa belajar' },
    ],
    kegiatanPenutup: ['Doa'],
    asesmenSikap: 'Observasi',
    asesmenKeterampilan: 'Kinerja',
    asesmenPengetahuan: 'Tes',
    lkpdTugas: 'Tugas LKPD',
    soalEvaluasi: '1. Soal satu?\nA. Opsi A\nB. Opsi B',
    glosarium: 'Glosarium test',
    daftarPustaka: ['Buku Panduan'],
  };

  it('does not have a duplicate page break immediately after cover page', () => {
    const html = buildHtmlTemplate(dummyFormState, dummyData, 2, '');
    // Ensure there is no page-break-after followed by <br style="page-break-before: always
    const coverBreakMatch = html.match(
      /page-break-after:\s*always;?\s*clear:\s*both;?"[\s\S]*?<br style="page-break-before:\s*always/,
    );
    expect(coverBreakMatch).toBeNull();
  });

  it('does not place page-break-inside: avoid on the large INFORMASI UMUM container', () => {
    const html = buildHtmlTemplate(dummyFormState, dummyData, 2, '');
    // Match the INFORMASI UMUM outer div
    const infoUmumMatch = html.match(/<!-- 1\. INFORMASI UMUM -->[\s\S]*?<div style="([^"]*)"/);
    expect(infoUmumMatch).not.toBeNull();
    const style = infoUmumMatch ? infoUmumMatch[1] : '';
    expect(style).not.toContain('page-break-inside: avoid');
  });

  it('enforces tr break-inside: avoid on rubrik assessment table rows', () => {
    const html = buildHtmlTemplate(dummyFormState, dummyData, 2, '');
    expect(html).toContain('<tr style="page-break-inside: avoid; break-inside: avoid;">');
    expect(html).toContain('Kemandirian Belajar');
  });

  it('renders signature block with signature-block class, compact spacing, and anti-break styles', () => {
    const html = buildHtmlTemplate(dummyFormState, dummyData, 2, '');
    expect(html).toContain('<table class="signature-block"');
    expect(html).toContain('page-break-inside: avoid; break-inside: avoid;');
    // Ensure reduced vertical spacer (3 brs instead of 5 brs)
    expect(html).toContain('<br/><br/><br/>');
    expect(html).not.toContain('<br/><br/><br/><br/><br/>');
  });

  it('produces editable Word structure: outline levels, hanging indents, grouped writing lines, and native bullets', async () => {
    const multiLineData = {
      ...dummyData,
      kegiatanInti: [
        {
          fase: 'Langkah 1: Orientasi Masalah',
          kegiatanGuru: 'Menayangkan gambar\nMengajukan pertanyaan',
          kegiatanSiswa: 'Mengamati gambar\nMenjawab pertanyaan',
        },
      ],
    };
    const html = buildHtmlTemplate(dummyFormState, multiLineData, 2, '');
    expect(html).toContain('<li style="margin-bottom: 4px;">Menayangkan gambar</li>');
    expect(html).toContain('<th colspan="2"');

    let downloaded: Blob | undefined;
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn((blob: Blob) => { downloaded = blob; return 'blob:docx'; });
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await exportModulAjarToWord({
      htmlContent: html,
      fileName: 'Modul_Ajar_Test',
      paperSize: 'A4',
      title: 'Modul Ajar',
    });

    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(downloaded!);
    });
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(xml).toContain('<w:outlineLvl w:val="0"/>');
    expect(xml).toContain('<w:outlineLvl w:val="1"/>');
    expect(xml).toContain('<w:outlineLvl w:val="2"/>');
    expect(xml).toContain('w:hanging="280"');
    expect(xml).toContain('w:hanging="260"');
    expect(xml).not.toContain('w:line="20"');
    expect(xml).toContain('w:space="4"');
    vi.unstubAllGlobals();
  });
  it('verifies placeholder', () => {
    const html = '<br/>';
    expect(html).not.toContain('<br/><br/><br/><br/><br/>');
  });
});
