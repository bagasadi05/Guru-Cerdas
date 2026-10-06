import {
  findElements,
  isElement,
  locateElement,
  parseDocumentHtml,
  textContent,
} from './documentTree';
import {
  MAX_EXPORT_HTML_LENGTH,
  isPaperSize,
  type ExportElement,
  type ExportNode,
  type ExportVariant,
  type LessonPlanExportData,
  type LessonPlanIdentity,
  type LessonPlanRow,
  type PaperSize,
} from './types';

export type ExportDataErrorCode = 'EMPTY_DOCUMENT' | 'DOCUMENT_TOO_LARGE';

export class ExportDataError extends Error {
  constructor(
    public readonly code: ExportDataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExportDataError';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/** `generated_content` is `text` in the generated types but `jsonb` in the legacy baseline. */
function readGeneratedHtml(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
      } catch {
        // Not a JSON string literal; treat as raw HTML.
      }
    }
    return value;
  }
  const record = asRecord(value);
  return typeof record.html === 'string' ? record.html : '';
}

export function mapLessonPlanIdentity(row: Pick<LessonPlanRow, 'identity' | 'document_type'>): LessonPlanIdentity {
  const identity = asRecord(row.identity);
  return {
    documentType: asText(row.document_type) || 'Modul Ajar',
    mataPelajaran: asText(identity.mapel),
    topik: asText(identity.topik),
    kelas: asText(identity.kelas),
    fase: asText(identity.fase),
    satuanPendidikan: asText(identity.satuanPendidikan),
    tahunAjaran: asText(identity.tahun),
    semester: asText(identity.semester),
    guru: asText(identity.guru),
  };
}

