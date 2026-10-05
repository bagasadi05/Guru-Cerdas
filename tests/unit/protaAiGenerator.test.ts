import { describe, it, expect, vi, beforeEach } from 'vitest';

const gemini = vi.hoisted(() => ({ generateGeminiJson: vi.fn() }));
vi.mock('../../src/services/geminiService', () => gemini);

import {
  aiTopicsToProtaItems,
  generateProtaTopicsWithAi,
  parseAiProtaTopics,
} from '../../src/services/protaAiGenerator';

const topic = (tp: string, extra: Record<string, unknown> = {}) => ({
  element: 'Bilangan',
  code: '',
  tp,
  topic: `Bab ${tp}`,
  weight: 1,
  ...extra,
});

describe('parseAiProtaTopics', () => {
  it('cleans text, numbers missing codes across both semesters and clamps weights', () => {
    const parsed = parseAiProtaTopics(
      {
        semester1: [topic('  Memahami   pecahan '), topic('Mengukur sudut', { weight: 9 })],
        semester2: [topic('Membaca data', { code: 'TP 9.9' }), topic('Pola', { weight: 'x' })],
      },
      'MERDEKA'
    );

    expect(parsed.semester1[0]).toMatchObject({ tp: 'Memahami pecahan', code: 'TP 1', relativeWeight: 1 });
    expect(parsed.semester1[1].relativeWeight).toBe(3);
    expect(parsed.semester2[0].code).toBe('TP 9.9');
    expect(parsed.semester2[1]).toMatchObject({ code: 'TP 4', relativeWeight: 1 });
  });

  it('uses KD codes for Kurikulum 2013', () => {
    const parsed = parseAiProtaTopics(
      { semester1: [topic('a'), topic('b')], semester2: [topic('c'), topic('d')] },
      'K13'
    );
    expect(parsed.semester1[0].code).toBe('KD 1');
  });

  it('rejects answers that are missing a semester or too short', () => {
    expect(() => parseAiProtaTopics({ semester1: [topic('a'), topic('b')] }, 'MERDEKA')).toThrow(/semester 2/);
    expect(() =>
      parseAiProtaTopics({ semester1: [topic('a')], semester2: [topic('b'), topic('c')] }, 'MERDEKA')
    ).toThrow(/terlalu sedikit/);
    expect(() => parseAiProtaTopics('not json', 'MERDEKA')).toThrow();
  });

  it('drops empty entries and caps the list length', () => {
    const many = Array.from({ length: 15 }, (_, i) => topic(`TP ${i}`));
    const parsed = parseAiProtaTopics({ semester1: [{}, ...many], semester2: many }, 'MERDEKA');
    expect(parsed.semester1).toHaveLength(10);
  });
});

describe('generateProtaTopicsWithAi', () => {
  beforeEach(() => gemini.generateGeminiJson.mockReset());

  it('asks for the subject and grade and returns validated topics', async () => {
    gemini.generateGeminiJson.mockResolvedValue({
      semester1: [topic('a'), topic('b')],
      semester2: [topic('c'), topic('d')],
    });

    const result = await generateProtaTopicsWithAi({
      subject: 'Bahasa Jawa',
      gradeLevel: 'Kelas 3',
      phase: 'B',
      curriculum: 'MERDEKA',
    });

    const [prompt] = gemini.generateGeminiJson.mock.calls[0];
    expect(prompt).toContain('"Bahasa Jawa", Kelas 3 (Fase B)');
    expect(result.semester2.map((t) => t.tp)).toEqual(['c', 'd']);
  });
});

describe('aiTopicsToProtaItems', () => {
  it('scales hours to each semester target regardless of the model weights', () => {
    const topics = parseAiProtaTopics(
      {
        semester1: [topic('a', { weight: 2 }), topic('b'), topic('c', { weight: 0.5 })],
        semester2: [topic('d'), topic('e')],
      },
      'MERDEKA'
    );
    const items = aiTopicsToProtaItems(topics, 74, 70);

    const sum = (sem: 1 | 2) => items.filter((i) => i.semesterNumber === sem).reduce((s, i) => s + i.targetJp, 0);
    expect(sum(1)).toBe(74);
    expect(sum(2)).toBe(70);
    expect(items.map((i) => i.orderIndex)).toEqual([0, 1, 2, 3, 4]);
  });
});
