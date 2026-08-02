# 📱 Audit Desain Mobile & PWA — Thumb-First + UI Design Review

**Tanggal**: 2026-08-01
**Skill yang dipakai**: `thumb-first` (umbrella) → `thumb-first-design` + `thumb-first-platform`, dan `ui-design-review` (mastepanoski/claude-skills)
**Target**: Seluruh menu Portal Guru (Beranda, Absensi, Siswa, Penilaian, Jadwal & Jurnal, Modul Ajar, Bintang, Analitik, Ekstrakurikuler, Pemulihan, Pengaturan, Admin) — PWA React + Vite + Tailwind

---

## Ringkasan Eksekutif

Project ini sudah **jauh di atas rata-rata** untuk standar PWA mobile: shell 100dvh, safe-area insets lengkap, touch-target bottom-nav 52–60px, FAB MD3 56px, anti-double-tap-zoom, dan PWA manifest + service worker lengkap. Audit menemukan **0 defect P0** dan **5 defect P1/P2** yang sudah diperbaiki, plus beberapa **design fork** untuk keputusan lanjutan.

| Dimensi | Skor | Status |
|---------|------|--------|
| Platform teknis (PWA) | 9/10 | ✅ Sangat kuat |
| Navigasi mobile | 9/10 | ✅ Tab bar + More sheet, thumb-reach baik |
| Touch targets | 7/10 | ⚠️ 5 kontrol interaktif < 44px (sudah difix) |
| Viewport/100vh | 8/10 | ⚠️ 2 panel `100vh` di Modul Ajar (sudah difix) |
| Form & input | 9/10 | ✅ min-height 44px, font 16px anti-zoom |
| Visual polish (ui-design-review) | 8/10 | ✅ Brand Lagoon, tipografi clamp, kontras WCAG |

---

## A. Platform Defects (objektif, P0–P3)

### ✅ Sudah benar (tanpa perubahan)
- `viewport-fit=cover` di index.html ✓
- `100dvh` di shell Layout ✓ (bukan `100vh` naif)
- Safe-area: `mobilePolish.css`, `EnhancedMobileBottomNav`, `EnhancedBottomSheet`, `EnhancedFAB`, `MoreMenuBottomSheet`, portal nav ✓
- `touch-action: pan-x pan-y` + `touch-action: manipulation` di tombol ✓
- Anti double-tap zoom (touchend <300ms), anti pinch-zoom, anti gesture-zoom ✓
- Bottom nav touch targets 60×52px ✓, FAB primary 56px MD3 ✓
- Input min-height 44px + font-size 16px (cegah iOS zoom) ✓
- PWA manifest lengkap (192/512/icons maskable), SW Workbox + BackgroundSync + push ✓
- `overscroll-behavior-y: none`, `-webkit-overflow-scrolling: touch` ✓

### 🔴 P1 — `100vh` di Modul Ajar (overflow di mobile)
**Status: ✅ DIPERBAIKI**
- `ModulAjarCreatorPage.tsx:737` — panel preview `h-[calc(100vh-6rem)]` → `h-[calc(100dvh-6rem)]`
- `ModulAjarForm.tsx:156` — kolom form `h-[calc(100vh-6rem)]` → `h-[calc(100dvh-6rem)]`
- Dampak: di iOS Safari, `100vh` > viewport nyata → bagian bawah form/preview terpotong di bawah browser chrome. `100dvh` menyesuaikan dengan viewport dinamis.

### 🟠 P2 — Touch target < 44px (kontrol interaktif)
**Status: ✅ DIPERBAIKI** — 11 kelompok kontrol (23 tombol interaktif) di bawah minimum 44px di-fix:

| File | Sebelum | Sesudah |
|------|---------|---------|
| `StudentsClassTabsHeader.tsx` (tombol panah scroll kelas, ×2) | `w-8 h-8` (32px) | `w-11 h-11` (44px) |
| `AttendancePage.tsx` (tombol "batal pilih semua" batch bar) | `w-7 h-7` (28px) | `w-11 h-11` (44px) |
| `AttendancePage.tsx` (chip status batch: Hadir/Sakit/Izin/Alpha/Libur) | ~30px | `min-h-[44px]` |
| `MarkdownToolbar.tsx` (tombol bold/italic/list, ×3) | `h-8 w-8` (32px) | `h-11 w-11` (44px) |
| `AnalyticsExportModal.tsx` (tombol "Pilih Semua") | `h-7` (28px) | `min-h-[44px]` |
| `GradeCompletionAnalysis.tsx` (tombol input nilai) | `h-7` (28px) | `min-h-[44px]` |
| `useToast.tsx` (tombol close toast) | `h-8 w-8` (32px) | `h-11 w-11` (44px) |
| `AttendanceClassSelector.tsx` (pill pilih kelas) | `h-9` (36px) | `min-h-[44px]` |
| `StudentFilters.tsx` (toggle grid/list, ×2) | `h-9` (36px) | `min-h-[44px]` |
| `BintangDashboardPage.tsx` (tombol aksi keaktifan/observasi/mentoring/export, ×4) | `h-9` (36px) | `min-h-[44px]` |
| `ActivityFeedWidget.tsx` (tab Aktivitas/Pengingat) | `h-9` (36px) | `min-h-[44px]` |

