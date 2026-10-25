import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SimpleHelpCenter, { FloatingHelpButton } from '../../src/components/SimpleHelpCenter';

describe('SimpleHelpCenter and FloatingHelpButton', () => {
  it('renders FloatingHelpButton and responds to click', () => {
    const onClick = vi.fn();
    render(<FloatingHelpButton onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /buka pusat bantuan/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders SimpleHelpCenter modal when isOpen is true', () => {
    const onClose = vi.fn();
    render(<SimpleHelpCenter isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/Pusat Bantuan/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cari panduan/i)).toBeInTheDocument();
  });

  it('filters guides by search keyword and allows viewing a guide', () => {
    render(<SimpleHelpCenter isOpen={true} onClose={() => {}} />);
    const searchInput = screen.getByPlaceholderText(/cari panduan/i);
    fireEvent.change(searchInput, { target: { value: 'Absensi' } });

    // Find the guide card with Absensi
    const guideItem = screen.getByText(/Cara Isi Absensi/i);
    expect(guideItem).toBeInTheDocument();

    // Click on the guide to open detail view
    fireEvent.click(guideItem);
    expect(screen.getByText(/Langkah 1/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<SimpleHelpCenter isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
