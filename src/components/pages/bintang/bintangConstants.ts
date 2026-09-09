import { Shield, AlertTriangle, Sparkles } from 'lucide-react';
import type { BintangGrade } from '../../../services/bintangService';

// ─── Grade Colors ──────────────────────────────────────────────────────────

export const gradeColors: Record<BintangGrade, string> = {
    A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-500/20',
    B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-500/20',
    C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-500/20',
    D: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-500/20',
};

/** Warna teks untuk badge grade (dipakai saat hanya butuh warna teks, tanpa background). */
export const gradeTextColors: Record<BintangGrade, string> = {
    A: 'text-emerald-600 dark:text-emerald-400',
    B: 'text-blue-600 dark:text-blue-400',
    C: 'text-amber-600 dark:text-amber-400',
    D: 'text-rose-600 dark:text-rose-400',
};

// ─── Aspect Metadata ────────────────────────────────────────────────────────

export const aspectMeta = {
    ADAB: { icon: Shield, label: 'Adab', color: 'text-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-200 dark:border-indigo-800' },
    KEDISIPLINAN: { icon: AlertTriangle, label: 'Kedisiplinan', color: 'text-amber-500', bgLight: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800' },
    KERAPIAN: { icon: Sparkles, label: 'Kerapian', color: 'text-teal-500', bgLight: 'bg-teal-50 dark:bg-teal-900/20', borderColor: 'border-teal-200 dark:border-teal-800' },
} as const;

// ─── Auto-Note Generators ───────────────────────────────────────────────────

// ─── Auto-Note Generators (Disesuaikan khusus untuk Madrasah Ibtidaiyah / MI) ───

export function generateAutoNote(adab: BintangGrade, kedis: BintangGrade, kerapian: BintangGrade, activePoints: number = 0) {
    let adabNote = '';
    let kedisNote = '';
    let kerapianNote = '';

    const activeBonusText = activePoints > 0 ? ` Serta sangat aktif dan bersemangat di kelas (+${activePoints} poin keaktifan).` : '';

    if (adab === 'A') adabNote = `Alhamdulillah, Ananda menunjukkan akhlakul karimah, kesantunan, dan adab islami yang sangat baik kepada ustadz/ustadzah serta teman.${activeBonusText}`;
    else if (adab === 'B') adabNote = `Secara umum adab dan kesantunan Ananda sudah baik, mari terus dibimbing agar tutur kata dan perilakunya semakin santun.${activeBonusText}`;
    else if (adab === 'C') adabNote = `Adab dan tutur kata Ananda perlu bimbingan lebih di rumah, terutama dalam menjaga sopan santun dan adab pergaulan islami di madrasah.${activeBonusText}`;
    else adabNote = `Sangat membutuhkan bimbingan intensif dari Ayah/Bunda di rumah terkait adab, sopan santun, dan pembiasaan akhlakul karimah.`;

    if (kedis === 'A') kedisNote = "Kedisiplinan Ananda di madrasah sangat tinggi, senantiasa tertib hadir tepat waktu dan khusyuk mengikuti pembiasaan pagi.";
    else if (kedis === 'B') kedisNote = "Kedisiplinan Ananda cukup baik, sesekali masih perlu diingatkan untuk konsisten mematuhi tata tertib madrasah.";
    else if (kedis === 'C') kedisNote = "Ananda masih perlu dimotivasi agar lebih disiplin waktu hadir di madrasah dan tertib saat kegiatan belajar berlangsung.";
    else kedisNote = "Tingkat kedisiplinan Ananda memerlukan perhatian dan kerja sama pengawasan yang intensif antara madrasah dan Ayah/Bunda di rumah.";

    if (kerapian === 'A') kerapianNote = "Senantiasa menjaga kebersihan, kesucian diri, serta kerapian seragam madrasah dengan sangat baik dan istiqamah.";
    else if (kerapian === 'B') kerapianNote = "Penampilan seragam sudah rapi, mohon pertahankan kelengkapan atribut seragam madrasah sesuai jadwal hari.";
    else if (kerapian === 'C') kerapianNote = "Kerapian seragam Ananda perlu dicek kembali sebelum berangkat ke madrasah agar senantiasa rapi dan lengkap.";
    else kerapianNote = "Kerapian dan kelengkapan seragam madrasah sangat perlu bimbingan dan pembiasaan rutin dari Ayah/Bunda di rumah.";

    return { adabNote, kedisNote, kerapianNote };
}

export interface StudentViolationSummaryItem {
    description: string;
    bintangAspect?: 'ADAB' | 'KEDISIPLINAN' | 'KERAPIAN';
    category?: string | null;
}

export interface HomeroomNoteContext {
    studentName?: string;
    adabGrade: BintangGrade;
    kedisGrade: BintangGrade;
    kerapianGrade: BintangGrade;
    activePoints?: number;
    violations?: StudentViolationSummaryItem[];
    seed?: number | string;
    month?: string;
}

export type ViolationCluster = 'WAKTU' | 'KERAPIAN' | 'KBM_FOKUS' | 'ADAB_ETIKA' | 'UMUM';

/** Mengklasifikasikan daftar pelanggaran menjadi klaster tematik dominan */
export function classifyViolationCluster(violations: StudentViolationSummaryItem[] = []): {
    primaryCluster: ViolationCluster;
    timeCount: number;
    appearanceCount: number;
    kbmCount: number;
    adabCount: number;
} {
    let timeCount = 0;
    let appearanceCount = 0;
    let kbmCount = 0;
    let adabCount = 0;

    for (const v of violations) {
        const text = (v.description || '').toLowerCase();
        const aspect = v.bintangAspect;
        if (text.includes('terlambat') || text.includes('waktu') || text.includes('masuk sekolah') || text.includes('istirahat')) {
            timeCount++;
        } else if (
            aspect === 'KERAPIAN' ||
            text.includes('atribut') || text.includes('bedge') || text.includes('dasi') ||
            text.includes('rompi') || text.includes('topi') || text.includes('sepatu') ||
            text.includes('kaos kaki') || text.includes('kuku') || text.includes('seragam') ||
            text.includes('rambut') || text.includes('tali pinggang')
        ) {
            appearanceCount++;
        } else if (
            text.includes('kbm') || text.includes('tidak memperhatikan') ||
            text.includes('bermain di jam') || text.includes('keluar masuk') || text.includes('bermain')
        ) {
            kbmCount++;
        } else if (
            aspect === 'ADAB' ||
            text.includes('berkata kotor') || text.includes('sopan') || text.includes('sampah') ||
            text.includes('mencoret') || text.includes('tidak patuh') || text.includes('makan')
        ) {
            adabCount++;
        } else if (aspect === 'KEDISIPLINAN') {
            timeCount++;
        }
    }

    const counts = [
        { cluster: 'WAKTU' as ViolationCluster, count: timeCount },
        { cluster: 'KERAPIAN' as ViolationCluster, count: appearanceCount },
        { cluster: 'KBM_FOKUS' as ViolationCluster, count: kbmCount },
        { cluster: 'ADAB_ETIKA' as ViolationCluster, count: adabCount },
    ];

    counts.sort((a, b) => b.count - a.count);
    const primaryCluster = counts[0].count > 0 ? counts[0].cluster : 'UMUM';

    return { primaryCluster, timeCount, appearanceCount, kbmCount, adabCount };
}

function getStudentGreeting(studentName?: string): string {
    if (!studentName || !studentName.trim()) return 'Ananda';
    const clean = studentName.trim();
    // Gunakan 1-2 kata pertama agar tetap santun, hangat, dan akrab di jenjang MI
    const parts = clean.split(/\s+/);
    const displayName = parts.length > 2 ? parts.slice(0, 2).join(' ') : clean;
    return `Ananda ${displayName}`;
}

function selectVariant<T>(variants: T[], seed: number = 0): T {
    if (variants.length === 0) return '' as unknown as T;
    const index = Math.abs(seed) % variants.length;
    return variants[index];
}

function computeStringSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/**
 * Menghasilkan catatan wali kelas yang berbobot secara pedagogis, kontekstual,
 * dan disesuaikan khusus dengan karakter, nilai, dan budaya Madrasah Ibtidaiyah (MI).
 */
export function generateContextualHomeroomNote(context: HomeroomNoteContext): string {
    const {
        studentName,
        adabGrade,
        kedisGrade,
        kerapianGrade,
        activePoints = 0,
        violations = [],
        seed: customSeed,
    } = context;

    const grades = [adabGrade, kedisGrade, kerapianGrade];
    const countA = grades.filter(g => g === 'A').length;
    const countB = grades.filter(g => g === 'B').length;
    const hasD = grades.includes('D');
    const hasC = grades.includes('C');
    const violationCount = violations.length;

    const numericSeed = typeof customSeed === 'string' ? computeStringSeed(customSeed) : customSeed;
    const seedString = studentName ? `${studentName}${context.month ? `-${context.month}` : ''}` : '';
    const seed = numericSeed ?? (seedString ? computeStringSeed(seedString) : 0);
    const greeting = getStudentGreeting(studentName);

    // ── BAGIAN 1: Apresiasi & Sapaan Awal (Nuansa Islami Madrasah Ibtidaiyah) ──
    let part1 = '';
    if (activePoints > 0) {
        const variants = [
            `Alhamdulillah, ${greeting} menunjukkan antusiasme belajar yang sangat tinggi serta keaktifan membanggakan di madrasah (+${activePoints} poin keaktifan).`,
            `Barakallah, ${greeting} senantiasa bersemangat dalam menuntut ilmu dan menorehkan kontribusi aktif di kelas (+${activePoints} poin keaktifan).`,
            `Apresiasi setinggi-tingginya untuk ${greeting} atas semangat dan partisipasi aktifnya dalam kegiatan pembelajaran di madrasah (+${activePoints} poin keaktifan).`,
        ];
        part1 = selectVariant(variants, seed);
    } else if (countA === 3 && violationCount === 0) {
        const variants = [
            `Alhamdulillah, ${greeting} menunjukkan keteladanan akhlakul karimah, kedisiplinan, dan kerapian yang sangat membanggakan di madrasah sepanjang bulan ini.`,
            `Barakallah, perkembangan adab dan karakter islami ${greeting} pada bulan ini sangat istimewa dan patut menjadi uswah hasanah bagi rekan-rekannya.`,
            `Alhamdulillah, ${greeting} senantiasa istiqamah menampilkan budi pekerti luhur dan kepatuhan penuh terhadap tata tertib madrasah.`,
        ];
        part1 = selectVariant(variants, seed);
    } else if (!hasD && !hasC && countB >= 1) {
        const variants = [
            `Alhamdulillah, perkembangan adab dan karakter ${greeting} pada bulan ini dinilai baik dan menunjukkan pembiasaan islami yang positif di madrasah.`,
            `Secara umum ${greeting} menunjukkan sikap yang santun, tertib, dan bersemangat selama beraktivitas di lingkungan madrasah.`,
            `${greeting} telah berupaya dengan baik untuk mematuhi tata tertib madrasah dan mengikuti pembiasaan ibadah dengan tertib.`,
        ];
        part1 = selectVariant(variants, seed);
    } else {
        const variants = [
            `Secara umum ${greeting} memiliki potensi dan semangat yang baik dalam mengikuti kegiatan belajar di madrasah.`,
            `${greeting} memiliki kemauan belajar yang baik dan terus berproses dalam mengasah adab serta karakternya di madrasah.`,
            `Potensi dan semangat ${greeting} di madrasah cukup baik dan insya Allah dapat terus berkembang lebih optimal dengan bimbingan bersama.`,
        ];
        part1 = selectVariant(variants, seed);
    }

    // ── BAGIAN 2: Evaluasi Obyektif Berbasis Fakta & Nilai Tarbiyah MI ─────────
    let part2 = '';
    if (violationCount === 0 && countA === 3) {
        const variants = [
            'Konsistensi Ananda dalam menjaga adab santun kepada ustadz/ustadzah dan teman, ketertiban waktu, serta kerapian seragam muslim/muslimah patut terus dipertahankan.',
            'Kemandirian, tanggung jawab, dan adab menuntut ilmu yang ditunjukkan Ananda selama di madrasah mencerminkan karakter santri cilik yang terpuji.',
            'Ananda mampu menjadi uswah hasanah (teladan yang baik) bagi teman-teman sekelas dalam menegakkan adab dan tata tertib madrasah.',
        ];
        part2 = selectVariant(variants, seed + 1);
    } else if (violationCount === 0) {
        const variants = [
            'Ananda tidak memiliki catatan pelanggaran bulan ini, sebuah pencapaian disiplin dan pembiasaan baik yang sangat patut diapresiasi.',
            'Sikap tertib dan istiqamah tanpa catatan pelanggaran membuktikan kesungguhan Ananda dalam menaati aturan madrasah.',
        ];
        part2 = selectVariant(variants, seed + 1);
    } else {
        const clusterInfo = classifyViolationCluster(violations);
        if (clusterInfo.primaryCluster === 'WAKTU') {
            const variants = [
                'Sebagai catatan evaluasi bersama, Ananda perlu dibiasakan bangun lebih awal dan manajemen waktu di rumah agar tiba di madrasah tepat waktu sebelum bel masuk dan pembiasaan pagi dimulai.',
                'Mohon bimbingan Ayah/Bunda di rumah agar Ananda dapat hadir di madrasah lebih awal, sehingga dapat mengikuti kegiatan pembiasaan pagi dan doa bersama dengan tenang.',
            ];
            part2 = selectVariant(variants, seed + 2);
        } else if (clusterInfo.primaryCluster === 'KERAPIAN') {
            const variants = [
                'Sebagai catatan pembiasaan, mohon dibiasakan untuk memeriksa kelengkapan atribut seragam madrasah (peci/jilbab, dasi, ikat pinggang, dan sepatu) pada malam sebelumnya agar penampilannya senantiasa rapi dan syar\'i.',
                'Perlu perhatian lebih pada kerapian diri dan kelengkapan atribut seragam madrasah sesuai jadwal hari yang telah ditentukan.',
            ];
            part2 = selectVariant(variants, seed + 2);
        } else if (clusterInfo.primaryCluster === 'KBM_FOKUS') {
            const variants = [
                'Di dalam kelas, Ananda perlu terus dimotivasi agar lebih khusyuk dan tertib menyimak penjelasan ustadz/ustadzah serta membatasi bermain saat jam pelajaran berlangsung.',
                'Konsentrasi dan ketenangan saat tholabul \'ilmi (menuntut ilmu) perlu ditingkatkan agar Ananda dapat menyerap materi pelajaran dengan optimal.',
            ];
            part2 = selectVariant(variants, seed + 2);
        } else if (clusterInfo.primaryCluster === 'ADAB_ETIKA') {
            const variants = [
                'Dalam pergaulan sehari-hari, Ananda perlu terus diarahkan untuk membiasakan kalimat thayyibah (berkata santun), menjaga adab makan/minum, serta saling menyayangi teman.',
                'Penanaman adab islami dan tutur kata santun perlu terus dibiasakan di rumah dan madrasah agar Ananda senantiasa mencerminkan pribadi berakhlakul karimah.',
            ];
            part2 = selectVariant(variants, seed + 2);
        } else if (hasD) {
            part2 = 'Terdapat catatan kedisiplinan dan adab yang memerlukan perhatian khusus serta bimbingan intensif agar Ananda dapat memperbaiki sikap dan lebih menghormati tata tertib madrasah.';
        } else if (hasC) {
            part2 = 'Terdapat beberapa catatan kedisiplinan ringan yang perlu dievaluasi bersama agar pembiasaan tertib Ananda di madrasah semakin meningkat ke depannya.';
        } else {
            part2 = 'Terdapat sedikit catatan ketertiban yang perlu diperbaiki agar pembiasaan disiplin Ananda di madrasah semakin sempurna.';
        }
    }

    // ── BAGIAN 3: Harapan, Doa & Kemitraan Orang Tua (Khas Madrasah) ───────────
    let part3 = '';
    if (countA === 3 && violationCount === 0) {
        const variants = [
            'Semoga Ananda senantiasa istiqamah menjadi anak yang sholeh/sholehah, berbakti kepada orang tua, berakhlak mulia, dan ilmunya berkah bermanfaat. Aamiin.',
            'Jazakumullah khairan kepada Ayah/Bunda di rumah atas kerja sama yang luar biasa dalam membimbing Ananda hingga meraih capaian akhlak yang sangat membanggakan ini.',
            'Mohon terus didoakan dan didampingi agar Ananda tumbuh menjadi generasi qur\'ani yang cerdas, santun, dan membanggakan keluarga serta madrasah.',
        ];
        part3 = selectVariant(variants, seed + 3);
    } else if (hasD || violationCount >= 3) {
        const variants = [
            'Kami sangat memohon sinergi dan pendampingan penuh kasih dari Ayah/Bunda di rumah untuk bersama-sama membimbing Ananda. Insya Allah dengan doa dan bimbingan bersama, Ananda akan mampu tumbuh menjadi anak yang semakin baik dan sholeh/sholehah.',
            'Dengan kerja sama yang erat antara pihak madrasah dan Ayah/Bunda di rumah, insya Allah Ananda akan mampu memperbaiki diri dan meraih akhlakul karimah yang mulia.',
        ];
        part3 = selectVariant(variants, seed + 3);
    } else {
        const variants = [
            'Mohon terus dampingi dan motivasi Ananda di rumah. Semoga Allah SWT senantiasa menganugerahkan kemudahan, kepahaman ilmu, serta keberkahan bagi tumbuh kembang Ananda. Aamiin.',
            'Semoga sinergi yang baik antara pihak madrasah dan Ayah/Bunda di rumah senantiasa membawa keberkahan dalam membentuk generasi yang berilmu dan berakhlakul karimah.',
            'Dukungan, doa, dan motivasi dari Ayah/Bunda di rumah adalah kunci utama keberhasilan Ananda dalam menuntut ilmu dan mengasah akhlak di madrasah.',
        ];
        part3 = selectVariant(variants, seed + 3);
    }

    return `${part1} ${part2} ${part3}`.trim();
}

/**
 * Generator Catatan Wali Kelas (Mendukung pemanggilan gaya lama dan kontekstual baru).
 */
export function generateHomeroomNote(
    adabOrContext: BintangGrade | HomeroomNoteContext,
    kedis?: BintangGrade,
    kerapian?: BintangGrade,
    activePoints: number = 0,
    contextExt?: { studentName?: string; violations?: StudentViolationSummaryItem[]; month?: string; seed?: number | string }
): string {
    if (typeof adabOrContext === 'object') {
        return generateContextualHomeroomNote(adabOrContext);
    }

    // Pemanggilan gaya lama (adab, kedis, kerapian, activePoints, contextExt)
    return generateContextualHomeroomNote({
        adabGrade: adabOrContext,
        kedisGrade: kedis || 'A',
        kerapianGrade: kerapian || 'A',
        activePoints: activePoints || 0,
        studentName: contextExt?.studentName,
        violations: contextExt?.violations || [],
        month: contextExt?.month,
        seed: contextExt?.seed,
    });
}

