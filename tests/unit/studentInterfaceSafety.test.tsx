import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ExportPreviewModal } from '../../src/components/advanced-features/ExportPreviewModal';
import { StudentGrid } from '../../src/components/students/StudentGrid';
import { StudentTable } from '../../src/components/students/StudentTable';
import type { StudentRow } from '../../src/components/students/types';

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const student: StudentRow = {
  id: 'student-a',
  class_id: 'class-a',
  name: 'Siswa Andi',
  gender: 'Laki-laki',
  user_id: 'teacher',
  created_at: '',
  deleted_at: null,
  access_code: 'ABC123',
  avatar_url: null,
  birth_date: null,
  nis: '000123',
  nisn: '0012345678',
  parent_name: null,
  parent_phone: null,
};
const viewProps = {
  students: [student],
  isSelected: () => false,
  toggleItem: vi.fn(),
  onAction: vi.fn(),
};

describe('student interface safety', () => {
  it('opens export as an accessible dialog and only offers supported formats', async () => {
    const close = vi.fn();
    render(
      <ExportPreviewModal
        isOpen
        onClose={close}
        data={[{ name: 'Siswa Andi' }]}
        columns={[{ key: 'name', label: 'Nama Lengkap' }]}
        onExport={vi.fn()}
        supportedFormats={['xlsx', 'csv']}
        title="Ekspor Data Siswa"
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Ekspor Data Siswa' });
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.queryByRole('button', { name: 'PDF (.pdf)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'JSON (.json)' })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });

  it('restores focus to the export trigger after closing', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Buka ekspor</button>
          <ExportPreviewModal
            isOpen={open}
            onClose={() => setOpen(false)}
            data={[{ name: 'Andi' }]}
            columns={[{ key: 'name', label: 'Nama' }]}
            onExport={vi.fn()}
          />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Buka ekspor' });
    trigger.focus();
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps failed exports open with an error and allows retry', async () => {
    const close = vi.fn();
    const exportData = vi.fn().mockRejectedValueOnce(new Error('Unduhan gagal.')).mockResolvedValueOnce(undefined);
    render(<ExportPreviewModal isOpen onClose={close} data={[{ name: 'Andi' }]}
      columns={[{ key: 'name', label: 'Nama' }]} onExport={exportData} supportedFormats={['xlsx', 'csv']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ekspor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unduhan gagal.');
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ekspor' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it('disables export when no columns are selected', () => {
    render(<ExportPreviewModal isOpen onClose={vi.fn()} data={[{ name: 'Andi' }]}
      columns={[{ key: 'name', label: 'Nama' }]} onExport={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nama' }));
    expect(screen.getByRole('button', { name: 'Ekspor' })).toBeDisabled();
    expect(screen.getByText('Belum ada kolom yang dipilih.')).toBeInTheDocument();
  });

  it('labels student selection in the card view', () => {
    render(
      <BrowserRouter>
        <StudentGrid {...viewProps} />
      </BrowserRouter>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih siswa Siswa Andi' }));
    expect(viewProps.toggleItem).toHaveBeenCalledWith('student-a');
  });

  it('provides sortable buttons, sorting state and student identifiers in the table', () => {
    const sort = vi.fn();
    render(
      <BrowserRouter>
        <StudentTable
          {...viewProps}
          toggleAll={vi.fn()}
          isAllSelected={false}
          sortConfig={{ key: 'name', direction: 'asc' }}
          onSort={sort}
        />
      </BrowserRouter>,
    );
    expect(screen.getByRole('columnheader', { name: 'Siswa' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan berdasarkan jenis kelamin' }));
    expect(sort).toHaveBeenCalledWith('gender');
    expect(screen.getAllByRole('checkbox', { name: 'Pilih siswa Siswa Andi' })).toHaveLength(2);
    expect(screen.getAllByText(/000123/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0012345678/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Salin kode akses Siswa Andi' })).not.toHaveClass(
      'opacity-0',
    );
  });
});
