import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { AccessibilityProvider, useAccessibility } from '../../src/components/ui/AccessibilityFeatures';
import { getDashboardMoreMenuItems, getDashboardNavSections } from '../../src/components/navigation/dashboardMenuConfig';

const EasyModeHarness: React.FC = () => {
    const { isEasyMode, toggleEasyMode } = useAccessibility();

    return (
        <button type="button" onClick={toggleEasyMode} aria-pressed={isEasyMode}>
            {isEasyMode ? 'Nonaktifkan Mode Mudah' : 'Aktifkan Mode Mudah'}
        </button>
    );
};

describe('Mode Mudah', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-easy-mode');
        document.documentElement.removeAttribute('data-font-size');
    });

    it('applies and restores its visual preferences without changing saved font size', async () => {
        localStorage.setItem('fontSize', 'x-large');
        render(<AccessibilityProvider><EasyModeHarness /></AccessibilityProvider>);

        fireEvent.click(screen.getByRole('button', { name: 'Aktifkan Mode Mudah' }));

        await waitFor(() => {
            expect(document.documentElement).toHaveAttribute('data-easy-mode', 'true');
            expect(document.documentElement).toHaveAttribute('data-font-size', 'large');
            expect(document.documentElement).toHaveClass('high-contrast');
        });

        fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan Mode Mudah' }));

        await waitFor(() => {
            expect(document.documentElement).toHaveAttribute('data-easy-mode', 'false');
            expect(document.documentElement).toHaveAttribute('data-font-size', 'x-large');
            expect(document.documentElement).not.toHaveClass('high-contrast');
        });
    });

    it('keeps every navigation destination available', () => {
        const standardSections = getDashboardNavSections(true, 'admin', true, false);
        const easyModeSections = getDashboardNavSections(true, 'admin', true, true);
        const standardMoreItems = getDashboardMoreMenuItems(true, 'admin', true, false);
        const easyModeMoreItems = getDashboardMoreMenuItems(true, 'admin', true, true);

        expect(easyModeSections).toEqual(standardSections);
        expect(easyModeMoreItems).toEqual(standardMoreItems);
    });
});
