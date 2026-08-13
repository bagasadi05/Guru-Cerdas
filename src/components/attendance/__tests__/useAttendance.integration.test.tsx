import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAttendance } from '../useAttendance';
import { useAuth } from '../../../hooks/useAuth';
import { useSemester } from '../../../contexts/SemesterContext';

// Mock dependencies
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: vi.fn(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() })),
}));

vi.mock('../../../hooks/useOfflineStatus', () => ({
  useOfflineStatus: vi.fn(() => true),
}));

vi.mock('../../../hooks/useUserSettings', () => ({
  useUserSettings: vi.fn(() => ({ schoolName: 'Test School' })),
}));

vi.mock('../../../contexts/SemesterContext', () => ({
  useSemester: vi.fn(),
}));

vi.mock('../../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  },
  wasLastResponseQueued: vi.fn(() => false)
}));

// Mock sub-hooks to avoid deep rendering issues
vi.mock('../useAttendanceStreaks', () => ({
  useAttendanceStreaks: vi.fn(() => ({ attendanceStreaks: {}, attendanceHistory: {} }))
}));

vi.mock('../useAttendanceAI', () => ({
  useAttendanceAI: vi.fn(() => ({ isAiLoading: false, getAiInsights: vi.fn() }))
}));

vi.mock('../useAttendanceExport', () => ({
  useAttendanceExport: vi.fn(() => ({ handleExport: vi.fn(), isExporting: false }))
}));

describe('useAttendance integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user-id', name: 'Test User' },
      isAdmin: false
    });
    
    (useSemester as any).mockReturnValue({
      activeSemester: { id: 'sem-1', start_date: '2023-01-01', end_date: '2023-06-30' },
      getSemesterByDate: vi.fn(),
      semesters: [{ id: 'sem-1', start_date: '2023-01-01', end_date: '2023-06-30' }]
    });
  });

  it('initializes default state correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAttendance(), { wrapper });

    expect(result.current.selectedSemesterId).toBe('sem-1');
    expect(result.current.selectedClass).toBe('');
    expect(result.current.viewMode).toBe('list');
    expect(result.current.isOnline).toBe(true);
  });
});
