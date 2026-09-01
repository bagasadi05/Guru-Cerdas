# PRD: Peningkatan Menu Dashboard

> **Status:** Draft  
> **Tanggal:** 2026-09-01  
> **Penanggung Jawab:** Tim Pengembangan Guru Cerdas  
> **Sprint Target:** Q4 2026 – Q1 2027

---

## 1. Latar Belakang & Analisis Kondisi Saat Ini

Dashboard (`/dashboard`) adalah halaman pertama yang dilihat guru saat membuka aplikasi. Saat ini terdiri dari **20+ komponen** yang dirender dalam layout grid 12-kolom dengan sidebar kanan.

### 1.1. Peta Komponen Saat Ini

```
┌─────────────────────────────────────────────────────────────────┐
│ SemesterTransitionBanner                                        │
├─────────────────────────────────────────────────────────────────┤
│ DashboardGreeting (sapaan, jam, status online, quote)           │
├─────────────────────────────────────────────────────────────────┤
│ Alert Banner: Tunggakan Absensi                                 │
├─────────────────────────────────────────────────────────────────┤
│ Alert Banner: Jurnal Belum Diisi                                │
├──────────────────────────────────────┬──────────────────────────┤
│ LEFT COLUMN (9 col)                  │ RIGHT SIDEBAR (3 col)    │
│                                      │                          │
│ StatsGrid / SchoolStatsGrid          │ ┌─ Tabs ──────────────┐ │
│ (4 KPI cards)                        │ │ Jadwal | Tugas      │ │
│                                      │ │ ScheduleTimeline     │ │
│ TodayActionPanel                     │ │ Task List            │ │
│ (4 priority action cards)            │ └──────────────────────┘ │
│                                      │                          │
│ AIInsightWidget                      │ WallOfFameWidget         │
│ (AI daily insight)                   │                          │
│                                      │ ParentMessagesWidget     │
│ AttendanceStatsWidget + GradeAudit   │                          │ │
│ (side by side)                       │ ActivityFeedWidget       │
│                                      │ (reminders + timeline)   │
│ ClassAnalyticsSection (collapsed)    │                          │
│                                      │                          │
│ LeaderboardCard                      │                          │
│                                      │                          │
│ DashboardSummaryCards                │                          │
│ (classes attention + priority siswa) │                          │
├──────────────────────────────────────┴──────────────────────────┤
│ FAB Speed Dial (Jadwal, Cari, AI Chat, Pengaturan)              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. Masalah yang Teridentifikasi

| # | Masalah | Dampak | Severity |
|---|---------|--------|----------|
| 1 | **Komponen AI duplikat** — `AIInsightWidget` dan `AiDashboardInsight` melakukan hal yang sama dengan pendekatan berbeda | Confusion, maintenance burden | High |
| 2 | **DashboardSummaryCards menggunakan data palsu** — "Siswa Prioritas" mengambil `students[0]`, `[1]`, `[2]` secara arbitrary, bukan berdasarkan analisis risiko | Insight menyesatkan guru | Critical |
| 3 | **Layout monolitik 514 baris** — Semua logika teacher vs leadership ada di satu file | Sulit maintain, test, dan extend | High |
| 4 | **Alert banners inline** — Tunggakan absensi dan jurnal hardcode di DashboardPage | Tidak reusable, sulit tambah alert baru | Medium |
| 5 | **Sidebar kanan overcrowded** — 5 widget ditumpuk di kolom 3/12 | Scroll panjang, widget bawah jarang terlihat | Medium |
| 6 | **GradeAuditWidget duplikasi** — Fitur yang sama ada di Analytics tab | Guru bingung harus di mana | Medium |
| 7 | **ClassAnalyticsSection collapsed by default** — Guru harus klik untuk melihat | Fitur tersembunyi, engagement rendah | Medium |
| 8 | **Tidak ada personalisasi** — Layout fixed, guru tidak bisa atur widget | Tidak ada ownership, one-size-fits-all | Medium |
| 9 | **Tidak ada integrasi Modul Ajar** — Widget modul ajar tidak ada di dashboard | Guru harus navigate ke halaman terpisah | Medium |
| 10 | **Tidak ada integrasi Program Bintang** — Fitur gamifikasi tidak terlihat di dashboard | Engagement rendah untuk fitur Bintang | Low |
| 11 | **12 parallel queries** — Semua data di-fetch sekaligus | Initial load lambat di koneksi lambat | Medium |
| 12 | **Tidak ada offline dashboard** — Error state saat offline | Guru tidak bisa lihat data terakhir | Medium |
| 13 | **Tasks di sidebar tidak interaktif** — Hanya list, tidak bisa check-off | Guru harus buka halaman Tugas | Low |
| 14 | **Tidak ada week preview jadwal** — Hanya menampilkan hari ini | Guru tidak bisa antisipasi hari berikutnya | Low |
| 15 | **No onboarding progress tracker** — WelcomeEmptyState hilang setelah ada data | Guru baru tidak tahu langkah selanjutnya | Medium |

---

## 2. Tujuan

1. Menjadikan dashboard sebagai **command center** yang personal, actionable, dan informatif
2. Menghilangkan **duplikasi komponen** dan **data palsu**
3. Meningkatkan **engagement** dengan widget yang relevan per role
4. Mendukung **offline-first** untuk penggunaan di area dengan koneksi terbatas
5. Mengurangi **cognitive load** dengan layout yang lebih terstruktur

---

## 3. Pengguna Target

| Role | Kebutuhan Dashboard |
|------|---------------------|
| **Guru Mapel** | Jadwal hari ini, tugas pending, absensi cepat, insight kelas |
| **Wali Kelas** | + Analisis kelas, siswa prioritas, grade audit |
| **Waka Kurikulum** | + Perbandingan kelas, monitoring KKTP lintas kelas |
| **Kepala Madrasah** | + Executive summary, school-wide metrics, trend |
| **Admin** | + System health, user activity, data completeness |

---

## 4. Fitur yang Diusulkan

### 4.1. Refactor: Hapus Komponen Duplikat & Data Palsu (Priority: P0)

**Deskripsi:** Cleanup teknis untuk menghilangkan duplikasi dan data yang tidak akurat.

**Perubahan:**

#### 4.1.1. Unified AI Insight Component
- **Hapus** `AiDashboardInsight.tsx` (menggunakan localStorage caching langsung)
- **Pertahankan** `AIInsightWidget.tsx` (menggunakan `useAIInsights` hook + Supabase caching)
- Pastikan hanya ada **satu** komponen AI insight di dashboard

#### 4.1.2. Fix DashboardSummaryCards
- **"Siswa Prioritas"** harus menggunakan data dari `predictiveAnalyticsService.calculateStudentRiskScores()` yang sudah ada
- Bukan mengambil `students[0]`, `[1]`, `[2]` secara arbitrary
- Gunakan SRI (Student Risk Index) untuk menentukan siswa yang benar-benar prioritas

#### 4.1.3. Extract Alert Banners
- Buat komponen `DashboardAlertStack` yang secara dinamis merender alert berdasarkan kondisi data
- Alert types: attendance incomplete, journal unfilled, overdue tasks, low attendance, semester transition
- Setiap alert bisa di-dismiss dan memiliki CTA

**Acceptance Criteria:**
- [ ] Hanya ada 1 komponen AI insight di dashboard
- [ ] "Siswa Prioritas" menggunakan SRI calculation, bukan index arbitrary
- [ ] Alert banners modular dan bisa di-extend
- [ ] Tidak ada regression di behavior existing

---

### 4.2. Dashboard Layout Restructure (Priority: P0)

**Deskripsi:** Menyederhanakan layout dari monolitik menjadi modular dengan section yang jelas.

**Layout Baru:**

```
┌─────────────────────────────────────────────────────────────────┐
│ DashboardAlertStack (dinamis berdasarkan kondisi)                │
├─────────────────────────────────────────────────────────────────┤
│ DashboardGreeting (sapaan, jam, status, quick stats ringkas)    │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 1: Hari Ini (full width)                                │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│ │ KPI Card 1   │ KPI Card 2   │ KPI Card 3   │ KPI Card 4   │  │
│ └──────────────┴──────────────┴──────────────┴──────────────┘  │
│ ┌─────────────────────────────┬─────────────────────────────┐  │
│ │ TodayActionPanel            │ ScheduleTimeline (enhanced) │  │
│ │ (priority actions)          │ (today + tomorrow preview)  │  │
│ └─────────────────────────────┴─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 2: Wawasan & Analisis (full width)                      │
│ ┌─────────────────────────────┬─────────────────────────────┐  │
│ │ AIInsightWidget             │ SmartInsightsPanel (leadership)│
│ │ (guru) / combined           │ GradeAuditWidget (guru)     │  │
│ └─────────────────────────────┴─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 3: Performa (full width, scrollable)                    │
│ ┌─────────────────────────────┬─────────────────────────────┐  │
│ │ AttendanceStatsWidget       │ ClassAnalyticsSection       │  │
│ │ (expanded by default)       │ (expanded by default)       │  │
│ └─────────────────────────────┴─────────────────────────────┘  │
│ ┌─────────────────────────────┬─────────────────────────────┐  │
│ │ LeaderboardCard             │ DashboardSummaryCards       │  │
│ └─────────────────────────────┴─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 4: Sidebar Widgets (collapsible, mobile: bottom sheet)  │
│ WallOfFame | ParentMessages | ActivityFeed | Tasks              │
├─────────────────────────────────────────────────────────────────┤
│ FAB Speed Dial                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Perubahan Kunci:**
- Hapus sidebar kanan fixed → jadikan **section collapsible** di bawah
- Schedule dan Tasks tetap prominent di Section 1
- Widget yang jarang dilihat (Wall of Fame, Parent Messages, Activity Feed) dipindah ke section bawah yang collapsible
- Mobile: sidebar widget menjadi **bottom sheet** yang bisa di-swipe up

