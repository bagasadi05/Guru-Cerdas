/**
 * Helper utility for determining teacher honorific titles (Ustadz / Ustadzah)
 */

export function getHonorificTitle(
  name?: string | null,
  gender?: string | null,
  title?: string | null,
  role?: string | null
): string {
  if (role === 'student') return '';

  // Explicit title override from user profile
  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('ustadzah') || tLower.includes('ustz')) return 'Ustadzah';
    if (tLower.includes('ustadz') || tLower.includes('ust')) return 'Ustadz';
  }

  if (!name || name === 'Guru') return 'Ustadz / Ustadzah';

  const lowerName = name.toLowerCase().trim();

  // If the name already starts with or contains honorifics, avoid duplication
  if (
    lowerName.startsWith('ustadzah') ||
    lowerName.startsWith('ustz') ||
    lowerName.startsWith('ustadz') ||
    lowerName.startsWith('ust.') ||
    lowerName.startsWith('bu ') ||
    lowerName.startsWith('ibu ') ||
    lowerName.startsWith('pak ')
  ) {
    return '';
  }

  // Explicit gender check if available in user metadata
  if (gender) {
    const g = gender.toLowerCase();
    if (g === 'perempuan' || g === 'female' || g === 'p' || g === 'w') {
      return 'Ustadzah';
    }
    if (g === 'laki-laki' || g === 'male' || g === 'l' || g === 'm') {
      return 'Ustadz';
    }
  }

  // Common Indonesian female name indicators
  const femaleMarkers = [
    'siti', 'nur', 'fitri', 'fatimah', 'aisyah', 'dewi', 'sri', 'rina', 'diah',
    'nurlaila', 'lilis', 'eka', 'retno', 'indah', 'titi', 'yuni', 'eni', 'wati',
    'ani', 'suci', 'rahma', 'zahra', 'khadijah', 'maria', 'nisa', 'hasanah',
    'marlina', 'kusuma', 'nia', 'ratih', 'kartika', 'melati', 'hidayati', 'utami',
    'astuti', 'wahyuni', 'sulastri', 'suharti', 'widya', 'agustina', 'lestari',
    'anggraini', 'oktavia', 'dwi', 'tri', 'bu', 'ibu', 'ning', 'ukhti', 'ummi',
    'dian', 'lia', 'nita', 'lusi', 'desy', 'desi', 'maya', 'anti', 'irma', 'vivi'
  ];

  const nameParts = lowerName.split(/[\s,.]+/);
  const isFemale = nameParts.some(part => femaleMarkers.includes(part));

  return isFemale ? 'Ustadzah' : 'Ustadz';
}
