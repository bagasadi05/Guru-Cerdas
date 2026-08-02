#!/usr/bin/env node
/**
 * audit-font-subset.cjs — validasi subset font: weight yang dipakai di src
 * HARUS dideklarasikan di src/styles/fonts.css.
 *
 * Tujuan: menangkap "weight baru yang lupa ditambahkan" di CI. Jika developer
 * memakai `font-thin` (100) / `font-light` (300) / dst. di src tetapi @font-face
 * yang bersangkutan belum ada di fonts.css, browser diam-diam memakai weight
 * terdekat (atau mensintesis faux-bold) — bug visual yang sulit terdeteksi.
 * Script ini memastikan tidak ada weight yang dipakai tanpa deklarasi.
 *
 * Arah verifikasi:
 *   - MISSING (error, exit 1): weight dipakai di src tapi tidak dideklarasikan
 *     di family manapun di fonts.css.
 *   - UNUSED (warning): weight dideklarasikan tapi tidak pernah dipakai di src
 *     (kandidat pruning, seperti Inter 300 yang dihapus 2026-08-01). Dengan
 *     --strict, warning ini juga menggagalkan CI.
 *
 * Sumber weight yang dipakai (semua diskanned, komentar di-blank):
 *   1. Kelas Tailwind font-*  (font-thin=100 ... font-black=900)
 *   2. Prop fontWeight="600" / fontWeight={600} / fontWeight: 600 (SVG, chart)
 *   3. Aturan CSS font-weight: 600 (styles/*.css)
 *   4. Arbitrary font-[500] / font-[600] (Tailwind arbitrary value)
 *
 * Contoh:
 *   node scripts/audit-font-subset.cjs
 *   node scripts/audit-font-subset.cjs --strict   # unused => exit 1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { blankComments } = require('./audit-lib.cjs');

const ROOT = path.resolve(__dirname, '..');
const FONTS_CSS = path.join(ROOT, 'src', 'styles', 'fonts.css');
const SRC_DIR = path.join(ROOT, 'src');
const SRC_EXT = /\.(ts|tsx|css)$/;

// Pemetaan kelas Tailwind font-* → berat numerik
const CLASS_WEIGHTS = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

// Parsing @font-face di fonts.css → Map<family, Set<weight>>
// (family "Inter" → {400,500,600,700,800,900}, "Tinos" → {400,700})
function parseDeclaredWeights(css) {
  const declared = new Map();
  const re = /@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const fam = /font-family\s*:\s*['"]([^'"]+)['"]/.exec(m[1]);
    const w = /font-weight\s*:\s*(\d+)/.exec(m[1]);
    if (fam && w) {
      const family = fam[1];
      if (!declared.has(family)) declared.set(family, new Set());
      declared.get(family).add(Number(w[1]));
    }
  }
  return declared;
}

// Ekstrak weight yang dipakai dari satu isi file (komentar di-blank agar
// `// font-bold` di komentar tidak dihitung; string literal tetap utuh).
// Return Map<weight, count>.
function extractUsedWeights(content) {
  const src = blankComments(content);
  const used = new Map();
  const bump = (w) => used.set(w, (used.get(w) || 0) + 1);

  const classRe = new RegExp(`\\bfont-(${Object.keys(CLASS_WEIGHTS).join('|')})\\b`, 'g');
  let m;
  while ((m = classRe.exec(src)) !== null) bump(CLASS_WEIGHTS[m[1]]);

  // Prop inline: fontWeight="600" / fontWeight={600} / fontWeight: 600
  const propRe = /fontWeight\s*(?:=|:)\s*\{?\s*['"]?(\d{3})/g;
  while ((m = propRe.exec(src)) !== null) bump(Number(m[1]));

  // Aturan CSS: font-weight: 600
  const cssRe = /font-weight\s*:\s*(\d{3})/g;
  while ((m = cssRe.exec(src)) !== null) bump(Number(m[1]));

  // Arbitrary Tailwind: font-[500]
  const arbRe = /font-\[(\d{3})\]/g;
  while ((m = arbRe.exec(src)) !== null) bump(Number(m[1]));

  return used;
}

// Inti validasi (murni, bisa di-unit-test): bandingkan deklarasi per family
// dengan weight yang dipakai. Return { missing, unused } — keduanya di-sort
// naik. `missing` = dipakai tapi tidak dideklarasikan di family manapun;
// `unused` = dideklarasikan tapi tidak pernah dipakai di src.
function computeSubsetDiff(declared, used) {
  const allDeclared = new Set([...declared.values()].flatMap((s) => [...s]));
  const usedWeights = [...used.keys()];
  const missing = usedWeights.filter((w) => !allDeclared.has(w)).sort((a, b) => a - b);
  const unused = [...allDeclared].filter((w) => !used.has(w)).sort((a, b) => a - b);
  return { missing, unused };
}

// Rekursif: kumpulkan weight yang dipakai di seluruh direktori (ts/tsx/css).
// PENTING: fonts.css DIKECUALIKAN — deklarasi @font-face (font-weight: X) adalah
// sisi "deklarasi", bukan "pemakaian". Jika ikut dihitung, unused selalu kosong
// dan deteksi weight mati (seperti Inter 300) tidak pernah terpicu.
function scanUsedWeights(dir, out = new Map()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (full === FONTS_CSS) continue;
    if (entry.isDirectory()) {
      scanUsedWeights(full, out);
    } else if (SRC_EXT.test(entry.name)) {
      const perFile = extractUsedWeights(fs.readFileSync(full, 'utf8'));
      for (const [w, c] of perFile) out.set(w, (out.get(w) || 0) + c);
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');

  const css = fs.readFileSync(FONTS_CSS, 'utf8');
  const declared = parseDeclaredWeights(css);
  const used = scanUsedWeights(SRC_DIR);
  const { missing, unused } = computeSubsetDiff(declared, used);
  const usedWeights = [...used.keys()].sort((a, b) => a - b);

  console.log('=== Font Subset Audit ===');
  console.log('Deklarasi @font-face per family:');
  for (const [family, weights] of declared) {
    console.log(`  ${family}: [${[...weights].sort((a, b) => a - b).join(', ')}]`);
  }
  console.log(`Weight dipakai di src: [${usedWeights.join(', ')}]`);
  console.log('');

  if (missing.length) {
    console.error(`✘ MISSING (dipakai tapi TIDAK dideklarasikan): [${missing.join(', ')}]`);
    console.error('  Tambahkan @font-face yang sesuai di src/styles/fonts.css, atau');
    console.error('  ganti kelas ke weight yang sudah ada (font-normal/medium/semibold/bold).');
  } else {
    console.log('✓ Semua weight yang dipakai sudah dideklarasikan.');
  }

  if (unused.length) {
    const label = strict ? '✘' : '⚠';
    console.log(`${label} UNUSED (dideklarasikan tapi tidak dipakai di src): [${unused.join(', ')}]`);
    if (!strict) console.log('  (informasional — kandidat pruning; gunakan --strict untuk menggagalkan CI)');
  }

  const failed = missing.length > 0 || (strict && unused.length > 0);
  console.log('');
  console.log(failed ? '✗ AUDIT GAGAL' : '✓ AUDIT LULUS');
  process.exit(failed ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  CLASS_WEIGHTS,
  parseDeclaredWeights,
  extractUsedWeights,
  scanUsedWeights,
  computeSubsetDiff,
  FONTS_CSS,
  SRC_DIR,
};
