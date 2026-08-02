#!/usr/bin/env node
/**
 * Utilitas bersama untuk script audit mock di test suite.
 *
 * Dipakai oleh:
 *   - scripts/audit-stale-mocks.cjs  (mock ketinggalan export yang dipakai)
 *   - scripts/audit-dead-exports.cjs (mock menyediakan export yang tak dipakai)
 *
 * Semua fungsi di sini MURNI dan bebas efek samping global selain cache baca
 * file & resolve path (aman — file tidak berubah selama satu run audit).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Kumpulkan semua test file
function findTestFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findTestFiles(full, out);
    } else if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Ekstrak blok pemanggilan vi.mock(...) lengkap mulai dari index 'vi.mock'
// dengan paren-matching yang sadar string & komentar (quote-aware).
function extractMockCall(content, startIndex) {
  const open = content.indexOf('(', startIndex);
  if (open === -1) return '';
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  for (let i = open; i < content.length; i++) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    // Skip komentar (gaya kode bisa berisi kurung/kutip yang tak memengaruhi blok)
    if (ch === '/' && content[i + 1] === '/') {
      const nl = content.indexOf('\n', i);
      if (nl === -1) return content.slice(startIndex);
      i = nl;
      continue;
    }
    if (ch === '/' && content[i + 1] === '*') {
      const end = content.indexOf('*/', i + 2);
      if (end === -1) return content.slice(startIndex);
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '`') inTemplate = true;
    else if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return content.slice(startIndex, i + 1);
    }
  }
  return content.slice(startIndex);
}

// Pecah `vi.mock(<spec>, <factory>)` → [spec, factory]
function splitMockArgs(mockBlock) {
  const open = mockBlock.indexOf('(');
  let i = open + 1;
  while (i < mockBlock.length && /\s/.test(mockBlock[i])) i++;
  const q = mockBlock[i];
  if (q !== "'" && q !== '"') return { spec: '', factory: '' };
  let end = i + 1;
  while (end < mockBlock.length && mockBlock[end] !== q) end++;
  const spec = mockBlock.slice(i + 1, end);
  i = end + 1;
  while (i < mockBlock.length && /\s/.test(mockBlock[i])) i++;
  if (mockBlock[i] !== ',') return { spec, factory: '' };
  i++;
  let factory = mockBlock.slice(i).trim();
  if (factory.endsWith(')')) factory = factory.slice(0, -1).trim();
  return { spec, factory };
}

// Isi ekspresi setelah tanda panah factory (`async (x) => <BODY>`) — dipakai
// oleh classifyFactory dan audit-dead-exports untuk mengurai objek yang
// dikembalikan factory.
//
// PENTING: pemotongan dilakukan pada `=>` PERTAMA di depth 0 (di luar string,
// komentar, template). Pendekatan regex naif seperti `^(\([^)]*\)\s*=>)`
// SALAH pada factory `() => ({ a: vi.fn(() => ...) })` — `[^)]*` berhenti di
// `)` dalam `vi.fn(` lalu cocok `=>` di dalamnya, sehingga wrapper `(...)` objek
// literal ikut terpotong (bug descent yang menghasilkan false positive DEAD
// export). Scanner depth-aware ini hanya memotong `=>` parameter arrow, bukan
// `=>` di dalam body objek.
function factoryBody(factory) {
  let t = factory.trim();
  t = t.replace(/^async\s*/, '');
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  for (let i = 0; i < t.length - 1; i++) {
    const ch = t[i];
    const prev = i > 0 ? t[i - 1] : '';
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (ch === '/' && t[i + 1] === '/') {
      const nl = t.indexOf('\n', i);
      if (nl === -1) return '';
      i = nl;
      continue;
    }
    if (ch === '/' && t[i + 1] === '*') {
      const end = t.indexOf('*/', i + 2);
      if (end === -1) return '';
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') {
      depth++;
      continue;
    }
    if (ch === ')' || ch === '}' || ch === ']') {
      depth--;
      continue;
    }
    if (ch === '=' && t[i + 1] === '>' && depth === 0) {
      return t.slice(i + 2).trim();
    }
  }
  return '';
}

