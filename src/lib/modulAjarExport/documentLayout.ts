import { isElement, isHeadingBar, textContent } from './documentTree';
import type { ExportElement, ExportNode } from './types';

function block(tag: ExportElement['tag'], text: string, style: ExportElement['style'] = {}): ExportElement {
  return { type: 'element', tag, style, classes: [], children: [{ type: 'text', text }] };
}

function keepGroupTogether(node: ExportElement): void {
  const leaves: ExportElement[] = [];
  const collect = (element: ExportElement) => {
    if (element.tag === 'table' || element.tag === 'li' || element.children.every(child => !isElement(child) || ['b', 'strong', 'em', 'i', 'u', 'span', 'br', 'img'].includes(child.tag))) {
      leaves.push(element);
    } else element.children.filter(isElement).forEach(collect);
  };
  collect(node);
  leaves.slice(0, -1).forEach(leaf => {
    if (!leaf.classes.includes('keep-with-next')) leaf.classes.push('keep-with-next');
  });
}

function answerTable(label: string): ExportElement {
  const cell = (text: string, header = false, width?: string): ExportElement => block(header ? 'th' : 'td', text, {
    border: '1px solid #777777', padding: '4px', ...(width ? { width } : {}),
  });
  return {
    type: 'element', tag: 'table', classes: [], style: { width: '100%', margin: '8px 0', 'font-size': '10pt' },
    children: [
      { type: 'element', tag: 'thead', classes: [], style: {}, children: [{ type: 'element', tag: 'tr', classes: [], style: {}, children: [cell('No.', true, '8%'), cell(label, true, '92%')] }] },
      { type: 'element', tag: 'tbody', classes: [], style: {}, children: Array.from({ length: 5 }, (_, index) => ({
        type: 'element' as const, tag: 'tr' as const, classes: [], style: { height: '32px' }, children: [cell(String(index + 1)), cell('')],
      })) },
    ],
  };
}

function repairWorksheetParagraph(node: ExportElement, sheet: ExportElement['sheet']): ExportNode[] {
  const text = textContent(node).trim();
  if (sheet === 'lkpd' && node.tag === 'div' && node.style['min-height']) {
    if (/tabel/i.test(text)) return [answerTable('Hasil / Jawaban Kelompok')];
    if (/gambar/i.test(text) && /^\d+(?:\.\d+)?px$/.test(node.style['min-height'])) {
      node.style['min-height'] = `${Math.max(120, Number.parseFloat(node.style['min-height']))}px`;
    }
  }
  if (node.tag !== 'p') return [node];
  if (sheet === 'evaluasi' && /^\d+\.\s/.test(text) && /\sA\.\s.+\sB\.\s/.test(text)) {
    const [prompt, ...options] = text.split(/\s+(?=[A-D]\.\s+\S)/);
    return [
      { ...node, style: { ...node.style, 'text-align': 'left', 'break-after': 'avoid' }, children: [{ type: 'text', text: prompt }] },
      ...options.map(option => block('p', option, { 'margin-left': '15px', margin: '2px 0', 'text-align': 'left' })),
    ];
  }
  if (sheet !== 'lkpd' || !/\[[^\]]+\]|Petunjuk:.*(?:Alat|Langkah Kerja):/i.test(text)) return [node];
  const parts = text
    .replace(/\s*(\[[^\]]+\])\s*/g, '\n$1\n')
    .replace(/\s+(?=(?:Judul LKPD|Petunjuk|Alat dan Bahan|Alat|Bahan|Langkah Kerja):)/gi, '\n')
    .replace(/(?<=[.!?:])\s+(?=\d+\.\s+\S)/g, '\n')
    .split('\n').map(part => part.trim()).filter(part => Boolean(part) && !/^[.;,]+$/.test(part));
  return parts.map(part => /^\[.+\]$/.test(part)
    ? /tabel/i.test(part) ? answerTable('Hasil / Jawaban Kelompok') : block('div', part.slice(1, -1), {
      border: '1px dashed #777777', padding: '8px', margin: '8px 0',
      'min-height': /gambar/i.test(part) ? '120px' : '80px', 'font-style': 'italic', 'font-size': '10pt',
    })
    : block('p', part, { margin: '4px 0', 'text-align': 'left' }));
}

