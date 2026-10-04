import { describe, expect, it } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import {
  buildHtmlTemplate,
  expandInlineLkpdLines,
  expandInlineOptions,
} from '../../src/components/pages/modul-ajar/utils/template';
import type { FormState } from '../../src/components/pages/modul-ajar/types';
import {
  buildModulAjarDocx,
  mapLessonPlanToExportData,
  renderPrintHtml,
} from '../../src/lib/modulAjarExport';

describe('expandInlineOptions', () => {
  it('splits options that were written on the same line as the question', () => {
    expect(
      expandInlineOptions([
        "1. Manakah kalimat denotatif? A. Dia buah bibir. B. Ibu membeli apel. C. Dia buah hati. D. Itu simalakama.",
      ]),
    ).toEqual([
      '1. Manakah kalimat denotatif?',
      'A. Dia buah bibir.',
      'B. Ibu membeli apel.',
      'C. Dia buah hati.',
      'D. Itu simalakama.',
    ]);
  });

  it('leaves essay questions and already-split options alone', () => {
    const essay = ['4. Jelaskan perbedaan makna denotatif dan kiasan!'];
    expect(expandInlineOptions(essay)).toBe(essay);
    const split = ['1. Soal?', 'A. satu', 'B. dua'];
    expect(expandInlineOptions(split)).toBe(split);
  });
});

describe('expandInlineLkpdLines', () => {
  it('breaks labels, numbered steps, and answer boxes out of one paragraph', () => {
    const lines = expandInlineLkpdLines(
      "Judul LKPD: Detektif Makna. Petunjuk: Bekerja sama. Alat: Kamus. Langkah Kerja: 1. Baca cerita. 2. Temukan 5 kata. 3. Buat kalimat. [Kotak untuk Menggambar] [Tuliskan Jawaban]",
    );
    expect(lines).toEqual([
      'Judul LKPD: Detektif Makna.',
      'Petunjuk: Bekerja sama.',
      'Alat: Kamus.',
      'Langkah Kerja:',
      '1. Baca cerita.',
      '2. Temukan 5 kata.',
      '3. Buat kalimat.',
      '[Kotak untuk Menggambar]',
      '[Tuliskan Jawaban]',
    ]);
  });

  it('keeps ordinary multi-line LKPD text unchanged', () => {
    expect(expandInlineLkpdLines('Aktivitas 1: Amati gambar\n- Tuliskan tahapannya')).toEqual([
      'Aktivitas 1: Amati gambar',
      '- Tuliskan tahapannya',
    ]);
  });
});

const formState = {
  generationMethod: 'Manual',
  documentType: 'Modul Ajar',
  curriculumApproach: 'Merdeka',
  satuanPendidikan: 'MI Contoh',
  jenjang: 'MI',
  kelas: '3',
  fase: 'B',
  mataPelajaran: 'Bahasa Indonesia',
  topik: 'Kosakata',
  tahunAjaran: '2026/2027',
  semester: '1',
  guru: 'Guru',
  targetPeserta: 'Reguler',
  kompetensiAwal: '',
  saranaPrasarana: '',
  capaianPembelajaran: 'CP',
  profilPelajar: [],
  jumlahPertemuan: 1,
  jpPerPertemuan: 2,
  durasiPerJp: 35,
  modelPembelajaran: 'PBL',
  metodePembelajaran: [],
  manualTujuanPembelajaran: '',
  manualPertanyaanPemantik: '',
  manualLkpdTugas: '',
  manualSoalEvaluasi: '',
  alokasiPendahuluan: 10,
  alokasiInti: 50,
  alokasiPenutup: 10,
  rubrikAsesmen: [],
  isKbcIntegrated: false,
  temaKbc: [],
  materiInsersi: '',
} as FormState;

