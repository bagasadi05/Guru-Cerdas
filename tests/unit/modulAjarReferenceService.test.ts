import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ rows: [] as { deskripsi_cp: string; elemen: string; sumber_regulasi: string }[], error: null as unknown, filters: [] as unknown[][] }));
vi.mock('../../src/services/supabase', () => ({ supabase: { from: (table: string) => {
  db.filters.push(['from', table]);
  const chain = { select: () => chain, eq: (...args: unknown[]) => { db.filters.push(args); return chain; }, ilike: (...args: unknown[]) => { db.filters.push(args); return Promise.resolve({ data: db.rows, error: db.error }); } };
  return chain;
} } }));
import { getVerifiedLessonCp } from '../../src/services/modulAjarReferenceService';
beforeEach(() => { db.rows = []; db.error = null; db.filters = []; });
describe('verified CP lookup', () => {
  it('requires verified rows and combines all source-attributed elements', async () => {
    db.rows = [{ deskripsi_cp: 'CP membaca', elemen: 'Membaca', sumber_regulasi: 'Sumber sekolah' }, { deskripsi_cp: 'CP menulis', elemen: 'Menulis', sumber_regulasi: 'Sumber sekolah' }, { deskripsi_cp: 'Tanpa sumber', elemen: '', sumber_regulasi: '' }];
    const result = await getVerifiedLessonCp('Bahasa Indonesia', 'B');
    expect(result.cp).toContain('CP membaca'); expect(result.cp).toContain('CP menulis'); expect(result.cp).not.toContain('Tanpa sumber');
    expect(result.sources).toEqual(['Sumber sekolah']);
    expect(db.filters).toContainEqual(['is_verified', true]); expect(db.filters).toContainEqual(['fase', 'B']);
  });
  it('escapes wildcard characters instead of matching other subjects', async () => {
    db.rows = [{ deskripsi_cp: 'CP', elemen: '', sumber_regulasi: 'Sumber' }];
    await getVerifiedLessonCp('IPAS%', 'B');
    expect(db.filters).toContainEqual(['mata_pelajaran', 'IPAS\\%']);
  });
  it('fails clearly when no source exists', async () => { await expect(getVerifiedLessonCp('IPAS', 'B')).rejects.toThrow('Isi CP'); });
  it('fails clearly on database errors', async () => { db.error = { message: 'denied' }; await expect(getVerifiedLessonCp('IPAS', 'B')).rejects.toThrow('tidak dapat dibaca'); });
});
