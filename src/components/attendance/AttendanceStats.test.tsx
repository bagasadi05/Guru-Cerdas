import { render, screen } from '@testing-library/react';
import { AttendanceStats } from './AttendanceStats';
import { describe, it, expect } from 'vitest';
import { AttendanceStatus } from '../../types';

describe('AttendanceStats Component', () => {
    const mockSummary = {
        [AttendanceStatus.Hadir]: 10,
        [AttendanceStatus.Izin]: 5,
        [AttendanceStatus.Sakit]: 3,
        [AttendanceStatus.Alpha]: 2,
        [AttendanceStatus.Libur]: 0,
    };

    it('renders all status counts correctly', () => {
        render(<AttendanceStats summary={mockSummary} />);

        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders status labels', () => {
        render(<AttendanceStats summary={mockSummary} />);

        expect(screen.getByText('Hadir')).toBeInTheDocument();
        expect(screen.getByText('Izin')).toBeInTheDocument();
        expect(screen.getByText('Sakit')).toBeInTheDocument();
        expect(screen.getByText('Alpha')).toBeInTheDocument();
    });
});
