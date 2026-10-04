import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type IBorderOptions,
  type IBordersOptions,
  type ParagraphChild,
} from 'docx';
import { hasPageBreakAfter, hasPageBreakBefore, isElement, isHeadingBar } from './documentTree';
import { buildDocumentTitle } from './printTemplate';
import {
  PAGE_MARGIN_MM,
  PAPER_DIMENSIONS_MM,
  type ExportElement,
  type ExportNode,
  type ExportStyle,
  type LessonPlanExportData,
} from './types';

const TWIPS_PER_MM = 1440 / 25.4;
const TWIPS_PER_PX = 15;
const NUMBERED_LIST = 'modul-ajar-numbered';
const BULLET_LIST = 'modul-ajar-bullet';

const BLOCK_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr']);
const HEADING_SIZES: Record<string, number> = { h1: 32, h2: 28, h3: 24, h4: 22 };

const NAMED_COLORS: Record<string, string> = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  gray: '808080',
  grey: '808080',
};

type DocxBlock = Paragraph | Table;

interface RunFormat {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  allCaps?: boolean;
  color?: string;
  /** Half-points. */
  size?: number;
}

interface BlockContext {
  format: RunFormat;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  shading?: string;
  indentLeft: number;
  listLevel: number;
  /** Twips available for tables at this nesting level. */
  availableWidth: number;
  /** Inside a table cell, justified text is rendered left-aligned (narrow columns). */
  inCell?: boolean;
}

interface BuildState {
  pendingPageBreak: boolean;
  numberingInstance: number;
}