**Acceptance Criteria:**
- [ ] Layout responsif di mobile (single column), tablet (2 col), desktop (full)
- [ ] Sidebar widgets menjadi collapsible section, bukan fixed sidebar
- [ ] Schedule dan Tasks tetap visible tanpa scroll
- [ ] Tidak ada horizontal scroll di mobile

---

### 4.3. Enhanced Schedule Widget (Priority: P1)

**Deskripsi:** Meningkatkan ScheduleTimeline dengan preview hari berikutnya dan quick journal entry.

**Perubahan:**
- Tambahkan **tab "Besok"** di samping tab "Hari Ini"
- Hari ini: tetap menampilkan timeline dengan progress bar
- Besok: menampilkan jadwal hari berikutnya (tanpa progress)
- Tambahkan **quick journal entry** — tombol "Isi Jurnal" langsung di setiap item jadwal yang sudah selesai
- Tambahkan **countdown** ke pelajaran berikutnya di header

**Data Source:**
- Query `schedules` untuk hari ini DAN besok dalam satu fetch
- Journal entry tetap navigate ke `/jurnal` dengan prefill

**Acceptance Criteria:**
- [ ] Tab "Hari Ini" dan "Besok" berfungsi
- [ ] Countdown ke pelajaran berikutnya terlihat di header
- [ ] Tombol "Isi Jurnal" muncul untuk jadwal yang sudah selesai atau sedang berlangsung
- [ ] Data besok di-fetch bersamaan dengan data hari ini

