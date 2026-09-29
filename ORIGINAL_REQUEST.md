# Original User Request

## 2026-09-24T03:22:38Z

Analisis arsitektur dan sempurnakan fitur dikte suara (Voice Grade) pada aplikasi Portal Guru agar memiliki akurasi pengenalan lisan yang tinggi, penanganan siklus mikrofon yang tangguh, serta pengalaman pengguna yang mulus saat input nilai massal.

Working directory: d:/coding/Guru Cerdas
Integrity mode: development

## Requirements

### R1. Parsing Engine & Lexical Recognition Enhancement
Sempurnakan parser ucapan Bahasa Indonesia (`src/utils/indonesianSpeechParser.ts` dan `VoiceGradeController.ts`) agar:
- Mendukung variasi frasa penilaian lisan yang lebih luas, termasuk nilai pecahan/desimal (misal: "delapan puluh koma lima", "tujuh setengah"), angka belasan/puluhan tidak baku, dan variasi fonetik umum.
- Meningkatkan ketahanan fitur koreksi/ralat (misal: "tujuh puluh lima ralat delapan puluh", "eh bukan, sembilan puluh") agar secara akurat mengutamakan nilai koreksi akhir.
- Mempertahankan dan memperluas dukungan variasi dialek/bahasa daerah yang sering digunakan pendidik di Indonesia.

### R2. Microphone Lifecycle & Robustness
Tingkatkan ketahanan adapter Web Speech API (`src/components/pages/mass-input/engine/voicePorts.ts` dan `VoiceGradeController.ts`) terhadap:
- Pemutusan koneksi tak terduga (misal: jeda bicara lama / timeout otomatis browser) dengan mekanisme restart/reconnect yang elegan tanpa kehilangan konteks siswa aktif.
- Penanganan izin mikrofon (permission denied, no speech detected, network error) dengan pesan umpan balik berbahasa Indonesia yang jelas dan dapat ditindaklanjuti guru.
- Menjaga prinsip 100% offline-friendly / browser-native Web Speech API tanpa ketergantungan API pihak ketiga berbayar.

### R3. Visual Feedback, Accessibility, and Keyboard Control
Perkaya antarmuka `VoiceGradeModal.tsx`:
- Indikator status mikrofon dan aktivitas suara yang dinamis dan informatif saat mendengarkan ucapan guru.
- Umpan balik transkrip sementara (interim) dan pesan aksi (berhasil simpan, koreksi nilai, berpindah siswa) yang kontras dan jelas terbaca.
- Navigasi keyboard yang intuitif (Spasi untuk jeda/mulai, Panah Kiri/Kanan untuk siswa sebelumnya/berikutnya, tombol Ralat/Undo instan).
- Memastikan semua elemen interaktif memenuhi standar aksesibilitas antislop (tap target $\ge 44\times 44\text{ px}$ dan focus ring yang jelas).

## Verification Resources

- Test suite controller: `tests/unit/VoiceGradeController.test.ts`
- Test suite modal: `tests/unit/VoiceGradeModal.test.tsx`
- Parser utilitas: `src/utils/indonesianSpeechParser.ts`
- Engine controller: `src/components/pages/mass-input/engine/VoiceGradeController.ts`

## Acceptance Criteria

### Parsing Accuracy & Coverage
- [ ] Parser mampu mengenali nilai desimal ("koma", "setengah") dan mengonversinya menjadi format nilai numerik valid.
- [ ] Logika ralat/pembatalan ucapan ("ralat", "ganti", "bukan") berhasil mengidentifikasi nilai pengganti tanpa menduplikasi nilai sebelumnya.
- [ ] Pengenalan angka satuan, puluhan, ratusan, dan nama siswa di mode bebas (freeform/name_match) tetap akurat dan tidak regresi.

### Stability & Error Recovery
- [ ] State controller tidak mengalami crash atau unhandled exception saat Speech Recognition menghasilkan event `no-speech` atau `audio-capture`.
- [ ] Controller mampu melanjutkan sesi dikte secara mulus setelah jeda tanpa mereset skor yang telah diinput sebelumnya.

### Quality & Standards Gate
- [ ] Seluruh unit test yang ada dan unit test baru untuk skenario desimal/ralat berhasil dijalankan (`npx vitest run tests/unit/VoiceGradeController.test.ts tests/unit/VoiceGradeModal.test.tsx`).
- [ ] Pemeriksaan tipe data TypeScript (`npx tsc --noEmit`) lulus dengan status 0 error (Clean Exit).
- [ ] Kontras visual teks dan badge tetap memenuhi standar WCAG AA $\ge 4.5:1$ dan tap target mobile sentuh $\ge 44\text{ px}$.
