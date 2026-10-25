import type {
  CurriculumType,
  PhaseType,
  KaldikWeek,
  ProtaItem,
  MatrixCell,
  DocumentIdentity,
} from '../../../../../types/perangkatAjar';
import { getPhaseForGrade } from '../../../../../utils/kaldikEngine';

export type WizardStep = 1 | 2 | 3 | 4;

export type WizardApplyTarget = 'new' | 'replace';

export interface WizardApplyData {
  target: WizardApplyTarget;
  academicYear: string;
  subject: string;
  gradeLevel: string;
  phase: PhaseType;
  curriculum: CurriculumType;
  weeklyJpQuota: number;
  reserveJpSem1: number;
  reserveJpSem2: number;
  weeks: KaldikWeek[];
  protaItems: ProtaItem[];
  promesCellsSem1: MatrixCell[];
  promesCellsSem2: MatrixCell[];
  identityUpdates: Partial<DocumentIdentity>;
}

export interface ProtaPromesWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: WizardApplyData) => void;
  initialAcademicYear: string;
  initialSubject?: string;
  initialGradeLevel?: string;
  initialCurriculum?: CurriculumType;
  initialWeeklyJpQuota?: number;
  /** The teacher's Kaldik for `initialAcademicYear`; used instead of the national preset. */
  currentWeeks: KaldikWeek[];
  /** The open document already has materi; step 4 then asks whether to replace it. */
  hasExistingData: boolean;
  /** Preselects "save as a new document" (used by the "Prota baru" button). */
  preferNewDocument?: boolean;
}

export const COMMON_SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'IPAS',
  'Pendidikan Pancasila',
  'Pendidikan Agama Islam',
  'Bahasa Inggris',
  'Seni Rupa',
  'PJOK',
];

export const GRADE_LEVELS: { grade: string; phase: PhaseType }[] = Array.from({ length: 12 }, (_, i) => {
  const grade = `Kelas ${i + 1}`;
  return { grade, phase: getPhaseForGrade(grade) ?? 'A' };
});
