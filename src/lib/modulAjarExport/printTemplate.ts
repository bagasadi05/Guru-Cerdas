import { isHeadingBar } from './documentTree';
import {
  PAGE_MARGIN_MM,
  PAPER_DIMENSIONS_MM,
  type ExportElement,
  type ExportNode,
  type LessonPlanExportData,
} from './types';

const VOID_TAGS = new Set(['br', 'img']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tables up to this many rows are kept on one page (rubrics, reflection sheets, identity blocks). */
const KEEP_TOGETHER_MAX_ROWS = 8;

function countRows(table: ExportElement): number {
  let rows = 0;
  for (const child of table.children) {
    if (child.type !== 'element') continue;
    if (child.tag === 'tr') rows += 1;
    else if (child.tag === 'thead' || child.tag === 'tbody') rows += countRows(child);
  }
  return rows;
}

function serializeStyle(style: Record<string, string | undefined>): string {
  return Object.entries(style)
    .filter(([, value]) => value)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

/** Serializes the allowlisted tree back to HTML. Every attribute is generated here. */
export function serializeNodes(nodes: ExportNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return escapeHtml(node.text);

      const attrs: string[] = [];
      const style = serializeStyle(
        node.tag === 'table' && countRows(node) <= KEEP_TOGETHER_MAX_ROWS
          ? { 'break-inside': 'avoid', ...node.style }
          : isHeadingBar(node)
            ? { 'break-after': 'avoid', ...node.style }
            : node.style,
      );
      if (style) attrs.push(`style="${escapeHtml(style)}"`);
      if (node.classes.length > 0) attrs.push(`class="${escapeHtml(node.classes.join(' '))}"`);
      if (node.colSpan) attrs.push(`colspan="${node.colSpan}"`);
      if (node.rowSpan) attrs.push(`rowspan="${node.rowSpan}"`);
      if (node.tag === 'img' && node.src) {
        attrs.push(`src="${escapeHtml(node.src)}"`);
        attrs.push(`alt="${escapeHtml(node.alt ?? '')}"`);
      }

      const open = `<${node.tag}${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}>`;
      if (VOID_TAGS.has(node.tag)) return open;
      return `${open}${serializeNodes(node.children)}</${node.tag}>`;
    })
    .join('');
}

export function buildDocumentTitle(data: LessonPlanExportData): string {
  const { identity, variant } = data;
  const label = variant === 'siswa' ? 'LKPD Siswa' : identity.documentType;
  return [label, identity.mataPelajaran, identity.kelas ? `Kelas ${identity.kelas}` : '']
    .filter(Boolean)
    .join(' · ');
}

/** Header and footer for Chromium `page.pdf()`; rendered inside the page margin. */
export function buildHeaderFooterTemplates(data: LessonPlanExportData): {
  headerTemplate: string;
  footerTemplate: string;
} {
  const baseStyle =
    "font-family: 'Times New Roman', Tinos, serif; font-size: 8pt; color: #555555; width: 100%; padding: 0 20mm;";
  return {
    headerTemplate: `<div style="${baseStyle} text-align: right;">${escapeHtml(buildDocumentTitle(data))}</div>`,
    footerTemplate: `<div style="${baseStyle} text-align: center;">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>`,
  };
}

/** Self-contained print document: no scripts, no external requests. */
export function renderPrintHtml(data: LessonPlanExportData, options: { fontFaceCss?: string } = {}): string {
  const paper = PAPER_DIMENSIONS_MM[data.paperSize];
  const title = escapeHtml(buildDocumentTitle(data));

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
${options.fontFaceCss ?? ''}
@page { size: ${paper.width}mm ${paper.height}mm; margin: ${PAGE_MARGIN_MM}mm; }
html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; }
body {
  font-family: 'Times New Roman', Tinos, serif;
  font-size: 11pt;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.print-root > div:first-child { max-width: none !important; margin: 0 !important; padding: 0 !important; }
img { max-width: 100%; }
table { border-collapse: collapse; max-width: 100%; }
thead { display: table-header-group; }
tr { break-inside: avoid; page-break-inside: avoid; }
td, th { overflow-wrap: anywhere; word-break: break-word; }
/* Justified text in narrow columns stretches word gaps; table cells read left-aligned. */
td[style*="text-align: justify"], th[style*="text-align: justify"],
td [style*="text-align: justify"], th [style*="text-align: justify"] { text-align: left !important; }
.signature-block { break-inside: avoid; page-break-inside: avoid; }
h1, h2, h3, h4, .keep-with-next, .section-header { break-after: avoid; page-break-after: avoid; }
</style>
</head>
<body><div class="print-root">${serializeNodes(data.body)}</div></body>
</html>`;
}
