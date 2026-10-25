import { CURATED_PROTA_PRESETS, findCurriculumPreset } from '../../../data/defaultProtaPresets';

/**
 * Curated fallback topic suggestions for subjects not covered in CURATED_PROTA_PRESETS
 * (including Madrasah / PAI subjects such as Fikih, Akidah Akhlak, Al-Qur'an Hadis, SKI, Bahasa Arab, PJOK, Seni, Mulok).
 */
export const FALLBACK_SUBJECT_TOPICS: Record<string, string[]> = {
    fikih: [
        'Ketentuan Shalat Sunnah Rawatib',
        'Shalat Jamak dan Qashar',
        'Shalat dalam Keadaan Tertentu',
        'Ketentuan Puasa Ramadhan & Sunnah',
        'Thaharah, Wudhu & Tayamum',
        'Zakat, Infak dan Sedekah',
    ],
    'akidah akhlak': [
        'Kalimat Thayyibah & Maknanya',
        'Mengenal Sifat Allah & Asmaul Husna',
        'Beriman kepada Malaikat & Rasul Allah',
        'Adab Terhadap Orang Tua dan Guru',
        'Akhlak Terpuji dalam Pergaulan',
        'Menghindari Perilaku Tercela',
    ],
    'al-qur': [
        'Surah-Surah Pendek Pilihan',
        'Hukum Bacaan Tajwid Dasar',
        'Hadis tentang Kebersihan & Niat',
        'Hadis tentang Hormat kepada Orang Tua',
        'Hadis tentang Persaudaraan & Silaturahmi',
    ],
    ski: [
        'Tradisi Masyarakat Arab Pra-Islam',
        'Dakwah Nabi Muhammad SAW di Makkah',
        'Peristiwa Hijrah ke Madinah',
        'Keteladanan Khulafaur Rasyidin',
        'Sejarah Walisongo di Nusantara',
    ],
    'sejarah kebudayaan islam': [
        'Tradisi Masyarakat Arab Pra-Islam',
        'Dakwah Nabi Muhammad SAW di Makkah',
        'Peristiwa Hijrah ke Madinah',
        'Keteladanan Khulafaur Rasyidin',
        'Sejarah Walisongo di Nusantara',
    ],
    'bahasa arab': [
        "At-Ta'aruf (Perkenalan)",
        'Al-Adawatul Madrasiyyah (Peralatan Sekolah)',
        'Al-Usrah (Anggota Keluarga)',
        'Al-Mihnah (Profesi & Cita-cita)',
        'Al-Unwan & As-Sa’ah (Alamat & Waktu)',
    ],
    pai: [
        'Mengaji & Mengkaji Surah Pilihan',
        'Teladan Mulia Asmaul Husna',
        'Indahnya Saling Menghargai',
        'Ketentuan Shalat & Zikir',
        'Kisah Keteladanan Nabi dan Rasul',
    ],
    'agama islam': [
        'Mengaji & Mengkaji Surah Pilihan',
        'Teladan Mulia Asmaul Husna',
        'Indahnya Saling Menghargai',
        'Ketentuan Shalat & Zikir',
        'Kisah Keteladanan Nabi dan Rasul',
    ],
    pjok: [
        'Gerak Dasar Lokomotor & Non-Lokomotor',
        'Gerak Manipulatif dalam Permainan',
        'Senam Lantai & Ketangkasan',
        'Aktivitas Kebugaran Jasmani',
        'Pola Hidup Bersih dan Sehat',
    ],
    seni: [
        'Unsur Garis, Bentuk, dan Warna',
        'Karya Seni Rupa Dua Dimensi',
        'Pola Irama dan Lagu Daerah',
        'Gerak Tari Kreasi Daerah',
        'Karya Kerajinan dan Kolase',
    ],
    'bahasa jawa': [
        'Teks Cerita Wayang & Dongeng',
        'Unggah-Ungguh Basa (Ngoko & Krama)',
        'Tembang Dolanan & Macapat',
        'Kawruh Basa & Paribasan',
        'Aksara Jawa Dasar',
    ],
};