// Klasifikasi factory: mana yang bisa diverifikasi secara statis
function classifyFactory(factory) {
  const t = factory.trim();
  if (!t) return 'automock';
  if (t.includes('importOriginal')) return 'partial';
  // Form options Vitest 4: vi.mock(path, { spy: true }) — bukan factory export
  if (/^\s*\{\s*(spy|shallow|stub)\s*:/.test(t)) return 'options';
  const afterArrow = factoryBody(t);
  if (/^[A-Za-z_$][\w$]*$/.test(afterArrow)) return 'opaque-var';
  return 'factory';
}

// Deteksi spread di level TOP dari objek yang dikembalikan factory
// (mis. `() => ({ ...actual, getXLSX: vi.fn() })`). Spread di dalam callback
// bersarang seperti `vi.fn(() => ({ ...state }))` BUKAN top-level.
function hasTopLevelSpread(factory) {
  let depth = 0;
  let quote = null;
  let inTemplate = false;
  for (let i = 0; i < factory.length; i++) {
    const ch = factory[i];
    const prev = i > 0 ? factory[i - 1] : '';
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }
    if (ch === '/' && factory[i + 1] === '/') {
      const nl = factory.indexOf('\n', i);
      if (nl === -1) return false;
      i = nl;
      continue;
    }
    if (ch === '/' && factory[i + 1] === '*') {
      const end = factory.indexOf('*/', i + 2);
      if (end === -1) return false;
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '`') inTemplate = true;
    else if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth--;
    else if (ch === '.' && factory[i + 1] === '.' && factory[i + 2] === '.') {
      // Top-level return object: `() => ({ ...` → depth 2; `() => { return { ...` → depth 2.
      // Nested vi.fn callbacks push depth jauh di atas 2.
      if (depth <= 2) return true;
    }
  }
  return false;
}

// Apakah mock menyediakan key `fn` di dalam factory (fn: / "fn": / 'fn':)
function mockProvides(factory, fn) {
  const f = escapeRegExp(fn);
  return new RegExp(`(?:^|[,\\s{(])["']?${f}["']?\\s*:`).test(factory);
}

// Nama modul lokal yang di-import test (relative path)
function extractImports(content) {
  const imports = new Set();
  const re = /import\s+(?:type\s+)?(?:[\w{},\s*]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('/')) imports.add(spec);
  }
  return [...imports];
}

// Resolve relative import ke path absolut (coba beberapa ekstensi)
function resolveLocalPath(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

// ── Cache baca file & resolve path (file tidak berubah selama satu run audit) ──
const contentCache = new Map();
const resolveCache = new Map();

function readCached(filePath) {
  if (!contentCache.has(filePath)) contentCache.set(filePath, fs.readFileSync(filePath, 'utf8'));
  return contentCache.get(filePath);
}

function resolveCached(fromFile, spec) {
  const key = `${fromFile}::${spec}`;
  if (!resolveCache.has(key)) resolveCache.set(key, resolveLocalPath(fromFile, spec));
  return resolveCache.get(key);
}

// Kumpulkan semua konsumen (test file + chain import lokal) via BFS,
// maksimal `maxDepth` level transitif. Cabang berhenti pada:
//   - modul yang dirinya dimock di test yang sama (mockedAbs) — aslinya tak
//     pernah dimuat, jadi import-nya tidak pernah tereksekusi
//   - modul yang sudah dikunjungi (visited) — mencegah loop siklus import
function getConsumerFiles(testFile, testContent, mockedAbs, maxDepth) {
  const consumers = [];
  const visited = new Set([testFile]);
  const queue = [{ file: testFile, content: testContent, depth: 0 }];
  while (queue.length > 0) {
    const { file, content, depth } = queue.shift();
    consumers.push(file);
    if (depth >= maxDepth) continue;
    for (const imp of extractImports(content)) {
      const resolved = resolveCached(file, imp);
      if (!resolved || visited.has(resolved) || mockedAbs.has(resolved)) continue;
      visited.add(resolved);
      queue.push({ file: resolved, content: readCached(resolved), depth: depth + 1 });
    }
  }
  return consumers;
}

// Arg CLI: --depth N (default 3, maks 5)
function parseDepth() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--depth');
  if (i !== -1 && args[i + 1] && /^\d+$/.test(args[i + 1])) {
    return Math.min(Number.parseInt(args[i + 1], 10), 5);
  }
  return 3;
}

