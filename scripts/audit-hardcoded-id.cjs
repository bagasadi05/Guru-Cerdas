#!/usr/bin/env node
/**
 * Audit: hardcode kolom 'id' pada query ke entity soft-delete di LUAR
 * src/services/SoftDeleteService.ts.
 *
 * Latar belakang:
 *   PostgREST mengembalikan HTTP 400 ketika query memfilter/memilih kolom yang
 *   TIDAK ADA di tabel nyata. Kasus nyata: tabel `user_settings` memakai
 *   primary key `user_id` (TANPA kolom `id` sama sekali) — `.eq('id', ...)` /
 *   `.in('id', ...)` / `.select('id')` pada tabel itu ditolak PostgREST.
 *
 *   Refactor SoftDeleteService sudah memaksa seluruh API soft-delete memakai
 *   `ENTITY_KEY_COLUMN[entity]` (bukan hardcode 'id'). Script ini memindai
 *   query LANGSUNG di komponen/service lain (pola `.from('tabel').eq('id', ...)`)
 *   yang masih meng-hardcode 'id' — sisa kelas bug 400 yang bisa tersembunyi
 *   di luar service.
 *
 * Kategori temuan:
 *   🔴 RISK 400  : hardcode 'id' pada entity soft-delete yang kolom kuncinya
 *                  BUKAN 'id' (saat ini: `user_settings`) → query akan 400.
 *   🔴 OWNER-RISK: hardcode 'user_id' pada entity yang TIDAK punya kolom
 *                  user_id (ownerMap null: `homework` & `announcements`,
 *                  global/sekolah) — kelas bug yang sama dgn getDeletedItems
 *                  (skip-tanpa-query). Query `.eq('user_id', ...)` pada tabel
 *                  itu ditolak PostgREST 400.
 *   🟡 CONVENTION: hardcode 'id' pada entity soft-delete yang kolom kuncinya
 *                  memang 'id' (bukan risiko 400, tapi melanggar konvensi
 *                  "selalu ambil kolom dari ENTITY_KEY_COLUMN").
 *   ℹ️  IGNORE    : tabel non-soft-delete (kolom id/user_id memang normal)
 *                  atau entity tidak dikenali dari parser service.
 *
 * Sumber kebenaran kolom: `ENTITY_KEY_COLUMN` DAN `ENTITY_OWNER_COLUMN` di
 * src/services/SoftDeleteService.ts di-parse langsung (bukan hardcode di
 * script) supaya tidak drift.
 *
 * Batasan jujur:
 *   - Backward-scan mencari `.from('tabel')` terdekat di atas baris eq/in
 *     (jendela 60 baris, berhenti di akhir statement `;`). Query yang
 *     meng-hardcode 'id' tanpa `.from()` di jendela (mis. variabel query yang
 *     di-assign jauh) bisa lolos (arah aman: under-report, bukan false
 *     positive).
 *   - File test (*.test.ts(x)/*.spec.*) dan direktori __tests__/tests
 *     di-SKIP (assertion mock memakai 'id' secara sah).
 *   - Hanya pola kutip tunggal/ganda/backtick `'id'`/`"id"`/`\`id\`` yang
 *     dikenali.
 *
 * Exit code: 1 jika ada RISK 400 (CI gate). CONVENTION = warning (exit 0).
 *
 * Usage:
 *   node scripts/audit-hardcoded-id.cjs                    # audit (exit 1 jika RISK)
 *   node scripts/audit-hardcoded-id.cjs --json             # output JSON
 *   node scripts/audit-hardcoded-id.cjs --csv <path>       # tulis laporan CSV (kolom 'fixable')
 *   node scripts/audit-hardcoded-id.cjs --fix              # DRY-RUN fix CONVENTION
 *   node scripts/audit-hardcoded-id.cjs --fix --apply      # tulis perubahan
 *   node scripts/audit-hardcoded-id.cjs --fix --add-imports --apply   # + sisip import bila perlu
 *   node scripts/audit-hardcoded-id.cjs --file <subpath>   # batasi scan ke subpath
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./audit-lib.cjs');

const SRC_DIR = path.join(ROOT, 'src');
const SERVICE_FILE = path.join(ROOT, 'src', 'services', 'SoftDeleteService.ts');

// ─────────────────────────────────────────────────────────────────────────
// Parser src/services/SoftDeleteService.ts → ENTITY_KEY_COLUMN +
// ENTITY_OWNER_COLUMN + entities
// ─────────────────────────────────────────────────────────────────────────

// Parser MURNI (diberi content, bukan path) supaya bisa di-unit-test dengan
// konten sintetis — lihat tests/unit/audit-hardcoded-id.test.ts.
function parseServiceFromContent(content) {
  const src = String(content).replace(/\r/g, '');

  // ENTITY_KEY_COLUMN: Readonly<Record<SoftDeleteEntity, string>> = { ... };
  const keyMap = {};
  const km = src.match(/ENTITY_KEY_COLUMN\s*:\s*Readonly<Record<[^>]+>>\s*=\s*\{([\s\S]*?)\n\};/);
  if (km) {
    for (const line of km[1].split('\n')) {
      const m = line.match(/^\s*([A-Za-z_]\w*)\s*:\s*'([^']+)'\s*,?\s*$/);
      if (m) keyMap[m[1]] = m[2];
    }
  }

  // ENTITY_OWNER_COLUMN: Readonly<Record<SoftDeleteEntity, string | null>> = {
  // ... }; — nilai `null` = entity TANPA kolom owner (homework/announcements,
  // global/sekolah). Query yang memfilter `.eq('user_id', ...)` pada tabel itu
  // ditolak PostgREST dengan HTTP 400 — kelas bug yang sama dengan
  // getDeletedItems (skip-tanpa-query).
  const ownerMap = {};
  const om = src.match(/ENTITY_OWNER_COLUMN\s*:\s*Readonly<Record<[^>]+>>\s*=\s*\{([\s\S]*?)\n\};/);
  if (om) {
    for (const line of om[1].split('\n')) {
      const q = line.match(/^\s*([A-Za-z_]\w*)\s*:\s*'([^']+)'\s*,?\s*$/);
      const nl = line.match(/^\s*([A-Za-z_]\w*)\s*:\s*null\s*,?\s*$/);
      if (q) ownerMap[q[1]] = q[2];
      if (nl) ownerMap[nl[1]] = null;
    }
  }

  // ALL_SOFT_DELETE_ENTITIES: SoftDeleteEntity[] = [ ... ];
  // Catatan: file service punya baris multi-entity (`'students', 'classes',
  // 'attendance', 'tasks',`) — pakai GLOBAL match per baris, bukan first-match,
  // supaya entity yang duduk di baris sama tidak terlewat (kasus nyata:
  // `user_settings` satu baris dengan `announcements`/`academic_years`/
  // `semesters` — first-match hanya menangkap announcements).
  const entities = new Set();
  const am = src.match(/ALL_SOFT_DELETE_ENTITIES\s*:\s*SoftDeleteEntity\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (am) {
    for (const line of am[1].split('\n')) {
      const matches = line.match(/'([^']+)'/g);
      if (matches) {
        for (const m of matches) entities.add(m.slice(1, -1));
      }
    }
  }

  return { keyMap, ownerMap, entities };
}

function parseService() {
  return parseServiceFromContent(fs.readFileSync(SERVICE_FILE, 'utf8'));
}

// ─────────────────────────────────────────────────────────────────────────
// File walker (skip test dirs)
// ─────────────────────────────────────────────────────────────────────────

function isTestFile(filePath) {
  const base = path.basename(filePath);
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(base);
}

function isTestDir(dirName) {
  return dirName === '__tests__' || dirName === 'tests' || dirName === '__mocks__';
}

function collectSourceFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isTestDir(entry.name)) collectSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !isTestFile(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Scanner per file
// ─────────────────────────────────────────────────────────────────────────

// Cari `.from('tabel')` terdekat di sekitar baris `lineIdx` dalam batas
// statement (jendela 60 baris, berhenti di akhir statement `;`).
// Baris SAAT INI dicek lebih dulu — pola inline `supabase.from('x').eq('id', v)`
// menaruh `.from()` di baris yang sama dengan filter, sehingga backward-scan
// murni (mulai i-1) tidak akan pernah menemukannya.
function findTableAbove(lines, lineIdx, maxWindow = 60) {
  const fromRe = /\.from\(\s*['"`]([A-Za-z_]\w*)['"`]\s*\)/;
  const stmtEndRe = /;\s*$/;
  let start = Math.max(0, lineIdx - maxWindow);
  for (let i = lineIdx; i >= start; i--) {
    const m = fromRe.exec(lines[i]);
    if (m) return { table: m[1], line: i + 1 };
    // Statement boundary: jangan menyeberang ke statement lain
    // (baris i < lineIdx berarti sudah lewat baris filter — berhenti di `;`)
    if (i < lineIdx && stmtEndRe.test(lines[i])) break;
  }
  return null;
}

function scanFile(filePath, keyMap, ownerMap, entities) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
  const lines = content.split('\n');
  const findings = [];

  // `.eq('id',` / `.in('id',` / `.select('id'` / `.select('id')` — kutip
  // tunggal/ganda/backtick. Follow set mencakup `,`, `]`, DAN `)` supaya
  // `select('id')` polos (bentuk persis bug cleanupExpired) ikut terdeteksi.
  const hardcodeRe = /\.(eq|in|select)\(\s*['"`]id['"`]\s*(?:,|]|\))/;

  // Owner-filter: `.eq('user_id',` / `.in('user_id',` / `.select('user_id')` /
  // `.not('user_id', ...)` / `.is('user_id', ...)` — pada entity yang TIDAK
  // punya kolom user_id (ownerMap[entity] === null, saat ini homework &
  // announcements). Query macam ini ditolak PostgREST HTTP 400 — kelas bug
  // yang sama dgn getDeletedItems (yang justru skip-tanpa-query karena itu).
  const ownerFilterRe = /\.(eq|in|select|not|is)\(\s*['"`]user_id['"`]\s*(?:,|]|\))/;

  for (let i = 0; i < lines.length; i++) {
    const hard = hardcodeRe.test(lines[i]);
    const owner = ownerFilterRe.test(lines[i]);
    if (!hard && !owner) continue;
    const ctx = findTableAbove(lines, i);
    if (!ctx) continue;
    const { table, line: tableLine } = ctx;

    // ── Key column hardcode ──
    if (hard && entities.has(table)) {
      const expected = keyMap[table];
      const kind = expected && expected !== 'id' ? 'RISK' : 'CONVENTION';
      findings.push({
        kind,
        file: rel,
        line: i + 1,
        table,
        hardcoded: 'id',
        expected: expected || 'id',
        near: tableLine,
        code: lines[i].trim().slice(0, 120),
      });
    }

    // ── Owner column hardcode (entity tanpa kolom user_id) ──
    if (owner && entities.has(table) && ownerMap[table] === null) {
      findings.push({
        kind: 'OWNER-RISK',
        file: rel,
        line: i + 1,
        table,
        hardcoded: 'user_id',
        expected: null, // tidak ada kolom owner yang valid
        near: tableLine,
        code: lines[i].trim().slice(0, 120),
      });
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────
// Mode FIX + CSV
// ─────────────────────────────────────────────────────────────────────────

// Apakah file sudah meng-import `ENTITY_KEY_COLUMN` (named import) sehingga
// penggantian `.eq('id'` → `.eq(ENTITY_KEY_COLUMN['tabel']` AMAN (simbol ada)?
// Hanya named import yang dihitung — namespace (`import * as X`) memakai
// `X.ENTITY_KEY_COLUMN`, bukan bare identifier, jadi TIDAK in-scope untuk
// penggantian kita.
function hasKeyColumnImport(content) {
  return /import\s*\{[^}]*\bENTITY_KEY_COLUMN\b[^}]*\}\s*from\s*['"][^'"]*['"]/.test(content);
}

// Path relatif (tanpa ekstensi) dari file ke src/services/SoftDeleteService.ts
// untuk baris import yang disisipkan --add-imports.
function relativeServiceImport(fromFileAbs) {
  let rel = path.relative(path.dirname(fromFileAbs), SERVICE_FILE).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\.ts$/, '');
}

// Sisipkan baris import SETELAH statement import terakhir (atau di baris 0
// bila file tidak punya import sama sekali).
// PENTING: import bisa MULTI-BARIS (`import {\n  a,\n} from './x';`) — baris
// yang mulai dengan `import` hanyalah BARIS PERTAMA blok, jadi menyisipkan di
// sana akan merusak sintaks. Maju dari baris itu sampai akhir statement (baris
// berakhir `;`) baru sisipkan.
function addImportToContent(content, importLine) {
  const lines = content.split('\n');
  let insertAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*import\b/.test(lines[i])) continue;
    let j = i;
    // Akhir statement = baris yang MENGANDUNG `;` (bukan harus berakhir `;`,
    // karena bisa ada trailing comment `import { a } from './a'; // note`).
    // Baris di dalam blok import multi-baris tidak pernah mengandung `;`,
    // jadi ini aman.
    while (j < lines.length && !/;/.test(lines[j])) j++;
    insertAt = j + 1; // setelah akhir statement (atau akhir file bila tanpa `;`)
    i = j;
  }
  if (insertAt >= 0) lines.splice(insertAt, 0, importLine);
  else lines.unshift(importLine);
  return lines.join('\n');
}

// Ganti hardcode 'id' pada SATU baris → `ENTITY_KEY_COLUMN['<table>']`.
// Hanya pola persis scanFile (`.eq('id'` / `.in('id'` / `.select('id')`),
// follow set `,`/`]`/`) dipertahankan. Baris tanpa match dikembalikan apa
// adanya (perlu dipanggil hanya untuk temuan CONVENTION — RISK TIDAK di-fix
// otomatis karena mengubah semantik query).
function fixFindingLine(line, table) {
  const re = /\.(eq|in|select)\(\s*['"`]id['"`]\s*(,|]|\))/g;
  return line.replace(re, (m, method, follow) => `.${method}(ENTITY_KEY_COLUMN['${table}']${follow}`);
}

// Terapkan fix ke SATU file (pure — tidak menulis). `findings` = temuan
// CONVENTION file tsb. Return {
//   content, changed (jumlah baris berubah), needsImport (true bila file
//   belum in-scope dan import TIDAK ditambahkan karena addImports=false),
//   diffs: [{ line, oldLine, newLine }] — pasangan sebelum/sesudah per baris
//   yang diubah (diambil dari baris ASLI, jadi aman untuk preview dry-run
//   walau import disisipkan dan nomor baris bergeser).
function fixFileContent(content, findings, addImports, fromFileAbs) {
  const src = String(content).replace(/\r/g, '');
  const lines = src.split('\n');
  const changed = new Map(); // lineIdx → baris hasil fix
  const diffs = [];

  for (const f of findings) {
    const idx = f.line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const fixed = fixFindingLine(lines[idx], f.table);
    if (fixed !== lines[idx]) {
      changed.set(idx, fixed);
      diffs.push({
        line: f.line,
        oldLine: lines[idx].trim().slice(0, 120),
        newLine: fixed.trim().slice(0, 120),
      });
    }
  }
  if (changed.size === 0) return { content: src, changed: 0, needsImport: false, diffs: [] };

  const next = [...lines];
  for (const [idx, fixed] of changed) next[idx] = fixed;

  let needsImport = !hasKeyColumnImport(src);
  if (needsImport && addImports) {
    const importLine = `import { ENTITY_KEY_COLUMN } from '${relativeServiceImport(fromFileAbs)}';`;
    const withImport = addImportToContent(next.join('\n'), importLine);
    next.length = 0;
    next.push(...withImport.split('\n'));
    needsImport = false;
  }

  return { content: next.join('\n'), changed: changed.size, needsImport, diffs };
}

// Laporan CSV yang bisa ditinjau per file. Kolom: kind, file, line, table,
// hardcoded, expected, near, code, fixable.
// `inScopeFiles` = Set<rel path> dari file yang SUDAH named-import
// ENTITY_KEY_COLUMN (dihitung pemanggil dengan membaca konten file) —
// sehingga label `fixable` akurat & konsisten dgn perilaku fix:
//   'auto'          = CONVENTION di file in-scope → --fix bisa langsung
//   'needs-import'  = CONVENTION di file tanpa import → butuh --add-imports
//   'manual'        = RISK (mengubah semantik query — jangan di-fix otomatis)
function csvRows(findings, inScopeFiles) {
  return findings
    .slice()
    .sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
    .map((f) => ({
      kind: f.kind,
      file: f.file,
      line: f.line,
      table: f.table,
      hardcoded: f.hardcoded,
      expected: f.expected === null ? '—' : f.expected,
      near: f.near,
      code: f.code,
      fixable: f.kind === 'RISK' || f.kind === 'OWNER-RISK' ? 'manual' : inScopeFiles.has(f.file) ? 'auto' : 'needs-import',
    }));
}

function writeCsv(pathOut, rows) {
  const header = ['kind', 'file', 'line', 'table', 'hardcoded', 'expected', 'near', 'code', 'fixable'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map((h) => esc(h)).join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))];
  fs.writeFileSync(pathOut, lines.join('\n') + '\n', 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────
// Laporan
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const fixMode = args.includes('--fix');
  const apply = args.includes('--apply');
  const addImports = args.includes('--add-imports');
  const csvOut = args.includes('--csv') ? args[args.indexOf('--csv') + 1] : null;
  const fileFilter = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

  const { keyMap, ownerMap, entities } = parseService();
  const files = collectSourceFiles(SRC_DIR, []);
  const allFindings = [];

  for (const file of files) {
    if (fileFilter && !file.replace(/\\/g, '/').includes(fileFilter)) continue;
    allFindings.push(...scanFile(file, keyMap, ownerMap, entities));
  }

  const risks = allFindings.filter((f) => f.kind === 'RISK');
  const ownerRisks = allFindings.filter((f) => f.kind === 'OWNER-RISK');
  const conventions = allFindings.filter((f) => f.kind === 'CONVENTION');
  const sortFn = (a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`);
  risks.sort(sortFn);
  ownerRisks.sort(sortFn);
  conventions.sort(sortFn);

  // ── CSV report (ditinjau per file) ───────────────────────────────────────
  // Hitung file yang sudah in-scope ENTITY_KEY_COLUMN HANYA bila CSV diminta
  // (baca konten) supaya kolom fixable akurat & konsisten dgn perilaku --fix,
  // tanpa I/O ekstra pada mode audit biasa.
  if (csvOut) {
    const inScopeFiles = new Set();
    for (const c of conventions) {
      if (inScopeFiles.has(c.file)) continue;
      const content = fs.readFileSync(path.join(ROOT, c.file), 'utf8');
      if (hasKeyColumnImport(content)) inScopeFiles.add(c.file);
    }
    writeCsv(csvOut, csvRows([...risks, ...ownerRisks, ...conventions], inScopeFiles));
    console.log(`\n📄 Laporan CSV ditulis: ${csvOut} (${risks.length + ownerRisks.length + conventions.length} temuan — lihat kolom 'fixable')`);
  }

  // ── Mode FIX ─────────────────────────────────────────────────────────────
  if (fixMode) {
    const byFile = new Map();
    for (const c of conventions) {
      if (!byFile.has(c.file)) byFile.set(c.file, []);
      byFile.get(c.file).push(c);
    }
    const abs = (rel) => path.join(ROOT, rel);
    let filesChanged = 0;
    let linesChanged = 0;
    let skippedNeedsImport = 0;

    console.log('\n🔧 Mode FIX — ganti hardcode \'id\' → ENTITY_KEY_COLUMN[entity] (hanya CONVENTION; RISK & OWNER-RISK tidak disentuh)');
    console.log(`   ${apply ? 'APPLY (menulis file)' : 'DRY-RUN (tidak menulis — jalankan --apply untuk menulis)'}${addImports ? ' | --add-imports aktif' : ' | file tanpa import ENTITY_KEY_COLUMN di-SKIP (butuh --add-imports)'}\n`);

    for (const [rel, findings] of byFile) {
      const fileAbs = abs(rel);
      const content = fs.readFileSync(fileAbs, 'utf8');
      const { content: next, changed, needsImport, diffs } = fixFileContent(content, findings, addImports, fileAbs);

      if (changed === 0) continue;
      if (needsImport) { skippedNeedsImport += findings.length; continue; }

      if (apply && next !== content) {
        fs.writeFileSync(fileAbs, next);
      }
      filesChanged++;
      linesChanged += changed;
      if (!apply) {
        // Pakai pasangan old/new dari fixFileContent (baris ASLI) — aman walau
        // --add-imports menyisipkan baris dan nomor baris di `next` bergeser.
        for (const d of diffs) {
          console.log(`  [${rel}:${d.line}]`);
          console.log(`    - ${d.oldLine}`);
          console.log(`    + ${d.newLine}`);
        }
      }
    }

    console.log('');
    console.log(`🔧 FIX selesai: ${filesChanged} file diubah (${linesChanged} baris)${apply ? '' : ' [dry-run]'}${skippedNeedsImport ? ` | ${skippedNeedsImport} temuan di-SKIP karena file belum import ENTITY_KEY_COLUMN (jalankan --fix --add-imports --apply)` : ''}`);
    console.log('');
    // Setelah fix, re-scan untuk menampilkan sisa (tidak menulis ulang)
    const remaining = [];
    for (const file of files) {
      if (fileFilter && !file.replace(/\\/g, '/').includes(fileFilter)) continue;
      remaining.push(...scanFile(file, keyMap, ownerMap, entities));
    }
    const remainingRisks = remaining.filter((f) => f.kind === 'RISK' || f.kind === 'OWNER-RISK');
    console.log(`Re-scan setelah fix: ${remaining.length} temuan tersisa (${remainingRisks.length} RISK/OWNER-RISK)`);
    console.log('');
    process.exit(remainingRisks.length > 0 ? 1 : 0);
  }

  if (json) {
    console.log(JSON.stringify({
      entities: [...entities].sort(),
      keyMap,
      ownerMap,
      risk: risks,
      ownerRisk: ownerRisks,
      convention: conventions,
    }, null, 2));
    process.exit(risks.length + ownerRisks.length > 0 ? 1 : 0);
  }

  console.log('\n🔍 Audit Hardcode Kolom \'id\' & Owner \'user_id\' — query ke entity soft-delete di luar SoftDeleteService');
  console.log(`   Entity soft-delete: ${entities.size} | File src di-scan: ${files.length} | Key column non-'id': ${Object.entries(keyMap).filter(([, v]) => v !== 'id').map(([k, v]) => `${k}→${v}`).join(', ') || 'tidak ada'} | Tanpa kolom owner: ${Object.entries(ownerMap).filter(([, v]) => v === null).map(([k]) => k).join(', ') || 'tidak ada'}\n`);

  if (risks.length === 0 && ownerRisks.length === 0 && conventions.length === 0) {
    console.log('✅ BERSIH — tidak ada hardcode \'id\' / \'user_id\' pada entity soft-delete.\n');
  }

  if (risks.length > 0) {
    console.log(`🔴 RISK 400 — hardcode 'id' pada entity yang kolom kuncinya BUKAN 'id' (akan ditolak PostgREST): ${risks.length}`);
    for (const r of risks) {
      console.log(`   • ${r.file}:${r.line} — from('${r.table}').${r.code}`);
      console.log(`     → kolom kunci seharusnya: '${r.expected}' (ENTITY_KEY_COLUMN)`);
    }
    console.log('');
  }

  if (ownerRisks.length > 0) {
    console.log(`🔴 OWNER-RISK 400 — hardcode 'user_id' pada entity yang TIDAK punya kolom user_id (akan ditolak PostgREST): ${ownerRisks.length}`);
    for (const o of ownerRisks) {
      console.log(`   • ${o.file}:${o.line} — from('${o.table}').${o.code}`);
      console.log(`     → entity ini TIDAK punya kolom user_id (global/sekolah) — hapus filter owner atau jangan query per-user`);
    }
    console.log('');
  }

  if (conventions.length > 0) {
    console.log(`🟡 CONVENTION — hardcode 'id' pada entity soft-delete (kolom kuncinya memang 'id', bukan risiko 400 tapi melanggar konvensi ENTITY_KEY_COLUMN): ${conventions.length}`);
    for (const c of conventions) {
      console.log(`   • ${c.file}:${c.line} — from('${c.table}').${c.code}`);
    }
    console.log('');
  }

  if (risks.length + ownerRisks.length > 0) {
    const first = risks[0] || ownerRisks[0];
    console.log(`🔴 GAGAL: ${risks.length + ownerRisks.length} hardcode berisiko HTTP 400 (${risks.length} key-column + ${ownerRisks.length} owner-column) — ganti kolom sesuai ENTITY_KEY_COLUMN/ENTITY_OWNER_COLUMN per entity.\n`);
    process.exit(1);
  }
  console.log('🟢 LULUS: tidak ada hardcode \'id\' / \'user_id\' berisiko 400.' + (conventions.length ? ` (${conventions.length} convention warning)` : '') + '\n');
  process.exit(0);
}

// Jangan jalankan main() saat di-require oleh test vitest — hanya saat
// dieksekusi langsung sebagai CLI. (Pola sama dengan audit-font-subset.cjs.)
if (require.main === module) {
  main();
}

module.exports = {
  parseService,
  parseServiceFromContent,
  findTableAbove,
  scanFile,
  collectSourceFiles,
  isTestFile,
  isTestDir,
  hasKeyColumnImport,
  relativeServiceImport,
  addImportToContent,
  fixFindingLine,
  fixFileContent,
  csvRows,
  writeCsv,
  SRC_DIR,
  SERVICE_FILE,
};
