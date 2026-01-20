import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ImageUploader } from '../ui/ImageUploader';
import { supabase } from '../../services/supabase';
import { SettingsCard } from './SettingsCard';

const getStoragePath = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.includes('pravatar.cc')) return null;
    try {
        const parts = url.split('/teacher_assets/');
        if (parts.length < 2) return null;
        return parts[1];
    } catch (e) {
        console.error('Error parsing storage URL', e);
        return null;
    }
};

const ProfileSection: React.FC = () => {
    const { user, updateUser } = useAuth();
    const toast = useToast();
    const isOnline = useOfflineStatus();
    const [name, setName] = useState(user?.name || '');
    const [schoolName, setSchoolName] = useState(user?.school_name || '');

    useEffect(() => {
        setName(user?.name || '');
        setSchoolName(user?.school_name || '');
    }, [user]);

    const handleAvatarUpload = async (file: File) => {
        if (!user) return;

        const filePath = `${user.id}/avatar-${new Date().getTime()}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('teacher_assets')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
            .from('teacher_assets')
            .getPublicUrl(filePath);

        if (publicUrlData.publicUrl) {
            const oldAvatarUrl = user.avatarUrl;

            const { error: updateUserError } = await updateUser({ avatar_url: publicUrlData.publicUrl });
            if (updateUserError) {
                // Determine if we should delete the new file since update failed? 
                // For now, focus on the user request: "potensi file orphan" refers to old files. 
                // But cleaning up the new file if update fails is also good hygiene.
                const newPath = getStoragePath(publicUrlData.publicUrl);
                if (newPath) await supabase.storage.from('teacher_assets').remove([newPath]);
                throw updateUserError;
            }

            // Delete old file if exists
            if (oldAvatarUrl) {
                const oldPath = getStoragePath(oldAvatarUrl);
                if (oldPath) {
                    await supabase.storage.from('teacher_assets').remove([oldPath]);
                }
            }

            toast.success("Foto profil berhasil diperbarui!");
        } else {
            throw new Error("Tidak bisa mendapatkan URL publik untuk foto.");
        }
    };

    const handleAvatarDelete = async () => {
        if (!user) return;

        const oldAvatarUrl = user.avatarUrl;

        // Reset to default avatar
        const { error } = await updateUser({ avatar_url: '' });
        if (error) {
            throw error;
        }

        // Delete file from storage
        if (oldAvatarUrl) {
            const oldPath = getStoragePath(oldAvatarUrl);
            if (oldPath) {
                const { error: storageError } = await supabase.storage.from('teacher_assets').remove([oldPath]);
                if (storageError) {
                    console.error('Failed to remove file from storage:', storageError);
                    // Just log, don't throw, since user profile is already updated logic-wise
                }
            }
        }

        toast.success("Foto profil berhasil dihapus!");
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await updateUser({ name, school_name: schoolName });
        if (error) {
            toast.error(`Gagal memperbarui profil: ${error.message}`);
        } else {
            toast.success("Profil berhasil diperbarui!");
        }
    };

    return (
        <SettingsCard className="overflow-hidden">
            <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">Profil Pengguna</CardTitle>
                <CardDescription className="text-base">Perbarui informasi profil dan foto identitas Anda.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <form onSubmit={handleProfileSubmit} className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-green-500 to-emerald-500 rounded-full opacity-70 blur group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative">
                                <ImageUploader
                                    currentImageUrl={user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id}`}
                                    onUpload={handleAvatarUpload}
                                    onDelete={handleAvatarDelete}
                                    disabled={!isOnline}
                                    size="lg"
                                    showDeleteButton={!!user?.avatarUrl && !user?.avatarUrl.includes('pravatar.cc')}
                                    config={{
                                        maxFileSize: 5,
                                        maxWidth: 300,
                                        maxHeight: 300,
                                        quality: 0.85,
                                        aspectRatio: 1,
                                        circularCrop: true
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {user?.email}
                            </p>
                            <div className="pt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800">
                                    Guru / Pengajar
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                placeholder="Masukkan nama lengkap Anda"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="schoolName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Sekolah</label>
                            <Input
                                id="schoolName"
                                type="text"
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                placeholder="Masukkan nama sekolah"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button type="submit" disabled={!isOnline} className="px-8 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02]">
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </CardContent>
        </SettingsCard>
    );
};

export default ProfileSection;

