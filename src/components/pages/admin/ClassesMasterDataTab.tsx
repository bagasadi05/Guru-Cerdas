import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { ClassRecord } from './types';

import { Plus, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

interface ClassesMasterDataTabProps {
    onLogAction?: (tableName: string, action: string, recordId: string, oldData: any, newData: any) => Promise<void>;
}

export const ClassesMasterDataTab: React.FC<ClassesMasterDataTabProps> = ({ onLogAction }) => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    
    const [classes, setClasses] = useState<ClassRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState<{id?: string, name: string}>({ name: '' });

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .is('deleted_at', null)
                .eq('is_archived', false)
                .order('name');
                
            if (error) throw error;
            setClasses(data || []);
        } catch (error: any) {
            toast.error(`Gagal memuat data kelas: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenModal = (classRecord?: ClassRecord) => {
        if (classRecord) {
            setFormData({ id: classRecord.id, name: classRecord.name });
        } else {
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.warning('Nama kelas tidak boleh kosong');
            return;
        }

        setIsSubmitting(true);
        try {
            if (formData.id) {
                // Edit
                const oldRecord = classes.find(c => c.id === formData.id);
                const { data, error } = await supabase
                    .from('classes')
                    .update({ name: formData.name.trim() })
                    .eq('id', formData.id)
                    .select()
                    .single();
                
                if (error) throw error;
                
                if (onLogAction && user) {
                    await onLogAction('classes', 'UPDATE', formData.id, oldRecord, data);
                }
                toast.success('Kelas berhasil diperbarui');
            } else {
                // Create
                const { data, error } = await supabase
                    .from('classes')
                    .insert({ 
                        name: formData.name.trim(),
                        user_id: user?.id || ''
                    })
                    .select()
                    .single();
                    
                if (error) throw error;
                
                if (onLogAction && user) {
                    await onLogAction('classes', 'INSERT', data.id, null, data);
                }
                toast.success('Kelas baru berhasil ditambahkan');
            }
            
            handleCloseModal();
            fetchClasses();
            queryClient.invalidateQueries({ queryKey: ['classes'] });
        } catch (error: any) {
            toast.error(`Gagal menyimpan kelas: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (classRecord: ClassRecord) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus kelas ${classRecord.name}?\nAksi ini akan menyembunyikan kelas (Soft Delete).`)) return;
        
        try {
            const { error } = await supabase
                .from('classes')
                .update({ 
                    is_archived: true,
                    deleted_at: new Date().toISOString()
                })
                .eq('id', classRecord.id);
                
            if (error) throw error;
            
            if (onLogAction && user) {
                await onLogAction('classes', 'DELETE', classRecord.id, classRecord, null);
            }
            toast.success('Kelas berhasil dihapus');
            fetchClasses();
            queryClient.invalidateQueries({ queryKey: ['classes'] });
        } catch (error: any) {
            toast.error(`Gagal menghapus kelas: ${error.message}`);
        }
    };

    const filteredClasses = classes.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Manajemen Kelas</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Total {classes.length} kelas aktif
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Cari kelas..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                        />
                    </div>
                    
                    <Button 
                        onClick={() => handleOpenModal()} 
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex-shrink-0"
                    >
                        <Plus size={16} className="mr-2" />
                        Tambah Kelas
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                    <p className="text-gray-500">Memuat data kelas...</p>
                </div>
            ) : filteredClasses.length === 0 ? (
                <div className="py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'Tidak ada kelas yang sesuai dengan pencarian.' : 'Belum ada data kelas.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900/80 dark:text-gray-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Nama Kelas</th>
                                <th className="px-6 py-4 font-semibold w-32 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredClasses.map((cls) => (
                                <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {cls.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        <button type="button"
                                            onClick={() => handleOpenModal(cls)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button type="button"
                                            onClick={() => handleDelete(cls)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Tambah/Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={formData.id ? 'Edit Kelas' : 'Tambah Kelas Baru'}
                maxWidth="sm"
            >
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Nama Kelas <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Contoh: X IPA 1"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseModal}
                            disabled={isSubmitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