export function resolvePaperSize(row: Pick<LessonPlanRow, 'components'>, requested?: unknown): PaperSize {
  if (isPaperSize(requested)) return requested;
  const stored = asRecord(row.components).paperSize;
  return isPaperSize(stored) ? stored : 'A4';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nextElementSibling(body: ExportNode[], element: ExportElement): ExportElement | null {
  const location = locateElement(body, element);
  if (!location) return null;
  for (let i = location.index + 1; i < location.siblings.length; i += 1) {
    const sibling = location.siblings[i];
    if (isElement(sibling)) return sibling;
  }
  return null;
}

function isNestedIn(candidate: ExportElement, ancestors: ExportElement[]): boolean {
  return ancestors.some(
    (ancestor) =>
      ancestor !== candidate && findElements(ancestor.children, (el) => el === candidate).length > 0,
  );
}

/**
 * Builds the LKPD-only document (cover, activity sheet, evaluation, references)
 * from the full teacher document. Mirrors `extractStudentHtml` in the UI so the
 * exported file matches the "Lembar Siswa" preview.
 */
export function buildStudentBody(body: ExportNode[], identity: LessonPlanIdentity): ExportNode[] {
  const dashedBoxes = findElements(body, (el) => el.tag === 'div' && /2px\s+dashed/i.test(el.style.border ?? ''));
  const topLevelBoxes = dashedBoxes.filter((box) => !isNestedIn(box, dashedBoxes));
  if (topLevelBoxes.length < 2) return body;

  const [lkpdBox, evaluasiBox] = topLevelBoxes;

  const referenceHeadings = findElements(
    body,
    (el) => (el.tag === 'td' || el.tag === 'div') && textContent(el).includes('DAFTAR PUSTAKA'),
  ).filter((el) => !el.children.some((child) => isElement(child) && textContent(child).includes('DAFTAR PUSTAKA')));
  const referenceList = referenceHeadings.length > 0 ? nextElementSibling(body, referenceHeadings[0]) : null;
  const referenceItems = referenceList
    ? referenceList.tag === 'ul' || referenceList.tag === 'ol'
      ? referenceList.children
      : referenceList.children.filter((child) => isElement(child) && child.tag === 'li')
    : [];

  const logo = findElements(body, (el) => el.tag === 'img')[0];
  const field = (value: string) => escapeHtml(value || '-');

  const cover = parseDocumentHtml(`
    <div style="text-align: center; margin-bottom: 20px; page-break-after: always;">
      <h1 style="font-size: 16pt; margin: 0; font-weight: bold;">LEMBAR AKTIVITAS &amp; EVALUASI SISWA</h1>
      <h1 style="font-size: 16pt; margin: 5px 0 0 0; font-weight: bold;">KURIKULUM MERDEKA</h1>
      <h2 style="font-size: 14pt; margin: 15px 0; font-weight: bold; text-transform: uppercase;">${field(identity.mataPelajaran)}</h2>
      <h2 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase;">KELAS ${field(identity.kelas)} (FASE ${field(identity.fase)})</h2>
      <div style="margin: 25px auto; text-align: center;"></div>
      <table style="margin: 20px auto; text-align: left; font-size: 11pt; border: none;">
        <tr><td style="padding: 5px 15px; border: none; font-weight: bold;">Materi Pokok</td><td style="padding: 5px; border: none;">: ${field(identity.topik)}</td></tr>
        <tr><td style="padding: 5px 15px; border: none; font-weight: bold;">Satuan Pendidikan</td><td style="padding: 5px; border: none;">: ${field(identity.satuanPendidikan)}</td></tr>
        <tr><td style="padding: 5px 15px; border: none; font-weight: bold;">Tahun Ajaran</td><td style="padding: 5px; border: none;">: ${field(identity.tahunAjaran)}</td></tr>
      </table>
      <p style="margin-top: 35px; font-style: italic; color: #555555;">"Semangat Belajar! Lakukan yang Terbaik."</p>
    </div>
  `);

  if (logo) {
    const coverRoot = cover.find(isElement);
    const logoSlot = coverRoot?.children.filter(isElement).find((el) => el.tag === 'div' && el.children.length === 0);
    if (logoSlot) logoSlot.children = [{ ...logo, style: { ...logo.style, width: '110px', height: '110px' } }];
  }

  const evaluasi: ExportElement = {
    ...evaluasiBox,
    style: { ...evaluasiBox.style, 'page-break-before': 'always' },
  };

  const studentBody: ExportNode[] = [...cover, lkpdBox, evaluasi];

  if (referenceItems.length > 0) {
    studentBody.push({
      type: 'element',
      tag: 'div',
      style: { 'margin-top': '30px', 'font-size': '10pt', 'line-height': '1.4' },
      classes: [],
      children: [
        {
          type: 'element',
          tag: 'strong',
          style: {},
          classes: [],
          children: [{ type: 'text', text: 'Daftar Pustaka & Referensi Belajar:' }],
        },
        {
          type: 'element',
          tag: 'ul',
          style: { margin: '5px 0 0 0', 'padding-left': '20px' },
          classes: [],
          children: referenceItems,
        },
      ],
    });
  }

  return studentBody;
}

/**
 * Maps a stored `lesson_plans` row to the export model shared by the PDF
 * template and the DOCX builder. The stored HTML is the authoritative body
 * because teacher edits in the preview are persisted there.
 */
export function mapLessonPlanToExportData(
  row: LessonPlanRow,
  options: { paperSize?: unknown; variant?: ExportVariant } = {},
): LessonPlanExportData {
  const html = readGeneratedHtml(row.generated_content);
  if (!html.trim()) {
    throw new ExportDataError('EMPTY_DOCUMENT', 'Dokumen belum memiliki isi untuk diekspor.');
  }
  if (html.length > MAX_EXPORT_HTML_LENGTH) {
    throw new ExportDataError('DOCUMENT_TOO_LARGE', 'Dokumen terlalu besar untuk diekspor.');
  }

  const identity = mapLessonPlanIdentity(row);
  const variant = options.variant ?? 'guru';
  const fullBody = parseDocumentHtml(html);

  return {
    lessonPlanId: row.id,
    identity,
    paperSize: resolvePaperSize(row, options.paperSize),
    variant,
    body: variant === 'siswa' ? buildStudentBody(fullBody, identity) : fullBody,
  };
}