export function toDocxColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const color = value.trim().toLowerCase();
  if (NAMED_COLORS[color]) return NAMED_COLORS[color];
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digits = hex[1];
    return (digits.length === 3 ? digits.replace(/./g, (d) => d + d) : digits).toUpperCase();
  }
  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return rgb
      .slice(1, 4)
      .map((channel) => Math.min(255, Number(channel)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return undefined;
}

/** CSS length to half-points (`pt` and `px` only). */
export function toHalfPoints(value: string | undefined): number | undefined {
  const match = value?.trim().match(/^([\d.]+)\s*(pt|px)$/i);
  if (!match) return undefined;
  const points = match[2].toLowerCase() === 'pt' ? Number(match[1]) : Number(match[1]) * 0.75;
  return Number.isFinite(points) && points > 0 ? Math.round(points * 2) : undefined;
}

function toTwips(value: string | undefined): number {
  const match = value?.trim().match(/^([\d.]+)\s*(px|pt|mm|cm)$/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  switch (match[2].toLowerCase()) {
    case 'px':
      return Math.round(amount * TWIPS_PER_PX);
    case 'pt':
      return Math.round(amount * 20);
    case 'mm':
      return Math.round(amount * TWIPS_PER_MM);
    default:
      return Math.round(amount * 10 * TWIPS_PER_MM);
  }
}

function leftOffset(style: ExportStyle): number {
  const marginLeft = style['margin-left'] ?? '';
  return Math.min(toTwips(marginLeft), 1440);
}

function toPercent(value: string | undefined): number | undefined {
  const match = value?.trim().match(/^([\d.]+)%$/);
  if (!match) return undefined;
  const percent = Number(match[1]);
  return percent > 0 && percent <= 100 ? percent : undefined;
}

export function parseBorder(value: string | undefined): IBorderOptions | undefined {
  if (!value) return undefined;
  const border = value.toLowerCase();
  if (/\bnone\b|\b0(px)?\b/.test(border) && !/[1-9]/.test(border)) {
    return { style: BorderStyle.NONE, size: 0, color: 'auto' };
  }
  const width = border.match(/([\d.]+)\s*px/);
  const pixels = width ? Number(width[1]) : 1;
  const style = border.includes('dashed')
    ? BorderStyle.DASHED
    : border.includes('dotted')
      ? BorderStyle.DOTTED
      : border.includes('double')
        ? BorderStyle.DOUBLE
        : BorderStyle.SINGLE;
  const color = border.match(/#[0-9a-f]{3,6}\b|rgba?\([^)]*\)|\b(black|white|gray|grey)\b/);
  return {
    style,
    size: Math.max(2, Math.min(24, Math.round(pixels * 6))),
    color: toDocxColor(color?.[0]) ?? '000000',
  };
}

function mergeFormat(base: RunFormat, element: ExportElement): RunFormat {
  const { style, tag } = element;
  const format: RunFormat = { ...base };
  if (tag === 'strong' || tag === 'b' || tag === 'th' || HEADING_SIZES[tag]) format.bold = true;
  if (tag === 'em' || tag === 'i') format.italics = true;
  if (tag === 'u') format.underline = true;
  if (HEADING_SIZES[tag]) format.size = HEADING_SIZES[tag];

  const weight = style['font-weight'];
  if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) format.bold = true;
  if (weight === 'normal' || (weight && Number(weight) > 0 && Number(weight) < 600)) format.bold = false;
  if (style['font-style'] === 'italic') format.italics = true;
  if (style['font-style'] === 'normal') format.italics = false;
  if (style['text-decoration']?.includes('underline')) format.underline = true;
  if (style['text-transform'] === 'uppercase') format.allCaps = true;
  format.color = toDocxColor(style.color) ?? format.color;
  format.size = toHalfPoints(style['font-size']) ?? format.size;
  return format;
}

function toAlignment(value: string | undefined): BlockContext['alignment'] {
  switch (value) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    case 'left':
      return AlignmentType.LEFT;
    default:
      return undefined;
  }
}

function resolveAlignment(
  alignment: BlockContext['alignment'],
  inCell: boolean | undefined,
): BlockContext['alignment'] {
  return inCell && alignment === AlignmentType.JUSTIFIED ? AlignmentType.LEFT : alignment;
}

function deriveContext(ctx: BlockContext, element: ExportElement): BlockContext {
  const background = toDocxColor(element.style['background-color']);
  return {
    ...ctx,
    format: mergeFormat(ctx.format, element),
    alignment: resolveAlignment(toAlignment(element.style['text-align']) ?? ctx.alignment, ctx.inCell),
    // White is the page colour; shading it only bloats the file.
    shading: background && background !== 'FFFFFF' ? background : ctx.shading,
    indentLeft: ctx.indentLeft + leftOffset(element.style),
  };
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function imageRun(element: ExportElement): ImageRun | null {
  const match = element.src?.match(/^data:image\/(png|jpe?g|gif);base64,(.+)$/i);
  if (!match) return null;
  const type = match[1].toLowerCase() === 'png' ? 'png' : match[1].toLowerCase() === 'gif' ? 'gif' : 'jpg';
  const width = Math.min(Math.round(toTwips(element.style.width) / TWIPS_PER_PX) || 110, 600);
  const height = Math.min(Math.round(toTwips(element.style.height) / TWIPS_PER_PX) || width, 800);
  try {
    return new ImageRun({ type, data: decodeBase64(match[2]), transformation: { width, height } });
  } catch {
    return null;
  }
}

function textRun(text: string, format: RunFormat): TextRun {
  const { underline, ...rest } = format;
  return new TextRun({ text, ...rest, underline: underline ? {} : undefined });
}

function isInline(node: ExportNode): boolean {
  return node.type === 'text' || !BLOCK_TAGS.has(node.tag) || (node.tag === 'br' && !hasPageBreakBefore(node));
}

/** Converts inline nodes to runs, inheriting formatting from ancestors. */
function inlineRuns(nodes: ExportNode[], format: RunFormat): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      runs.push(textRun(node.text, format));
      continue;
    }
    if (node.tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }));
      continue;
    }
    if (node.tag === 'img') {
      const image = imageRun(node);
      if (image) runs.push(image);
      else if (node.alt) runs.push(textRun(`[${node.alt}]`, format));
      continue;
    }
    runs.push(...inlineRuns(node.children, mergeFormat(format, node)));
  }
  return runs;
}

function trimInline(nodes: ExportNode[]): ExportNode[] {
  const result = [...nodes];
  while (result.length > 0 && result[0].type === 'text' && !result[0].text.trim()) result.shift();
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last.type === 'text' && !last.text.trim()) result.pop();
    else break;
  }
  if (result[0]?.type === 'text') result[0] = { type: 'text', text: result[0].text.trimStart() };
  const lastIndex = result.length - 1;
  const last = result[lastIndex];
  if (last?.type === 'text') result[lastIndex] = { type: 'text', text: last.text.trimEnd() };
  return result;
}

