import { describe, it, expect } from 'vitest';
import { robustParseJson } from '../../src/utils/jsonUtils';

describe('robustParseJson', () => {
  it('parses valid JSON without alteration', () => {
    const raw = '{"cp": "Peserta didik dapat memahami konsep penjumlahan."}';
    const result = robustParseJson<{ cp: string }>(raw);
    expect(result.cp).toBe('Peserta didik dapat memahami konsep penjumlahan.');
  });

  it('strips markdown json fences', () => {
    const raw = '```json\n{"tujuan": ["Tujuan 1", "Tujuan 2"]}\n```';
    const result = robustParseJson<{ tujuan: string[] }>(raw);
    expect(result.tujuan).toEqual(['Tujuan 1', 'Tujuan 2']);
  });

  it('repairs unescaped newlines inside string literals', () => {
    const raw = `{\n  "cp": "Paragraf 1 deskripsi CP.\n\nParagraf 2 kelanjutan kompetensi.\n\nParagraf 3 sikap dan profil."\n}`;
    const result = robustParseJson<{ cp: string }>(raw);
    expect(result.cp).toContain('Paragraf 1 deskripsi CP.');
    expect(result.cp).toContain('Paragraf 2 kelanjutan');
    expect(result.cp).toContain('Paragraf 3 sikap');
  });

  it('removes trailing commas before closing braces and brackets', () => {
    const raw = '{"tujuan": ["A", "B",], "kompetensi": "Dasar",}';
    const result = robustParseJson<{ tujuan: string[]; kompetensi: string }>(raw);
    expect(result.tujuan).toEqual(['A', 'B']);
    expect(result.kompetensi).toBe('Dasar');
  });

  it('removes javascript line and block comments', () => {
    const raw = `// Response from AI model\n{\n  /* Main CP property */\n  "cp": "Deskripsi CP"\n}`;
    const result = robustParseJson<{ cp: string }>(raw);
    expect(result.cp).toBe('Deskripsi CP');
  });

  it('handles smart/curly quotes gracefully', () => {
    const raw = '{\u201Ccp\u201D: \u201CPeserta didik memahami materi.\u201D}';
    const result = robustParseJson<{ cp: string }>(raw);
    expect(result.cp).toBe('Peserta didik memahami materi.');
  });

  it('extracts values via fallback regex when severely malformed', () => {
    const raw = `Berikut adalah hasil CP yang diminta:\n"cp": "Peserta didik menguasai materi penjumlahan hingga 20"\nTerima kasih.`;
    const result = robustParseJson<{ cp: string }>(raw);
    expect(result.cp).toBe('Peserta didik menguasai materi penjumlahan hingga 20');
  });
});
