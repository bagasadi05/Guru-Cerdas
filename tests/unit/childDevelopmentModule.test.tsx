import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedModeControl } from '../../src/components/pages/student-detail/child-development/components/SegmentedModeControl';
import { RegenerateConfirmModal } from '../../src/components/pages/student-detail/child-development/components/RegenerateConfirmModal';
import { SingleRadarSection } from '../../src/components/pages/student-detail/child-development/components/SingleRadarSection';

describe('Child Development Presentation Components', () => {
  describe('SegmentedModeControl', () => {
    it('renders both modes and responds to user click', () => {
      const handleTabChange = vi.fn();
      render(
        <SegmentedModeControl activeTabMode="single" onTabChange={handleTabChange} />
      );

      expect(screen.getByText(/Analisis Semester Aktif/i)).toBeInTheDocument();
      expect(screen.getByText(/Perbandingan Semester 1 & 2/i)).toBeInTheDocument();

      const compBtn = screen.getByText(/Perbandingan Semester 1 & 2/i);
      fireEvent.click(compBtn);
      expect(handleTabChange).toHaveBeenCalledWith('comparative');
    });
  });

  describe('RegenerateConfirmModal', () => {
    it('renders modal with title and handles confirm / cancel', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      const { rerender } = render(
        <RegenerateConfirmModal
          isOpen={false}
          title="Regenerate Test"
          description="Test description"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(screen.queryByText('Regenerate Test')).not.toBeInTheDocument();

      rerender(
        <RegenerateConfirmModal
          isOpen={true}
          title="Regenerate Test"
          description="Test description"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(screen.getByText('Regenerate Test')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Ya, Regenerate'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Batal'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('SingleRadarSection', () => {
    it('shows fallback notice when fewer than 3 subjects exist', () => {
      render(
        <SingleRadarSection
          title="Spider Chart Test"
          subjects={['Matematika', 'Bahasa Indonesia']}
          studentScores={[80, 85]}
          overallAverage={83}
          isRadarChartValid={false}
        />
      );

      expect(screen.getByText('Spider Chart Test')).toBeInTheDocument();
      expect(screen.getByText(/Bagan Radar Tidak Tersedia/i)).toBeInTheDocument();
      expect(screen.getByText('83')).toBeInTheDocument();
    });

    it('renders SVG chart when isRadarChartValid is true', () => {
      render(
        <SingleRadarSection
          title="Spider Chart Test"
          subjects={['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS']}
          studentScores={[80, 85, 90, 75]}
          overallAverage={83}
          isRadarChartValid={true}
        />
      );

      expect(screen.getByText('Spider Chart Test')).toBeInTheDocument();
      expect(screen.queryByText(/Bagan Radar Tidak Tersedia/i)).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: /Spider chart performa siswa per mata pelajaran/i })).toBeInTheDocument();
    });
  });
});
