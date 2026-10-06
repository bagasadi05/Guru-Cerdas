/**
 * @fileoverview Bundles Prota and both Promes of one or more documents into a single ZIP,
 * so a teacher downloads everything for the year in one go.
 *
 * Prota is Word. Promes is Excel so teachers can still move hours between weeks in the
 * spreadsheet; the Word Promes is available separately from the preview tab.
 *
 * Load this module with `import()`: it pulls in docx, ExcelJS and JSZip.
 *
 * @module utils/perangkatAjarPackage
 */

import JSZip from 'jszip';
import type {
  DocumentIdentity,
  KaldikWeek,
  MatrixCell,
  ProtaItem,
  ProtaValidationResult,
} from '../types/perangkatAjar';
import { exportProtaToWord, exportPromesToExcel } from './exportPerangkatAjar';

export interface PackageDocument {
  identity: DocumentIdentity;
  items: ProtaItem[];
  validation: ProtaValidationResult;
  weeks: KaldikWeek[];
  cellsSem1: MatrixCell[];
  cellsSem2: MatrixCell[];
}

/** Keeps names readable while dropping characters Windows does not allow in paths. */
export function toSafeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'Dokumen';
}

export function getPackageFolderName(identity: Pick<DocumentIdentity, 'subject' | 'gradeLevel'>): string {
  return toSafeFileName(`${identity.subject} ${identity.gradeLevel}`);
}

/**
 * Returns a ZIP with `Prota.docx`, `Promes Semester 1.xlsx` and `Promes Semester 2.xlsx`.
 * With more than one document each set goes into its own "<Mapel> <Kelas>" folder.
 */
export async function buildPerangkatAjarPackage(documents: PackageDocument[]): Promise<Blob> {
  const zip = new JSZip();
  const usedFolders = new Map<string, number>();

  for (const doc of documents) {
    let target: JSZip = zip;
    if (documents.length > 1) {
      const base = getPackageFolderName(doc.identity);
      const count = (usedFolders.get(base) ?? 0) + 1;
      usedFolders.set(base, count);
      target = zip.folder(count === 1 ? base : `${base} (${count})`) ?? zip;
    }

    const [prota, promes1, promes2] = await Promise.all([
      exportProtaToWord({ identity: doc.identity, items: doc.items, validation: doc.validation }),
      exportPromesToExcel({
        identity: { ...doc.identity, semesterNumber: 1 },
        items: doc.items,
        weeks: doc.weeks,
        cells: doc.cellsSem1,
      }),
      exportPromesToExcel({
        identity: { ...doc.identity, semesterNumber: 2 },
        items: doc.items,
        weeks: doc.weeks,
        cells: doc.cellsSem2,
      }),
    ]);

    target.file('Prota.docx', prota);
    target.file('Promes Semester 1.xlsx', promes1);
    target.file('Promes Semester 2.xlsx', promes2);
  }

  return zip.generateAsync({ type: 'blob' });
}