/**
 * Extracts normalized "Kelas X" grade level from a class name (e.g. "4A" -> "Kelas 4", "Kelas 7B" -> "Kelas 7").
 */
export function inferGradeLevelFromClassName(className?: string): string {
    if (!className) return '';
    const match = className.match(/\b(1[0-2]|[1-9])\b/);
    if (match) return `Kelas ${match[1]}`;
    const romanMatch = className.toUpperCase().match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/);
    if (romanMatch) {
        const romanMap: Record<string, number> = {
            I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
            VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
        };
        const num = romanMap[romanMatch[1]];
        if (num) return `Kelas ${num}`;
    }
    return '';
}

/**
 * Retrieves topic / TP suggestions from the teacher's saved Prota/Promes or official curriculum presets.
 */
export function getProtaTopicSuggestions(
    subject: string,
    className?: string,
    semesterName?: string
): string[] {
    const cleanSub = subject.trim();
    if (!cleanSub) return [];

    const isSem2 = Boolean(
        semesterName && (semesterName.toLowerCase().includes('genap') || semesterName.includes('2'))
    );
    const semNum: 1 | 2 = isSem2 ? 2 : 1;
    const topics: string[] = [];

    // 1. Check teacher's saved Prota in localStorage
    try {
        const activeProtaId = localStorage.getItem('guru_cerdas_perangkat_ajar_active_prota_id');
        if (activeProtaId) {
            const raw = localStorage.getItem(`guru_cerdas_perangkat_ajar_prota_${activeProtaId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                const headerSub = String(parsed?.header?.subject || '').toLowerCase();
                if (headerSub && (headerSub.includes(cleanSub.toLowerCase()) || cleanSub.toLowerCase().includes(headerSub))) {
                    const items = Array.isArray(parsed?.items) ? parsed.items : [];
                    items
                        .filter((it: { semesterNumber?: number }) => !it.semesterNumber || it.semesterNumber === semNum)
                        .forEach((it: { coreTopic?: string; learningObjectiveCode?: string }) => {
                            const t = String(it.coreTopic || '').trim();
                            if (t && !topics.includes(t)) topics.push(t);
                        });
                }
            }
        }
    } catch {
        // Ignore storage read errors
    }

    // 2. Fallback / supplement with official Kurikulum Merdeka presets
    const gradeLevel = inferGradeLevelFromClassName(className);
    const preset =
        (gradeLevel ? findCurriculumPreset(cleanSub, gradeLevel) : null) ||
        CURATED_PROTA_PRESETS.find((p) => {
            const pSub = p.subject.toLowerCase();
            const sNorm = cleanSub.toLowerCase();
            return pSub.includes(sNorm) || sNorm.includes(pSub);
        }) ||
        null;

    if (preset) {
        const semList = semNum === 2 ? preset.semester2 : preset.semester1;
        semList.forEach((item) => {
            if (item.topic && !topics.includes(item.topic)) {
                topics.push(item.topic);
            }
        });
    }

    // 3. Fallback for Madrasah / Mulok / specialized subjects
    if (topics.length === 0) {
        const sNorm = cleanSub.toLowerCase();
        for (const [key, list] of Object.entries(FALLBACK_SUBJECT_TOPICS)) {
            if (sNorm.includes(key) || key.includes(sNorm)) {
                list.forEach((t) => {
                    if (!topics.includes(t)) topics.push(t);
                });
                break;
            }
        }
    }

    return topics.slice(0, 6);
}

/**
 * Formats a Date object as YYYY-MM-DD in local time.
 */
export function formatLocalYmd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates day of the week and friendly Indonesian format for a date string.
 */
export function getDayInfo(dateStr: string) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;

    const dayIndex = date.getDay(); // 0 is Sunday, 6 is Saturday
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
    ];

    const dayName = days[dayIndex];
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const formatted = `${dayName}, ${d} ${months[m - 1]} ${y}`;

    return { dayName, formatted, isWeekend };
}
