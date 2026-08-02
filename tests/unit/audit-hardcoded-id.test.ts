import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Muat modul CJS scripts/audit-hardcoded-id.cjs tanpa deklarasi tipe —
// interface lokal di bawah mencerminkan API yang dipakai test.
const require = createRequire(import.meta.url);

interface HardcodedIdFinding {
  kind: 'RISK' | 'CONVENTION' | 'OWNER-RISK';
  file: string;
  line: number;
  table: string;
  hardcoded: string;
  expected: string | null;
  near: number;
  code: string;
}

interface FixDiff {
  line: number;
  oldLine: string;
  newLine: string;
}

interface FixResult {
  content: string;
  changed: number;
  needsImport: boolean;
  diffs: FixDiff[];
}

interface CsvRow {
  kind: string;
  file: string;
  line: number;
  table: string;
  hardcoded: string;
  expected: string;
  near: number;
  code: string;
  fixable: string;
}

interface HardcodedIdAudit {
  parseService(): {
    keyMap: Record<string, string>;
    ownerMap: Record<string, string | null>;
    entities: Set<string>;
  };
  parseServiceFromContent(content: string): {
    keyMap: Record<string, string>;
    ownerMap: Record<string, string | null>;
    entities: Set<string>;
  };
  findTableAbove(lines: string[], lineIdx: number, maxWindow?: number): { table: string; line: number } | null;
  scanFile(
    filePath: string,
    keyMap: Record<string, string>,
    ownerMap: Record<string, string | null>,
    entities: Set<string>,
  ): HardcodedIdFinding[];
  collectSourceFiles(dir: string, out: string[]): string[];
  hasKeyColumnImport(content: string): boolean;
  relativeServiceImport(fromFileAbs: string): string;
  addImportToContent(content: string, importLine: string): string;
  fixFindingLine(line: string, table: string): string;
  fixFileContent(
    content: string,
    findings: HardcodedIdFinding[],
    addImports: boolean,
    fromFileAbs: string,
  ): FixResult;
  csvRows(findings: HardcodedIdFinding[], inScopeFiles: Set<string>): CsvRow[];
  writeCsv(pathOut: string, rows: CsvRow[]): void;
  SRC_DIR: string;
  SERVICE_FILE: string;
}

const audit = require('../../scripts/audit-hardcoded-id.cjs') as HardcodedIdAudit;

