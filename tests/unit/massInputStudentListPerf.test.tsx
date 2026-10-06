import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Step2_StudentList } from '../../src/components/pages/mass-input/components/Step2_StudentList';
import type { StudentRow } from '../../src/components/pages/mass-input/types';

const makeStudents = (count: number): StudentRow[] =>
    Array.from({ length: count }, (_, i) => ({
        id: `s-${i}`,
        name: `Siswa ${String(i).padStart(3, '0')}`,
        class_id: `c-${i % 24}`,
        user_id: 'u-1',
        gender: 'L',
        avatar_url: null,
    }) as unknown as StudentRow);

const renderList = (students: StudentRow[], extra: Record<string, unknown> = {}) =>
    render(
        <Step2_StudentList
            mode="violation"
            searchTerm=""
            setSearchTerm={vi.fn()}
            filterOptions={[{ value: 'all', label: 'Semua' }]}
            studentFilter="all"
            setStudentFilter={vi.fn()}
            isLoadingStudents={false}
            students={students}
            isAllSelected={false}
            handleSelectAllStudents={vi.fn()}
            selectedStudentIds={new Set()}
            handleStudentSelect={vi.fn()}
            scores={{}}
            handleScoreChange={vi.fn()}
            existingGrades={[]}
            selectedClass="all"
            classes={[]}
            {...extra}
        />,
    );

describe('Step2_StudentList rendering cost', () => {
    it('renders only one layout (setupTests matchMedia → mobile)', () => {
        renderList(makeStudents(5));
        // Desktop table must not be mounted alongside the mobile cards.
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getAllByText(/^Siswa 00\d$/)).toHaveLength(5);
    });

    it('mounts a cross-class list in batches instead of all 616 rows', () => {
        renderList(makeStudents(616));
        expect(screen.getAllByText(/^Siswa \d{3}$/)).toHaveLength(60);
        expect(screen.getByText(/60 dari 616/)).toBeInTheDocument();
    });

    it('shows violation status badges from the status map', () => {
        renderList(makeStudents(3), {
            violationStatusMap: new Map([
                ['s-0', { recordedOnDate: true, semesterPoints: 9 }],
                ['s-1', { recordedOnDate: false, semesterPoints: 3 }],
            ]),
        });
        expect(screen.getAllByText('Sudah tercatat di tanggal ini')).toHaveLength(1);
        expect(screen.getByText('9 poin semester ini')).toBeInTheDocument();
        expect(screen.getByText('3 poin semester ini')).toBeInTheDocument();
    });
});
