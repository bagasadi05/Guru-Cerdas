# Drift Schema Database — 16 November 2026

Hasil `npm run audit:schema` (exit 1, pre-existing — bukan akibat perubahan hari ini).
Perbaikan membutuhkan aksi owner: `supabase db push` (kebijakan repo: manual dispatch) lalu
`npx supabase gen types typescript`. Jangan edit `database.types.ts` dengan tangan.

## Temuan

| Jenis | Item | Arti |
|---|---|---|
| MISSING TABLE | `grade_promotion_batches` (14 kolom) | Tabel dibuat oleh migrasi `20261027090000` tapi tidak ada di types → migrasi belum ter-apply ke DB yang dipakai regenerasi types |
| MISSING TABLE | `student_class_histories` (11 kolom) | Idem |
| DRIFT | `students.graduation_year`, `students.last_class_name`, `students.status` | Kolom ada di migrasi, hilang dari types |
| PHANTOM | `user_settings.fonnte_config` | Kolom ada di DB live tapi tidak dibuat migrasi mana pun di repo — perlu migrasi `ALTER TABLE` atau dihapus dari DB |
| LEGACY | `_backup_violation_type_20261003`, `hermes_probe_1a3f99ad` | Tabel temporer di DB live, kandidat housekeeping |

## Dampak runtime

`src/services/gradePromotionService.ts` memakai `(supabase.from as any)` pada
`grade_promotion_batches` (baris 221) dan `student_class_histories` (baris 491),
plus `(supabase.rpc as any)` pada 3 RPC — cast ini menutupi drift dari typecheck.
Jika migrasi `20261027090000` benar-benar belum di-push ke produksi, fitur kenaikan
kelas akan gagal 400 saat dijalankan.

## Langkah perbaikan (owner)

1. `supabase db push` (atau jalankan migrasi `20261027090000` lewat jalur deploy manual yang ada).
2. `npx supabase gen types typescript` → commit hasilnya.
3. Evaluasi `user_settings.fonnte_config`: buat migrasi resminya atau hapus dari DB.
4. Ganti `(supabase.from as any)` / `(supabase.rpc as any)` di `gradePromotionService.ts`
   dengan pemanggilan bertipe.
5. Setelah `npm run audit:schema` hijau → wire ke CI (lihat plan F2.1).
