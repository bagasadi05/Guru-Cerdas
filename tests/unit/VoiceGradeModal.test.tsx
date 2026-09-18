import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VoiceGradeModal } from '../../src/components/pages/mass-input/components/VoiceGradeModal';

// Mock sound feedback to avoid Web Audio API issues in jsdom
vi.mock('../../src/utils/soundFeedback', () => ({
    playSuccessChime: vi.fn(),
    playCommandTone: vi.fn(),
    playErrorTone: vi.fn(),
}));

let activeRecognitionInstance: MockSpeechRecognition | null = null;

class MockSpeechRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart: (() => void) | null = null;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;

    start = vi.fn().mockImplementation(() => {
        if (this.onstart) this.onstart();
    });
    stop = vi.fn().mockImplementation(() => {
        if (this.onend) this.onend();
    });
    abort = vi.fn().mockImplementation(() => {
        if (this.onend) this.onend();
    });
}

const createMockSpeechRecognition = function () {
    const inst = new MockSpeechRecognition();
    activeRecognitionInstance = inst;
    return inst;
} as unknown as new () => MockSpeechRecognition;

const mockStudents = [
    { id: 's1', name: 'Ahmad Fauzi', gender: 'L' },
    { id: 's2', name: 'Budi Santoso', gender: 'L' },
    { id: 's3', name: 'Citra Lestari', gender: 'P' },
];

