/**
 * AI output often packs structure into one line ("Petunjuk: ... Langkah Kerja: 1. ... 2. ...",
 * "Soal? A. ... B. ..."). These helpers restore the line breaks the formatters expect.
 */
export const LKPD_LABELS = 'Judul LKPD|Judul|Petunjuk|Alat dan Bahan|Alat|Bahan|Langkah Kerja|Tujuan';

export const expandInlineLkpdLines = (text: string): string[] => {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim();
    if (!line) {
      lines.push('');
      continue;
    }
    // Labels glued to the previous sentence start their own line.
    line = line.replace(new RegExp(`(?<=[.!?])\\s+(?=(?:${LKPD_LABELS})\\s*:)`, 'gi'), '\n');
    // Answer-box placeholders such as "[Kotak untuk Menggambar]" are their own block.
    line = line.replace(/\s*(\[[^\]\n]{2,}\])\s*/g, '\n$1\n');
    // A run of "1. ... 2. ..." in one line becomes a list.
    line = line
      .split('\n')
      .map((part) =>
        /\b1\.\s+\S[\s\S]*\b2\.\s+/.test(part)
          ? part.replace(/(?<=[.!?:'")\]])\s+(?=\d+\.\s+\S)/g, '\n')
          : part,
      )
      .join('\n');
    // "Langkah Kerja: 1. Baca ..." keeps the label alone so the list can follow.
    line = line.replace(new RegExp(`^((?:${LKPD_LABELS})\\s*:)\\s+(?=1\\.\\s+\\S)`, 'i'), '$1\n');
    lines.push(...line.split('\n').map((part) => part.trim()).filter(Boolean));
  }
  return lines;
};

const INLINE_OPTIONS = /\s+(?=[A-D]\.\s+\S)/g;

/** Splits "Soal? A. x B. y C. z D. w" into the prompt and one line per option. */
export const expandInlineOptions = (lines: string[]): string[] => {
  const [first = '', ...rest] = lines;
  if (!/\sA\.\s+\S[\s\S]*\sB\.\s+\S/.test(first)) return lines;
  const [prompt, ...options] = first.split(INLINE_OPTIONS);
  return [prompt.trim(), ...options.map((option) => option.trim()), ...rest];
};
