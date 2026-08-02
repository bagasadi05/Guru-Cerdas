#!/usr/bin/env node
/**
 * fix-white-on-gradient.cjs — perbaiki teks putih di gradient yang GAGAL
 * WCAG 4.5:1 (kategori whiteOnGradient dari audit-contrast.cjs).
 *
 * Dua strategi, dipilih per-pola secara data-driven:
 *   1. RAISE STOP (utama): naikkan SEMUA stop gradient dengan delta minimal
 *      yang sama (+100, +200, …) sampai SEMUA stop lulus 4.5:1 vs putih.
 *      Contoh: emerald-500→600 → emerald-700→800 (delta 200). Delta seragam
 *      menjaga relasi antar-stop (gradient tetap terasa), dan diterapkan juga
 *      ke varian hover:/dark:/! agar mode gelap & hover ikut terdongkrak.
 *      (Teks gelap emerald-950/amber-950 TIDAK dipakai: rasio emerald-950 di
 *      atas emerald-600 = 4.02 < 4.5 — gagal. Menaikkan stop adalah satu-
 *      satunya cara yang lolos untuk keluarga emerald/amber.)
 *   2. SWAP TEXT (khusus bg netral sangat terang): bila stop paling terang
 *      <= 300 (mis. slate-100→200) dan ada kelas teks gelap yang lulus vs
 *      SEMUA stop, ganti `text-white` → teks gelap (mis. text-slate-900).
 *      Menaikkan stop dari shade 100 butuh +400 (perubahan visual agresif);
 *      teks gelap lebih tepat. Kandidat divalidasi dengan rasio nyata —
 *      gray-300→500 TIDAK bisa swap (text-gray-900 vs gray-500 = 3.93), jadi
 *      pola itu tetap di-raise (gray-500→700).
 *
 * Deteksi baris MIRIP audit-contrast: `text-white` tanpa prefix + >= 2 stop
 * gradient tanpa prefix (dark:/hover: di-skip utk deteksi; varian dark: tetap
 * ikut di-raise). Komentar di-blank (blankComments menjaga index tetap
 * selaras dengan baris asli). Hanya baris yang key-nya ada di gradWhiteFails
 * yang diubah — tidak ada false positive.
 *
 * Usage:
 *   node scripts/fix-white-on-gradient.cjs            # DRY-RUN (default)
 *   node scripts/fix-white-on-gradient.cjs --apply    # tulis perubahan
 */
'use strict';

const fs = require('fs');
const path = require('path');
const audit = require('./audit-contrast.cjs');
const { ROOT, blankComments } = require('./audit-lib.cjs');

const DRY_RUN = !process.argv.includes('--apply');
const SRC = audit.SRC;

/* ── Bantu: stop minimal lulus 4.5:1 untuk satu pola gradient ── */
function minRaise(stops) {
  for (let d = 100; d <= 800; d += 100) {
    const ok = stops.every((s) => {
      const h = audit.hexOf(s.hue, s.shade + d);
      return h && audit.ratio(h, audit.C.white) >= 4.5;
    });
    if (ok) return d;
  }
  return null;
}

/* ── Cari kelas teks gelap yang lulus vs SEMUA stop (worst = stop tergelap) ── */
function darkTextFor(stops) {
  const pref = { slate: 'text-slate-900', gray: 'text-gray-900' };
  const hue = stops[0].hue;
  const cands = pref[hue] ? [pref[hue]] : [`text-${hue}-900`, `text-${hue}-950`];
  // worst-case untuk teks gelap = stop dengan luminansi TERKECIL (paling gelap)
  const darkest = stops.reduce((a, b) =>
    audit.lum(audit.hexOf(a.hue, a.shade)) < audit.lum(audit.hexOf(b.hue, b.shade)) ? a : b
  );
  const bgHex = audit.hexOf(darkest.hue, darkest.shade);
  if (!bgHex) return null;
  for (const cls of cands) {
    const m = cls.match(/^text-([a-z]+)-(\d+)$/);
    if (!m) continue;
    const txHex = audit.hexOf(m[1], Number(m[2]));
    if (txHex && audit.ratio(txHex, bgHex) >= 4.5) return cls;
  }
  return null;
}

/* ── Bangun peta strategi dari fail audit (data-driven, selalu sinkron) ──
 * audit.gradWhiteFails = [[key, {count, worst}], ...] — hasil [...Map.entries()].
 */
