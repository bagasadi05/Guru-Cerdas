/**
 * Daftar kanonik mata pelajaran.
 *
 * Ini adalah SATU-SATUNYA sumber kebenaran nama mapel di aplikasi. Nilai di
 * sini harus persis sama dengan yang tersimpan di kolom `subject` /
 * `subject_name` pada database — query nilai memakai pencocokan persis
 * (`.eq('subject', ...)`), jadi beda satu huruf besar saja membuat nilai tidak
 * terbaca guru.
 *
 * Kalau menambah mapel di sini, perbarui juga tabel `ref_subject_alias` di
 * database bila nama lamanya sudah terlanjur dipakai.
 */
export const SUBJECTS = [
    'TQA',
    'Bahasa Indonesia',
    'Matematika',
    'IPAS',
    'Pancasila',
    'Pendidikan Karakter',
    'Akidah Akhlak',
    'Fikih',
    'Bahasa Arab',
    'Bahasa Jawa',
    'Bahasa Inggris',
    "Qur'an Hadits",
    'SKI',
    'PJOK',
    'Informatika',
    'Seni Budaya',
    'Pramuka',
    'Ekstra',
];

/**
 * Varian penulisan yang pernah masuk ke database, dipetakan ke nama kanonik.
 *
 * Kunci disimpan huruf kecil supaya pencocokannya tidak peka kapitalisasi.
 * Cerminan dari tabel `ref_subject_alias` — bila salah satu diubah, ubah
 * keduanya. Lihat migrasi 20260726120000_normalize_subject_names.sql.
 */
const SUBJECT_ALIASES: Record<string, string> = {
    'bahasa indonesia': 'Bahasa Indonesia',
    'b indo': 'Bahasa Indonesia',
    'bhs indonesia': 'Bahasa Indonesia',
    'matematika': 'Matematika',
    'mate': 'Matematika',
    'pancasila': 'Pancasila',
    'pend pancasila': 'Pancasila',
    'pendidikan pancasila': 'Pancasila',
    'ppkn': 'Pancasila',
    'bahasa inggris': 'Bahasa Inggris',
    'b inggris': 'Bahasa Inggris',
    'bahasa arab': 'Bahasa Arab',
    'b arab': 'Bahasa Arab',
    'barab': 'Bahasa Arab',
    'bahasa jawa': 'Bahasa Jawa',
    'b jawa': 'Bahasa Jawa',
    'seni budaya': 'Seni Budaya',
    'sb': 'Seni Budaya',
    'akidah': 'Akidah Akhlak',
    'akidah akhlak': 'Akidah Akhlak',
    "qur'an hadits": "Qur'an Hadits",
    'qurdist': "Qur'an Hadits",
    'qurdist 1a': "Qur'an Hadits",
    'fikih': 'Fikih',
    'fiqih': 'Fikih',
    'tik': 'Informatika',
    'ass tik': 'Informatika',
    'informatika': 'Informatika',
    'as pjok': 'PJOK',
    'ass pjok': 'PJOK',
    'pendidikan karakter': 'Pendidikan Karakter',
    'pend. karakter': 'Pendidikan Karakter',
};

/**
 * Ubah nama mapel apa pun menjadi bentuk kanoniknya.
 *
 * Dipakai di setiap titik tulis (input nilai, penugasan guru) supaya varian
 * penulisan baru tidak lagi masuk ke database. Nama yang belum dikenal
 * dikembalikan apa adanya (hanya dirapikan spasinya) — ini disengaja, supaya
 * sekolah tetap bisa menambah mapel baru tanpa harus ubah kode dulu.
 *
 * @param value Nama mapel mentah, boleh dari input bebas pengguna.
 * @returns Nama kanonik bila aliasnya dikenal, selain itu nama yang sudah di-trim.
 */
export const toCanonicalSubject = (value?: string | null): string => {
    const trimmed = value?.trim() || '';
    if (!trimmed) return '';
    return SUBJECT_ALIASES[trimmed.toLowerCase()] || trimmed;
};

/**
 * Gabungkan beberapa daftar mapel jadi satu daftar kanonik tanpa duplikat.
 *
 * Menyelesaikan kasus mapel dari penugasan guru ("MATEMATIKA") bertabrakan
 * dengan mapel bawaan ("Matematika") lalu muncul dua kali di dropdown.
 *
 * @param lists Daftar-daftar nama mapel yang mau digabung.
 * @returns Daftar kanonik, urutan kemunculan pertama dipertahankan.
 */
export const mergeSubjectLists = (...lists: string[][]): string[] => {
    const seen = new Map<string, string>();
    lists.flat().forEach((raw) => {
        const canonical = toCanonicalSubject(raw);
        if (!canonical) return;
        const key = canonical.toLowerCase();
        if (!seen.has(key)) seen.set(key, canonical);
    });
    return Array.from(seen.values());
};
