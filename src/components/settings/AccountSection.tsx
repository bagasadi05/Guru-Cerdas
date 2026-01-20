import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ShieldIcon } from '../Icons';
import { SettingsCard } from './SettingsCard';

interface AccountSectionProps {
    onLogout: () => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({ onLogout }) => {
    const { updateUser } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isOnline = useOfflineStatus();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Password tidak cocok.");
            return;
        }
        if (password.length < 6) {
            toast.error("Password minimal harus 6 karakter.");
            return;
        }
        const { error } = await updateUser({ password });
        if (error) {
            toast.error(`Gagal mengubah password: ${error.message}`);
        } else {
            toast.success("Password berhasil diubah!");
            setPassword('');
            setConfirmPassword('');
        }
    };

    const handleDeleteAccount = async () => {
        const { error } = await supabase.rpc('delete_user_account', {});
        if (error) {
            toast.error(`Gagal menghapus akun: ${error.message}`);
        } else {
            toast.success("Akun berhasil dihapus. Anda akan logout.");
            await queryClient.clear();
            onLogout();
        }
        setDeleteModalOpen(false);
    };

    return (
        <>
            <div className="space-y-8">
                <SettingsCard className="overflow-hidden relative">
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500/70 via-purple-500/60 to-indigo-500/70 dark:from-indigo-400/60 dark:via-purple-400/50 dark:to-indigo-400/60" />
                    <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Keamanan Akun</CardTitle>
                        <CardDescription className="text-base">Perbarui kata sandi dan amankan akun Anda.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password Baru</label>
                                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200 dark:border-slate-700" placeholder="Minimal 6 karakter" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Konfirmasi Password Baru</label>
                                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200 dark:border-slate-700" placeholder="Ulangi password baru" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={!isOnline} className="px-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">
                                    Perbarui Password
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </SettingsCard>

                <SettingsCard className="overflow-hidden relative">
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500/70 via-rose-500/60 to-red-500/70 dark:from-red-400/60 dark:via-rose-400/50 dark:to-red-400/60" />
                    <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                        <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                            <ShieldIcon className="w-6 h-6" />
                            Zona Berbahaya
                        </CardTitle>
                        <CardDescription className="text-red-600/70 dark:text-red-400/70 text-base">Tindakan di area ini berisiko tinggi dan tidak dapat dibatalkan.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="flex items-center justify-between p-6 bg-white/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                            <div>
                                <p className="font-bold text-lg text-red-700 dark:text-red-300">Hapus Akun Permanen</p>
                                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Menghapus seluruh data siswa, nilai, dan laporan Anda dari sistem.</p>
                            </div>
                            <Button variant="destructive" onClick={() => setDeleteModalOpen(true)} disabled={!isOnline} className="px-8 rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20">
                                Hapus Akun Saya
                            </Button>
                        </div>
                    </CardContent>
                </SettingsCard>
            </div>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Konfirmasi Penghapusan Akun">
                <div className="space-y-4">
                    <p>Ini adalah tindakan permanen. Semua data siswa, laporan, dan jadwal Anda akan hilang. Untuk melanjutkan, ketik <strong className="text-red-500">HAPUS</strong> di bawah ini.</p>
                    <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="HAPUS" />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} className="px-6">Batal</Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'HAPUS' || !isOnline}>
                            Saya Mengerti, Hapus Akun Saya
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default AccountSection;
