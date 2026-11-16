# CONTEXT — Istilah Kanonik & Peta Modul

Sumber istilah untuk kode, PRD, dan percakapan agent. Jika ada konflik istilah antara
percakapan, dokumen ini, dan kode — **tampilkan kontradiksinya**, jangan pilih diam-diam.
Diperbarui: 16 November 2026.

## Istilah domain

| Istilah | Arti kanonik | Catatan teknis |
|---|---|---|
| **Madrasah** | Satuan sekolah (konteks awal: MI — Madrasah Ibtidaiyah) | Satu-tenant saat ini; multi-tenancy hanya di [vision.md](vision.md) |
| **Guru** | Pengguna utama; role di `user_roles.role` (`admin`, `teacher`) | `is_admin_user(uuid)` = gate admin kanonik (SECURITY DEFINER) |
| **Wali kelas / Homeroom** | Guru penanggung jawab kelas | Assignment via `teacher_class_assignments.assignment_role='homeroom'`; helper `has_teacher_class_assignment` |
| **Guru mapel / Subject teacher** | Guru pengajar mata pelajaran di kelas | `assignment_role='subject_teacher'` |
| **Pimpinan / Leadership** | Kepala madrasah & waka kesiswaan | Bukan admin; pola policy terpisah `is_leadership` |
| **PH (Penilaian Harian)** | Penilaian harian terjadwal | Tabel `ph_schedules`; UI `schedule/`; status filter & notifikasi |
| **Absensi** | Presensi harian siswa | `attendance`; `official_status` hanya wali kelas/admin; draft dilindungi; tanggal pakai `schoolDate()` WIB |
| **Nilai** | Nilai akademik | Tabel `academic_records` (jangan pakai istilah lain); input massal 7 mode di `pages/mass-input` |
| **Voice Grade** | Dikte nilai suara (Indonesia + Jawa) | `mass-input/engine/` — parser, ports, controller; arsip: [fitur-voice-grade.md](fitur-voice-grade.md) |
| **Bintang** | Program perilaku positif + evaluasi bulanan | `bintang_monthly_evaluations`, poin keaktifan dedup `max_points` |
| **Pelanggaran** | Catatan pelanggaran siswa + poin | `violations`; kolaboratif: pencatat / wali kelas / admin bisa update |
| **Prota / Promes** | Program Tahunan / Program Semester | `lesson_plans`-adjacent; dibuat dari jadwal atau AI |
| **Modul Ajar** | RPP/modul ajar berbasis AI + referensi | `ref_*` tables, pipeline `ai_content_jobs`; ekspor server di balik flag (F1.8) |
| **KKM / KKTP** | Kriteria ketuntasan (minimal / per TP) | Satu sumber aturan di analitik; jangan duplikasi rumus di komponen |
| **SRI** | Skor risiko siswa 0–100 + forecasting | `predictiveAnalyticsService` |
| **Portal orang tua** | Akses orang tua via kode akses unik | `ParentPortalPage`; push VAPID RFC 8291/8292 |
| **Ralat** | Koreksi lisan saat dikte ("75 ralat 80", "eh bukan 90") | Grace period di VoiceGradeController — jangan hapus window-nya |
| **Lie-Fi** | Koneksi tidak stabil (online tapi gagal) | Deteksi di offline status; indikator terpadu |

## Peta modul (jalur hidup)

```
src/
  index.tsx → App.tsx (lazy routes, admin gate pre-fetch, error boundary per route)
  components/
    pages/<fitur>/          feature slice; engine/ bila ada state machine kompleks
      mass-input/engine/    POLA REFERENSI: store headless + ports (DraftStoragePort, UserSettingsPort)
      schedule/engine/      hook domain (masih campur supabase — target refactor F3)
    ui/                     presentasi murni — DILARANG impor supabase (berlaku 0 pengecualian)
    OfflineBanner.tsx       konsumen useSyncQueue
  services/
    supabase.ts             client + resilientSupabaseFetch (addToQueue saat gagal)
    offline/
      functionalQueue.ts    SATU-SATUNYA antrean offline (IndexedDB + processMutation)
      conflictResolver.ts   helper merge (belum dipakai live — kandidat F3.6)
    offlineQueue.ts         facade ekspor functionalQueue (tanpa default export)
  hooks/useSyncQueue.tsx    driver sinkronisasi (online event → processMutation replay)
api/                        serverless Vercel: _requestGuard (origin+rate limit),
                            _auth (authenticateRequest/admin), _documentExport, _aiBudget
supabase/functions/         dispatch-push, wa-worker, telegram, modul-ajar-ai-worker, dst.
```

## Pola baku (jangan menemukan pola baru)

1. **Akses data**: komponen → service/query layer. Komponen TIDAK memanggil
   `supabase.from()` langsung (saat ini masih 111 titik — target < 10, lihat F3.1–F3.2).
2. **State machine kompleks** → `engine/` headless + ports, React hanya adapter
   (contoh: `mass-input/engine`).
3. **RLS**: tabel baru wajib `ENABLE ROW LEVEL SECURITY` + policy `TO authenticated`
   + InitPlan `(SELECT auth.uid())`; SECURITY DEFINER wajib `SET search_path = public, pg_temp`.
4. **Serverless guard**: endpoint baru pakai `authenticateRequest(req)` (default fail-closed)
   + `createRateLimiter` dari `api/_requestGuard.ts` + `isOriginAllowed`; kunci rate limit
   per `auth.userId` bila terautentikasi, per IP bila anonim.
5. **Offline write**: hanya via `functionalQueue.addToQueue` — jangan buat mekanisme
   antre kedua.
6. **Ekspor dokumen**: sementara 3 stack (lihat review §4.4); ekspor BARU wajib masuk
   `src/lib/export/` begitu F3.5 selesai, jangan tambah stack keempat.
7. **Waktu**: tanggal sekolah pakai `schoolDate()` (WIB); format tampilan via
   `utils/dateHelpers.ts` / `localeFormatting.ts` — bukan `toLocaleDateString` inline baru.
8. **Bahasa**: kode & komentar Inggris; teks UI/dokumen Indonesia.
