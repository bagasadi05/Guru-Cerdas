import { describe, expect, it } from 'vitest';
import { prepareDocumentLayout } from '../../src/lib/modulAjarExport/documentLayout';
import { findElements, parseDocumentHtml, textContent } from '../../src/lib/modulAjarExport/documentTree';
import { serializeNodes } from '../../src/lib/modulAjarExport/printTemplate';

describe('stored Modul Ajar document layout', () => {
  it('splits legacy multiple choice options and replaces essay lines with a short answer field', () => {
    const source = parseDocumentHtml(`<div style="border:2px dashed black"><h3>LEMBAR EVALUASI PENGETAHUAN</h3>
      <div><p>1. Pilih makna? A. Pertama. B. Kedua. C. Ketiga. D. Keempat.</p><div>Jawab:<br><div style="height:22px"></div></div></div></div>`);
    const original = JSON.stringify(source);
    const body = prepareDocumentLayout(source);
    const paragraphs = findElements(body, node => node.tag === 'p').map(textContent);
    expect(paragraphs).toEqual(['1. Pilih makna?', 'A. Pertama.', 'B. Kedua.', 'C. Ketiga.', 'D. Keempat.', 'Jawaban: ........']);
    expect(findElements(body, node => node.sheet === 'evaluasi')).toHaveLength(1);
    expect(JSON.stringify(source)).toBe(original);
  });

  it('restores labels, numbered steps and usable drawing space from legacy LKPD paragraphs', () => {
    const body = prepareDocumentLayout(parseDocumentHtml(`<div data-sheet="lkpd"><p>Judul LKPD: Kata. Petunjuk: Amati benda. Alat: Kamus. Langkah Kerja: 1. Baca kata. 2. Buat kalimat. [Kotak untuk Menggambar Benda] [Tuliskan Hasil]</p></div>`));
    const boxes = findElements(body, node => Boolean(node.style['min-height']));
    expect(boxes.map(node => node.style['min-height'])).toEqual(['120px', '80px']);
    const paragraphs = findElements(body, node => node.tag === 'p').map(textContent);
    expect(paragraphs).toContain('Petunjuk: Amati benda.');
    expect(paragraphs).toContain('1. Baca kata.');
    expect(paragraphs).toContain('2. Buat kalimat.');
  });

  it('keeps teacher references on their own page and preserves worksheet geometry', () => {
    const body = prepareDocumentLayout(parseDocumentHtml(`<div style="padding:18px"><div style="font-weight:bold">KUNCI JAWABAN & PEDOMAN PENSKORAN (REFERENSI GURU)</div><ol><li>B</li></ol></div><div data-sheet="lkpd"><div style="height:24px; border-bottom:1px dotted black"></div></div>`));
    expect(serializeNodes(body)).toContain('page-break-before: always');
    expect(findElements(body, node => node.style.height === '24px')).toHaveLength(1);
  });

  it('turns a requested answer table into blank rows with writing space', () => {
    const body = prepareDocumentLayout(parseDocumentHtml('<div data-sheet="lkpd"><p>[Tuliskan Jawaban pada Tabel yang Disediakan]</p></div>'));
    expect(findElements(body, node => node.tag === 'table')).toHaveLength(1);
    expect(findElements(body, node => node.tag === 'tr' && node.style.height === '32px')).toHaveLength(5);
    expect(textContent(body)).not.toContain('[Tuliskan');
  });

  it('keeps a short legacy assessment description with its label', () => {
    const body = prepareDocumentLayout(parseDocumentHtml('<div><p><strong>1. Penilaian Sikap:</strong></p><p>Observasi perilaku.</p></div>'));
    expect(findElements(body, node => node.classes.includes('keep-with-next')).map(textContent)).toContain('1. Penilaian Sikap:');
  });
});
