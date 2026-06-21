import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JournalRekapPanel } from '../../src/components/pages/journal/JournalRekapPanel';
import { useTeachingJournals, useTeachingJournalsRekap } from '../../src/hooks/useTeachingJournals';

// Mock the hooks
vi.mock('../../src/hooks/useTeachingJournals', () => ({
  useTeachingJournals: vi.fn(),
  useTeachingJournalsRekap: vi.fn(),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'teacher-1', name: 'Guru Budi', school_name: 'MI AL IRSYAD KOTA MADIUN' }
  }))
}));

vi.mock('../../src/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }))
}));

// Mock the export services
vi.mock('../../src/services/journalExport', () => ({
  exportJournalsToExcel: vi.fn(),
  exportJournalsToPDF: vi.fn(),
}));

describe('JournalRekapPanel Component', () => {
  const defaultFilters = {
    startDate: '2026-06-01',
    endDate: '2026-06-30'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state (skeleton placeholders)', () => {
    vi.mocked(useTeachingJournalsRekap).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn()
    } as any);

    vi.mocked(useTeachingJournals).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    } as any);

    const { container } = render(<JournalRekapPanel filters={defaultFilters} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders backend missing warning when database table is not found', () => {
    vi.mocked(useTeachingJournalsRekap).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { code: '42P01', message: 'relation teaching_journals does not exist' },
      refetch: vi.fn()
    } as any);

    render(<JournalRekapPanel filters={defaultFilters} />);
    expect(screen.getByText('Fitur Jurnal Mengajar Belum Aktif')).toBeInTheDocument();
    expect(screen.getByText(/jalankan migrasi database di Supabase/i)).toBeInTheDocument();
  });

  it('renders empty state when there are no journals recorded', () => {
    vi.mocked(useTeachingJournalsRekap).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any);

    render(<JournalRekapPanel filters={defaultFilters} />);
    expect(screen.getByText('Belum Ada Data Jurnal')).toBeInTheDocument();
    expect(screen.getByText(/Belum ada data jurnal mengajar yang terekam/)).toBeInTheDocument();
  });

  it('renders list of teaching journal summaries when data is available', () => {
    const mockRekapData = [
      {
        classId: 'c-1',
        className: 'Kelas 5B',
        subject: 'Fisika',
        totalMeetings: 4,
        journalsFilled: 4,
        lastJournalDate: '2026-06-20'
      }
    ];

    vi.mocked(useTeachingJournalsRekap).mockReturnValue({
      data: mockRekapData,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any);

    render(<JournalRekapPanel filters={defaultFilters} />);
    expect(screen.getByText('Kelas 5B')).toBeInTheDocument();
    expect(screen.getByText('Fisika')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('20/06/2026')).toBeInTheDocument();
  });
});