---

### 4.4. Interactive Tasks Widget (Priority: P1)

**Deskripsi:** Membuat task list di dashboard bisa di-interact langsung (check-off, quick edit).

**Perubahan:**
- Checkbox di setiap task → bisa mark as done langsung dari dashboard
- Swipe left di mobile → reveal "Done" dan "Edit" actions
- Badge count di tab header "Tugas" (misal: "Tugas (3)")
- Quick add task button di footer widget
- Filter: "Semua" | "Hari Ini" | "Terlambat"

**Data Source:**
- Mutation: `supabase.from('tasks').update({ status: 'done' })` langsung dari dashboard
- Optimistic update via React Query

**Acceptance Criteria:**
- [ ] Checkbox mark as done berfungsi tanpa page reload
- [ ] Badge count update real-time
- [ ] Quick add task membuka inline form (title + due date)
- [ ] Filter tabs berfungsi

---

### 4.5. Onboarding Progress Tracker (Priority: P1)

**Deskripsi:** Menggantikan WelcomeEmptyState dengan progress tracker yang persisten sampai setup lengkap.

**Komponen: `SetupProgressCard`**
- Muncul di bagian atas dashboard jika setup belum 100%
- Checklist items:
  1. ✅ Tambah kelas
  2. ✅ Tambah siswa
  3. ✅ Buat jadwal
  4. ✅ Input nilai pertama
  5. ✅ Lakukan absensi pertama
