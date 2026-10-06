import { Packer } from 'docx';
import { createDocumentExportHandler } from '../_documentExport';
import { buildModulAjarDocx } from '../../src/lib/modulAjarExport';

/** POST /api/document-export/docx — body: { lessonPlanId, paperSize?, variant? } */
export default createDocumentExportHandler({
  format: 'docx',
  rateLimitPerMinute: 20,
  render: async (data) => ({
    body: await Packer.toBuffer(buildModulAjarDocx(data)),
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }),
});
