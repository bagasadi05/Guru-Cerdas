#!/usr/bin/env node
/**
 * analyze-bundle.cjs — Laporan ukuran bundle produksi.
 *
 * Sumber data:
 *   1. `dist/index.html`  — chunk entry + modulepreload (apa yang benar-benar
 *      diunduh pada page load pertama, mis. halaman login).
 *   2. `dist/assets/js/*.js` — ukuran chunk (raw + gzip).
 *   3. `dist/stats.html`  — output rollup-plugin-visualizer (dihasilkan oleh
 *      `npm run analyze` / `ANALYZE=true vite build`). Berisi module graph
 *      (uid -> { id, imported, importedBy }) untuk menelusuri WHO imports WHAT.
 *
 * Output: 3 bagian —
 *   A. Initial-load closure (entry + import statis, DFS) + total payload.
 *   B. Top-N chunk TERBESAR di initial load (default 5) — target code-split.
 *   C. Importers of a given heavy lib (default 'jspdf') — siapa yang menarik
 *      lib statis ke bundle.
 *
 * Usage:
 *   node scripts/analyze-bundle.cjs                 # semua bagian, default jspdf
 *   node scripts/analyze-bundle.cjs --lib exceljs   # lacak lib lain
 *   node scripts/analyze-bundle.cjs --top 8         # top 8 chunk initial
 *
 * Exit code: 0 selalu (ini laporan, bukan gate).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'dist', 'assets', 'js');
const INDEX_HTML = path.join(ROOT, 'dist', 'index.html');
const STATS_HTML = path.join(ROOT, 'dist', 'stats.html');

const args = process.argv.slice(2);
const libArg = args.indexOf('--lib');
const TRACE_LIB = libArg !== -1 ? args[libArg + 1] : 'jspdf';
const topArg = args.indexOf('--top');
const TOP_N = topArg !== -1 ? parseInt(args[topArg + 1], 10) || 5 : 5;

const KiB = (n) => (n / 1024).toFixed(1) + ' KiB';

// ── 1. Ukuran chunk (raw + gzip) ──────────────────────────────────────────
function chunkSizes() {
  if (!fs.existsSync(JS_DIR)) return {};
  const out = {};
  for (const f of fs.readdirSync(JS_DIR)) {
    if (!f.endsWith('.js')) continue;
    const buf = fs.readFileSync(path.join(JS_DIR, f));
    out[f] = { raw: buf.length, gz: zlib.gzipSync(buf).length };
  }
  return out;
}

// ── 2. Static imports: `import{...}from"./x.js"` (bukan `import("./x.js")`) ─
function staticImports(chunkFile) {
  const src = fs.readFileSync(path.join(JS_DIR, chunkFile), 'utf8');
  const out = new Set();
  // Rollup/Vite emits static imports as `import{...}from"./chunk.js"`.
  const re = /from"\.\/([A-Za-z0-9_.-]+\.js)"/g;
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return out;
}

// ── 3. Initial-load closure dari index.html ────────────────────────────────
function initialClosure(sizes) {
  if (!fs.existsSync(INDEX_HTML)) return [];
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const entries = [...html.matchAll(/(?:src|href)="([^"]*\.js)"/g)]
    .map((m) => m[1].split('/').pop())
    .filter((f) => sizes[f]);
  const seen = new Set();
  const q = [...new Set(entries)];
  const order = [];
  while (q.length) {
    const f = q.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    order.push(f);
    for (const dep of staticImports(f)) if (!seen.has(dep)) q.push(dep);
  }
  return order;
}

// ── 4. Visualizer graph (uid -> { id, imported, importedBy }) ──────────────
// stats.html embeds `const data = {...};` followed by the chart-rendering JS
// in the SAME <script> tag, so we cannot cut at lastIndexOf('}') — a brace
// scanner that respects strings/escapes is needed to find the true end of the
// JSON object.
function extractJsonObject(blob) {
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < blob.length; i++) {
    const c = blob[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '"') {
        inStr = false;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return blob.slice(0, i + 1);
    }
  }
  return null; // unbalanced — not valid JSON
}

function visualizerGraph() {
  if (!fs.existsSync(STATS_HTML)) return null;
  const html = fs.readFileSync(STATS_HTML, 'utf8');
  const start = html.indexOf('const data = ');
  if (start === -1) return null;
  const end = html.indexOf('</script>', start);
  const blob = html.slice(start + 'const data = '.length, end);
  const json = extractJsonObject(blob);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── 5. Siapa yang meng-import lib target (via graph) ───────────────────────
// Hanya importer EKSTERNAL yang dilaporkan: modul dalam lib sendiri saling
// import satu sama lain (internal noise), sehingga importer yang id-nya juga
// mengandung needle dibuang — menyisakan pelaku sebenarnya di src/node_modules
// yang menarik lib ke bundle.
//
// Struktur stats.html (rollup-plugin-visualizer v6): data = { version, tree,
// nodeParts, nodeMetas, env }. nodeMetas[uid] = { id, moduleParts, imported:
// [{uid}], importedBy: [{uid}] }. `imported` = modul yang DI-IMPORT oleh node
// ini; `importedBy` = modul yang MENG-IMPORT node ini. Untuk mencari siapa yang
// meng-import lib target, periksa `imported` setiap node (bukan `importedBy` —
// itu malah mengembalikan dependency lib sendiri, lihat riwayat fix ini).
function traceImporters(graph, needle) {
  if (!graph) return { note: 'stats.html tidak ditemukan — jalankan ANALYZE=true vite build dulu', importers: [] };
  const metas = graph.nodeMetas || graph; // v6 => nodeMetas; fallback ke flat
  const entries = Object.entries(metas).filter(
    ([, v]) => v && typeof v === 'object' && typeof v.id === 'string'
  );
  const libUids = new Set(
    entries.filter(([, v]) => v.id.includes(needle)).map(([uid]) => uid)
  );
  if (!libUids.size) return { note: `tidak ada modul berisi "${needle}"`, importers: [] };
  const external = [];
  for (const [, v] of entries) {
    if (v.id.includes(needle)) continue; // internal lib modules: noise
    const im = (v.imported || []).map((i) => (i && i.uid) || i);
    if (im.some((i) => libUids.has(i))) {
      external.push(v.id.replace(ROOT.replace(/\\/g, '/'), '.'));
    }
  }
  // de-dupe + sort by path
  const uniq = [...new Set(external)].sort();
  // Catatan: jika hasilnya 0/sedikit, itu NORMAL untuk lib yang hanya dipakai via
  // `await import()` dinamis — jangan dibaca sebagai kegagalan script. Type-only
  // imports (`import type`) terhapus saat compile, sehingga tidak pernah muncul
  // sebagai importer di graph. Chunk yang muncul di initial load padahal 0
  // importer statis = artifact modulepreload Vite (lihat docs/BUNDLE_PERFORMANCE_REPORT.md).
  return { note: `importer EKSTERNAL "${needle}": ${uniq.length} modul (dynamic-import sites)`, importers: uniq };
}

// ── Main ──────────────────────────────────────────────────────────────────
const sizes = chunkSizes();
if (!Object.keys(sizes).length) {
  console.error('dist/assets/js tidak ada — jalankan `npm run build` dulu.');
  process.exit(0);
}

console.log('=== A. INITIAL LOAD CLOSURE (dari dist/index.html) ===');
const closure = initialClosure(sizes);
let rawT = 0;
let gzT = 0;
const rows = closure.map((f) => ({ f, ...sizes[f] })).sort((a, b) => b.raw - a.raw);
for (const r of rows) {
  rawT += r.raw;
  gzT += r.gz;
  console.log(`  ${r.f.padEnd(40)} ${String(r.raw).padStart(9)} raw | gzip ${String(r.gz).padStart(8)}`);
}
console.log(
  `  TOTAL initial: ${rawT} raw (${KiB(rawT)}), gzip ${gzT} (${KiB(gzT)}) — ${rows.length} chunk`
);

console.log(`\n=== B. TOP ${TOP_N} CHUNK TERBESAR DI INITIAL LOAD ===`);
for (const r of rows.slice(0, TOP_N)) {
  const pct = ((r.gz / gzT) * 100).toFixed(1);
  console.log(`  #${rows.indexOf(r) + 1} ${r.f.padEnd(36)} gzip ${String(r.gz).padStart(8)} (${pct}% dari total gzip)`);
}

console.log(`\n=== C. PELACAKAN IMPORT "${TRACE_LIB}" (via stats.html graph) ===`);
const graph = visualizerGraph();
if (graph) {
  const { note, importers } = traceImporters(graph, TRACE_LIB);
  console.log(`  ${note}`);
  for (const imp of importers.slice(0, 25)) console.log(`    - ${imp}`);
  if (importers.length > 25) console.log(`    ... dan ${importers.length - 25} lainnya`);
} else {
  console.log('  stats.html tidak ditemukan / gagal parse — jalankan ANALYZE=true vite build.');
}

// ── 6. Bonus: chunk terbesar di SELURUH bundle (lazy pun) ──────────────────
console.log('\n=== D. TOP 10 CHUNK TERBESAR DI SELURUH BUNDLE (termasuk lazy) ===');
const all = Object.entries(sizes).sort((a, b) => b[1].raw - a[1].raw).slice(0, 10);
for (const [f, s] of all) {
  console.log(`  ${f.padEnd(40)} ${String(s.raw).padStart(9)} raw | gzip ${String(s.gz).padStart(8)}`);
}
