import { describe, it, expect } from 'vitest';
import { getHonorificTitle } from '../../src/utils/greetingUtils';

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
    expect(getHonorificTitle('Ahmad Budi')).toBe('Ustadz'); // Default to Ustadz if no female marker found
    expect(getHonorificTitle('Dewi Lestari')).toBe('Ustadzah');
    expect(getHonorificTitle('Muhammad Ali')).toBe('Ustadz');
  });
});
