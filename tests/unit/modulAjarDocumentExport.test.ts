import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { buildHtmlTemplate } from '../../src/components/pages/modul-ajar/utils/template';
import type { FormState } from '../../src/components/pages/modul-ajar/types';
import {
  ExportDataError,
  buildExportFileName,
  buildHeaderFooterTemplates,
  buildModulAjarDocx,
  contentDispositionAttachment,
  mapLessonPlanToExportData,
  parseDocumentHtml,
  renderPrintHtml,
  type LessonPlanRow,
} from '../../src/lib/modulAjarExport';
import { textContent } from '../../src/lib/modulAjarExport/documentTree';

const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const formState: FormState = {
  generationMethod: 'Manual',
  documentType: 'Modul Ajar',
  curriculumApproach: 'Merdeka',
  satuanPendidikan: 'MI Al Irsyad Kota Madiun',
  jenjang: 'SD/MI',
  kelas: '4',
  fase: 'B',
  mataPelajaran: 'IPAS',
  topik: 'Siklus Air',
  tahunAjaran: '2026/2027',
  semester: '1',
  guru: 'Guru Kelas, S.Pd',
  targetPeserta: 'Reguler',
  kompetensiAwal: 'Mengenal wujud benda',
  saranaPrasarana: 'LKPD',
  capaianPembelajaran: 'Memahami siklus air',
  profilPelajar: ['Bernalar Kritis'],
  jumlahPertemuan: 1,
  jpPerPertemuan: 2,
  durasiPerJp: 35,
  modelPembelajaran: 'Problem Based Learning (PBL)',
  metodePembelajaran: ['Diskusi'],
  manualTujuanPembelajaran: '',
  manualPertanyaanPemantik: '',
  manualLkpdTugas: '',
  manualSoalEvaluasi: '',
  alokasiPendahuluan: 10,
  alokasiInti: 50,
  alokasiPenutup: 10,
  rubrikAsesmen: [
    {
      kriteria: 'Ketepatan Konsep',
      sangatBaik: 'Sangat tepat',
      baik: 'Tepat',
      cukup: 'Cukup',
      perluBimbingan: 'Perlu bantuan',
    },
  ],
  isKbcIntegrated: false,
  temaKbc: [],
  materiInsersi: '',
  paperSize: 'A4',
};

const templateData = {
  capaianPembelajaran: 'Memahami siklus air',
  tujuanPembelajaran: ['Menjelaskan tahapan siklus air'],
  pemahamanBermakna: ['Air terus berputar di alam'],
  pertanyaanPemantik: ['Dari mana datangnya hujan?'],
  kegiatanPendahuluan: ['Salam dan doa'],
  kegiatanInti: [
    { fase: 'Orientasi masalah', kegiatanGuru: 'Guru menayangkan video', kegiatanSiswa: 'Siswa mengamati' },
  ],
  kegiatanPenutup: ['Refleksi'],
  asesmenSikap: 'Observasi',
  asesmenKeterampilan: 'Unjuk kerja',
  asesmenPengetahuan: 'Tes tertulis',
  lkpdTugas: 'Aktivitas 1: Amati gambar siklus air\n- Tuliskan tahapannya',
  soalEvaluasi: '1. Apa itu evaporasi?\nA. Penguapan\nB. Pengembunan',
  glosarium: ['Evaporasi: penguapan'],
  daftarPustaka: ['Buku IPAS Kelas 4'],
};

function makeRow(overrides: Partial<LessonPlanRow> = {}): LessonPlanRow {
  return {
    id: '7d1b8c1e-0000-4000-8000-000000000001',
    user_id: 'user-1',
    document_type: 'Modul Ajar',
    identity: {
      mapel: 'IPAS',
      kelas: '4',
      fase: 'B',
      topik: 'Siklus Air',
      tahun: '2026/2027',
      semester: '1',
      guru: 'Guru Kelas, S.Pd',
      satuanPendidikan: 'MI Al Irsyad Kota Madiun',
    },
    components: { paperSize: 'F4' },
    generated_content: buildHtmlTemplate(formState, templateData, 2, ONE_PIXEL_PNG),
    ...overrides,
  };
}

async function readDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('document.xml missing');
  return file.async('string');
}

