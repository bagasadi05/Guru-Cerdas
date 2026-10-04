import { createDocumentExportHandler } from '../_documentExport';
import { renderLessonPlanPdf } from '../_pdfRenderer';

/** POST /api/document-export/pdf — body: { lessonPlanId, paperSize?, variant? } */
export default createDocumentExportHandler({
  format: 'pdf',
  rateLimitPerMinute: 10,
  render: async (data) => ({
    body: await renderLessonPlanPdf(data),
    contentType: 'application/pdf',
  }),
});