- Progress bar di header card
- Setiap item memiliki CTA button
- Card auto-hide setelah semua checklist complete (bisa di-show lagi via settings)

**Data Source:**
- Cek existing data: `classes.length > 0`, `students.length > 0`, `schedules.length > 0`, etc.
- Tidak perlu query baru — gunakan data dari `useDashboardData` yang sudah ada

**Acceptance Criteria:**
- [ ] Card muncul jika ada checklist yang belum complete
- [ ] Progress bar akurat
- [ ] CTA button navigate ke halaman yang tepat
- [ ] Card auto-hide setelah 100% complete
- [ ] Bisa di-show lagi via Settings

---

### 4.6. Quick Stats Ringkas di Greeting (Priority: P2)

**Deskripsi:** Menambahkan ringkasan angka cepat di header greeting sehingga guru langsung tahu kondisi hari ini tanpa scroll.

**Komponen:**
Di samping sapaan, tampilkan 3-4 chip/badge ringkas:
- `👥 32 siswa` — total siswa aktif
- `✅ 85% hadir` — kehadiran hari ini
- `📝 3 tugas` — tugas aktif
- `📅 4 jadwal` — jadwal hari ini

Chip bisa diklik → navigate ke halaman terkait.

**Acceptance Criteria:**
- [ ] Chip menampilkan data real-time dari `useDashboardData`
- [ ] Chip clickable dengan navigasi yang benar
- [ ] Mobile: chip wrap dengan baik
- [ ] Dark mode compatible

---

### 4.7. Bintang Program Widget (Priority: P2)

**Deskripsi:** Widget ringkas yang menampilkan status Program Bintang di dashboard.

**Komponen:**
- Card kecil di Section 3
- Menampilkan:
  - Jumlah siswa yang mendapat bintang minggu ini
  - Top 3 siswa dengan bintang terbanyak
  - Trend: naik/turun dari minggu lalu
  - CTA: "Lihat Program Bintang" → `/bintang`

**Data Source:**
- `student_achievements` yang sudah di-fetch di `useDashboardData`
- Filter category: bintang-related achievements

**Acceptance Criteria:**
- [ ] Widget menampilkan data bintang yang akurat
- [ ] Top 3 siswa dengan avatar dan jumlah bintang
- [ ] CTA navigate ke `/bintang`
- [ ] Tidak render jika belum ada data bintang

---

### 4.8. Modul Ajar Quick Access (Priority: P2)

**Deskripsi:** Widget ringkas untuk akses cepat ke Modul Ajar dari dashboard.

**Komponen:**
- Card di Section 3
- Menampilkan:
  - Modul ajar terakhir yang diedit (judul, tanggal)
  - Tombol "Buat Modul Baru" → `/modul-ajar?new=true`
  - Daftar 3 modul terakhir dengan link ke detail
