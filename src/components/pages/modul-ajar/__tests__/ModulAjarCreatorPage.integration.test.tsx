import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

vi.mock('../../../../hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    }
  }))
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

    // Mock window.Image to prevent logo_sekolah.png fetch error in vitest
    const originalImage = window.Image;
    window.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src = '';
      constructor() {
        setTimeout(() => this.onload(), 0);
      }
    } as any;
    
    // Mock global.fetch to prevent the invalid URL network error for relative path
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/logo_sekolah.png') {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock'], { type: 'image/png' }))
        });
      }
      return originalFetch(url);
    });

    // Cleanup mocks after test
    vi.stubGlobal('Image', window.Image);

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ModulAjarCreatorPage />
        </QueryClientProvider>
      );
    });
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });
});
