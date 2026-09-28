import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleHubMenu } from '../../src/components/schedule/ScheduleHubMenu';

describe('ScheduleHubMenu Component', () => {
  it('renders the header and all 3 menu options', () => {
    const handleSelect = vi.fn();
    render(
      <ScheduleHubMenu
        onSelectMenu={handleSelect}
        scheduleCount={8}
        todayPhCount={2}
        classesCount={5}
      />
    );

    // Title and subheadings
    expect(screen.getByText('Jadwal & Jurnal Mengajar')).toBeInTheDocument();
    expect(screen.getByText('Jadwal Mengajar')).toBeInTheDocument();
    expect(screen.getByText('Jadwal PH')).toBeInTheDocument();
    expect(screen.getByText('Jurnal Mengajar')).toBeInTheDocument();

    // Badges / Stats
    expect(screen.getByText('8 Jam Mengajar')).toBeInTheDocument();
    expect(screen.getByText('2 PH Hari Ini')).toBeInTheDocument();
    expect(screen.getByText('Catatan KBM Harian')).toBeInTheDocument();
  });

  it('triggers onSelectMenu with "mengajar" when clicking Jadwal Mengajar card or button', () => {
    const handleSelect = vi.fn();
    render(
      <ScheduleHubMenu
        onSelectMenu={handleSelect}
        scheduleCount={0}
        todayPhCount={0}
        classesCount={3}
      />
    );

    const btn = screen.getByRole('button', { name: /Buka Jadwal Mengajar/i });
    fireEvent.click(btn);

    expect(handleSelect).toHaveBeenCalledWith('mengajar');
  });

  it('triggers onSelectMenu with "ph" when clicking Jadwal PH card or button', () => {
    const handleSelect = vi.fn();
    render(
      <ScheduleHubMenu
        onSelectMenu={handleSelect}
        scheduleCount={5}
        todayPhCount={0}
        classesCount={3}
      />
    );

    const btn = screen.getByRole('button', { name: /Buka Jadwal PH/i });
    fireEvent.click(btn);

    expect(handleSelect).toHaveBeenCalledWith('ph');
  });

  it('triggers onSelectMenu with "jurnal" when clicking Jurnal Mengajar card or button', () => {
    const handleSelect = vi.fn();
    render(
      <ScheduleHubMenu
        onSelectMenu={handleSelect}
        scheduleCount={5}
        todayPhCount={1}
        classesCount={3}
      />
    );

    const btn = screen.getByRole('button', { name: /Buka Jurnal Mengajar/i });
    fireEvent.click(btn);

    expect(handleSelect).toHaveBeenCalledWith('jurnal');
  });
});
