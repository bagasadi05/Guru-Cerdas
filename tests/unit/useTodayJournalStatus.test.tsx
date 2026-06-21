import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTodayJournalStatus } from '../../src/hooks/useTodayJournalStatus';
import { AuthContext } from '../../src/hooks/useAuth';
import journalService from '../../src/services/journalService';

// Mock journalService
vi.mock('../../src/services/journalService', () => ({
  default: {
    getByDate: vi.fn(),
  },
}));

// Mock isTeachingJournalsBackendMissing helper
vi.mock('../../src/utils/journalBackend', () => ({
  isTeachingJournalsBackendMissing: vi.fn(() => false),
}));

// Mock Supabase schedules select chain
const mockSchedulesData: { data: any[]; error: any } = { data: [], error: null };
const mockSupabaseQueryChain = {
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => Promise.resolve(mockSchedulesData)),
};
const mockSupabaseSelect = vi.fn(() => mockSupabaseQueryChain);
const mockSupabaseFrom = vi.fn((_table?: string) => ({
  select: mockSupabaseSelect,
}));

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}));

const createWrapper = (user = { id: 'teacher-123', name: 'Test Teacher' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: user as any,
          session: {} as any,
          userRole: null,
          isAdmin: false,
          logout: async () => {},
          loading: false,
          login: vi.fn(),
          signup: vi.fn(),
          updateUser: vi.fn(),
          enableScheduleNotifications: vi.fn(),
          disableScheduleNotifications: vi.fn(),
          isNotificationsEnabled: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('useTodayJournalStatus Hook', () => {
  beforeEach(() => {
    mockSchedulesData.data = [];
    mockSchedulesData.error = null;
    vi.clearAllMocks();
  });

  it('correctly maps filled and unfilled schedule slots', async () => {
    // 1. Mock today's schedule slots
    mockSchedulesData.data = [
      {
        id: 'sch-1',
        user_id: 'teacher-123',
        day: 'Senin',
        subject: 'Matematika',
        start_time: '08:00',
        end_time: '09:30',
        class_id: 'class-1',
      },
      {
        id: 'sch-2',
        user_id: 'teacher-123',
        day: 'Senin',
        subject: 'Bahasa Indonesia',
        start_time: '10:00',
        end_time: '11:30',
        class_id: 'class-2',
      },
    ];

    // 2. Mock today's teaching journals
    // sch-1 is filled, sch-2 is unfilled
    vi.mocked(journalService.getByDate).mockResolvedValue([
      {
        id: 'jrn-1',
        user_id: 'teacher-123',
        schedule_id: 'sch-1',
        class_id: 'class-1',
        subject: 'Matematika',
        date: '2026-06-22',
        topic: 'Aljabar',
        meeting_number: 1,
        objectives: null,
        activities: null,
        notes: null,
        attachment_url: null,
        created_at: '',
        updated_at: '',
      },
    ]);

    // 3. Render hook with date string for Monday (2026-06-22)
    const { result } = renderHook(() => useTodayJournalStatus('2026-06-22'), {
      wrapper: createWrapper(),
    });

    // 4. Wait for query to resolve successfully
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 5. Assertions on mapped data structure
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.totalSlots).toBe(2);
    expect(result.current.data?.filled).toBe(1);
    expect(result.current.data?.unfilled).toBe(1);

    const items = result.current.data?.items || [];
    expect(items).toHaveLength(2);

    expect(items[0].schedule.id).toBe('sch-1');
    expect(items[0].isFilled).toBe(true);
    expect(items[0].journal?.id).toBe('jrn-1');

    expect(items[1].schedule.id).toBe('sch-2');
    expect(items[1].isFilled).toBe(false);
    expect(items[1].journal).toBeUndefined();
  });

  it('handles empty schedules correctly', async () => {
    mockSchedulesData.data = [];
    vi.mocked(journalService.getByDate).mockResolvedValue([]);

    const { result } = renderHook(() => useTodayJournalStatus('2026-06-22'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalSlots).toBe(0);
    expect(result.current.data?.filled).toBe(0);
    expect(result.current.data?.unfilled).toBe(0);
    expect(result.current.data?.items).toHaveLength(0);
  });

  it('correctly maps date string to day name timezone-independently', async () => {
    mockSchedulesData.data = [];
    vi.mocked(journalService.getByDate).mockResolvedValue([]);

    // test a Tuesday date
    const { result } = renderHook(() => useTodayJournalStatus('2026-06-23'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // dayName should be 'Selasa'
    expect(mockSupabaseQueryChain.eq).toHaveBeenCalledWith('day', 'Selasa');
  });
});
