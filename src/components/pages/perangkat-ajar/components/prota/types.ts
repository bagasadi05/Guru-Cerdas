import type {
  ProtaItem,
  ProtaValidationResult,
  CurriculumType,
  RmeSummary,
} from '../../../../../types/perangkatAjar';

export interface ProtaFormData {
  semesterNumber: 1 | 2;
  elementOrDomain: string;
  learningObjectiveCode: string;
  learningObjectiveText: string;
  coreTopic: string;
  targetJp: number;
}

export interface ProtaTabProps {
  items: ProtaItem[];
  onAddItem: (item: Omit<ProtaItem, 'id' | 'orderIndex'>) => void;
  onUpdateItem: (id: string, updates: Partial<ProtaItem>) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  onSwapSemester?: (id: string) => void;
  /** Present only when a bundled chapter list exists for the current subject and grade. */
  onLoadSampleData?: () => void;
  onOpenWizard?: () => void;
  onAutoBalance?: () => void;
  /** Opens the Modul Ajar creator prefilled with this materi. */
  onCreateModulAjar?: (item: ProtaItem) => void;
  /** Drafts every materi with AI (replaces the current list, undoable). */
  onFillWithAi?: () => void;
  isAiBusy?: boolean;
  curriculum: CurriculumType;
  onChangeCurriculum: (curriculum: CurriculumType) => void;
  validation: ProtaValidationResult;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
}
