#!/usr/bin/env node
/**
 * consolidate-gradients.cjs
 * ────────────────────────
 * Konsolidasi 126 kombinasi gradient unik (from-X to-Y) menjadi ~12 gradient
 * semantik: primary / success / warning / danger / info + varian tint (50-100)
 * dan neutral (dark/soft). Selaras dengan definisi semantic gradient di
 * src/styles/designTokens.ts (success/warning/danger/info) dan pemakaian
 * dominant di src (primary = from-indigo-600 to-purple-600).
 *
 * Aturan migrasi:
 *  1. Hanya menyentuh pasangan 2-stop LIGHT (tanpa dark:, tanpa opacity, tanpa !).
 *  2. Pair dalam satu family warna → kanon family (solid jika shade >= 400,
 *     tint jika shade <= 100).
 *  3. Pair campuran family → override eksplisit (MIXED) atau DI-SKIP.
 *  4. File data-viz / status-map / theme-picker DI-SKIP: gradient di sana
 *     meng-encode makna per-kategori dan TIDAK boleh diratakan.
 *  5. Gradient via (3-stop) → peta eksplisit, sisanya dipertahankan.
 *
 * Penggunaan:
 *   node scripts/consolidate-gradients.cjs            # DEFAULT: dry-run (aman)
 *   node scripts/consolidate-gradients.cjs --apply    # tulis perubahan
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// Aman: tanpa argumen = dry-run. Menulis HANYA dengan --apply eksplisit.
const DRY_RUN = !process.argv.includes('--apply');

/* ─────────────────────────── Kanon semantik ─────────────────────────── */
// solid = gradient kuat (button/header/chip), tint = background lembut
const FAMILIES = {
  primary: {
    hues: ['indigo', 'purple', 'violet', 'fuchsia'],
    solid: 'from-indigo-600 to-purple-600',
    tint: 'from-indigo-50 to-purple-50',
  },
  success: {
    hues: ['emerald', 'teal', 'green', 'lime'],
    solid: 'from-emerald-500 to-emerald-600',
    tint: 'from-emerald-50 to-teal-50',
  },
  warning: {
    hues: ['amber', 'orange', 'yellow'],
    solid: 'from-amber-500 to-orange-600',
    tint: 'from-amber-50 to-orange-50',
  },
  danger: {
    hues: ['red', 'rose', 'pink'],
    solid: 'from-rose-500 to-red-600',
    tint: 'from-red-50 to-rose-50',
  },
  info: {
    hues: ['sky', 'blue', 'cyan'],
    solid: 'from-blue-500 to-cyan-600',
    tint: 'from-sky-50 to-blue-50',
  },
  neutral: {
    hues: ['slate', 'gray', 'zinc'],
    dark: 'from-slate-900 to-slate-800',
    soft: 'from-slate-100 to-slate-200',
  },
};

// Pair campuran family → family tujuan (tint/solid tetap ditentukan shade).
const MIXED = {
  'purple|blue': 'primary', // purple→blue: brand
  'fuchsia|pink': 'primary',
  'purple|pink': 'primary',
  'blue|indigo': 'info',
  'sky|emerald': 'info',
  'teal|cyan': 'info',
  'red|orange': 'danger',
  'red|amber': 'danger',
  'rose|amber': 'danger',
  'rose|orange': 'danger',
  'pink|rose': 'danger',
  'orange|rose': 'danger',
  'lime|emerald': 'success',
  'slate|emerald': 'neutral', // bg halaman slate→emerald tint
  'indigo|emerald': 'primary', // tombol aksi utama brand→success
  'amber|rose': 'warning', // progress bar peringatan
  'orange|red': 'danger', // status Alpha (oranye→merah)
  'indigo|blue': 'primary', // brand indigo→blue (hanya di file skip)
};

// Via (3-stop): peta eksplisit. Yang tidak ada di peta dipertahankan.
const VIA_MAP = {
  'from-green-600 via-emerald-600 to-green-700': 'from-emerald-600 via-teal-600 to-emerald-700',
  'from-emerald-500 via-teal-500 to-emerald-600': 'from-emerald-600 via-teal-600 to-emerald-700',
  'from-emerald-400 via-teal-500 to-emerald-600': 'from-emerald-600 via-teal-600 to-emerald-700',
  'from-emerald-400 via-teal-500 to-emerald-400': 'from-emerald-600 via-teal-600 to-emerald-700',
  // kanon (no-op): indigo-600 via-purple-600 to-indigo-700, slate-900 via-slate-800
  //   to-slate-900, amber-50 via-orange-50 to-yellow-50, emerald-600 via-teal-600 to-emerald-700
  // skip (spesial): gray-200 skeleton, green-950 dark hero, amber-400 via-orange-500
  //   to-red-500 (reward), amber-400 via-amber-500 to-orange-500
};

