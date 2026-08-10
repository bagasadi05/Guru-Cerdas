# Laporan Sprint — Technical Improvements & Architecture Review

**Tanggal**: 2026-08-10  
**Repo**: bagasadi05/Guru-Cerdas  

---

## Ringkasan

Sprint ini fokus pada perbaikan teknis berbasis data: bundle optimization, skeleton wiring, app shell lazy loading, architecture review, dan instalasi engineering skills dari Matt Pocock.

---

## ✅ Selesai

### 1. Bundle: Fix vendor-pdf Modulepreload Bug
**File**: `vite.config.ts`  
**Issue**: Vite over-eager mempreload `vendor-pdf` (133.8 KB gzip / 40.5% payload login) di halaman login.  
**Fix**: Tambah `build.modulePreload.resolveDependencies` filter untuk exclude `vendor-pdf`, `vendor-excel`, `vendor-canvas` dari modulepreload.  
**Impact**: Initial load dari 6 chunk → 4 chunk. Hemat 133.8 KB gzip.

### 2. Skeleton: Wire Page Skeletons ke Suspense
**File**: `src/App.tsx` + `src/components/skeletons/`  
**Issue**: Semua halaman pakai spinner generik yang sama di Suspense fallback.  
**Fix**: Bikin `RouteAwareFallback` yang mapping path prefix ke 16 page skeletons. Halaman yang belum ada skeleton (Admin, Brankas, Pemulihan, Bintang, Modul Ajar, Ekstrakurikuler) dibuatkan skeleton baru.  
**Files**: `PageSkeletons.tsx` (+260 lines), `index.ts`, `App.tsx`

### 3. App Shell: Lazy-load Non-critical Overlays
**File**: `src/components/Layout.tsx`  
**Fix**: `OnboardingTour` dan `TutorialPicker` di-lazy-load dengan `React.lazy()` + `<Suspense fallback={null}>`. UI overlay deferred sampai interaksi pertama.  
**Keep static**: `PullToRefresh` (core UI shell), `UploadProgressIndicator`, `InteractiveTutorialProvider`.

### 4. Component: Extract BatchFillInput
**File**: `src/components/ui/BatchFillInput.tsx` (NEW), `Step2_StudentList.tsx` (MODIFY)  
**Fix**: Komponen inline 40-line di-extract ke UI primitives, reusable untuk mass input / grade input / quiz input.

### 5. Infrastructure: Matt Pocock Skills + Agent Config
**Install**: 35 engineering skills via `npx skills add mattpocock/skills`  
**Konfigurasi**:  
- Issue tracker → GitHub Issues (`docs/agents/issue-tracker.md`)
- Triage labels → default canonical (`docs/agents/triage-labels.md`)
- Domain docs → single-context (`docs/agents/domain.md`)
- CLAUDE.md updated dengan `## Agent skills` block

### 6. Architecture Review
**Output**: `%TEMP%/architecture-review-portal-guru.html` — 4 kandidat deepening:
1. **Strong**: Decompose `useAttendance` God Hook (582 lines, 40+ returns)
2. **Strong**: Extract `useModulAjarWorkflow` (887-line page)
3. **Worth Exploring**: Extract `BatchFillInput` ✅ (COMPLETED)
4. **Speculative**: Consolidate academic record deduplication

---

## ⚠️ Skip / Belum

| Item | Alasan |
|------|--------|
| **Decompose useAttendance** | Mutation closure coupling ke local state terlalu kuat. Split butuh refactor interface AttendancePage (70+ destructured values). Perlu integration test coverage dulu. |
| **Extract ModulAjarCreatorPage** | 887-line page dengan 6 AI field generators inline. Terlalu berisiko tanpa test coverage. Butuh integration test dulu. |
| **App shell: PullToRefresh lazy** | Wraps `children`, harus statis. |
| **TypeScript error cleanup** | ROADMAP claims ~92 errors, PROJECT_CLOSURE claims 0 `tsc --noEmit` green. Need verification. |

---

## 📊 Metric

| Metric | Before | After |
|--------|--------|-------|
| Initial load chunks | 6 | 4 |
| `vendor-pdf` in login | 133.8 KB gzip | 0 KB (removed) |
| Pages without skeleton | 6 | 0 |
| Non-critical overlays static | 2 | 0 (both lazy) |
| Installed engineering skills | 0 | 35 |

---

## 📁 Files Changed

| File | Type | Description |
|------|------|-------------|
| `vite.config.ts` | MODIFY | modulePreload filter |
| `src/App.tsx` | MODIFY | Route-aware skeleton fallback + 16 mappings |
| `src/components/Layout.tsx` | MODIFY | Lazy OnboardingTour + TutorialPicker |
| `src/components/skeletons/PageSkeletons.tsx` | MODIFY | 6 new page skeletons |
| `src/components/skeletons/index.ts` | MODIFY | Export 6 new skeletons |
| `src/components/ui/BatchFillInput.tsx` | NEW | Extracted UI primitive |
| `src/components/pages/mass-input/components/Step2_StudentList.tsx` | MODIFY | Import BatchFillInput |
| `src/components/attendance/useAttendance.ts` | MODIFY | Cleaned up formatting, no logic change |
| `docs/agents/issue-tracker.md` | NEW | GitHub Issues config |
| `docs/agents/triage-labels.md` | NEW | Triage label vocabulary |
| `docs/agents/domain.md` | NEW | Domain docs layout |
| `CLAUDE.md` | MODIFY | Agent skills block |
| `skills-lock.json` | NEW | Matt Pocock skills manifest |
| `.claude/skills/` (35 dirs) | NEW | Skill symlinks to `.agents/skills/` |
