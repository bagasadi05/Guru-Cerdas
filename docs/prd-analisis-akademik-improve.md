# PRD: Peningkatan Menu Analisis Akademik

> **Status:** Draft  
> **Tanggal:** 2026-09-01  
> **Penanggung Jawab:** Tim Pengembangan Guru Cerdas  
> **Sprint Target:** Q4 2026

---

## 1. Latar Belakang & Masalah

Menu **Analitik Akademik** (`/analytics` → tab "Akademik") saat ini memiliki keterbatasan signifikan:

| Masalah | Dampak |
|---------|--------|
| Tab Akademik hanya menampilkan **grafik distribusi nilai A-E** (bar horizontal) | Guru tidak bisa melihat tren atau pola per mapel |
| **Audit Kelengkapan Nilai** tersembunyi di balik tombol "Tampilkan Analisis" | Guru sering tidak menemukan fitur ini |
| Tidak ada **filter per mata pelajaran** atau **jenis penilaian** di level tab utama | Guru harus membuka menu terpisah untuk insight spesifik |
| Tidak ada **visualisasi tren nilai** dari waktu ke waktu | Tidak bisa mendeteksi penurunan/kenaikan performa kelas |
| Tidak ada **perbandingan antar mapel** | Guru kesulitan mengidentifikasi mapel bermasalah |
| **Smart Insights Panel** hanya ada di Dashboard, tidak terintegrasi di tab Akademik | Insight AI tidak kontekstual saat guru menganalisis nilai |
| Tidak ada **rekomendasi tindakan guru** berbasis data akademik | Guru harus menginterpretasi data sendiri |
| Export PDF tidak memiliki section analisis akademik yang mendalam | Laporan cetak kurang informatif |
| Tidak ada **tracking capaian KKTP** per mapel di tab Akademik | KKTP hanya ada di tab Prediksi & AI |

---

## 2. Tujuan

1. Menjadikan tab Akademik sebagai **pusat analisis nilai utama** yang komprehensif dan actionable
2. Memberikan guru **insight berbasis data** tanpa perlu interpretasi manual
3. Mengintegrasikan **AI-powered recommendations** langsung di konteks akademik
4. Mendukung **kepala madrasah/waka** dengan overview akademik lintas kelas
5. Meningkatkan **keterlibatan guru** dengan data akademik melalui UX yang lebih baik

---

## 3. Pengguna Target

| Role | Kebutuhan Utama |
|------|-----------------|
| **Guru Mapel** | Analisis per mapel, identifikasi siswa lemah, rekomendasi remedial |
| **Wali Kelas** | Overview semua mapel di kelasnya, perbandingan dengan kelas lain |
| **Waka Kurikulum** | Monitoring capaian KKTP lintas kelas, identifikasi mapel bermasalah |
| **Kepala Madrasah** | Executive summary akademik madrasah, tren semester |

---

## 4. Fitur yang Diusulkan

### 4.1. Ringkasan Akademik Cerdas (Priority: P0)

**Deskripsi:** Menggantikan card distribusi nilai statis dengan dashboard ringkasan yang lebih kaya.

**Komponen:**
- **KPI Cards Row:**
  - Rata-rata Nilai Madrasah/Kelas (dengan indikator naik/turun dari periode sebelumnya)
  - Total Siswa Sudah Dinilai vs Belum (progress ring)
  - Jumlah Mapel di Bawah KKTP (dengan warning badge)
  - Persentase Kelengkapan Penilaian

- **Distribusi Nilai yang Ditingkatkan:**
  - Tetap menampilkan bar chart A-E
  - Tambahkan **tooltip detail** per bar (klik untuk melihat daftar siswa)
  - Tambahkan **trend arrow** per grade band (dibanding periode sebelumnya)

**Acceptance Criteria:**
- [ ] KPI cards menampilkan data real-time dari `academic_records`
- [ ] Trend arrow membandingkan dengan periode yang sama semester sebelumnya
- [ ] Klik pada bar distribusi membuka modal daftar siswa per grade band
- [ ] Data ter-filter otomatis sesuai filter kelas dan semester yang aktif

---

### 4.2. Analisis Per Mata Pelajaran (Priority: P0)

**Deskripsi:** Tab baru "Per Mapel" atau section card yang menampilkan breakdown performa per mata pelajaran.

