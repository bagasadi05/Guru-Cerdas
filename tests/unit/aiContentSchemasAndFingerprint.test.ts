import { describe, it, expect } from 'vitest';
import { ModulAjarPaketASchema } from '../../src/components/pages/modul-ajar/schemas/aiContentSchemas';
import { normalizeString, generateAiFingerprint } from '../../src/components/pages/modul-ajar/utils/aiFingerprint';

describe('FASE 2 - Modul Ajar AI Fingerprint and Normalization', () => {
  it('should normalize strings deterministically', () => {
    expect(normalizeString('Matematika   Dasar!')).toBe('matematika dasar');
    expect(normalizeString('  Ilmu  Pengetahuan ALAM  (IPA) ')).toBe('ilmu pengetahuan alam ipa');
    expect(normalizeString('Bahasa Indonesia: Teks Eksposisi')).toBe('bahasa indonesia teks eksposisi');
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
  });

  it('should generate consistent fingerprints', () => {
    const fp1 = generateAiFingerprint({
      mapel: 'Matematika Dasar!',
      fase: 'A',
      topik: '  Penjumlahan & Pengurangan  ',
      modelUuid: 'uuid-123'
    });

    const fp2 = generateAiFingerprint({
      mapel: 'matematika dasar',
      fase: 'A',
      topik: 'penjumlahan pengurangan',
      modelUuid: 'uuid-123'
    });

    expect(fp1).toBe(fp2);
    expect(fp1).toBe('matematika dasar|A|penjumlahan pengurangan|uuid-123|v1|v1');
  });

  it('should generate different fingerprints when context changes', () => {
    const fp1 = generateAiFingerprint({
      mapel: 'Matematika', fase: 'A', topik: 'Penjumlahan', modelUuid: 'uuid-123'
    });
    const fp2 = generateAiFingerprint({
      mapel: 'Matematika', fase: 'B', topik: 'Penjumlahan', modelUuid: 'uuid-123'
    });
    const fp3 = generateAiFingerprint({
      mapel: 'Matematika', fase: 'A', topik: 'Penjumlahan', modelUuid: 'uuid-123', promptVersion: 'v2'
    });

    expect(fp1).not.toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });
});

describe('FASE 2 - Modul Ajar AI Zod Schemas', () => {
  const validPaketA = {
    tujuanPembelajaran: ['Siswa dapat memahami konsep', 'Siswa dapat mempraktekkan teori'],
    pemahamanBermakna: ['Materi ini berguna dalam kehidupan sehari-hari'],
    pertanyaanPemantik: ['Apa yang kalian ketahui tentang ini?', 'Mengapa ini penting?'],
    konteksSintaks: [
      { urutan: 1, kegiatanGuru: 'Menyapa siswa', kegiatanSiswa: 'Menjawab sapaan' }
    ],
    pengayaan: [],
    remedial: []
  };

  it('should accept valid Paket A structure', () => {
    const result = ModulAjarPaketASchema.safeParse(validPaketA);
    expect(result.success).toBe(true);
  });

  it('should reject placeholder texts', () => {
    const invalidData = {
      ...validPaketA,
      tujuanPembelajaran: ['{Siswa dapat memahami...}', 'Siswa dapat mempraktekkan teori']
    };
    const result = ModulAjarPaketASchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('placeholder'))).toBe(true);
    }
  });

  it('should reject generic duplicated words like "siswa siswa"', () => {
    const invalidData = {
      ...validPaketA,
      pertanyaanPemantik: ['Apakah siswa siswa mengerti?', 'Mengapa ini penting?']
    };
    const result = ModulAjarPaketASchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('duplicate words'))).toBe(true);
    }
  });

  it('should enforce array length limits', () => {
    const tooManyTp = {
      ...validPaketA,
      tujuanPembelajaran: ['TP1', 'TP2', 'TP3', 'TP4', 'TP5']
    };
    const result = ModulAjarPaketASchema.safeParse(tooManyTp);
    expect(result.success).toBe(false);
  });
});