function blockBorders(element: ExportElement | null): IBordersOptions | undefined {
  if (!element) return undefined;
  const { style } = element;
  const all = parseBorder(style.border);
  const borders: IBordersOptions = {
    top: parseBorder(style['border-top']) ?? all,
    bottom: parseBorder(style['border-bottom']) ?? all,
    left: parseBorder(style['border-left']) ?? all,
    right: parseBorder(style['border-right']) ?? all,
  };
  const visible = Object.values(borders).some((border) => border && border.style !== BorderStyle.NONE);
  return visible ? borders : undefined;
}

interface ParagraphExtras {
  heading?: boolean;
  bullet?: boolean;
  numberingInstance?: number;
  borderSource?: ExportElement | null;
  keepNext?: boolean;
  spacingAfter?: number;
}

function makeParagraph(
  runs: ParagraphChild[],
  ctx: BlockContext,
  state: BuildState,
  extras: ParagraphExtras = {},
): Paragraph {
  const pageBreakBefore = state.pendingPageBreak;
  state.pendingPageBreak = false;
  const level = Math.min(ctx.listLevel, 2);
  return new Paragraph({
    children: runs,
    alignment: ctx.alignment,
    pageBreakBefore,
    keepNext: extras.heading || extras.keepNext,
    shading: ctx.shading ? { type: ShadingType.CLEAR, fill: ctx.shading, color: 'auto' } : undefined,
    border: blockBorders(extras.borderSource ?? null),
    indent: ctx.indentLeft > 0 && !extras.bullet && extras.numberingInstance === undefined
      ? { left: ctx.indentLeft }
      : undefined,
    numbering: extras.bullet
      ? { reference: BULLET_LIST, level }
      : extras.numberingInstance !== undefined
        ? { reference: NUMBERED_LIST, level, instance: extras.numberingInstance }
        : undefined,
    spacing: { after: extras.spacingAfter ?? (extras.heading ? 120 : 80), line: 276 },
  });
}

function convertBlocks(nodes: ExportNode[], ctx: BlockContext, state: BuildState): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  let inlineBuffer: ExportNode[] = [];

  const flush = () => {
    const content = trimInline(inlineBuffer);
    inlineBuffer = [];
    if (content.length === 0) return;
    blocks.push(makeParagraph(inlineRuns(content, ctx.format), ctx, state));
  };

  for (const node of nodes) {
    if (isInline(node)) {
      inlineBuffer.push(node);
      continue;
    }
    flush();
    const element = node as ExportElement;
    if (element.tag === 'br') {
      state.pendingPageBreak = true;
      continue;
    }
    if (hasPageBreakBefore(element)) state.pendingPageBreak = true;
    blocks.push(...convertBlock(element, ctx, state));
    if (hasPageBreakAfter(element)) state.pendingPageBreak = true;
  }
  flush();
  return blocks;
}

function convertBlock(element: ExportElement, parentCtx: BlockContext, state: BuildState): DocxBlock[] {
  const ctx = deriveContext(parentCtx, element);

  switch (element.tag) {
    case 'table':
      return convertTable(element, ctx, state);
    case 'thead':
    case 'tbody':
    case 'tr':
      return convertBlocks(element.children, ctx, state);
    case 'ul':
    case 'ol':
      return convertList(element, parentCtx, state);
    case 'li':
      return convertListItem(element, ctx, state, { bullet: true });
    default:
      break;
  }

  const onlyInline = element.children.every(isInline);
  const isHeading = Boolean(HEADING_SIZES[element.tag]);
  const borders = blockBorders(element);

  if (onlyInline) {
    const content = trimInline(element.children);
    const hasHeight = toTwips(element.style.height) > 0 || toTwips(element.style['min-height']) > 0;
    if (content.length === 0 && !borders && !hasHeight) return [];
    return [
      makeParagraph(inlineRuns(content, ctx.format), ctx, state, {
        heading: isHeading,
        keepNext:
          element.classes.includes('keep-with-next') ||
          element.classes.includes('section-header') ||
          isHeadingBar(element),
        borderSource: borders ? element : null,
      }),
    ];
  }

  return convertBlocks(element.children, ctx, state);
}

