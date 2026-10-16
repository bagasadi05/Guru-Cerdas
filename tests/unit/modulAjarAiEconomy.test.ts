import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validLesson, validReview, lessonContext } from '../fixtures/modulAjarAiContent';
const state = vi.hoisted(() => ({
  owner: 'guru-1',
  cache: new Map<string, Record<string, unknown>>(),
  usage: [] as Record<string, unknown>[],
  calls: [] as unknown[][],
  answers: [] as unknown[],
  cacheError: false,
  handler: undefined as undefined | ((options: { signal?: AbortSignal }) => unknown),
}));
vi.mock('../../src/services/geminiService', () => ({
  generateGeminiJson: vi.fn(async (...args: unknown[]) => {
    state.calls.push(args);
    return state.handler
      ? state.handler(args[3] as { signal?: AbortSignal })
      : state.answers.shift();
  }),
}));
vi.mock('../../src/services/modulAjarReferenceService', () => ({
  getVerifiedLessonCp: vi.fn(async () => ({ cp: 'CP resmi', sources: ['Dokumen resmi'] })),
}));
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: state.owner } } } }) },
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let value: Record<string, unknown> | undefined;
      const query = {
        select: () => query,
        eq: (key: string, item: unknown) => {
          filters[key] = item;
          return query;
        },
        gt: () => query,
        upsert: (item: Record<string, unknown>) => {
          value = item;
          return query;
        },
        insert: (item: Record<string, unknown>) => {
          value = item;
          return query;
        },
        abortSignal: () => query,
        maybeSingle: async () => ({
          data:
            state.cache.get(
              `${filters.user_id}:${filters.operation}:${filters.request_fingerprint}`,
            ) ?? null,
          error: state.cacheError ? { message: 'offline' } : null,
        }),
        then: (resolve: (result: unknown) => void) => {
          if (value && !state.cacheError) {
            if (table === 'modul_ajar_ai_usage') state.usage.push(value);
            else
              state.cache.set(
                `${value.user_id}:${value.operation}:${value.request_fingerprint}`,
                value,
              );
          }
          return Promise.resolve(
            resolve({ error: state.cacheError ? { message: 'offline' } : null }),
          );
        },
      };
      return query;
    },
  },
}));
import {
  generateModulAjarAiContent,
  type ModulAjarPromptContext,
} from '../../src/services/modulAjarAiGenerator';
import {
  generateSoalEvaluasi,
  generateLkpdTugas,
} from '../../src/services/modulAjarAiFieldGenerator';
import {
  modulAiFingerprint,
  runModulAiRequest,
  aggregateUsage,
  type ModulAiOptions,
} from '../../src/services/modulAjarAiCache';
const run = (context: ModulAjarPromptContext = lessonContext, options: ModulAiOptions = {}) =>
  generateModulAjarAiContent(
    'IPAS',
    'Siklus Air',
    'B',
    'Discovery Learning',
    [],
    undefined,
    context,
    options,
  );
