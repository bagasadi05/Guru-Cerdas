#!/usr/bin/env node
/**
 * Audit: deteksi DEAD EXPORT di mock — kebalikan dari audit-stale-mocks.
 *
 *   audit-stale-mocks  : fungsi yang DIPAKAI konsumen tapi TIDAK disediakan mock → STALE
 *   audit-dead-exports : fungsi yang DISEDIAKAN mock tapi TIDAK pernah di-import → DEAD
 *
 * Nilai: mock yang masih menyediakan export yang sudah tidak dipakai siapa pun
 * (mis. service memindahkan/rename export `getXLSX` → `getExcelJS` tapi mock
 * masih menyediakan `getXLSX` yang tidak pernah di-import — sisa basi yang
 * menyesatkan pembaca dan bisa menutupi refactor yang sudah selesai).
 *
 * Algoritma:
 *   1. Scan semua `vi.mock('<modul>', factory)` di tiap test file (filter sama
 *      dengan audit-stale-mocks: skip komentar, partial/automock/options/opaque).
 *   2. Ekstrak key level-top dari objek yang dikembalikan factory
 *      (`extractReturnedObject` + `extractProvidedKeys`, sadar string/komentar/
 *      template; key computed `[x]:` dilewati karena namanya tak bisa
 *      diverifikasi statis).
 *   3. Kumpulkan export yang benar-benar di-import konsumen (test file + chain
 *      BFS `--depth`, minus modul yang dirinya dimock) — identik dengan sibling
 *      via `collectUsedFromModule`.
 *   4. DEAD (exit 1) = key yang disediakan mock tapi tidak pernah di-import,
 *      DENGAN SYARAT aman diverifikasi:
 *        - factory tidak memakai spread top-level (`{ ...actual, x }` → key
 *          lain tak bisa diverifikasi; turunkan ke info)
 *        - tidak ada konsumen yang memakai `import * as X` dari modul tsb
 *          (namespace import → key apapun bisa dipakai via `X.<key>`)
 *        - tidak ada konsumen yang memuat modul tsb via `import('...')`
 *          (dynamic import → export yang dimuat dinamis tak terlihat scanner)
 *        - modul punya setidaknya satu konsumen static (kalau nol, bisa jadi
 *          dimuat dynamic import yang tidak dipindai → info, bukan DEAD)
 *
 * Batasan yang disengaja (arah aman under-detect, hindari false positive):
 *   - Factory non-objek-literal / tanpa return objek → dilewati (info).
 *   - Key computed `[expr]:` → dilewati (nama tak bisa diketahui statis).
 *   - Dynamic import (`await import('...')`) tidak diikuti — modul yang hanya
 *     dimuat dinamis dilaporkan sebagai info, bukan DEAD.
 *   - Chain import dibatasi `--depth` (default 3, maks 5).
 *
 * Exit code: 0 = bersih, 1 = ditemukan dead export (bisa dipakai di CI).
 *
 * Usage: node scripts/audit-dead-exports.cjs [--depth N]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  findTestFiles,
  extractMockCall,
  splitMockArgs,
  classifyFactory,
  readCached,
  resolveCached,
  collectUsedFromModule,
  getDynamicImportSpecs,
  specsPointToSameModule,
  factoryBody,
  parseDepth,
} = require('./audit-lib.cjs');

// Cari index penutup `closeCh` yang matching bukaan `openCh` di `openIdx`
// (sadar string, komentar, template literal).
function findClosing(text, openIdx, openCh, closeCh) {
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      if (nl === -1) return -1;
      i = nl;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '`') inTemplate = true;
    else if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Cari index sesudah keyword `return` terakhir di depth-1 dalam block body
// `{ ... }` (digunakan factory dengan statement, mis. helper lokal).
function findLastTopLevelReturn(text) {
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  let last = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '`') inTemplate = true;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (depth === 1 && /^return\b/.test(text.slice(i)) && (i === 0 || /\s/.test(text[i - 1]))) {
      last = i + 6;
      i += 5;
    }
  }
  return last;
}

// Ekstrak teks objek literal yang dikembalikan factory: `({ ... })` atau
// block body `{ ... return { ... } }`. Return null jika bukan objek literal.
function extractReturnedObject(factory) {
  const body = factoryBody(factory);
  if (!body) return null;
  if (body[0] === '(') {
    const close = findClosing(body, 0, '(', ')');
    if (close === -1) return null;
    const inner = body.slice(1, close).trim();
    if (inner[0] !== '{') return null;
    return inner;
  }
  if (body[0] === '{') {
    const retIdx = findLastTopLevelReturn(body);
    if (retIdx === -1) return null;
    let expr = body.slice(retIdx).trim();
    if (expr.startsWith('(')) {
      const close = findClosing(expr, 0, '(', ')');
      if (close === -1) return null;
      expr = expr.slice(1, close).trim();
    }
    if (expr[0] !== '{') return null;
    return expr;
  }
  return null;
}

// Lompati satu nilai penuh mulai `start` (sadar kurung/kurung kurawal, string,
// komentar, template). Return index char setelah nilai selesai (`,` / `;` /
// `}` penutup objek literal).
function skipValue(text, start) {
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  let i = start;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null;
      i++;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? len : nl + 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      i++;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0 && ch === '}') return i; // penutup objek literal
      depth--;
      i++;
      continue;
    }
    if (depth === 0 && (ch === ',' || ch === ';')) return i;
    i++;
  }
  return len;
}

// Cari index kutip penutup string mulai `start` (sadar backslash-escape).
function findStringEnd(text, start) {
  const q = text[start];
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === q) return i;
  }
  return -1;
}

// Lompati seluruh computed key `[expr]: value` mulai `[` — nama key tidak
// bisa diketahui statis. Return index setelah key (siap scan berikutnya).
function skipComputedKey(text, start) {
  const close = findClosing(text, start, '[', ']');
  if (close === -1) return text.length;
  let k = close + 1;
  while (k < text.length && /\s/.test(text[k])) k++;
  if (text[k] === ':') {
    // lompati nilai computed key juga
    let v = k + 1;
    while (v < text.length && /\s/.test(text[v])) v++;
    return skipValue(text, v);
  }
  return k;
}

// Klasifikasi bentuk nilai export (untuk pelaporan; semua key "leaf"/"object"/
// "array" tetap diverifikasi — yang penting adalah nama key-nya).
function classifyValue(text, v) {
  const ch = text[v];
  if (ch === '{') return 'object';
  if (ch === '[') return 'array';
  return 'leaf';
}

// Ekstrak key level-top dari objek literal (`{ a: 1, b: { c: 2 } }` → a, b).
// Return { keys: [{name, kind}], hasSpread }.
// Nilai (vi.fn(...), arrow, objek, array, string, dsb.) selalu di-skip utuh
// via skipValue sehingga tidak pernah salah terbaca sebagai key palsu.
// Key computed `[x]:` dilewati (nama tak bisa diverifikasi statis).
function extractProvidedKeys(objText) {
  const keys = [];
  let hasSpread = false;
  let depth = 0;
  let i = objText[0] === '{' ? 1 : 0; // mulai dari isi objek
  const len = objText.length;
  while (i < len) {
    const ch = objText[i];
    // Komentar (bisa muncul di antara key)
    if (ch === '/' && objText[i + 1] === '/') {
      const nl = objText.indexOf('\n', i);
      i = nl === -1 ? len : nl + 1;
      continue;
    }
    if (ch === '/' && objText[i + 1] === '*') {
      const end = objText.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    if (depth === 0 && ch === '[') {
      i = skipComputedKey(objText, i);
      continue;
    }
    if (depth === 0 && (ch === '"' || ch === "'")) {
      // key dikutip: `'name': value`
      const close = findStringEnd(objText, i);
      if (close === -1) break;
      const name = objText.slice(i + 1, close);
      let k = close + 1;
      while (k < len && /\s/.test(objText[k])) k++;
      if (objText[k] === ':') {
        let v = k + 1;
        while (v < len && /\s/.test(objText[v])) v++;
        keys.push({ name, kind: classifyValue(objText, v) });
        i = skipValue(objText, v);
      } else {
        i = close + 1;
      }
      continue;
    }
    if (depth === 0 && ch === '`') {
      // template-literal key — nama tak sederhana; lewati sampai backtick tutup
      const close = objText.indexOf('`', i + 1);
      i = close === -1 ? len : close + 1;
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      i++;
      continue;
    }
    if (depth !== 0) {
      i++;
      continue;
    }
    // Level top objek literal — spread `...actual` / `...foo()` / `...{ a: 1 }`.
    // skipValue melompati seluruh ekspresi spread sampai `,`/`;`/`}` di depth 0
    // sehingga nama sumber spread tidak pernah terbaca sebagai shorthand key
    // palsu. hasSpread menandakan key lain tak bisa diverifikasi statis.
    if (ch === '.' && objText[i + 1] === '.' && objText[i + 2] === '.') {
      hasSpread = true;
      i = skipValue(objText, i + 3);
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < len && /[\w$]/.test(objText[j])) j++;
      const name = objText.slice(i, j);
      let k = j;
      while (k < len && /\s/.test(objText[k])) k++;
      if (objText[k] === ':') {
        let v = k + 1;
        while (v < len && /\s/.test(objText[v])) v++;
        keys.push({ name, kind: classifyValue(objText, v) });
        i = skipValue(objText, v);
        continue;
      }
      if (objText[k] === '(') {
        // method shorthand `name() { ... }`
        keys.push({ name, kind: 'leaf' });
        i = skipValue(objText, k);
        continue;
      }
      if (objText[k] === ',' || objText[k] === '}') {
        // shorthand `name,`
        keys.push({ name, kind: 'leaf' });
        i = k;
        continue;
      }
      i = j;
      continue;
    }
    i++;
  }
  return { keys, hasSpread };
}

function main() {
  const maxDepth = parseDepth();
  const testFiles = [
    ...findTestFiles(path.join(ROOT, 'tests')),
    ...findTestFiles(path.join(ROOT, 'src')),
  ];

  const dead = [];
  const infos = [];
  let analyzed = 0;

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf8');

    // Semua modul yang dimock di test file ini (path absolut)
    const mockedAbs = new Set();
    {
      const re2 = /vi\.mock\(\s*['"]([^'"]+)['"]/g;
      let m2;
      while ((m2 = re2.exec(content)) !== null) {
        if (m2[1].startsWith('.') || m2[1].startsWith('/')) {
          const r = resolveCached(testFile, m2[1]);
          if (r) mockedAbs.add(r);
        }
      }
    }

    const mockRe = /vi\.mock\(\s*['"]([^'"]+)['"]/g;
    let mock;
    while ((mock = mockRe.exec(content)) !== null) {
      // Skip vi.mock yang dikomentari
      const lineStart = content.lastIndexOf('\n', mock.index - 1) + 1;
      if (/^\s*\/\//.test(content.slice(lineStart, mock.index))) continue;

      const mockBlock = extractMockCall(content, mock.index);
      const { spec, factory } = splitMockArgs(mockBlock);
      const kind = classifyFactory(factory);
      const rel = path.relative(ROOT, testFile).replace(/\\/g, '/');

      if (kind !== 'factory') {
        infos.push({
          file: rel,
          spec,
          note: `mock ${kind} — dilewati (tidak bisa diverifikasi statis)`,
        });
        continue;
      }

      const objText = extractReturnedObject(factory);
      if (!objText) {
        infos.push({
          file: rel,
          spec,
          note: 'factory tidak mengembalikan objek literal (mis. Object.assign / variabel) — dilewati',
        });
        continue;
      }
      analyzed++;

      const { keys, hasSpread } = extractProvidedKeys(objText);
      const providedNames = [...new Set(keys.map((k) => k.name))].sort();
      if (providedNames.length === 0) {
        infos.push({
          file: rel,
          spec,
          note: 'factory objek tanpa key eksplisit (mungkin spread penuh) — dilewati',
        });
        continue;
      }

      // Export yang benar-benar di-import konsumen (test file + chain BFS,
      // minus modul yang dirinya dimock di test yang sama)
      const { consumers, used, namespaceImport } = collectUsedFromModule(testFile, content, mockedAbs, maxDepth, spec);

      // Dynamic import `import('...')`/`await import('...')` → export yang
      // dimuat dinamis tidak terlihat oleh scanner static import. Guard ini
      // mencegah false positive saat konsumen meng-import sebagian key secara
      // static (used.size > 0) tapi key lain lewat jalur dinamis.
      // (Namespace import `import * as X` sudah ditandai oleh lib via flag
      // `namespaceImport` — key apapun bisa dipakai via `X.<key>`.)
      let dynamicImport = false;
      for (const consumer of consumers) {
        const fc = readCached(consumer);
        for (const importSpec of getDynamicImportSpecs(fc)) {
          if (specsPointToSameModule(spec, importSpec, testFile, consumer)) {
            dynamicImport = true;
            break;
          }
        }
        if (dynamicImport) break;
      }

      const deadKeys = [...new Set(keys.filter((k) => !used.has(k.name)).map((k) => k.name))].sort();
      if (deadKeys.length === 0) continue;

      if (used.size === 0) {
        infos.push({
          file: rel,
          spec,
          note: `modul tidak di-import konsumen static (maks ${maxDepth} level) — ${deadKeys.length} key berpotensi dead: ${deadKeys.join(', ')}`,
        });
        continue;
      }
      if (namespaceImport) {
        infos.push({
          file: rel,
          spec,
          note: `namespace import (import * as) dari modul ini — key ${deadKeys.join(', ')} tak bisa diverifikasi dead`,
        });
        continue;
      }
      if (dynamicImport) {
        infos.push({
          file: rel,
          spec,
          note: `dynamic import (import('...')) dari modul ini — key ${deadKeys.join(', ')} tak bisa diverifikasi dead`,
        });
        continue;
      }
      if (hasSpread) {
        infos.push({
          file: rel,
          spec,
          note: `factory spread top-level — key ${deadKeys.join(', ')} mungkin dipakai/disediakan via spread (tak bisa diverifikasi)`,
        });
        continue;
      }
      dead.push({
        file: rel,
        spec,
        provided: providedNames,
        used: [...used].sort(),
        deadKeys,
      });
    }
  }

  // ── Laporan ──
  console.log(`\n📋 Audit Dead Export — key mock yang tidak pernah di-import (${testFiles.length} test files di-scan, ${analyzed} mock dianalisis, kedalaman konsumen ${maxDepth})`);

  if (dead.length === 0) {
    console.log('✅ BERSIH — tidak ada mock yang menyediakan export yang tidak pernah di-import.\n');
  } else {
    console.log(`❌ ${dead.length} mock dengan DEAD export ditemukan:\n`);
    for (const d of dead) {
      console.log(`  • ${d.file}`);
      console.log(`    Mock target : ${d.spec}`);
      console.log(`    Disediakan  : ${d.provided.join(', ')}`);
      console.log(`    Dipakai     : ${d.used.join(', ')}`);
      console.log(`    DEAD        : ${d.deadKeys.join(', ')}`);
      console.log('');
    }
  }

  if (infos.length > 0) {
    console.log(`ℹ️  ${infos.length} mock dilewati/informasi (partial, automock, opaque, non-objek-literal, spread/namespace-uncertain, tanpa konsumen static):`);
    const shown = infos.slice(0, 60);
    for (const p of shown) {
      console.log(`   • ${p.file} — ${p.spec} — ${p.note}`);
    }
    if (infos.length > shown.length) console.log(`   … dan ${infos.length - shown.length} lainnya`);
    console.log('');
  }

  process.exit(dead.length > 0 ? 1 : 0);
}

main();
