import { describe, it, expect } from 'vitest';
import { cleanHtmlForWordExport, buildHtmlTemplate } from '../../src/components/pages/modul-ajar/utils/template';
import type { FormState } from '../../src/components/pages/modul-ajar/types';

describe('cleanHtmlForWordExport', () => {
  it('removes page-break-inside: avoid on divs to prevent Word page-per-card explosions', () => {
    const rawHtml = `
      <div style="margin-bottom: 14px; border: 1px solid #cfd8dc; page-break-inside: avoid;">
        <p>Langkah 1</p>
      </div>
      <div style="margin-bottom: 16px; page-break-inside: avoid;">
        <p>Soal 1</p>
      </div>
    `;
    const cleaned = cleanHtmlForWordExport(rawHtml);
    expect(cleaned).not.toContain('page-break-inside: avoid');
    expect(cleaned).toContain('Langkah 1');
    expect(cleaned).toContain('Soal 1');
  });

  it('removes overflow: hidden and border-radius that distort layout into floating frames in Word', () => {
    const rawHtml = `<div style="border: 1.5px solid #000000; overflow: hidden; border-radius: 4px;">Content</div>`;
    const cleaned = cleanHtmlForWordExport(rawHtml);
    expect(cleaned).not.toContain('overflow: hidden');
    expect(cleaned).not.toContain('border-radius: 4px');
    expect(cleaned).toContain('border: 1.5px solid #000000');
  });

  it('eliminates duplicate consecutive page breaks after cover', () => {
    const rawHtml = `
      <div style="text-align: center; page-break-after: always; clear: both;">Cover Page</div>
      <br style="page-break-before: always; clear: both;" />
      <div>Content Page</div>
    `;
    const cleaned = cleanHtmlForWordExport(rawHtml);
    // Should keep page-break-after on the cover, but remove the duplicate <br style="...page-break-before...">
    expect(cleaned).toContain('page-break-after: always');
    expect(cleaned).not.toContain('<br style="page-break-before: always; clear: both;" />');
  });

  it('converts empty dotted spacer divs into Word-friendly dotted paragraphs', () => {
    const rawHtml = `<div style="border-bottom: 1px dotted #888888; height: 24px; width: 100%;"></div>`;
    const cleaned = cleanHtmlForWordExport(rawHtml);
    expect(cleaned).not.toContain('height: 24px');
    expect(cleaned).toContain('........................................................................................................................');
  });

  it('preserves page-break-inside: avoid on tr and signature table elements so Word table rows do not split', () => {
    const rawHtml = `
      <div style="page-break-inside: avoid;">
        <table class="signature-block" style="page-break-inside: avoid;">
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td>Kriteria</td>
          </tr>
        </table>
      </div>
    `;
    const cleaned = cleanHtmlForWordExport(rawHtml);
    // div should lose avoid, but table and tr must retain it
    expect(cleaned).not.toMatch(/<div[^>]*page-break-inside/);
    expect(cleaned).toContain('<table class="signature-block" style="page-break-inside: avoid;">');
    expect(cleaned).toContain('<tr style="page-break-inside: avoid; break-inside: avoid;">');
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
      { kriteria: 'Kemandirian Belajar', sangatBaik: 'Sangat mandiri', baik: 'Mandiri', cukup: 'Cukup', perluBimbingan: 'Perlu bantuan' }
    ]
  };

  const dummyData = {
    capaianPembelajaran: 'CP content test',
    tujuanPembelajaran: ['TP 1', 'TP 2'],
    pemahamanBermakna: ['Makna 1'],
    pertanyaanPemantik: ['Pemantik 1'],
    kegiatanPendahuluan: ['Salam'],
    kegiatanInti: [
      { fase: 'Langkah 1', kegiatanGuru: 'Guru mengajar', kegiatanSiswa: 'Siswa belajar' }
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
    const coverBreakMatch = html.match(/page-break-after:\s*always;?\s*clear:\s*both;?"[\s\S]*?<br style="page-break-before:\s*always/);
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
});
