import { describe, it, expect } from 'vitest';
import { validateSingleGrade, calculateGradeStats, GradeEntry } from '../../src/utils/gradeValidator';

/**
 * Cerminan normalizeScoreInput() di BulkGradeInputPage.
 *
 * Perilaku yang dijaga: teks disimpan apa adanya selama mengetik, pembulatan
 * dan clamp 0-100 baru berjalan saat input kehilangan fokus. Versi lama
 * mem-parseFloat setiap ketikan, sehingga "77." langsung jadi 77 dan titik
 * desimalnya tertelan — nilai 77.5 mustahil diketik manual.
 */
const normalizeScoreInput = (value: number | string): number | '' => {
    if (value === '') return '';
    const num = parseFloat(String(value).replace(',', '.'));
    if (!Number.isFinite(num)) return '';
    const rounded = Math.round(num * 100) / 100;
    return Math.min(100, Math.max(0, rounded));
};

const sanitizeTyping = (value: string) => value.replace(/[^0-9.,]/g, '');

describe('pengetikan nilai desimal', () => {
    it('mempertahankan titik desimal yang belum selesai diketik', () => {
        // Inilah bug-nya: tiap karakter harus lolos utuh sampai blur.
        expect(sanitizeTyping('7')).toBe('7');
        expect(sanitizeTyping('77')).toBe('77');
        expect(sanitizeTyping('77.')).toBe('77.');
        expect(sanitizeTyping('77.5')).toBe('77.5');
    });

    it('menghasilkan nilai desimal yang benar setelah blur', () => {
        expect(normalizeScoreInput('77.5')).toBe(77.5);
        expect(normalizeScoreInput('88.25')).toBe(88.25);
    });

    it('menerima koma sebagai pemisah desimal', () => {
        expect(normalizeScoreInput('77,5')).toBe(77.5);
    });

    it('merapikan input setengah jadi saat blur', () => {
        expect(normalizeScoreInput('77.')).toBe(77);
        expect(normalizeScoreInput('77,')).toBe(77);
    });

    it('membuang karakter non-angka saat mengetik', () => {
        expect(sanitizeTyping('8a5')).toBe('85');
        expect(sanitizeTyping('-90')).toBe('90');
    });

    it('membulatkan ke 2 desimal agar lolos validasi', () => {
        expect(normalizeScoreInput('77.456')).toBe(77.46);
        expect(validateSingleGrade(normalizeScoreInput('77.456')).isValid).toBe(true);
    });

    it('mengunci nilai ke rentang 0-100', () => {
        expect(normalizeScoreInput('150')).toBe(100);
        expect(normalizeScoreInput('1000')).toBe(100);
    });

    it('mengosongkan input yang tidak bisa jadi angka', () => {
        expect(normalizeScoreInput('')).toBe('');
        expect(normalizeScoreInput('.')).toBe('');
        expect(normalizeScoreInput(',')).toBe('');
    });
});

describe('perhitungan statistik dengan nilai bertipe string', () => {
    it('tetap benar walau skor masih berupa teks saat mengetik', () => {
        const grades: GradeEntry[] = [
            { studentId: '1', studentName: 'A', score: '80' },
            { studentId: '2', studentName: 'B', score: 90 },
            { studentId: '3', studentName: 'C', score: '' },
        ];
        const stats = calculateGradeStats(grades, 75);
        expect(stats.count).toBe(2);
        expect(stats.average).toBe(85);
        expect(stats.aboveKkmCount).toBe(2);
    });
});