describe('parseDocumentHtml', () => {
  it('drops active content and unsafe attributes', () => {
    const nodes = parseDocumentHtml(`
      <p onclick="steal()" style="color: red; background-image: url(https://evil.test/x.png)">Aman</p>
      <script>alert(1)</script>
      <iframe src="https://evil.test"></iframe>
      <a href="javascript:alert(1)">tautan</a>
      <img src="https://evil.test/track.png" alt="pelacak">
      <img src="${ONE_PIXEL_PNG}" alt="logo">
    `);
    const html = renderPrintHtml({
      lessonPlanId: 'x',
      identity: {
        documentType: 'Modul Ajar',
        mataPelajaran: '',
        topik: '',
        kelas: '',
        fase: '',
        satuanPendidikan: '',
        tahunAjaran: '',
        semester: '',
        guru: '',
      },
      paperSize: 'A4',
      variant: 'guru',
      body: nodes,
    });

    expect(html).not.toMatch(/<script|<iframe|onclick|javascript:|evil\.test|url\(/i);
    expect(html).toContain('tautan');
    expect(html).toContain('style="color: red"');
    expect(html).toContain('src="data:image/png;base64');
  });

  it('escapes text so stored markup cannot inject tags', () => {
    const nodes = parseDocumentHtml('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
    expect(textContent(nodes)).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('mapLessonPlanToExportData', () => {
  it('prefers the requested paper size, then the stored one, then A4', () => {
    expect(mapLessonPlanToExportData(makeRow(), { paperSize: 'A4' }).paperSize).toBe('A4');
    expect(mapLessonPlanToExportData(makeRow()).paperSize).toBe('F4');
    expect(mapLessonPlanToExportData(makeRow({ components: {} }), { paperSize: 'Letter' }).paperSize).toBe('A4');
  });

  it('reads generated_content stored as a JSON string literal', () => {
    const data = mapLessonPlanToExportData(makeRow({ generated_content: JSON.stringify('<p>Isi</p>') }));
    expect(textContent(data.body)).toBe('Isi');
  });

  it('rejects documents without content', () => {
    expect(() => mapLessonPlanToExportData(makeRow({ generated_content: '' }))).toThrow(ExportDataError);
  });

  it('keeps only student-facing sections for the siswa variant', () => {
    const guru = textContent(mapLessonPlanToExportData(makeRow()).body);
    const siswa = textContent(mapLessonPlanToExportData(makeRow(), { variant: 'siswa' }).body);

    expect(guru).toContain('Kegiatan Guru');
    expect(siswa).toContain('LEMBAR AKTIVITAS & EVALUASI SISWA');
    expect(siswa).toContain('Amati gambar siklus air');
    expect(siswa).toContain('Apa itu evaporasi?');
    expect(siswa).not.toContain('Kegiatan Guru');
    expect(siswa).not.toContain('Ketepatan Konsep');
  });
});

describe('renderPrintHtml', () => {
  it('sets the F4 page box, 2 cm margins, and repeating table headers', () => {
    const html = renderPrintHtml(mapLessonPlanToExportData(makeRow()));
    expect(html).toContain('@page { size: 215mm 330mm; margin: 20mm; }');
    expect(html).toContain('thead { display: table-header-group; }');
    expect(html).toContain('class="signature-block"');
    expect(html).not.toMatch(/<script/i);
  });

  it('builds page-numbered footer templates with an escaped title', () => {
    const data = mapLessonPlanToExportData(
      makeRow({ identity: { mapel: '<b>IPAS</b>', kelas: '4' } }),
    );
    const { headerTemplate, footerTemplate } = buildHeaderFooterTemplates(data);
    expect(headerTemplate).toContain('&lt;b&gt;IPAS&lt;/b&gt;');
    expect(footerTemplate).toContain('class="pageNumber"');
    expect(footerTemplate).toContain('class="totalPages"');
  });
});

describe('buildModulAjarDocx', () => {
  it('produces a native .docx with F4 geometry, tables, and repeated headers', async () => {
    const buffer = await Packer.toBuffer(buildModulAjarDocx(mapLessonPlanToExportData(makeRow())));
    expect(buffer.subarray(0, 2).toString()).toBe('PK');

    const xml = await readDocumentXml(buffer);
    expect(xml).toMatch(/<w:pgSz w:w="12189" w:h="18709"/);
    expect(xml).toMatch(/w:top="1134"/);
    expect(xml).toContain('Kegiatan Guru');
    expect(xml).toContain('Ketepatan Konsep');
    expect(xml).toContain('<w:tblHeader/>');
    expect(xml).toContain('<w:cantSplit/>');
    expect(xml).toContain('<w:numPr>');
    expect(xml).toContain('<w:drawing>');
  });

  it('uses A4 geometry and keeps the student variant free of teacher sections', async () => {
    const data = mapLessonPlanToExportData(makeRow(), { paperSize: 'A4', variant: 'siswa' });
    const xml = await readDocumentXml(await Packer.toBuffer(buildModulAjarDocx(data)));
    expect(xml).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
    expect(xml).toContain('Apa itu evaporasi?');
    expect(xml).not.toContain('Kegiatan Guru');
  });
});

describe('buildExportFileName', () => {
  it('follows the PRD naming rule and strips illegal characters', () => {
    expect(
      buildExportFileName({ documentType: 'Modul Ajar', mataPelajaran: 'IPAS', kelas: '4' }, 'pdf'),
    ).toBe('Modul_Ajar_IPAS_Kelas4.pdf');
    expect(
      buildExportFileName({ documentType: 'RPP', mataPelajaran: 'Bahasa/Indonesia: "Teks"', kelas: '3 A' }, 'docx'),
    ).toBe('RPP_Bahasa_Indonesia_Teks_Kelas3_A.docx');
    expect(
      buildExportFileName({ documentType: 'Modul Ajar', mataPelajaran: 'IPAS', kelas: '4' }, 'docx', 'siswa'),
    ).toBe('LKPD_Siswa_IPAS_Kelas4.docx');
  });

  it('encodes non-ASCII names in Content-Disposition', () => {
    const header = contentDispositionAttachment('Modul_Ajar_Bahasa_Arab_العربية_Kelas4.pdf');
    expect(header).toMatch(/^attachment; filename="Modul_Ajar_Bahasa_Arab_[_]+_Kelas4\.pdf"; filename\*=UTF-8''/);
  });
});
