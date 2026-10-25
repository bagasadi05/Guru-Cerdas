import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../../src/components/ui/DropdownMenu';

describe('DropdownMenu Component', () => {
    it('opens and portals content into document.body on click', () => {
        render(
            <DropdownMenu>
                <DropdownTrigger aria-label="Menu Aksi">
                    <span>Aksi</span>
                </DropdownTrigger>
                <DropdownContent align="right" className="w-48">
                    <DropdownItem onClick={vi.fn()}>Edit Jadwal</DropdownItem>
                    <DropdownItem onClick={vi.fn()}>Duplikasi</DropdownItem>
                    <DropdownItem onClick={vi.fn()}>Hapus</DropdownItem>
                </DropdownContent>
            </DropdownMenu>
        );

        // Initially closed
        expect(screen.queryByText('Edit Jadwal')).not.toBeInTheDocument();

        // Click trigger to open
        fireEvent.click(screen.getByRole('button', { name: /Menu Aksi/i }));

        // Content is in document.body
        const editItem = screen.getByText('Edit Jadwal');
        expect(editItem).toBeInTheDocument();
        expect(screen.getByText('Duplikasi')).toBeInTheDocument();
        expect(screen.getByText('Hapus')).toBeInTheDocument();

        // Verify it was rendered into document.body via portal
        const dropdownContent = editItem.closest('.dropdown-content');
        expect(dropdownContent).not.toBeNull();
        expect(dropdownContent?.parentElement).toBe(document.body);
    });

    it('executes item onClick and closes dropdown', () => {
        const handleEdit = vi.fn();
        render(
            <DropdownMenu>
                <DropdownTrigger aria-label="Menu Aksi">
                    <span>Aksi</span>
                </DropdownTrigger>
                <DropdownContent align="right">
                    <DropdownItem onClick={handleEdit}>Edit Jadwal</DropdownItem>
                </DropdownContent>
            </DropdownMenu>
        );

        fireEvent.click(screen.getByRole('button', { name: /Menu Aksi/i }));
        fireEvent.click(screen.getByText('Edit Jadwal'));

        expect(handleEdit).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Edit Jadwal')).not.toBeInTheDocument();
    });

    it('closes on Escape key', () => {
        render(
            <DropdownMenu>
                <DropdownTrigger aria-label="Menu Aksi">
                    <span>Aksi</span>
                </DropdownTrigger>
                <DropdownContent align="right">
                    <DropdownItem>Item 1</DropdownItem>
                </DropdownContent>
            </DropdownMenu>
        );

        fireEvent.click(screen.getByRole('button', { name: /Menu Aksi/i }));
        expect(screen.getByText('Item 1')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('closes on click outside', () => {
        render(
            <div>
                <button type="button">Outside Element</button>
                <DropdownMenu>
                    <DropdownTrigger aria-label="Menu Aksi">
                        <span>Aksi</span>
                    </DropdownTrigger>
                    <DropdownContent align="right">
                        <DropdownItem>Item 1</DropdownItem>
                    </DropdownContent>
                </DropdownMenu>
            </div>
        );

        fireEvent.click(screen.getByRole('button', { name: /Menu Aksi/i }));
        expect(screen.getByText('Item 1')).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByText('Outside Element'));
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });
});
