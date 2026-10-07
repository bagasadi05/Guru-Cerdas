import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import type { AnalyticsAcademicRecord, Student } from '../../src/components/pages/analytics/types';

const gemini = vi.hoisted(() => ({ generateGeminiJson: vi.fn() }));
vi.mock('../../src/services/geminiService', () => gemini);

import { AcademicTab } from '../../src/components/pages/analytics/AcademicTab';
import { calculateOverallGradeStats } from '../../src/services/academicAnalyticsService';

const students: Student[] = [
    { id: 's1', name: 'Ani', class_id: 'c1', gender: 'Perempuan' },
    { id: 's2', name: 'Budi', class_id: 'c1', gender: 'Laki-laki' },
];
const records: AnalyticsAcademicRecord[] = [
    { student_id: 's1', subject: 'IPAS', assessment_name: 'PH 1', score: 78, created_at: '2026-08-03T03:00:00Z' },
    { student_id: 's2', subject: 'IPAS', assessment_name: 'PH 1', score: 95, created_at: '2026-08-03T03:00:00Z' },
];

const renderTab = (kktp: number) => renderWithProviders(
    <AcademicTab
        gradeStats={calculateOverallGradeStats(records, kktp)}
        classes={[{ id: 'c1', name: '4A' }]}
        students={students}
        academicRecords={records}
        selectedClassId="all"
        kktp={kktp}
        semesterName="Ganjil"
    />,
);

describe('AcademicTab', () => {
    beforeEach(() => {
        gemini.generateGeminiJson.mockReset();
        gemini.generateGeminiJson.mockResolvedValue([{ id: 'ai', severity: 'info', title: 'Saran dari AI', detail: 'Detail' }]);
    });

    it('judges students against the teacher KKTP, not a fixed 75', async () => {
        renderTab(80);
        expect(await screen.findByText(/seluruh semester Ganjil dengan KKTP 80/)).toBeInTheDocument();
        const list = screen.getByText('Siswa di Bawah KKTP').closest('div')!.parentElement!;
        expect(list).toHaveTextContent('Ani');
        expect(list).not.toHaveTextContent('Budi');
    });

    it('waits for the teacher before calling the AI', async () => {
        renderTab(75);
        await screen.findByText('Insight Akademik');
        expect(gemini.generateGeminiJson).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Analisis dengan AI' }));
        await waitFor(() => expect(screen.getByText('Saran dari AI')).toBeInTheDocument());
        expect(gemini.generateGeminiJson).toHaveBeenCalledTimes(1);
    });
});