function convertList(list: ExportElement, parentCtx: BlockContext, state: BuildState): DocxBlock[] {
  const ordered = list.tag === 'ol';
  const unmarked = list.style['list-style-type'] === 'none';
  const instance = ordered ? ++state.numberingInstance : undefined;
  const ctx: BlockContext = {
    ...deriveContext(parentCtx, list),
    indentLeft: parentCtx.indentLeft,
    listLevel: parentCtx.listLevel,
  };
  const blocks: DocxBlock[] = [];
  for (const child of list.children) {
    if (!isElement(child)) {
      if (child.text.trim()) blocks.push(makeParagraph([textRun(child.text.trim(), ctx.format)], ctx, state));
      continue;
    }
    if (child.tag === 'li') {
      blocks.push(
        ...convertListItem(
          child,
          deriveContext(ctx, child),
          state,
          unmarked ? {} : ordered ? { numberingInstance: instance } : { bullet: true },
        ),
      );
    } else {
      blocks.push(...convertBlock(child, ctx, state));
    }
  }
  return blocks;
}

function convertListItem(
  item: ExportElement,
  ctx: BlockContext,
  state: BuildState,
  marker: { bullet?: boolean; numberingInstance?: number },
): DocxBlock[] {
  const inlineChildren = trimInline(item.children.filter(isInline));
  const nested = item.children.filter((child) => !isInline(child)) as ExportElement[];
  const blocks: DocxBlock[] = [
    makeParagraph(inlineRuns(inlineChildren, ctx.format), ctx, state, { ...marker, spacingAfter: 40 }),
  ];
  const nestedCtx: BlockContext = { ...ctx, listLevel: ctx.listLevel + 1 };
  for (const child of nested) {
    blocks.push(...convertBlock(child, nestedCtx, state));
  }
  return blocks;
}

function collectRows(table: ExportElement): { row: ExportElement; header: boolean }[] {
  const rows: { row: ExportElement; header: boolean }[] = [];
  for (const child of table.children) {
    if (!isElement(child)) continue;
    if (child.tag === 'tr') rows.push({ row: child, header: false });
    if (child.tag === 'thead' || child.tag === 'tbody') {
      for (const row of child.children) {
        if (isElement(row) && row.tag === 'tr') rows.push({ row, header: child.tag === 'thead' });
      }
    }
  }
  return rows;
}

function rowCells(row: ExportElement): ExportElement[] {
  return row.children.filter((cell): cell is ExportElement => isElement(cell) && (cell.tag === 'td' || cell.tag === 'th'));
}

/** Grid column widths in twips, taken from the first row that spells out every column. */
function computeColumnWidths(rows: ExportElement[], tableWidth: number): number[] {
  const columnCount = Math.max(1, ...rows.map((row) => rowCells(row).reduce((sum, cell) => sum + (cell.colSpan ?? 1), 0)));
  for (const row of rows) {
    const cells = rowCells(row);
    if (cells.length !== columnCount) continue;
    const percents = cells.map((cell) => toPercent(cell.style.width));
    const known = percents.filter((p): p is number => p !== undefined);
    if (known.length === 0) continue;
    const knownTotal = known.reduce((sum, p) => sum + p, 0);
    const unknownCount = percents.length - known.length;
    const fallback = unknownCount > 0 ? Math.max(0, 100 - knownTotal) / unknownCount : 0;
    const resolved = percents.map((p) => p ?? fallback);
    const total = resolved.reduce((sum, p) => sum + p, 0) || 100;
    return resolved.map((p) => Math.round((p / total) * tableWidth));
  }
  return Array.from({ length: columnCount }, () => Math.round(tableWidth / columnCount));
}

function cellBorders(cell: ExportElement, table: ExportElement) {
  const tableBorder = parseBorder(table.style.border);
  const pick = (side: 'top' | 'bottom' | 'left' | 'right') =>
    parseBorder(cell.style[`border-${side}`]) ??
    parseBorder(cell.style.border) ??
    tableBorder ?? { style: BorderStyle.NONE, size: 0, color: 'auto' };
  return { top: pick('top'), bottom: pick('bottom'), left: pick('left'), right: pick('right') };
}