**Komponen:**
- **Subject Cards Grid** — setiap mapel ditampilkan sebagai card:
  - Nama mapel, jumlah siswa, jumlah penilaian
  - Rata-rata nilai, nilai tertinggi, nilai terendah
  - Status KKTP (badge: ✅ Tercapai / ⚠️ Mendekati / ❌ Di Bawah)
  - Mini bar chart distribusi nilai per mapel
  - Trend indicator (naik/turun/stabil)

- **Subject Detail View** (klik card → expand/modal):
  - Daftar siswa dengan nilai per assessment
  - Grafik tren nilai per siswa (sparkline)
  - Daftar siswa di bawah KKTP
  - Tombol "Input Nilai" langsung ke `/input-massal` dengan prefill mapel

**Data Source:**
- Menggunakan `academic_records` yang sudah ada, group by `subject`
- KKTP threshold dari konfigurasi (default: 75, bisa di-override per mapel)

**Acceptance Criteria:**
- [ ] Setiap mapel yang memiliki minimal 1 record ditampilkan sebagai card
- [ ] KKTP badge akurat berdasarkan threshold yang berlaku
- [ ] Klik card membuka detail view dengan daftar siswa lengkap
- [ ] Tombol "Input Nilai" navigate ke `/input-massal` dengan prefill subject

---

### 4.3. Tren Nilai & Visualisasi Temporal (Priority: P1)

**Deskripsi:** Line chart yang menampilkan tren rata-rata nilai dari waktu ke waktu.

**Komponen:**
- **Tren Line Chart:**
  - X-axis: waktu (per minggu/bulan tergantung filter date range)
  - Y-axis: rata-rata nilai
  - Multiple lines per mapel (dengan legend toggle)
  - Garis KKTP sebagai threshold line (dashed)
  - Hover tooltip detail (tanggal, rata-rata, jumlah siswa)

- **Period Comparison:**
  - Toggle "Bandingkan dengan periode sebelumnya"
  - Overlay data periode sebelumnya dengan opacity rendah

**Data Source:**
- `academic_records.created_at` sebagai timestamp
- Aggregation: group by week/month, average per subject

**Acceptance Criteria:**
- [ ] Line chart merender data minimal 2 data point
- [ ] KKTP threshold line terlihat jelas
- [ ] Hover tooltip menampilkan detail lengkap
- [ ] Filter kelas dan date range mempengaruhi chart

---

### 4.4. Audit Kelengkapan Nilai — Promoted (Priority: P0)

**Deskripsi:** Mempromosikan Grade Completion Analysis dari hidden section ke card utama yang selalu terlihat.

**Perubahan:**
- Hapus tombol "Tampilkan Analisis Kelengkapan Nilai" (toggle)
- Jadikan section **selalu visible** di bagian atas tab Akademik
- Compact view: progress bar + jumlah siswa belum dinilai
- Expand untuk detail daftar siswa per kelas
- Tambahkan **badge notifikasi** di tab header jika ada siswa belum dinilai

**Acceptance Criteria:**
- [ ] Grade Completion Analysis selalu tampil tanpa toggle
- [ ] Badge di tab "Akademik" menunjukkan jumlah siswa belum dinilai
- [ ] Klik badge → scroll ke section audit
- [ ] Tombol "Input Nilai" tetap berfungsi dengan prefill

---

### 4.5. AI Academic Insight Panel (Priority: P1)

**Deskripsi:** Panel AI yang memberikan insight dan rekomendasi spesifik berdasarkan data akademik.

**Komponen:**
- **Insight Cards** (mirip SmartInsightsPanel di Dashboard, tapi fokus akademik):
  - "Rata-rata nilai [Mapel X] turun 8 poin dalam 2 minggu terakhir"
  - "5 siswa di kelas [Y] belum mencapai KKTP di 3+ mapel"
  - "Nilai PH [Mapel Z] menunjukkan gap signifikan antar kelas"
  - "Rekomendasi: Adakan remedial untuk [Mapel X] karena 40% siswa di bawah KKTP"

- **Quick Action Buttons:**
  - "Buat Rencana Remedial" → generate AI intervention plan
  - "Kirim Laporan ke Orang Tua" → draft komunikasi
  - "Input Nilai Remedial" → navigate ke mass input

**Data Source:**
- Menggunakan `predictiveAnalyticsService` yang sudah ada
- Tambahan: analisis per-subject trends, gap analysis antar kelas
- AI generation via `generateGeminiJson` dengan prompt khusus akademik