const raiseFix = new Map(); // key gradient → delta
const swapFix = new Map(); // key gradient → kelas teks
const unfixable = [];
for (const [key, v] of audit.gradWhiteFails) {
  const stops = key.split('→').map((p) => {
    const [hue, shade] = p.split('-');
    return { hue, shade: Number(shade) };
  });
  const lightest = Math.min(...stops.map((s) => s.shade));
  const delta = minRaise(stops);
  const swap = lightest <= 300 ? darkTextFor(stops) : null;
  if (swap) swapFix.set(key, swap);
  else if (delta) raiseFix.set(key, delta);
  else unfixable.push(key);
}

/* ── Perbaiki satu baris ── */
function fixLine(line) {
  const src = blankComments(line);
  // Gate identik audit: baris HARUS punya `text-white` tanpa prefix — kalau
  // tidak, audit tidak pernah mem-flag baris ini (progress bar/overlay dengan
  // gradient sama tapi tanpa teks putih tidak boleh ikut di-raise).
  if (!audit.hasUnprefixedWhiteText(src)) return line;
  const stops = [...src.matchAll(/\b(from|via|to)-([a-z]+)-(\d+)/g)]
    .filter((m) => !audit.hasPrefix(src, m.index));
  if (stops.length < 2) return line;
  const key = stops.map((m) => `${m[2]}-${m[3]}`).join('→');

  // Strategi 2: swap text → teks gelap
  if (swapFix.has(key)) {
    const tw = [...src.matchAll(/\btext-white\b/g)].find((m) => !audit.hasPrefix(src, m.index));
    if (!tw) return line;
    return line.slice(0, tw.index) + swapFix.get(key) + line.slice(tw.index + tw[0].length);
  }

  // Strategi 1: raise semua stop (termasuk hover:/dark:/! variant). Deteksi &
  // posisi dihitung dari `src` (komentar di-blank, panjang tetap) supaya token
  // di dalam komentar tidak ikut ter-edit; clamp tidak boleh MENURUNKAN shade
  // (mis. dark:from-emerald-950 + delta > maxS → jaga tetap 950, jangan 900).
  const delta = raiseFix.get(key);
  if (!delta) return line;
  const repls = [];
  for (const m of src.matchAll(/\b(from|via|to)-([a-z]+)-(\d+)/g)) {
    const hue = m[2];
    const shade = Number(m[3]);
    const maxS = Math.max(0, ...Object.keys(audit.C[hue] || {}).map(Number));
    const ns = Math.max(shade, Math.min(shade + delta, maxS));
    if (ns === shade) continue;
    const digitStart = m.index + m[0].length - m[3].length;
    repls.push({ start: digitStart, end: m.index + m[0].length, to: String(ns) });
  }
  if (!repls.length) return line;
  let next = line;
  for (const r of repls.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, r.start) + r.to + next.slice(r.end);
  }
  return next;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

/* ── Eksekusi ── */
const files = audit.walkSrc(SRC);
const stats = { filesScanned: files.length, filesChanged: 0, linesChanged: 0 };

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let fileLines = 0;
  const next = lines
    .map((line) => {
      const fixed = fixLine(line);
      if (fixed !== line) {
        fileLines++;
        if (DRY_RUN) {
          console.log(`  - ${line.trim().slice(0, 150)}`);
          console.log(`  + ${fixed.trim().slice(0, 150)}`);
        }
      }
      return fixed;
    })
    .join('\n');
  if (next !== content) {
    stats.filesChanged++;
    stats.linesChanged += fileLines;
    if (DRY_RUN) console.log(`\n[${rel(file)}] ${fileLines} baris`);
    else fs.writeFileSync(file, next);
  }
}

/* ── Laporan ── */
console.log('\n' + '='.repeat(64));
console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (tidak menulis)' : 'APPLY'}`);
console.log(`File dipindai: ${stats.filesScanned}`);
console.log(`File berubah: ${stats.filesChanged}`);
console.log(`Baris diubah: ${stats.linesChanged}`);
console.log(`Pola RAISE (stop dinaikkan): ${raiseFix.size}`);
console.log(`Pola SWAP (teks gelap): ${swapFix.size}`);
console.log(`Pola TANPA fix: ${unfixable.length} ${unfixable.length ? '— ' + unfixable.join('; ') : ''}`);

console.log('\n=== MAPPING RAISE (key → delta) ===');
for (const [key, delta] of [...raiseFix.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  +${delta}  ${key}`);
}
console.log('\n=== MAPPING SWAP ===');
for (const [key, cls] of [...swapFix.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${key.padEnd(28)} → ${cls}`);
}

if (DRY_RUN) {
  console.log('\n(DRY-RUN selesai — jalankan dengan --apply untuk menulis perubahan)');
}