beforeEach(() => {
  state.owner = 'guru-1';
  state.cache.clear();
  state.calls = [];
  state.answers = [];
  state.usage = [];
  state.cacheError = false;
  state.handler = undefined;
});
describe('private Modul Ajar cache and repair economy', () => {
  it('uses two calls for a new lesson and zero for its identical successor, including after module reload', async () => {
    state.answers = [validLesson, validReview];
    const first = await run();
    expect(state.calls).toHaveLength(2);
    const usage = vi.fn();
    expect(await run(lessonContext, { onUsage: usage })).toEqual(first);
    expect(state.calls).toHaveLength(2);
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheHit: true,
        tokens: { input: 0, output: 0, reasoning: 0, total: 0 },
      }),
    );
    vi.resetModules();
    const reloaded = await import('../../src/services/modulAjarAiGenerator');
    expect(
      await reloaded.generateModulAjarAiContent(
        'IPAS',
        'Siklus Air',
        'B',
        'Discovery Learning',
        [],
        undefined,
        lessonContext,
      ),
    ).toEqual(first);
    expect(state.calls).toHaveLength(2);
  });
  it('separates owners and bypasses cache for an explicit fresh version', async () => {
    state.answers = [validLesson, validReview, validLesson, validReview, validLesson, validReview];
    await run();
    state.owner = 'guru-2';
    await run();
    await run(lessonContext, { cachePolicy: 'refresh' });
    expect(state.calls).toHaveLength(6);
    expect(state.cache.size).toBe(2);
    expect(state.usage.map((row) => row.user_id)).toEqual(['guru-1', 'guru-2', 'guru-2']);
  });
  it('rejects expired, corrupt and old-contract entries before reusing them', async () => {
    state.answers = [validLesson, validReview];
    await run();
    const row = [...state.cache.values()][0];
    row.contract_version = 0;
    state.answers = [validLesson, validReview];
    await run();
    const newRow = [...state.cache.values()][0];
    newRow.expires_at = '2000-01-01T00:00:00Z';
    state.answers = [validLesson, validReview];
    await run();
    const current = [...state.cache.values()][0];
    (current.content as { soalEvaluasi: string }).soalEvaluasi = 'rusak';
    state.answers = [validLesson, validReview];
    await run();
    expect(state.calls).toHaveLength(8);
  });
  it('fingerprints every input while preserving punctuation and array order', async () => {
    const base = {
      cp: 'Air, tanah.',
      objectives: ['Amati', 'Simpulkan'],
      model: 'Discovery',
      time: 30,
      profiles: ['Mandiri'],
      kbc: 'Cinta alam',
      refs: ['A'],
      teacher: { materi: 'Air!' },
      kelas: '3',
      syntax: ['A', 'B'],
    };
    const key = await modulAiFingerprint('lesson', base);
    expect(await modulAiFingerprint('lesson', { ...base, cp: 'Air tanah.' })).not.toBe(key);
    expect(
      await modulAiFingerprint('lesson', { ...base, objectives: [...base.objectives].reverse() }),
    ).not.toBe(key);
    for (const field of Object.keys(base))
      expect(await modulAiFingerprint('lesson', { ...base, [field]: 'changed' })).not.toBe(key);
    expect(await modulAiFingerprint('field', base)).not.toBe(key);
    expect(
      await modulAiFingerprint('lesson', Object.fromEntries(Object.entries(base).reverse())),
    ).toBe(key);
  });
  it('asks only for missing components and preserves teacher text', async () => {
    const context = {
      ...lessonContext,
      tujuanPembelajaran: validLesson.tujuanPembelajaran.join('\n'),
      teacherContent: { materiAjar: 'Materi guru tetap persis.' },
      reusableContent: { lkpd: validLesson.lkpd, evaluasi: validLesson.evaluasi },
    };
    state.answers = [validLesson, validReview];
    const result = await run(context);
    expect(result.materiAjar).toBe('Materi guru tetap persis.');
    expect(result.artifact?.evaluasi).toEqual(validLesson.evaluasi);
    const prompt = String(state.calls[0][0]);
    const requested = JSON.parse(
      prompt
        .split(
          'Kembalikan HANYA komponen yang diminta berikut; semua contoh harus diganti dengan konten nyata:\n',
        )[1]
        .split('\nATURAN:')[0],
    );
    expect(requested).not.toHaveProperty('materiAjar');
    expect(requested).not.toHaveProperty('lkpd');
    expect(requested).not.toHaveProperty('evaluasi');
    expect(requested).not.toHaveProperty('tujuanPembelajaran');
    expect(String(state.calls[1][0])).toContain('Materi guru tetap persis.');
  });
  it('repairs one question, revalidates and reviews the final merged lesson', async () => {
    const fixed = { ...validLesson.evaluasi[1], pembahasan: 'Pembahasan diperjelas.' };
    const badReview = {
      ...validReview,
      soal: validReview.soal.map((item) => (item.nomor === 2 ? { ...item, benar: false } : item)),
      masalah: ['Pembahasan soal 2 tidak jelas'],
      temuan: [{ komponen: 'evaluasi', nomor: 2, alasan: 'Pembahasan tidak jelas' }],
    };
    state.answers = [validLesson, badReview, { questions: [fixed] }, validReview];
    const result = await run();
    expect(result.artifact?.evaluasi[1]).toEqual(fixed);
    expect(result.artifact?.evaluasi[0]).toEqual(validLesson.evaluasi[0]);
    expect(state.calls).toHaveLength(4);
    expect(String(state.calls[2][0])).toContain('Jangan kirim dokumen lengkap');
    expect(String(state.calls[3][0])).toContain('Pembahasan diperjelas.');
  });
  it('reviews printed KBC objectives while preserving the canonical teacher objectives', async () => {
    state.answers = [validLesson, validReview];
    const result = await run({
      ...lessonContext,
      tujuanPembelajaran: validLesson.tujuanPembelajaran.join('\n'),
      kbc: { tema: ['Cinta alam'], materiInsersi: 'Menjaga lingkungan', appendToObjectives: true },
    });
    expect(result.artifact?.tujuanPembelajaran).toEqual(validLesson.tujuanPembelajaran);
    expect(String(state.calls[1][0])).toContain('(Menjaga lingkungan).');
  });
  it('repairs only a flagged field assessment question and caches the reviewed result', async () => {
    const fixed = { ...validLesson.evaluasi[1], pembahasan: 'Pembahasan akhir diperjelas.' };
    state.answers = [
      { evaluasi: validLesson.evaluasi },
      {
        ...validReview,
        masalah: ['Pembahasan soal 2 tidak jelas'],
        temuan: [{ komponen: 'evaluasi', nomor: 2, alasan: 'Pembahasan tidak jelas' }],
      },
      { questions: [fixed] },
      validReview,
    ];
    const ctx = {
      mapel: 'IPAS',
      topik: 'Siklus Air',
      fase: 'B',
      tujuanPembelajaran: validLesson.tujuanPembelajaran.join('\n'),
    };
    const artifact = vi.fn();
    const first = await generateSoalEvaluasi(ctx, undefined, { onArtifact: artifact });
    expect(state.calls).toHaveLength(4);
    expect(artifact.mock.calls[0][0].evaluasi[1]).toEqual(fixed);
    expect(artifact.mock.calls[0][0].evaluasi[0]).toEqual(validLesson.evaluasi[0]);
    expect(String(state.calls[3][0])).toContain('Pembahasan akhir diperjelas.');
    expect(await generateSoalEvaluasi(ctx)).toBe(first);
    expect(state.calls).toHaveLength(4);
  });
  it('rejects patches touching unflagged fields and does not save failed results', async () => {
    state.answers = [
      { ...validLesson, materiAjar: '' },
      { components: { materiAjar: 'Baru', pengayaan: ['Unrequested'] } },
    ];
    await expect(run()).rejects.toThrow('di luar temuan');
    expect(state.cache.size).toBe(0);
    expect(state.usage[0].status).toBe('failed');
  });
  it('rejects findings on immutable teacher content without spending a repair call', async () => {
    state.answers = [
      validLesson,
      {
        ...validReview,
        materiBenar: false,
        masalah: ['Materi guru salah'],
        temuan: [{ komponen: 'materiAjar', alasan: 'Konsep keliru' }],
      },
    ];
    await expect(
      run({ ...lessonContext, teacherContent: { materiAjar: 'Materi guru salah' } }),
    ).rejects.toThrow('Materi guru salah');
    expect(state.calls).toHaveLength(2);
    expect(state.cache.size).toBe(0);
  });
  it('allows only one repair round even when the final reviewer finds another problem', async () => {
    state.answers = [
      { ...validLesson, materiAjar: '' },
      { components: { materiAjar: validLesson.materiAjar } },
      {
        ...validReview,
        materiBenar: false,
        masalah: ['Definisi salah'],
        temuan: [{ komponen: 'glosarium', alasan: 'Definisi salah' }],
      },
    ];
    await expect(run()).rejects.toThrow('Definisi salah');
    expect(state.calls).toHaveLength(3);
    expect(state.cache.size).toBe(0);
  });
  it('caches typed LKPD and reviewed assessment including keys and objective mappings', async () => {
    const ctx = {
      mapel: 'IPAS',
      topik: 'Siklus Air',
      fase: 'B',
      tujuanPembelajaran: 'Siswa menjelaskan siklus air.',
    };
    const artifact = vi.fn();
    const assessment = vi.fn();
    state.answers = [{ lkpd: validLesson.lkpd }, { evaluasi: validLesson.evaluasi }, validReview];
    await generateLkpdTugas(ctx, { onArtifact: artifact });
    await generateSoalEvaluasi(ctx, assessment, { onArtifact: artifact });
    await generateSoalEvaluasi(ctx, assessment, { onArtifact: artifact });
    expect(state.calls).toHaveLength(3);
    expect(assessment).toHaveBeenCalledTimes(2);
    expect(artifact).toHaveBeenLastCalledWith({ evaluasi: validLesson.evaluasi });
    expect(assessment.mock.calls[0][0].kunci).toHaveLength(5);
  });
  it('continues when cache is unavailable and leaves unknown token usage as null', async () => {
    state.cacheError = true;
    state.answers = [validLesson, validReview];
    const warning = vi.fn();
    const usage = vi.fn();
    await run(lessonContext, { onWarning: warning, onUsage: usage });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Cache pribadi'));
    expect(usage.mock.calls[0][0].tokens.total).toBeNull();
  });
  it('deduplicates an in-flight request while cancellation of one consumer leaves the other running', async () => {
    let finish: ((value: string) => void) | undefined;
    const generator = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const validate = (value: unknown): value is string => typeof value === 'string';
    const abort = new AbortController();
    const first = runModulAiRequest('dedupe', {}, validate, generator, { signal: abort.signal });
    const second = runModulAiRequest('dedupe', {}, validate, generator);
    const rejection = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(generator).toHaveBeenCalledTimes(1));
    abort.abort();
    finish?.('result');
    await rejection;
    expect(await second).toBe('result');
  });
  it('cancellation after generation prevents the review and cache write', async () => {
    const abort = new AbortController();
    state.handler = () => {
      abort.abort();
      return validLesson;
    };
    await expect(run(lessonContext, { signal: abort.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.waitFor(() => expect(state.usage[0]?.status).toBe('cancelled'));
    expect(state.calls).toHaveLength(1);
    expect(state.cache.size).toBe(0);
  });
  it('does not add reasoning tokens again to the provider total', () => {
    const result = aggregateUsage([
      {
        provider: 'groq',
        model: 'model',
        latencyMs: 1,
        status: 'completed',
        usage: { input: 10, output: 20, reasoning: 5, total: 30 },
      },
    ]);
    expect(result.total).toBe(30);
  });
});