**Acceptance Criteria:**
- [ ] Insight muncul otomatis saat data akademik tersedia
- [ ] Setiap insight memiliki CTA (Call to Action) yang actionable
- [ ] Loading state saat AI sedang generate
- [ ] Fallback offline jika AI gagal

---

### 4.6. Perbandingan Antar Mapel (Priority: P2)

**Deskripsi:** Radar chart atau grouped bar chart yang membandingkan performa antar mata pelajaran.

**Komponen:**
- **Radar/Spider Chart:** Setiap axis = mapel, value = rata-rata nilai
- **Grouped Bar Chart:** Side-by-side comparison per kelas untuk setiap mapel
- **Heatmap View:** Matrix kelas × mapel, warna berdasarkan rata-rata nilai

**Use Case:**
- Waka Kurikulum ingin melihat mapel mana yang konsisten di bawah KKTP lintas kelas
- Wali Kelas ingin membandingkan performa kelasnya di berbagai mapel

**Acceptance Criteria:**
- [ ] Radar chart merender minimal 3 mapel
- [ ] Heatmap menggunakan color scale yang intuitif (merah = rendah, hijau = tinggi)
- [ ] Filter kelas mempengaruhi data yang ditampilkan

---

### 4.7. Export Akademik yang Ditingkatkan (Priority: P1)

**Deskripsi:** Menambahkan section analisis akademik yang mendalam ke export PDF.

**Penambahan ke Export:**
- Halaman ringkasan akademik (KPI, distribusi)
- Tabel per mapel (rata-rata, KKTP status, jumlah siswa di bawah target)
- Daftar siswa perlu perhatian akademik
- Grafik distribusi nilai (rendered ke PDF)
- Rekomendasi AI (jika tersedia)

**Acceptance Criteria:**
- [ ] Export PDF memiliki section "Analisis Akademik" yang terpisah
- [ ] Grafik ter-render sebagai image di PDF
- [ ] Data sesuai dengan filter kelas dan date range yang aktif

---

## 5. Arsitektur & Teknis

### 5.1. Perubahan Struktur File

```
src/components/pages/analytics/
├── AcademicTab.tsx              ← REWRITE (dashboard utama)
├── academic/
│   ├── AcademicKPICards.tsx     ← NEW (ringkasan angka)
│   ├── SubjectAnalysisGrid.tsx  ← NEW (grid per mapel)
│   ├── SubjectDetailModal.tsx   ← NEW (detail per mapel)
│   ├── AcademicTrendChart.tsx   ← NEW (line chart tren)
│   ├── AcademicInsightPanel.tsx ← NEW (AI insights)
│   ├── SubjectComparisonChart.tsx ← NEW (radar/heatmap)
│   └── AcademicExportSection.tsx  ← NEW (export helpers)
├── GradeCompletionAnalysis.tsx  ← KEEP (promoted visibility)
├── PredictiveAnalyticsTab.tsx   ← KEEP (no changes)
└── ...
```

### 5.2. Service Layer

```
src/services/
├── academicAnalyticsService.ts  ← NEW (business logic akademik)
├── predictiveAnalyticsService.ts ← KEEP (existing)
└── ...
```

**`academicAnalyticsService.ts` — Functions:**
- `calculateSubjectStats(academicRecords, students, kktpThreshold)` → per-subject statistics
- `calculateAcademicTrends(academicRecords, dateRange)` → time-series aggregation
- `generateAcademicInsights(data)` → AI prompt & offline fallback
- `compareSubjects(academicRecords, classes)` → cross-subject analysis
- `identifyKKTPGaps(academicRecords, threshold)` → students below KKTP

### 5.3. Data Flow

```
useAnalyticsData (existing hook)
    ↓
academicRecords[] (raw data, already fetched)
    ↓
academicAnalyticsService (new processing)
    ↓
AcademicTab components (new UI)
```

**Tidak ada perubahan pada skema database.** Semua data yang dibutuhkan sudah tersedia di tabel `academic_records` dengan field: `student_id`, `score`, `subject`, `assessment_name`, `created_at`, `semester_id`.

### 5.4. Dependencies Baru

| Package | Kegunaan | Ukuran |
|---------|----------|--------|
| `recharts` | Line chart, Radar chart, Heatmap | ~40KB gzipped |

> Alternatif: Gunakan SVG custom charts untuk menghindari dependency baru, namun recharts lebih maintainable dan sudah terbukti di ekosistem React.

