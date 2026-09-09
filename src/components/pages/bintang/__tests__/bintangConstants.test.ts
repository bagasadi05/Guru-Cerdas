import { describe, it, expect } from 'vitest';
import {
    classifyViolationCluster,
    generateContextualHomeroomNote,
    generateHomeroomNote,
    type StudentViolationSummaryItem,
} from '../bintangConstants';

describe('classifyViolationCluster', () => {
    it('should classify time-related violations into WAKTU', () => {
        const violations: StudentViolationSummaryItem[] = [
            { description: 'Terlambat masuk sekolah' },
            { description: 'Terlambat masuk setelah istirahat' },
        ];
        const result = classifyViolationCluster(violations);
        expect(result.primaryCluster).toBe('WAKTU');
        expect(result.timeCount).toBe(2);
    });

    it('should classify appearance-related violations into KERAPIAN', () => {
        const violations: StudentViolationSummaryItem[] = [
            { description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)' },
            { description: 'Tidak bersepatu hitam dan berkaos kaki putih' },
        ];
        const result = classifyViolationCluster(violations);
        expect(result.primaryCluster).toBe('KERAPIAN');
        expect(result.appearanceCount).toBe(2);
    });

    it('should classify classroom behavior into KBM_FOKUS', () => {
        const violations: StudentViolationSummaryItem[] = [
            { description: 'Tidak memperhatikan saat KBM' },
            { description: 'Bermain di jam pelajaran' },
        ];
        const result = classifyViolationCluster(violations);
        expect(result.primaryCluster).toBe('KBM_FOKUS');
        expect(result.kbmCount).toBe(2);
    });

    it('should classify courtesy/speech violations into ADAB_ETIKA', () => {
        const violations: StudentViolationSummaryItem[] = [
            { description: 'Berkata kotor' },
            { description: 'Membuang sampah sembarangan' },
        ];
        const result = classifyViolationCluster(violations);
        expect(result.primaryCluster).toBe('ADAB_ETIKA');
        expect(result.adabCount).toBe(2);
    });

    it('should return UMUM when violations list is empty', () => {
        const result = classifyViolationCluster([]);
        expect(result.primaryCluster).toBe('UMUM');
    });
});

describe('generateContextualHomeroomNote', () => {
    it('should generate praise note for student with 0 violations and all A', () => {
        const note = generateContextualHomeroomNote({
            studentName: 'Ahmad Fauzi',
            adabGrade: 'A',
            kedisGrade: 'A',
            kerapianGrade: 'A',
            violations: [],
            activePoints: 0,
        });

        expect(note).toContain('Ananda Ahmad Fauzi');
        expect(note).toMatch(/(keteladanan|karakter|akhlak|istiqamah)/i);
        expect(note).toMatch(/(mempertahankan|uswah hasanah|tata tertib)/i);
    });

    it('should acknowledge active quiz points when student has positive active points', () => {
        const note = generateContextualHomeroomNote({
            studentName: 'Siti Rahma',
            adabGrade: 'A',
            kedisGrade: 'A',
            kerapianGrade: 'A',
            violations: [],
            activePoints: 12,
        });

        expect(note).toContain('Ananda Siti Rahma');
        expect(note).toContain('+12 poin keaktifan');
        expect(note).toMatch(/(antusiasme|partisipasi aktif|bersemangat)/i);
    });

    it('should give contextual time management advice for tardiness violations', () => {
        const note = generateContextualHomeroomNote({
            studentName: 'Budi Santoso',
            adabGrade: 'A',
            kedisGrade: 'B',
            kerapianGrade: 'A',
            violations: [
                { description: 'Terlambat masuk sekolah' },
            ],
            activePoints: 0,
        });

        expect(note).toContain('Ananda Budi Santoso');
        expect(note).toMatch(/(manajemen waktu|tepat waktu|hadir di madrasah)/i);
    });

    it('should give contextual appearance advice for uniform/attribute violations', () => {
        const note = generateContextualHomeroomNote({
            studentName: 'Dewi Lestari',
            adabGrade: 'A',
            kedisGrade: 'A',
            kerapianGrade: 'B',
            violations: [
                { description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)' },
            ],
            activePoints: 0,
        });

        expect(note).toContain('Ananda Dewi Lestari');
        expect(note).toMatch(/(atribut|seragam|rapi)/i);
    });

    it('should call for intensive collaboration with parents when student has grade D or multiple violations', () => {
        const note = generateContextualHomeroomNote({
            studentName: 'Doni Pratama',
            adabGrade: 'D',
            kedisGrade: 'C',
            kerapianGrade: 'B',
            violations: [
                { description: 'Keluar masuk ruang tanpa izin guru' },
                { description: 'Tidak patuh pada instruksi guru/petugas' },
                { description: 'Berkata kotor' },
            ],
            activePoints: 0,
        });

        expect(note).toContain('Ananda Doni Pratama');
        expect(note).toMatch(/(perhatian serius|memperbaiki|bimbingan (Bapak\/Ibu|Ayah\/Bunda)|sinergi)/i);
    });

    it('should produce deterministic variations with different seeds/names', () => {
        const noteA = generateContextualHomeroomNote({
            studentName: 'Ali bin Abi Thalib',
            adabGrade: 'A',
            kedisGrade: 'A',
            kerapianGrade: 'A',
            violations: [],
            seed: 1,
        });

        const noteB = generateContextualHomeroomNote({
            studentName: 'Umar bin Khattab',
            adabGrade: 'A',
            kedisGrade: 'A',
            kerapianGrade: 'A',
            violations: [],
            seed: 2,
        });

        expect(noteA).not.toEqual(noteB);
    });
});

