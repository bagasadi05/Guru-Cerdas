/**
 * @fileoverview Turns a teacher's weekly timetable into ready-to-save Prota & Promes documents.
 *
 * One document is planned per subject and grade. Parallel classes of the same grade
 * (4A, 4B) share one Prota, because the Prota describes the grade's curriculum, not a room.
 *
 * @module utils/protaSchedulePlanner
 */

import type {
  CurriculumType,
  KaldikWeek,
  MatrixCell,
  PhaseType,
  ProtaHeader,
  ProtaItem,
} from '../types/perangkatAjar';
import { calculateRme, getPhaseForGrade } from './kaldikEngine';
import { autoDistributePromes } from './promesEngine';
import {
  findCurriculumPreset,
  generateQuickDistributedProta,
  getCurriculumPreset,
  scaleTopicsToTargetJp,
  type PresetTopicDefinition,
} from '../data/defaultProtaPresets';

export interface TeachingScheduleEntry {
  subject: string;
  classId: string;
  className: string;
  /** `classes.grade_level`; null when the class has none recorded. */
  gradeNumber: number | null;
  startTime: string; // "07:00" or "07:00:00"
  endTime: string;
}

export interface ExistingProtaRef {
  subject: string;
  gradeLevel: string;
  academicYear: string;
}

export interface PlannedProta {
  key: string;
  subject: string;
  gradeLevel: string;
  phase: PhaseType | null;
  classNames: string[];
  weeklyJp: number;
  minutesPerJp: number;
  hasPreset: boolean;
  /** A Prota for this subject, grade and year already exists. */
  exists: boolean;
}

export interface BuiltProtaDocument {
  header: Omit<ProtaHeader, 'userId'>;
  items: ProtaItem[];
  cellsSem1: MatrixCell[];
  cellsSem2: MatrixCell[];
}

const DEFAULT_RESERVE_JP = 2;
const DEFAULT_CHAPTERS_PER_SEMESTER = 4;

/** Standard lesson length: 35 min SD/MI, 40 min SMP/MTs, 45 min SMA/MA. */
export function getMinutesPerJp(gradeNumber: number | null): number {
  if (gradeNumber === null || gradeNumber <= 6) return 35;
  if (gradeNumber <= 9) return 40;
  return 45;
}

function toMinutes(time: string): number | null {
  const match = (time ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** JP for one timetable slot, rounded to the nearest whole lesson (at least 1). */
export function countSessionJp(startTime: string, endTime: string, minutesPerJp: number): number {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return Math.max(1, Math.round((end - start) / minutesPerJp));
}

function resolveGradeNumber(entry: TeachingScheduleEntry): number | null {
  if (entry.gradeNumber && entry.gradeNumber > 0) return entry.gradeNumber;
  const fromName = (entry.className ?? '').match(/(\d{1,2})/);
  const parsed = fromName ? Number(fromName[1]) : NaN;
  return parsed > 0 && parsed <= 12 ? parsed : null;
}

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Groups timetable slots into one planned Prota per subject and grade.
 * Weekly JP is counted per class and the largest class total is used, so two parallel
 * classes with 4 JP each still give a 4 JP/week Prota.
 */
export function planProtaFromSchedule(
  entries: TeachingScheduleEntry[],
  existing: ExistingProtaRef[],
  academicYear: string,
  curriculum: CurriculumType = 'MERDEKA'
): PlannedProta[] {
  const groups = new Map<
    string,
    {
      subject: string;
      gradeNumber: number | null;
      gradeLevel: string;
      jpByClass: Map<string, number>;
      classNames: Set<string>;
    }
  >();

  for (const entry of entries) {
    const subject = entry.subject?.trim();
    if (!subject) continue;
    const gradeNumber = resolveGradeNumber(entry);
    const gradeLevel = gradeNumber ? `Kelas ${gradeNumber}` : entry.className || 'Tanpa kelas';
    const key = `${normalize(subject)}|${normalize(gradeLevel)}`;

    const group = groups.get(key) ?? {
      subject,
      gradeNumber,
      gradeLevel,
      jpByClass: new Map<string, number>(),
      classNames: new Set<string>(),
    };
    const jp = countSessionJp(entry.startTime, entry.endTime, getMinutesPerJp(gradeNumber));
    group.jpByClass.set(entry.classId, (group.jpByClass.get(entry.classId) ?? 0) + jp);
    if (entry.className) group.classNames.add(entry.className);
    groups.set(key, group);
  }

  const existingKeys = new Set(
    existing
      .filter((doc) => doc.academicYear === academicYear)
      .map((doc) => `${normalize(doc.subject)}|${normalize(doc.gradeLevel)}`)
  );

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      subject: group.subject,
      gradeLevel: group.gradeLevel,
      phase: getPhaseForGrade(group.gradeLevel),
      classNames: [...group.classNames].sort(),
      weeklyJp: Math.max(0, ...group.jpByClass.values()),
      minutesPerJp: getMinutesPerJp(group.gradeNumber),
      hasPreset:
        curriculum === 'MERDEKA' && findCurriculumPreset(group.subject, group.gradeLevel) !== null,
      exists: existingKeys.has(key),
    }))
    .filter((plan) => plan.weeklyJp > 0)
    .sort(
      (a, b) =>
        a.gradeLevel.localeCompare(b.gradeLevel, 'id', { numeric: true }) ||
        a.subject.localeCompare(b.subject, 'id')
    );
}

