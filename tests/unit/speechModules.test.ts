import { describe, it, expect } from 'vitest';
import * as speechFacade from '../../src/utils/indonesianSpeechParser';
import * as speechModule from '../../src/utils/speech';

describe('Speech Modular Architecture', () => {
    it('re-exports all speech parser functions and constants identically from facade', () => {
        expect(speechFacade.parseSpokenInput).toBe(speechModule.parseSpokenInput);
        expect(speechFacade.parseVoiceCommand).toBe(speechModule.parseVoiceCommand);
        expect(speechFacade.parseIndonesianNumber).toBe(speechModule.parseIndonesianNumber);
        expect(speechFacade.normalizeSpeechText).toBe(speechModule.normalizeSpeechText);
        expect(speechFacade.expandUnspacedNumbers).toBe(speechModule.expandUnspacedNumbers);
        expect(speechFacade.parseAttendanceNumberAndScore).toBe(speechModule.parseAttendanceNumberAndScore);
        expect(speechFacade.parseAttendanceJump).toBe(speechModule.parseAttendanceJump);
        expect(speechFacade.splitContinuousSpeech).toBe(speechModule.splitContinuousSpeech);
        expect(speechFacade.parseNameAndGradeSpeech).toBe(speechModule.parseNameAndGradeSpeech);
    });

    describe('Normalizer Submodule', () => {
        it('expands unspaced numbers properly', () => {
            expect(speechModule.expandUnspacedNumbers('delapanpuluhlima')).toBe('delapan puluh lima');
            expect(speechModule.expandUnspacedNumbers('duabelas')).toBe('dua belas');
        });

        it('normalizes speech text by removing punctuation and trimming', () => {
            expect(speechModule.normalizeSpeechText('Halo,  delapan puluh lima! ')).toBe('halo delapan puluh lima');
        });
    });

    describe('Command Parser Submodule', () => {
        it('parses navigational commands accurately', () => {
            expect(speechModule.parseVoiceCommand('lanjut')).toBe('next');
            expect(speechModule.parseVoiceCommand('kembali')).toBe('prev');
            expect(speechModule.parseVoiceCommand('hapus')).toBe('clear');
            expect(speechModule.parseVoiceCommand('berhenti')).toBe('stop');
            expect(speechModule.parseVoiceCommand('urungkan')).toBe('undo');
        });

        it('ignores text with numbers as command', () => {
            expect(speechModule.parseVoiceCommand('lanjut 85')).toBeNull();
        });
    });

    describe('Number Parser Submodule', () => {
        it('parses Indonesian written numbers into numbers', () => {
            expect(speechModule.parseIndonesianNumber('delapan puluh lima')).toBe(85);
            expect(speechModule.parseIndonesianNumber('sembilan puluh')).toBe(90);
            expect(speechModule.parseIndonesianNumber('seratus')).toBe(100);
            expect(speechModule.parseIndonesianNumber('nol')).toBe(0);
        });
    });

    describe('Attendance Parser Submodule', () => {
        it('parses roll number and score', () => {
            const res = speechModule.parseAttendanceNumberAndScore('absen 5 nilai 85', 30);
            expect(res).toEqual({ studentIndex: 4, score: 85 });
        });

        it('parses jump to student number', () => {
            const res = speechModule.parseAttendanceJump('absen 12', 30);
            expect(res).toEqual({ studentIndex: 11 });
        });
    });
});
