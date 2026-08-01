#!/usr/bin/env node
/**
 * Audit: deteksi vi.mock yang stale di SELURUH test suite
 *
 * Latar belakang: pola bug yang pernah terjadi (komit 658b424e & b06340f2) —
 * sebuah service berpindah dari getXLSX ke getExcelJS, tapi test yang me-mock
 * dynamicImports tidak diupdate, sehingga ketika path kode dieksekusi Vitest
 * melempar `No "getExcelJS" export is defined on the "...dynamicImports" mock`.
 *
 * Catatan perilaku Vitest 4 (diverifikasi empiris): import named export yang
 * hilang dari mock memberi `undefined` TANPA melempar; error baru muncul saat
 * export tersebut benar-benar dipanggil. Jadi mock yang tidak lengkap adalah
 * "time-bomb laten" — test bisa hijau sampai path-nya dijalankan (kasus
 * exportUtils yang bertahan 2 komit).
 *
 * Script ini men-scan seluruh test suite:
 *   1. Cari SEMUA pemanggilan `vi.mock('<modul>', factory)` di tiap test file.
 *   2. Resolusi modul yang di-mock (lokal via path absolut, package via nama).
 *   3. Kumpulkan fungsi yang benar-benar di-import dari modul tersebut oleh
 *      konsumen: test file + chain import lokal yang di-explore via BFS
 *      (maks `--depth` level, default 3), KECUALI modul yang dirinya sendiri
 *      dimock di test yang sama (modul aslinya tidak pernah dimuat, jadi
 *      import-nya tidak terhitung) dan siklus import (visited set).
 *   4. Laporkan STALE (exit 1) jika ada fungsi yang dipakai konsumen tapi
 *      tidak disediakan factory mock — selama factory tidak memakai spread
 *      top-level (kalau spread, turunkan ke "uncertain" karena key bisa datang
 *      dari sumber spread yang tak bisa diverifikasi statis).
 *
 * Batasan yang disengaja (menghindari false positive):
 *   - Partial mock (importOriginal) dilewati — spread actual tidak bisa
 *     diverifikasi secara statis.
 *   - Automock (vi.mock tanpa factory) dilewati — tidak ada keys untuk dicek.
 *   - `vi.mock(path, { spy: true })` (form options Vitest 4) dilewati.
 *   - Factory yang mengembalikan variabel hoisted (`() => mocks`) dilewati.
 *   - Re-export `export { x } from 'modul-dimock'` tidak terdeteksi (hanya
 *     `import` yang diperiksa) — arah aman (under-detect).
 *   - Eksplorasi chain import dibatasi `--depth` (default 3, maks 5) — chain
 *     yang lebih dalam tidak terdeteksi (arah aman under-detect).
 *   - Dynamic import (`await import('...')`, React.lazy) tidak diikuti —
 *     hanya static import yang dipindai (arah aman under-detect).
 *   - Default import `import X from 'mod'` (termasuk bentuk campuran
 *     `import X, { a }`) diikuti — mock harus menyediakan key `default`.
 *   - Namespace import `import * as X from 'mod'` diikuti dengan melacak
 *     penggunaan member statis `X.foo` / `X['foo']` / `const { a } = X` —
 *     member yang dipakai harus disediakan mock. Akses dinamis `X[kunci]`
 *     tidak terdeteksi (arah aman under-detect).
 *
 * Exit code: 0 = bersih, 1 = ditemukan mock stale (bisa dipakai di CI).
 *
 * Usage: node scripts/audit-stale-mocks.cjs
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
  hasTopLevelSpread,
  mockProvides,
  resolveCached,
  collectUsedFromModule,
  parseDepth,
} = require('./audit-lib.cjs');

function main() {
  const maxDepth = parseDepth();
  const testFiles = [
    ...findTestFiles(path.join(ROOT, 'tests')),
    ...findTestFiles(path.join(ROOT, 'src')),
  ];

  const stale = [];
  const infos = [];
  let analyzed = 0;

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf8');

    // Semua modul yang dimock di test file ini (path absolut) — konsumen yang
    // dirinya dimock tidak pernah dimuat aslinya, jadi import-nya tak terhitung.
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
      // Skip vi.mock yang dikomentari (mis. `// vi.mock(...)`) — bukan mock aktif
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
      analyzed++;

      // Fungsi yang dipakai konsumen dari modul yang di-mock (test file + chain
      // import lokal via BFS, minus modul yang dirinya dimock di test ini).
      const { used, namespaceImport } = collectUsedFromModule(testFile, content, mockedAbs, maxDepth, spec);

      const missing = [...used].filter((fn) => !mockProvides(factory, fn));

      if (missing.length > 0) {
        const spreadNote = hasTopLevelSpread(factory)
          ? ' — factory memakai spread top-level, key hilang mungkin disediakan spread (tak bisa diverifikasi)'
          : '';
        if (spreadNote) {
          infos.push({
            file: rel,
            spec,
            note: `dipakai tapi tidak dimock: ${missing.sort().join(', ')}${spreadNote}`,
          });
        } else {
          stale.push({
            file: rel,
            spec,
            used: [...used].sort(),
            missing: missing.sort(),
          });
        }
      } else if (used.size === 0) {
        infos.push({
          file: rel,
          spec,
          note: namespaceImport
            ? 'dipakai via namespace import tapi tanpa member statis terdeteksi (mis. akses dinamis X[kunci]) — tak bisa diverifikasi'
            : `tidak ada konsumen (maks ${maxDepth} level) yang meng-import modul ini`,
        });
      }
    }
  }

  // ── Laporan ──
  console.log(`\n📋 Audit Stale Mock — SEMUA modul (${testFiles.length} test files di-scan, ${analyzed} mock dianalisis, kedalaman konsumen ${maxDepth})`);

  if (stale.length === 0) {
    console.log('✅ BERSIH — tidak ada vi.mock yang ketinggalan fungsi yang dipakai konsumen.\n');
  } else {
    console.log(`❌ ${stale.length} mock STALE ditemukan:\n`);
    for (const s of stale) {
      console.log(`  • ${s.file}`);
      console.log(`    Mock target : ${s.spec}`);
      console.log(`    Dipakai     : ${s.used.join(', ')}`);
      console.log(`    Dipakai tapi tidak dimock : ${s.missing.join(', ')}`);
      console.log('');
    }
  }

  if (infos.length > 0) {
    console.log(`ℹ️  ${infos.length} mock dilewati/informasi (partial, automock, opaque, spread-uncertain, atau tanpa konsumen 1-level):`);
    for (const p of infos) {
      console.log(`   • ${p.file} — ${p.spec} — ${p.note}`);
    }
    console.log('');
  }

  process.exit(stale.length > 0 ? 1 : 0);
}

main();
