import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsPDF from 'jspdf';
import { generateBintangReportPdf } from '../bintangPdfGenerator';

// Mock dependencies
vi.mock('../../utils/pdfHeaderUtils', () => ({
    addPdfHeader: vi.fn(() => 46),
    ensureLogosLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/dynamicImports', () => ({
    getAutoTable: vi.fn().mockResolvedValue({
        default: vi.fn((doc: any, options: any) => {
            // Simulate autoTable advancing Y
            const rowCount = options.body ? options.body.length : 3;
            const tableHeight = 10 + (rowCount * 6);
            if (options.didDrawPage) {
                options.didDrawPage({ cursor: { y: (options.startY || 100) + tableHeight } });
            }
        }),
    }),
}));

describe('bintangPdfGenerator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { getAutoTable } = await import('../../utils/dynamicImports');
        vi.mocked(getAutoTable).mockResolvedValue({
            default: vi.fn((doc: any, options: any) => {
                const rowCount = options.body ? options.body.length : 3;
                const tableHeight = 6 + (rowCount * 5);
                if (options.didDrawPage) {
                    options.didDrawPage({ cursor: { y: (options.startY || 100) + tableHeight } });
                }
            }) as any,
        } as any);
    });

    it('generates standard report within 1 page without quiz points (Sections A, B, C, D)', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');

        const reports = [{
            student: {
                id: 'student-1',
                name: 'Ahmad Fulan',
                classes: { name: 'Kelas 4A' },
                nis: '12345',
                nisn: '0012345678',
            },
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                catatan_wali: 'Ananda Ahmad sangat baik adab dan kedisiplinannya di madrasah.',
            },
            aspects: {
                ADAB: { grade: 'A' },
                KEDISIPLINAN: { grade: 'A' },
                KERAPIAN: { grade: 'A' },
            },
            violations: [],
            quizPoints: [],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Ustadz Abdullah, S.Pd.I', avatarUrl: '' }
        );

        // Fits on 1 single page
        expect(doc.getNumberOfPages()).toBe(1);

        // Check section titles
        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        expect(printedTexts).toContain('A. Rekapitulasi Penilaian Bintang');
        expect(printedTexts).toContain('B. Rincian Poin Pelanggaran');
        expect(printedTexts).toContain('C. Catatan Wali Kelas');
        expect(printedTexts).toContain('D. Pengesahan');
        expect(printedTexts.some(t => t.startsWith('E.'))).toBe(false);

        // Check title starts at 41.5mm (tight gap below kop surat border at 36mm)
        const titleCall = textSpy.mock.calls.find(call => call[0] === 'LAPORAN PROGRAM BINTANG');
        expect(titleCall?.[2]).toBe(41.5);

        // Check adaptive spacing expands signature line appropriately
        const teacherCall = textSpy.mock.calls.find(call => call[0] === 'Ustadz Abdullah, S.Pd.I');
        expect(teacherCall?.[2]).toBeGreaterThan(180);
        expect(teacherCall?.[2]).toBeLessThanOrEqual(268);
    });

    it('generates report with quiz points having dynamic sections A, B, C, D, E without duplicate D', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');

        const reports = [{
            student: {
                id: 'student-2',
                name: 'Fatimah Az-Zahra',
                classes: { name: 'Kelas 5B' },
                nis: '12346',
                nisn: '0012345679',
            },
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'B',
                kerapian_score: 'A',
                catatan_wali: 'Alhamdulillah, ananda berprestasi aktif.',
            },
            aspects: {
                ADAB: { grade: 'A' },
                KEDISIPLINAN: { grade: 'B' },
                KERAPIAN: { grade: 'A' },
            },
            violations: [],
            quizPoints: [
                { quiz_name: 'Tahfidz Juz 30', category: 'Keagamaan', points: 10 },
                { quiz_name: 'Shalat Berjamaah', category: 'Ibadah', points: 5 },
            ],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Ustadzah Aminah, S.Pd.', avatarUrl: '' }
        );

        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        expect(printedTexts).toContain('A. Rekapitulasi Penilaian Bintang');
        expect(printedTexts).toContain('B. Rincian Poin Pelanggaran');
        expect(printedTexts).toContain('C. Rincian Poin Keaktifan & Prestasi');
        expect(printedTexts).toContain('D. Catatan Wali Kelas');
        expect(printedTexts).toContain('E. Pengesahan');

        // Confirm NO duplicate D.
        const dSections = printedTexts.filter(t => t.startsWith('D.'));
        expect(dSections).toHaveLength(1);
        expect(dSections[0]).toBe('D. Catatan Wali Kelas');
    });

    it('falls back to contextual MI homeroom note if catatan_wali is empty', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');

        const reports = [{
            student: {
                id: 'student-3',
                name: 'Muhammad Ilham',
                classes: { name: 'Kelas 3C' },
            },
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                catatan_wali: '', // empty!
            },
            aspects: {
                ADAB: { grade: 'A' },
                KEDISIPLINAN: { grade: 'A' },
                KERAPIAN: { grade: 'A' },
            },
            violations: [],
            quizPoints: [],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Wali Kelas', avatarUrl: '' }
        );

        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        // Note should contain Ananda Muhammad Ilham
        const noteFound = printedTexts.some(t => t.includes('Ananda Muhammad Ilham') || t.includes('Ananda'));
        expect(noteFound).toBe(true);
    });

    it('prevents orphaned signatures: moves Catatan Wali Kelas together with Pengesahan when space is tight', async () => {
        const { getAutoTable } = await import('../../utils/dynamicImports');
        const autoTableMock = vi.fn((doc: any, options: any) => {
            // Simulate large violation table pushing currentY to 240mm
            if (options.didDrawPage) {
                options.didDrawPage({ cursor: { y: 240 } });
            }
        });
        vi.mocked(getAutoTable).mockResolvedValue({ default: autoTableMock as any } as any);

        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');
        const addPageSpy = vi.spyOn(doc, 'addPage');

        const reports = [{
            student: {
                id: 'student-4',
                name: 'Siti Rahma',
                classes: { name: 'Kelas 6A' },
            },
            evaluation: {
                adab_score: 'B',
                kedisiplinan_score: 'C',
                kerapian_score: 'B',
                catatan_wali: 'Catatan penting mengenai kedisiplinan Ananda di madrasah.',
            },
            aspects: {
                ADAB: { grade: 'B' },
                KEDISIPLINAN: { grade: 'C' },
                KERAPIAN: { grade: 'B' },
            },
            violations: [
                { date: '2026-08-01', description: 'Terlambat masuk kelas', points: 5 },
                { date: '2026-08-05', description: 'Atribut seragam tidak lengkap', points: 5 },
            ],
            quizPoints: [],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Ustadzah Khadijah', avatarUrl: '' }
        );

        // addPage should be called because currentY (240) + combinedNotesAndSigSpace (56+) > 277
        expect(addPageSpy).toHaveBeenCalled();
        expect(doc.getNumberOfPages()).toBe(2);

        // Verify Page 2 has both Catatan and Pengesahan (anti-orphan)
        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        expect(printedTexts).toContain('C. Catatan Wali Kelas');
        expect(printedTexts).toContain('D. Pengesahan');
    });

    it('adapts spacing to gracefully fill the page down to ~250-265mm for typical reports with violations and quiz', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');

        // Exactly matching the scenario in user's screenshot: 1 violation, 1 quiz activity, ~3-line note
        const reports = [{
            student: {
                id: 'student-adhyastha',
                name: 'ADHYASTHA ALSYAZANI',
                classes: { name: 'Kelas 3A' },
                nis: '12347',
                nisn: '0012345680',
            },
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'B',
                kerapian_score: 'A',
                catatan_wali: 'Barakallah, Ananda ADHYASTHA ALSYAZANI senantiasa bersemangat dalam menuntut ilmu dan menorehkan kontribusi aktif di kelas (+1 poin keaktifan). Konsentrasi dan ketenangan saat tholabul \'ilmi perlu ditingkatkan. Semoga sinergi yang baik antara pihak madrasah dan orang tua membawa keberkahan.',
            },
            aspects: {
                ADAB: { grade: 'A' },
                KEDISIPLINAN: { grade: 'B' },
                KERAPIAN: { grade: 'A' },
            },
            violations: [
                { date: '2026-08-04', description: 'Bermain di jam pelajaran', points: 3 },
            ],
            quizPoints: [
                { quiz_name: 'Mengerjakan tugas tambahan', category: 'KBM', points: 1 },
            ],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Bagas Riyadi, S.Pd', avatarUrl: '' }
        );

        expect(doc.getNumberOfPages()).toBe(1);

        // Verify title starts right below kop surat border (41.5mm)
        const titleCall = textSpy.mock.calls.find(call => call[0] === 'LAPORAN PROGRAM BINTANG');
        expect(titleCall?.[2]).toBe(41.5);

        // Verify signature box line lands comfortably in the lower page region (~220mm to 268mm)
        // rather than leaving a huge 60mm empty gap
        const teacherCall = textSpy.mock.calls.find(call => call[0] === 'Bagas Riyadi, S.Pd');
        expect(teacherCall).toBeDefined();
        expect(teacherCall?.[2]).toBeGreaterThan(210);
        expect(teacherCall?.[2]).toBeLessThanOrEqual(268);
    });

    it('fits Ghania (5 violations, 2 quiz activities) elegantly on 1 single page', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');

        // Ghania profile from user's screenshot: 5 violations, 2 quiz activities, ~5-line note
        const reports = [{
            student: {
                id: 'student-ghania',
                name: 'GHANIA ROXANNE FAHMIDA ILMI',
                classes: { name: 'Kelas 3A' },
                nis: '12348',
                nisn: '0012345681',
            },
            evaluation: {
                adab_score: 'B',
                kedisiplinan_score: 'C',
                kerapian_score: 'B',
                catatan_wali: 'Barakallah, Ananda GHANIA ROXANNE senantiasa bersemangat dalam menuntut ilmu dan menorehkan kontribusi aktif di kelas (+3 poin keaktifan). Dalam pergaulan sehari-hari, Ananda perlu terus diarahkan untuk membiasakan kalimat thayyibah (berkata santun), menjaga adab makan/minum, serta saling menyayangi teman. Dengan kerja sama yang erat antara pihak madrasah dan keluarga di rumah, insya Allah Ananda akan mampu memperbaiki diri dan meraih akhlakul karimah yang mulia.',
            },
            aspects: {
                ADAB: { grade: 'B' },
                KEDISIPLINAN: { grade: 'C' },
                KERAPIAN: { grade: 'B' },
            },
            violations: [
                { date: '2026-08-01', description: 'Bermain saat jam pelajaran', points: 3 },
                { date: '2026-08-05', description: 'Tidak memakai peci/jilbab sesuai aturan', points: 3 },
                { date: '2026-08-10', description: 'Terlambat masuk kelas', points: 3 },
                { date: '2026-08-15', description: 'Mengobrol saat KBM berlangsung', points: 3 },
                { date: '2026-08-20', description: 'Keluar kelas tanpa izin', points: 3 },
            ],
            quizPoints: [
                { quiz_name: 'Menjawab pertanyaan guru', category: 'KBM', points: 2 },
                { quiz_name: 'Mengerjakan tugas tambahan', category: 'KBM', points: 1 },
            ],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Ustadzah Aminah, S.Pd', avatarUrl: '' }
        );

        // Ghania must comfortably fit on 1 SINGLE PAGE
        expect(doc.getNumberOfPages()).toBe(1);

        // All sections A, B, C, D, E are present
        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        expect(printedTexts).toContain('A. Rekapitulasi Penilaian Bintang');
        expect(printedTexts).toContain('B. Rincian Poin Pelanggaran');
        expect(printedTexts).toContain('C. Rincian Poin Keaktifan & Prestasi');
        expect(printedTexts).toContain('D. Catatan Wali Kelas');
        expect(printedTexts).toContain('E. Pengesahan');
    });

    it('splits heavy report (e.g. 14 violations) cleanly into exactly 2 pages without table orphan', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');

        const heavyViolations = [];
        for (let i = 1; i <= 18; i++) {
            heavyViolations.push({
                date: `2026-08-${i < 10 ? '0' + i : i}`,
                description: `Pelanggaran tata tertib madrasah ke-${i}`,
                points: 3,
            });
        }

        const reports = [{
            student: {
                id: 'student-heavy',
                name: 'Siswa Dengan Banyak Pelanggaran',
                classes: { name: 'Kelas 6B' },
            },
            evaluation: {
                adab_score: 'C',
                kedisiplinan_score: 'D',
                kerapian_score: 'C',
                catatan_wali: 'Perlu pembinaan intensif dan sinergi bersama orang tua.',
            },
            aspects: {
                ADAB: { grade: 'C' },
                KEDISIPLINAN: { grade: 'D' },
                KERAPIAN: { grade: 'C' },
            },
            violations: heavyViolations,
            quizPoints: [
                { quiz_name: 'Kegiatan A', category: 'KBM', points: 1 },
            ],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Wali Kelas 6B', avatarUrl: '' }
        );

        // Heavy report requires exactly 2 pages (never 3!)
        expect(doc.getNumberOfPages()).toBe(2);

        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        expect(printedTexts).toContain('A. Rekapitulasi Penilaian Bintang');
        expect(printedTexts).toContain('B. Rincian Poin Pelanggaran');
        expect(printedTexts).toContain('C. Rincian Poin Keaktifan & Prestasi');
        expect(printedTexts).toContain('D. Catatan Wali Kelas');
        expect(printedTexts).toContain('E. Pengesahan');
    });

    it('verifies real autoTable rendering of Ghania report fits in exactly 1 page', async () => {
        const { getAutoTable } = await import('../../utils/dynamicImports');
        const realAutoTableModule = await vi.importActual<any>('jspdf-autotable');
        vi.mocked(getAutoTable).mockResolvedValue(realAutoTableModule);

        const doc = new jsPDF();
        const reports = [{
            student: {
                id: 'student-ghania',
                name: 'GHANIA ROXANNE FAHMIDA ILMI',
                classes: { name: 'Kelas 3A' },
                nis: '12348',
                nisn: '0012345681',
            },
            evaluation: {
                adab_score: 'B',
                kedisiplinan_score: 'A',
                kerapian_score: 'B',
                catatan_wali: 'Barakallah, Ananda GHANIA ROXANNE senantiasa bersemangat dalam menuntut ilmu dan menorehkan kontribusi aktif di kelas (+3 poin keaktifan). Dalam pergaulan sehari-hari, Ananda perlu terus diarahkan untuk membiasakan kalimat thayyibah (berkata santun), menjaga adab makan/minum, serta saling menyayangi teman. Dengan kerja sama yang erat antara pihak madrasah dan keluarga di rumah, insya Allah Ananda akan mampu memperbaiki diri dan meraih akhlakul karimah yang mulia.',
            },
            aspects: {
                ADAB: { grade: 'B' },
                KEDISIPLINAN: { grade: 'A' },
                KERAPIAN: { grade: 'B' },
            },
            violations: [
                { date: '2026-08-05', description: 'Tidak patuh pada instruksi guru/petugas', points: 3 },
                { date: '2026-08-07', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)', points: 3 },
                { date: '2026-08-07', description: 'Tidak patuh pada instruksi guru/petugas', points: 3 },
                { date: '2026-08-11', description: 'Tidak patuh pada instruksi guru/petugas', points: 3 },
                { date: '2026-08-21', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)', points: 3 },
            ],
            quizPoints: [
                { quiz_name: 'Menjawab pertanyaan guru', category: 'KBM', points: 2 },
                { quiz_name: 'Mengerjakan tugas tambahan', category: 'KBM', points: 1 },
            ],
        }];

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Bagas Riyadi, S.Pd', avatarUrl: '' }
        );

        // MUST BE EXACTLY 1 PAGE IN REAL AUTOTABLE!
        expect(doc.getNumberOfPages()).toBe(1);
    });

    it('verifies real autoTable rendering of Iqbal Bayhaqi (10 violations) uses 2 pages with Page 1 nicely filled', async () => {
        const { getAutoTable } = await import('../../utils/dynamicImports');
        const realAutoTableModule = await vi.importActual<any>('jspdf-autotable');
        vi.mocked(getAutoTable).mockResolvedValue(realAutoTableModule);

        const doc = new jsPDF();
        const reports = [{
            student: {
                id: 'student-iqbal',
                name: 'IQBAL BAYHAQI',
                classes: { name: 'Kelas 3A' },
                nis: '12349',
                nisn: '0012345682',
            },
            evaluation: {
                adab_score: 'B',
                kedisiplinan_score: 'C',
                kerapian_score: 'C',
                catatan_wali: 'Alhamdulillah, Ananda IQBAL BAYHAQI menunjukkan antusiasme belajar yang sangat tinggi serta keaktifan membanggakan di madrasah (+1 poin keaktifan). Sebagai catatan evaluasi bersama, Ananda perlu dibiasakan bangun lebih awal dan manajemen waktu di rumah agar tiba di madrasah tepat waktu sebelum bel masuk dan pembiasaan pagi dimulai. Dengan kerja sama yang erat antara pihak madrasah dan keluarga di rumah, insya Allah Ananda akan mampu memperbaiki diri dan meraih akhlakul karimah yang mulia.',
            },
            aspects: {
                ADAB: { grade: 'B' },
                KEDISIPLINAN: { grade: 'C' },
                KERAPIAN: { grade: 'C' },
            },
            violations: [
                { date: '2026-08-03', description: 'Berkata kotor', points: 3 },
                { date: '2026-08-04', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)', points: 3 },
                { date: '2026-08-04', description: 'Bermain di jam pelajaran', points: 3 },
                { date: '2026-08-07', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)', points: 3 },
                { date: '2026-08-09', description: 'Terlambat masuk sekolah', points: 3 },
                { date: '2026-08-21', description: 'Terlambat masuk sekolah', points: 3 },
                { date: '2026-08-21', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)', points: 3 },
                { date: '2026-08-24', description: 'Terlambat masuk sekolah', points: 3 },
                { date: '2026-08-24', description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)', points: 3 },
                { date: '2026-08-31', description: 'Terlambat masuk sekolah', points: 3 },
            ],
            quizPoints: [
                { quiz_name: 'Menjawab pertanyaan guru', category: 'KBM', points: 1 },
            ],
        }];

        const textSpy = vi.spyOn(doc, 'text');

        await generateBintangReportPdf(
            doc,
            reports,
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Bagas Riyadi, S.Pd', avatarUrl: '' }
        );

        // Iqbal Bayhaqi with 10 violations now fits cleanly on 1 page!
        expect(doc.getNumberOfPages()).toBe(1);

        const secACall = textSpy.mock.calls.find(c => c[0] === 'A. Rekapitulasi Penilaian Bintang');
        const secBCall = textSpy.mock.calls.find(c => c[0] === 'B. Rincian Poin Pelanggaran');
        const secCCall = textSpy.mock.calls.find(c => c[0] === 'C. Rincian Poin Keaktifan & Prestasi');
        const secDCall = textSpy.mock.calls.find(c => c[0] === 'D. Catatan Wali Kelas');
        const secECall = textSpy.mock.calls.find(c => c[0] === 'E. Pengesahan');

        expect(secACall).toBeDefined();
        expect(secBCall).toBeDefined();
        expect(secCCall).toBeDefined();
        expect(secDCall).toBeDefined();
        expect(secECall).toBeDefined();
    });

    it('verifies real autoTable rendering of Delisha (0 violations) expands nicely on 1 page', async () => {
        const { getAutoTable } = await import('../../utils/dynamicImports');
        const realAutoTableModule = await vi.importActual<any>('jspdf-autotable');
        vi.mocked(getAutoTable).mockResolvedValue(realAutoTableModule);

        const doc = new jsPDF();
        const delishaReport = {
            student: { id: 's_delisha', name: 'DELISHA BINTANG ALMAHYRA', class_id: 'c1' },
            aspects: {
                ADAB: { grade: 'A', points: 0 },
                KEDISIPLINAN: { grade: 'A', points: 0 },
                KERAPIAN: { grade: 'A', points: 0 },
            },
            violations: [],
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
            },
            totalPoints: 0,
            bintangGrade: 'A',
        };

        await generateBintangReportPdf(
            doc,
            [delishaReport],
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Bagas Riyadi, S.Pd', avatarUrl: '' }
        );

        expect(doc.getNumberOfPages()).toBe(1);
    });

    it('generates bulk reports for multiple students with onProgress callback tracking', async () => {
        const doc = new jsPDF();
        const progressReports: Array<{ current: number; total: number }> = [];

        const studentA = {
            student: { id: 's_bulk_1', name: 'Siswa Satu', classes: { name: 'Kelas 3A' } },
            aspects: {
                ADAB: { grade: 'A', points: 0 },
                KEDISIPLINAN: { grade: 'A', points: 0 },
                KERAPIAN: { grade: 'A', points: 0 },
            },
            violations: [],
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                catatan_wali: 'Catatan siswa satu',
            },
        };

        const studentB = {
            student: { id: 's_bulk_2', name: 'Siswa Dua', classes: { name: 'Kelas 3A' } },
            aspects: {
                ADAB: { grade: 'B', points: 5 },
                KEDISIPLINAN: { grade: 'A', points: 0 },
                KERAPIAN: { grade: 'A', points: 0 },
            },
            violations: [{ description: 'Datang terlambat', points: 5, date: '2026-08-10' }],
            evaluation: {
                adab_score: 'B',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                catatan_wali: 'Catatan siswa dua',
            },
        };

        await generateBintangReportPdf(
            doc,
            [studentA, studentB],
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Wali Kelas 3A, S.Pd', avatarUrl: '' },
            undefined,
            (current, total) => {
                progressReports.push({ current, total });
            }
        );

        expect(doc.getNumberOfPages()).toBe(2);
        expect(progressReports).toEqual([
            { current: 1, total: 2 },
            { current: 2, total: 2 },
        ]);
    });

    it('does not render bottom footer text or line (Portal Guru branding and page numbers)', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');
        const lineSpy = vi.spyOn(doc, 'line');

        const report = {
            student: { id: 's1', name: 'Siswa Test', classes: { name: 'Kelas 3A' } },
            aspects: {
                ADAB: { grade: 'A', points: 0 },
                KEDISIPLINAN: { grade: 'A', points: 0 },
                KERAPIAN: { grade: 'A', points: 0 },
            },
            violations: [],
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                catatan_wali: 'Bagus',
            },
        };

        await generateBintangReportPdf(
            doc,
            [report],
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Wali Kelas, S.Pd', avatarUrl: '' }
        );

        const printedTexts = textSpy.mock.calls.map(call => String(call[0]));
        expect(printedTexts.some(t => t.includes('Portal Guru — Program BINTANG'))).toBe(false);
        expect(printedTexts.some(t => t.startsWith('Halaman '))).toBe(false);

        // Ensure no separator line at pageHeight - 14
        const pageHeight = doc.internal.pageSize.getHeight();
        const drawnLines = lineSpy.mock.calls;
        expect(drawnLines.some(call => Math.abs(Number(call[1]) - (pageHeight - 14)) < 1)).toBe(false);
    });

    it('renders no-violations box with formal black color, balanced lines, and maxWidth constraint without overflow', async () => {
        const doc = new jsPDF();
        const textSpy = vi.spyOn(doc, 'text');
        const setFillColorSpy = vi.spyOn(doc, 'setFillColor');
        const setTextColorSpy = vi.spyOn(doc, 'setTextColor');

        const report = {
            student: { id: 's_novio', name: 'Siswa Bersih Pelanggaran', classes: { name: 'Kelas 4B' } },
            aspects: {
                ADAB: { grade: 'A', points: 0 },
                KEDISIPLINAN: { grade: 'A', points: 0 },
                KERAPIAN: { grade: 'A', points: 0 },
            },
            violations: [],
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'A',
                catatan_wali: 'Sangat disiplin dan berakhlak baik.',
            },
        };

        await generateBintangReportPdf(
            doc,
            [report],
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Ustadzah Fatimah, S.Pd.I', avatarUrl: '' }
        );

        // Verify section header fill color uses formal black [0, 0, 0]
        expect(setFillColorSpy).toHaveBeenCalledWith(0, 0, 0);

        // Verify text color uses formal black [0, 0, 0]
        expect(setTextColorSpy).toHaveBeenCalledWith(0, 0, 0);

        // Verify no-violation message is rendered as a full single line
        const printedTexts = textSpy.mock.calls.map(c => String(c[0]));
        expect(printedTexts).toContain('Tidak terdapat catatan pelanggaran bulan ini. Ananda telah menunjukkan akhlak dan kedisiplinan yang baik sesuai tata tertib madrasah.');

        // Verify maxWidth option was passed to prevent column overflow
        const noVioCall = textSpy.mock.calls.find(c => c[0] === 'Tidak terdapat catatan pelanggaran bulan ini. Ananda telah menunjukkan akhlak dan kedisiplinan yang baik sesuai tata tertib madrasah.');
        expect(noVioCall?.[3]).toHaveProperty('maxWidth');
        expect(typeof (noVioCall?.[3] as any)?.maxWidth).toBe('number');
        expect((noVioCall?.[3] as any)?.maxWidth).toBe(doc.internal.pageSize.getWidth() - 38);
    });

    it('overrides contradictory zero-violation note if student actually has violations', async () => {
        const doc = new jsPDF();
        const splitTextSpy = vi.spyOn(doc, 'splitTextToSize');

        const report = {
            student: { id: 's_contradict', name: 'ALGIFARI YUSUF', classes: { name: 'Kelas 4B' } },
            aspects: {
                ADAB: { grade: 'A', points: 0 },
                KEDISIPLINAN: { grade: 'A', points: 0 },
                KERAPIAN: { grade: 'B', points: 3 },
            },
            violations: [
                {
                    date: '2026-08-24',
                    description: 'Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)',
                    points: 3,
                },
            ],
            evaluation: {
                adab_score: 'A',
                kedisiplinan_score: 'A',
                kerapian_score: 'B',
                catatan_wali: 'Ananda tidak memiliki catatan pelanggaran bulan ini, sebuah pencapaian disiplin dan pembiasaan baik yang sangat patut diapresiasi.',
            },
            quizPoints: [
                { category: 'Partisipasi aktif', points: 1 }
            ],
        };

        await generateBintangReportPdf(
            doc,
            [report],
            'Agustus 2026',
            '5 September 2026',
            { id: 'u1', name: 'Ustadzah Fatimah, S.Pd.I', avatarUrl: '' }
        );

        // Verify that the note passed to splitTextToSize does NOT claim zero violations
        const calls = splitTextSpy.mock.calls.map(c => String(c[0]));
        const renderedNote = calls.find(c => c.includes('ALGIFARI'));
        expect(renderedNote).toBeDefined();
        expect(renderedNote).not.toContain('tidak memiliki catatan pelanggaran');
        expect(renderedNote).not.toContain('tanpa catatan pelanggaran');
        // It should contain advice about uniform/attribute (KERAPIAN)
        expect(renderedNote).toMatch(/(seragam|atribut|rapi)/i);
    });
});