- Badge "Draft" jika ada modul yang belum selesai

**Data Source:**
- Query `modul_ajar` table (baru, perlu tambah ke `useDashboardData`)
- Atau lazy load saat widget terlihat (IntersectionObserver)

**Acceptance Criteria:**
- [ ] Menampilkan modul ajar terakhir
- [ ] Tombol "Buat Modul Baru" berfungsi
- [ ] Link ke modul detail berfungsi
- [ ] Lazy load untuk menghindari initial load tambahan

---

### 4.9. Offline Dashboard Cache (Priority: P2)

**Deskripsi:** Menyimpan data dashboard terakhir ke localStorage/IndexedDB untuk ditampilkan saat offline.

**Perubahan:**
- Simpan `DashboardQueryData` ke localStorage setiap fetch berhasil
- Saat offline, tampilkan cached data dengan banner "Mode Offline — Data terakhir: [timestamp]"
- Tidak perlu Service Worker baru — cukup React Query `placeholderData` dari cache
- Indicator "Data cached" di greeting header

**Data Source:**
- React Query sudah support `placeholderData` — extend untuk localStorage persistence
- Gunakan `persistQueryClient` dari `@tanstack/react-query-persist-client`

**Acceptance Criteria:**
- [ ] Dashboard menampilkan cached data saat offline
- [ ] Banner "Mode Offline" dengan timestamp data terakhir
- [ ] Data otomatis refresh saat kembali online
- [ ] Cache expired setelah 24 jam

---

### 4.10. Dashboard Widget Personalization (Priority: P3)

**Deskripsi:** Memungkinkan guru mengatur urutan dan visibilitas widget di dashboard.

**Konsep:**
- Mode "Edit Dashboard" (toggle di header)
- Saat mode edit aktif:
  - Setiap widget memiliki handle drag (☰) dan toggle visibility (eye icon)
  - Drag & drop untuk mengubah urutan
  - Simpan layout ke `user_settings` di Supabase
- Default layout berbeda per role (guru vs leadership)
- Reset to default button

**Data Source:**
- Tabel `user_settings` dengan key `dashboard_layout`
- Format: `{ widgets: [{ id: 'schedule', visible: true, order: 0 }, ...] }`

**Acceptance Criteria:**
- [ ] Mode edit bisa di-toggle
- [ ] Drag & drop berfungsi di desktop dan mobile
- [ ] Layout tersimpan per user
- [ ] Default layout per role
- [ ] Reset to default berfungsi

---

## 5. Arsitektur & Teknis

### 5.1. Perubahan Struktur File

```
src/components/dashboard/
├── DashboardPage.tsx              ← REWRITE (split into sections)
├── DashboardAlertStack.tsx        ← NEW (dynamic alerts)
├── SetupProgressCard.tsx          ← NEW (onboarding)
├── QuickStatsChips.tsx            ← NEW (greeting stats)
├── BintangWidget.tsx              ← NEW (bintang program)
├── ModulAjarWidget.tsx            ← NEW (modul ajar quick access)
├── EnhancedScheduleWidget.tsx     ← REWRITE (today + tomorrow)
├── InteractiveTaskList.tsx        ← REWRITE (check-off, filter)
├── AIInsightWidget.tsx            ← KEEP (unified)
├── StatsGrid.tsx                  ← KEEP
├── TodayActionPanel.tsx           ← KEEP
├── DashboardGreeting.tsx          ← MODIFY (add QuickStatsChips)
├── ScheduleTimeline.tsx           ← KEEP (used by EnhancedScheduleWidget)
├── GradeAuditWidget.tsx           ← KEEP
├── ClassAnalyticsSection.tsx      ← MODIFY (default open)
├── DashboardSummaryCards.tsx       ← REWRITE (use real SRI data)
├── WallOfFameWidget.tsx           ← KEEP
├── ActivityFeedWidget.tsx         ← KEEP
├── SemesterTransitionBanner.tsx   ← KEEP
├── LazyWidgets.tsx                ← KEEP
├── DashboardSection.tsx           ← NEW (reusable section wrapper)
└── index.ts                       ← UPDATE exports

src/hooks/
├── useDashboardData.ts            ← MODIFY (add modul_ajar, tomorrow schedule)
├── useDashboardLayout.ts          ← NEW (widget personalization)
└── ...

src/services/
└── dashboardCacheService.ts       ← NEW (offline cache)
```

