# Aksesibilitas dan Mode Mudah

Mode Mudah membantu pengguna yang menginginkan tampilan lebih tenang dan mudah dibaca tanpa menghilangkan akses ke fitur aplikasi.

## Cara menggunakan

Pilih tombol **Mode Mudah** (ikon mata) pada header aplikasi. Pilihan disimpan di perangkat yang digunakan.

Saat aktif, aplikasi akan:

- memperbesar teks dan meningkatkan kontras;
- memperbesar tinggi target tombol dan tautan menjadi minimal 44 px;
- meminimalkan animasi serta menyembunyikan dekorasi latar yang tidak penting;
- menampilkan menu tugas harian terlebih dahulu di sidebar desktop; dan
- tetap menyediakan tombol **Tampilkan semua menu**, sehingga tidak ada fitur yang hilang.

Jika pengguna sedang membuka halaman di luar menu utama, sidebar otomatis memperlihatkan menu lengkap agar lokasi aktif selalu terlihat.

## Catatan pengembangan

- Status Mode Mudah dikelola oleh `AccessibilityProvider` di `src/components/ui/AccessibilityFeatures.tsx` dan disimpan dengan kunci `isEasyMode` di `localStorage`.
- Gaya khusus memakai atribut `data-easy-mode` pada elemen `html`, sehingga tidak menggantikan pilihan ukuran teks pengguna ketika mode dinonaktifkan.
- Saat mengubah navigasi, pertahankan semua tujuan menu di `dashboardMenuConfig.ts`; Mode Mudah boleh memprioritaskan atau meringkas, tetapi tidak boleh membatasi akses.

## Verifikasi

```bash
npm test -- tests/unit/easyMode.test.tsx
npm run lint -- --quiet
npm run build
```
