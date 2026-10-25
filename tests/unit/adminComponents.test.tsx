import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    AdminHeader,
    AdminLoadingScreen,
    AdminDeleteUserModal,
    AdminUndoToast,
    AdminErrorToast,
} from '../../src/components/pages/admin/subcomponents';
import type { UserRoleRecord } from '../../src/components/pages/admin/types';

describe('Admin Subcomponents Decomposition', () => {
    it('renders AdminLoadingScreen properly', () => {
        render(<AdminLoadingScreen />);
        expect(screen.getByText('Memuat Dasbor Admin...')).toBeInTheDocument();
    });

    it('renders AdminHeader and triggers tab change and refresh', () => {
        const onTabChange = vi.fn();
        const onRefresh = vi.fn();

        render(
            <AdminHeader
                currentTime={new Date('2026-10-25T10:00:00')}
                activeTab="overview"
                onTabChange={onTabChange}
                onRefresh={onRefresh}
                statsLoading={false}
            />
        );

        expect(screen.getByText('Dasbor Admin')).toBeInTheDocument();
        expect(screen.getByText('Ringkasan')).toBeInTheDocument();
        expect(screen.getByText('Pengguna & Guru')).toBeInTheDocument();

        // Switch to Users tab
        fireEvent.click(screen.getByText('Pengguna & Guru'));
        expect(onTabChange).toHaveBeenCalledWith('users');

        // Click Refresh
        fireEvent.click(screen.getByRole('button', { name: /muat ulang data admin/i }));
        expect(onRefresh).toHaveBeenCalled();
    });

    it('renders AdminDeleteUserModal and triggers cancel and confirm', () => {
        const onClose = vi.fn();
        const onConfirm = vi.fn();
        const mockUser: UserRoleRecord = {
            user_id: 'u-1',
            email: 'guru@sekolah.sch.id',
            full_name: 'Budi Santoso',
            role: 'teacher',
        };

        const { rerender } = render(
            <AdminDeleteUserModal
                isOpen={false}
                user={mockUser}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );
        expect(screen.queryByText('Hapus Pengguna?')).not.toBeInTheDocument();

        rerender(
            <AdminDeleteUserModal
                isOpen={true}
                user={mockUser}
                onClose={onClose}
                onConfirm={onConfirm}
            />
        );
        expect(screen.getByText('Hapus Pengguna?')).toBeInTheDocument();
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('guru@sekolah.sch.id')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Batal'));
        expect(onClose).toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /hapus pengguna/i }));
        expect(onConfirm).toHaveBeenCalled();
    });

    it('renders AdminUndoToast and triggers undo and dismiss', () => {
        const onUndo = vi.fn();
        const onDismiss = vi.fn();
        const mockUser: UserRoleRecord = {
            user_id: 'u-2',
            email: 'siswa@sekolah.sch.id',
            full_name: 'Siswa Contoh',
            role: 'student',
        };

        render(
            <AdminUndoToast
                isOpen={true}
                user={mockUser}
                onUndo={onUndo}
                onDismiss={onDismiss}
            />
        );

        expect(screen.getByText('Pengguna dipindahkan ke Tempat Sampah')).toBeInTheDocument();
        expect(screen.getByText('siswa@sekolah.sch.id')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /batalkan/i }));
        expect(onUndo).toHaveBeenCalledWith(mockUser);

        fireEvent.click(screen.getByRole('button', { name: /tutup notifikasi/i }));
        expect(onDismiss).toHaveBeenCalled();
    });

    it('renders AdminErrorToast and handles dismiss', () => {
        const onDismiss = vi.fn();

        const { rerender } = render(
            <AdminErrorToast error={null} onDismiss={onDismiss} />
        );
        expect(screen.queryByText('Koneksi terputus')).not.toBeInTheDocument();

        rerender(
            <AdminErrorToast error="Koneksi terputus" onDismiss={onDismiss} />
        );
        expect(screen.getByText('Koneksi terputus')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /tutup pesan error/i }));
        expect(onDismiss).toHaveBeenCalled();
    });
});