describe('audit-hardcoded-id — regresi 3 bug (regression guard)', () => {
  // ── Bug #1: parser ALL_SOFT_DELETE_ENTITIES first-match per baris ────────
  // File service nyata punya baris multi-entity; first-match hanya menangkap
  // entity pertama (kasus nyata: `user_settings` satu baris dengan
  // announcements/academic_years/semesters → terlewat, entity terdeteksi
  // hanya 8 dari 23). GLOBAL match per baris adalah fix-nya.
  describe('parseServiceFromContent — parser multi-entity (bug #1)', () => {
    const SERVICE_SNIPPET = `export type SoftDeleteEntity = 'students' | 'user_settings';
export const ENTITY_KEY_COLUMN: Readonly<Record<SoftDeleteEntity, string>> = {
    students: 'id',
    user_settings: 'user_id',
};
export const ALL_SOFT_DELETE_ENTITIES: SoftDeleteEntity[] = [
    'students', 'classes', 'attendance', 'tasks',
    'violations', 'quiz_points', 'academic_records',
    'announcements', 'academic_years', 'semesters', 'user_settings',
];
`;

    it('mendeteksi SEMUA entity pada baris multi-entity (bukan hanya yang pertama)', () => {
      const { entities } = audit.parseServiceFromContent(SERVICE_SNIPPET);
      expect([...entities].sort()).toEqual([
        'academic_records',
        'academic_years',
        'announcements',
        'attendance',
        'classes',
        'quiz_points',
        'semesters',
        'students',
        'tasks',
        'user_settings', // <— dulu terlewat oleh first-match
        'violations',
      ]);
    });

    it('mendeteksi `user_settings` meski duduk di baris yang sama dengan entity lain', () => {
      const { entities } = audit.parseServiceFromContent(SERVICE_SNIPPET);
      expect(entities.has('user_settings')).toBe(true);
      expect(entities.has('announcements')).toBe(true);
    });

    it('mem-parse ENTITY_KEY_COLUMN termasuk key non-id', () => {
      const { keyMap } = audit.parseServiceFromContent(SERVICE_SNIPPET);
      expect(keyMap).toEqual({ students: 'id', user_settings: 'user_id' });
    });

    it('mengembalikan map kosong untuk konten tanpa blok yang dikenali', () => {
      const { keyMap, entities } = audit.parseServiceFromContent('const x = 1;');
      expect(keyMap).toEqual({});
      expect(entities.size).toBe(0);
    });
  });

  // ── Bug #2: findTableAbove backward-scan murni tidak melihat baris inline ─
  // Pola `supabase.from('user_settings').eq('id', v)` satu-baris menaruh
  // .from() di baris yang SAMA dengan filter; scan dari i-1 tidak pernah
  // menemukannya. Fix: mulai scan dari baris saat ini (i = lineIdx).
  describe('findTableAbove — deteksi .from() di baris yang sama (bug #2)', () => {
    it('mendeteksi .from() inline satu-baris dengan filter eq', () => {
      const lines = ["supabase.from('user_settings').eq('id', id);"];
      const ctx = audit.findTableAbove(lines, 0);
      expect(ctx).toEqual({ table: 'user_settings', line: 1 });
    });

    it('mendeteksi .from() inline satu-baris dengan select', () => {
      const lines = ["supabase.from('user_settings').select('id')"];
      const ctx = audit.findTableAbove(lines, 0);
      expect(ctx).toEqual({ table: 'user_settings', line: 1 });
    });

    it('mendeteksi .from() di baris sebelumnya dalam statement yang sama', () => {
      const lines = [
        "const q = supabase.from('user_settings')",
        "  .eq('id', id);",
      ];
      const ctx = audit.findTableAbove(lines, 1);
      expect(ctx).toEqual({ table: 'user_settings', line: 1 });
    });

    it('tidak menyeberang batas statement `;` ke statement sebelumnya', () => {
      // .from() ada di baris 0 (statement pertama, berakhir `;`), filter eq
      // di baris 2 TANPA .from() sendiri → scan ke atas harus berhenti di `;`
      // baris 1 dan mengembalikan null (bukan salah mengaitkan ke students).
      const lines = [
        "supabase.from('students').select('*');",
        'other.statement();',
        "query.eq('id', id);",
      ];
      expect(audit.findTableAbove(lines, 2)).toBeNull();
    });

    it('dalam statement yang sama: .from() di atas filter tetap ditemukan (melewati baris tanpa `;`)', () => {
      // Tidak ada `;` di baris 0 → scan boleh lanjut ke baris 0 dan menemukan
      // .from('students') untuk filter di baris 1.
      const lines = [
        "const q = supabase.from('students')",
        "  .eq('id', id);",
      ];
      expect(audit.findTableAbove(lines, 1)).toEqual({ table: 'students', line: 1 });
    });

    it('mengembalikan null bila tidak ada .from() dalam jendela', () => {
      const lines = ['const x = 1;', 'q.eq("id", v);'];
      expect(audit.findTableAbove(lines, 1)).toBeNull();
    });
  });

  // ── Bug #3: hardcodeRe tidak mengenali select('id') polos ─────────────────
  // Follow set dulu hanya `,`/`]`, jadi `.select('id')` (bentuk persis bug
  // cleanupExpired) lolos. Fix: tambah `)` ke follow set.
  describe('scanFile — deteksi select(\'id\') polos + kategorisasi (bug #3)', () => {
    let tmpDir: string;

    const writeProbe = (name: string, content: string) => {
      const file = path.join(tmpDir, name);
      fs.writeFileSync(file, content, 'utf8');
      return file;
    };

    const scan = (file: string) =>
      audit.scanFile(
        file,
        { user_settings: 'user_id', students: 'id' },
        { user_settings: 'user_id', students: 'user_id' },
        new Set(['user_settings', 'students']),
      );

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-hardcoded-id-test-'));
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('mendeteksi `.select(\'id\')` polos (tanpa argumen kedua) sebagai RISK', () => {
      const file = writeProbe('p_sel_plain.ts', "supabase.from('user_settings').select('id');\n");
      const findings = scan(file);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        kind: 'RISK',
        table: 'user_settings',
        hardcoded: 'id',
        expected: 'user_id',
      });
    });

    it('mendeteksi `.eq(\'id\', ...)` inline satu-baris pada user_settings sebagai RISK', () => {
      const file = writeProbe('p_eq_inline.ts', "const r = await supabase.from('user_settings').eq('id', id);\n");
      const findings = scan(file);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ kind: 'RISK', table: 'user_settings', expected: 'user_id' });
    });

    it('mendeteksi `.in(\'id\', ids)` pada user_settings sebagai RISK', () => {
      const file = writeProbe('p_in.ts', "supabase.from('user_settings').in('id', ids);\n");
      const findings = scan(file);
      expect(findings).toHaveLength(1);
      expect(findings[0].kind).toBe('RISK');
    });

    it('hardcode \'id\' pada entity berkolom kunci id → CONVENTION (bukan RISK)', () => {
      const file = writeProbe('p_students.ts', "supabase.from('students').eq('id', id);\n");
      const findings = scan(file);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ kind: 'CONVENTION', table: 'students', expected: 'id' });
    });

    it('tidak melaporkan tabel di luar entity soft-delete (non-soft-delete normal)', () => {
      const file = writeProbe('p_other.ts', "supabase.from('profiles').eq('id', id);\n");
      expect(scan(file)).toHaveLength(0);
    });

    it('mengabaikan `eq` tanpa .from() yang dikenali (arah aman under-detect)', () => {
      const file = writeProbe('p_no_from.ts', 'query.eq("id", v);\n');
      expect(scan(file)).toHaveLength(0);
    });
  });

  // ── Owner-filter: 'user_id' pada entity TANPA kolom user_id ──────────────
  // Kelas bug yang sama dgn getDeletedItems (skip-tanpa-query): homework &
  // announcements TIDAK punya kolom user_id → `.eq('user_id', ...)` ditolak
  // PostgREST HTTP 400. Parser ownerMap diambil dari ENTITY_OWNER_COLUMN.
  describe('parseServiceFromContent — parser ENTITY_OWNER_COLUMN', () => {
    const OWNER_SNIPPET = `export type SoftDeleteEntity = 'students' | 'homework' | 'announcements';
export const ENTITY_OWNER_COLUMN: Readonly<Record<SoftDeleteEntity, string | null>> = {
    students: 'user_id',
    // homework & announcements: tidak punya kolom user_id (global/sekolah) → skip
    homework: null,
    announcements: null,
};
`;

    it('mem-parse ownerMap: string untuk entity berowner, null untuk tanpa owner', () => {
      const { ownerMap } = audit.parseServiceFromContent(OWNER_SNIPPET);
      expect(ownerMap).toEqual({ students: 'user_id', homework: null, announcements: null });
    });

    it('mengembalikan ownerMap kosong untuk konten tanpa blok yang dikenali', () => {
      const { ownerMap } = audit.parseServiceFromContent('const x = 1;');
      expect(ownerMap).toEqual({});
    });
  });

  describe('scanFile — owner-filter user_id pada entity tanpa kolom owner', () => {
    let tmpDir: string;

    const writeProbe = (name: string, content: string) => {
      const file = path.join(tmpDir, name);
      fs.writeFileSync(file, content, 'utf8');
      return file;
    };

    const scan = (file: string) =>
      audit.scanFile(
        file,
        { students: 'id', homework: 'id', announcements: 'id' },
        { students: 'user_id', homework: null, announcements: null },
        new Set(['students', 'homework', 'announcements']),
      );

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-hardcoded-owner-'));
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('mendeteksi `.eq(\'user_id\', ...)` pada homework → OWNER-RISK', () => {
      const file = writeProbe('o_hw_eq.ts', "supabase.from('homework').eq('user_id', uid);\n");
      const findings = scan(file);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        kind: 'OWNER-RISK',
        table: 'homework',
        hardcoded: 'user_id',
        expected: null,
      });
    });

    it('mendeteksi `.in(\'user_id\', ids)` pada announcements → OWNER-RISK', () => {
      const file = writeProbe('o_ann_in.ts', "supabase.from('announcements').in('user_id', ids);\n");
      const findings = scan(file);
      expect(findings[0].kind).toBe('OWNER-RISK');
    });

    it('mendeteksi `.select(\'user_id\')` polos pada homework → OWNER-RISK', () => {
      const file = writeProbe('o_hw_sel.ts', "supabase.from('homework').select('user_id');\n");
      const findings = scan(file);
      expect(findings[0].kind).toBe('OWNER-RISK');
    });

    it('mendeteksi `.not(\'user_id\', ...)` pada homework → OWNER-RISK', () => {
      const file = writeProbe('o_hw_not.ts', "supabase.from('homework').not('user_id', 'is', null);\n");
      const findings = scan(file);
      expect(findings[0].kind).toBe('OWNER-RISK');
    });

    it('mendeteksi `.is(\'user_id\', null)` polos pada homework → OWNER-RISK', () => {
      const file = writeProbe('o_hw_is.ts', "supabase.from('homework').is('user_id', null);\n");
      const findings = scan(file);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ kind: 'OWNER-RISK', table: 'homework' });
    });

    it('`.is(\'user_id\', null)` pada entity BER-user_id → tidak dilaporkan', () => {
      const file = writeProbe('o_students_is_ok.ts', "supabase.from('students').is('user_id', null);\n");
      expect(scan(file)).toHaveLength(0);
    });

    it('`.eq(\'user_id\')` pada entity yang PUNYA user_id → tidak dilaporkan', () => {
      const file = writeProbe('o_students_ok.ts', "supabase.from('students').eq('user_id', uid);\n");
      expect(scan(file)).toHaveLength(0);
    });

    it('`.eq(\'user_id\')` pada tabel non-soft-delete → tidak dilaporkan', () => {
      const file = writeProbe('o_profiles_ok.ts', "supabase.from('profiles').eq('user_id', uid);\n");
      expect(scan(file)).toHaveLength(0);
    });

    it('menggabungkan temuan id & owner pada baris berbeda dalam satu file', () => {
      const file = writeProbe(
        'o_mixed.ts',
        "supabase.from('students').eq('id', id);\nsupabase.from('homework').eq('user_id', uid);\n",
      );
      const findings = scan(file);
      expect(findings.map((f) => f.kind).sort()).toEqual(['CONVENTION', 'OWNER-RISK']);
    });
  });

  // ── Repo nyata: state saat ini harus tetap 0 RISK & 0 OWNER-RISK ─────────
  // (sama seperti test "repo nyata" di fontSubset.test.ts — guard regresi CI)
  describe('repo nyata — tidak ada hardcode berisiko 400', () => {
    it('parseService() membaca SERVICE_FILE: user_settings → user_id, homework/announcements tanpa owner', () => {
      const { keyMap, ownerMap, entities } = audit.parseService();
      expect(entities.has('user_settings')).toBe(true);
      expect(keyMap.user_settings).toBe('user_id');
      expect(keyMap.students).toBe('id');
      expect(ownerMap.homework).toBeNull();
      expect(ownerMap.announcements).toBeNull();
      expect(ownerMap.students).toBe('user_id');
      expect(entities.size).toBeGreaterThanOrEqual(20);
    });

    it('scan seluruh src → 0 RISK & 0 OWNER-RISK (semua hardcode id/user_id hanya pada kolom yang ada)', () => {
      const { keyMap, ownerMap, entities } = audit.parseService();
      const files: string[] = [];
      audit.collectSourceFiles(audit.SRC_DIR, files);
      const findings = files.flatMap((f) => audit.scanFile(f, keyMap, ownerMap, entities));
      const risks = findings.filter((f) => f.kind === 'RISK' || f.kind === 'OWNER-RISK');
      expect(risks).toEqual([]);
    });
  });

  // ── Mode FIX: replace aman + penyisipan import opsional ──────────────────
  describe('fixFindingLine — penggantian hardcode \'id\'', () => {
    it('mengganti .eq(\'id\', ...) → ENTITY_KEY_COLUMN[table]', () => {
      expect(audit.fixFindingLine("supabase.from('students').eq('id', id);", 'students')).toBe(
        "supabase.from('students').eq(ENTITY_KEY_COLUMN['students'], id);",
      );
    });

    it('mengganti .in(\'id\', ids) → ENTITY_KEY_COLUMN[table]', () => {
      expect(audit.fixFindingLine("supabase.from('tasks').in('id', ids);", 'tasks')).toBe(
        "supabase.from('tasks').in(ENTITY_KEY_COLUMN['tasks'], ids);",
      );
    });

    it('mengganti .select(\'id\') polos → ENTITY_KEY_COLUMN[table]', () => {
      expect(audit.fixFindingLine("supabase.from('violations').select('id')", 'violations')).toBe(
        "supabase.from('violations').select(ENTITY_KEY_COLUMN['violations'])",
      );
    });

    it('menangani kutip ganda', () => {
      expect(audit.fixFindingLine('supabase.from("students").eq("id", id);', 'students')).toBe(
        "supabase.from(\"students\").eq(ENTITY_KEY_COLUMN['students'], id);",
      );
    });

    it('baris tanpa pola hardcode dikembalikan apa adanya', () => {
      const line = "supabase.from('students').eq('class_id', id);";
      expect(audit.fixFindingLine(line, 'students')).toBe(line);
    });
  });

  describe('hasKeyColumnImport — safety gate penyisipan', () => {
    it('true bila ada named import ENTITY_KEY_COLUMN', () => {
      expect(
        audit.hasKeyColumnImport("import { ENTITY_KEY_COLUMN } from '../services/SoftDeleteService';\n"),
      ).toBe(true);
    });

    it('false bila import namespace (bukan bare identifier)', () => {
      expect(
        audit.hasKeyColumnImport("import * as SD from '../services/SoftDeleteService';\n"),
      ).toBe(false);
    });

    it('false bila tidak ada import sama sekali', () => {
      expect(audit.hasKeyColumnImport('const x = 1;')).toBe(false);
    });
  });

  describe('relativeServiceImport + addImportToContent — penyisipan import', () => {
    it('menghitung path relatif tanpa ekstensi .ts', () => {
      const rel = audit.relativeServiceImport(
        path.join(audit.SRC_DIR, 'components/pages/student/hooks/useStudentMutations.ts'),
      );
      expect(rel.endsWith('/services/SoftDeleteService')).toBe(true);
      expect(rel).not.toMatch(/\.ts$/);
    });

    it('menyisipkan import setelah import terakhir (bukan setelah import pertama)', () => {
      const content = "import a from 'a';\nimport b from 'b';\nconst x = 1;\n";
      const out = audit.addImportToContent(content, "import { ENTITY_KEY_COLUMN } from '../x';").split('\n');
      expect(out[0]).toBe("import a from 'a';");
      expect(out[1]).toBe("import b from 'b';");
      expect(out[2]).toBe("import { ENTITY_KEY_COLUMN } from '../x';");
      expect(out[3]).toBe('const x = 1;');
    });

    it('menaruh import di baris 0 bila file tidak punya import', () => {
      const out = audit.addImportToContent('const x = 1;', "import { ENTITY_KEY_COLUMN } from '../x';").split('\n');
      expect(out[0]).toBe("import { ENTITY_KEY_COLUMN } from '../x';");
    });

    it('TIDAK menyisipkan di tengah import multi-baris (regresi bug rusak sintaks)', () => {
      const content = "import {\n  supabase,\n  logger,\n} from './supabase';\nconst x = 1;\n";
      const out = audit.addImportToContent(content, "import { ENTITY_KEY_COLUMN } from '../x';").split('\n');
      // Import baru harus berada SETELAH `} from './supabase';` (akhir statement),
      // bukan di antara `import {` dan `supabase,`.
      expect(out[0]).toBe('import {');
      expect(out[1]).toBe('  supabase,');
      expect(out[2]).toBe('  logger,');
      expect(out[3]).toBe("} from './supabase';");
      expect(out[4]).toBe("import { ENTITY_KEY_COLUMN } from '../x';");
      expect(out[5]).toBe('const x = 1;');
    });

    it('TIDAK merusak import multi-baris bila itu import terakhir dan tidak ada kode setelahnya', () => {
      const content = "import {\n  a,\n  b,\n} from './m';\n";
      const out = audit.addImportToContent(content, "import { ENTITY_KEY_COLUMN } from '../x';").split('\n');
      expect(out[3]).toBe("} from './m';");
      expect(out[4]).toBe("import { ENTITY_KEY_COLUMN } from '../x';");
    });
  });

  describe('fixFileContent — pipeline fix per file', () => {
    const findingsFor = (lines: Array<{ line: number; table: string }>): HardcodedIdFinding[] =>
      lines.map(({ line, table }) => ({
        kind: 'CONVENTION',
        file: 'x.ts',
        line,
        table,
        hardcoded: 'id',
        expected: 'id',
        near: line,
        code: '',
      }));

    it('mengganti baris hardcode dan menandai needsImport bila file belum import', () => {
      const content = "supabase.from('students').eq('id', id);\n";
      const res = audit.fixFileContent(content, findingsFor([{ line: 1, table: 'students' }]), false, 'x.ts');
      expect(res.changed).toBe(1);
      expect(res.needsImport).toBe(true);
      expect(res.content).toContain("eq(ENTITY_KEY_COLUMN['students'], id)");
    });

    it('menyisipkan import bila addImports=true', () => {
      const content = "import { supabase } from './supabase';\nsupabase.from('students').eq('id', id);\n";
      const res = audit.fixFileContent(content, findingsFor([{ line: 2, table: 'students' }]), true, 'x.ts');
      expect(res.changed).toBe(1);
      expect(res.needsImport).toBe(false);
      expect(res.content).toContain('import { ENTITY_KEY_COLUMN } from');
      expect(res.content).toContain("eq(ENTITY_KEY_COLUMN['students'], id)");
    });

    it('diffs berisi pasangan old/new dari BARIS ASLI (tidak bergeser walau import disisipkan)', () => {
      const content = "import { supabase } from './supabase';\nsupabase.from('students').eq('id', id);\n";
      const res = audit.fixFileContent(content, findingsFor([{ line: 2, table: 'students' }]), true, 'x.ts');
      expect(res.diffs).toEqual([
        {
          line: 2,
          oldLine: "supabase.from('students').eq('id', id);",
          newLine: "supabase.from('students').eq(ENTITY_KEY_COLUMN['students'], id);",
        },
      ]);
    });

    it('diffs kosong bila tidak ada baris yang diubah', () => {
      const res = audit.fixFileContent('const x = 1;\n', findingsFor([{ line: 5, table: 'students' }]), false, 'x.ts');
      expect(res.diffs).toEqual([]);
    });

    it('tidak menambahkan import ganda bila sudah in-scope', () => {
      const content =
        "import { ENTITY_KEY_COLUMN } from './SoftDeleteService';\nsupabase.from('students').eq('id', id);\n";
      const res = audit.fixFileContent(content, findingsFor([{ line: 2, table: 'students' }]), true, 'x.ts');
      expect(res.changed).toBe(1);
      expect(res.needsImport).toBe(false);
      expect(res.content.match(/import \{[^}]*ENTITY_KEY_COLUMN[^}]*\} from/g)).toHaveLength(1);
    });

    it('tidak mengubah apa pun bila tidak ada temuan pada baris', () => {
      const content = 'const x = 1;\n';
      const res = audit.fixFileContent(content, findingsFor([{ line: 5, table: 'students' }]), false, 'x.ts');
      expect(res.changed).toBe(0);
      expect(res.content).toBe(content);
    });
  });

  describe('csvRows + writeCsv — laporan review per file', () => {
    const f = (over: Partial<HardcodedIdFinding>): HardcodedIdFinding => ({
      kind: 'CONVENTION',
      file: 'a/b.ts',
      line: 3,
      table: 'students',
      hardcoded: 'id',
      expected: 'id',
      near: 1,
      code: '.eq(\'id\', id)',
      ...over,
    });

    it('memberi label fixable akurat: auto (in-scope) / needs-import / manual (RISK)', () => {
      const rows = audit.csvRows(
        [f({}), f({ kind: 'RISK', table: 'user_settings', expected: 'user_id' })],
        new Set(['a/b.ts']),
      );
      expect(rows.map((r) => r.fixable).sort()).toEqual(['auto', 'manual']);
    });

    it('OWNER-RISK berlabel manual (tidak bisa di-fix otomatis)', () => {
      const rows = audit.csvRows([f({ kind: 'OWNER-RISK', table: 'homework', expected: null })], new Set());
      expect(rows[0].fixable).toBe('manual');
      expect(rows[0].expected).toBe('—'); // null → dash di CSV
    });

    it('CONVENTION di file TANPA import → needs-import (konsisten dgn perilaku --fix)', () => {
      const rows = audit.csvRows([f({})], new Set());
      expect(rows[0].fixable).toBe('needs-import');
    });

    it('menyortir berdasarkan file:line', () => {
      const rows = audit.csvRows(
        [f({ file: 'z.ts', line: 1 }), f({ file: 'a.ts', line: 9 })],
        new Set(),
      );
      expect(rows.map((r) => r.file)).toEqual(['a.ts', 'z.ts']);
    });

    it('writeCsv menulis header + baris ke file (quote konsisten)', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-hardcoded-csv-'));
      try {
        const out = path.join(dir, 'report.csv');
        audit.writeCsv(out, audit.csvRows([f({})], new Set()));
        const text = fs.readFileSync(out, 'utf8');
        expect(text.split('\n')[0]).toBe('"kind","file","line","table","hardcoded","expected","near","code","fixable"');
        expect(text).toContain('"a/b.ts"');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
