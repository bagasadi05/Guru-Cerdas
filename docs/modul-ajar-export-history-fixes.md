# Perbaikan Ekspor dan Riwayat Modul Ajar

## Perilaku yang diperbaiki

- PDF, Word, dan cetak mengambil isi pratinjau terbaru, termasuk perubahan guru pada dokumen dan tampilan LKPD siswa.
- Ekspor Word memakai satu utilitas untuk dokumen baru maupun riwayat. Utilitas tersebut menerapkan sanitasi HTML, nama berkas yang aman, ukuran A4 atau F4, dan tata letak yang lebih stabil di Microsoft Word.
- Ukuran kertas tersimpan pada metadata dokumen baru sehingga ekspor dari riwayat mempertahankan pilihan A4 atau F4. Dokumen lama tetap memakai A4.
- Riwayat membaca status KBC dan model pembelajaran dari metadata yang benar, serta dapat memulihkan seluruh bagian manual yang tersimpan.
- Cache bank konten manual kini membedakan mata pelajaran, topik, fase, dan kelas agar isi dari konteks sebelumnya tidak terbawa.

## Verifikasi

- `tests/unit/modulAjarWordExport.test.ts` mencakup sanitasi nama berkas dan proses unduh Word.
