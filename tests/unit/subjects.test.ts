import { describe, it, expect } from 'vitest';
import { SUBJECTS, toCanonicalSubject, mergeSubjectLists } from '../../src/constants/subjects';

describe('toCanonicalSubject', () => {
    it('menyeragamkan varian kapitalisasi', () => {
        expect(toCanonicalSubject('BAHASA INDONESIA')).toBe('Bahasa Indonesia');
        expect(toCanonicalSubject('matematika')).toBe('Matematika');
        expect(toCanonicalSubject('MATEMATIKA')).toBe('Matematika');
    });

    it('menyeragamkan singkatan yang pernah masuk ke database', () => {
        expect(toCanonicalSubject('B INDO')).toBe('Bahasa Indonesia');
        expect(toCanonicalSubject('MATE')).toBe('Matematika');
        expect(toCanonicalSubject('SB')).toBe('Seni Budaya');
        expect(toCanonicalSubject('BARAB')).toBe('Bahasa Arab');
        expect(toCanonicalSubject('QURDIST')).toBe("Qur'an Hadits");
    });

    it('menerapkan keputusan penamaan resmi', () => {
        expect(toCanonicalSubject('TIK')).toBe('Informatika');
        expect(toCanonicalSubject('Akidah')).toBe('Akidah Akhlak');
        expect(toCanonicalSubject('PPKn')).toBe('Pancasila');
    });

    it('memetakan peran asisten ke mapel induknya', () => {
        expect(toCanonicalSubject('ASS TIK')).toBe('Informatika');
        expect(toCanonicalSubject('AS PJOK')).toBe('PJOK');
        expect(toCanonicalSubject('ASS PJOK')).toBe('PJOK');
    });

    it('merapikan spasi berlebih', () => {
        expect(toCanonicalSubject('  Fiqih  ')).toBe('Fikih');
        expect(toCanonicalSubject('  Matematika ')).toBe('Matematika');
    });

    it('meloloskan mapel baru apa adanya supaya sekolah tidak terkunci', () => {
        expect(toCanonicalSubject('Robotika')).toBe('Robotika');
        expect(toCanonicalSubject('Tahfidz')).toBe('Tahfidz');
    });

    it('menangani nilai kosong tanpa error', () => {
        expect(toCanonicalSubject('')).toBe('');
        expect(toCanonicalSubject(null)).toBe('');
        expect(toCanonicalSubject(undefined)).toBe('');
        expect(toCanonicalSubject('   ')).toBe('');
    });

    it('bersifat idempoten — nama kanonik tetap utuh', () => {
        SUBJECTS.forEach((subject) => {
            expect(toCanonicalSubject(subject)).toBe(subject);
        });
    });
});

describe('mergeSubjectLists', () => {
    it('tidak memunculkan mapel yang sama dua kali karena beda ejaan', () => {
        const hasil = mergeSubjectLists(['MATEMATIKA', 'B INDO'], SUBJECTS);
        expect(hasil.filter((s) => s === 'Matematika')).toHaveLength(1);
        expect(hasil.filter((s) => s === 'Bahasa Indonesia')).toHaveLength(1);
    });

    it('mendahulukan mapel yang ditugaskan ke guru', () => {
        const hasil = mergeSubjectLists(['PJOK'], SUBJECTS);
        expect(hasil[0]).toBe('PJOK');
    });

    it('membuang entri kosong', () => {
        expect(mergeSubjectLists(['', '   '], [])).toEqual([]);
    });

    it('menggabungkan daftar kosong tanpa error', () => {
        expect(mergeSubjectLists([], [])).toEqual([]);
        expect(mergeSubjectLists(SUBJECTS)).toEqual(SUBJECTS);
    });
});

describe('SUBJECTS', () => {
    it('tidak memuat nama yang sudah digantikan', () => {
        expect(SUBJECTS).not.toContain('TIK');
        expect(SUBJECTS).not.toContain('Akidah');
    });

    it('memuat nama resmi hasil keputusan penamaan', () => {
        expect(SUBJECTS).toContain('Informatika');
        expect(SUBJECTS).toContain('Akidah Akhlak');
        expect(SUBJECTS).toContain('Pendidikan Karakter');
    });

    it('tidak punya duplikat', () => {
        expect(new Set(SUBJECTS).size).toBe(SUBJECTS.length);
    });
});
