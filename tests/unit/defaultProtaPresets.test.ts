import { describe, it, expect } from 'vitest';
import {
  scaleTopicsToTargetJp,
  getCurriculumPreset,
  generateQuickDistributedProta,
  CURATED_PROTA_PRESETS,
} from '../../src/data/defaultProtaPresets';

describe('defaultProtaPresets', () => {
  it('has valid curated presets for core subjects', () => {
    expect(CURATED_PROTA_PRESETS.length).toBeGreaterThanOrEqual(5);
    const subjects = CURATED_PROTA_PRESETS.map((p) => p.subject);
    expect(subjects).toContain('Matematika');
    expect(subjects).toContain('Bahasa Indonesia');
    expect(subjects).toContain('IPAS');
    expect(subjects).toContain('Pendidikan Pancasila');
    expect(subjects).toContain('Pendidikan Agama Islam');
  });

  it('scaleTopicsToTargetJp produces exact sum of target JP', () => {
    const sampleTopics = [
      { element: 'A', code: 'TP 1', tp: 'TP 1 text', topic: 'Bab 1', relativeWeight: 1 },
      { element: 'B', code: 'TP 2', tp: 'TP 2 text', topic: 'Bab 2', relativeWeight: 1.2 },
      { element: 'C', code: 'TP 3', tp: 'TP 3 text', topic: 'Bab 3', relativeWeight: 0.8 },
      { element: 'D', code: 'TP 4', tp: 'TP 4 text', topic: 'Bab 4', relativeWeight: 1 },
    ];

    const targets = [36, 68, 72, 70, 75, 45, 12, 100];
    for (const target of targets) {
      const scaled = scaleTopicsToTargetJp(sampleTopics, 1, target);
      expect(scaled.length).toBe(sampleTopics.length);
      const sum = scaled.reduce((acc, it) => acc + it.targetJp, 0);
      expect(sum).toBe(target);
    }
  });

  it('getCurriculumPreset returns scaled prota items with exact hours for Sem 1 and Sem 2', () => {
    const targetSem1 = 70;
    const targetSem2 = 66;
    const items = getCurriculumPreset('Matematika', 'Kelas 4', targetSem1, targetSem2);
    expect(items).not.toBeNull();

    if (items) {
      const sem1Items = items.filter((i) => i.semesterNumber === 1);
      const sem2Items = items.filter((i) => i.semesterNumber === 2);

      const sumSem1 = sem1Items.reduce((acc, i) => acc + i.targetJp, 0);
      const sumSem2 = sem2Items.reduce((acc, i) => acc + i.targetJp, 0);

      expect(sumSem1).toBe(targetSem1);
      expect(sumSem2).toBe(targetSem2);
    }
  });

  it('generateQuickDistributedProta creates clean items matching target hours', () => {
    const targetSem1 = 72;
    const targetSem2 = 68;
    const items = generateQuickDistributedProta('Bahasa Sunda', 'Kelas 4', 4, 3, targetSem1, targetSem2);

    expect(items.length).toBe(7);
    const sumSem1 = items.filter((i) => i.semesterNumber === 1).reduce((acc, i) => acc + i.targetJp, 0);
    const sumSem2 = items.filter((i) => i.semesterNumber === 2).reduce((acc, i) => acc + i.targetJp, 0);

    expect(sumSem1).toBe(targetSem1);
    expect(sumSem2).toBe(targetSem2);
  });
});
