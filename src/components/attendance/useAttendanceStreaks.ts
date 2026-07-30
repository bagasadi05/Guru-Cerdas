/**
 * @fileoverview useAttendanceStreaks — Attendance streak calculation
 *
 * Extracted from useAttendance.ts to reduce complexity.
 * Handles streak range, history fetching, and streak computation.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { AttendanceStatus, AttendanceRow, StudentRow } from '../../types';

interface StreakResult {
  studentId: string;
  studentName: string;
  currentStreak: number;
  longestStreak: number;
  attendanceRate: number;
}

interface StreakRange {
  start: string;
  end: string;
}

export const useAttendanceStreaks = (
  user: { id: string } | null,
  students: StudentRow[],
  selectedDate: string,
  selectedSemester: { start_date: string; end_date: string } | null,
  selectedClass: string,
) => {
  const streakRange = useMemo<StreakRange>(() => {
    if (selectedSemester) {
      return { start: selectedSemester.start_date, end: selectedSemester.end_date };
    }
    const end = selectedDate;
    const startDate = new Date(`${selectedDate}T00:00:00`);
    startDate.setDate(startDate.getDate() - 30);
    const start = startDate.toISOString().split('T')[0];
    return { start, end };
  }, [selectedDate, selectedSemester]);

  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['attendanceHistory', user?.id, selectedClass, streakRange.start, streakRange.end],
    queryFn: async () => {
      if (!user || !students || students.length === 0) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, date, status')
        .gte('date', streakRange.start)
        .lte('date', streakRange.end)
        .in('student_id', students.map(student => student.id))
        .is('deleted_at', null);
      if (error) throw error;
      return (data || []) as unknown as AttendanceRow[];
    },
    enabled: !!user && !!students && students.length > 0,
  });

  const attendanceStreaks = useMemo<StreakResult[]>(() => {
    if (!students || students.length === 0 || attendanceHistory.length === 0) return [];

    const recordsByStudent = new Map<string, AttendanceRow[]>();
    attendanceHistory.forEach((record: AttendanceRow) => {
      const list = recordsByStudent.get(record.student_id) || [];
      list.push(record);
      recordsByStudent.set(record.student_id, list);
    });

    const parseDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);
    const dateKey = (date: Date) => date.toISOString().split('T')[0];

    return students
      .map((student) => {
        const records = recordsByStudent.get(student.id) || [];
        if (records.length === 0) return null;

        records.sort((a, b) => a.date.localeCompare(b.date));

        const total = records.length;
        const presentCount = records.filter(record => record.status === AttendanceStatus.Hadir).length;
        const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;

        let longestStreak = 0;
        let currentRun = 0;
        let prevDate: Date | null = null;
        let prevWasPresent = false;

        records.forEach((record) => {
          const currentDate = parseDate(record.date);
          const isPresent = record.status === AttendanceStatus.Hadir;
          const isConsecutive = prevDate
            ? (currentDate.getTime() - prevDate.getTime()) / 86400000 === 1
            : false;

          if (isPresent) {
            if (prevWasPresent && isConsecutive) {
              currentRun += 1;
            } else {
              currentRun = 1;
            }
            longestStreak = Math.max(longestStreak, currentRun);
          } else {
            currentRun = 0;
          }

          prevDate = currentDate;
          prevWasPresent = isPresent;
        });

        const statusByDate = new Map<string, AttendanceStatus>();
        records.forEach((record) => {
          statusByDate.set(record.date, record.status as AttendanceStatus);
        });

        let currentStreak = 0;
        const cursor = parseDate(selectedDate);
        while (true) {
          const status = statusByDate.get(dateKey(cursor));
          if (status !== AttendanceStatus.Hadir) break;
          currentStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }

        return {
          studentId: student.id,
          studentName: student.name,
          currentStreak,
          longestStreak,
          attendanceRate,
        };
      })
      .filter((streak): streak is NonNullable<typeof streak> => Boolean(streak));
  }, [attendanceHistory, selectedDate, students]);

  return { attendanceStreaks, attendanceHistory, streakRange };
};
