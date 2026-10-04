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

const complete = {
  tujuanPembelajaran: ['Siswa menjelaskan siklus air.'],
  skenarioPembelajaran: [
    { name: 'Orientasi', guru: 'Guru menampilkan gambar.', siswa: 'Siswa mengamati.' },
    { name: 'Diskusi', guru: 'Guru membagi kelompok.', siswa: 'Siswa berdiskusi.' },
  ],
  lkpdTugas: 'Amati gambar lalu jawab.',
  soalEvaluasi: '1. Apa itu evaporasi?',
};

beforeEach(() => {
  answers.queue = [];
  answers.calls = [];
});

describe('findMissingModulAjarParts', () => {
  it('names every required part that is empty', () => {
    expect(findMissingModulAjarParts({ ...complete, skenarioPembelajaran: [] } as never)).toEqual(['langkah kegiatan inti']);
    expect(findMissingModulAjarParts({ tujuanPembelajaran: [], skenarioPembelajaran: [], lkpdTugas: '', soalEvaluasi: '' } as never))
      .toEqual(['tujuan pembelajaran', 'langkah kegiatan inti', 'LKPD', 'soal evaluasi']);
  });
});

describe('generateModulAjarAiContent', () => {
  it('retries once when the first answer is incomplete', async () => {
    answers.queue = [{ ...complete, lkpdTugas: '' }, complete];
    const result = await generateModulAjarAiContent('IPAS', 'Siklus Air', 'B');
    expect(result.lkpdTugas).toBe('Amati gambar lalu jawab.');
    expect(answers.calls).toHaveLength(2);
    expect(answers.calls[0][3]).toEqual({ bypassCache: true });
  });

  it('names the missing parts when the retry is incomplete too', async () => {
    answers.queue = [{ ...complete, soalEvaluasi: '' }, { ...complete, soalEvaluasi: '' }];
    await expect(generateModulAjarAiContent('IPAS', 'Siklus Air', 'B')).rejects.toThrow('kurang: soal evaluasi');
  });

  it('puts the teacher\'s lesson context into the prompt', async () => {
    answers.queue = [complete];
    await generateModulAjarAiContent('IPAS', 'Siklus Air', 'B', 'PBL', [], undefined, {
      kelas: '3',
      tujuanPembelajaran: 'TP tulisan guru',
      kbc: { tema: ['Cinta Ilmu'], materiInsersi: 'syukur' },
    });
    const prompt = String(answers.calls[0][0]);
    expect(prompt).toContain('Kelas: 3');
    expect(prompt).toContain('TP tulisan guru');
    expect(prompt).toContain('Kurikulum Berbasis Cinta');
  });
});