/* ─────────────────── File yang DI-SKIP (data makna) ─────────────────── */
// Gradient di file ini meng-encode makna per-kategori (status, grade band,
// theme picker, kategori) — konsolidasi akan merusak legibility-nya.
const SKIP_FILES = new Set([
  'src/components/pages/SettingsPage.tsx', // theme picker (fitur pilihan warna)
  'src/components/settings/AppearanceSection.tsx', // palette aksen (fitur)
  'src/styles/designTokens.ts', // definisi token semantik itu sendiri
  'src/constants.tsx', // status attendance maps
  'src/components/pages/portal/PortalMoreTab.tsx', // peta kategori (akademik/perilaku/...)
  'src/services/gamificationService.ts', // peta level
  'src/hooks/useDashboardStats.ts', // peta status
  'src/components/ui/GradeDistributionChart.tsx', // legend grade band
  'src/components/ui/GradeTrendChart.tsx', // warna grade band
  'src/components/pages/student-detail/child-development/components/SubjectPerformanceChart.tsx', // warna subject
  'src/components/dashboard/InteractiveAttendanceChart.tsx', // data viz
  'src/components/pages/student/StudentAnalyticsTab.tsx', // data viz
  'src/components/pages/analytics/OverviewTab.tsx', // data viz
  'src/components/pages/analytics/AttendanceTab.tsx', // legend data viz
  'src/components/dashboard/ClassAnalyticsSection.tsx', // data viz
  'src/components/dashboard/AttendanceStatsWidget.tsx', // status map
  'src/components/dashboard/StatsGrid.tsx', // status map
  'src/components/dashboard/SchoolStatsGrid.tsx', // status map
  'src/components/attendance/AttendanceStreakIndicator.tsx', // peta streak level
  'src/components/EmptyStates.tsx', // tint ilustrasi per-state
  'src/components/pages/admin/components.tsx', // peta warna kategori admin
]);

/* ─────────────────────────── Helpers ─────────────────────────── */
const TWO_RE = /from-([a-z]+)-(\d+) ?to-([a-z]+)-(\d+)/g;
const VIA_RE = /from-([a-z]+)-(\d+) via-([a-z]+)-(\d+) to-([a-z]+)-(\d+)/g;

function familyOf(hue) {
  for (const name of Object.keys(FAMILIES)) {
    if (FAMILIES[name].hues.includes(hue)) return FAMILIES[name];
  }
  return null;
}

/** Map 2-stop pair → canon string, atau null bila tidak ada mapping. */
// fromCls/toCls berbentuk 'hue-shade' (mis. 'indigo-600'); split('-') → [hue, shade].
function mapPair(fromCls, toCls) {
  const fh = fromCls.split('-')[0];
  const th = toCls.split('-')[0];
  const fs = parseInt(fromCls.split('-')[1], 10);
  const ts = parseInt(toCls.split('-')[1], 10);

  const fa = familyOf(fh);
  const fb = familyOf(th);

  let fam = null;
  if (fa && fa === fb) fam = fa;
  else if (MIXED[`${fh}|${th}`]) fam = FAMILIES[MIXED[`${fh}|${th}`]];
  if (!fam) return null;

  const tint = fs <= 100 && ts <= 100;
  if (fam === FAMILIES.neutral) return fs >= 500 || ts >= 500 ? fam.dark : fam.soft;
  return tint ? fam.tint : fam.solid;
}

/** Kumpulkan semua file .ts/.tsx di bawah dir, tanpa node_modules. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

/* ─────────────────────────── Eksekusi ─────────────────────────── */
const files = walk(SRC);
const stats = {
  filesScanned: files.length,
  filesChanged: 0,
  pairsChanged: 0,
  viaChanged: 0,
  unmapped: new Map(), // pair → jumlah (untuk audit)
  before: { total: 0, unique: 0 },
  after: { total: 0, unique: 0 },
};

const beforePairs = new Map(); // pair → count (semua file, untuk audit global)
const afterPairs = new Map();

