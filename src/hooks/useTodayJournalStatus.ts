import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { queryKeys } from '../lib/queryKeys';
import journalService from '../services/journalService';
import type { TeachingJournal } from '../types/teachingJournal';
import type { ScheduleRow } from '../types';
import { isTeachingJournalsBackendMissing } from '../utils/journalBackend';

export interface TodayJournalStatusItem {
  schedule: ScheduleRow;
  journal?: TeachingJournal;
  isFilled: boolean;
}

export interface TodayJournalStatus {
  totalSlots: number;
  filled: number;
  unfilled: number;
  items: TodayJournalStatusItem[];
}

/**
 * Hook to retrieve teaching journal completion status for today.
 * Compares today's schedule slots for the current user with today's filled journals.
 *
 * Query key: teachingJournals.byDate(today)
 */
export const useTodayJournalStatus = (today: string) => {
  const { user } = useAuth();
  const userId = user?.id;

  // Calculate Indonesian day name timezone-independently
  const getDayName = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    return dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
  };

  const dayName = getDayName(today);

  // Fetch today's schedule slots for this user
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', 'today', userId, dayName],
    queryFn: async () => {
      if (!userId || !dayName) return [];
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('day', dayName)
        .order('start_time');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!dayName,
  });

  // Query filled journals using key `teachingJournals.byDate(today)`
  // and transform data with `select`
  return useQuery<TeachingJournal[], Error, TodayJournalStatus>({
    queryKey: queryKeys.teachingJournals.byDate(today),
    queryFn: () => journalService.getByDate(today),
    enabled: !!today && !!userId,
    retry: (count, error) => !isTeachingJournalsBackendMissing(error) && count < 2,
    select: useCallback(
      (journals: TeachingJournal[]) => {
        const items = schedules.map((schedule) => {
          // Find matching journal. Match by schedule_id.
          const journal = journals.find((j) => j.schedule_id === schedule.id);
          return {
            schedule,
            journal,
            isFilled: !!journal,
          };
        });

        const totalSlots = schedules.length;
        const filled = items.filter((item) => item.isFilled).length;
        const unfilled = totalSlots - filled;

        return {
          totalSlots,
          filled,
          unfilled,
          items,
        };
      },
      [schedules]
    ),
  });
};
