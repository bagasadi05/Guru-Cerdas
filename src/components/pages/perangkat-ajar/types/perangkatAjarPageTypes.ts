import type {
  KaldikWeek,
  ProtaItem,
  ProtaHeader,
  MatrixCell,
} from '../../../../types/perangkatAjar';
import type { ProtaSummary } from '../../../../services/perangkatAjarService';

export type HeaderFields = Omit<ProtaHeader, 'userId' | 'createdAt' | 'updatedAt'>;

export interface UndoSnapshot {
  message: string;
  header: HeaderFields;
  protaItems: ProtaItem[];
  promesCellsSem1: MatrixCell[];
  promesCellsSem2: MatrixCell[];
  /** Set when the action replaced the Kaldik. */
  weeks?: KaldikWeek[];
  /** Set when a whole document was deleted; undo saves it again and reopens it. */
  deletedDocument?: {
    header: ProtaHeader;
    items: ProtaItem[];
    cellsSem1: MatrixCell[];
    cellsSem2: MatrixCell[];
  };
}

export const headerKeyOf = (h: HeaderFields): string =>
  JSON.stringify([
    h.id,
    h.academicYear,
    h.subject,
    h.gradeLevel,
    h.phase ?? null,
    h.curriculum,
    h.weeklyJpQuota,
    h.reserveJpSem1,
    h.reserveJpSem2,
  ]);

export const formatDocumentLabel = (doc: Pick<ProtaSummary, 'subject' | 'gradeLevel' | 'academicYear'>): string =>
  [doc.subject || 'Tanpa mapel', doc.gradeLevel, doc.academicYear].filter(Boolean).join(' · ');

export type PerangkatAjarTab = 'kaldik' | 'prota' | 'promes' | 'preview';
export type PerangkatAjarMode = 'prota-promes' | 'modul-ajar' | null;
