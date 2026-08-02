#!/usr/bin/env node
/**
 * apply-brand-palette.cjs — migrasi palet brand LAGUNA (teal) ke seluruh app.
 *
 * Mengganti aksen indigo DEFAULT (Tailwind `indigo-*` + pasangan gradient
 * `from-indigo-600 to-purple-600`) dengan token `brand-*` — kelanjutan dari
 * pilot LoginPage/DashboardPage. Skala brand (50–950) sudah ada di
 * tailwind.config.cjs & src/styles/designTokens.ts.
 *
 * PRINSIP (selaras docs/DESIGN_STANDARDS.md):
 *   - ACCENT indigo (button, focus ring, spinner, link, badge tint, gradient
 *     primary)  →  brand.
 *   - KATEGORI/STATUS/DATA-VIZ (attendance status, warna mapel, peran,
 *     entity trash, chart series, streak level, template color, error type,
 *     dll)  TETAP  per-kategori — TIDAK diratakan (file di SKIP_FILES).
 *   - Purple/violet hanya diubah bila ia bagian dari pasangan gradient aksen
 *     indigo→purple ATAU aksen UI terisolasi (FAB, pill terpilih, icon AI) —
 *     bukan warna semantik/kategori.
 *
 * Mapping inti:
 *   indigo-N       → brand-N (catch-all, semua konteks: bg/text/border/ring/
 *                     shadow/focus/dark/hover/group-hover + gradient stop)
 *   bg-indigo-500 (solid) → bg-brand-600  (brand-500 3.2:1 gagal utk teks putih;
 *                     brand-600 4.65:1 lulus) — varian /opacity tetap brand-500.
 *   Pasangan gradient aksen:
 *     from-indigo-600 to-purple-600          → from-brand-600 to-brand-700
 *     from-indigo-600 via-purple-600 to-indigo-700 → from-brand-600 via-brand-700 to-brand-800
 *     from-indigo-50  to-purple-50           → from-brand-100 to-brand-200 (tint)
 *     dark:/hover: varian ikut di-raise satu anak tangga (brand-500→600 dst)
 *   Hex CSS (focus outline, glow, GreetingRobot SVG) → brand-500/600/700.
 *
 * Usage:
 *   node scripts/apply-brand-palette.cjs            # DRY-RUN (default, aman)
 *   node scripts/apply-brand-palette.cjs --apply    # tulis perubahan
 *   node scripts/apply-brand-palette.cjs --json     # ringkasan terstruktur
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, blankComments } = require('./audit-lib.cjs');

const SRC = path.join(ROOT, 'src');
const DRY_RUN = !process.argv.includes('--apply');
const asJson = process.argv.includes('--json');

/* ─────────── File KATEGORI: indigo/purple/violet adalah warna per-kategori
 * (status attendance, warna mapel, peran, entity, chart, streak, template,
 * error type, dsb). TIDAK dimigrasi — standar: data-viz & status maps tetap
 * per-kategori. ─────────── */
const SKIP_FILES = new Set([
  // Status absensi (aplikasi Indonesia: Libur = purple)
  'src/constants.tsx',
  'src/components/attendance/AttendanceStreakIndicator.tsx', // tier streak (data-viz)
  'src/components/pages/extracurricular/AttendanceTab.tsx',
  'src/components/pages/extracurricular/GradesTab.tsx',
  'src/components/pages/extracurricular/MembersTab.tsx',
  // Warna mapel / jadwal
  'src/utils/scheduleUtils.ts',
  'src/components/schedule/WeeklyScheduleView.tsx',
  // Kartu stat dashboard (per-kartu tone)
  'src/components/dashboard/StatsGrid.tsx',
  'src/components/dashboard/SchoolStatsGrid.tsx',
  'src/hooks/useDashboardStats.ts',
  'src/components/dashboard/DashboardSummaryCards.tsx',
  // Gamifikasi / achievement / aktivitas
  'src/services/gamificationService.ts',
  'src/lib/achievementMeta.ts',
  // Aspect meta Bintang: warna per-aspek (Adab=indigo/amber/teal) — dites
  'src/components/pages/bintang/bintangConstants.ts',
  'src/components/dashboard/RecentActivityTimeline.tsx',
  'src/components/gamification/RewardPointsCard.tsx',
  // Entity / peran / kategori
  'src/components/pages/trash/hooks/useTrashData.tsx',
  'src/components/pages/admin/components.tsx',
  'src/components/pages/ActionHistoryPage.tsx', // warna tipe aktivitas
  'src/components/SearchSystem.tsx', // tipe hasil
  'src/components/feedback-system/ProgressIndicator.tsx', // varian warna
  'src/components/feedback-system/ConfirmAction.tsx', // varian severity
  'src/components/ui/ThemeToggle.tsx', // theme picker
  // Template / preset (warna per-template)
  'src/components/attendance/QuickTemplatesModal.tsx',
  'src/components/attendance/QuickTemplatesDropdown.tsx',
  'src/components/attendance/QuickTemplateIcons.tsx',
  'src/components/attendance/QuickNotePresets.tsx',
  // Chart series (data-viz)
  'src/components/pages/analytics/OverviewTab.tsx',
  'src/components/pages/portal/PortalMoreTab.tsx',
  'src/components/pages/student/ReportsTab.tsx', // timeline multicolor
  // Sudah brand (pilot)
  'src/components/pages/LoginPage.tsx',
  'src/components/pages/DashboardPage.tsx',
  'src/components/dashboard/DashboardGreeting.tsx',
]);