/** Applies document layout to current templates and previously saved HTML without mutating either. */
export function prepareDocumentLayout(nodes: ExportNode[]): ExportNode[] {
  const visit = (source: ExportNode, inheritedSheet?: ExportElement['sheet']): ExportNode[] => {
    if (!isElement(source)) return [{ ...source }];
    const node: ExportElement = { ...source, style: { ...source.style }, classes: [...source.classes], children: [] };
    const heading = source.children.find(child => isElement(child) && (isHeadingBar(child) || /^h[1-4]$/.test(child.tag)));
    const headingText = heading ? textContent(heading).trim() : '';
    const legacySheet = /dashed/i.test(source.style.border ?? '') && headingText;
    const sheet = source.sheet ?? (legacySheet && /LEMBAR KERJA PESERTA DIDIK/i.test(headingText) ? 'lkpd'
      : legacySheet && /LEMBAR EVALUASI PENGETAHUAN/i.test(headingText) ? 'evaluasi' : inheritedSheet);
    if (sheet && !inheritedSheet) node.sheet = sheet;

    const section = /^(INFORMASI UMUM|KOMPONEN INTI|LAMPIRAN PERANGKAT AJAR)$/.test(headingText);
    if (section) {
      node.style.border = 'none';
      node.style.padding = '0';
      node.style['margin-bottom'] = '10px';
      if (headingText === 'LAMPIRAN PERANGKAT AJAR') {
        delete node.style['page-break-before'];
        delete node.style['break-before'];
      }
    }
    if (!sheet) {
      if (node.style['line-height']) node.style['line-height'] = '1.2';
      if (node.style.padding && !section && !node.style.height && !node.style['min-height']) node.style.padding = node.style.padding.replace(/\b(\d+(?:\.\d+)?)px/g, (_, size: string) => `${Math.min(Number(size), 6)}px`);
      const marginBottom = node.style['margin-bottom'];
      if (marginBottom && /^\d+(?:\.\d+)?px$/.test(marginBottom)) node.style['margin-bottom'] = `${Math.min(Number.parseFloat(marginBottom), node.tag === 'li' ? 4 : 8)}px`;
    } else if (node.sheet) {
      node.style.padding = '12px';
      node.style['break-inside'] = 'avoid';
      node.style['page-break-inside'] = 'avoid';
    }
    if (sheet && node.style['line-height']) node.style['line-height'] = '1.25';
    node.children = source.children.flatMap(child => visit(child, sheet));
    const firstBlock = node.children.find(isElement);
    const firstText = firstBlock ? textContent(firstBlock).trim() : '';
    if (!sheet && source.tag === 'div' && node.children.filter(isElement).length <= 2 && /^\d+\.\s(?:Penilaian|Program|Diferensiasi)/i.test(firstText) && textContent(node).length < 1800) {
      node.style['break-inside'] = 'avoid';
      node.style['page-break-inside'] = 'avoid';
    }
    if (/^KUNCI JAWABAN & PEDOMAN PENSKORAN/.test(firstText)) {
      node.style['break-inside'] = 'avoid';
      node.style['page-break-before'] = 'always';
    }
    for (let index = 0; index < node.children.length - 1; index += 1) {
      const child = node.children[index];
      if (!isElement(child) || !/^G\. RENCANA PEMBELAJARAN BERDIFERENSIASI/.test(textContent(child).trim())) continue;
      const following = node.children.slice(index + 1).find(isElement);
      if (following && textContent(following).length < 1800) {
        following.style['break-inside'] = 'avoid';
        following.style['page-break-inside'] = 'avoid';
        keepGroupTogether(following);
      }
    }
    const question = source.tag === 'div' && source.children.some(child => isElement(child) && child.tag === 'p' && /^\d+\.\s/.test(textContent(child).trim()));
    if (sheet === 'evaluasi' && question) {
      node.style['break-inside'] = 'avoid';
      node.style['page-break-inside'] = 'avoid';
      if (source.children.some(child => isElement(child) && child.tag === 'p' && /\sA\.\s.+\sB\.\s/.test(textContent(child)))) {
        node.children = node.children.filter(child => !(isElement(child) && /^Jawab\s*:/i.test(textContent(child).trim())));
        node.children.push(block('p', 'Jawaban: ........', { margin: '4px 0', 'font-size': '10pt' }));
      }
    }
    if (!node.sheet && /avoid/.test(node.style['break-inside'] ?? node.style['page-break-inside'] ?? '') && textContent(node).length < 1800) {
      keepGroupTogether(node);
    }
    return repairWorksheetParagraph(node, sheet);
  };
  return nodes.flatMap(node => visit(node));
}
