import type { ExportFormat, LessonPlanIdentity } from './types';

function sanitizeSegment(value: string): string {
  return Array.from(value.normalize('NFKD'))
    .filter((char) => char.charCodeAt(0) >= 0x20)
    .join('')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '');
}

/**
 * PRD naming rule: `Modul_Ajar_{mapel}_Kelas{kelas}.{ext}`.
 * RPP documents and the student variant keep their own prefix.
 */
export function buildExportFileName(
  identity: Pick<LessonPlanIdentity, 'documentType' | 'mataPelajaran' | 'kelas'>,
  format: ExportFormat,
  variant: 'guru' | 'siswa' = 'guru',
): string {
  const prefix = variant === 'siswa' ? 'LKPD_Siswa' : sanitizeSegment(identity.documentType || 'Modul Ajar');
  const mapel = sanitizeSegment(identity.mataPelajaran) || 'Mapel';
  const kelas = sanitizeSegment(identity.kelas);
  const base = `${prefix}_${mapel}_Kelas${kelas}`.slice(0, 150);
  return `${base}.${format}`;
}

/** RFC 6266 header value with an ASCII fallback and a UTF-8 encoded name. */
export function contentDispositionAttachment(fileName: string): string {
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_');
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
