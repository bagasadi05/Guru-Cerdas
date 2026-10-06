# Catatan Rilis ("Apa yang baru")

Setiap kali versi baru di-deploy, guru melihat jendela **"Versi baru tersedia"** berisi daftar perubahan sebelum memuat ulang aplikasi. Kalau aplikasi diperbarui di latar belakang (tab tidak sedang dibuka), jendela **"Aplikasi sudah diperbarui"** muncul sekali saat guru membukanya lagi.

Isi jendela diambil dari `public/release-notes.json`. Portal Orang Tua dan halaman login tidak menampilkan jendela ini.

## Cara menambah catatan rilis

Tambahkan satu entri **di paling atas** `public/release-notes.json` sebelum deploy:

```json
{
  "id": "2026.10.11",
  "date": "2026-10-11",
  "title": "Judul singkat rilis ini",
  "changes": [
    { "type": "baru", "text": "Fitur yang belum ada sebelumnya." },
    { "type": "peningkatan", "text": "Fitur lama yang jadi lebih baik." },
    { "type": "perbaikan", "text": "Masalah yang sudah diperbaiki." }
  ]
}
```

- `id` harus unik. Pakai format tanggal `TTTT.BB.HH`; kalau ada dua rilis di hari yang sama, tambahkan akhiran, misalnya `2026.10.11-2`.
- `date` berformat `TTTT-BB-HH`. Entri diurutkan dari yang terbaru.
- `type` hanya boleh `baru`, `peningkatan`, atau `perbaikan`.
- Tulis untuk guru, bukan untuk programmer: jelaskan apa yang berubah bagi mereka, tanpa istilah teknis. Cukup 3–8 poin.

Tes `src/services/__tests__/releaseNotes.test.ts` menolak file yang formatnya salah, sehingga kesalahan ketahuan sebelum deploy.

Kalau rilis tidak punya entri baru, guru tetap ditawari pembaruan dengan pesan umum, tanpa daftar perubahan.

## Pengingat sebelum push

Hook `.githooks/pre-push` memeriksa setiap push ke `main`. Kalau ada perubahan aplikasi (`src/`, `public/`, `index.html`; file tes diabaikan) tetapi `public/release-notes.json` tidak berubah, muncul peringatan:

- **Di terminal:** muncul pertanyaan `Lanjut push tanpa catatan rilis? [y/N]`. Jawab `y` untuk tetap push (misalnya untuk perbaikan kecil), atau Enter untuk membatalkan lalu menambah catatan rilis.
- **Di aplikasi GUI** (tombol Push di VS Code, GitHub Desktop): peringatan ditampilkan di log, tetapi push tidak diblokir.
- **Melewati sekali:** `SKIP_RELEASE_NOTES=1 git push`.

Hook ini perlu diaktifkan sekali di setiap clone repo:

```bash
git config core.hooksPath .githooks
```

## Perilaku

- Guru yang belum pernah melihat catatan rilis hanya melihat entri terbaru.
- Guru yang lama tidak membuka aplikasi melihat paling banyak 3 rilis terakhir yang belum ia baca.
- "Nanti" menunda pertanyaan selama 10 menit. Pembaruan juga otomatis berlaku setelah semua tab aplikasi ditutup.
- Status "sudah dibaca" disimpan per perangkat (localStorage).
