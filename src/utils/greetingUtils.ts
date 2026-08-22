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
    const tLower = title.toLowerCase().trim();
    if (tLower.includes('ustadzah') || tLower.includes('ustz')) return 'Ustadzah';
    if (tLower.includes('ustadz') || tLower.includes('ust')) return 'Ustadz';
    if (tLower.includes('ibu') || tLower.includes('bu')) return 'Ibu';
    if (tLower.includes('bapak') || tLower.includes('pak')) return 'Bapak';
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
    const g = gender.toLowerCase().trim();
    if (g === 'perempuan' || g === 'female' || g === 'p' || g === 'w' || g.includes('wanita')) {
      return 'Ustadzah';
    }
    if (g === 'laki-laki' || g === 'laki' || g === 'male' || g === 'l' || g === 'm' || g.includes('pria')) {
      return 'Ustadz';
    }
  }

  // Common Indonesian, Islamic, and modern female name indicators
  const femaleMarkers = [
    'siti', 'nur', 'nurul', 'fitri', 'fitriani', 'fatimah', 'aisyah', 'aisha', 'dewi', 'sri', 'rina', 'diah',
    'nurlaila', 'lilis', 'eka', 'retno', 'indah', 'titi', 'yuni', 'eni', 'wati',
    'ani', 'suci', 'rahma', 'rahmah', 'zahra', 'zahrah', 'khadijah', 'maria', 'nisa', 'annisa', 'anisa', 'hasanah',
    'marlina', 'kusuma', 'nia', 'ratih', 'kartika', 'melati', 'hidayati', 'utami',
    'astuti', 'wahyuni', 'sulastri', 'suharti', 'widya', 'agustina', 'agustini', 'lestari',
    'anggraini', 'oktavia', 'oktaviani', 'dwi', 'tri', 'bu', 'ibu', 'ning', 'ukhti', 'ummi',
    'dian', 'lia', 'nita', 'lusi', 'lucy', 'desy', 'desi', 'maya', 'anti', 'irma', 'vivi', 'ayu',
    'ayunda', 'putri', 'khansa', 'salma', 'safira', 'syafira', 'syifa', 'syifaa', 'hilya',
    'nabila', 'alya', 'hana', 'hannah', 'amalia', 'amelia', 'shafa', 'mutiara', 'nadia',
    'nadya', 'novi', 'novia', 'novita', 'dinda', 'bella', 'tiara', 'rachel', 'grace',
    'maryam', 'marwah', 'sarah', 'sara', 'humaira', 'zaskia', 'clarissa', 'cynthia',
    'citra', 'cantika', 'diana', 'elisa', 'eliza', 'eva', 'fina', 'fani', 'fanny',
    'gita', 'helena', 'isna', 'icha', 'jihan', 'jasmine', 'keisha', 'laila', 'layla',
    'maharani', 'mira', 'mona', 'mutia', 'nadira', 'naila', 'nayla', 'olivia', 'pratiwi',
    'qonita', 'rahmi', 'rara', 'rika', 'rini', 'riska', 'rizka', 'safitri', 'salwa',
    'silvia', 'silvi', 'tania', 'tari', 'tasya', 'ulfa', 'ulfah', 'vania', 'vina',
    'wanda', 'wulan', 'yasmin', 'yolanda', 'yulia', 'yuliana', 'yunita', 'zahroh',
    'zulaikha', 'zulfa', 'irene', 'iren', 'irena'
  ];

  // Common female suffixes in Indonesian names
  const femaleSuffixes = ['wati', 'ningsih', 'astuti', 'putri', 'safitri', 'fitriani', 'agustini', 'oktaviani', 'hidayati', 'wahyuni'];

  const nameParts = lowerName.split(/[\s,.]+/);
  const isFemale = nameParts.some(part =>
    femaleMarkers.includes(part) ||
    femaleSuffixes.some(suffix => part.length > suffix.length && part.endsWith(suffix))
  );

  return isFemale ? 'Ustadzah' : 'Ustadz';
}

/**
 * Normalizes Indonesian academic degrees and titles to standard EYD casing.
 * Examples:
 * - "Bagas Riyadi, S.PD" -> "Bagas Riyadi, S.Pd"
 * - "Bagas Riyadi, S.PD." -> "Bagas Riyadi, S.Pd."
 * - "Irene, S.PD.I" -> "Irene, S.Pd.I"
 * - "Drs. H. Ahmad, M.PD" -> "Drs. H. Ahmad, M.Pd"
 */