> Catatan: (1) `w-8 h-8`/`w-7 h-7` lain yang ditemukan scan adalah ikon **dekoratif** (avatar, badge, spinners) — bukan target sentuh — jadi sengaja tidak diubah. (2) **DatePicker/DateRangePicker** sel tanggal tetap `w-8 h-8` (32px) — **tradeoff density yang diterima sengaja**: sel kalender 44px membuat grid kalender terlalu besar; ini konvensi umum calendar picker. Naikkan bila telepon seluler guru sering salah ketuk.

### 🟡 P3 — Minor (belum diubah, rekomendasi)
- `ResponsiveChart.tsx:162` — `maxHeight: '100vh'` saat fullscreen chart (konteks fullscreen, dampak kecil)
- `BrankasPage.tsx` — `max-h-[50vh]`/`[60vh]` panel mobile (dvh lebih akurat, tapi hanya bounding box scroll)
- `GradeAdjustmentPage.tsx` — `lg:max-h-[calc(100vh-8rem)]` hanya desktop (aman)

---

## B. Design Judgments & Forks (thumb-first-design)

### Kuat
- **Tab bar 4 item + More sheet** — pola terbaik untuk 13 menu (Rausch/Platform Canon). Bottom bar per-audience (teacher vs leadership) sudah dibedakan. ✓
- **Aksi utama di thumb zone**: FAB 56px bottom-right di Dashboard, tombol "Simpan Absensi" full-width di bawah, header aksi 44px min. ✓
- **Content-as-control**: swipeable class tabs, pull-to-refresh, gesture yang punya affordance + fallback. ✓
- **Motion sebagai komunikasi**: PageTransition, active indicator pill, stagger FAB menu, haptic + sound. ✓
- **Easy Mode / aksesibilitas** sebagai fitur kelas satu (bukan afterthought). ✓

### Fork desain — perlu keputusan Anda
1. **Navigasi platform transisi**: iOS 26 (Liquid Glass, floating tab bar) dan Material 3 Expressive (nav drawer deprecated) sedang berubah. Bottom bar Anda sudah benar arahnya; monitor kedua platform, jangan terjebak pola lama.
2. **Hamburger drawer di desktop** → sidebar statis sudah benar (bukan hamburger). Di mobile, drawer sidebar hanya untuk admin/ekstra; bottom bar tetap sumber navigasi utama — keputusan yang tepat.
3. **Density vs touch di tabel nilai** (`GradeAdjustmentPage` `h-9` input): 36px adalah kompromi density-dengan-keyboard. Jika guru sering salah ketuk, naikkan ke 44px di layar < 640px.

---

## C. UI Design Review (ui-design-review)

| Dimensi | Skor | Catatan |
|---------|------|---------|
| Visual Hierarchy | 8/10 | Banner prioritas (tunggakan absensi/jurnal) jelas, CTA berbeda warna |
| Typography | 8/10 | Inter self-hosted, clamp() heading mobile, line-height 1.55 |
| Color Palette | 8/10 | Brand Lagoon kustom, gradient semantik terkonsolidasi, kontras WCAG AA |
| Spacing | 8/10 | grid 8px konsisten, `clamp()` padding kartu |
| Consistency | 8/10 | Menu registry satu sumber kebenaran, bottom bar turun dari registry |
| Component Design | 8/10 | FAB/MD3, BottomSheet, Tabs — state hover/active/focus lengkap |
| Branding | 8/10 | Lagoon (teal/indigo) di Login + Dashboard, dark mode konsisten |
| Modern Standards | 8/10 | Tanpa Web 2.0 gloss, glassmorphism halus, tidak ada carousel usang |

**Rekomendasi prioritas (belum dieksekusi):**
1. ~~Terapkan palet Lagoon ke seluruh halaman (bukan hanya Login/Dashboard pilot) — hilangkan sisa indigo default.~~ ✅ **SELESAI (2026-08-01)** via `scripts/apply-brand-palette.cjs` — aksen indigo default (button, focus ring, gradient primary, spinner, badge tint) diganti `brand-*` di seluruh src; kategori/data-viz/status tetap per-kategori. Badge brand difix kontrasnya (text-brand-600→700) via `fix-badge-contrast.cjs`.
2. Audit kontras ulang pasca-perubahan warna di halaman non-pilot.
3. Pertimbangkan `prefers-reduced-data` untuk gambar non-kritis di low-end.

---

## D. Cara Memverifikasi

```bash
npx tsc --noEmit          # type check
npx vitest run            # test suite
npm run build             # build produksi
npx lhci autorun          # Lighthouse mobile (lihat docs/A11Y_LIGHTHOUSE_RESULTS.md)
```

Test manual device rendah (Android Chrome + iOS Safari):
1. Buka Modul Ajar → pastikan form & preview tidak terpotong di bawah browser chrome.
2. Tap semua chip status batch di Absensi → target ≥ 44px, tidak salah ketuk.
3. Scroll class tabs di Data Siswa → panah 44px mudah diketuk.
4. Toast close, MarkdownToolbar (jurnal) → target 44px.
