import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStudentDirectory } from '../../src/services/violations.data';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('getStudentDirectory (F17-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('memanggil RPC get_student_directory dan mengembalikan data', async () => {
    const rows = [
      { id: 's1', name: 'Andi', class_name: 'Kelas 4A' },
      { id: 's2', name: 'Budi', class_name: 'Kelas 4B' },
    ];
    (supabase.rpc as any).mockResolvedValue({ data: rows, error: null });

    const result = await getStudentDirectory();

    expect(supabase.rpc).toHaveBeenCalledWith('get_student_directory');
    expect(result).toEqual(rows);
  });

  it('mengembalikan array kosong jika data null', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
    const result = await getStudentDirectory();
    expect(result).toEqual([]);
  });

  it('melempar error jika RPC gagal', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error('rls denied') });
    await expect(getStudentDirectory()).rejects.toThrow('rls denied');
  });
});