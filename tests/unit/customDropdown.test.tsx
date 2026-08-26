import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomDropdown } from '../../src/components/ui/CustomDropdown';

const mockOptions = [
    { value: '1', label: 'Kelas 1' },
    { value: '2', label: 'Kelas 2' },
    { value: '3', label: 'Kelas 3' },
];

describe('CustomDropdown — Accessibility & Keyboard Navigation', () => {
    it('renders with correct ARIA attributes', () => {
        render(
            <CustomDropdown
                value="1"
                onChange={vi.fn()}
                options={mockOptions}
                aria-label="Pilih Kelas"
            />
        );

        const trigger = screen.getByRole('button', { name: /pilih kelas/i });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens listbox with role="listbox" on click and updates aria-expanded', () => {
        render(
            <CustomDropdown
                value="1"
                onChange={vi.fn()}
                options={mockOptions}
                aria-label="Pilih Kelas"
            />
        );

        const trigger = screen.getByRole('button', { name: /pilih kelas/i });
        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        expect(options[0]).toHaveAttribute('aria-selected', 'true');
        expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('navigates with ArrowDown and selects with Enter', () => {
        const handleChange = vi.fn();
        render(
            <CustomDropdown
                value="1"
                onChange={handleChange}
                options={mockOptions}
                aria-label="Pilih Kelas"
            />
        );

        const trigger = screen.getByRole('button', { name: /pilih kelas/i });

        // Press ArrowDown on closed dropdown to open it
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        // ArrowDown to move to next item
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });

        // Press Enter to select
        fireEvent.keyDown(trigger, { key: 'Enter' });
        expect(handleChange).toHaveBeenCalledWith('2');
    });

    it('closes on Escape key press', () => {
        render(
            <CustomDropdown
                value="1"
                onChange={vi.fn()}
                options={mockOptions}
                aria-label="Pilih Kelas"
            />
        );

        const trigger = screen.getByRole('button', { name: /pilih kelas/i });
        fireEvent.click(trigger);
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        fireEvent.keyDown(trigger, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});
