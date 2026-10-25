export type VoiceCommand = 'next' | 'prev' | 'clear' | 'stop' | 'first' | 'last' | 'undo';

export const BASIC_NUMBERS: Record<string, number> = {
    // 0
    'nol': 0,
    'kosong': 0,
    'enol': 0,
    'nihil': 0,
    // Fractions
    'setengah': 0.5,
    'separuh': 0.5,
    'seperempat': 0.25,
    // 1
    'satu': 1,
    'se': 1,
    'sa': 1,
    'siji': 1,
    'hiji': 1,
    'pertama': 1,
    'kesatu': 1,
    // 2
    'dua': 2,
    'loro': 2,
    'ro': 2,
    'duo': 2,
    'due': 2,
    'rong': 2,
    'kedua': 2,
    // 3
    'tiga': 3,
    'telu': 3,
    'tilu': 3,
    'tigo': 3,
    'tige': 3,
    'telung': 3,
    'ketiga': 3,
    // 4
    'empat': 4,
    'papat': 4,
    'pat': 4,
    'opat': 4,
    'ampat': 4,
    'patang': 4,
    'keempat': 4,
    // 5
    'lima': 5,
    'limo': 5,
    'lime': 5,
    'kelima': 5,
    // 6
    'enam': 6,
    'nem': 6,
    'genep': 6,
    'anam': 6,
    'onam': 6,
    'keenam': 6,
    // 7
    'tujuh': 7,
    'pitu': 7,
    'tuju': 7,
    'tujoh': 7,
    'pitung': 7,
    'ketujuh': 7,
    // 8
    'delapan': 8,
    'lapan': 8,
    'dapan': 8,
    'wolu': 8,
    'dalapan': 8,
    'wolung': 8,
    'kedelapan': 8,
    // 9
    'sembilan': 9,
    'songo': 9,
    'salapan': 9,
    'sambilan': 9,
    'sembilang': 9,
    'sangang': 9,
    'songong': 9,
    'kesembilan': 9,
    // 10
    'sepuluh': 10,
    'sedasa': 10,
    'sapuluh': 10,
    'kesepuluh': 10,
    // Teens (11-19)
    'sewelas': 11,
    'sebelas': 11,
    'kesebelas': 11,
    'duabelas': 12,
    'tigabelas': 13,
    'empatbelas': 14,
    'limabelas': 15,
    'enambelas': 16,
    'tujuhbelas': 17,
    'delapanbelas': 18,
    'sembilanbelas': 19,
    // Javanese Likur (21-29)
    'selikur': 21,
    'salikur': 21,
    'rolikur': 22,
    'lorolikur': 22,
    'ronglikur': 22,
    'telulikur': 23,
    'patlikur': 24,
    'papatlikur': 24,
    'slawe': 25,
    'selawe': 25,
    'nemlikur': 26,
    'pitulikur': 27,
    'wolulikur': 28,
    'songolikur': 29,
    'sanganglikur': 29,
    // Unspaced & regional tens
    'duapuluh': 20,
    'rongpuluh': 20,
    'tigapuluh': 30,
    'telungpuluh': 30,
    'empatpuluh': 40,
    'patangpuluh': 40,
    'limapuluh': 50,
    'seket': 50,
    'gocap': 50,
    'enampuluh': 60,
    'suwidak': 60,
    'tujuhpuluh': 70,
    'pitungpuluh': 70,
    'delapanpuluh': 80,
    'wolungpuluh': 80,
    'sembilanpuluh': 90,
    'sangangpuluh': 90,
    // 100
    'cepek': 100,
    'seratus': 100,
    'saratus': 100,
    'satus': 100,
    'atus': 100,
};

export const COMMAND_MAP: Record<string, VoiceCommand> = {
    'lanjut': 'next',
    'lewati': 'next',
    'lewat': 'next',
    'next': 'next',
    'skip': 'next',
    'berikutnya': 'next',
    'berikut': 'next',
    'lanjutkan': 'next',
    'teruskan': 'next',
    'skip aja': 'next',
    'kembali': 'prev',
    'mundur': 'prev',
    'balik': 'prev',
    'sebelumnya': 'prev',
    'prev': 'prev',
    'back': 'prev',
    'ulang': 'prev',
    'ulangi': 'prev',
    'hapus': 'clear',
    'kosongkan': 'clear',
    'reset': 'clear',
    'batalkan': 'clear',
    'clear': 'clear',
    'delete': 'clear',
    'hilangkan': 'clear',
    'selesai': 'stop',
    'stop': 'stop',
    'tutup': 'stop',
    'berhenti': 'stop',
    'akhiri': 'stop',
    'cukup': 'stop',
    'keluar': 'stop',
    'sudah selesai': 'stop',
    'sudah cukup': 'stop',
    'sudah stop': 'stop',
    'awal': 'first',
    'ke awal': 'first',
    'dari awal': 'first',
    'paling awal': 'first',
    'akhir': 'last',
    'ke akhir': 'last',
    'paling akhir': 'last',
    'terakhir': 'last',
    'undo': 'undo',
    'urungkan': 'undo',
    'kembalikan': 'undo',
    'batal': 'undo',
    'batalkan nilai': 'undo',
    'batalkan perubahan': 'undo',
};

export const ROLL_PREFIX_REGEX =
    /^(?:lompat\s+ke|pindah\s+ke|ke|pilih|buka|lihat|pada\s+)?(?:nomor\s+absen|no\s+absen|absen\s+nomor|absen\s+no|nomor\s+urut|no\s+urut|siswa\s+nomor|murid\s+nomor|anak\s+nomor|absen\s+ke|nomor\s+ke|urutan\s+ke|presensi\s+ke|presensi\s+nomor|ke\s+absen|ke\s+nomor|nomor|no|absen|urutan|presensi|siswa|murid)\s+(?:ke\s+|ke-)?/i;

export const NUMBER_KEYWORDS = new Set([
    ...Object.keys(BASIC_NUMBERS),
    'belas', 'welas', 'puluh', 'ngpuluh', 'ratus', 'atus', 'ribu',
    'koma', 'per', 'perempat', 'likur',
]);

export const PREFIX_GRADE_KEYWORDS = new Set([
    'nilai', 'nilainya', 'skor', 'skornya', 'angka', 'angkanya', 'poin', 'poinnya',
    'dapat', 'dapet', 'kasih', 'kasihkan', 'berikan', 'diberi'
]);

export const CORRECTION_KEYWORDS = new Set([
    'ralat', 'ganti', 'ubah', 'salah', 'bukan', 'keliru', 'revisi', 'maksudnya', 'maksud'
]);

export const CORRECTION_PREAMBLE_REGEX =
    /^(?:(?:eh|aduh|waduh|oalah|alah|astaga|ups|oops|maaf|sorry|sebentar|bentar|tunggu|loh|lah|wah)\s+)*(?:ralat|ganti|ubah|salah|bukan|keliru|revisi|maksudnya|maksud\s+saya|maksudku)(?:\s+(?:bukan|salah|ralat|keliru))?(?:\s+(?:tapi|jadi|ke|menjadi|dong|ya))?\s*/i;

export const INLINE_CORRECTION_SPLIT_REGEX =
    /\s+(?:(?:eh|aduh|waduh|oalah|alah|astaga|ups|oops|maaf|sorry|sebentar|bentar|tunggu|loh|lah|wah)\s+)?(?:ralat|ganti|ubah|salah|bukan|keliru|revisi|maksudnya|maksud\s+saya|maksudku)(?:\s+(?:bukan|salah|ralat|keliru))?(?:\s+(?:tapi|jadi|ke|menjadi))?\s+/i;

