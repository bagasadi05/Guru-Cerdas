# Soft Delete Contract

Dokumen ini mendefinisikan **kontrak soft-delete** di `src/services/SoftDeleteService.ts`: dua map sumber kebenaran (`ENTITY_KEY_COLUMN` & `ENTITY_OWNER_COLUMN`) dan aturan **skip tanpa query** untuk entity tanpa kolom owner. Kontrak ini lahir dari insiden HTTP 400 di production (15× error konsol di semua halaman ber-guard) dan kini dilindungi oleh tipe, test regresi, dan script audit.

> **Sumber kebenaran:** `src/services/SoftDeleteService.ts` — SELALU update dokumen ini bersama service-nya. Kolom yang tercantum di bawah diverifikasi dari schema nyata (`src/services/database.types.ts`, hasil `supabase gen types`).

---

## 1. Mengapa kontrak ini ada

Sejarah singkat (detail: `docs/A11Y_LIGHTHOUSE_RESULTS.md` §3):

- `cleanupExpired()` dulu menjalankan `select=id&deleted_at=lt.<cutoff>` untuk semua entity di `ALL_SOFT_DELETE_ENTITIES`.
- Tabel `user_settings` memakai primary key `user_id` dan **tidak punya kolom `id`** → PostgREST membalas **HTTP 400** untuk satu-satunya tabel itu (semua tabel lain → 200).
- Query dijalankan di setiap startup halaman ber-guard → **15× error** di login/dashboard/siswa.

Solusi dua lapis:

1. Map `ENTITY_KEY_COLUMN` — kolom kunci **per entity** digunakan di seluruh API soft-delete (`softDelete`, `softDeleteBulk`, `restore`, `restoreBulk`, `permanentDelete`, `getDeletedItems`, `cleanupExpired`).
2. Type `Record<SoftDeleteEntity, string>` memaksa tiap entity baru yang ditambahkan ke union `SoftDeleteEntity` **wajib terdaftar di map** — TS error kalau lupa → pola 400 otomatis terhindar.

**Aturan emas:** jangan pernah hardcode `'id'` / `'user_id'` dalam query soft-delete. Ambil kolom dari map.

---

## 2. Kolom kunci & owner per entity (verifikasi schema nyata)

| Entity | `ENTITY_KEY_COLUMN[entity]` | `ENTITY_OWNER_COLUMN[entity]` | Catatan schema |
|---|---|---|---|
| `students` | `id` | `user_id` | id + user_id + deleted_at ✅ |
| `classes` | `id` | `user_id` | ✅ |
| `attendance` | `id` | `user_id` | ✅ |
| `violations` | `id` | `user_id` | ✅ |
| `quiz_points` | `id` | `user_id` | ✅ |
| `academic_records` | `id` | `user_id` | ✅ |
| `tasks` | `id` | `user_id` | ✅ |
| `reports` | `id` | `user_id` | ✅ |
| `schedules` | `id` | `user_id` | ✅ |
| `communications` | `id` | `user_id` | ✅ |
| `homework` | `id` | `null` ⛔ | **TANPA `user_id`** (global/sekolah) |
| `extracurriculars` | `id` | `user_id` | ✅ (user_id nullable) |
| `student_extracurriculars` | `id` | `user_id` | ✅ (user_id nullable) |
| `extracurricular_attendance` | `id` | `user_id` | ✅ (user_id nullable) |
| `extracurricular_grades` | `id` | `user_id` | ✅ (user_id nullable) |
| `extracurricular_students` | `id` | `user_id` | ✅ (user_id nullable) |
| `student_achievements` | `id` | `user_id` | ✅ |
| `student_development_analyses` | `id` | `user_id` | ✅ |
| `school_info` | `id` | `user_id` | ✅ |
| `announcements` | `id` | `null` ⛔ | **TANPA `user_id`** (global/sekolah) |
| `academic_years` | `id` | `user_id` | ✅ (user_id nullable) |
| `semesters` | `id` | `user_id` | ✅ (user_id nullable) |
| `user_settings` | `user_id` ⚠️ | `user_id` | **TANPA kolom `id`** — PK = `user_id` |

**Legenda:**
- ✅ = punya `id`, `user_id`, dan `deleted_at` di schema.
- ⚠️ `user_settings` = satu-satunya entity yang kolom kuncinya **bukan** `id`.
- ⛔ `homework` & `announcements` = **tanpa `user_id`** → owner `null` → **di-SKIP dari trash view tanpa query**.

---

## 3. ENTITY_KEY_COLUMN — kolom kunci per entity

```ts
export const ENTITY_KEY_COLUMN: Readonly<Record<SoftDeleteEntity, string>> = {
    students: 'id',
    classes: 'id',
    attendance: 'id',
    violations: 'id',
    quiz_points: 'id',
    academic_records: 'id',
    tasks: 'id',
    reports: 'id',
    schedules: 'id',
    communications: 'id',
    homework: 'id',
    extracurriculars: 'id',
    student_extracurriculars: 'id',
    extracurricular_attendance: 'id',
    extracurricular_grades: 'id',
    extracurricular_students: 'id',
    student_achievements: 'id',
    student_development_analyses: 'id',
    school_info: 'id',
    announcements: 'id',
    academic_years: 'id',
    semesters: 'id',
    user_settings: 'user_id',   // PK user_settings = user_id, TIDAK ada kolom id
};
```

