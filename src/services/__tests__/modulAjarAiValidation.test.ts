import { beforeEach, describe, expect, it, vi } from 'vitest';

const answers = vi.hoisted(() => ({ queue: [] as unknown[], calls: [] as unknown[][] }));

vi.mock('../geminiService', () => ({
  generateGeminiJson: vi.fn(async (...args: unknown[]) => {
    answers.calls.push(args);
    return answers.queue.shift();
  }),
}));
vi.mock('../supabase', () => {
  // Bank Bersama caching runs in the background; any query shape resolves empty.
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'ilike', 'is', 'limit', 'insert', 'update', 'upsert'].forEach((m) => { chain[m] = () => chain; });
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.single = async () => ({ data: null, error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
  return { supabase: { from: () => chain } };
});

import { findMissingModulAjarParts, generateModulAjarAiContent } from '../modulAjarAiGenerator';

import { validLesson, validReview, lessonContext } from '../../../tests/fixtures/modulAjarAiContent';
const run = (context = lessonContext) => generateModulAjarAiContent('IPAS', 'Siklus Air', 'B', 'Discovery Learning', [], undefined, context);
beforeEach(() => { answers.queue = []; answers.calls = []; });
describe('AI lesson generation gates', () => {
  it('retains the legacy missing-parts diagnostic', () => {
    expect(findMissingModulAjarParts({ tujuanPembelajaran: [], skenarioPembelajaran: [], lkpdTugas: '', soalEvaluasi: '' } as never)).toHaveLength(4);
  });
  it('retries incomplete content and reviews before returning', async () => {
    answers.queue = [{ ...validLesson, materiAjar: '' }, { components: { materiAjar: validLesson.materiAjar } }, validReview];
    const result = await run();
    expect(result.materiAjar).toBe(validLesson.materiAjar);
    expect(result.glosarium).toEqual(validLesson.glosarium);
    expect(result.kunciJawaban).toHaveLength(5);
    expect(result.quality?.reviewedByAi).toBe(true);
    expect(answers.calls).toHaveLength(3);
    expect(String(answers.calls[1][0])).toContain('materiAjar');
    expect(answers.calls.every(call => (call[3] as { bypassCache: boolean }).bypassCache)).toBe(true);
    expect(answers.calls[0][3]).toMatchObject({ budgetProfile: 'lesson' });
    expect(answers.calls[2][3]).toMatchObject({ budgetProfile: 'review' });
  });
  it('rejects an empty answer without requesting a full replacement', async () => {
    answers.queue = [{}, {}];
    await expect(run()).rejects.toThrow('perlu diperbaiki');
    expect(answers.calls).toHaveLength(1);
  });
  it('uses selected syntax and preserves supplied CP and references', async () => {
    answers.queue = [{ ...validLesson, capaianPembelajaran: 'Invented CP', daftarPustaka: ['Invented source'] }, validReview];
    const result = await run();
    expect(String(answers.calls[0][0])).toContain('Discovery Learning');
    expect(String(answers.calls[0][0])).not.toContain('Orientasi peserta didik');
    expect(result.capaianPembelajaran).toBe('CP sekolah');
    expect(result.daftarPustaka).toEqual(['Sumber guru']);
  });
  it('repairs reviewer findings once', async () => {
    answers.queue = [validLesson, { ...validReview, masalah: ['Stimulus belum lengkap'], temuan: [{ komponen: 'lkpd', alasan: 'Stimulus belum lengkap' }] }, { components: { lkpd: validLesson.lkpd } }, validReview];
    await run();
    expect(String(answers.calls[2][0])).toContain('Stimulus belum lengkap');
  });
  it('rejects incomplete or adverse reviewer verdicts', async () => {
    answers.queue = [validLesson, {}];
    await expect(run()).rejects.toThrow('pemeriksaan isi AI tidak lengkap');
    expect(answers.calls).toHaveLength(2);
  });
  it('does not call AI when lesson timing is invalid', async () => {
    await expect(run({ ...lessonContext, menitPerPertemuan: 40 })).rejects.toThrow('Alokasi');
    expect(answers.calls).toHaveLength(0);
  });
});
