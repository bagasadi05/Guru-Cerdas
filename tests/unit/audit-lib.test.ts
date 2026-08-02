import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Muat modul CJS scripts/audit-lib.cjs tanpa deklarasi tipe — interface lokal
// di bawah mencerminkan API yang dipakai test (perluasan import-following:
// default `import X from` dan namespace `import * as X`).
const require = createRequire(import.meta.url);

interface AuditLib {
  getDefaultImports(content: string): Array<{ spec: string; alias: string }>;
  getNamespaceImports(content: string): Array<{ spec: string; alias: string }>;
  getNamespaceUsages(content: string, alias: string): Set<string>;
  blankComments(content: string): string;
  mockProvides(factory: string, fn: string): boolean;
  resolveCached(fromFile: string, spec: string): string | null;
  collectUsedFromModule(
    testFile: string,
    testContent: string,
    mockedAbs: Set<string>,
    maxDepth: number,
    spec: string,
  ): { consumers: string[]; used: Set<string>; namespaceImport: boolean };
}

const auditLib = require('../../scripts/audit-lib.cjs') as AuditLib;

describe('audit-lib — perluasan import-following (regression guard)', () => {
  describe('getDefaultImports', () => {
    it('mendeteksi default import murni `import X from`', () => {
      expect(auditLib.getDefaultImports("import X from './m';")).toEqual([{ spec: './m', alias: 'X' }]);
    });

    it('mendeteksi bentuk campuran `import X, { a, b } from`', () => {
      expect(auditLib.getDefaultImports("import X, { a, b } from './m';")).toEqual([{ spec: './m', alias: 'X' }]);
    });

    it('mendeteksi bentuk campuran namespace `import X, * as Y from`', () => {
      expect(auditLib.getDefaultImports("import X, * as Y from './m';")).toEqual([{ spec: './m', alias: 'X' }]);
    });

    it('tidak menganggap named-only `import { a } from` sebagai default', () => {
      expect(auditLib.getDefaultImports("import { a } from './m';")).toEqual([]);
    });

    it('men-skip `import type X from` (type-only, terhapus saat compile)', () => {
      expect(auditLib.getDefaultImports("import type X from './m';")).toEqual([]);
    });

    it('menangkap beberapa default import sekaligus', () => {
      const r = auditLib.getDefaultImports("import A from './a';\nimport B, { c } from './b';");
      expect(r).toEqual([
        { spec: './a', alias: 'A' },
        { spec: './b', alias: 'B' },
      ]);
    });
  });

  describe('getNamespaceImports', () => {
    it('mendeteksi `import * as X from`', () => {
      expect(auditLib.getNamespaceImports("import * as X from './m';")).toEqual([{ spec: './m', alias: 'X' }]);
    });

    it('mendeteksi bentuk campuran `import X, * as Y from` (alias = Y)', () => {
      expect(auditLib.getNamespaceImports("import X, * as Y from './m';")).toEqual([{ spec: './m', alias: 'Y' }]);
    });

    it('tidak menganggap named-only sebagai namespace', () => {
      expect(auditLib.getNamespaceImports("import { a } from './m';")).toEqual([]);
    });
  });

  describe('getNamespaceUsages', () => {
    it('mendeteksi member access `X.foo`', () => {
      expect([...auditLib.getNamespaceUsages('X.foo();', 'X')]).toEqual(['foo']);
    });

    it('mendeteksi optional chaining `X?.foo`', () => {
      expect([...auditLib.getNamespaceUsages('X?.foo();', 'X')]).toEqual(['foo']);
    });

    it('mendeteksi bracket access string `X[\'foo\']`', () => {
      expect([...auditLib.getNamespaceUsages("X['foo']();", 'X')]).toEqual(['foo']);
    });

    it('mendeteksi destructuring `const { a, b } = X`', () => {
      expect([...auditLib.getNamespaceUsages('const { a, b } = X;', 'X')].sort()).toEqual(['a', 'b']);
    });

    it('mengurai rename `a: alias` & default `b = 1` di destructuring', () => {
      expect([...auditLib.getNamespaceUsages('const { a: aa, b = 1 } = X;', 'X')].sort()).toEqual(['a', 'b']);
    });

    it('destructuring bersarang `const { a: { b } } = X` → under-detect (tidak dihitung)', () => {
      // Batasan reDestruct: group `[^}]+?` tidak bisa melewati `}` kedua sebelum
      // `= X`, jadi pola bersarang tidak match sama sekali → arah aman
      // under-detect (tidak pernah menghasilkan false STALE).
      expect([...auditLib.getNamespaceUsages('const { a: { b } } = X;', 'X')]).toEqual([]);
    });

    it('mengabaikan member yang hanya disebut di komentar', () => {
      expect([...auditLib.getNamespaceUsages('// X.bar dipakai\nX.foo();', 'X')]).toEqual(['foo']);
    });

    it('akses dinamis `X[key]` tidak terdeteksi (arah aman under-detect)', () => {
      expect([...auditLib.getNamespaceUsages('X[key];', 'X')]).toEqual([]);
    });

    it('tidak menghitung `X.from` di statement import itu sendiri', () => {
      expect([...auditLib.getNamespaceUsages("import * as X from './m';\nX.foo();", 'X')]).toEqual(['foo']);
    });
  });

  describe('blankComments', () => {
    it('memblank komentar line `//`', () => {
      const out = auditLib.blankComments('const a = 1; // X.bar\nconst b = 2;');
      expect(out).not.toContain('X.bar');
      expect(out).toContain('const b = 2;');
    });

    it('memblank komentar block `/* */`', () => {
      const out = auditLib.blankComments('/* X.bar */ const a = 1;');
      expect(out).not.toContain('X.bar');
      expect(out).toContain('const a = 1;');
    });

    it('membiarkan string literal berisi `//` tetap utuh', () => {
      const out = auditLib.blankComments("const s = 'a // b'; const t = 'c';");
      expect(out).toContain('a // b');
    });

    it('membiarkan template literal tetap utuh (interpolasi tetap terdeteksi)', () => {
      const out = auditLib.blankComments('const s = `X.foo ${x}`;');
      expect(out).toContain('X.foo ${x}');
    });
  });

  describe('mockProvides', () => {
    it('mencocokkan key yang disediakan factory (termasuk default & quoted)', () => {
      expect(auditLib.mockProvides('() => ({ foo: vi.fn() })', 'foo')).toBe(true);
      expect(auditLib.mockProvides('() => ({ default: vi.fn() })', 'default')).toBe(true);
      expect(auditLib.mockProvides('() => ({ "quoted": vi.fn() })', 'quoted')).toBe(true);
    });

    it('tidak mencocokkan key yang tidak disediakan factory', () => {
      expect(auditLib.mockProvides('() => ({ foo: vi.fn() })', 'bar')).toBe(false);
    });
  });

  // ── Fixture-based: collectUsedFromModule mensimulasikan deteksi STALE ──
  // (meniru probe sintetis ad-hoc: ns_clean / ns_stale / ns_bracket /
  //  ns_destruct / ns_dynamic / ns_comment / def_mixed_clean / def_mixed_stale)
  describe('collectUsedFromModule + mockProvides (simulasi deteksi STALE)', () => {
    let tmpDir: string;

    const runCollect = (
      name: string,
      content: string,
      spec: string,
      mockedSpecs: string[],
      maxDepth = 3,
    ) => {
      const testFile = path.join(tmpDir, name);
      fs.writeFileSync(testFile, content, 'utf8');
      const mockedAbs = new Set<string>();
      for (const s of mockedSpecs) {
        const r = auditLib.resolveCached(testFile, s);
        if (r) mockedAbs.add(r);
      }
      return auditLib.collectUsedFromModule(testFile, content, mockedAbs, maxDepth, spec);
    };

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-lib-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'mod_ns.ts'),
        'export const foo = 1;\nexport const bar = 2;\nexport const a = 3;\nexport const b = 4;\n',
      );
      fs.writeFileSync(
        path.join(tmpDir, 'mod_def.ts'),
        'export const a = 1;\nexport default { a: 1 };\n',
      );
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('namespace member dipakai & disediakan mock → tidak ada missing', () => {
      const { used, namespaceImport } = runCollect(
        'ns_clean.ts',
        "import * as X from './mod_ns';\nconst v = X.foo;\n",
        './mod_ns',
        ['./mod_ns'],
      );
      expect([...used].sort()).toEqual(['foo']);
      expect(namespaceImport).toBe(true);
      expect(auditLib.mockProvides('() => ({ foo: vi.fn() })', 'foo')).toBe(true);
    });

    it('namespace member dipakai tapi tidak disediakan mock → STALE (missing foo)', () => {
      const { used } = runCollect(
        'ns_stale.ts',
        "import * as X from './mod_ns';\nconst v = X.foo;\n",
        './mod_ns',
        ['./mod_ns'],
      );
      expect([...used]).toContain('foo');
      const factory = '() => ({ bar: vi.fn() })';
      const missing = [...used].filter((fn) => !auditLib.mockProvides(factory, fn));
      expect(missing).toEqual(['foo']);
    });

    it('bracket access `X[\'b\']` terdeteksi sebagai usage', () => {
      const { used } = runCollect(
        'ns_bracket.ts',
        "import * as X from './mod_ns';\nconst v = X['b'];\n",
        './mod_ns',
        ['./mod_ns'],
      );
      expect([...used]).toEqual(['b']);
    });

    it('destructuring `const { a } = X` terdeteksi sebagai usage', () => {
      const { used } = runCollect(
        'ns_destruct.ts',
        "import * as X from './mod_ns';\nconst { a } = X;\n",
        './mod_ns',
        ['./mod_ns'],
      );
      expect([...used]).toEqual(['a']);
    });

    it('akses dinamis `X[key]` → used kosong tapi namespaceImport true (under-detect aman)', () => {
      const { used, namespaceImport } = runCollect(
        'ns_dynamic.ts',
        "import * as X from './mod_ns';\nconst key = 'foo';\nconst v = X[key];\n",
        './mod_ns',
        ['./mod_ns'],
      );
      expect(used.size).toBe(0);
      expect(namespaceImport).toBe(true);
    });

    it('member di komentar tidak dihitung; hanya foo dari kode nyata', () => {
      const { used } = runCollect(
        'ns_comment.ts',
        "import * as X from './mod_ns';\n// X.bar disebut di komentar\nconst v = X.foo;\n",
        './mod_ns',
        ['./mod_ns'],
      );
      expect([...used]).toEqual(['foo']);
    });

    it('default import murni → used berisi "default"', () => {
      const { used } = runCollect(
        'def_pure.ts',
        "import D from './mod_def';\nconst v = D;\n",
        './mod_def',
        ['./mod_def'],
      );
      expect([...used]).toEqual(['default']);
    });

    it('default import campuran `import D, { a }` → used berisi default + a', () => {
      const { used } = runCollect(
        'def_mixed_clean.ts',
        "import D, { a } from './mod_def';\nconst v = D;\nconst w = a;\n",
        './mod_def',
        ['./mod_def'],
      );
      expect([...used].sort()).toEqual(['a', 'default']);
    });

    it('factory tanpa `default` untuk default import campuran → missing default (STALE)', () => {
      const { used } = runCollect(
        'def_mixed_stale.ts',
        "import D, { a } from './mod_def';\nconst v = D;\nconst w = a;\n",
        './mod_def',
        ['./mod_def'],
      );
      const factory = '() => ({ a: vi.fn() })';
      const missing = [...used].filter((fn) => !auditLib.mockProvides(factory, fn));
      expect(missing).toEqual(['default']);
    });

    it('chain import transitif: usage namespace di modul yang di-import test ikut terdeteksi', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'chain.ts'),
        "import * as X from './mod_ns';\nexport const v = X.foo;\n",
      );
      const { used } = runCollect(
        'chain_test.ts',
        "import { v } from './chain';\nconst w = v;\n",
        './mod_ns',
        ['./mod_ns'],
        3,
      );
      expect([...used]).toEqual(['foo']);
    });
  });
});
