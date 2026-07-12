import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JournalForm } from '../../src/components/pages/journal/JournalForm';
import { AuthContext } from '../../src/hooks/useAuth';

// Mock the teaching journal hooks
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('../../src/hooks/useTeachingJournals', () => ({
  useCreateJournal: vi.fn((onSuccess) => ({
    mutate: (payload: any) => {
      mockCreateMutate(payload);
      if (onSuccess) onSuccess();
    },
    isPending: false,
  })),
  useUpdateJournal: vi.fn((onSuccess) => ({
    mutate: (payload: any) => {
      mockUpdateMutate(payload);
      if (onSuccess) onSuccess();
    },
    isPending: false,
  })),
}));

// Mock toast hook
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => mockToast,
}));

// Mock journalService
vi.mock('../../src/services/journalService', () => ({
  default: {
    uploadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
  },
}));

const mockClasses = [
  { id: '8be128d5-11ea-42f8-98e3-059954ccab5a', name: 'Class 10-A' },
  { id: '2c063cf4-8b6b-4e8c-8c7e-96a8e8dd05d5', name: 'Class 10-B' },
];

const renderJournalForm = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    classes: mockClasses,
    ...props,
  };

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: { id: 'teacher-123', name: 'Test Teacher' } as any,
          session: {} as any,
          userRole: null,
          isAdmin: false,
          logout: async () => {},
          loading: false,
          login: vi.fn(),
          signup: vi.fn(),
          updateUser: vi.fn(),
          enableScheduleNotifications: vi.fn(),
          disableScheduleNotifications: vi.fn(),
          isNotificationsEnabled: false,
        }}
      >
        <JournalForm {...defaultProps} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return {
    ...utils,
    getTopicInput: () => document.body.querySelector('input[name="topic"]') as HTMLInputElement,
    getDateInput: () => document.body.querySelector('input[name="date"]') as HTMLInputElement,
  };
};

describe('JournalForm Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setConfig({ testTimeout: 15000 });
    // Clean up document body between tests
    document.body.innerHTML = '';
  });

  it('submits successfully when all required fields are valid', async () => {
    const { getTopicInput } = renderJournalForm();

    // Fill Class select via CustomDropdown
    fireEvent.click(screen.getByRole('button', { name: /-- pilih kelas --/i }));
    fireEvent.click(screen.getByText('Class 10-A'));

    // Fill Subject via CustomDropdown
    fireEvent.click(screen.getByRole('button', { name: /-- pilih mapel --/i }));
    const subjectOpt = screen.getAllByText('Matematika').find(el => el.tagName === 'SPAN') || screen.getAllByText('Matematika')[0];
    fireEvent.click(subjectOpt);

    // Fill Topic
    fireEvent.change(getTopicInput(), {
      target: { value: 'Sel Hewan dan Tumbuhan' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /simpan jurnal/i }));

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          class_id: '8be128d5-11ea-42f8-98e3-059954ccab5a',
          subject: 'Matematika',
          topic: 'Sel Hewan dan Tumbuhan',
        })
      );
    });
  });

  it('shows validation errors when required fields are empty', async () => {
    renderJournalForm();

    // Default values are already empty, so we just submit
    fireEvent.click(screen.getByRole('button', { name: /simpan jurnal/i }));

    await waitFor(() => {
      expect(screen.getByText('Pilih kelas yang valid')).toBeInTheDocument();
      expect(screen.getByText('Mata pelajaran wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Topik wajib diisi')).toBeInTheDocument();
    });

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('shows error if topic exceeds 200 characters', async () => {
    const { getTopicInput } = renderJournalForm();

    // Fill Class select via CustomDropdown
    fireEvent.click(screen.getByRole('button', { name: /-- pilih kelas --/i }));
    fireEvent.click(screen.getByText('Class 10-A'));

    // Fill Subject via CustomDropdown
    fireEvent.click(screen.getByRole('button', { name: /-- pilih mapel --/i }));
    const subjectOpt = screen.getAllByText('Matematika').find(el => el.tagName === 'SPAN') || screen.getAllByText('Matematika')[0];
    fireEvent.click(subjectOpt);

    // Long topic (201 chars)
    const longTopic = 'a'.repeat(201);
    fireEvent.change(getTopicInput(), {
      target: { value: longTopic },
    });

    fireEvent.click(screen.getByRole('button', { name: /simpan jurnal/i }));

    await waitFor(() => {
      expect(screen.getByText('Topik maksimal 200 karakter')).toBeInTheDocument();
    });

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('shows error if date format is invalid', async () => {
    const { getTopicInput, getDateInput } = renderJournalForm();

    // Fill Class select via CustomDropdown
    fireEvent.click(screen.getByRole('button', { name: /-- pilih kelas --/i }));
    fireEvent.click(screen.getByText('Class 10-A'));

    // Fill Subject via CustomDropdown
    fireEvent.click(screen.getByRole('button', { name: /-- pilih mapel --/i }));
    const subjectOpt = screen.getAllByText('Matematika').find(el => el.tagName === 'SPAN') || screen.getAllByText('Matematika')[0];
    fireEvent.click(subjectOpt);

    fireEvent.change(getTopicInput(), {
      target: { value: 'Sel Tumbuhan' },
    });

    // Invalid date input
    fireEvent.change(getDateInput(), { target: { value: 'invalid-date' } });

    fireEvent.click(screen.getByRole('button', { name: /simpan jurnal/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Tanggal wajib diisi dengan format YYYY-MM-DD')
      ).toBeInTheDocument();
    });

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });
});