describe('VoiceGradeModal Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        activeRecognitionInstance = null;
        (window as unknown as Record<string, unknown>).SpeechRecognition = createMockSpeechRecognition;
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition = createMockSpeechRecognition;
    });

    afterEach(() => {
        act(() => {
            vi.runOnlyPendingTimers();
        });
        vi.useRealTimers();
        delete (window as unknown as Record<string, unknown>).SpeechRecognition;
        delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    });

    const triggerSpeech = (transcript: string, isFinal = true) => {
        if (!activeRecognitionInstance || !activeRecognitionInstance.onresult) {
            throw new Error('SpeechRecognition instance or onresult not initialized');
        }
        act(() => {
            (activeRecognitionInstance!.onresult as (e: unknown) => void)({
                resultIndex: 0,
                results: [
                    Object.assign([{ transcript }], { isFinal }),
                ],
            });
        });
    };

    it('renders correctly when open with student roster and active student', () => {
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{}}
                onScoreChange={vi.fn()}
                kkm={75}
                subjectName="Matematika"
                assessmentName="Ulangan Harian 1"
            />
        );

        expect(screen.getByText(/Dikte Suara Nilai/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Ahmad Fauzi' })).toBeInTheDocument();
        expect(screen.getByText(/Siswa 1 dari 3/i)).toBeInTheDocument();
    });

    it('toggles safety mode between Akurat and Cepat', () => {
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{}}
                onScoreChange={vi.fn()}
                kkm={75}
            />
        );

        const accurateBtn = screen.getByRole('button', { name: /akurat/i });
        const fastBtn = screen.getByRole('button', { name: /cepat/i });

        expect(accurateBtn).toBeInTheDocument();
        expect(fastBtn).toBeInTheDocument();

        act(() => {
            fireEvent.click(fastBtn);
        });
        expect(fastBtn.className).toContain('font-bold');

        act(() => {
            fireEvent.click(accurateBtn);
        });
        expect(accurateBtn.className).toContain('font-bold');
    });

    it('handles voice grade input for active student in sequential mode and advances', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{}}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        // Click mic to start
        const micBtn = screen.getByTitle(/Mulai Mendengar/i);
        act(() => {
            fireEvent.click(micBtn);
        });

        expect(activeRecognitionInstance).not.toBeNull();
        expect(activeRecognitionInstance!.start).toHaveBeenCalled();

        // Say "85"
        triggerSpeech('85', true);

        expect(onScoreChange).toHaveBeenCalledWith('s1', '85');

        // After 450ms advance timer, active student advances to Budi Santoso
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(screen.getByRole('heading', { name: 'Budi Santoso' })).toBeInTheDocument();
        expect(screen.getByText(/Siswa 2 dari 3/i)).toBeInTheDocument();

        // Flush remaining feedback timers inside act
        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it('correctly handles correction command with valid score (never setting score to 0)', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{ s1: '70' }}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        act(() => {
            fireEvent.click(screen.getByTitle(/Mulai Mendengar/i));
        });

        // Say "ralat 90"
        triggerSpeech('ralat 90', true);

        // Score applied must be exactly 90, not 0!
        expect(onScoreChange).toHaveBeenCalledWith('s1', '90');

        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it('handles roll-targeted correction like "ralat nomor 2 85"', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{ s2: '70' }}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        act(() => {
            fireEvent.click(screen.getByTitle(/Mulai Mendengar/i));
        });

        // Say "ralat nomor 2 85"
        triggerSpeech('ralat nomor 2 85', true);

        // Roll 2 is student index 1 ('s2' - Budi Santoso)
        expect(onScoreChange).toHaveBeenCalledWith('s2', '85');

        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it('allows sequential corrections for two different students with the same score without dropping the second one', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{ s1: '60', s2: '65' }}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        act(() => {
            fireEvent.click(screen.getByTitle(/Mulai Mendengar/i));
        });

        // Correct student 1 to 85
        triggerSpeech('ralat nomor 1 85', true);
        expect(onScoreChange).toHaveBeenCalledWith('s1', '85');

        // Immediately within <2s correct student 2 to the same score 85
        triggerSpeech('ralat nomor 2 85', true);
        // Student 2 must also be updated, NOT dropped by deduplication!
        expect(onScoreChange).toHaveBeenCalledWith('s2', '85');

        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it('does not trigger stop on phrases containing everyday conversational words like "Ahmad Fauzi 85"', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{}}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        act(() => {
            fireEvent.click(screen.getByTitle(/Mulai Mendengar/i));
        });

        // Conversational phrase containing name and score
        triggerSpeech('Ahmad Fauzi 85', true);

        // Should NOT trigger stop; should parse Ahmad Fauzi and 85!
        expect(activeRecognitionInstance!.stop).not.toHaveBeenCalled();
        expect(onScoreChange).toHaveBeenCalledWith('s1', '85');

        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it('shows overwrite notification banner and supports Undo when score is replaced in sequential mode', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{ s1: '80' }}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        act(() => {
            fireEvent.click(screen.getByTitle(/Mulai Mendengar/i));
        });

        // Overwrite s1 score with 95
        triggerSpeech('95', true);

        expect(onScoreChange).toHaveBeenCalledWith('s1', '95');

        // Banner should appear
        const undoBtn = screen.getByRole('button', { name: /urungkan/i });
        expect(undoBtn).toBeInTheDocument();

        // Click undo
        act(() => {
            fireEvent.click(undoBtn);
        });

        // Should revert back to 80
        expect(onScoreChange).toHaveBeenCalledWith('s1', '80');

        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it('handles Tab 2 (Mode Bebas): parsing, score editing, applying, and supports Batch Undo', () => {
        const onScoreChange = vi.fn();
        render(
            <VoiceGradeModal
                isOpen={true}
                onClose={vi.fn()}
                students={mockStudents as any}
                scores={{ s1: '70', s2: '75' }}
                onScoreChange={onScoreChange}
                kkm={75}
            />
        );

        // Switch to Tab 2
        const tab2Btn = screen.getByRole('button', { name: /mode bebas/i });
        act(() => {
            fireEvent.click(tab2Btn);
        });

        // Type transcript with valid inputs
        const textarea = screen.getByPlaceholderText(/absen 1 85/i);
        act(() => {
            fireEvent.change(textarea, { target: { value: 'absen 1 85, absen 2 92' } });
        });

        // Check detection table renders results
        expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument();
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();

        // Edit Ahmad's score directly in preview table
        const ahmadScoreInput = screen.getByLabelText(/nilai untuk ahmad fauzi/i);
        act(() => {
            fireEvent.change(ahmadScoreInput, { target: { value: '88' } });
        });

        // Apply to table
        const applyBtn = screen.getByRole('button', { name: /terapkan ke tabel/i });
        act(() => {
            fireEvent.click(applyBtn);
        });

        expect(onScoreChange).toHaveBeenCalledWith('s1', '88');
        expect(onScoreChange).toHaveBeenCalledWith('s2', '92');

        // Verify Batch Applied Undo Banner appears
        const batchUndoBtn = screen.getByRole('button', { name: /urungkan penerapan/i });
        expect(batchUndoBtn).toBeInTheDocument();

        // Click Batch Undo
        act(() => {
            fireEvent.click(batchUndoBtn);
        });

        // Expect scores to revert to original ('70' and '75')
        expect(onScoreChange).toHaveBeenCalledWith('s1', '70');
        expect(onScoreChange).toHaveBeenCalledWith('s2', '75');

        act(() => {
            vi.runOnlyPendingTimers();
        });
    });
});
