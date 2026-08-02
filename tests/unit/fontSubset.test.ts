import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

// Muat modul CJS scripts/audit-font-subset.cjs tanpa deklarasi tipe —
// interface lokal di bawah mencerminkan API yang dipakai test.
const require = createRequire(import.meta.url);

interface FontSubsetAudit {
  CLASS_WEIGHTS: Record<string, number>;
  parseDeclaredWeights(css: string): Map<string, Set<number>>;
  extractUsedWeights(content: string): Map<number, number>;
  scanUsedWeights(dir: string): Map<number, number>;
  computeSubsetDiff(
    declared: Map<string, Set<number>>,
    used: Map<number, number>,
  ): { missing: number[]; unused: number[] };
  FONTS_CSS: string;
  SRC_DIR: string;
}

const fontSubset = require('../../scripts/audit-font-subset.cjs') as FontSubsetAudit;

describe('audit-font-subset — weight font dipakai harus dideklarasikan', () => {
  describe('CLASS_WEIGHTS — pemetaan kelas Tailwind font-* → berat', () => {
    it('memetakan semua weight 100–900 sesuai standar Tailwind', () => {
      expect(fontSubset.CLASS_WEIGHTS).toEqual({
        thin: 100,
        extralight: 200,
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        black: 900,
      });
    });
  });

  describe('parseDeclaredWeights — parsing @font-face di fonts.css', () => {
    it('mengekstrak family + weight dari blok @font-face', () => {
      const css = `
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; src: url('x.woff2') format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; src: url('y.woff2') format('woff2'); }
@font-face { font-family: 'Tinos'; font-style: normal; font-weight: 400; src: url('z.woff2') format('woff2'); }
`;
      const declared = fontSubset.parseDeclaredWeights(css);
      expect([...declared.get('Inter')!].sort()).toEqual([400, 700]);
      expect([...declared.get('Tinos')!]).toEqual([400]);
    });

    it('mengabaikan blok yang tidak memiliki font-family/font-weight', () => {
      const declared = fontSubset.parseDeclaredWeights('@font-face { src: url("x"); }');
      expect(declared.size).toBe(0);
    });

    it('menangani beberapa deklarasi weight untuk family yang sama', () => {
      const css = `
@font-face { font-family: 'Inter'; font-weight: 400; src: url('a'); }
@font-face { font-family: 'Inter'; font-weight: 500; src: url('b'); }
@font-face { font-family: 'Inter'; font-weight: 600; src: url('c'); }
`;
      const declared = fontSubset.parseDeclaredWeights(css);
      expect([...declared.get('Inter')!].sort()).toEqual([400, 500, 600]);
    });
  });

  describe('extractUsedWeights — deteksi pemakaian weight di src', () => {
    it('mendeteksi kelas font-bold (700)', () => {
      const used = fontSubset.extractUsedWeights('className="font-bold"');
      expect(used.get(700)).toBe(1);
    });

    it('mendeteksi kelas font-semibold (600) tanpa salah tangkap sebagai bold', () => {
      const used = fontSubset.extractUsedWeights('className="font-semibold"');
      expect(used.get(600)).toBe(1);
      expect(used.has(700)).toBe(false);
    });

    it('mendeteksi font-extrabold (800) tanpa salah tangkap sebagai bold', () => {
      const used = fontSubset.extractUsedWeights('className="font-extrabold"');
      expect(used.get(800)).toBe(1);
      expect(used.has(700)).toBe(false);
    });

    it('menghitung beberapa kelas sekaligus', () => {
      const used = fontSubset.extractUsedWeights('a font-bold b font-medium c font-bold');
      expect(used.get(700)).toBe(2);
      expect(used.get(500)).toBe(1);
    });

    it('tidak menghitung komentar (mis. contoh kelas di docblock)', () => {
      const used = fontSubset.extractUsedWeights('// font-black dipakai di sini\nconst x = 1;');
      expect(used.has(900)).toBe(false);
    });

    it('mendeteksi fontWeight prop SVG/chart (fontWeight="600")', () => {
      const used = fontSubset.extractUsedWeights('<text fontWeight="600" />');
      expect(used.get(600)).toBe(1);
    });

    it('mendeteksi fontWeight prop numerik (fontWeight={600})', () => {
      const used = fontSubset.extractUsedWeights('<Comp fontWeight={600} />');
      expect(used.get(600)).toBe(1);
    });

    it('mendeteksi aturan CSS font-weight', () => {
      const used = fontSubset.extractUsedWeights('p { font-weight: 700; }');
      expect(used.get(700)).toBe(1);
    });

    it('mendeteksi arbitrary Tailwind font-[500]', () => {
      const used = fontSubset.extractUsedWeights('className="font-[500]"');
      expect(used.get(500)).toBe(1);
    });
  });

  describe('computeSubsetDiff — inti validasi (missing = lupa ditambahkan)', () => {
    const declared = new Map([['Inter', new Set([400, 500, 600, 700, 800, 900])]]);

    it('weight dipakai tapi tidak dideklarasikan → missing (gagal CI)', () => {
      const used = new Map([[400, 1], [300, 2]]); // font-light dipakai, tidak ada @font-face 300
      const { missing, unused } = fontSubset.computeSubsetDiff(declared, used);
      expect(missing).toEqual([300]);
      expect(unused).toEqual([500, 600, 700, 800, 900]); // sisanya dideklarasikan tapi tak dipakai
    });

    it('semua weight dideklarasikan → missing kosong', () => {
      const used = new Map([[400, 10], [700, 5]]);
      const { missing, unused } = fontSubset.computeSubsetDiff(declared, used);
      expect(missing).toEqual([]);
      expect(unused).toEqual([500, 600, 800, 900]);
    });

    it('weight dideklarasikan tapi tak pernah dipakai → dilaporkan sebagai unused', () => {
      const used = new Map([[400, 1], [500, 1], [600, 1], [700, 1], [800, 1]]);
      const { missing, unused } = fontSubset.computeSubsetDiff(declared, used);
      expect(missing).toEqual([]);
      expect(unused).toEqual([900]);
    });

    it('menyortir hasil ascending & murni (tidak memutasi input)', () => {
      const used = new Map([[900, 1], [100, 1]]);
      const { missing, unused } = fontSubset.computeSubsetDiff(declared, used);
      expect(missing).toEqual([100]);
      expect(unused).toEqual([400, 500, 600, 700, 800]);
      expect(declared.size).toBe(1);
    });
  });

  describe('repo nyata — weight yang dipakai di src saat ini sudah dideklarasikan', () => {
    it('tidak ada missing weight pada state sekarang (guard regresi)', () => {
      const css = fs.readFileSync(fontSubset.FONTS_CSS, 'utf8');
      const declared = fontSubset.parseDeclaredWeights(css);
      const used = fontSubset.scanUsedWeights(fontSubset.SRC_DIR);
      const { missing } = fontSubset.computeSubsetDiff(declared, used);
      expect(missing).toEqual([]);
    });
  });
});