export function formatDegreeProperly(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  let result = name.trim();

  // Convert ALL CAPS names to Title Case first (e.g. "BAGAS RIYADI" -> "Bagas Riyadi")
  // Only apply this if the name looks like it's mostly uppercase or lowercase
  const isMostlyUpper = result === result.toUpperCase();
  const isMostlyLower = result === result.toLowerCase();
  
  if (isMostlyUpper || isMostlyLower) {
    result = result.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
    );
  }

  // Regexes are built to handle optional dots and spaces (e.g., "S. PD", "S PD", "S.P.D")
  // \b ensures we only match whole words
  const DEGREE_REPLACEMENTS: [RegExp, string][] = [
    [/\bS\s*\.?\s*P\s*D\s*\.?\s*I\b/gi, 'S.Pd.I'],
    [/\bS\s*\.?\s*P\s*D\s*\.?\s*S\s*D\b/gi, 'S.Pd.SD'],
    [/\bS\s*\.?\s*P\s*D\b/gi, 'S.Pd'],
    [/\bM\s*\.?\s*P\s*D\s*\.?\s*I\b/gi, 'M.Pd.I'],
    [/\bM\s*\.?\s*P\s*D\b/gi, 'M.Pd'],
    [/\bS\s*\.?\s*K\s*O\s*M\b/gi, 'S.Kom'],
    [/\bM\s*\.?\s*K\s*O\s*M\b/gi, 'M.Kom'],
    [/\bS\s*\.?\s*A\s*G\b/gi, 'S.Ag'],
    [/\bM\s*\.?\s*A\s*G\b/gi, 'M.Ag'],
    [/\bS\s*\.?\s*S\s*I\b/gi, 'S.Si'],
    [/\bM\s*\.?\s*S\s*I\b/gi, 'M.Si'],
    [/\bS\s*\.?\s*S\s*O\s*S\b/gi, 'S.Sos'],
    [/\bM\s*\.?\s*S\s*O\s*S\b/gi, 'M.Sos'],
    [/\bS\s*\.?\s*P\s*S\s*I\b/gi, 'S.Psi'],
    [/\bM\s*\.?\s*P\s*S\s*I\b/gi, 'M.Psi'],
    [/\bS\s*\.?\s*K\s*E\s*D\b/gi, 'S.Ked'],
    [/\bS\s*\.?\s*K\s*E\s*P\b/gi, 'S.Kep'],
    [/\bS\s*\.?\s*F\s*A\s*R\s*M\b/gi, 'S.Farm'],
    [/\bS\s*\.?\s*S\s*N\b/gi, 'S.Sn'],
    [/\bM\s*\.?\s*S\s*N\b/gi, 'M.Sn'],
    [/\bS\s*\.?\s*T\b/gi, 'S.T.'],
    [/\bM\s*\.?\s*T\b/gi, 'M.T.'],
    [/\bS\s*\.?\s*H\b/gi, 'S.H.'],
    [/\bM\s*\.?\s*H\b/gi, 'M.H.'],
    [/\bS\s*\.?\s*E\b/gi, 'S.E.'],
    [/\bM\s*\.?\s*M\b/gi, 'M.M.'],
    [/\bS\s*\.?\s*P\b/gi, 'S.P.'],
    [/\bM\s*\.?\s*P\b/gi, 'M.P.'],
    [/\bD\s*R\s*A\b/gi, 'Dra.'],
    [/\bD\s*R\s*S\b/gi, 'Drs.'],
    [/\bP\s*R\s*O\s*F\b/gi, 'Prof.'],
    [/\bD\s*R\b/gi, 'Dr.'],
    [/\bH\s*J\b/gi, 'Hj.'],
  ];

  for (const [regex, replacement] of DEGREE_REPLACEMENTS) {
    result = result.replace(regex, replacement);
  }

  // Ensure trailing commas before degrees have a space after them (e.g., "Bagas,S.Pd" -> "Bagas, S.Pd")
  result = result.replace(/,([A-Za-z])/g, ', $1');

  // Fix multiple spaces
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}