// Kunci pair dinormalisasi tanpa prefix 'from-' → 'hue-shade to hue-shade'.
function countPairs(content, map) {
  const re = /from-([a-z]+)-(\d+) ?to-([a-z]+)-(\d+)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const key = `${m[1]}-${m[2]} to ${m[3]}-${m[4]}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
}

for (const file of files) {
  const r = rel(file);
  const content = fs.readFileSync(file, 'utf8');

  // Hitung sebelum (global, termasuk skip files untuk laporan)
  countPairs(content, beforePairs);

  if (SKIP_FILES.has(r)) continue;

  let next = content;
  const perFile = { changed: 0, via: 0 };

  next = next.replace(VIA_RE, (match) => {
    const canon = VIA_MAP[match];
    if (canon && canon !== match) {
      perFile.via++;
      return canon;
    }
    return match;
  });

  next = next.replace(TWO_RE, (match, fh, fs, th, ts) => {
    const fromCls = `${fh}-${fs}`;
    const toCls = `${th}-${ts}`;
    const canon = mapPair(fromCls, toCls);
    if (canon && canon !== match) {
      perFile.changed++;
      return canon;
    }
    if (!canon) {
      const pair = `${fromCls} to ${toCls}`;
      stats.unmapped.set(pair, (stats.unmapped.get(pair) || 0) + 1);
    }
    return match;
  });

  if (next !== content) {
    stats.filesChanged++;
    stats.pairsChanged += perFile.changed;
    stats.viaChanged += perFile.via;
    if (DRY_RUN) {
      console.log(`\n[${r}] ${perFile.changed} pair, ${perFile.via} via`);
      // Tampilkan diff per baris
      const a = content.split('\n');
      const b = next.split('\n');
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
          const trim = (s) => (s || '').trim().slice(0, 160);
          if (a[i] && b[i]) {
            console.log(`  - ${trim(a[i])}`);
            console.log(`  + ${trim(b[i])}`);
          } else if (a[i]) {
            console.log(`  - ${trim(a[i])}  (hapus)`);
          } else {
            console.log(`  + ${trim(b[i])}  (tambah)`);
          }
        }
      }
    } else {
      fs.writeFileSync(file, next);
    }
  }

  // Hitung sesudah (file yang diproses)
  countPairs(next, afterPairs);
}

// Hitung sesudah untuk file yang di-skip (tidak berubah)
for (const file of files) {
  if (!SKIP_FILES.has(rel(file))) continue;
  countPairs(fs.readFileSync(file, 'utf8'), afterPairs);
}

stats.before.total = [...beforePairs.values()].reduce((s, v) => s + v, 0);
stats.before.unique = beforePairs.size;
stats.after.total = [...afterPairs.values()].reduce((s, v) => s + v, 0);
stats.after.unique = afterPairs.size;

/* ─────────────────────────── Laporan ─────────────────────────── */
console.log('\n' + '='.repeat(64));
console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (tidak menulis)' : 'APPLY'}`);
console.log(`File dipindai: ${stats.filesScanned}`);
console.log(`File berubah: ${stats.filesChanged}`);
console.log(`Pair diganti: ${stats.pairsChanged}`);
console.log(`Via diganti: ${stats.viaChanged}`);
console.log(
  `Unique pair: ${stats.before.unique} (${stats.before.total} total) → ${stats.after.unique} (${stats.after.total} total)`
);

if (stats.unmapped.size > 0) {
  console.log('\n⚠️  PAIR TANPA MAPPING (dipertahankan, perlu audit):');
  for (const [pair, count] of stats.unmapped) {
    console.log(`  ${count}x  ${pair}`);
  }
} else {
  console.log('\n✅ Semua pair ter-mapping (tidak ada yang jatuh tanpa canon).');
}

// Tabel konsolidasi unik untuk audit visual
console.log('\n=== RINGKASAN KONSOLIDASI (unique sebelum → sesudah) ===');
const beforeList = [...beforePairs.keys()].sort();
const changedPairs = [];
const nullPairs = [];
// CATATAN: canon memakai 'to-hue-shade' (tanpa spasi) — bandingkan dengan
// `to-${t}` (hyphen), bukan `to ${t}` (spasi), agar pair yang sudah kanon
// tidak salah terhitung sebagai "berubah".
for (const p of beforeList) {
  const [f, t] = p.split(' to ');
  const canon = mapPair(f, t);
  if (!canon) nullPairs.push(p);
  else if (canon !== `from-${f} to-${t}`) changedPairs.push(`${p} → ${canon}`);
}
const keptCanon = beforeList.filter((p) => {
  const [f, t] = p.split(' to ');
  return mapPair(f, t) === `from-${f} to-${t}`;
});
console.log(`Pair berubah: ${changedPairs.length}`);
console.log(`Pair sudah kanon: ${keptCanon.length}`);
console.log(`Pair dipertahankan (tanpa mapping): ${nullPairs.length}`);
if (nullPairs.length > 0) {
  console.log('\n⚠️  PAIR NULL (tidak punya mapping — termasuk dari file yang di-skip):');
  for (const p of nullPairs) console.log(`  ${p}`);
}

if (DRY_RUN) {
  console.log('\n(DRY-RUN selesai — jalankan dengan --apply untuk menulis perubahan)');
}