### 5.2. Data Flow

```
useDashboardData (extended)
    ├── students, classes, schedule (today + tomorrow)
    ├── tasks, academicRecords, violations
    ├── achievements (bintang)
    ├── modul_ajar (new)
    └── cached to localStorage

DashboardPage
    ├── DashboardAlertStack (reads data → generates alerts)
    ├── DashboardGreeting + QuickStatsChips
    ├── Section: Hari Ini (StatsGrid + TodayActionPanel + Schedule)
    ├── Section: Wawasan (AIInsight + GradeAudit / SmartInsights)
    ├── Section: Performa (Attendance + ClassAnalytics + Leaderboard)
    ├── Section: Lainnya (collapsible: WallOfFame + Bintang + ModulAjar + ActivityFeed)
    └── FAB
```

### 5.3. Dependencies

| Package | Kegunaan | Status |
|---------|----------|--------|
| `@tanstack/react-query-persist-client` | Offline cache | NEW |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag & drop widget personalization | NEW (Phase 3) |
| `idb-keyval` | IndexedDB wrapper for large cache | NEW (Phase 2) |

---

## 6. UX Flow

### 6.1. Guru Baru → Onboarding

```
Buka Dashboard pertama kali
    ↓
SetupProgressCard muncul di atas
  "Selamat datang! Mari siapkan kelas Anda."
  [1/5] Tambah kelas → /siswa
    ↓
Guru menambah kelas → checklist update
    ↓
... sampai 5/5 complete
    ↓
Card auto-hide, dashboard normal
```

### 6.2. Guru Harian → Command Center

```
Buka Dashboard
    ↓
Lihat QuickStatsChips: "32 siswa, 85% hadir, 3 tugas, 4 jadwal"
    ↓
Alert: "8 siswa belum diabsen" → Klik "Isi Sekarang" → /absensi
    ↓
Selesai absensi → Kembali ke dashboard
    ↓
Lihat TodayActionPanel: "Nilai Matematika turun 10 poin" → Klik → /siswa/123
    ↓
Check-off tugas di InteractiveTaskList
    ↓
Lihat AI Insight: "Fokus hari ini: remedial IPA kelas 8A"
```

### 6.3. Kepala Madrasah → Executive Overview

```
Buka Dashboard
    ↓
SchoolStatsGrid: 120 siswa, 88% hadir, 45 tugas, 12 kelas
    ↓
SmartInsightsPanel: "Lonjakan pelanggaran di kelas 9B"
    ↓
ClassAnalyticsSection: Perbandingan 12 kelas
    ↓
Klik kelas 9B → detail analytics
```

---

## 7. Metrics of Success

| Metric | Target | Cara Ukur |
|--------|--------|-----------|
| Dashboard load time (LCP) | < 2s | Lighthouse CI |
| Time to Interactive | < 3s | Lighthouse CI |
| Widget engagement rate | > 60% klik per session | Event tracking |
| Onboarding completion rate | > 80% dalam 3 hari | Setup checklist tracking |
| Offline usage | > 10% session | Offline banner impressions |
| Task completion from dashboard | > 30% task done via dashboard | Mutation tracking |
| AI Insight regeneration rate | < 10% (cache hit > 90%) | API call tracking |

---