// Apakah dua spec menunjuk modul yang sama? (lokal: samakan ke path absolut)
function specsPointToSameModule(specA, specB, fromFileA, fromFileB) {
  const aLocal = specA.startsWith('.') || specA.startsWith('/');
  const bLocal = specB.startsWith('.') || specB.startsWith('/');
  if (aLocal !== bLocal) return false;
  if (!aLocal) {
    return specA === specB || specB.startsWith(`${specA}/`) || specA.startsWith(`${specB}/`);
  }
  const ra = resolveCached(fromFileA, specA);
  const rb = resolveCached(fromFileB, specB);
  return !!ra && !!rb && ra === rb;
}

// Semua named import `import { a, b } from '<spec>'` dalam sebuah file
// (skip `import type`, buang modifier `type ` dan alias ` as x` — key mock
// adalah nama export asli, bukan alias lokal).
function getAllNamedImports(content) {
  const out = [];
  const re = /import\s+(?!type\b)[^'"]*?\{\s*([^}]+?)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      // Skip inline type-only import `{ type A, B }` — `type A` terhapus saat
      // compile, jadi mock TIDAK perlu menyediakannya (hindari false STALE).
      .filter((s) => s && !/^type\s+/.test(s))
      .map((s) => s.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    if (names.length) out.push({ spec: m[2], names });
  }
  return out;
}

// Deteksi default import `import X from '<spec>'` DAN bentuk campuran
// `import X, { a } from '<spec>'` / `import X, * as Y from '<spec>'`.
// Return [{ spec, alias }] — alias dipakai untuk melacak penggunaan member
// namespace pada bentuk campuran (lihat getNamespaceUsages).
function getDefaultImports(content) {
  const out = [];
  const rePure = /import\s+(?!type\b)([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
  const reMixed = /import\s+(?!type\b)([A-Za-z_$][\w$]*)\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[\w$]+)\s+from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = rePure.exec(content)) !== null) out.push({ spec: m[2], alias: m[1] });
  while ((m = reMixed.exec(content)) !== null) out.push({ spec: m[2], alias: m[1] });
  return out;
}

// Deteksi namespace import `import * as X from '<spec>'` DAN bentuk campuran
// `import X, * as Y from '<spec>'`. Return [{ spec, alias }].
function getNamespaceImports(content) {
  const out = [];
  const rePure = /import\s+(?!type\b)\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
  const reMixed = /import\s+(?!type\b)[A-Za-z_$][\w$]*\s*,\s*\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = rePure.exec(content)) !== null) out.push({ spec: m[2], alias: m[1] });
  while ((m = reMixed.exec(content)) !== null) out.push({ spec: m[2], alias: m[1] });
  return out;
}

