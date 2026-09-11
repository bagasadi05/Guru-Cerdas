/**
 * Text Sanitizer Utility
 * 
 * Provides functions to sanitize and normalize text inputs, preventing homoglyph
 * confusion (e.g. Greek Iota U+0399 looking like Latin I U+0049) and ensuring
 * safe rendering in jsPDF standard fonts (WinAnsi / Windows-1252) where unsupported
 * unicode characters can degrade into unexpected symbols (such as TM / trademark).
 */

const HOMOGLYPH_MAP: Record<string, string> = {
  // Greek uppercase
  '\u0391': 'A',
  '\u0392': 'B',
  '\u0395': 'E',
  '\u0396': 'Z',
  '\u0397': 'H',
  '\u0399': 'I', // Greek Capital Letter Iota -> Latin I
  '\u039A': 'K',
  '\u039C': 'M',
  '\u039D': 'N',
  '\u039F': 'O',
  '\u03A1': 'P',
  '\u03A4': 'T',
  '\u03A5': 'Y',
  '\u03A7': 'X',

  // Greek lowercase
  '\u03B1': 'a',
  '\u03B2': 'b',
  '\u03B5': 'e',
  '\u03B9': 'i',
  '\u03BA': 'k',
  '\u03BF': 'o',
  '\u03C1': 'p',
  '\u03C4': 't',
  '\u03C5': 'u',
  '\u03BD': 'v',
  '\u03C7': 'x',

  // Cyrillic uppercase
  '\u0410': 'A',
  '\u0412': 'B',
  '\u0415': 'E',
  '\u041A': 'K',
  '\u041C': 'M',
  '\u041D': 'H',
  '\u041E': 'O',
  '\u0420': 'P',
  '\u0421': 'C',
  '\u0422': 'T',
  '\u0423': 'Y',
  '\u0425': 'X',

  // Cyrillic lowercase
  '\u0430': 'a',
  '\u0435': 'e',
  '\u043E': 'o',
  '\u0440': 'p',
  '\u0441': 'c',
  '\u0443': 'y',
  '\u0445': 'x',

  // Quotes and apostrophes
  '\u2018': "'", // Left single quotation mark
  '\u2019': "'", // Right single quotation mark
  '\u201A': "'",
  '\u201B': "'",
  '\u02BB': "'", // Modifier letter turned comma (ʻOkina)
  '\u02BC': "'", // Modifier letter apostrophe
  '\u2032': "'", // Prime
  '\u2035': "'", // Reversed prime
  '\u0060': "'", // Grave accent
  '\u00B4': "'", // Acute accent
  '\u201C': '"', // Left double quotation mark
  '\u201D': '"', // Right double quotation mark
  '\u201E': '"',
  '\u201F': '"',
  '\u00AB': '"',
  '\u00BB': '"',

  // Dashes and hyphens
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '-',
  '\u2013': '-', // En-dash
  '\u2014': '-', // Em-dash
  '\u2015': '-', // Horizontal bar
  '\u2212': '-', // Minus sign

  // Ellipsis
  '\u2026': '...',

  // Spacing and invisible formatting
  '\u00A0': ' ', // Non-breaking space
  '\u2002': ' ', // En space
  '\u2003': ' ', // Em space
  '\u2009': ' ', // Thin space
  '\u200A': ' ', // Hair space
  '\u200B': '',  // Zero-width space
  '\u200C': '',  // Zero-width non-joiner
  '\u200D': '',  // Zero-width joiner
  '\uFEFF': '',  // BOM
};

const HOMOGLYPH_REGEX = new RegExp(
  Object.keys(HOMOGLYPH_MAP)
    .map(k => `\\u${k.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('|'),
  'g'
);

/**
 * Replace Greek/Cyrillic homoglyphs, typographic punctuation, and invisible characters
 * with their standard ASCII/Latin counterparts.
 */
export function normalizeHomoglyphs(text: string): string {
  if (!text) return '';
  return text.replace(HOMOGLYPH_REGEX, match => HOMOGLYPH_MAP[match] ?? match);
}

/**
 * Normalize and sanitize a student's full name.
 * Converts homoglyphs, removes unwanted non-printable characters, collapses multiple whitespace,
 * and preserves valid letters, numbers, standard spaces, apostrophes, and dots.
 */
export function normalizeStudentName(name: string | null | undefined): string {
  if (!name) return '';
  const homoglyphsReplaced = normalizeHomoglyphs(name);
  return homoglyphsReplaced
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize and sanitize general text for safe PDF generation with standard jsPDF fonts (Helvetica, etc.).
 * Strips/normalizes diacritics and replaces characters that would otherwise corrupt or render as
 * unexpected symbols (e.g. TM, control characters) under Windows-1252 / WinAnsiEncoding.
 */
export function normalizeTextForPdf(text: string | null | undefined): string {
  if (!text) return '';
  const homoglyphsReplaced = normalizeHomoglyphs(text);

  // Decompose accented characters (e.g. é -> e, à -> a)
  const decomposed = homoglyphsReplaced.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Filter remaining characters: allow ASCII printable (32-126), newlines, and safe Latin-1 supplement
  let result = '';
  for (let i = 0; i < decomposed.length; i++) {
    const code = decomposed.charCodeAt(i);
    // Allow newline (10), carriage return (13), tab (9)
    if (code === 10 || code === 13 || code === 9) {
      result += decomposed[i];
    } else if (code >= 32 && code <= 126) {
      result += decomposed[i];
    } else if (code >= 160 && code <= 255) {
      // Latin-1 safe characters
      result += decomposed[i];
    } else {
      // Replace any unsupported character with space or omit if zero-width
      result += ' ';
    }
  }

  return result;
}
