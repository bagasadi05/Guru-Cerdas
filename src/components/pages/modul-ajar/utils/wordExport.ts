import { sanitizeContent } from '../../../../services/securityEnhanced';
import { cleanHtmlForWordExport } from './template';

export interface ExportModulAjarWordOptions {
  htmlContent: string;
  fileName: string;
  paperSize?: 'A4' | 'F4';
  title?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

/** Creates a Word-compatible HTML document and starts its download. */
export function exportModulAjarToWord({
  htmlContent,
  fileName,
  paperSize = 'A4',
  title = 'Modul Ajar',
}: ExportModulAjarWordOptions): void {
  if (!htmlContent) {
    throw new Error('Konten dokumen kosong.');
  }

  const isF4 = paperSize === 'F4';
  const pageSize = isF4 ? '612pt 936pt' : '595.3pt 841.9pt';
  const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
  const cleanedContent = cleanHtmlForWordExport(sanitizeContent(htmlContent));
  const safeTitle = escapeHtml(title);
  const sourceHtml = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    @page WordSection1 { size: ${pageSize}; margin: 56.7pt; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.45; color: #000000; }
    table { border-collapse: collapse; width: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin-bottom: 8pt; }
    tr { page-break-inside: avoid; mso-line-break-rule: exactly; }
    .signature-block { page-break-inside: avoid; margin-top: 14pt; }
    .keep-with-next, h1, h2, h3, h4 { page-break-after: avoid; }
    td, th { vertical-align: top; padding: 4pt 6pt; }
    p { margin-top: 0; margin-bottom: 4pt; line-height: 1.45; }
    h1, h2, h3, h4 { margin-top: 6pt; margin-bottom: 3pt; }
  </style>
</head>
<body><div class="WordSection1">${cleanedContent}</div></body>
</html>`;

  const blob = new Blob(['\ufeff', sourceHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName.endsWith('.doc') ? safeFileName : `${safeFileName}.doc`}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
