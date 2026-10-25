import { buildStudentBody } from '../../../../../lib/modulAjarExport/lessonPlanMapper';
import { findElements, parseDocumentHtml } from '../../../../../lib/modulAjarExport/documentTree';
import { serializeNodes } from '../../../../../lib/modulAjarExport/printTemplate';
import type { FormState } from '../../types';

export const extractStudentHtml = (fullHtml: string, formState: FormState, logoBase64: string): string => {
  if (!fullHtml) return '';
  try {
    const body = parseDocumentHtml(fullHtml);
    if (logoBase64 && findElements(body, node => node.tag === 'img').length === 0) {
      // The shared parser accepts only embedded image data.
      const logo = parseDocumentHtml(`<img src="${logoBase64}" alt="Logo Sekolah" />`);
      body.push(...logo);
    }
    return serializeNodes(buildStudentBody(body, {
      documentType: formState.documentType,
      mataPelajaran: formState.mataPelajaran,
      topik: formState.topik,
      kelas: formState.kelas,
      fase: formState.fase,
      satuanPendidikan: formState.satuanPendidikan,
      tahunAjaran: formState.tahunAjaran,
      semester: formState.semester,
      guru: formState.guru,
    }));
  } catch (error) {
    console.error('Failed to extract student sheets:', error);
    return '';
  }
};
