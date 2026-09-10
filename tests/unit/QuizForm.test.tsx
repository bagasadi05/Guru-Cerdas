import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuizForm } from '../../src/components/pages/student/forms/QuizForm';
import { QuizPointRow } from '../../src/components/pages/student/types';

describe('QuizForm Component', () => {
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    it('renders correctly with null defaultValues', () => {
        render(
            <QuizForm
                defaultValues={null}
                onSubmit={mockOnSubmit}
                onClose={mockOnClose}
                isPending={false}
            />
        );

        expect(screen.getByText('Kategori Aktivitas')).toBeDefined();
        expect(screen.getByText('Bertanya')).toBeDefined();
        expect(screen.getByText('Menjawab')).toBeDefined();
        // No quick suggestions should be shown when no category is selected
        expect(screen.queryByText('Pilih Cepat:')).toBeNull();
    });

    it('renders safely and does not crash when category is unknown or legacy string', () => {
        const legacyData: any = {
            id: 'qp-1',
            student_id: 's-1',
            quiz_date: '2026-09-10',
            subject: 'Matematika',
            quiz_name: 'Latihan Soal',
            category: 'keaktifan_legacy', // Non-standard category
            points: 10,
            created_at: '2026-09-10T00:00:00Z',
        };

        expect(() => {
            render(
                <QuizForm
                    defaultValues={legacyData}
                    onSubmit={mockOnSubmit}
                    onClose={mockOnClose}
                    isPending={false}
                />
            );
        }).not.toThrow();

        // Suggestions should not crash and should simply not render
        expect(screen.queryByText('Pilih Cepat:')).toBeNull();
    });

    it('renders suggestions when a valid category is provided and updates quiz_name on click', () => {
        const validData = {
            id: 'qp-2',
            student_id: 's-1',
            quiz_date: '2026-09-10',
            subject: 'IPA',
            quiz_name: '',
            category: 'bertanya',
            points: 10,
            max_points: 100,
            created_at: '2026-09-10T00:00:00Z',
            deleted_at: null,
            is_used: null,
            semester_id: null,
            user_id: 'user-1',
            synced_at: null,
            created_by: 'user-1',
            updated_at: '2026-09-10T00:00:00Z',
        } as unknown as QuizPointRow;

        render(
            <QuizForm
                defaultValues={validData}
                onSubmit={mockOnSubmit}
                onClose={mockOnClose}
                isPending={false}
            />
        );

        expect(screen.getByText('Pilih Cepat:')).toBeDefined();
        const suggestionBtn = screen.getByText('Aktif bertanya di kelas');
        expect(suggestionBtn).toBeDefined();

        fireEvent.click(suggestionBtn);

        const input = screen.getByPlaceholderText('cth. Aktif bertanya di kelas') as HTMLInputElement;
        expect(input.value).toBe('Aktif bertanya di kelas');
    });

    it('calls onClose when Batal is clicked', () => {
        render(
            <QuizForm
                defaultValues={null}
                onSubmit={mockOnSubmit}
                onClose={mockOnClose}
                isPending={false}
            />
        );

        fireEvent.click(screen.getByText('Batal'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