### Di mana dipakai

| API | Penggunaan |
|---|---|
| `softDelete(entity, id)` | `.eq(ENTITY_KEY_COLUMN[entity], id)` |
| `softDeleteBulk(entity, ids)` | `.in(ENTITY_KEY_COLUMN[entity], ids)` |
| `restore(entity, id)` | `.eq(ENTITY_KEY_COLUMN[entity], id)` |
| `restoreBulk(entity, ids)` | `.in(ENTITY_KEY_COLUMN[entity], ids)` |
| `permanentDelete(entity, id)` | `.eq(ENTITY_KEY_COLUMN[entity], id)` |
| `getDeletedItems(entity, userId)` | memetakan `item.id` dari `item[ENTITY_KEY_COLUMN[entity]]` |
| `cleanupExpired()` | `.select(ENTITY_KEY_COLUMN[entity])` lalu `.in(ENTITY_KEY_COLUMN[entity], keys)` |

---

## 4. ENTITY_OWNER_COLUMN — kolom owner per entity (trash view)

```ts
export const ENTITY_OWNER_COLUMN: Readonly<Record<SoftDeleteEntity, string | null>> = {
    // ... semua 'user_id' kecuali:
    homework: null,        // global/sekolah — tidak punya user_id
    announcements: null,   // global/sekolah — tidak punya user_id
};
```

### Aturan skip tanpa query

`getDeletedItems(entity, userId)` **tidak mengirim query sama sekali** untuk entity yang `ENTITY_OWNER_COLUMN[entity]` bernilai `null`:

```ts
const ownerColumn = ENTITY_OWNER_COLUMN[entity];
if (!ownerColumn) {
    return [];   // skip tanpa query → hindari HTTP 400 dari kolom yang tidak ada
}
```

**Kenapa:** query yang menargetkan kolom yang tidak ada di tabel ditolak PostgREST dengan HTTP 400 di runtime. Karena `homework` & `announcements` tidak punya `user_id`, satu-satunya pilihan aman di trash view adalah melewatkannya (tidak mungkin di-scope per user). Item global semacam ini di-restore lewat jalur lain (filter by sekolah), bukan trash page per-user.

> **Catatan:** type `Record<SoftDeleteEntity, string | null>` memaksa tiap entity baru terdaftar di map ini juga — TS error kalau lupa. Nilai `null` adalah **keputusan eksplisit**, bukan kelalaian.

---

## 5. Menambah entity baru (checklist wajib)

Saat menambahkan entity baru ke sistem soft-delete:

1. Tambahkan nama entity ke union `SoftDeleteEntity`.
2. **TS akan error** — daftarkan entity di `ENTITY_KEY_COLUMN` (wajib) dan `ENTITY_OWNER_COLUMN` (wajib).
3. Tentukan kolom kunci: `'id'` untuk hampir semua tabel, `'user_id'` kalau PK-nya memang user_id (seperti `user_settings`).
4. Tentukan kolom owner: `'user_id'` kalau tabel punya kolom itu; `null` kalau tidak punya (skip dari trash view).
5. Pastikan tabel punya kolom `deleted_at` (prasyarat soft-delete).
6. Update tabel di §2 dokumen ini.
7. Jalankan `npm run audit:hardcode-id` — harus 0 RISK.

---

## 6. Pengaman (guard rails)

| Lapisan | Mekanisme |
|---|---|
| **Type-level** | `Record<SoftDeleteEntity, string>` / `Record<SoftDeleteEntity, string \| null>` memaksa pendaftaran lengkap |
| **Unit test** | `tests/unit/dataManagement.test.ts` & `tests/unit/useSoftDelete.test.tsx` — merekam kolom `eq`/`in` dan membandingkan dengan map per entity |
| **Integration test** | `src/tests/integration.test.ts` — verifikasi `user_settings` di-select dengan `user_id` |
| **Audit script** | `scripts/audit-hardcoded-id.cjs` (`npm run audit:hardcode-id`) — scan seluruh src untuk `.eq('id')`/`.in('id')`/`.select('id')` di luar service yang menargetkan entity soft-delete |

---

## 7. Konsumen kontrak

- `src/services/SoftDeleteService.ts` — pemilik kontrak (map + seluruh API).
- `src/services/dataManagement.ts` — memakai `softDeleteBulk` untuk archive/clear data (jalur yang dulu memicu HTTP 400).
- `src/hooks/useSoftDelete.ts` — hook UI dengan undo (`useUndoToast` / `UndoManager`).
- Trash page (`getAllDeletedItems`) — menggabungkan `getDeletedItems` semua entity; `homework`/`announcements` otomatis kosong karena skip.

---

## Related

- [System Architecture Overview](./overview.md)
- [A11Y / Lighthouse Results](../A11Y_LIGHTHOUSE_RESULTS.md) — riwayat insiden HTTP 400
- [DB Push Plan (pending migrations)](../DB_PUSH_PENDING_MIGRATIONS_PLAN.md)
