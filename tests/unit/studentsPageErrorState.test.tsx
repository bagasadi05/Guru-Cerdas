import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudentsPage from '../../src/components/pages/StudentsPage';

const retryData = vi.hoisted(() => vi.fn());
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'teacher' }, userRole: 'guru', isAdmin: false }) }));
vi.mock('../../src/hooks/useToast', () => ({ useToast: () => ({ error: vi.fn() }) }));
vi.mock('../../src/components/students/useStudentsPageViewModel', () => ({
  useStudentsPageViewModel: () => ({ isLoading: false, isError: true, retryData, viewProps: {} }),
}));
vi.mock('../../src/components/students/StudentsPageView', () => ({ StudentsPageView: () => <div>Belum Ada Kelas</div> }));

describe('student page error state', () => {
  it('shows a retry action instead of an empty directory after a failed query', () => {
    render(<StudentsPage />);
    expect(screen.queryByText('Belum Ada Kelas')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal Memuat Data Siswa');
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(retryData).toHaveBeenCalledOnce();
  });
});
