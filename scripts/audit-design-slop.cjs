#!/usr/bin/env node
/**
 * Audit: jejak "AI slop" desain — shadow berwarna & backdrop-blur.
 *
 * Mengukur dua sinyal visual yang paling sering dihasilkan model LLM secara
 * berlebihan dan tidak konsisten:
 *
 *   1. `shadow-<warna>-<shade>[/opacity]` — glow berwarna (mis.
 *      `shadow-emerald-500/20`, `shadow-indigo-500/30`). Baseline terukur:
 *      58 kombinasi unik × 192 kemunculan. Pengganti yang direkomendasikan:
 *      shadow generik (`shadow-md`/`shadow-lg`) untuk elevasi, atau
 *      `border-<warna>-200` bila tint disengaja (border lebih hemat render
 *      daripada box-shadow berwarna dengan spread).
 *   2. `backdrop-blur*` — baseline 173 kemunculan (xl 75, sm 66). Blur berat
 *      pada banyak elemen dalam satu layar = sinyal "glassmorphism berlebihan".
 *
 * Output:
 *   - Total & unik per metrik (global)
 *   - Top `--top N` class shadow berwarna + rekomendasi penggantian
 *   - Top `--top N` file per metrik
 *   - `--fail-above N` → exit 1 bila total shadow berwarna > N (CI gate,
 *     agar jejak slop tidak bertambah diam-diam antar commit)
 *   - `--json` → laporan machine-readable untuk monitoring
 *
 * Usage:
 *   node scripts/audit-design-slop.cjs
 *   node scripts/audit-design-slop.cjs --top 20
 *   node scripts/audit-design-slop.cjs --fail-above 200
 *   node scripts/audit-design-slop.cjs --json
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, blankComments } = require('./audit-lib.cjs');

const SRC = path.join(ROOT, 'src');

// `shadow-<hue>-<shade>[/opacity]` — utility Tailwind berwarna.
// Tidak cocok shadow generik (sm/md/lg/xl/2xl/none/inner) maupun arbitrary
// `shadow-[...]` (diawali `[` yang gagal `[a-z]+`).
const COLORED_RE = /shadow-([a-z]+)-(\d+)(?:\/(\d+))?/g;
// varian backdrop-blur standar + base
const BLUR_RE = /backdrop-blur(?:-(?:sm|md|lg|xl|2xl|3xl|xs))?/g;
// arbitrary shadow (informasi: beberapa berisi warna hardcoded rgb/hex)
const ARBITRARY_RE = /shadow-\[([^\]]+)\]/g;
// deteksi warna hardcoded di dalam nilai arbitrary: rgb()/rgba() atau hex #rgb/#rrggbb
const COLOR_LITERAL_RE = /(?:rgba?\s*\(|#[0-9a-fA-F]{3,8}\b)/;

// Hue netral — glow abu-abu kurang "slop" daripada glow berwarna brand.
const NEUTRAL_HUES = new Set(['slate', 'gray', 'zinc', 'stone', 'neutral', 'black', 'white']);

function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function parseFailAbove(args) {
  const i = args.indexOf('--fail-above');
  if (i !== -1 && args[i + 1] && /^\d+$/.test(args[i + 1])) {
    return Number.parseInt(args[i + 1], 10);
  }
  return null;
}

function parseTop(args) {
  const i = args.indexOf('--top');
  if (i !== -1 && args[i + 1] && /^\d+$/.test(args[i + 1])) {
    return Number.parseInt(args[i + 1], 10);
  }
  return 15;
}

// Rekomendasi penggantian satu class shadow berwarna.
function recommend(cls) {
  const m = /^([a-z]+)-(\d+)(?:\/(\d+))?$/.exec(cls);
  if (!m) return '';
  const hue = m[1];
  const op = m[3] ? Number.parseInt(m[3], 10) : 100;
  if (NEUTRAL_HUES.has(hue)) {
    return 'netral — boleh, tapi pertimbangkan shadow generik (shadow-md/lg)';
  }
  if (op <= 20) {
    return `→ ganti: shadow-lg generik, atau tint via border-${hue}-200 (lebih hemat render)`;
  }
  if (op <= 35) {
    return `→ kurangi glow: shadow-${hue}-500/10 + border-${hue}-200, atau shadow generik`;
  }
  return `→ ganti penuh: border-${hue}-300 + shadow generik (opacity ${op} = glow tebal khas AI slop)`;
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const failAbove = parseFailAbove(args);
  const topN = parseTop(args);

  const files = walkSrc(SRC);
  const perFile = new Map(); // rel → { colored: Map, blur: Map, arbitrary: number, coloredTotal, blurTotal }
  const globalColored = new Map();
  const globalBlur = new Map();
  let globalArbitrary = 0;
  let globalArbitraryColored = 0;
  let coloredTotal = 0;
  let blurTotal = 0;

  for (const file of files) {
    // blankComments: komentar di-blank (jangan dihitung), string & template
    // literal dipertahankan (className dinamis tetap dihitung).
    const src = blankComments(fs.readFileSync(file, 'utf8'));
    const rec = { colored: new Map(), blur: new Map(), arbitrary: 0, coloredTotal: 0, blurTotal: 0 };

    let m;
    COLORED_RE.lastIndex = 0;
    while ((m = COLORED_RE.exec(src)) !== null) {
      const cls = `${m[1]}-${m[2]}${m[3] ? `/${m[3]}` : ''}`;
      rec.colored.set(cls, (rec.colored.get(cls) || 0) + 1);
      globalColored.set(cls, (globalColored.get(cls) || 0) + 1);
      rec.coloredTotal++;
      coloredTotal++;
    }
    BLUR_RE.lastIndex = 0;
    while ((m = BLUR_RE.exec(src)) !== null) {
      const cls = m[0];
      rec.blur.set(cls, (rec.blur.get(cls) || 0) + 1);
      globalBlur.set(cls, (globalBlur.get(cls) || 0) + 1);
      rec.blurTotal++;
      blurTotal++;
    }
    ARBITRARY_RE.lastIndex = 0;
    while ((m = ARBITRARY_RE.exec(src)) !== null) {
      rec.arbitrary++;
      globalArbitrary++;
      if (COLOR_LITERAL_RE.test(m[1])) globalArbitraryColored++;
    }

    if (rec.coloredTotal > 0 || rec.blurTotal > 0 || rec.arbitrary > 0) {
      perFile.set(rel(file), rec);
    }
  }

  const byColored = [...perFile.entries()].sort((a, b) => b[1].coloredTotal - a[1].coloredTotal);
  const byBlur = [...perFile.entries()].sort((a, b) => b[1].blurTotal - a[1].blurTotal);
  const topColoredClasses = [...globalColored.entries()].sort((a, b) => b[1] - a[1]);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          files: files.length,
          coloredShadow: {
            total: coloredTotal,
            unique: globalColored.size,
            topClasses: Object.fromEntries(topColoredClasses.slice(0, 10)),
          },
          backdropBlur: {
            total: blurTotal,
            breakdown: Object.fromEntries([...globalBlur.entries()].sort((a, b) => b[1] - a[1])),
          },
          arbitraryShadow: globalArbitrary,
          arbitraryShadowColored: globalArbitraryColored,
          topFilesByColored: byColored.slice(0, 10).map(([f, r]) => [f, r.coloredTotal]),
          topFilesByBlur: byBlur.slice(0, 10).map(([f, r]) => [f, r.blurTotal]),
          failAbove: failAbove,
          gate: failAbove !== null ? (coloredTotal > failAbove ? 'FAIL' : 'OK') : 'off',
        },
        null,
        2
      )
    );
  } else {
    console.log(`\n🎨 Audit Desain — jejak AI slop (${files.length} file src)`);
    console.log('='.repeat(72));
    console.log(`Shadow berwarna : ${coloredTotal} kemunculan, ${globalColored.size} kombinasi unik`);
    console.log(`backdrop-blur   : ${blurTotal} kemunculan, ${globalBlur.size} varian`);
    console.log(`shadow-[...]    : ${globalArbitrary} arbitrary (${globalArbitraryColored} berisi warna hardcoded rgb/hex)`);

    console.log(`\n📊 Top ${Math.min(topN, topColoredClasses.length)} shadow berwarna + rekomendasi:`);
    for (const [cls, n] of topColoredClasses.slice(0, topN)) {
      console.log(`   ${String(n).padStart(4)}×  shadow-${cls.padEnd(16)} ${recommend(cls)}`);
    }

    console.log(`\n📊 Top ${Math.min(topN, byColored.length)} file — shadow berwarna:`);
    for (const [f, r] of byColored.slice(0, topN)) {
      const top = [...r.colored.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, n]) => `${c}×${n}`)
        .join(', ');
      console.log(`   ${String(r.coloredTotal).padStart(4)}  ${f}   [${top}]`);
    }

    console.log(`\n📊 Top ${Math.min(topN, byBlur.length)} file — backdrop-blur:`);
    for (const [f, r] of byBlur.slice(0, topN)) {
      console.log(`   ${String(r.blurTotal).padStart(4)}  ${f}`);
    }

    console.log(`\n💡 Panduan penggantian:`);
    console.log(`   • Glow berwarna (shadow-emerald-500/20 dll) → shadow generik (shadow-md/lg)`);
    console.log(`     untuk elevasi, atau border border-<warna>-200 bila tint disengaja — border`);
    console.log(`     lebih hemat render (tanpa spread box-shadow berwarna).`);
    console.log(`   • backdrop-blur-xl berlebihan → turunkan ke sm/md atau hapus pada elemen statis.`);
    console.log(`   • Monitor: --fail-above <N> di CI agar total shadow berwarna tidak bertambah.`);

    if (failAbove !== null) {
      console.log(
        `\n🚦 CI gate: fail-above=${failAbove}, total=${coloredTotal} → ${coloredTotal > failAbove ? 'FAIL' : 'OK'}`
      );
    }
    console.log('');
  }

  process.exit(failAbove !== null && coloredTotal > failAbove ? 1 : 0);
}

main();
