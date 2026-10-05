import { describe, it, expect } from 'vitest';
import {
  buildProtaDocument,
  countSessionJp,
  planProtaFromSchedule,
  type TeachingScheduleEntry,
} from '../../src/utils/protaSchedulePlanner';
import { getDefaultNationalKaldik } from '../../src/data/defaultKaldikPresets';
import { calculateRme } from '../../src/utils/kaldikEngine';
import { getLockedWeekSlots } from '../../src/utils/promesEngine';

const slot = (
  subject: string,
  classId: string,
  className: string,
  gradeNumber: number | null,
  startTime: string,
  endTime: string
): TeachingScheduleEntry => ({ subject, classId, className, gradeNumber, startTime, endTime });

describe('countSessionJp', () => {
  it('rounds a timetable slot to whole lessons', () => {
    expect(countSessionJp('07:00:00', '08:10:00', 35)).toBe(2);
    expect(countSessionJp('07:00', '07:35', 35)).toBe(1);
    expect(countSessionJp('07:00', '07:15', 35)).toBe(1); // short slot still counts once
    expect(countSessionJp('08:00', '07:00', 35)).toBe(0);
    expect(countSessionJp('', '07:00', 35)).toBe(0);
  });
});

describe('planProtaFromSchedule', () => {
  const schedule = [
    // Matematika 4A: two slots of 2 JP = 4 JP/week
    slot('Matematika', 'c-4a', '4A', 4, '07:00', '08:10'),
    slot('Matematika', 'c-4a', '4A', 4, '09:00', '10:10'),
    // Matematika 4B: same load in a parallel class
    slot('Matematika', 'c-4b', '4B', 4, '07:00', '08:10'),
    slot('Matematika', 'c-4b', '4B', 4, '10:00', '11:10'),
    // IPAS 5A, grade only in the class name
    slot('IPAS', 'c-5a', '5A', null, '07:00', '08:45'),
    // Blank subject is ignored
    slot('  ', 'c-5a', '5A', 5, '09:00', '09:35'),
  ];

  it('makes one plan per subject and grade, sharing parallel classes', () => {
    const plans = planProtaFromSchedule(schedule, [], '2026/2027');

    expect(plans.map((p) => `${p.subject}|${p.gradeLevel}`)).toEqual(['Matematika|Kelas 4', 'IPAS|Kelas 5']);
    expect(plans[0]).toMatchObject({ classNames: ['4A', '4B'], weeklyJp: 4, phase: 'B', hasPreset: true });
    expect(plans[1]).toMatchObject({ classNames: ['5A'], weeklyJp: 3, phase: 'C', hasPreset: false });
  });

  it('flags subjects that already have a Prota for the same year only', () => {
    const plans = planProtaFromSchedule(
      schedule,
      [
        { subject: 'matematika', gradeLevel: 'Kelas 4', academicYear: '2026/2027' },
        { subject: 'IPAS', gradeLevel: 'Kelas 5', academicYear: '2025/2026' },
      ],
      '2026/2027'
    );

    expect(plans.find((p) => p.subject === 'Matematika')?.exists).toBe(true);
    expect(plans.find((p) => p.subject === 'IPAS')?.exists).toBe(false);
  });

  it('uses 40-minute lessons from grade 7', () => {
    const [plan] = planProtaFromSchedule(
      [slot('Informatika', 'c-7a', '7A', 7, '07:00', '08:20')],
      [],
      '2026/2027'
    );
    expect(plan).toMatchObject({ minutesPerJp: 40, weeklyJp: 2, phase: 'D' });
  });
});

describe('buildProtaDocument', () => {
  const weeks = getDefaultNationalKaldik('2026/2027');

  it('fills each semester exactly up to its effective hours and only in KBM weeks', () => {
    const [plan] = planProtaFromSchedule(
      [slot('Matematika', 'c-4a', '4A', 4, '07:00', '09:20')],
      [],
      '2026/2027'
    );
    const doc = buildProtaDocument(plan, weeks, '2026/2027');

    for (const sem of [1, 2] as const) {
      const net = calculateRme(weeks, sem, plan.weeklyJp, 2).netTeachingJp;
      const items = doc.items.filter((i) => i.semesterNumber === sem);
      const cells = sem === 1 ? doc.cellsSem1 : doc.cellsSem2;
      const locked = getLockedWeekSlots(weeks, sem);

      expect(items.reduce((sum, i) => sum + i.targetJp, 0)).toBe(net);
      expect(cells.reduce((sum, c) => sum + c.allocatedJp, 0)).toBe(net);
      expect(cells.filter((c) => c.allocatedJp > 0).every((c) => !locked.has(`${c.monthIndex}-${c.weekNumber}`))).toBe(true);
    }
    expect(doc.header).toMatchObject({ subject: 'Matematika', gradeLevel: 'Kelas 4', weeklyJpQuota: 4 });
  });

  it('falls back to a 4 + 4 chapter outline when no bundled list exists', () => {
    const [plan] = planProtaFromSchedule(
      [slot('Bahasa Jawa', 'c-3a', '3A', 3, '07:00', '08:10')],
      [],
      '2026/2027'
    );
    const doc = buildProtaDocument(plan, weeks, '2026/2027');

    expect(doc.items).toHaveLength(8);
    expect(doc.items.filter((i) => i.semesterNumber === 1)).toHaveLength(4);
  });
});
