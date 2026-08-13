import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModulAjarCreatorPage from '../ModulAjarCreatorPage';
import { useAuth } from '../../../../hooks/useAuth';
import { useTranslation } from '../../../../utils/i18n';

// Mock dependencies
vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../utils/i18n', () => ({
  useTranslation: vi.fn(),
}));

vi.mock('../../../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

vi.mock('../hooks/useModulAjarAiJob', () => ({
  useModulAjarAiJob: vi.fn(() => ({
    jobStatus: 'idle',
    startJob: vi.fn()
  }))
}));

vi.mock('../../../../services/modulAjarContentService', () => ({
  modulAjarContentService: {
    getBoilerplate: vi.fn(() => Promise.resolve(null)),
    getSintaksKegiatan: vi.fn(() => Promise.resolve([]))
  }
}));

// Mock ModulAjarPreview to avoid deep render issues during basic integration test
vi.mock('../components/ModulAjarPreview', () => ({
  ModulAjarPreview: () => <div data-testid="mock-preview">Preview Content</div>
}));

describe('ModulAjarCreatorPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user-id', name: 'Test User' },
    });
    (useTranslation as any).mockReturnValue({
      t: {
        lessonPlan: {
          title: 'Pembuat Modul Ajar',
          subtitle: 'Buat modul ajar lengkap. {br}',
          preview: 'Preview',
          history: 'History',
          performaGuru: 'Performa Guru',
          lembarSiswa: 'Lembar Siswa',
          saveSuccess: 'Tersimpan',
          saveFailed: 'Gagal',
        }
      }
    });
  });

  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ModulAjarCreatorPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });
});