function convertTable(table: ExportElement, ctx: BlockContext, state: BuildState): DocxBlock[] {
  const rows = collectRows(table);
  if (rows.length === 0) return [];

  const widthPercent = toPercent(table.style.width) ?? 100;
  const tableWidth = Math.max(1440, Math.round(((ctx.availableWidth - ctx.indentLeft) * widthPercent) / 100));
  const columnWidths = computeColumnWidths(
    rows.map((entry) => entry.row),
    tableWidth,
  );

  const blocks: DocxBlock[] = [];
  if (state.pendingPageBreak) {
    blocks.push(makeParagraph([], ctx, state, { spacingAfter: 0 }));
  }

  const isSignature = table.classes.includes('signature-block');
  const tableRows = rows.map(({ row, header }) => {
    let columnIndex = 0;
    const rowCtx = deriveContext({ ...ctx, shading: undefined, indentLeft: 0 }, row);
    const cells = rowCells(row).map((cell) => {
      const span = cell.colSpan ?? 1;
      const width = columnWidths
        .slice(columnIndex, columnIndex + span)
        .reduce((sum, value) => sum + value, 0) || columnWidths[columnWidths.length - 1];
      columnIndex += span;

      const cellCtx: BlockContext = {
        ...deriveContext({ ...rowCtx, alignment: cell.tag === 'th' ? AlignmentType.CENTER : rowCtx.alignment }, cell),
        shading: undefined,
        indentLeft: 0,
        listLevel: 0,
        availableWidth: width - 160,
        inCell: true,
      };
      const cellState: BuildState = { pendingPageBreak: false, numberingInstance: state.numberingInstance };
      const children = convertBlocks(cell.children, cellCtx, cellState);
      state.numberingInstance = cellState.numberingInstance;
      if (children.length === 0 || children[children.length - 1] instanceof Table) {
        children.push(new Paragraph({ children: [] }));
      }

      const fill = toDocxColor(cell.style['background-color']) ?? toDocxColor(row.style['background-color']);
      return new TableCell({
        children,
        columnSpan: cell.colSpan,
        rowSpan: cell.rowSpan,
        width: { size: width, type: WidthType.DXA },
        shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
        borders: cellBorders(cell, table),
        verticalAlign:
          cell.style['vertical-align'] === 'middle'
            ? VerticalAlign.CENTER
            : cell.style['vertical-align'] === 'bottom'
              ? VerticalAlign.BOTTOM
              : VerticalAlign.TOP,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      });
    });
    return new TableRow({ children: cells, tableHeader: header, cantSplit: true });
  });

  blocks.push(
    new Table({
      rows: tableRows,
      width: { size: tableWidth, type: WidthType.DXA },
      columnWidths,
      layout: TableLayoutType.FIXED,
      indent: ctx.indentLeft > 0 ? { size: ctx.indentLeft, type: WidthType.DXA } : undefined,
      alignment: table.style.margin?.includes('auto') ? AlignmentType.CENTER : undefined,
    }),
  );
  if (isSignature) blocks.push(new Paragraph({ children: [], spacing: { after: 0 } }));
  return blocks;
}

function pageGeometry(data: LessonPlanExportData) {
  const paper = PAPER_DIMENSIONS_MM[data.paperSize];
  const width = Math.round(paper.width * TWIPS_PER_MM);
  const height = Math.round(paper.height * TWIPS_PER_MM);
  const margin = Math.round(PAGE_MARGIN_MM * TWIPS_PER_MM);
  return { width, height, margin, contentWidth: width - margin * 2 };
}

/** Builds a native OOXML document from the shared export model. */
export function buildModulAjarDocx(data: LessonPlanExportData): Document {
  const page = pageGeometry(data);
  const state: BuildState = { pendingPageBreak: false, numberingInstance: 0 };
  const rootCtx: BlockContext = {
    format: {},
    indentLeft: 0,
    listLevel: 0,
    availableWidth: page.contentWidth,
  };
  const children = convertBlocks(data.body, rootCtx, state);
  const title = buildDocumentTitle(data);

  const smallText = { font: 'Times New Roman', size: 16, color: '555555' };

  return new Document({
    title,
    creator: 'Portal Guru',
    description: `${data.identity.documentType} ${data.identity.mataPelajaran}`.trim(),
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 22 },
          paragraph: { spacing: { after: 80, line: 276 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: level === 1 ? LevelFormat.LOWER_LETTER : LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 280 } } },
          })),
        },
        {
          reference: BULLET_LIST,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: level === 1 ? '◦' : '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 280 } } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.width, height: page.height },
            margin: {
              top: page.margin,
              bottom: page.margin,
              left: page.margin,
              right: page.margin,
              header: Math.round(page.margin / 2),
              footer: Math.round(page.margin / 2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: title, ...smallText })] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: ['Halaman ', PageNumber.CURRENT, ' dari ', PageNumber.TOTAL_PAGES], ...smallText }),
                ],
              }),
            ],
          }),
        },
        children: children.length > 0 ? children : [new Paragraph({ children: [] })],
      },
    ],
  });
}
