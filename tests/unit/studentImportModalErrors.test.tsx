import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportModal } from '../../src/components/ui/ImportModal';

vi.mock('../../src/services/ImportService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/services/ImportService')>(),
  parseFile: vi.fn().mockResolvedValue({
    headers: ['Nama', 'Jenis Kelamin', 'Kelas'],
    rows: [['Siswa Impor', 'L', 'Kelas typo']],
  }),
}));

describe('student import feedback', () => {
  it('shows a rejected import in the preview and allows another attempt', async () => {
    const onImport = vi.fn()
      .mockRejectedValueOnce(new Error('Baris 2: kelas "Kelas typo" tidak ditemukan.'))
      .mockResolvedValueOnce(undefined);
    const { container } = render(<ImportModal isOpen onClose={vi.fn()} onImport={onImport} />);
    const input = container.ownerDocument.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [new File(['test'], 'siswa.xlsx')] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Lanjut ke Pratinjau' }));
    fireEvent.click(screen.getByRole('button', { name: 'Impor 1 Siswa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kelas typo');
    fireEvent.click(screen.getByRole('button', { name: 'Impor 1 Siswa' }));
    expect(await screen.findByText('Impor Berhasil!')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onImport).toHaveBeenCalledTimes(2);
  });
});
