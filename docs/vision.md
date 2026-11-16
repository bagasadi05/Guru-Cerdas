# Visi — Portal Guru

> Dokumen aspirasi **tanpa tanggal dan tanpa komitmen**. Entri di sini tidak masuk
> roadmap sampai punya PRD aktif (lihat [ROADMAP.md](ROADMAP.md)). Dipisahkan dari
> roadmap agar arah jangka pendek tidak tertutup bayangan jangka panjang — pelajaran
> dari roadmap lama yang menjanjikan v2.0.0 "Enterprise" tanpa satu pun PRD.

## Arah jangka panjang (urutan bukan prioritas)

1. **Platform manajemen sekolah yang dipercaya guru Indonesia** — dimulai dari satu
   madrasah, tumbuh dari rujukan guru-ke-guru, bukan dari fitur enterprise dini.
2. **Offline-first yang paritas** — semua mode input (bukan hanya nilai mapel) aman
   tanpa koneksi; dashboard tetap terbaca offline.
3. **Dokumen administrasi formal sebagai pembeda** — Prota/Promes/Modul Ajar/rapor
   dengan kop resmi siap cetak; satu stack ekspor, identitas visual konsisten.
4. **AI hemat kuota dengan fallback** — Gemini → Groq, cache privat, biaya terkendali.
5. **Multi-sekolah / multi-tenancy** — hanya setelah fondasi (boundary service,
   RLS per cakupan, satu stack offline) selesai; butuh PRD tersendiri + keputusan
   isolasi data (satu DB bersama vs schema per sekolah).
6. **API publik & integrasi** (Dapodik/emis, WhatsApp resmi) — setelah multi-tenancy.
7. **Kolaborasi realtime antar guru & komunitas** — fase paling jauh.

## Prinsip yang tidak bernegosiasi di jalur mana pun

- Data siswa tidak pernah terekspos lintas cakupan peran (RLS ketat).
- Tidak ada fitur yang menggantung tanpa penutup: PRD ditutup, flag di-rollout,
  gate di-wire, pengukuran diulang pasca-fix.
- Dokumen yang basi lebih berbahaya daripada tidak ada dokumen.
