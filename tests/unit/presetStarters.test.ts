import { describe, expect, it } from 'vitest';
import { PRESET_STARTERS } from '../../src/components/pages/modul-ajar/constants/presetStarters';

describe('Modul Ajar PRESET_STARTERS', () => {
  it('contains valid starter presets with required fields', () => {
    expect(PRESET_STARTERS.length).toBeGreaterThanOrEqual(4);

    for (const preset of PRESET_STARTERS) {
      expect(preset.id).toBeTruthy();
      expect(preset.title).toBeTruthy();
      expect(preset.data.mataPelajaran).toBeTruthy();
      expect(preset.data.topik).toBeTruthy();
      expect(preset.data.jenjang).toBeTruthy();
      expect(preset.data.kelas).toBeTruthy();
      expect(preset.data.fase).toBeTruthy();
      expect(preset.data.documentType).toBe('Modul Ajar');
      expect(preset.data.capaianPembelajaran).toBeTruthy();
    }
  });

  it('includes KBC starter with isKbcIntegrated and temaKbc', () => {
    const kbcPreset = PRESET_STARTERS.find(p => p.id === 'kbc');
    expect(kbcPreset).toBeDefined();
    expect(kbcPreset?.data.curriculumApproach).toBe('Berbasis Cinta');
    expect(kbcPreset?.data.isKbcIntegrated).toBe(true);
    expect(kbcPreset?.data.temaKbc?.length).toBeGreaterThan(0);
  });
});
