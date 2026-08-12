#!/usr/bin/env node
/**
 * Audit: drift antara schema nyata (supabase/migrations/*.sql) vs
 * src/services/database.types.ts (tipe yang dipakai aplikasi).
 *
 * Latar belakang:
 *   PostgREST mengembalikan HTTP 400 ketika query menyeleksi kolom yang TIDAK
 *   ADA di tabel nyata. Kasus nyata: `cleanupExpired()` di SoftDeleteService
 *   menjalankan `.select('id')` pada SEMUA entitas soft-delete — tabel
 *   `user_settings` memakai primary key `user_id` (tanpa kolom `id`), sehingga
 *   query itu 400 di setiap startup halaman ber-guard. database.types.ts yang
 *   basi (menyebut kolom yang tidak ada di schema) menciptakan kelas bug yang
 *   sama: tipe TS meyakinkan developer kolom itu ada, padahal PostgREST
 *   menolaknya saat runtime.
 *
 * Yang dicek per tabel:
 *   ❌ PHANTOM      : kolom ada di types.ts tapi TIDAK PERNAH ada di schema
 *                     migration (kolom yang tidak ada di DB → query 400).
 *   ⚠️  DRIFT       : kolom ada di schema migration tapi HILANG dari types.ts
 *                     (types belum di-regenerate / tertinggal).
 *   ❌ MISSING TABLE: tabel di-CREATE di migrations tapi tidak ada di types.ts
 *                     (types basi; aplikasi tidak bisa memakai tabel itu
 *                     dengan aman).
 *   ℹ️  LEGACY      : tabel ada di types.ts tapi tidak ada CREATE TABLE di
 *                     migrations — bisa jadi tabel yang dibuat sebelum repo
 *                     migration (di dashboard/SQL editor). Kolomnya TIDAK bisa
 *                     diverifikasi penuh; hanya kolom yang ditambahkan via
 *                     `ALTER TABLE ... ADD COLUMN` di migrations yang dicek.
 *
 * Cara baca schema:
 *   - Semua file supabase/migrations/*.sql diurutkan berdasarkan nama
 *     (timestamp = urutan eksekusi), lalu untuk tiap tabel dikumpulkan kolom
 *     dari `CREATE TABLE` + `ALTER TABLE ... ADD COLUMN`, dikurangi
 *     `ALTER TABLE ... DROP COLUMN`. (CREATE TABLE duplikat digabung union —
 *     migration idempotent `IF NOT EXISTS` tidak menghapus kolom.)
 *   - Parse sadar string/komentar: komentar `--` (baris) dan blok komentar
 *     slash-star tidak ikut terbaca sebagai statement. Statement di dalam
 *     blok DO dollar-quote (mis. `ALTER TABLE` kondisional) tetap terbaca
 *     karena di-scan per-statement, bukan per-baris.
 *
 * Batasan jujur:
 *   - Tidak membandingkan TIPE kolom (hanya keberadaan nama kolom). Kolom yang
 *     salah tipe (mis. string vs number) tidak terdeteksi.
 *   - Kolom yang ditambahkan lewat RPC/fungsi/dynamic SQL di luar statement
 *     CREATE/ALTER tidak terlihat (arah aman: under-report, bukan false
 *     positive).
 *   - `ALTER TABLE ... RENAME COLUMN` / `RENAME TO` tidak diproses (tidak ada
 *     pemakaian di repo ini saat script ditulis).
 *   - `CREATE TABLE ... AS SELECT` / `LIKE` (tanpa daftar kolom) tidak
 *     dianggap tabel yang schema-nya diketahui → masuk LEGACY (under-detect,
 *     bukan false positive).
 *
 * Exit code: 1 jika ada PHANTOM / MISSING TABLE (CI gate). DRIFT = warning
 * (exit 0) kecuali `--strict` dijalankan.
 *
 * Usage:
 *   node scripts/audit-schema-drift.cjs [--strict] [--table <name>] [--json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./audit-lib.cjs');

const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const TYPES_FILE = path.join(ROOT, 'src', 'services', 'database.types.ts');

// ─────────────────────────────────────────────────────────────────────────
// Scanner teks SQL (sadar string + komentar)
// ─────────────────────────────────────────────────────────────────────────

// Kosongkan komentar SQL (`--` sampai akhir baris, `/* ... */`) tanpa
// menyentuh isi string `'...'`/`"..."` (yang bisa mengandung `--`).
function stripSqlComments(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2; // '' escape dalam string
            continue;
          }
          j++;
          break;
        }
        j++;
      }
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n && sql[j] !== '"') j++;
      j = Math.min(j + 1, n);
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      let j = i + 2;
      while (j < n && sql[j] !== '\n') j++;
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const j = end === -1 ? n : end + 2;
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// Cari index `)`, `]`, `}` penutup yang matching bukaan `(` di `openIdx`,
// sadar string + kurung bersarang. Return index penutup atau -1.
function findClosing(text, openIdx) {
  let depth = 0;
  let i = openIdx;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (text[j] === "'") {
          if (text[j + 1] === "'") {
            j += 2;
            continue;
          }
          j++;
          break;
        }
        j++;
      }
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') j++;
      i = Math.min(j + 1, n);
      continue;
    }
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// Ambil identifier pertama (bisa quoted `"..."`) dari satu segmen definisi
// kolom. Return nama kolom atau null (segmen berupa table-constraint).
function columnNameFromSegment(seg) {
  const s = seg.trim();
  if (!s) return null;
  if (s[0] === '"') {
    const end = s.indexOf('"', 1);
    if (end === -1) return null;
    return s.slice(1, end);
  }
  const m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(s);
  if (!m) return null;
  const name = m[1].toLowerCase();
  // `key` TIDAK disertakan: di Postgres segmen yang diawali `key` adalah nama
  // kolom (mis. app_config.key), bukan constraint — `PRIMARY KEY` / `FOREIGN
  // KEY` sudah diblokir lewat `primary` / `foreign`.
  const CONSTRAINT_FIRST = new Set([
    'primary', 'unique', 'check', 'constraint', 'foreign', 'references',
    'like', 'exclude', 'with', 'inherits', 'column',
  ]);
  if (CONSTRAINT_FIRST.has(name)) return null;
  return name;
}

