import { describe, expect, it } from 'vitest';
import { ModulAjarGenerationSchema, validateAiLesson, validateAiReview, formatAiAssessment } from '../../src/services/modulAjarAiContract';
import { validLesson, validReview } from '../fixtures/modulAjarAiContent';
const constraints = { modelPembelajaran: 'Discovery Learning', sintaks: ['Amati', 'Simpulkan'], menitInti: 20 };
describe('AI lesson contract', () => {
  it('accepts complete lessons and formats questions separately from keys', () => {
    expect(ModulAjarGenerationSchema.safeParse(validLesson).success).toBe(true);
    expect(validateAiLesson(validLesson, constraints)).toEqual([]);
    const formatted = formatAiAssessment(validLesson.evaluasi);
    expect(formatted.soal).toContain('D. Pengendapan');
    expect(formatted.kunci[3]).toContain('Pedoman penskoran');
  });
  it.each(['materiAjar', 'glosarium', 'lkpd', 'evaluasi'])('requires %s', field => {
    const raw = { ...validLesson, [field]: null };
    expect(ModulAjarGenerationSchema.safeParse(raw).success).toBe(false);
  });
  it('rejects HTML in generated content', () => {
    expect(ModulAjarGenerationSchema.safeParse({ ...validLesson, materiAjar: '<img src=x onerror=alert(1)>' }).success).toBe(false);
  });
  it('checks timing, selected syntax, and objective coverage', () => {
    const lesson = structuredClone(validLesson);
    lesson.skenarioPembelajaran[0].name = 'Wrong syntax';
    lesson.skenarioPembelajaran[0].durasiMenit = 15;
    lesson.tujuanPembelajaran.push('Siswa menjelaskan hujan.');
    const issues = validateAiLesson(lesson, constraints).join(' ');
    expect(issues).toContain('sintaks');
    expect(issues).toContain('Total menit');
    expect(issues).toContain('Tujuan 2');
  });
  it('validates every meeting separately', () => {
    const lesson = structuredClone(validLesson);
    lesson.skenarioPembelajaran.push(...validLesson.skenarioPembelajaran.map(step => ({ ...step, pertemuan: 2 })));
    expect(validateAiLesson(lesson, { ...constraints, jumlahPertemuan: 2 })).toEqual([]);
    lesson.skenarioPembelajaran[2].durasiMenit = 9;
    expect(validateAiLesson(lesson, { ...constraints, jumlahPertemuan: 2 }).join(' ')).toContain('pertemuan 2');
  });
  it('preserves teacher objectives and questions exactly', () => {
    const issues = validateAiLesson(validLesson, { ...constraints, tujuanPembelajaran: 'Tujuan guru', soalGuru: 'Soal guru' });
    expect(issues.join(' ')).toContain('ditulis guru');
  });
  it('rejects duplicate options and invalid objective IDs', () => {
    const lesson = structuredClone(validLesson);
    const first = lesson.evaluasi[0];
    if (first.jenis === 'pilihan_ganda') first.pilihan[1].teks = first.pilihan[0].teks;
    first.tujuanIds = [9];
    const issues = validateAiLesson(lesson, constraints).join(' ');
    expect(issues).toContain('berulang');
    expect(issues).toContain('tidak valid');
  });
  it('requires a complete substantive review for all questions', () => {
    expect(validateAiReview(validReview)).toEqual([]);
    expect(validateAiReview({ ...validReview, soal: Array(5).fill(validReview.soal[0]) }).join(' ')).toContain('semua nomor');
    expect(validateAiReview({ ...validReview, selaras: false }).join(' ')).toContain('belum selaras');
    expect(validateAiReview(null)).not.toEqual([]);
  });
});
