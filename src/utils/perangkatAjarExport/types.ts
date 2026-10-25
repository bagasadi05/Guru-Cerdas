import type {
  DocumentIdentity,
  KaldikWeek,
  MatrixCell,
  ProtaItem,
  ProtaValidationResult,
} from '../../types/perangkatAjar';

export type { DocumentIdentity };

export interface ProtaExcelExportData {
  identity: DocumentIdentity;
  items: ProtaItem[];
  validation: ProtaValidationResult;
}

export interface PromesExcelExportData {
  identity: DocumentIdentity;
  items: ProtaItem[];
  weeks: KaldikWeek[];
  cells: MatrixCell[];
}

export interface ProtaWordExportData {
  identity: DocumentIdentity;
  items: ProtaItem[];
  validation: ProtaValidationResult;
}

export interface PromesWordExportData {
  identity: DocumentIdentity;
  items: ProtaItem[];
  weeks: KaldikWeek[];
  cells: MatrixCell[];
}