// ─────────────────────────────────────────────────────────────────────────
// Parser migration → schema final per tabel
// ─────────────────────────────────────────────────────────────────────────

function readMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // nama file = timestamp → urutan eksekusi
  const schema = new Map(); // table -> Set(columns)
  const created = new Set(); // tabel yang pernah di-CREATE TABLE di migrations

  const ensure = (table) => {
    if (!schema.has(table)) schema.set(table, new Set());
    return schema.get(table);
  };

  for (const file of files) {
    const sql = stripSqlComments(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));

    // ── CREATE TABLE [IF NOT EXISTS] [public.]name ( ... ) ──
    const createRe = /\bcreate\s+(?:or\s+replace\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)/gi;
    let cm;
    while ((cm = createRe.exec(sql)) !== null) {
      const table = cm[1].toLowerCase();
      let k = cm.index + cm[0].length;
      while (k < sql.length && /\s/.test(sql[k])) k++;
      if (sql[k] !== '(') continue; // CREATE TABLE ... AS SELECT / LIKE (tanpa daftar kolom)
      const close = findClosing(sql, k);
      if (close === -1) continue;
      const body = sql.slice(k + 1, close);
      const cols = ensure(table);

      // Split body per top-level koma (depth-aware)
      let depth = 0;
      let segStart = 0;
      let bodyCols = 0;
      let hasLike = false;
      const segs = [];
      for (let i = 0; i <= body.length; i++) {
        const ch = body[i];
        if (ch === "'") {
          let j = i + 1;
          while (j < body.length) {
            if (body[j] === "'") {
              if (body[j + 1] === "'") {
                j += 2;
                continue;
              }
              j++;
              break;
            }
            j++;
          }
          i = j - 1;
          continue;
        }
        if (ch === '"') {
          let j = i + 1;
          while (j < body.length && body[j] !== '"') j++;
          i = j;
          continue;
        }
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (ch === ',' && depth === 0) {
          segs.push(body.slice(segStart, i));
          segStart = i + 1;
        }
      }
      segs.push(body.slice(segStart));
      for (const seg of segs) {
        if (/^\s*(like|inherits)\b/i.test(seg)) hasLike = true;
        const name = columnNameFromSegment(seg);
        if (name) {
          cols.add(name);
          bodyCols++;
        }
      }
      // Schema tabel hanya dianggap "diketahui penuh" bila body CREATE
      // menghasilkan kolom dan TIDAK memakai `LIKE` (kolom diwariskan dari
      // tabel lain — tidak terlihat parser → jangan flag phantom palsu).
      if (bodyCols > 0 && !hasLike) created.add(table);
      createRe.lastIndex = close + 1; // lanjut scan setelah penutup body
    }

    // ── ALTER TABLE ... ADD COLUMN [IF NOT EXISTS] col ──
    // Satu statement ALTER TABLE bisa menambah BANYAK kolom:
    //   ALTER TABLE x ADD COLUMN a text, ADD COLUMN b text, ...
    // Regex lama hanya menangkap kolom pertama per statement → kolom berikutnya
    // (a.l. user_roles.full_name, ref_boilerplate_topik.content_status, ...)
    // dilaporkan sebagai phantom PALSU. Di sini statement di-scan penuh.
    // Hanya keyword pemimpin constraint yang di-skip (regex sudah mengonsumsi
    // `column` dan `if not exists`); nama kolom sah seperti `type` tidak
    // boleh terblokir.
    const ADD_SKIP = new Set(['constraint', 'primary', 'unique', 'foreign', 'check', 'exclude', 'key', 'column']);
    const alterRe = /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\b/gi;
    const addColRe = /\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?([A-Za-z_][A-Za-z0-9_]*)/gi;
    let am;
    while ((am = alterRe.exec(sql)) !== null) {
      const table = am[1].toLowerCase();
      const stmtStart = am.index + am[0].length;
      const semi = sql.indexOf(';', stmtStart);
      const stmtEnd = semi === -1 ? sql.length : semi;
      const stmt = sql.slice(stmtStart, stmtEnd);
      addColRe.lastIndex = 0;
      let ac;
      while ((ac = addColRe.exec(stmt)) !== null) {
        const col = ac[1].toLowerCase();
        if (ADD_SKIP.has(col)) continue; // ADD CONSTRAINT/PRIMARY KEY/UNIQUE/FOREIGN ... bukan kolom
        ensure(table).add(col);
      }
      alterRe.lastIndex = stmtEnd + 1; // lanjut scan statement berikutnya
    }

    // ── ALTER TABLE ... DROP COLUMN [IF EXISTS] col ──
    const DROP_SKIP = new Set(['constraint', 'index', 'trigger', 'policy', 'rule', 'sequence', 'view', 'column', 'if', 'exists', 'not', 'null']);
    const dropRe = /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\s+drop\s+(?:column\s+)?(?:if\s+exists\s+)?([A-Za-z_][A-Za-z0-9_]*)/gi;
    let dm;
    while ((dm = dropRe.exec(sql)) !== null) {
      const table = dm[1].toLowerCase();
      const col = dm[2].toLowerCase();
      if (DROP_SKIP.has(col)) continue;
      const cols = schema.get(table);
      if (cols) cols.delete(col);
    }
  }

  return { schema, created };
}