/**
 * Builds the full Prota (items) and both Promes matrices for one planned document,
 * using the given Kaldik so the hours match the teacher's effective weeks.
 */
export function buildProtaDocument(
  plan: PlannedProta,
  weeks: KaldikWeek[],
  academicYear: string,
  curriculum: CurriculumType = 'MERDEKA',
  options: {
    id?: string;
    /** Chapters drafted by AI; used instead of the bundled list or the 4 + 4 outline. */
    topics?: { semester1: PresetTopicDefinition[]; semester2: PresetTopicDefinition[] };
  } = {}
): BuiltProtaDocument {
  const id = options.id ?? crypto.randomUUID();
  const rmeSem1 = calculateRme(weeks, 1, plan.weeklyJp, DEFAULT_RESERVE_JP);
  const rmeSem2 = calculateRme(weeks, 2, plan.weeklyJp, DEFAULT_RESERVE_JP);
  const targetSem1 = Math.max(1, rmeSem1.netTeachingJp);
  const targetSem2 = Math.max(1, rmeSem2.netTeachingJp);

  const aiItems = options.topics
    ? (() => {
        const sem1 = scaleTopicsToTargetJp(options.topics.semester1, 1, targetSem1, 0);
        return [...sem1, ...scaleTopicsToTargetJp(options.topics.semester2, 2, targetSem2, sem1.length)];
      })()
    : null;

  const items =
    aiItems ??
    (plan.hasPreset
      ? getCurriculumPreset(plan.subject, plan.gradeLevel, targetSem1, targetSem2)
      : null) ??
    generateQuickDistributedProta(
      plan.subject,
      plan.gradeLevel,
      DEFAULT_CHAPTERS_PER_SEMESTER,
      DEFAULT_CHAPTERS_PER_SEMESTER,
      targetSem1,
      targetSem2
    );

  const distribute = (semesterNumber: 1 | 2) =>
    autoDistributePromes({
      items: items
        .filter((it) => it.semesterNumber === semesterNumber)
        .map((it) => ({ id: it.id, targetJp: it.targetJp })),
      semesterWeeks: weeks,
      weeklyJpLimit: plan.weeklyJp,
      semesterNumber,
    });

  return {
    header: {
      id,
      academicYear,
      subject: plan.subject,
      gradeLevel: plan.gradeLevel,
      phase: plan.phase ?? undefined,
      curriculum,
      weeklyJpQuota: plan.weeklyJp,
      reserveJpSem1: DEFAULT_RESERVE_JP,
      reserveJpSem2: DEFAULT_RESERVE_JP,
    },
    items,
    cellsSem1: distribute(1),
    cellsSem2: distribute(2),
  };
}