// Ganti isi KOMENTAR (line & block) dengan spasi, menjaga panjang — dipakai
// getNamespaceUsages agar `X.foo` di dalam komentar tidak dihitung sebagai
// penggunaan member (sumber false positive dominan). String literal & template
// literal DIBIARKAN utuh: bracket access `X['foo']` dan interpolasi
// `${X.foo}` adalah penggunaan nyata yang harus tetap terdeteksi.
function blankComments(content) {
  let out = '';
  let quote = null;
  let inTemplate = false;
  let i = 0;
  const len = content.length;
  while (i < len) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';
    if (quote) {
      out += ch;
      if (ch === quote && prev !== '\\') quote = null;
      i++;
      continue;
    }
    if (inTemplate) {
      out += ch;
      if (ch === '`' && prev !== '\\') inTemplate = false;
      i++;
      continue;
    }
    // String literal: pertahankan isi utuh (jangan blank `//` di dalamnya)
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    // Template literal: pertahankan utuh (bisa memuat interpolasi ${...})
    if (ch === '`') {
      inTemplate = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === '/' && content[i + 1] === '/') {
      const nl = content.indexOf('\n', i);
      const stop = nl === -1 ? len : nl;
      while (i < stop) {
        out += ' ';
        i++;
      }
      continue;
    }
    if (ch === '/' && content[i + 1] === '*') {
      const end = content.indexOf('*/', i + 2);
      const stop = end === -1 ? len : end + 2;
      while (i < stop) {
        out += ' ';
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// Nama member namespace yang benar-benar dipakai via alias `X`:
//   X.foo               (member access, termasuk optional chaining X?.foo)
//   X['foo']            (bracket access string)
//   const { a, b } = X  (destructuring — rename `a: alias` & default `b = 1` di-parse)
// Return Set nama member. Batasan (arah aman under-detect):
//   - Akses dinamis `X[variabel]` tidak terdeteksi (nama tak bisa statis).
//   - Shadowing alias di scope bersarang (jarang di test) bisa false positive.
//   - Komentar di-blank agar `X.foo` di dalamnya tidak terhitung; string &
//     template dibiarkan agar bracket access & interpolasi tetap terdeteksi.
function getNamespaceUsages(content, alias) {
  const src = blankComments(content);
  const used = new Set();
  const a = escapeRegExp(alias);
  const reDot = new RegExp(`\\b${a}\\s*(?:\\.|\\?\\.)\\s*([A-Za-z_$][\\w$]*)`, 'g');
  const reBracket = new RegExp(`\\b${a}\\s*\\[\\s*['"]([^'"]+)['"]\\s*\\]`, 'g');
  const reDestruct = new RegExp(`\\b(?:const|let|var)\\s*\\{\\s*([^}]+?)\\s*\\}\\s*=\\s*${a}(?!\\s*(?:\\.|\\?\\.))\\b`, 'g');
  let m;
  while ((m = reDot.exec(src)) !== null) used.add(m[1]);
  while ((m = reBracket.exec(src)) !== null) used.add(m[1]);
  while ((m = reDestruct.exec(src)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/[:=]/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) used.add(name);
    }
  }
  return used;
}

// Deteksi dynamic import `import('<spec>')` / `await import('<spec>')` —
// export yang dimuat via jalur dinamis tidak bisa diverifikasi per-key statis.
// (Regex tidak salah cocok `import.meta`, `vi.importActual`, `vi.mock` karena
// semuanya diikuti karakter selain `(`.)
function getDynamicImportSpecs(content) {
  const out = [];
  const re = /\bimport\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out;
}

// Kumpulkan nama export yang benar-benar di-import konsumen dari modul
// `spec` (yang sedang di-mock). Konsumen = test file + chain import lokal
// via BFS, minus modul yang dirinya dimock di test yang sama.
// Mengembalikan { consumers, used, namespaceImport } — `used` adalah Set
// nama export (termasuk member namespace statis X.foo & key 'default'),
// `namespaceImport` true bila ada konsumen yang memakai `import * as X`.
function collectUsedFromModule(testFile, testContent, mockedAbs, maxDepth, spec) {
  const consumers = getConsumerFiles(testFile, testContent, mockedAbs, maxDepth);
  const used = new Set();
  let namespaceImport = false;
  for (const consumer of consumers) {
    const fc = readCached(consumer);
    for (const { spec: importSpec, names } of getAllNamedImports(fc)) {
      if (!specsPointToSameModule(spec, importSpec, testFile, consumer)) continue;
      for (const n of names) used.add(n);
    }
    // Default import (pure & campuran `import X, { a }`) → mock harus
    // menyediakan key `default` (Vitest: default binding = export default).
    for (const { spec: importSpec } of getDefaultImports(fc)) {
      if (specsPointToSameModule(spec, importSpec, testFile, consumer)) used.add('default');
    }
    // Namespace import → ikuti penggunaan member statis `X.foo` / `X['foo']` /
    // `const { a } = X`; member yang dipakai harus disediakan mock.
    for (const { spec: importSpec, alias } of getNamespaceImports(fc)) {
      if (!specsPointToSameModule(spec, importSpec, testFile, consumer)) continue;
      namespaceImport = true;
      for (const member of getNamespaceUsages(fc, alias)) used.add(member);
    }
  }
  return { consumers, used, namespaceImport };
}

module.exports = {
  ROOT,
  escapeRegExp,
  findTestFiles,
  extractMockCall,
  splitMockArgs,
  classifyFactory,
  hasTopLevelSpread,
  mockProvides,
  extractImports,
  resolveLocalPath,
  readCached,
  resolveCached,
  getConsumerFiles,
  parseDepth,
  specsPointToSameModule,
  getAllNamedImports,
  getDefaultImports,
  getNamespaceImports,
  getNamespaceUsages,
  blankComments,
  getDynamicImportSpecs,
  factoryBody,
  collectUsedFromModule,
};