// ─────────────────────────────────────────────────────────────────────────
// Parser database.types.ts → tabel + kolom Row
// ─────────────────────────────────────────────────────────────────────────

function readTypes() {
  const content = fs.readFileSync(TYPES_FILE, 'utf8');
  const lines = content.split('\n');
  const tables = new Map(); // table -> Set(columns Row)
  let inTables = false;
  let curTable = null;
  let inRow = false;

  for (const line of lines) {
    if (!inTables) {
      if (/^\s*Tables:\s*\{/.test(line)) inTables = true;
      continue;
    }
    if (/^\s*Functions:\s*\{/.test(line)) break; // akhir section Tables

    const tableMatch = /^\s{6}([A-Za-z_][A-Za-z0-9_]*):\s*\{/.exec(line);
    if (tableMatch) {
      curTable = tableMatch[1].toLowerCase();
      tables.set(curTable, new Set());
      inRow = false;
      continue;
    }
    if (curTable && /^\s{8}Row:\s*\{/.test(line)) {
      inRow = true;
      continue;
    }
    if (curTable && inRow) {
      if (/^\s{8}\}/.test(line)) {
        inRow = false;
        continue;
      }
      const colMatch = /^\s{10}([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
      if (colMatch) tables.get(curTable).add(colMatch[1].toLowerCase());
    }
  }
  return tables;
}

// ─────────────────────────────────────────────────────────────────────────
// Laporan
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const json = args.includes('--json');
  const tableFilter = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;

  const { schema: migCols, created } = readMigrations();
  const typeSchema = readTypes();

  const phantoms = [];
  const drifts = [];
  const missingTables = [];
  const legacy = [];

  for (const [table, cols] of migCols) {
    if (tableFilter && table !== tableFilter) continue;
    const typeCols = typeSchema.get(table);
    if (!typeCols) {
      missingTables.push({ table, cols: [...cols].sort() });
      continue;
    }
    if (created.has(table)) {
      // Schema penuh diketahui (CREATE TABLE di migrations) → bandingkan penuh.
      for (const col of [...cols].sort()) {
        if (!typeCols.has(col)) drifts.push({ table, col });
      }
      for (const col of [...typeCols].sort()) {
        if (!cols.has(col)) phantoms.push({ table, col });
      }
    } else {
      // Tabel legacy yang hanya di-ALTER (mis. students.deleted_at): kolom
      // dasar tidak diketahui — hanya kolom yang ditambahkan migration
      // diverifikasi (drift), jangan flag phantom palsu.
      for (const col of [...cols].sort()) {
        if (!typeCols.has(col)) drifts.push({ table, col, partial: true });
      }
      legacy.push({ table, partial: true, cols: [...typeCols].sort() });
    }
  }

  // Tabel legacy: ada di types tapi tidak pernah disebut di migrations sama
  // sekali (tidak ada CREATE ataupun ALTER). Kolom tidak bisa diverifikasi.
  for (const [table, typeCols] of typeSchema) {
    if (tableFilter && table !== tableFilter) continue;
    if (migCols.has(table)) continue;
    legacy.push({ table, partial: false, cols: [...typeCols].sort() });
  }

  // ── Sorted & grouped ──
  const sortBy = (arr, keyFn) => [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
  const sortedPhantoms = sortBy(phantoms, (p) => `${p.table}.${p.col}`);
  const sortedDrifts = sortBy(drifts, (d) => `${d.table}.${d.col}`);
  const sortedMissing = sortBy(missingTables, (m) => m.table);
  const sortedLegacy = sortBy(legacy, (l) => l.table);

  const summary = {
    migrations_tables: migCols.size,
    types_tables: typeSchema.size,
    created_in_migrations: created.size,
    phantom: sortedPhantoms.length,
    drift: sortedDrifts.length,
    missing_table: sortedMissing.length,
    legacy: sortedLegacy.length,
  };

  if (json) {
    console.log(JSON.stringify({ summary, phantoms: sortedPhantoms, drifts: sortedDrifts, missingTables: sortedMissing, legacy: sortedLegacy }, null, 2));
    process.exit(sortedPhantoms.length > 0 || sortedMissing.length > 0 ? 1 : 0);
  }

  console.log('\n📋 Audit Drift Schema — supabase/migrations vs src/services/database.types.ts');
  console.log(`   Tabel di migrations: ${summary.migrations_tables} | Di-CREATE di migrations: ${summary.created_in_migrations} | Tabel di types.ts: ${summary.types_tables}\n`);

  if (sortedPhantoms.length === 0 && sortedDrifts.length === 0 && sortedMissing.length === 0) {
    console.log('✅ BERSIH — tidak ada phantom/drift/missing table.\n');
  }

  if (sortedPhantoms.length > 0) {
    console.log(`❌ PHANTOM — kolom di types.ts tapi TIDAK ADA di schema migration (risiko PostgREST 400): ${sortedPhantoms.length}`);
    for (const p of sortedPhantoms) console.log(`   • ${p.table}.${p.col}`);
    console.log('');
  }

  if (sortedMissing.length > 0) {
    console.log(`❌ MISSING TABLE — tabel di-CREATE di migrations tapi tidak ada di types.ts (types basi): ${sortedMissing.length}`);
    for (const m of sortedMissing) console.log(`   • ${m.table} — kolom: ${m.cols.join(', ')}`);
    console.log('');
  }

  if (sortedDrifts.length > 0) {
    console.log(`⚠️  DRIFT — kolom di schema migration tapi HILANG dari types.ts (types tertinggal): ${sortedDrifts.length}`);
    for (const d of sortedDrifts) console.log(`   • ${d.table}.${d.col}`);
    console.log('');
  }

  if (sortedLegacy.length > 0) {
    console.log(`ℹ️  LEGACY — tabel di types.ts yang schema-nya tidak sepenuhnya diketahui dari migrations (dibuat di luar repo migration atau hanya di-ALTER; kolom tidak bisa diverifikasi penuh): ${sortedLegacy.length}`);
    const shown = sortedLegacy.slice(0, 60);
    for (const l of shown) {
      console.log(`   • ${l.table}${l.partial ? ' (partial: hanya kolom ALTER yang diverifikasi)' : ''} — ${l.cols.length} kolom`);
    }
    if (sortedLegacy.length > shown.length) console.log(`   … dan ${sortedLegacy.length - shown.length} lainnya`);
    console.log('');
  }

  if (tableFilter) {
    console.log(`ℹ️  Filter: hanya tabel "${tableFilter}" yang ditampilkan.\n`);
  }

  const hasErrors = sortedPhantoms.length > 0 || sortedMissing.length > 0 || (strict && sortedDrifts.length > 0);
  if (hasErrors) {
    console.log(`🔴 GAGAL: ${sortedPhantoms.length} phantom, ${sortedMissing.length} missing table${strict ? `, ${sortedDrifts.length} drift (--strict)` : ''} — regenerate types via \`npx supabase gen types typescript\` lalu evaluasi tiap kolom.\n`);
    process.exit(1);
  }
  console.log('🟢 LULUS: tidak ada phantom/missing table.' + (sortedDrifts.length ? ` (${sortedDrifts.length} drift bersifat warning — jalankan dengan --strict untuk gate CI penuh)` : '') + '\n');
  process.exit(0);
}

main();
