import { describe, it, expect } from 'vitest';
import { getHonorificTitle, formatDegreeProperly } from '../../src/utils/greetingUtils';

describe('greetingUtils - getHonorificTitle', () => {
  it('should return empty for student role', () => {
    expect(getHonorificTitle('Ahmad', 'L', null, 'student')).toBe('');
  });

  it('should prioritize explicit title', () => {
    expect(getHonorificTitle('Ahmad', 'L', 'Ustadz')).toBe('Ustadz');
    expect(getHonorificTitle('Siti', 'P', 'Ustadzah')).toBe('Ustadzah');
    expect(getHonorificTitle('Budi', 'L', 'Ust')).toBe('Ustadz');
    expect(getHonorificTitle('Rina', 'P', 'Ustz')).toBe('Ustadzah');
  });

  it('should return Ustadz / Ustadzah if name is missing or "Guru"', () => {
    expect(getHonorificTitle(null)).toBe('Ustadz / Ustadzah');
    expect(getHonorificTitle('Guru')).toBe('Ustadz / Ustadzah');
  });

  it('should return empty if name already contains honorific', () => {
    expect(getHonorificTitle('Ustadz Ahmad')).toBe('');
    expect(getHonorificTitle('Ustadzah Siti')).toBe('');
    expect(getHonorificTitle('Bu Rina')).toBe('');
    expect(getHonorificTitle('Pak Budi')).toBe('');
  });

  it('should use explicit gender if available', () => {
    expect(getHonorificTitle('Budi', 'Laki-laki')).toBe('Ustadz');
    expect(getHonorificTitle('Budi', 'Male')).toBe('Ustadz');
    expect(getHonorificTitle('Budi', 'L')).toBe('Ustadz');
    expect(getHonorificTitle('Rina', 'Perempuan')).toBe('Ustadzah');
    expect(getHonorificTitle('Rina', 'Female')).toBe('Ustadzah');
    expect(getHonorificTitle('Rina', 'P')).toBe('Ustadzah');
  });

  it('should fallback to name heuristics if gender is missing', () => {
    expect(getHonorificTitle('Siti Nurhaliza')).toBe('Ustadzah');
    expect(getHonorificTitle('Irene')).toBe('Ustadzah');
    expect(getHonorificTitle('Irene Agustina')).toBe('Ustadzah');
    expect(getHonorificTitle('Megawati')).toBe('Ustadzah');
    expect(getHonorificTitle('Wahyuningsih')).toBe('Ustadzah');
    expect(getHonorificTitle('Ahmad Budi')).toBe('Ustadz'); // Default to Ustadz if no female marker found
    expect(getHonorificTitle('Dewi Lestari')).toBe('Ustadzah');
    expect(getHonorificTitle('Muhammad Ali')).toBe('Ustadz');
  });

  it('should support Ibu and Bapak explicit title overrides', () => {
    expect(getHonorificTitle('Irene', null, 'Ibu')).toBe('Ibu');
    expect(getHonorificTitle('Budi', null, 'Bapak')).toBe('Bapak');
  });
});

describe('greetingUtils - formatDegreeProperly', () => {
  it('should preserve and normalize S.Pd properly', () => {
    expect(formatDegreeProperly('Bagas Riyadi, S.Pd')).toBe('Bagas Riyadi, S.Pd');
    expect(formatDegreeProperly('Bagas Riyadi, S.PD')).toBe('Bagas Riyadi, S.Pd');
    expect(formatDegreeProperly('BAGAS RIYADI, S.PD')).toBe('BAGAS RIYADI, S.Pd');
    expect(formatDegreeProperly('Bagas Riyadi, S.pd')).toBe('Bagas Riyadi, S.Pd');
  });

  it('should normalize other Indonesian academic degrees', () => {
    expect(formatDegreeProperly('Irene, S.PD.I')).toBe('Irene, S.Pd.I');
    expect(formatDegreeProperly('Ahmad, M.PD')).toBe('Ahmad, M.Pd');
    expect(formatDegreeProperly('Budi Santoso, S.KOM')).toBe('Budi Santoso, S.Kom');
    expect(formatDegreeProperly('Drs. H. Fauzi, M.AG')).toBe('Drs. H. Fauzi, M.Ag');
  });

  it('should handle empty or null values gracefully', () => {
    expect(formatDegreeProperly(null)).toBe('');
    expect(formatDegreeProperly(undefined)).toBe('');
    expect(formatDegreeProperly('')).toBe('');
  });
});

