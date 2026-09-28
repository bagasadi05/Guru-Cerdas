import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { TodayAgendaCard } from '../../src/components/dashboard/TodayAgendaCard';

// Mock supabase client query for PH schedules
vi.mock('../../src/services/supabase', () => ({
  clearStaleAuthTokens: vi.fn(),
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'ph-1',
            date: new Date().toLocaleDateString('sv-SE'),
            subject: 'Matematika: Bangun Datar',
            period_label: '1-2',
            class_id: 'c1',
            created_at: new Date().toISOString(),
            semester_id: 'sem-1',
            deleted_at: null,
          },
        ],
        error: null,
      }),
    })),
  },
}));

describe('TodayAgendaCard', () => {
  const mockSchedule = [
    {
      id: 'sch-1',
      subject: 'Bahasa Indonesia',
      start_time: '07:30',
      end_time: '08:50',
      class_id: 'c1',
      className: 'Kelas 4A',
    },
  ];

  const mockClasses = [{ id: 'c1', name: 'Kelas 4A' }];

  it('renders correctly with teaching schedule and tab counters', () => {
    renderWithProviders(
      <TodayAgendaCard
        schedule={mockSchedule}
        currentTime={new Date('2026-09-28T08:00:00')}
        classes={mockClasses}
      />
    );

    expect(screen.getByText('Agenda Hari Ini')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Jadwal Mengajar/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jadwal PH/i })).toBeInTheDocument();
    expect(screen.getByText('Bahasa Indonesia')).toBeInTheDocument();
  });

  it('switches to Jadwal PH tab upon clicking the tab button', async () => {
    renderWithProviders(
      <TodayAgendaCard
        schedule={mockSchedule}
        currentTime={new Date('2026-09-28T08:00:00')}
        classes={mockClasses}
      />
    );

    const phTabBtn = screen.getByRole('button', { name: /Jadwal PH/i });
    fireEvent.click(phTabBtn);

    expect(await screen.findByText('Buka Kalender PH')).toBeInTheDocument();
  });

  it('renders friendly empty state when teaching schedule is empty', () => {
    renderWithProviders(
      <TodayAgendaCard
        schedule={[]}
        currentTime={new Date('2026-09-28T08:00:00')}
        classes={mockClasses}
      />
    );

    expect(screen.getByText('Tidak Ada Jadwal Mengajar Hari Ini')).toBeInTheDocument();
  });
});
