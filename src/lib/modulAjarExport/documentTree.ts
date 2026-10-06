import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';
import { ALLOWED_TAGS, type ExportElement, type ExportNode, type ExportStyle, type ExportTag } from './types';

type Parse5Node = DefaultTreeAdapterTypes.ChildNode;
type Parse5Element = DefaultTreeAdapterTypes.Element;

const ALLOWED_TAG_SET = new Set<string>(ALLOWED_TAGS);

/** Elements removed together with their content. Anything else unknown is unwrapped. */
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'title',
  'template',
  'noscript',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'video',
  'audio',
  'canvas',
]);

const ALLOWED_CLASSES = new Set(['signature-block', 'keep-with-next', 'section-header']);

const ALLOWED_STYLE_PROPERTIES = new Set([
  'text-align',
  'text-transform',
  'text-decoration',
  'font-weight',
  'font-style',
  'font-size',
  'font-family',
  'color',
  'background-color',
  'line-height',
  'vertical-align',
  'list-style-type',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-collapse',
  'border-radius',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'width',
  'max-width',
  'height',
  'min-height',
  'table-layout',
  'page-break-before',
  'page-break-after',
  'page-break-inside',
  'break-before',
  'break-after',
  'break-inside',
  'display',
  'align-items',
  'justify-content',
  'flex-direction',
  'object-fit',
  'box-sizing',
  'clear',
]);

const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|[<>{}\\@]/i;
const DATA_IMAGE_URI = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

export function parseInlineStyle(raw: string | undefined): ExportStyle {
  const style: ExportStyle = {};
  if (!raw) return style;
  for (const declaration of raw.split(';')) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;
    const property = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = declaration
      .slice(colonIndex + 1)
      .replace(/!important/gi, '')
      .trim();
    if (!ALLOWED_STYLE_PROPERTIES.has(property)) continue;
    if (!value || value.length > 200 || UNSAFE_STYLE_VALUE.test(value)) continue;
    style[property] = value;
  }
  return style;
}

function readAttr(element: Parse5Element, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

function readSpan(element: Parse5Element, name: string): number | undefined {
  const value = Number.parseInt(readAttr(element, name) ?? '', 10);
  if (!Number.isFinite(value) || value <= 1) return undefined;
  return Math.min(value, 50);
}

function convertChildren(nodes: Parse5Node[]): ExportNode[] {
  const result: ExportNode[] = [];
  for (const node of nodes) {
    result.push(...convertNode(node));
  }
  return result;
}

function convertNode(node: Parse5Node): ExportNode[] {
  if (node.nodeName === '#text') {
    const text = (node as DefaultTreeAdapterTypes.TextNode).value.replace(/\s+/g, ' ');
    return text ? [{ type: 'text', text }] : [];
  }
  if (node.nodeName === '#comment' || node.nodeName === '#documentType') return [];

  const element = node as Parse5Element;
  const tag = element.tagName?.toLowerCase();
  if (!tag || DROPPED_TAGS.has(tag)) return [];

  const children = convertChildren(element.childNodes ?? []);
  if (!ALLOWED_TAG_SET.has(tag)) return children;

  const exportElement: ExportElement = {
    type: 'element',
    tag: tag as ExportTag,
    style: parseInlineStyle(readAttr(element, 'style')),
    classes: (readAttr(element, 'class') ?? '')
      .split(/\s+/)
      .filter((name) => ALLOWED_CLASSES.has(name)),
    children,
  };

  if (tag === 'td' || tag === 'th') {
    exportElement.colSpan = readSpan(element, 'colspan');
    exportElement.rowSpan = readSpan(element, 'rowspan');
  }

  if (tag === 'img') {
    const src = (readAttr(element, 'src') ?? '').trim();
    if (!DATA_IMAGE_URI.test(src)) return [];
    exportElement.src = src;
    exportElement.alt = readAttr(element, 'alt')?.slice(0, 200);
    exportElement.children = [];
  }

  return [exportElement];
}

/**
 * Parses stored Modul Ajar HTML into an allowlisted document tree.
 * Unknown tags are unwrapped, active content is dropped, styles are filtered.
 */
export function parseDocumentHtml(html: string): ExportNode[] {
  if (!html) return [];
  return convertChildren(parseFragment(html).childNodes);
}

export function isElement(node: ExportNode): node is ExportElement {
  return node.type === 'element';
}

export function textContent(node: ExportNode | ExportNode[]): string {
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (node.type === 'text') return node.text;
  if (node.tag === 'br') return '\n';
  return node.children.map(textContent).join('');
}

/** Depth-first search over the tree, in document order. */
export function findElements(
  nodes: ExportNode[],
  predicate: (element: ExportElement) => boolean,
): ExportElement[] {
  const matches: ExportElement[] = [];
  const visit = (list: ExportNode[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (predicate(node)) matches.push(node);
      visit(node.children);
    }
  };
  visit(nodes);
  return matches;
}

/** Finds the parent list and index of `target` so callers can read siblings. */
export function locateElement(
  nodes: ExportNode[],
  target: ExportElement,
): { siblings: ExportNode[]; index: number } | null {
  const index = nodes.indexOf(target);
  if (index !== -1) return { siblings: nodes, index };
  for (const node of nodes) {
    if (!isElement(node)) continue;
    const found = locateElement(node.children, target);
    if (found) return found;
  }
  return null;
}

export function hasPageBreakBefore(element: ExportElement): boolean {
  return (
    element.style['page-break-before'] === 'always' ||
    element.style['break-before'] === 'page' ||
    element.style['break-before'] === 'always'
  );
}

export function hasPageBreakAfter(element: ExportElement): boolean {
  return (
    element.style['page-break-after'] === 'always' ||
    element.style['break-after'] === 'page' ||
    element.style['break-after'] === 'always'
  );
}

/** Shaded, bold one-liners ("D. PENDEKATAN & MODEL PEMBELAJARAN") must stay with the content below. */
export function isHeadingBar(element: ExportElement): boolean {
  if (element.tag !== 'div' || !element.style['background-color']) return false;
  const weight = element.style['font-weight'] ?? '';
  if (weight !== 'bold' && !(Number(weight) >= 600)) return false;
  return textContent(element).trim().length <= 120;
}
