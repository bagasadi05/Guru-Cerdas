import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiButton } from '../../src/components/pages/modul-ajar/components/AiButton';
describe('Modul Ajar field cache actions', () => {
  it('uses the default cache action and provides an explicit fresh action for filled fields', () => {
    const fill = vi.fn();
    render(<AiButton field="kompetensiAwal" onAiFillField={fill} fieldValues={{ kompetensiAwal: 'Siswa mengenal air.' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Isi kompetensi awal dengan AI' }));
    expect(fill).toHaveBeenLastCalledWith('kompetensiAwal');
    fireEvent.click(screen.getByRole('button', { name: 'Buat versi AI baru untuk kompetensi awal' }));
    expect(fill).toHaveBeenLastCalledWith('kompetensiAwal', true);
  });
  it('locks both actions during generation', () => {
    render(<AiButton field="kompetensiAwal" onAiFillField={vi.fn()} fieldValues={{ kompetensiAwal: 'Teks' }} fieldLoading={{ kompetensiAwal: true }} />);
    expect(screen.getAllByRole('button').every(button => (button as HTMLButtonElement).disabled)).toBe(true);
  });
  it('uses source retrieval copy and offers no fresh AI action for CP', () => {
    render(<AiButton field="capaianPembelajaran" onAiFillField={vi.fn()} fieldValues={{ capaianPembelajaran: 'CP' }} />);
    expect(screen.getByRole('button', { name: 'Ambil CP terverifikasi' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
