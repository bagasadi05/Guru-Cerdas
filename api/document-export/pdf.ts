import { createDocumentExportHandler } from '../_documentExport.js';
import { renderLessonPlanPdf } from '../_pdfRenderer.js';

/** POST /api/document-export/pdf — body: { lessonPlanId, paperSize?, variant? } */
export default createDocumentExportHandler({
  format: 'pdf',
  rateLimitPerMinute: 10,
  render: async (data) => ({
    body: await renderLessonPlanPdf(data),
    contentType: 'application/pdf',
  }),
});
