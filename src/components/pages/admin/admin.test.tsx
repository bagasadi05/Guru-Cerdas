import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatCard, getRoleBadgeClass } from './components';
import { useRealTimeClock } from './hooks';
import { announcementTemplates } from './constants';
import React from 'react';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader-icon">Loading</div>,
    Users: () => <div data-testid="users-icon">Users</div>,
}));

describe('Admin Module - StatCard Component', () => {
    it('renders with correct label and value', () => {
        render(
            <StatCard
                icon={<div data-testid="test-icon">Icon</div>}
                label="Total Users"
                value={100}
                color="indigo"
            />
        );

        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('formats large numbers with locale string', () => {
        render(
            <StatCard
                icon={<div>Icon</div>}
                label="Big Number"
                value={1234567}
                color="blue"
            />
        );

        // Should format as "1,234,567" or locale equivalent
        expect(screen.getByText(/1.*234.*567/)).toBeInTheDocument();
    });

    it('shows loading state when loading prop is true', () => {
        render(
            <StatCard
                icon={<div>Icon</div>}
                label="Loading Test"
                value={50}
                color="green"
                loading={true}
            />
        );

        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
        expect(screen.queryByText('50')).not.toBeInTheDocument();
    });

    it.each([
        ['indigo', 'from-indigo-500'],
        ['blue', 'from-blue-500'],
        ['green', 'from-green-500'],
        ['orange', 'from-orange-500'],
        ['purple', 'from-purple-500'],
        ['pink', 'from-pink-500'],
    ] as const)('applies correct color class for %s', (color, expectedClass) => {
        const { container } = render(
            <StatCard
                icon={<div>Icon</div>}
                label="Color Test"
                value={10}
                color={color}
            />
        );

        const coloredDiv = container.querySelector(`[class*="${expectedClass}"]`);
        expect(coloredDiv).toBeInTheDocument();
    });
});

describe('Admin Module - getRoleBadgeClass', () => {
    it('returns correct class for admin role', () => {
        const result = getRoleBadgeClass('admin');
        expect(result).toContain('purple');
    });

    it('returns correct class for teacher role', () => {
        const result = getRoleBadgeClass('teacher');
        expect(result).toContain('blue');
    });

    it('returns correct class for student role', () => {
        const result = getRoleBadgeClass('student');
        expect(result).toContain('green');
    });

    it('returns correct class for parent role', () => {
        const result = getRoleBadgeClass('parent');
        expect(result).toContain('orange');
    });

    it('returns default class for unknown role', () => {
        const result = getRoleBadgeClass('unknown');
        expect(result).toContain('gray');
    });
});

describe('Admin Module - useRealTimeClock Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns current time', () => {
        const TestComponent = () => {
            const time = useRealTimeClock();
            return <div data-testid="time">{time.toISOString()}</div>;
        };

        render(<TestComponent />);
        expect(screen.getByTestId('time')).toBeInTheDocument();
    });

    it('updates time every second', async () => {
        const TestComponent = () => {
            const time = useRealTimeClock();
            return <div data-testid="time">{time.getTime()}</div>;
        };

        const { rerender } = render(<TestComponent />);
        const initialTime = Number(screen.getByTestId('time').textContent);

        // Advance timer by 1 second and trigger re-render
        await vi.advanceTimersByTimeAsync(1100);
        rerender(<TestComponent />);

        // Time should have updated (at least 1 second difference)
        const newTime = Number(screen.getByTestId('time').textContent);
        expect(newTime).toBeGreaterThan(initialTime);
    });
});

describe('Admin Module - Announcement Templates', () => {
    it('contains required templates', () => {
        expect(announcementTemplates.length).toBeGreaterThan(0);
    });

    it('each template has required fields', () => {
        announcementTemplates.forEach(template => {
            expect(template).toHaveProperty('id');
            expect(template).toHaveProperty('title');
            expect(template).toHaveProperty('content');
            expect(template).toHaveProperty('audience_type');
            expect(template).toHaveProperty('category');
            expect(template).toHaveProperty('icon');
        });
    });

    it('has unique template IDs', () => {
        const ids = announcementTemplates.map(t => t.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('has valid audience types', () => {
        const validAudiences = ['all', 'students', 'parents', 'teachers'];
        announcementTemplates.forEach(template => {
            expect(validAudiences).toContain(template.audience_type);
        });
    });
});
