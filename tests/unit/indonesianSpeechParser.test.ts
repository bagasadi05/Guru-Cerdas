import { describe, expect, it } from 'vitest';
import {
    parseIndonesianNumber,
    parseVoiceCommand,
    parseNameAndGradeSpeech,
    parseAttendanceNumberAndScore,
    parseAttendanceJump,
    parseSpokenInput,
    normalizeSpeechText,
    splitContinuousSpeech,
} from '../../src/utils/indonesianSpeechParser';
import {
    findStudentMatch,
    normalizeIndonesianPhonetic,
    levenshteinSimilarity,
} from '../../src/utils/studentMatcher';

describe('indonesianSpeechParser', () => {
    describe('normalizeSpeechText', () => {
        it('normalizes casing and punctuation', () => {
            expect(normalizeSpeechText('  Delapan Puluh Lima! ')).toBe('delapan puluh lima');
            expect(normalizeSpeechText('Ahmad, 85.')).toBe('ahmad 85');
        });
    });

    describe('parseIndonesianNumber', () => {
        it('parses direct digits', () => {
            expect(parseIndonesianNumber('85')).toBe(85);
            expect(parseIndonesianNumber('100')).toBe(100);
            expect(parseIndonesianNumber('0')).toBe(0);
            expect(parseIndonesianNumber('75')).toBe(75);
            expect(parseIndonesianNumber('7')).toBe(7);
        });

        it('parses formal Indonesian number phrases', () => {
            expect(parseIndonesianNumber('delapan puluh lima')).toBe(85);
            expect(parseIndonesianNumber('tujuh puluh')).toBe(70);
            expect(parseIndonesianNumber('sembilan puluh sembilan')).toBe(99);
            expect(parseIndonesianNumber('dua puluh')).toBe(20);
            expect(parseIndonesianNumber('seratus')).toBe(100);
            expect(parseIndonesianNumber('sepuluh')).toBe(10);
            expect(parseIndonesianNumber('sebelas')).toBe(11);
            expect(parseIndonesianNumber('dua belas')).toBe(12);
            expect(parseIndonesianNumber('tujuh belas')).toBe(17);
            expect(parseIndonesianNumber('nol')).toBe(0);
            expect(parseIndonesianNumber('kosong')).toBe(0);
        });

        it('parses casual teacher shorthand number phrases', () => {
            expect(parseIndonesianNumber('delapan lima')).toBe(85);
            expect(parseIndonesianNumber('tujuh lima')).toBe(75);
            expect(parseIndonesianNumber('sembilan nol')).toBe(90);
            expect(parseIndonesianNumber('delapan nol')).toBe(80);
            expect(parseIndonesianNumber('tujuh nol')).toBe(70);
            expect(parseIndonesianNumber('tujuh delapan')).toBe(78);
            expect(parseIndonesianNumber('satu nol nol')).toBe(100);
        });

        it('parses regional dialects and colloquial numbers', () => {
            expect(parseIndonesianNumber('lapan lima')).toBe(85);
            expect(parseIndonesianNumber('dapan lima')).toBe(85);
            expect(parseIndonesianNumber('cepek')).toBe(100);
            expect(parseIndonesianNumber('seket')).toBe(50);
            expect(parseIndonesianNumber('pitu lima')).toBe(75);
            expect(parseIndonesianNumber('wolu lima')).toBe(85);
            expect(parseIndonesianNumber('songo lima')).toBe(95);
        });

        it('parses spaced digits and mixed digit-word formats from speech engines', () => {
            expect(parseIndonesianNumber('8 5')).toBe(85);
            expect(parseIndonesianNumber('9 0')).toBe(90);
            expect(parseIndonesianNumber('7 5')).toBe(75);
            expect(parseIndonesianNumber('1 0 0')).toBe(100);
            expect(parseIndonesianNumber('8 puluh 5')).toBe(85);
            expect(parseIndonesianNumber('8 puluh')).toBe(80);
            expect(parseIndonesianNumber('5 belas')).toBe(15);
            expect(parseIndonesianNumber('8.5')).toBe(85);
            expect(parseIndonesianNumber('8 lima')).toBe(85);
        });

        it('ignores filler words and conversational wrappers', () => {
            expect(parseIndonesianNumber('nilainya 85 ya')).toBe(85);
            expect(parseIndonesianNumber('kasih delapan puluh lima')).toBe(85);
            expect(parseIndonesianNumber('dapat sembilan puluh dong')).toBe(90);
            expect(parseIndonesianNumber('skornya 78')).toBe(78);
            expect(parseIndonesianNumber('ananda dapat 88 oke')).toBe(88);
        });

        it('rejects numbers exceeding 100 or non-numbers', () => {
            expect(parseIndonesianNumber('105')).toBeNull();
            expect(parseIndonesianNumber('seratus lima')).toBeNull();
            expect(parseIndonesianNumber('halo')).toBeNull();
            expect(parseIndonesianNumber('')).toBeNull();
        });
    });

    describe('parseAttendanceNumberAndScore', () => {
        it('parses roll number and score accurately', () => {
            expect(parseAttendanceNumberAndScore('nomor dua 85', 30)).toEqual({
                studentIndex: 1,
                score: 85,
            });
            expect(parseAttendanceNumberAndScore('nomor 2 85', 30)).toEqual({
                studentIndex: 1,
                score: 85,
            });
            expect(parseAttendanceNumberAndScore('absen 14 sembilan puluh', 30)).toEqual({
                studentIndex: 13,
                score: 90,
            });
            expect(parseAttendanceNumberAndScore('siswa 3 dapat 75', 30)).toEqual({
                studentIndex: 2,
                score: 75,
            });
            expect(parseAttendanceNumberAndScore('urutan 5 nilai 80', 30)).toEqual({
                studentIndex: 4,
                score: 80,
            });
        });

        it('returns null if roll number exceeds student count', () => {
            expect(parseAttendanceNumberAndScore('nomor 35 85', 30)).toBeNull();
        });
    });

    describe('parseAttendanceJump', () => {
        it('parses jump to attendance number without score', () => {
            expect(parseAttendanceJump('nomor 5', 30)).toEqual({ studentIndex: 4 });
            expect(parseAttendanceJump('absen 12', 30)).toEqual({ studentIndex: 11 });
            expect(parseAttendanceJump('siswa tiga', 30)).toEqual({ studentIndex: 2 });
        });

        it('returns null if roll number exceeds student count or contains score keywords', () => {
            expect(parseAttendanceJump('nomor 40', 30)).toBeNull();
            expect(parseAttendanceJump('nomor 5 nilai 80', 30)).toBeNull();
        });
    });

    describe('parseVoiceCommand', () => {
        it('recognizes next/skip commands', () => {
            expect(parseVoiceCommand('lanjut')).toBe('next');
            expect(parseVoiceCommand('lewati')).toBe('next');
            expect(parseVoiceCommand('next')).toBe('next');
            expect(parseVoiceCommand('skip')).toBe('next');
            expect(parseVoiceCommand('tolong lanjut')).toBe('next');
        });

        it('recognizes prev/back commands', () => {
            expect(parseVoiceCommand('kembali')).toBe('prev');
            expect(parseVoiceCommand('mundur')).toBe('prev');
            expect(parseVoiceCommand('sebelumnya')).toBe('prev');
        });

        it('recognizes clear/delete commands', () => {
            expect(parseVoiceCommand('hapus')).toBe('clear');
            expect(parseVoiceCommand('kosongkan')).toBe('clear');
            expect(parseVoiceCommand('reset')).toBe('clear');
        });

        it('recognizes stop/done commands', () => {
            expect(parseVoiceCommand('selesai')).toBe('stop');
            expect(parseVoiceCommand('stop')).toBe('stop');
            expect(parseVoiceCommand('tutup')).toBe('stop');
        });

        it('recognizes undo commands', () => {
            expect(parseVoiceCommand('urungkan')).toBe('undo');
            expect(parseVoiceCommand('kembalikan')).toBe('undo');
            expect(parseVoiceCommand('batalkan perubahan')).toBe('undo');
        });

        it('strictly rejects conversational false positives that contain numbers or score words', () => {
            expect(parseVoiceCommand('Nilai Ahmad sudah 85')).toBeNull();
            expect(parseVoiceCommand('Sudah saya cek nilainya')).toBeNull();
            expect(parseVoiceCommand('lanjut 80')).toBeNull();
            expect(parseVoiceCommand('kembali ke nilai awal')).toBeNull();
            expect(parseVoiceCommand('hapus catatan')).toBeNull();
            expect(parseVoiceCommand('sudah')).toBeNull();
            expect(parseVoiceCommand('sudah selesai')).toBe('stop');
        });

        it('returns null for non-command phrases', () => {
            expect(parseVoiceCommand('delapan puluh lima')).toBeNull();
            expect(parseVoiceCommand('ahmad')).toBeNull();
        });
    });

    describe('parseSpokenInput', () => {
        const mockStudents = [
            { id: 's-1', name: 'Ahmad Fauzi' },
            { id: 's-2', name: 'Budi Santoso' },
            { id: 's-3', name: 'Citra Dewi' },
        ];

        it('detects voice navigation commands', () => {
            const res = parseSpokenInput('lanjut', mockStudents, 0);
            expect(res).toEqual({ type: 'command', command: 'next' });
        });

        it('detects attendance roll number + score', () => {
            const res = parseSpokenInput('nomor 2 nilai 85', mockStudents, 0);
            expect(res).toEqual({
                type: 'roll_grade',
                studentIndex: 1,
                score: 85,
                rawText: 'nomor 2 nilai 85',
            });
        });

        it('detects attendance jump', () => {
            const res = parseSpokenInput('absen 3', mockStudents, 0);
            expect(res).toEqual({
                type: 'jump_to_student',
                studentIndex: 2,
                rawText: 'absen 3',
            });
        });

        it('detects student name + score', () => {
            const res = parseSpokenInput('Ahmad Fauzi 90', mockStudents, 0);
            expect(res).toEqual({
                type: 'name_grade',
                studentId: 's-1',
                studentName: 'Ahmad Fauzi',
                studentIndex: 0,
                score: 90,
                rawText: 'Ahmad Fauzi 90',
            });
        });

        it('detects active student score', () => {
            const res = parseSpokenInput('delapan lima', mockStudents, 0);
            expect(res).toEqual({
                type: 'active_grade',
                score: 85,
                rawText: 'delapan lima',
            });
        });

        it('detects correction command with score', () => {
            const res = parseSpokenInput('ralat 85', mockStudents, 0);
            expect(res).toEqual({
                type: 'correction',
                score: 85,
                rawText: 'ralat 85',
            });

            const res2 = parseSpokenInput('ganti sembilan puluh', mockStudents, 0);
            expect(res2).toEqual({
                type: 'correction',
                score: 90,
                rawText: 'ganti sembilan puluh',
            });

            const res3 = parseSpokenInput('ralat nomor 2 85', mockStudents, 0);
            expect(res3).toEqual({
                type: 'correction',
                studentIndex: 1,
                score: 85,
                rawText: 'ralat nomor 2 85',
            });
        });

        it('does not falsely trigger stop on "Nilai Ahmad sudah 85"', () => {
            const res = parseSpokenInput('Nilai Ahmad Fauzi sudah 85', mockStudents, 0);
            expect(res).not.toEqual({ type: 'command', command: 'stop' });
            expect(res).toEqual({
                type: 'name_grade',
                studentId: 's-1',
                studentName: 'Ahmad Fauzi',
                studentIndex: 0,
                score: 85,
                rawText: 'Nilai Ahmad Fauzi sudah 85',
            });
        });

        it('detects jumping to student by name alone', () => {
            const res = parseSpokenInput('Citra Dewi', mockStudents, 0);
            expect(res).toEqual({
                type: 'jump_to_student',
                studentIndex: 2,
                rawText: 'Citra Dewi',
            });

            const res2 = parseSpokenInput('ke Ahmad Fauzi', mockStudents, 0);
            expect(res2).toEqual({
                type: 'jump_to_student',
                studentIndex: 0,
                rawText: 'ke Ahmad Fauzi',
            });
        });

        it('returns none for ambient chatter', () => {
            const res = parseSpokenInput('selamat pagi bapak ibu sekalian', mockStudents, 0);
            expect(res).toEqual({ type: 'none' });
        });
    });

    describe('parseNameAndGradeSpeech', () => {
        const mockStudents = [
            { id: 's-1', name: 'Ahmad Fauzi' },
            { id: 's-2', name: 'Budi Santoso' },
            { id: 's-3', name: 'Citra Dewi' },
            { id: 's-4', name: 'Siti Rahma' },
        ];

        it('parses continuous name and score pairs separated by punctuation or words', () => {
            const transcript = 'Ahmad Fauzi 85, Budi delapan puluh lima, Siti Rahma sembilan puluh';
            const results = parseNameAndGradeSpeech(transcript, mockStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 's-1',
                studentName: 'Ahmad Fauzi',
                score: 85,
            });
            expect(results[1]).toMatchObject({
                studentId: 's-2',
                studentName: 'Budi Santoso',
                score: 85,
            });
            expect(results[2]).toMatchObject({
                studentId: 's-4',
                studentName: 'Siti Rahma',
                score: 90,
            });
        });

        it('handles "dan" as separator', () => {
            const transcript = 'Citra Dewi seratus dan Budi Santoso tujuh lima';
            const results = parseNameAndGradeSpeech(transcript, mockStudents);

            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                studentId: 's-3',
                score: 100,
            });
            expect(results[1]).toMatchObject({
                studentId: 's-2',
                score: 75,
            });
        });

        it('parses batch dictation by attendance/roll number (e.g. "absen 1 85, absen 2 90, absen 3 75")', () => {
            const transcript = 'absen 1 85, absen 2 90, absen 3 75';
            const results = parseNameAndGradeSpeech(transcript, mockStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 's-1',
                studentName: 'Ahmad Fauzi',
                score: 85,
                rollNumber: 1,
                matchType: 'roll_number',
            });
            expect(results[1]).toMatchObject({
                studentId: 's-2',
                studentName: 'Budi Santoso',
                score: 90,
                rollNumber: 2,
                matchType: 'roll_number',
            });
            expect(results[2]).toMatchObject({
                studentId: 's-3',
                studentName: 'Citra Dewi',
                score: 75,
                rollNumber: 3,
                matchType: 'roll_number',
            });
        });

        it('parses continuous spoken attendance numbers without commas', () => {
            const transcript = 'absen 1 85 absen 2 90 nomor 3 75';
            const results = parseNameAndGradeSpeech(transcript, mockStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 's-1',
                score: 85,
                rollNumber: 1,
            });
            expect(results[1]).toMatchObject({
                studentId: 's-2',
                score: 90,
                rollNumber: 2,
            });
            expect(results[2]).toMatchObject({
                studentId: 's-3',
                score: 75,
                rollNumber: 3,
            });
        });

        it('parses mixed dictation containing both student names and attendance numbers', () => {
            const transcript = 'Ahmad Fauzi 85, absen 2 sembilan puluh, Citra Dewi 88';
            const results = parseNameAndGradeSpeech(transcript, mockStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 's-1',
                score: 85,
                matchType: 'name',
            });
            expect(results[1]).toMatchObject({
                studentId: 's-2',
                score: 90,
                matchType: 'roll_number',
            });
            expect(results[2]).toMatchObject({
                studentId: 's-3',
                score: 88,
                matchType: 'name',
            });
        });

        it('parses short notation "1 85, 2 90, 3 75"', () => {
            const transcript = '1 85, 2 90, 3 75';
            const results = parseNameAndGradeSpeech(transcript, mockStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 's-1',
                score: 85,
                rollNumber: 1,
            });
            expect(results[1]).toMatchObject({
                studentId: 's-2',
                score: 90,
                rollNumber: 2,
            });
            expect(results[2]).toMatchObject({
                studentId: 's-3',
                score: 75,
                rollNumber: 3,
            });
        });
    });

    describe('parseAttendanceNumberAndScore compound prefixes', () => {
        it('supports compound roll prefixes like "nomor absen", "absen ke", "no 2 8 5"', () => {
            expect(parseAttendanceNumberAndScore('nomor absen 2 85', 30)).toEqual({
                studentIndex: 1,
                score: 85,
            });
            expect(parseAttendanceNumberAndScore('absen ke 3 nilainya 80', 30)).toEqual({
                studentIndex: 2,
                score: 80,
            });
            expect(parseAttendanceNumberAndScore('no 2 8 5', 30)).toEqual({
                studentIndex: 1,
                score: 85,
            });
            expect(parseAttendanceNumberAndScore('nomor urut 5 dapat 90', 30)).toEqual({
                studentIndex: 4,
                score: 90,
            });
        });
    });

    describe('parseAttendanceJump variations', () => {
        it('supports jump commands with compound prefixes, ordinals, and fillers', () => {
            expect(parseAttendanceJump('nomor absen 5', 30)).toEqual({ studentIndex: 4 });
            expect(parseAttendanceJump('absen ke 8', 30)).toEqual({ studentIndex: 7 });
            expect(parseAttendanceJump('ke absen 3', 30)).toEqual({ studentIndex: 2 });
            expect(parseAttendanceJump('absen 5 aja', 30)).toEqual({ studentIndex: 4 });
            expect(parseAttendanceJump('absen pertama', 30)).toEqual({ studentIndex: 0 });
            expect(parseAttendanceJump('absen terakhir', 30)).toEqual({ studentIndex: 29 });
            expect(parseAttendanceJump('ke awal', 30)).toEqual({ studentIndex: 0 });
            expect(parseAttendanceJump('ke akhir', 30)).toEqual({ studentIndex: 29 });
        });
    });

    describe('Mode Bebas real-world student dictation (MI Al Irsyad & Madrasah names)', () => {
        const realStudents = [
            { id: 'std-2', name: 'ADZKIYAH HAURA AL SASABILA' },
            { id: 'std-3', name: 'AIYRA AZZAHWA ANANTA PUTRI' },
            { id: 'std-4', name: 'ALI ZEYHAN ARASTYA' },
            { id: 'std-5', name: 'MUHAMMAD RIZKY PRATAMA' },
            { id: 'std-6', name: 'MUHAMMAD FARHAN HABIBI' },
        ];

        it('normalizes Indonesian and Arabic transliterated phonetics', () => {
            expect(normalizeIndonesianPhonetic('Adzkiyah')).toBe('azkia');
            expect(normalizeIndonesianPhonetic('Azkiya')).toBe('azkia');
            expect(normalizeIndonesianPhonetic('Adzkia')).toBe('azkia');
            expect(normalizeIndonesianPhonetic('Aiyra')).toBe('aira');
            expect(normalizeIndonesianPhonetic('Aira')).toBe('aira');
            expect(normalizeIndonesianPhonetic('Ayra')).toBe('aira');
            expect(normalizeIndonesianPhonetic('Zeyhan')).toBe('zehan');
            expect(normalizeIndonesianPhonetic('Zehan')).toBe('zehan');
            expect(normalizeIndonesianPhonetic('Azzahwa')).toBe('azahwa');
            expect(normalizeIndonesianPhonetic('Devi')).toBe('devi');
            expect(normalizeIndonesianPhonetic('Vivi')).toBe('vivi');
            expect(levenshteinSimilarity('salsabila', 'sasabila')).toBeGreaterThan(0.8);
        });

        it('matches Google Speech phonetic variations for MI Al Irsyad students', () => {
            // "azkiya 85"
            const res1 = parseNameAndGradeSpeech('azkiya 85', realStudents);
            expect(res1).toHaveLength(1);
            expect(res1[0].studentId).toBe('std-2');
            expect(res1[0].score).toBe(85);

            // "adzkia 85"
            const res1b = parseNameAndGradeSpeech('adzkia 85', realStudents);
            expect(res1b).toHaveLength(1);
            expect(res1b[0].studentId).toBe('std-2');

            // "aira 90"
            const res2 = parseNameAndGradeSpeech('aira 90', realStudents);
            expect(res2).toHaveLength(1);
            expect(res2[0].studentId).toBe('std-3');
            expect(res2[0].score).toBe(90);

            // "zehan 80"
            const res3 = parseNameAndGradeSpeech('zehan 80', realStudents);
            expect(res3).toHaveLength(1);
            expect(res3[0].studentId).toBe('std-4');
            expect(res3[0].score).toBe(80);
        });

        it('matches single call-names / nicknames without length penalties', () => {
            // "Haura 85"
            const res1 = parseNameAndGradeSpeech('Haura 85', realStudents);
            expect(res1).toHaveLength(1);
            expect(res1[0].studentId).toBe('std-2');
            expect(res1[0].score).toBe(85);

            // "Zahwa 90"
            const res2 = parseNameAndGradeSpeech('Zahwa 90', realStudents);
            expect(res2).toHaveLength(1);
            expect(res2[0].studentId).toBe('std-3');
            expect(res2[0].score).toBe(90);

            // "Zeyhan 80"
            const res3 = parseNameAndGradeSpeech('Zeyhan 80', realStudents);
            expect(res3).toHaveLength(1);
            expect(res3[0].studentId).toBe('std-4');
            expect(res3[0].score).toBe(80);

            // "Sasabila 85"
            const res4 = parseNameAndGradeSpeech('Sasabila 85', realStudents);
            expect(res4).toHaveLength(1);
            expect(res4[0].studentId).toBe('std-2');

            // Popular colloquial spelling "Salsabila 85"
            const res5 = parseNameAndGradeSpeech('Salsabila 85', realStudents);
            expect(res5).toHaveLength(1);
            expect(res5[0].studentId).toBe('std-2');
            expect(res5[0].score).toBe(85);
        });

        it('splits raw continuous transcripts into segment chunks using splitContinuousSpeech', () => {
            const raw = 'Adzkiyah 85 Aiyra 90 Ali 80';
            const segments = splitContinuousSpeech(raw, realStudents.length);
            expect(segments).toEqual(['Adzkiyah 85', 'Aiyra 90', 'Ali 80']);
        });

        it('correctly segments continuous speech without any commas', () => {
            const transcript = 'Adzkiyah 85 Aiyra 90 Ali 80';
            const results = parseNameAndGradeSpeech(transcript, realStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 'std-2',
                score: 85,
            });
            expect(results[1]).toMatchObject({
                studentId: 'std-3',
                score: 90,
            });
            expect(results[2]).toMatchObject({
                studentId: 'std-4',
                score: 80,
            });
        });

        it('correctly segments continuous speech with phonetic transcriptions', () => {
            const transcript = 'azkiya 85 aira 90 zehan 80';
            const results = parseNameAndGradeSpeech(transcript, realStudents);

            expect(results).toHaveLength(3);
            expect(results[0].studentId).toBe('std-2');
            expect(results[0].score).toBe(85);
            expect(results[1].studentId).toBe('std-3');
            expect(results[1].score).toBe(90);
            expect(results[2].studentId).toBe('std-4');
            expect(results[2].score).toBe(80);
        });

        it('correctly segments continuous speech with spoken number phrases', () => {
            const transcript = 'Adzkiyah delapan puluh lima Aiyra sembilan puluh Ali delapan puluh';
            const results = parseNameAndGradeSpeech(transcript, realStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentId: 'std-2',
                score: 85,
            });
            expect(results[1]).toMatchObject({
                studentId: 'std-3',
                score: 90,
            });
            expect(results[2]).toMatchObject({
                studentId: 'std-4',
                score: 80,
            });
        });

        it('handles continuous short roll dictation without commas', () => {
            const transcript = '1 85 2 90 3 75';
            const results = parseNameAndGradeSpeech(transcript, realStudents);

            expect(results).toHaveLength(3);
            expect(results[0]).toMatchObject({
                studentIndex: 0,
                score: 85,
            });
            expect(results[1]).toMatchObject({
                studentIndex: 1,
                score: 90,
            });
            expect(results[2]).toMatchObject({
                studentIndex: 2,
                score: 75,
            });
        });

        it('handles filler words and conversational particles in name dictation', () => {
            const transcript = 'Adzkiyah nilainya 85 terus Aiyra dapat 90';
            const results = parseNameAndGradeSpeech(transcript, realStudents);

            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                studentId: 'std-2',
                score: 85,
            });
            expect(results[1]).toMatchObject({
                studentId: 'std-3',
                score: 90,
            });
        });

        it('flags ambiguity when multiple students share the called name token', () => {
            const match = findStudentMatch('Muhammad', realStudents);
            expect(match.isAmbiguous).toBe(true);
            expect(match.candidates?.length).toBeGreaterThanOrEqual(2);

            const matchSpecific = findStudentMatch('Muhammad Rizky', realStudents);
            expect(matchSpecific.isAmbiguous).toBeFalsy();
            expect(matchSpecific.studentId).toBe('std-5');
        });
    });
});