## 8. Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Layout restructure break mobile UX | High | High | Extensive mobile testing, progressive rollout |
| Offline cache stale data | Medium | Medium | 24h expiry, clear cache button, visual timestamp |
| Widget personalization complexity | Medium | Medium | Phase 3 only, start with fixed layout |
| Performance regression dari widget baru | Medium | Medium | Lazy load, IntersectionObserver, code splitting |
| Guru kehilangan sidebar schedule | Medium | Low | Schedule tetap prominent di Section 1 |
| Modul Ajar query menambah load time | Low | Medium | Lazy load widget, separate query |

---

## 9. Timeline Usulan

| Fase | Fitur | Sprint |
|------|-------|--------|
| **Fase 1** (P0) | 4.1 Refactor duplikasi + data palsu, 4.2 Layout restructure | Sprint 1-2 |
| **Fase 2** (P1) | 4.3 Enhanced Schedule, 4.4 Interactive Tasks, 4.5 Onboarding | Sprint 3-4 |
| **Fase 3** (P2) | 4.6 Quick Stats, 4.7 Bintang Widget, 4.8 Modul Ajar, 4.9 Offline Cache | Sprint 5-6 |
| **Fase 4** (P3) | 4.10 Widget Personalization | Sprint 7-8 |

---

## 10. Open Questions

1. **Sidebar removal:** Apakah guru akan kehilangan akses cepat ke jadwal jika sidebar dihapus? Perlu A/B test?
2. **GradeAuditWidget placement:** Tetap di dashboard atau pindah sepenuhnya ke Analytics tab?
3. **Modul Ajar query:** Apakah perlu tambah query ke `useDashboardData` atau lazy load terpisah?
4. **Offline cache size:** Berapa batas ukuran cache? IndexedDB vs localStorage?
5. **Widget personalization:** Apakah cukup show/hide atau perlu full drag-and-drop reorder?
6. **Leaderboard visibility:** Apakah leaderboard tetap di dashboard untuk guru non-wali kelas?
7. **AI Insight auto-generate:** Apakah tetap butuh tombol "Buat Wawasan" atau auto-generate setiap hari?
8. **Parent Messages:** Apakah widget ini cukup penting untuk tetap di dashboard, atau cukup di halaman Komunikasi?

---

## 11. Referensi Kode Terkait

| File | Keterangan |
|------|------------|
| `src/components/pages/DashboardPage.tsx` | Halaman utama (akan di-refactor) |
| `src/hooks/useDashboardData.ts` | Data fetching hook (akan di-extend) |
| `src/hooks/useDashboardStats.ts` | Stats calculation (akan di-extend) |
| `src/hooks/useDashboardActivities.ts` | Activity feed generation |
| `src/components/dashboard/AIInsightWidget.tsx` | AI insight (akan di-unify) |
| `src/components/dashboard/AiDashboardInsight.tsx` | AI insight duplikat (akan dihapus) |
| `src/components/dashboard/StatsGrid.tsx` | KPI cards |
| `src/components/dashboard/TodayActionPanel.tsx` | Priority actions |
| `src/components/dashboard/ScheduleTimeline.tsx` | Schedule timeline |
| `src/components/dashboard/DashboardSummaryCards.tsx` | Summary cards (akan di-rewrite) |
| `src/components/dashboard/GradeAuditWidget.tsx` | Grade audit |
| `src/components/dashboard/ClassAnalyticsSection.tsx` | Class analytics |
| `src/components/dashboard/WallOfFameWidget.tsx` | Wall of fame |
| `src/components/dashboard/ActivityFeedWidget.tsx` | Activity feed |
| `src/components/dashboard/SemesterTransitionBanner.tsx` | Semester banner |
| `src/components/dashboard/DashboardGreeting.tsx` | Greeting header |
| `src/components/dashboard/LazyWidgets.tsx` | Lazy loaded widgets |
| `src/services/predictiveAnalyticsService.ts` | SRI calculation (untuk SummaryCards) |
| `src/services/gamificationService.ts` | Gamification data |
| `src/components/EmptyStates.tsx` | WelcomeEmptyState |
