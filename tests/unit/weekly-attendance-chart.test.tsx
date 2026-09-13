import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeeklyAttendanceChart from '../../src/components/dashboard/WeeklyAttendanceChart';

describe('WeeklyAttendanceChart', () => {
    const mockData = [
        { day: 'Senin', present_percentage: 95 },
        { day: 'Selasa', present_percentage: 88 },
        { day: 'Rabu', present_percentage: 92 },
        { day: 'Kamis', present_percentage: 79 },
        { day: 'Jumat', present_percentage: 0 },
        { day: 'Sabtu', present_percentage: 0 },
        { day: 'Minggu', present_percentage: 0 },
    ];

    it('renders the SVG element with accessibility label', () => {
        render(<WeeklyAttendanceChart data={mockData} />);
        const svg = screen.getByLabelText('Grafik absensi mingguan');
        expect(svg).toBeInTheDocument();
    });

    it('renders correct percentage labels and holiday badges', () => {
        render(<WeeklyAttendanceChart data={mockData} />);
        
        // Active days
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('88%')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
        expect(screen.getByText('79%')).toBeInTheDocument();
        
        // Friday with 0% attendance should display 0%
        expect(screen.getByText('0%')).toBeInTheDocument();
        
        // Weekend days with 0% attendance should display 'Libur'
        const liburElements = screen.getAllByText('Libur');
        expect(liburElements.length).toBe(2);
    });

    it('renders day abbreviation labels', () => {
        render(<WeeklyAttendanceChart data={mockData} />);
        expect(screen.getByText('Sen')).toBeInTheDocument();
        expect(screen.getByText('Sel')).toBeInTheDocument();
        expect(screen.getByText('Rab')).toBeInTheDocument();
        expect(screen.getByText('Kam')).toBeInTheDocument();
        expect(screen.getByText('Jum')).toBeInTheDocument();
        expect(screen.getByText('Sab')).toBeInTheDocument();
        expect(screen.getByText('Min')).toBeInTheDocument();
    });

    it('shows interactive tooltip on hover', () => {
        render(<WeeklyAttendanceChart data={mockData} />);
        
        // Find touch target for Monday (index 0)
        const senLabel = screen.getByText('Sen');
        const senGroup = senLabel.closest('g');
        expect(senGroup).not.toBeNull();

        if (senGroup) {
            fireEvent.mouseEnter(senGroup);
            // Tooltip should appear
            const tooltips = screen.getAllByText('95%');
            expect(tooltips.length).toBeGreaterThanOrEqual(2); // One label + one tooltip text

            fireEvent.mouseLeave(senGroup);
        }
    });

    it('shows "Hari Libur" tooltip for weekend days on hover', () => {
        render(<WeeklyAttendanceChart data={mockData} />);
        
        const sabLabel = screen.getByText('Sab');
        const sabGroup = sabLabel.closest('g');
        expect(sabGroup).not.toBeNull();

        if (sabGroup) {
            fireEvent.mouseEnter(sabGroup);
            expect(screen.getByText('Hari Libur')).toBeInTheDocument();
        }
    });
});
