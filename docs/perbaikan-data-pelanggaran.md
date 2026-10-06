# Perbaikan data pelanggaran — 3 Oktober 2026

Kedua skrip dari scratchpad Claude diterapkan melalui Supabase MCP dan dicatat
sebagai migration:

- `20261003101201_normalize_violation_type`: mengganti type kosong/general
  menjadi kode katalog hanya untuk deskripsi yang cocok persis. Hasil verifikasi:
  176 catatan berubah; 28 catatan dengan deskripsi lama tetap dipertahankan.
- `20261003101221_fix_violation_semester_trigger`: fungsi
  `set_violation_semester_id` memilih semester berdasarkan tanggal kejadian
  (`NEW.date`). Bila tidak cocok, mempertahankan semester yang dikirim aplikasi,
  lalu memakai semester aktif jika aplikasi tidak mengirim semester.

Normalisasi menyimpan nilai awal di `_backup_violation_type_20261003` untuk
rollback. RLS aktif dan hak baca anon/authenticated dicabut. Transaksi dibatalkan
jika jumlah baris normalisasi berbeda dari 176. Trigger juga mengabaikan semester
yang dihapus dan memilih secara deterministik jika ada beberapa kandidat.

Trigger yang sudah ada tetap `BEFORE INSERT`. Perbaikan ini berlaku pada catatan
baru; tidak mengoreksi semester catatan lama atau menjalankan ulang saat tanggal
catatan lama diedit. Normalisasi type tidak memicu notifikasi INSERT.

Verifikasi database sesudah penerapan memastikan fungsi dan trigger terpasang,
176 nilai type berbeda dari cadangan, 28 nilai lainnya tetap sama, dan kedua
migration tercatat. Tidak ada pesan WhatsApp yang dikirim oleh skrip ini.
