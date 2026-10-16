import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SchedulePage from '../../src/components/pages/SchedulePage';

// Mock sub-components to keep unit test isolated and fast
vi.mock('../../src/components/pages/JurnalMengajarPage', () => ({
  default: () => <div data-testid="jurnal-page-mock">Mock Jurnal Page</div>,
}));

vi.mock('../../src/components/schedule/PhScheduleTab', () => ({
  default: () => <div data-testid="ph-schedule-mock">Mock PH Schedule Tab</div>,
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1', name: 'Guru Tes' },
    loading: false,
    isNotificationsEnabled: true,
  }),
}));

vi.mock('../../src/hooks/useOfflineStatus', () => ({
  useOfflineStatus: () => true,
}));

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
        is: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          null: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

describe('SchedulePage navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    queryClient.setQueryData(['schedule', 'teacher-1'], []);
    queryClient.setQueryData(['classes', 'schedule', 'teacher-1'], []);
    queryClient.setQueryData(['teacherClassAssignments', 'schedule', 'teacher-1'], []);
  });

  const renderSchedulePage = (initialEntry: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/jadwal" element={<SchedulePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('opens the teaching timetable when entering /jadwal without a tab', async () => {
    renderSchedulePage('/jadwal');

    expect(await screen.findByRole('heading', { level: 1, name: 'Jadwal Mengajar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mengajar/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: /Buka Jadwal Mengajar/i })).not.toBeInTheDocument();
  });

  it('renders Jadwal PH directly when entering /jadwal?tab=ph', async () => {
    renderSchedulePage('/jadwal?tab=ph');

    expect(await screen.findByTestId('ph-schedule-mock')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Jadwal PH/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders Jurnal Mengajar directly when entering /jadwal?tab=jurnal', async () => {
    renderSchedulePage('/jadwal?tab=jurnal');

    expect(await screen.findByTestId('jurnal-page-mock')).toBeInTheDocument();
  });

  it('switches tabs from the tab bar', async () => {
    renderSchedulePage('/jadwal?tab=ph');

    fireEvent.click(await screen.findByRole('tab', { name: /Jurnal/ }));

    expect(await screen.findByTestId('jurnal-page-mock')).toBeInTheDocument();
  });

  it('keeps the rare export and AI actions behind one labelled menu', async () => {
    renderSchedulePage('/jadwal?tab=mengajar');

    expect(await screen.findByRole('button', { name: 'Pilihan lain jadwal mengajar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ekspor Jadwal ke Kalender ICS/ })).not.toBeInTheDocument();
  });
});