/* ─────────── Aturan migrasi (diurutkan: paling spesifik dulu) ───────────
 * Tiap entry: [RegExp, replacement-string-dengan-$1..$n].
 * Diterapkan ke SEMUA file non-skip, berurutan (line-based via blankComments).
 */
const RULES = [
  // ── 1. Pasangan gradient aksen (indigo + purple/violet) ──
  // 3-stop primary
  [/from-indigo-600\s+via-purple-600\s+to-indigo-700/g, 'from-brand-600 via-brand-700 to-brand-800'],
  // 2-stop solid utama + varian hover
  [/from-indigo-600\s+to-purple-700/g, 'from-brand-600 to-brand-800'],
  [/from-indigo-600\s+to-purple-600/g, 'from-brand-600 to-brand-700'],
  [/from-indigo-500\s+to-purple-600/g, 'from-brand-600 to-brand-700'],
  [/from-indigo-600\s+to-violet-600/g, 'from-brand-600 to-brand-700'],
  [/from-indigo-500\s+to-violet-500/g, 'from-brand-500 to-brand-600'],
  // hover varian
  [/hover:from-indigo-700\s+hover:to-purple-700/g, 'hover:from-brand-700 hover:to-brand-800'],
  [/hover:from-indigo-700\s+hover:to-violet-700/g, 'hover:from-brand-700 hover:to-brand-800'],
  [/hover:from-indigo-600\s+hover:to-purple-700/g, 'hover:from-brand-600 hover:to-brand-800'],
  [/hover:from-indigo-600\s+hover:to-violet-600/g, 'hover:from-brand-600 hover:to-brand-700'],
  [/hover:from-indigo-600\s+hover:to-purple-600/g, 'hover:from-brand-600 hover:to-brand-700'],
  [/hover:from-indigo-500\s+hover:to-purple-500/g, 'hover:from-brand-600 hover:to-brand-700'],
  // dark varian (1-stop naik dari pasangan light)
  [/dark:from-indigo-400\s+dark:to-violet-400/g, 'dark:from-brand-400 dark:to-brand-500'],
  [/dark:from-indigo-500\s+dark:to-purple-500/g, 'dark:from-brand-500 dark:to-brand-600'],
  [/dark:from-indigo-500\/20\s+dark:to-purple-500\/20/g, 'dark:from-brand-500/20 dark:to-brand-600/20'],
  [/dark:from-indigo-500\/30\s+dark:to-violet-500\/30/g, 'dark:from-brand-500/30 dark:to-brand-600/30'],
  [/dark:from-indigo-900\/20\s+dark:to-purple-900\/20/g, 'dark:from-brand-900/20 dark:to-brand-900/20'],
  [/dark:from-indigo-900\/50\s+dark:to-violet-900\/50/g, 'dark:from-brand-900/50 dark:to-brand-900/50'],
  [/dark:from-indigo-950\/30\s+dark:to-purple-950\/30/g, 'dark:from-brand-950/30 dark:to-brand-950/30'],
  [/dark:from-purple-900\/20\s+dark:to-indigo-900\/20/g, 'dark:from-brand-900/20 dark:to-brand-900/20'],
  [/dark:from-purple-900\/20\s+dark:to-blue-900\/20/g, 'dark:from-brand-900/20 dark:to-blue-900/20'],
  [/dark:from-purple-950\/10\s+dark:to-blue-950\/10/g, 'dark:from-brand-950/10 dark:to-blue-950/10'],
  // tint 2-stop
  [/from-indigo-50\s+to-purple-50/g, 'from-brand-100 to-brand-200'],
  [/from-indigo-500\/10\s+to-purple-500\/10/g, 'from-brand-500/10 to-brand-600/10'],
  [/from-indigo-500\/20\s+to-purple-500\/20/g, 'from-brand-500/20 to-brand-600/20'],
  [/from-indigo-500\/20\s+to-violet-500\/20/g, 'from-brand-500/20 to-brand-600/20'],
  // via stops purple/violet di tengah aksen
  [/via-purple-500\/60/g, 'via-brand-600/60'],
  [/via-purple-400\/50/g, 'via-brand-500/50'],
  // hover menyimpang (fuchsia/pink/emerald/blue = slop) → brand konsisten
  [/hover:from-fuchsia-700\s+hover:to-pink-700/g, 'hover:from-brand-700 hover:to-brand-800'],
  [/hover:from-indigo-600\s+hover:to-emerald-600/g, 'hover:from-brand-600 hover:to-brand-700'],
  [/hover:from-purple-700\s+hover:to-blue-700/g, 'hover:from-brand-700 hover:to-brand-800'],

  // ── 2. Aksen UI purple/violet terisolasi (bukan kategori) ──
  // FAB mobile: dark mode → brand (light mode sudah sky)
  [/dark:bg-purple-600\s+dark:hover:bg-purple-700\s+dark:active:bg-purple-800/g, 'dark:bg-brand-600 dark:hover:bg-brand-700 dark:active:bg-brand-800'],
  [/dark:focus:ring-purple-500/g, 'dark:focus:ring-brand-500'],
  // dark: gradient teks aksen (AccountSection) — pasangan indigo-400→purple-400
  [/dark:from-indigo-400\s+dark:to-purple-400/g, 'dark:from-brand-400 dark:to-brand-500'],
  // Pill filter terpilih (mass-input)
  [/bg-purple-500\s+text-white/g, 'bg-brand-600 text-white'],
  [/bg-purple-600\s+text-white\s+shadow-md\s+shadow-purple-500\/20/g, 'bg-brand-600 text-white shadow-md shadow-brand-600/20'],
  // Judul AI analysis (SchedulePage, dark bg)
  [/text-purple-300/g, 'text-brand-300'],
  // Icon AI (portal / export modal)
  [/text-violet-500/g, 'text-brand-500'],
  // Border tint di kartu child-development (kategori? tint saja → brand)
  [/border-purple-200\s+dark:border-purple-800/g, 'border-brand-200 dark:border-brand-800'],
  [/border-purple-200\/50\s+dark:border-purple-900\/50/g, 'border-brand-200/50 dark:border-brand-900/50'],

  // ── 3. bg-indigo-500 SOLID (tanpa /opacity) → brand-600 (lulus teks putih) ──
  [/bg-indigo-500(?![\/\w-])/g, 'bg-brand-600'],
  // Shadow glow tombol → brand-600 (selaras FAB pilot shadow-brand-600/30)
  [/shadow-indigo-500/g, 'shadow-brand-600'],

  // ── 3b. Proteksi warna kartu (data-viz): glow kartu biru tetap keluarga biru ──
  // (QuickActionCards 'Input Nilai': icon biru → glow biru-indigo adalah pasangan
  //  keluarga biru; indigo di sini = partner gelap blue, bukan aksen default.)
  [/from-blue-400\/20\s+to-indigo-400\/20/g, 'from-blue-400/20 to-blue-600/20'],

  // ── 4. Catch-all: semua token indigo-N lainnya → brand-N ──
  [/indigo-(\d+)/g, 'brand-$1'],
];

