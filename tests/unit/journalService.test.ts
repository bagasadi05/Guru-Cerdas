import { describe, it, expect, vi, beforeEach } from 'vitest';
import journalService from '../../src/services/journalService';
import { supabase } from '../../src/services/supabase';
import type { TeachingJournalInsert } from '../../src/types/teachingJournal';

vi.mock('../../src/services/supabase', () => {
  const mockJournalObj = {
    id: 'journal-123',
    user_id: 'teacher-456',
    class_id: 'class-abc',
    subject: 'Matematika',
    date: '2026-06-21',
    meeting_number: 1,
    topic: 'Aljabar',
    objectives: 'Siswa memahami aljabar dasar',
    activities: 'Latihan soal aljabar',
    notes: 'Semua siswa hadir',
    attachment_url: 'https://supabase.test/student_assets/teaching_journals/teacher-456-12345.pdf',
    created_at: '2026-06-21T00:00:00Z',
    updated_at: '2026-06-21T00:00:00Z'
  };

  const mockClassesObj = [
    { id: 'class-abc', name: 'Kelas 4A' }
  ];

  const mockFromChainObj = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: mockJournalObj, error: null })),
    then: vi.fn().mockImplementation((resolve) => resolve({ data: [mockJournalObj], error: null }))
  };

  return {
    wasLastResponseQueued: vi.fn().mockReturnValue(false),
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'teacher-456', email: 'teacher@example.com' } },
          error: null
        })
      },
      from: vi.fn((table) => {
        if (table === 'classes') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockClassesObj, error: null })
          };
        }
        return mockFromChainObj;
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.test/student_assets/teaching_journals/teacher-456-12345.pdf' } }),
          remove: vi.fn().mockResolvedValue({ error: null })
        }))
      },
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null })
      }
    }
  };
});

describe('Teaching Journal Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getByPeriod filters and returns list of journals', async () => {
    const data = await journalService.getByPeriod({
      classId: 'class-abc',
      subject: 'Matematika',
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });
    
    expect(data).toBeDefined();
    expect(data.length).toBe(1);
    expect(data[0].id).toBe('journal-123');
    expect(supabase.from).toHaveBeenCalledWith('teaching_journals');
  });

  it('create injects user_id from auth session', async () => {
    const payload: Omit<TeachingJournalInsert, 'user_id'> = {
      class_id: 'class-abc',
      subject: 'Matematika',
      date: '2026-06-21',
      meeting_number: 1,
      topic: 'Aljabar'
    };

    const data = await journalService.create(payload);
    expect(data.user_id).toBe('teacher-456');
    expect(data.subject).toBe('Matematika');
  });

  it('remove deletes storage attachment if exists and then deletes database record', async () => {
    await journalService.remove('journal-123');
    expect(supabase.from).toHaveBeenCalledWith('teaching_journals');
  });

  it('getRekap client-side aggregation works and fetches class names', async () => {
    const rekap = await journalService.getRekap({
      classId: 'class-abc'
    });

    expect(rekap).toBeDefined();
    expect(rekap.length).toBe(1);
    expect(rekap[0].className).toBe('Kelas 4A');
    expect(rekap[0].journalsFilled).toBe(1);
    expect(rekap[0].subject).toBe('Matematika');
  });
});
