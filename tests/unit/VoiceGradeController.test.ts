import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceGradeController } from '../../src/components/pages/mass-input/engine/VoiceGradeController';
import {
    FakeSpeechRecognitionAdapter,
    SilentAudioFeedbackAdapter,
} from '../../src/components/pages/mass-input/engine/voicePorts';

const mockStudents = [
    { id: 's1', name: 'Ahmad Fauzi' },
    { id: 's2', name: 'Budi Santoso' },
    { id: 's3', name: 'Citra Lestari' },
];

describe('VoiceGradeController (Headless Deep Module)', () => {
    let fakeSpeech: FakeSpeechRecognitionAdapter;
    let silentAudio: SilentAudioFeedbackAdapter;
    let onScoreChange: (studentId: string, value: string) => void;
    let controller: VoiceGradeController;

    beforeEach(() => {
        vi.useFakeTimers();
        fakeSpeech = new FakeSpeechRecognitionAdapter();
        silentAudio = new SilentAudioFeedbackAdapter();
        onScoreChange = vi.fn();

        controller = new VoiceGradeController({
            students: mockStudents,
            scores: {},
            onScoreChange,
            kkm: 75,
            speechPort: fakeSpeech,
            audioPort: silentAudio,
        });
    });

    it('initializes with default state', () => {
        const state = controller.getState();
        expect(state.currentIndex).toBe(0);
        expect(state.activeStudent?.name).toBe('Ahmad Fauzi');
        expect(state.isListening).toBe(false);
        expect(state.activeTab).toBe('sequential');
    });

    it('starts listening and processes speech scores sequentially', async () => {
        await controller.startListening();
        expect(controller.getState().isListening).toBe(true);

        // Teacher says "delapan puluh lima"
        fakeSpeech.emitTranscript('delapan puluh lima', true);

        expect(onScoreChange).toHaveBeenCalledWith('s1', '85');
        expect(controller.getState().recentlySavedId).toBe('s1');

        // Auto-advance after 450ms
        vi.advanceTimersByTime(450);
        expect(controller.getState().currentIndex).toBe(1);
        expect(controller.getState().activeStudent?.name).toBe('Budi Santoso');
    });

    it('handles commands: berikutnya, kembali, and hapus', async () => {
        await controller.startListening();

        // Say "berikutnya"
        fakeSpeech.emitTranscript('berikutnya', true);
        expect(controller.getState().currentIndex).toBe(1);

        // Say "kembali"
        fakeSpeech.emitTranscript('kembali', true);
        expect(controller.getState().currentIndex).toBe(0);

        // Say "hapus"
        fakeSpeech.emitTranscript('hapus', true);
        expect(onScoreChange).toHaveBeenCalledWith('s1', '');
    });

    it('handles correction (ralat) and supports undo', async () => {
        controller.updateRosterAndScores(mockStudents, { s1: '80' });
        await controller.startListening();

        // Teacher corrects: "ralat sembilan puluh"
        fakeSpeech.emitTranscript('ralat sembilan puluh', true);

        expect(onScoreChange).toHaveBeenCalledWith('s1', '90');
        expect(controller.getState().lastOverwrittenRecord).toEqual({
            studentId: 's1',
            studentName: 'Ahmad Fauzi',
            oldScore: '80',
            newScore: '90',
            index: 0,
        });

        // Trigger undo
        controller.undoLastOverwrite();
        expect(onScoreChange).toHaveBeenCalledWith('s1', '80');
        expect(controller.getState().lastOverwrittenRecord).toBeNull();
    });

    it('reliably corrects previously graded student during grace period even after 450ms auto-advance', async () => {
        await controller.startListening();

        // 1. Teacher grades s1 with 85
        fakeSpeech.emitTranscript('delapan lima', true);
        expect(onScoreChange).toHaveBeenCalledWith('s1', '85');

        // 2. 500ms elapses: controller auto-advances to s2
        vi.advanceTimersByTime(500);
        expect(controller.getState().currentIndex).toBe(1);
        expect(controller.getState().activeStudent?.name).toBe('Budi Santoso');

        // 3. Teacher realizes mistake 1 second later and says "eh bukan sembilan puluh"
        fakeSpeech.emitTranscript('eh bukan sembilan puluh', true);

        // Crucial: Must target s1 (Ahmad Fauzi), NOT s2 (Budi Santoso)!
        expect(onScoreChange).toHaveBeenCalledWith('s1', '90');
        expect(controller.getState().currentIndex).toBe(0);
        expect(controller.getState().activeStudent?.name).toBe('Ahmad Fauzi');
    });

    it('handles mid-sentence correction "75 ralat 80" in sequential mode', async () => {
        await controller.startListening();

        // Teacher says mid-sentence ralat
        fakeSpeech.emitTranscript('tujuh lima ralat delapan puluh', true);

        expect(onScoreChange).toHaveBeenCalledWith('s1', '80');
    });

    it('handles decimal score dictation (e.g. delapan puluh lima koma lima)', async () => {
        await controller.startListening();

        fakeSpeech.emitTranscript('delapan puluh lima koma lima', true);

        expect(onScoreChange).toHaveBeenCalledWith('s1', '85.5');
    });

    it('handles Mode Bebas (Name Match) parsing and batch application', async () => {
        controller.setActiveTab('name_match');
        await controller.startListening();

        // Dictate multiple students at once
        fakeSpeech.emitTranscript('Ahmad Fauzi delapan puluh lima Budi Santoso sembilan puluh', true);

        const state = controller.getState();
        expect(state.recognizedPairs.length).toBe(2);
        expect(state.recognizedPairs[0].studentId).toBe('s1');
        expect(state.recognizedPairs[0].score).toBe(85);
        expect(state.recognizedPairs[1].studentId).toBe('s2');
        expect(state.recognizedPairs[1].score).toBe(90);

        // Apply batch
        const result = controller.applyFreeformPairs();
        expect(result.appliedCount).toBe(2);
        expect(onScoreChange).toHaveBeenCalledWith('s1', '85');
        expect(onScoreChange).toHaveBeenCalledWith('s2', '90');
        expect(controller.getState().canUndoBatch).toBe(true);

        // Undo batch
        controller.undoBatchApply();
        expect(onScoreChange).toHaveBeenCalledWith('s1', '');
        expect(onScoreChange).toHaveBeenCalledWith('s2', '');
        expect(controller.getState().canUndoBatch).toBe(false);
    });
});