/* ─────────── Hex CSS / SVG (di luar class Tailwind) ─────────── */
const HEX_RULES = [
  [/rgba\(99, 102, 241, /g, 'rgba(13, 126, 158, '],   // indigo-500 → brand-600
  [/rgba\(99,102,241,/g, 'rgba(13,126,158,'],
  [/rgba\(168, 85, 247, /g, 'rgba(23, 156, 185, '],   // purple-500 → brand-500
  [/#6366F1/g, '#179cb9'],   // indigo-500 → brand-500 (SVG gradient robot)
  [/#6366f1/g, '#0d7e9e'],   // indigo-500 → brand-600 (focus outline CSS)
  [/#8b5cf6/g, '#11657f'],   // violet-500 → brand-700 (gradient CSS)
  [/#3730a3/g, '#135268'],   // indigo-800 → brand-800
  [/#312e81/g, '#134457'],   // indigo-900 → brand-900
  [/#4338ca/g, '#11657f'],   // indigo-700 → brand-700
  [/#a855f7/g, '#38b9d4'],   // purple-500 → brand-400
  [/#9333ea/g, '#0d7e9e'],   // purple-600 → brand-600
  [/#7c3aed/g, '#0d7e9e'],   // violet-600 → brand-600
];

/* ─────────── Walk src ─────────── */
function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

// File test di src (fixtures literals indigo yg meng-assert komponen kategori
// yang memang di-skip, mis. StatCard/role badge admin) — jangan disentuh.
function isTestFile(r) {
  return r.includes('.test.') || r.includes('__tests__') || r.includes('.spec.');
}

function migrateContent(content, isCss) {
  // Proses per-baris dengan komentar di-blank (panjang tetap → index selaras)
  // supaya token di dalam komentar tidak ikut ter-edit.
  const lines = content.split('\n');
  let changed = 0;
  const next = lines
    .map((line) => {
      const src = blankComments(line);
      let out = line;
      // Hex indigo/purple/violet dipakai di CSS (focus outline, glow) DAN di
      // SVG GreetingRobot.tsx (stopColor) — jalankan untuk semua tipe file;
      // daftar hex sempit (keluarga indigo/purple/violet saja) → aman.
      for (const [re, to] of HEX_RULES) {
        if (re.test(src)) {
          out = out.replace(re, to);
        }
      }
      if (!isCss) {
        for (const [re, to] of RULES) {
          if (re.test(src)) {
            out = out.replace(re, to);
          }
        }
      }
      if (out !== line) changed++;
      return out;
    })
    .join('\n');
  return { next, changed };
}

/* ─────────── Eksekusi ─────────── */
const files = walkSrc(SRC);
const stats = { filesScanned: files.length, filesChanged: 0, linesChanged: 0 };
const perFile = [];

for (const file of files) {
  const r = rel(file);
  if (SKIP_FILES.has(r) || isTestFile(r)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const { next, changed } = migrateContent(content, file.endsWith('.css'));
  if (next !== content) {
    stats.filesChanged++;
    stats.linesChanged += changed;
    perFile.push({ file: r, lines: changed });
    if (DRY_RUN) {
      console.log(`[${r}] ${changed} baris`);
    } else {
      fs.writeFileSync(file, next);
    }
  }
}

/* ─────────── Laporan ─────────── */
if (asJson) {
  console.log(JSON.stringify({
    mode: DRY_RUN ? 'dry-run' : 'apply',
    filesScanned: stats.filesScanned,
    filesChanged: stats.filesChanged,
    linesChanged: stats.linesChanged,
    skippedFiles: SKIP_FILES.size,
    files: perFile.sort((a, b) => b.lines - a.lines),
  }, null, 2));
} else {
  console.log('='.repeat(64));
  console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (tidak menulis)' : 'APPLY'}`);
  console.log(`File dipindai: ${stats.filesScanned}`);
  console.log(`File berubah: ${stats.filesChanged}`);
  console.log(`Baris diubah: ${stats.linesChanged}`);
  console.log(`File di-skip (kategori/status/data-viz): ${SKIP_FILES.size}`);
  console.log('\n=== FILE TERUBAH (terbesar dulu) ===');
  for (const f of perFile.sort((a, b) => b.lines - a.lines)) {
    console.log(`  ${String(f.lines).padStart(4)}  ${f.file}`);
  }
  if (DRY_RUN) {
    console.log('\n(DRY-RUN selesai — jalankan dengan --apply untuk menulis)');
  }
}

process.exit(0);