describe('generateHomeroomNote (Backward Compatibility)', () => {
    it('should support legacy positional parameters', () => {
        const note = generateHomeroomNote('A', 'A', 'A', 0);
        expect(typeof note).toBe('string');
        expect(note.length).toBeGreaterThan(20);
        expect(note).toContain('Ananda');
    });

    it('should support legacy positional parameters with active points and context extension', () => {
        const note = generateHomeroomNote('B', 'A', 'C', 5, {
            studentName: 'Fajar',
            violations: [{ description: 'Terlambat masuk sekolah' }],
        });
        expect(note).toContain('Ananda Fajar');
        expect(note).toContain('+5 poin keaktifan');
        expect(note).toMatch(/(manajemen waktu|tepat waktu)/i);
    });

    it('should support object parameter signature directly', () => {
        const note = generateHomeroomNote({
            studentName: 'Zaid',
            adabGrade: 'A',
            kedisGrade: 'A',
            kerapianGrade: 'A',
        });
        expect(note).toContain('Ananda Zaid');
    });

    it('should generate different notes across different months for the same student and grades (US-9)', () => {
        const noteMonth1 = generateContextualHomeroomNote({
            studentName: 'Umar',
            adabGrade: 'B',
            kedisGrade: 'B',
            kerapianGrade: 'B',
            violations: [],
            month: '2026-08',
        });

        const noteMonth2 = generateContextualHomeroomNote({
            studentName: 'Umar',
            adabGrade: 'B',
            kedisGrade: 'B',
            kerapianGrade: 'B',
            violations: [],
            month: '2026-09',
        });

        expect(typeof noteMonth1).toBe('string');
        expect(typeof noteMonth2).toBe('string');
        // Notes should vary due to month-aware seed
        expect(noteMonth1).not.toEqual(noteMonth2);
    });

    it('should properly generate notes for mixed average profile (Adab B, Kedisiplinan C, Kerapian C)', () => {
        const note = generateContextualHomeroomNote({
            studentName: 'Aliyah',
            adabGrade: 'B',
            kedisGrade: 'C',
            kerapianGrade: 'C',
            violations: [
                { description: 'Terlambat masuk sekolah' },
                { description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)' },
            ],
            month: '2026-09',
        });

        expect(note).toContain('Ananda Aliyah');
        expect(note.length).toBeGreaterThan(50);
    });
});
