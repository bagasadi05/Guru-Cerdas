/**
 * Regression tests for the Modul Ajar audit (docs/audit-modul-ajar-2026-10-04.md).
 * The form and generator hooks run together, as on the page.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fx = vi.hoisted(() => ({
  inserts: [] as any[],
  boilerplate: null as any,
  aiCalls: [] as any[],
}));

vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Guru A' } }) }));
vi.mock('../../src/contexts/SemesterContext', () => ({ useOptionalSemester: () => null }));
vi.mock('../../src/services/modelIdResolver', () => ({ resolveModelId: async () => null }));
vi.mock('../../src/services/modulAjarContentService', () => ({
  modulAjarContentService: {
    getBoilerplate: async () => fx.boilerplate,
    getSintaksKegiatan: async () => [],
  },
}));
vi.mock('../../src/services/modulAjarAiGenerator', () => ({
  generateModulAjarAiContent: async (...args: any[]) => {
    fx.aiCalls.push(args);
    return { tujuanPembelajaran: ['AI TP'], lkpdTugas: 'LKPD AI' };
  },
  normalizeSoalEvaluasi: (v: any) => v || '',
}));
vi.mock('../../src/services/modulAjarAiService', () => ({ modulAjarAiService: { checkCacheHit: async () => false } }));
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: (row: any) => {
        fx.inserts.push(row);
        return { select: () => ({ single: async () => ({ data: { id: `plan-${fx.inserts.length}` }, error: null }) }) };
      },
    }),
  },
}));

import { buildHtmlTemplate, extractStudentHtml } from '../../src/components/pages/modul-ajar/utils/template';
import { useModulAjarGenerator } from '../../src/components/pages/modul-ajar/hooks/useModulAjarGenerator';
import { createDefaultFormState, useModulAjarForm } from '../../src/components/pages/modul-ajar/hooks/useModulAjarForm';
import { useModulAjarAiJob } from '../../src/components/pages/modul-ajar/hooks/useModulAjarAiJob';

const notify = { success: vi.fn(), error: vi.fn() };

const renderWorkspace = () =>
  renderHook(() => {
    const form = useModulAjarForm();
    const gen = useModulAjarGenerator({
      formState: form.formState,
      setFormState: form.setFormState,
      user: { id: 'u1' },
      models: [],
      t: { lessonPlan: { validateSubject: 'x', saveSuccess: 'ok', saveFailed: '{message}' } },
      isAiEnabled: false,
      logoBase64: '',
      fetchHistory: vi.fn(),
      setGeneratedDocument: vi.fn(),
      setAiCacheWarning: vi.fn(),
      isFieldOwnedByTeacher: form.isFieldOwnedByTeacher,
      applyGeneratedContent: form.applyGeneratedContent,
      notify,
    });
    return { form, gen };
  });

type Workspace = ReturnType<typeof renderWorkspace>;

const setFields = (ws: Workspace, fields: Record<string, unknown>) =>
  act(() => {
    Object.entries(fields).forEach(([k, v]) => ws.result.current.form.handleInputChange(k as any, v));
  });

const generate = (ws: Workspace) =>
  act(async () => {
    await ws.result.current.gen.generateManualModulAjar();
  });

const lesson = { mataPelajaran: 'IPAS', topik: 'Siklus Air', kelas: '3', capaianPembelajaran: 'CP', profilPelajar: ['Mandiri'] };

beforeEach(() => {
  fx.inserts = [];
  fx.boilerplate = null;
  fx.aiCalls = [];
  notify.success.mockReset();
  notify.error.mockReset();
});

describe('content of one topic never leaks into the next', () => {
  it('regenerating after a topic change uses the new topic only', async () => {
    const ws = renderWorkspace();
    setFields(ws, lesson);
    await generate(ws);
    setFields(ws, { topik: 'Gaya Magnet' });
    await waitFor(() => expect(ws.result.current.form.formState.manualTujuanPembelajaran).toBe(''));
    await generate(ws);

    const second = fx.inserts[1];
    expect(second.identity.topik).toBe('Gaya Magnet');
    expect(JSON.stringify(second.components.tujuanPembelajaran)).not.toContain('Siklus Air');
    expect(second.components.lkpdTugas).not.toContain('Siklus Air');
    expect(JSON.stringify(second.components.rubrik)).toContain('Gaya Magnet');
    expect(JSON.stringify(second.components.rubrik)).not.toContain('Siklus Air');
    // The default rubric is built per document, not stored in the form.
    expect(ws.result.current.form.formState.rubrikAsesmen).toEqual([]);
  });

  it('keeps generated text the teacher edited when the topic changes', async () => {
    const ws = renderWorkspace();
    setFields(ws, lesson);
    await generate(ws);
    setFields(ws, { manualLkpdTugas: 'LKPD buatan guru' });
    setFields(ws, { topik: 'Gaya Magnet' });
    await waitFor(() => expect(ws.result.current.form.formState.manualTujuanPembelajaran).toBe(''));
    expect(ws.result.current.form.formState.manualLkpdTugas).toBe('LKPD buatan guru');
  });

  it('adds the KBC insertion phrase once, also when regenerating', async () => {
    const ws = renderWorkspace();
    setFields(ws, { ...lesson, isKbcIntegrated: true, materiInsersi: 'cinta ilmu' });
    await generate(ws);
    await generate(ws);
    const tp = fx.inserts[1].components.tujuanPembelajaran[0] as string;
    expect(tp.match(/\(cinta ilmu\)/g)).toHaveLength(1);
    expect(ws.result.current.form.formState.manualTujuanPembelajaran).not.toContain('cinta ilmu');
  });

  it('reports results through toasts, not alert()', async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    const ws = renderWorkspace();
    setFields(ws, lesson);
    await generate(ws);
    expect(notify.success).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('AI document respects what the teacher wrote', () => {
  it('uses the teacher objectives and only fills the rest from AI', async () => {
    const ws = renderWorkspace();
    setFields(ws, { ...lesson, manualTujuanPembelajaran: 'TP tulisan guru' });
    await act(async () => {
      await ws.result.current.gen.renderPrivateDraftAiModulAjar({ tujuanPembelajaran: ['AI TP'], lkpdTugas: 'LKPD AI' });
    });
    const html = fx.inserts[0].generated_content as string;
    expect(html).toContain('TP tulisan guru');
    expect(html).not.toContain('AI TP');
    expect(ws.result.current.form.formState.manualTujuanPembelajaran).toBe('TP tulisan guru');
    expect(ws.result.current.form.formState.manualLkpdTugas).toBe('LKPD AI');
  });

  it('treats a field filled with its AI button as the teacher\'s, until the topic changes', async () => {
    const ws = renderWorkspace();
    setFields(ws, lesson);
    act(() => ws.result.current.form.setFieldFromAi('manualTujuanPembelajaran', 'TP dari tombol AI'));
    expect(ws.result.current.form.isFieldOwnedByTeacher('manualTujuanPembelajaran')).toBe(true);
    setFields(ws, { topik: 'Gaya Magnet' });
    await waitFor(() => expect(ws.result.current.form.formState.manualTujuanPembelajaran).toBe(''));
  });
});

describe('restore and reset', () => {
  it('keeps a restored manual plan\'s content and fills only empty fields from the bank', async () => {
    fx.boilerplate = { tujuan_pembelajaran: ['TP bank'], lkpd_tugas: 'LKPD bank', konten_json: {} };
    const ws = renderWorkspace();
    act(() => {
      ws.result.current.form.resetFormToDraft({
        generation_method: 'Manual',
        identity: { mapel: 'IPAS', topik: 'Siklus Air', kelas: '3', fase: 'B' },
        components: { tujuanPembelajaran: ['TP tulisan guru'] },
      });
    });
    await waitFor(() => expect(ws.result.current.form.formState.manualLkpdTugas).toBe('LKPD bank'), { timeout: 2000 });
    expect(ws.result.current.form.formState.manualTujuanPembelajaran).toBe('TP tulisan guru');
  });

  it('reset uses the same defaults as a fresh form', () => {
    const ws = renderWorkspace();
    const fresh = ws.result.current.form.formState;
    act(() => {
      ws.result.current.form.resetFormToDraft();
    });
    const f = ws.result.current.form.formState;
    expect(f.satuanPendidikan).toBe(fresh.satuanPendidikan);
    expect(f.generationMethod).toBe(fresh.generationMethod);
    expect(f.alokasiPendahuluan + f.alokasiInti + f.alokasiPenutup).toBe(f.jpPerPertemuan * f.durasiPerJp);
  });
});

describe('Lembar Siswa', () => {
  const form = createDefaultFormState({ guru: 'Guru A', tahunAjaran: '2026/2027', semester: 'Ganjil' });
  Object.assign(form, { mataPelajaran: 'IPAS', kelas: '3', fase: 'B', topik: 'Siklus Air' });
  const html = buildHtmlTemplate(form, {
    tujuanPembelajaran: ['TP'],
    kegiatanInti: [],
    lkpdTugas: '### LKPD: Eksplorasi\nAmati gambar.\n[Kotak untuk Menuliskan Hasil]',
    soalEvaluasi: '1. Apa itu hujan?\nA. air\nB. api',
  }, 2, '');

  it('includes both the LKPD and the evaluation sheet', () => {
    const student = extractStudentHtml(html, form, '');
    expect(student).toContain('LEMBAR KERJA PESERTA DIDIK');
    expect(student).toContain('LEMBAR EVALUASI PENGETAHUAN');
    expect(student).not.toContain('KUNCI JAWABAN');
  });

  it('still finds both sheets in documents saved before the sheet markers', () => {
    const legacy = html.replace(/ data-sheet="[a-z]+"/g, '');
    const student = extractStudentHtml(legacy, form, '');
    expect(student).toContain('LEMBAR EVALUASI PENGETAHUAN');
  });
});

describe('AI job', () => {
  const form: any = { mataPelajaran: 'IPAS', topik: 'Siklus Air', fase: 'B', selectedModelId: 'pbl', metodePembelajaran: [] };

  it('reports a document that could not be saved', async () => {
    const onError = vi.fn();
    const onSuccess = vi.fn(async () => { throw new Error('Gagal menyimpan ke database'); });
    const { result } = renderHook(() => useModulAjarAiJob(form, onSuccess, onError));
    await act(async () => { await result.current.startJob(); });
    expect(onError).toHaveBeenCalledWith('Gagal menyimpan ke database');
    expect(result.current.jobStatus).toBe('failed');
  });

  it('sends the teacher\'s lesson context with the prompt', async () => {
    const context = { kelas: '3', kbc: { tema: ['Cinta Ilmu'], materiInsersi: 'syukur' } };
    const { result } = renderHook(() => useModulAjarAiJob(form, vi.fn(), vi.fn(), () => context));
    await act(async () => { await result.current.startJob(); });
    expect(fx.aiCalls[0][6]).toEqual(context);
  });
});
