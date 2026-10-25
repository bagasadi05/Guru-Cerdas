import { Document, Packer } from 'docx';

/**
 * Safely packs a docx Document into a Blob across browser and Node.js environments.
 * In browser environments, Packer.toBlob() must be used (Packer.toBuffer throws 'nodebuffer is not supported').
 * In Node.js / Vitest environments, falls back to Packer.toBuffer() if Blob stream is not native.
 */
async function packDocxToBlob(doc: Document): Promise<Blob> {
  if (typeof window !== 'undefined') {
    return await Packer.toBlob(doc);
  }
  try {
    return await Packer.toBlob(doc);
  } catch {
    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
}

export { packDocxToBlob };
