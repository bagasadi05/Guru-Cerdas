import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modulAjarContentService } from '../modulAjarContentService';
import { supabase } from '../supabase';

vi.mock('../supabase', () => {
  let mockData: any[] = [];
  
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: mockData, error: null })
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(chain),
      __setMockData: (data: any[]) => {
        mockData = data;
      }
    }
  };
});

describe('modulAjarContentService.getBoilerplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) topik seed fase NULL ditemukan saat fase "A" dikirim', async () => {
    const seedData = [
      { id: '1', mata_pelajaran: 'matematika', topik: 'penjumlahan', fase: null, lkpd_tugas: 'Soal 1' }
    ];
    (supabase as any).__setMockData(seedData);

    const result = await modulAjarContentService.getBoilerplate('Matematika', 'Penjumlahan', 'A');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('1');
  });

  it('(b) baris fase spesifik menang atas baris NULL', async () => {
    const seedData = [
      { id: '1', mata_pelajaran: 'matematika', topik: 'penjumlahan', fase: null, lkpd_tugas: 'Umum' },
      { id: '2', mata_pelajaran: 'matematika', topik: 'penjumlahan', fase: 'A', lkpd_tugas: 'Spesifik A' }
    ];
    (supabase as any).__setMockData(seedData);

    const result = await modulAjarContentService.getBoilerplate('Matematika', 'Penjumlahan', 'A');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('2');
    expect(result?.lkpd_tugas).toBe('Spesifik A');
  });

  it('(c) tidak ada data -> return null', async () => {
    (supabase as any).__setMockData([]);

    const result = await modulAjarContentService.getBoilerplate('IPA', 'Topik Asing', 'A');
    expect(result).toBeNull();
  });
});
