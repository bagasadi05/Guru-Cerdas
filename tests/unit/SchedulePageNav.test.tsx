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

describe('SchedulePage Navigation & Hub Flow', () => {
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

  it('renders ScheduleHubMenu when entering /jadwal without tab parameter', async () => {
    renderSchedulePage('/jadwal');

    // Should display the Hub choice cards
    expect(await screen.findByText('Jadwal & Jurnal Mengajar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buka Jadwal Mengajar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buka Jadwal PH/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buka Jurnal Mengajar/i })).toBeInTheDocument();

    // Sub-nav breadcrumb should not be visible when on hub
    expect(screen.queryByTitle('Kembali ke pilihan menu Jadwal & Jurnal')).not.toBeInTheDocument();
  });

  it('navigates to Jadwal Mengajar and shows sub-nav and back button when clicking Buka Jadwal Mengajar', async () => {
    renderSchedulePage('/jadwal');

    const btn = await screen.findByRole('button', { name: /Buka Jadwal Mengajar/i });
    fireEvent.click(btn);

    // Sub-navigation bar should appear with back button "Pilihan Menu"
    expect(await screen.findByTitle('Kembali ke pilihan menu Jadwal & Jurnal')).toBeInTheDocument();
    expect(screen.getByText('Jadwal Mengajar Mingguan')).toBeInTheDocument();
  });

  it('renders Jadwal PH directly when entering /jadwal?tab=ph', async () => {
    renderSchedulePage('/jadwal?tab=ph');

    expect(await screen.findByTestId('ph-schedule-mock')).toBeInTheDocument();
    expect(screen.getByTitle('Kembali ke pilihan menu Jadwal & Jurnal')).toBeInTheDocument();
  });

  it('renders Jurnal Mengajar directly when entering /jadwal?tab=jurnal', async () => {
    renderSchedulePage('/jadwal?tab=jurnal');

    expect(await screen.findByTestId('jurnal-page-mock')).toBeInTheDocument();
    expect(screen.getByTitle('Kembali ke pilihan menu Jadwal & Jurnal')).toBeInTheDocument();
  });

  it('returns to hub when clicking "Pilihan Menu" from a sub-tab', async () => {
    renderSchedulePage('/jadwal?tab=ph');

    const backBtn = await screen.findByTitle('Kembali ke pilihan menu Jadwal & Jurnal');
    fireEvent.click(backBtn);

    // Should be back at Hub
    expect(await screen.findByText('Jadwal & Jurnal Mengajar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buka Jadwal Mengajar/i })).toBeInTheDocument();
  });
});
