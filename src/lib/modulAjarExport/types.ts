/**
 * Shared export model for Modul Ajar / RPP documents.
 *
 * This module is isomorphic: it is imported by the browser bundle and by the
 * Vercel functions under `api/document-export`. Do not use `import.meta.env`,
 * `window`, or `document` anywhere in this folder.
 */

export type PaperSize = 'A4' | 'F4';
export type ExportVariant = 'guru' | 'siswa';
export type ExportFormat = 'pdf' | 'docx';

export const PAPER_SIZES: readonly PaperSize[] = ['A4', 'F4'];

/** Physical page sizes in millimetres (portrait). */
export const PAPER_DIMENSIONS_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215, height: 330 },
};

/** Print margin on every side, in millimetres (PRD: 2 cm). */
export const PAGE_MARGIN_MM = 20;

/** Upper bound on stored HTML we are willing to render (bytes of UTF-16 text). */
export const MAX_EXPORT_HTML_LENGTH = 3_000_000;

export const ALLOWED_TAGS = [
  'div',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'br',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'img',
] as const;

export type ExportTag = (typeof ALLOWED_TAGS)[number];

/** Inline CSS properties preserved from the stored template, already validated. */
export type ExportStyle = Partial<Record<string, string>>;

export interface ExportElement {
  type: 'element';
  tag: ExportTag;
  style: ExportStyle;
  /** Only allowlisted class names (layout hints such as `signature-block`). */
  classes: string[];
  colSpan?: number;
  rowSpan?: number;
  /** `data:image/...;base64` URI. External URLs are never kept. */
  src?: string;
  alt?: string;
  children: ExportNode[];
}

export interface ExportText {
  type: 'text';
  text: string;
}

export type ExportNode = ExportElement | ExportText;

export interface LessonPlanIdentity {
  documentType: string;
  mataPelajaran: string;
  topik: string;
  kelas: string;
  fase: string;
  satuanPendidikan: string;
  tahunAjaran: string;
  semester: string;
  guru: string;
}

/** Single source for both the PDF print template and the DOCX builder. */
export interface LessonPlanExportData {
  lessonPlanId: string;
  identity: LessonPlanIdentity;
  paperSize: PaperSize;
  variant: ExportVariant;
  body: ExportNode[];
}

/** Columns of `public.lesson_plans` the exporter reads. */
export interface LessonPlanRow {
  id: string;
  user_id: string;
  document_type: string | null;
  identity: unknown;
  components: unknown;
  generated_content: unknown;
}

export function isPaperSize(value: unknown): value is PaperSize {
  return value === 'A4' || value === 'F4';
}

export function isExportVariant(value: unknown): value is ExportVariant {
  return value === 'guru' || value === 'siswa';
}