const data = {
  tujuanPembelajaran: ['TP'],
  kegiatanInti: [
    { fase: 'Langkah 1: Orientasi', kegiatanGuru: 'Guru menjelaskan', kegiatanSiswa: 'Siswa mengamati' },
  ],
  lkpdTugas: "Petunjuk: Bekerja sama. Langkah Kerja: 1. Baca. 2. Tulis. [Kotak Jawaban]",
  soalEvaluasi: '1. Manakah yang benar? A. satu B. dua C. tiga D. empat',
};

describe('rendered Modul Ajar layout', () => {
  const html = buildHtmlTemplate(formState, data, 2, '');

  it('renders multiple-choice options as separate, non-bold lines', () => {
    expect(html).toMatch(/<div style="margin-bottom: 2px;">A\. satu<\/div>/);
    expect(html).toMatch(/<div style="margin-bottom: 2px;">D\. empat<\/div>/);
    expect(html).not.toMatch(/font-weight: bold[^>]*>\s*1\. Manakah yang benar\? A\./);
  });

  it('renders LKPD steps as a list and placeholders as answer boxes', () => {
    expect(html).toContain('<strong>Petunjuk:</strong> Bekerja sama.');
    expect(html).toMatch(/<ol[^>]*>\s*<li>Baca\.<\/li><li>Tulis\.<\/li>\s*<\/ol>/);
    expect(html).toMatch(/border: 1\.5px dashed #666666[^>]*>\s*Kotak Jawaban/);
  });

  it('left-aligns justified text inside table cells in the print template', () => {
    const exportData = mapLessonPlanToExportData({
      id: 'id',
      user_id: 'u',
      document_type: 'Modul Ajar',
      identity: {},
      components: {},
      generated_content: html,
    });
    expect(renderPrintHtml(exportData)).toContain('text-align: left !important');
  });

  it('does not emit justified paragraphs inside Word table cells', async () => {
    const cellHtml =
      '<table><tr><td style="width: 50%"><div style="text-align: justify">Teks kolom sempit yang panjang</div></td></tr></table>' +
      '<p style="text-align: justify">Paragraf biasa</p>';
    const exportData = mapLessonPlanToExportData({
      id: 'id',
      user_id: 'u',
      document_type: 'Modul Ajar',
      identity: {},
      components: {},
      generated_content: cellHtml,
    });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildModulAjarDocx(exportData)));
    const xml = await zip.file('word/document.xml')!.async('string');
    const cellXml = xml.slice(xml.indexOf('<w:tc>'), xml.indexOf('</w:tc>'));
    expect(cellXml).not.toContain('w:val="both"');
    expect(xml.slice(xml.indexOf('</w:tbl>'))).toContain('w:val="both"');
  });

  it('renders competencies written on separate lines or in one line as a numbered list', () => {
    const rendered = (value: string) =>
      buildHtmlTemplate({ ...formState, kompetensiAwal: value }, data, 2, '');
    const variants = ['1. Membaca teks.\n2. Menjelaskan kata.', '1. Membaca teks. 2. Menjelaskan kata.'];
    for (const value of variants) {
      expect(rendered(value)).toMatch(/<ol[^>]*><li>Membaca teks\.<\/li><li>Menjelaskan kata\.<\/li><\/ol>/);
    }
  });

  it('keeps short tables together and heading bars with the content below', async () => {
    const exportData = mapLessonPlanToExportData({
      id: 'id',
      user_id: 'u',
      document_type: 'Modul Ajar',
      identity: {},
      components: {},
      generated_content:
        '<div style="background-color: #f5f0d0; font-weight: bold;">D. PENDEKATAN</div>' +
        '<table><tr><td>a</td></tr><tr><td>b</td></tr></table>' +
        `<table>${'<tr><td>x</td></tr>'.repeat(12)}</table>`,
    });
    const printHtml = renderPrintHtml(exportData);
    expect(printHtml).toContain('<div style="break-after: avoid; background-color: #f5f0d0; font-weight: bold">');
    expect(printHtml.match(/<table style="break-inside: avoid">/g)).toHaveLength(1);

    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildModulAjarDocx(exportData)));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml.slice(0, xml.indexOf('<w:tbl>'))).toContain('<w:keepNext/>');
  });
});