---

## 6. UX Flow

### 6.1. Guru Mapel → Analisis Per Mapel

```
Analytics Page → Tab "Akademik"
    ↓
Lihat KPI Cards (rata-rata, KKTP status, kelengkapan)
    ↓
Scroll ke Subject Grid → Klik mapel "Matematika"
    ↓
Modal: Detail Matematika
  - Distribusi nilai PH-1, PH-2, PTS
  - 5 siswa di bawah KKTP
  - Trend: turun 3 poin dari minggu lalu
    ↓
Klik "Input Nilai Remedial" → /input-massal (prefill: Matematika)
```

### 6.2. Waka Kurikulum → Monitoring KKTP

```
Analytics Page → Tab "Akademik"
    ↓
Lihat badge: "3 Mapel di Bawah KKTP"
    ↓
Scroll ke Academic Insight Panel
  - "Bahasa Indonesia: 60% siswa di bawah KKTP di kelas 8A"
  - "IPA: Gap 15 poin antar kelas"
    ↓
Klik "Lihat Perbandingan Mapel" → Radar Chart / Heatmap
    ↓
Identifikasi pattern → Generate AI Class Report
```

---

## 7. Metrics of Success

| Metric | Target | Cara Ukur |
|--------|--------|-----------|
| Engagement tab Akademik | +50% page views | Analytics event tracking |
| Waktu rata-rata di tab Akademik | > 2 menit | Session duration |
| Guru yang menggunakan filter mapel | > 60% session | Click tracking |
| Nilai kelengkapan penilaian | > 90% | Grade completion % |
| Export PDF dengan section akademik | > 40% export | Export event tracking |

---

## 8. Risik & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Performance: banyak data academic_records | Medium | High | Pagination, virtualization, memoization |
| AI insight lambat/gagal | Medium | Medium | Offline fallback sudah ada, timeout 5s |
| Chart library bundle size | Low | Low | Lazy load chart components, tree-shaking |
| Guru bingung dengan UI baru | Medium | Medium | Onboarding tour, progressive disclosure |
| Data kosong untuk mapel baru | High | Low | Empty state yang informatif dengan CTA |

---

## 9. Timeline Usulan

| Fase | Fitur | Estimasi |
|------|-------|----------|
| **Fase 1** | 4.1 Ringkasan Cerdas + 4.2 Per Mapel + 4.4 Audit Promoted | Sprint 1-2 |
| **Fase 2** | 4.3 Tren Visualisasi + 4.5 AI Insight Panel | Sprint 3-4 |
| **Fase 3** | 4.6 Perbandingan Antar Mapel + 4.7 Export Enhanced | Sprint 5-6 |

---

## 10. Open Questions

1. **KKTP Threshold:** Apakah per-mapel configurable atau global saja? Saat ini global (default 75).
2. **Chart Library:** Recharts vs custom SVG? Recharts lebih cepat dikembangkan tapi +40KB bundle.
3. **Heatmap:** Apakah perlu untuk fase awal, atau cukup radar chart?
4. **Notification Badge:** Apakah badge "belum dinilai" perlu persist di sidebar navigation?
5. **Historical Data:** Berapa semester ke belakang yang perlu ditampilkan untuk trend analysis?

---

## 11. Referensi Kode Terkait

| File | Keterangan |
|------|------------|
| `src/components/pages/analytics/AcademicTab.tsx` | Tab akademik saat ini (akan di-rewrite) |
| `src/components/pages/analytics/GradeCompletionAnalysis.tsx` | Audit kelengkapan (akan dipromosikan) |
| `src/components/pages/analytics/useAnalyticsData.ts` | Data fetching hook (akan di-extend) |
| `src/components/pages/analytics/types.ts` | Type definitions (akan di-extend) |
| `src/services/predictiveAnalyticsService.ts` | AI & analytics service (akan di-referensi) |
| `src/services/aiInsightService.ts` | AI insight pattern (akan di-referensi) |
| `src/components/pages/analytics/SmartInsightsPanel.tsx` | Pattern insight card (akan di-referensi) |
| `src/components/pages/analytics/PredictiveAnalyticsTab.tsx` | Pattern UI prediksi (akan di-referensi) |
| `src/components/pages/analytics/ClassComparisonTab.tsx` | Pattern perbandingan kelas (akan di-referensi) |
