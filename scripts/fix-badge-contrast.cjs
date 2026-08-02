#!/usr/bin/env node
/**
 * fix-badge-contrast.cjs — perbaiki otomatis kontras badge/chip yang GAGAL
 * WCAG 4.5:1 (ditemukan audit-contrast.cjs).
 *
 * Strategi: untuk setiap pasangan badge `bg-X-50/100 text-X-Y` yang gagal,
 * naikkan shade text (Y+100, Y+200, …) sampai rasio kontras >= 4.5 — bukan
 * asal +100 (beberapa pola butuh +200/+300, mis. text-gray-300 pada
 * bg-gray-50, text-slate-400 pada bg-slate-100). Shade text yang lulus
 * dihitung oleh minPassingText() yang diekspor audit-contrast.cjs.
 *
 * Deteksi baris badge MIRIP audit-contrast: pasangan bg+text TANPA prefix
 * (dark:/hover:/group-hover: diabaikan — kontras dark beda arah, jadi dark
 * mode badge TIDAK diaudit/di-fix oleh script ini — gap yang didokumentasi),
 * modifier non-warna (bg-opacity-*) dikecualikan. Komentar di-blank untuk
 * deteksi (blankComments menjaga panjang, jadi index tetap selaras dengan
 * baris asli).
 *
 * MODEL PAIRING (selaras audit-contrast): tiap bg-X-50/100 dipasangkan dengan
 * token text-* pertama SETELAH-nya pada baris yang sama. Pada baris multi-badge
 * (mis. dua chip dalam satu baris), audit hanya menghitung bg PERTAMA per
 * baris, sedangkan script ini memperbaiki SEMUA badge — jadi jumlah baris
 * yang diubah bisa sedikit LEBIH TINGGI dari jumlah kemunculan yang dilaporkan
 * audit (contoh: 132 baris vs 128 kemunculan). Setiap penggantian tetap hanya
 * terjadi bila pasangannya ada di fixMap (dari badgeFails audit) — tidak ada
 * perubahan di luar pola gagal.
 *
 * Penggunaan:
 *   node scripts/fix-badge-contrast.cjs            # DEFAULT: dry-run (aman)
 *   node scripts/fix-badge-contrast.cjs --apply    # tulis perubahan
 */
'use strict';

const fs = require('fs');
const path = require('path');
const audit = require('./audit-contrast.cjs');
const { ROOT, blankComments } = require('./audit-lib.cjs');

const DRY_RUN = !process.argv.includes('--apply');
const SRC = audit.SRC;
const BG_MODIFIERS = audit.BG_MODIFIERS;

/* ── Peta fix: 'bg-X-50/100 text-X-Y' → 'text-X-Z' (Z = shade lulus 4.5) ── */
const fixMap = new Map();
const unfixable = [];
for (const f of audit.badgeFails) {
  const m = f.pair.match(/^bg-([a-z]+)-(\d+) text-([a-z]+)-(\d+)$/);
  if (!m) continue;
  const target = audit.minPassingText(m[1], Number(m[2]), m[3], Number(m[4]));
  if (target) fixMap.set(f.pair, target);
  else unfixable.push(f.pair);
}

/** Perbaiki semua pasangan badge yang gagal pada satu baris. */
function fixLine(line) {
  const src = blankComments(line); // deteksi pada versi komentar-di-blank
  const bgs = [...src.matchAll(/\bbg-([a-z]+)-(50|100)(?:\/\d+)?/g)]
    .filter((m) => !audit.hasPrefix(src, m.index) && !BG_MODIFIERS.has(m[1]));
  if (!bgs.length) return line;
  const texts = [...src.matchAll(/\btext-([a-z]+)-(\d+)/g)]
    .filter((m) => !audit.hasPrefix(src, m.index));
  const replacements = [];
  for (const bg of bgs) {
    const after = texts.find((t) => t.index > bg.index);
    if (!after) continue;
    const key = `bg-${bg[1]}-${bg[2]} text-${after[1]}-${after[2]}`;
    const to = fixMap.get(key);
    if (to) replacements.push({ start: after.index, end: after.index + after[0].length, to });
  }
  if (!replacements.length) return line;
  // Dedupe by start: multi-bg satu baris (mis. `bg-red-50 bg-slate-50
  // text-red-500`) bisa menargetkan token text yang SAMA dari dua bg berbeda
  // → dua replacement di posisi identik. Ambil yang pertama saja; semua target
  // dari minPassingText sudah dijamin >= 4.5 pada bg-nya masing-masing, jadi
  // hasil akhir tetap lulus apa pun yang menang — determinisme yang dijaga.
  const seen = new Set();
  const uniq = [];
  for (const r of replacements.sort((a, b) => b.start - a.start)) {
    if (seen.has(r.start)) continue;
    seen.add(r.start);
    uniq.push(r);
  }
  let next = line;
  for (const r of uniq) {
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
const perPattern = new Map(); // pair → jumlah penggantian

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let fileChanges = 0;
  const next = lines
    .map((line) => {
      const fixed = fixLine(line);
      if (fixed !== line) {
        fileChanges++;
        const a = line.trim().slice(0, 150);
        const b = fixed.trim().slice(0, 150);
        if (DRY_RUN) {
          console.log(`  - ${a}`);
          console.log(`  + ${b}`);
        }
      }
      return fixed;
    })
    .join('\n');

  if (next !== content) {
    stats.filesChanged++;
    stats.linesChanged += fileChanges;
    if (DRY_RUN) console.log(`\n[${rel(file)}] ${fileChanges} baris`);
    else fs.writeFileSync(file, next);
  }
}

// Hitung per-pattern (untuk laporan — dari map, bukan re-scan)
for (const [pair, to] of fixMap) {
  // Estimasi: kita tidak punya counter per pattern di loop — hitung dari audit
  const f = audit.badgeFails.find((x) => x.pair === pair);
  if (f) perPattern.set(pair, { count: f.count, to });
}

/* ── Laporan ── */
console.log('\n' + '='.repeat(64));
console.log(`MODE: ${DRY_RUN ? 'DRY-RUN (tidak menulis)' : 'APPLY'}`);
console.log(`File dipindai: ${stats.filesScanned}`);
console.log(`File berubah: ${stats.filesChanged}`);
console.log(`Baris diubah: ${stats.linesChanged}`);
console.log(`Pola gagal yang di-fix: ${fixMap.size}`);
console.log(`Pola TANPA fix (tidak ada shade lulus): ${unfixable.length} ${unfixable.length ? '— ' + unfixable.join('; ') : ''}`);

console.log('\n=== MAPPING (pola → target text) ===');
for (const [pair, { count, to }] of [...perPattern.entries()].sort((a, b) => a[1].count - b[1].count)) {
  console.log(`  ${String(count).padStart(3)}×  ${pair.padEnd(32)} → ${to}`);
}

if (DRY_RUN) {
  console.log('\n(DRY-RUN selesai — jalankan dengan --apply untuk menulis perubahan)');
}
