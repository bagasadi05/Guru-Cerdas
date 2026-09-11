import { describe, it, expect } from 'vitest';
import { normalizeHomoglyphs, normalizeStudentName, normalizeTextForPdf } from '../../src/utils/textSanitizer';
import { jsPDF } from 'jspdf';

describe('textSanitizer', () => {
  it('correctly replaces Greek Iota (U+0399) with Latin I (U+0049)', () => {
    const raw = 'ALESHA KA\u0399NA ADHISTY';
    const normalized = normalizeStudentName(raw);
    expect(normalized).toBe('ALESHA KAINA ADHISTY');
    expect(normalized.charCodeAt(9)).toBe(0x49); // Latin I
  });

  it('normalizes Cyrillic and Greek homoglyphs and typographic punctuation', () => {
    // Cyrillic A, E, O and typographic quotes/dashes
    const raw = '\u0410L\u0415SH\u0410 \u2018KA\u0399NA\u2019 \u2013 \u201CADHISTY\u201D';
    const normalized = normalizeTextForPdf(raw);
    expect(normalized).toBe("ALESHA 'KAINA' - \"ADHISTY\"");
  });

  it('trims and collapses multiple spaces in student names', () => {
    const raw = '   Alesha    Kaina    Adhisty   ';
    expect(normalizeStudentName(raw)).toBe('Alesha Kaina Adhisty');
  });

  it('handles null and undefined gracefully', () => {
    expect(normalizeStudentName(null)).toBe('');
    expect(normalizeStudentName(undefined)).toBe('');
    expect(normalizeTextForPdf(null)).toBe('');
    expect(normalizeTextForPdf(undefined)).toBe('');
  });

  it('ensures text rendered in jsPDF does not produce trademark symbol (TM)', () => {
    const rawWithGreekIota = 'ALESHA KA\u0399NA ADHISTY';
    const safeText = normalizeTextForPdf(rawWithGreekIota);

    const doc = new jsPDF({ compress: false });
    doc.text(safeText, 10, 10);
    const rawPageStream = (doc.internal.pages as any)[1].join('\n');

    expect(rawPageStream).toContain('ALESHA KAINA ADHISTY');
    expect(rawPageStream).not.toContain('™');
    expect(rawPageStream).not.toContain('KA™NA');
  });

  it('bintangPdfGenerator safely handles raw input with Greek Iota and homoglyphs', async () => {
    const { generateBintangReportPdf } = await import('../../src/services/bintangPdfGenerator');
    const pdfHeaderUtils = await import('../../src/utils/pdfHeaderUtils');
    vi.spyOn(pdfHeaderUtils, 'ensureLogosLoaded').mockResolvedValue(undefined as any);
    vi.spyOn(pdfHeaderUtils, 'addPdfHeader').mockReturnValue(46);

    const doc = new jsPDF();
    const textSpy = vi.spyOn(doc, 'text');

    const reports = [{
      student: {
        id: 'student-iota-1',
        name: 'ALESHA KA\u0399NA ADHISTY',
        classes: { name: 'Kelas 1B' },
      },
      evaluation: {
        adab_score: 'A',
        kedisiplinan_score: 'A',
        kerapian_score: 'A',
        catatan_wali: 'Ananda ALESHA KA\u0399NA sangat berprestasi.',
      },
      aspects: {
        ADAB: { grade: 'A' },
        KEDISIPLINAN: { grade: 'A' },
        KERAPIAN: { grade: 'A' },
      },
    }];

    await generateBintangReportPdf(
      doc,
      reports as any,
      'Agustus 2026',
      '31 Agustus 2026',
      { id: 'user-1', name: 'Ustadz Ahmad', avatarUrl: '' }
    );

    // Verify calls to doc.text never contain Greek Iota or TM
    const allRenderedStrings = textSpy.mock.calls
      .map(call => String(call[0]))
      .join(' ');

    expect(allRenderedStrings).toContain('ALESHA KAINA ADHISTY');
    expect(allRenderedStrings).toContain('ALESHA KAINA');
    expect(allRenderedStrings).not.toContain('\u0399');
    expect(allRenderedStrings).not.toContain('™');
    expect(allRenderedStrings).not.toContain('KA™NA');
  }, 20000);
});
