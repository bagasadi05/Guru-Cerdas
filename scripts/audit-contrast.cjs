#!/usr/bin/env node
/**
 * Audit: kontras WCAG (rasio 4.5:1 teks normal / 3:1 teks besar).
 *
 * Memindai pola yang paling sering gagal kontras:
 *   1. `text-gradient-primary` — probe definisi CSS + pemakaian (kalau tidak
 *      ada: kelas mati yang sudah dibersihkan dari docs — bukan masalah
 *      kontras aktual).
 *   2. Badge/chip `bg-<hue>-50/100` + `text-<hue>-<shade>` (pola
 *      `bg-X-100 text-X-600` biasanya jatuh ~4.0:1 → GAGAL).
 *   3. Teks putih di gradient (`from-* to-* text-white`) — stop TERsurаm
 *      (paling kritis). Dark-mode stop di-skip (lebih gelap → kontras naik).
 *   4. Gradient text (`bg-clip-text text-transparent`) — vs putih (light).
 *
 * Ketelitian token: token ber-prefix (`dark:`, `hover:`, `group-hover:`) TIDAK
 * dihitung sebagai pasangan badge/stops, sehingga baris yang punya varian
 * `dark:` tetap dievaluasi bagian light-nya (bukan dibuang utuh). Modifier
 * non-warna (`bg-opacity-50`) di-exclude. Komentar di-blank (blankComments).
 *
 * Output: pola GAGAL + jumlah + saran perbaikan, ringkasan LULUS, probe
 * text-gradient-primary. Exit 1 bila ada yang gagal 4.5:1 (CI gate).
 *
 * Usage: node scripts/audit-contrast.cjs [--json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, blankComments } = require('./audit-lib.cjs');

const SRC = path.join(ROOT, 'src');
const asJson = process.argv.includes('--json');

/* ─────────── Palet Tailwind v3 (hue → shade → hex) — subset terpakai ─────────── */
const C = {
  white: '#ffffff', black: '#000000',
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
  lime: { 50: '#f7fee7', 100: '#ecfccb', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
  fuchsia: { 100: '#fae8ff', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf' },
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
  zinc: { 100: '#f4f4f5', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46' },
  stone: { 100: '#f5f5f4', 500: '#78716c' },
  neutral: { 100: '#f5f5f5', 500: '#737373', 600: '#525252', 700: '#404040' },
  brand: { 50: '#eefbfd', 100: '#d0f3f9', 200: '#a5e8f2', 300: '#6cd4e4', 400: '#38b9d4', 500: '#179cb9', 600: '#0d7e9e', 700: '#11657f', 800: '#135268', 900: '#134457', 950: '#0a2b3a' },
};

// Modifier non-warna yang kebetulan berbentuk `bg-X-<angka>` (legacy Tailwind).
const BG_MODIFIERS = new Set(['opacity', 'origin', 'position', 'size', 'attachment', 'repeat', 'clip', 'blend']);

/* ─────────── WCAG contrast ─────────── */
function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function hexOf(hue, shade) {
  return C[hue] && C[hue][shade] ? C[hue][shade] : null;
}

/* ─────────── Token helpers ─────────── */
// Token `text-...`/`from-...` yang didahului prefix `hover:`/`dark:`/`group-hover:`
// bukan bagian state/varian yang sedang diaudit (dark = kontras naik, hover =
// bukan warna statis). Cek: teks sebelum index berakhir dengan `\w-*:`.
function hasPrefix(line, index) {
  return /[\w-]+:\s*$/.test(line.slice(0, index));
}

// Semua stop gradient (from/via/to) tanpa prefix → [{hue, shade}]
function stopsOf(line) {
  const out = [];
  for (const m of line.matchAll(/\b(?:from|via|to)-([a-z]+)-(\d+)/g)) {
    if (!hasPrefix(line, m.index)) out.push({ hue: m[1], shade: Number(m[2]) });
  }
  return out;
}

// Cek apakah `text-white` muncul TANPA prefix (bukan dark:text-white)
function hasUnprefixedWhiteText(line) {
  for (const m of line.matchAll(/\btext-white\b/g)) {
    if (!hasPrefix(line, m.index)) return true;
  }
  return false;
}

/* ─────────── Scan ─────────── */
function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walkSrc(SRC);
const badgePairs = new Map(); // 'bg-X-100 text-X-600' → count
const gradWhite = new Map(); // 'from-X-600 to-Y-600' → { count, worst }
const gradText = new Map();
const unknownColors = new Set();

for (const file of files) {
  const src = blankComments(fs.readFileSync(file, 'utf8'));
  for (const line of src.split('\n')) {
    // 1) Badge: bg-X-50/100 + text-X-Y (tanpa prefix) pada baris yang sama
    const bgMatches = [...line.matchAll(/\bbg-([a-z]+)-(50|100)(?:\/\d+)?/g)]
      .filter((m) => !hasPrefix(line, m.index) && !BG_MODIFIERS.has(m[1]));
    const textMatches = [...line.matchAll(/\btext-([a-z]+)-(\d+)/g)]
      .filter((m) => !hasPrefix(line, m.index));
    if (bgMatches.length && textMatches.length) {
      const bg = bgMatches[0];
      const after = textMatches.find((t) => t.index > bg.index);
      if (after) {
        const bgHex = hexOf(bg[1], Number(bg[2]));
        const txHex = hexOf(after[1], Number(after[2]));
        if (!bgHex || !txHex) {
          unknownColors.add(`bg-${bg[1]}-${bg[2]}`.includes('unknown') ? '' : `bg-${bg[1]}-${bg[2]} / text-${after[1]}-${after[2]}`);
        } else {
          const key = `bg-${bg[1]}-${bg[2]} text-${after[1]}-${after[2]}`;
          badgePairs.set(key, (badgePairs.get(key) || 0) + 1);
        }
      }
    }

    // 2) Teks putih di atas gradient (stop tanpa prefix; `text-white` tanpa prefix)
    if (hasUnprefixedWhiteText(line)) {
      const stops = stopsOf(line).map((s) => hexOf(s.hue, s.shade));
      if (stops.length >= 2 && stops.every(Boolean)) {
        const key = stopsOf(line).map((s) => `${s.hue}-${s.shade}`).join('→');
        const worst = Math.min(...stops.map((h) => ratio(h, C.white)));
        const prev = gradWhite.get(key);
        gradWhite.set(key, { count: (prev?.count || 0) + 1, worst: prev ? Math.min(prev.worst, worst) : worst });
      }
    }

    // 3) Gradient text (bg-clip-text text-transparent) vs putih
    if (/\bbg-clip-text\b/.test(line) && /\btext-transparent\b/.test(line)) {
      const stops = stopsOf(line).map((s) => hexOf(s.hue, s.shade));
      if (stops.length >= 2 && stops.every(Boolean)) {
        const key = stopsOf(line).map((s) => `${s.hue}-${s.shade}`).join('→');
        const worst = Math.min(...stops.map((h) => ratio(h, C.white)));
        const prev = gradText.get(key);
        gradText.set(key, { count: (prev?.count || 0) + 1, worst: prev ? Math.min(prev.worst, worst) : worst });
      }
    }
  }
}

/* ─────────── Probe: text-gradient-primary ─────────── */
function probeTextGradientPrimary() {
  const cssFiles = [];
  for (const f of fs.readdirSync(path.join(SRC, 'styles'))) {
    if (/\.css$/.test(f)) cssFiles.push(path.join(SRC, 'styles', f));
  }
  let definition = null; // teks definisi
  let usage = 0;
  for (const f of cssFiles) {
    const c = fs.readFileSync(f, 'utf8');
    const m = c.match(/\.text-gradient-primary\s*\{([^}]+)\}/);
    if (m) definition = m[1].trim();
  }
  for (const f of walkSrc(SRC)) {
    const c = fs.readFileSync(f, 'utf8');
    usage += (c.match(/text-gradient-primary/g) || []).length;
  }
  // Referensi di docs — dibaca NYATA (bukan hardcode) supaya pesan laporan
  // selalu jujur: jika class muncul lagi di docs, audit langsung memberi tahu.
  const docsPath = path.join(ROOT, 'docs', 'DESIGN_STANDARDS.md');
  let docsRef = 0;
  if (fs.existsSync(docsPath)) {
    docsRef = (fs.readFileSync(docsPath, 'utf8').match(/text-gradient-primary/g) || []).length;
  }
  if (definition) {
    const hexes = [...definition.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
    const worst = hexes.length ? Math.min(...hexes.map((h) => ratio(h, C.white))) : null;
    return { definition, hexes, worst, usage, docsRef };
  }
  return { definition: null, hexes: [], worst: null, usage, docsRef };
}

/* ─────────── Laporan ─────────── */
const fmt = (r) => r.toFixed(2);

const badgeFails = [];
const badgePasses = [];
for (const [pair, count] of [...badgePairs.entries()].sort((a, b) => b[1] - a[1])) {
  const m = pair.match(/^bg-([a-z]+)-(\d+) text-([a-z]+)-(\d+)$/);
  const bgHex = hexOf(m[1], Number(m[2]));
  const txHex = hexOf(m[3], Number(m[4]));
  if (!bgHex || !txHex) continue;
  const r = ratio(bgHex, txHex);
  if (r < 4.5) badgeFails.push({ pair, count, r });
  else badgePasses.push({ pair, count, r });
}

function fixSuggestion(pair) {
  const m = pair.match(/^bg-([a-z]+)-(\d+) text-([a-z]+)-(\d+)$/);
  const hue = m[1], txShade = Number(m[4]);
  const higher = txShade < 900 ? txShade + 100 : null;
  const betterBg = m[2] === '100' ? '50' : null;
  const parts = [];
  if (higher && hexOf(hue, higher)) parts.push(`text-${hue}-${higher}`);
  if (betterBg && hexOf(hue, Number(betterBg))) parts.push(`bg-${hue}-${betterBg}`);
  return parts.length ? `→ ${parts.join(' atau ')}` : '';
}

/**
 * Cari shade text minimal yang membuat pasangan badge ini lulus 4.5:1.
 * Naik bertahap +100 sampai 900; kembalikan string kelas text baru atau null.
 * (Dipakai oleh audit-fix; fixSuggestion di atas hanya saran +100.)
 */
function minPassingText(bgHue, bgShade, txHue, txShade) {
  const bgHex = hexOf(bgHue, bgShade);
  if (!bgHex) return null;
  for (let s = txShade + 100; s <= 900; s += 100) {
    const h = hexOf(txHue, s);
    if (h && ratio(h, bgHex) >= 4.5) return `text-${txHue}-${s}`;
  }
  return null;
}

const tgp = probeTextGradientPrimary();
const gradWhiteFails = [...gradWhite.entries()].filter(([, v]) => v.worst < 4.5).sort((a, b) => a[1].worst - b[1].worst);
const gradTextFails = [...gradText.entries()].filter(([, v]) => v.worst < 4.5).sort((a, b) => a[1].worst - b[1].worst);
const anyFail = badgeFails.length > 0 || gradWhiteFails.length > 0 || gradTextFails.length > 0 || (tgp.worst !== null && tgp.worst < 4.5);

// Semua output laporan & exit hanya boleh jalan saat dipanggil langsung sebagai
// script (bukan saat di-require script saudara / test — lihat module.exports).
if (require.main === module) {
  if (asJson) {
    console.log(JSON.stringify({
      textGradientPrimary: { defined: !!tgp.definition, usage: tgp.usage, docsRef: tgp.docsRef, worstRatio: tgp.worst === null ? null : +tgp.worst.toFixed(2) },
      badge: {
        totalPairs: badgePairs.size,
        fails: badgeFails.map((f) => {
          const [bgCls, txCls] = f.pair.split(' ');
          const [, bgHue, bgShade] = bgCls.match(/bg-([a-z]+)-(\d+)/) || [];
          const [, txHue, txShade] = txCls.match(/text-([a-z]+)-(\d+)/) || [];
          return {
            ...f,
            ratio: +f.r.toFixed(2),
            fix: fixSuggestion(f.pair),
            minFix: minPassingText(bgHue, Number(bgShade), txHue, Number(txShade)),
          };
        }),
      },
      whiteOnGradient: gradWhiteFails.map(([k, v]) => ({ gradient: k, count: v.count, worstRatio: +v.worst.toFixed(2) })),
      gradientText: gradTextFails.map(([k, v]) => ({ gradient: k, count: v.count, worstRatio: +v.worst.toFixed(2) })),
      unknownColors: [...unknownColors].slice(0, 15),
    }, null, 2));
    process.exit(anyFail ? 1 : 0);
  }

  console.log(`\n🔍 Audit Kontras WCAG (${files.length} file src) — threshold 4.5:1 teks normal / 3.0:1 teks besar`);

console.log(`\n🔍 Audit Kontras WCAG (${files.length} file src) — threshold 4.5:1 teks normal / 3.0:1 teks besar`);
console.log('='.repeat(76));

console.log(`\n📌 text-gradient-primary:`);
if (tgp.definition) {
  const verdict = tgp.worst === null ? 'tidak ada hex (tidak bisa dihitung)' : `${fmt(tgp.worst)}:1 vs putih`;
  console.log(`   Definisi ditemukan — stop: ${tgp.hexes.join(', ') || '-'} → ${verdict}`);
  console.log(`   Pemakaian di src: ${tgp.usage}×`);
} else if (tgp.docsRef > 0) {
  console.log(`   ⚠️  TIDAK ADA definisi di CSS & TIDAK dipakai di src (${tgp.usage}×),`);
  console.log(`       TAPI masih direferensikan di docs/DESIGN_STANDARDS.md (${tgp.docsRef}×) —`);
  console.log(`       kelas mati. Hapus referensi docs atau implementasikan class-nya.`);
} else {
  console.log(`   ✅ TIDAK ADA definisi di CSS & TIDAK dipakai di src (${tgp.usage}×).`);
  console.log(`       Referensi docs bersih — tidak ada masalah kontras aktual.`);
}

console.log(`\n📛 BADGE bg terang + text — GAGAL 4.5:1 (${badgeFails.length} pola):`);
if (badgeFails.length === 0) console.log('   (tidak ada)');
for (const f of badgeFails.sort((a, b) => a.r - b.r)) {
  console.log(`   ${fmt(f.r).padStart(5)}  ${f.pair.padEnd(32)} ${String(f.count).padStart(3)}×  ${fixSuggestion(f.pair)}`);
}

console.log(`\n✅ BADGE — lulus (${badgePasses.length} pola, ${badgePasses.reduce((s, p) => s + p.count, 0)} kemunculan):`);
const nearMiss = badgePasses.filter((p) => p.r < 5.0).map((p) => `${p.pair} (${fmt(p.r)})`).join(', ');
console.log(`   ${nearMiss ? `narrow (4.5–5.0): ${nearMiss}` : 'semua > 5:1'}`);

console.log(`\n📛 TEKS PUTIH di gradient — GAGAL (${gradWhiteFails.length}):`);
if (gradWhiteFails.length === 0) console.log('   (tidak ada — semua stop ≥ 4.5:1)');
for (const [k, v] of gradWhiteFails) console.log(`   ${fmt(v.worst).padStart(5)}  ${k.padEnd(36)} ${String(v.count).padStart(3)}×`);

console.log(`\n📛 GRADIENT TEXT (bg-clip-text) — GAGAL vs putih (${gradTextFails.length}):`);
if (gradTextFails.length === 0) console.log('   (tidak ada)');
for (const [k, v] of gradTextFails) console.log(`   ${fmt(v.worst).padStart(5)}  ${k.padEnd(36)} ${String(v.count).padStart(3)}×`);

if (unknownColors.size) {
  console.log(`\nℹ️  Warna tak dikenal (tidak dihitung): ${[...unknownColors].slice(0, 15).join('; ')}`);
}

console.log(`\n💡 Referensi rasio umum (bg terang + text):`);
console.log('   bg-rose-100 text-rose-600      ≈ 4.05 ❌  → text-rose-700 (5.4) / bg-rose-50');
console.log('   bg-emerald-100 text-emerald-600 ≈ 4.2  ❌  → text-emerald-700 (4.8)');
console.log('   bg-amber-100 text-amber-600    ≈ 3.9  ❌  → text-amber-700 (4.5)');
console.log('   bg-*-100 text-*-700/800        ≈ 4.8–6.5 ✅');
  console.log(`\n${anyFail ? '❌ Ada pola yang perlu diperbaiki' : '✅ Semua pola lolos 4.5:1'}\n`);

  process.exit(anyFail ? 1 : 0);
} // ── akhir guard require.main === module ──

// ── Ekspor untuk script saudara (audit-fix / test) — di-guard agar require
// tidak mengeksekusi laporan/exit di atas.
module.exports = {
  C,
  BG_MODIFIERS,
  lum,
  ratio,
  hexOf,
  hasPrefix,
  walkSrc,
  SRC,
  files,
  badgePairs,
  badgeFails,
  badgePasses,
  fixSuggestion,
  minPassingText,
  stopsOf,
  hasUnprefixedWhiteText,
  gradWhite,
  gradWhiteFails,
  gradText,
  gradTextFails,
};
