import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useToast } from '../../../hooks/useToast';
import { CheckCircleIcon, PencilIcon, SendIcon, TrashIcon, UsersIcon } from '../../Icons';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import type { CommunicationModalState, PortalCommunication, PortalStudentInfo, TeacherInfo } from './types';

interface PortalCommunicationPanelProps {
    communications: PortalCommunication[];
    student: PortalStudentInfo;
    teacher: TeacherInfo;
}

export const PortalCommunicationPanel: React.FC<PortalCommunicationPanelProps> = ({ communications, student, teacher }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState('');
    const [modalState, setModalState] = useState<CommunicationModalState>({ type: 'closed', data: null });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { mutate: sendMessage, isPending: isSending } = useMutation({
        mutationFn: async (messageText: string) => {
            if (!student.access_code || !teacher) throw new Error('Informasi tidak lengkap untuk mengirim pesan.');
            const { data, error } = await supabase.rpc('send_parent_message', {
                student_id_param: student.id,
                access_code_param: student.access_code,
                message_param: messageText,
                teacher_user_id_param: teacher.user_id,
            });
            if (error) throw error;
            if (typeof data === 'boolean' && data === false) throw new Error('Pesan gagal dikirim.');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', student.id] });
            setNewMessage('');
        },
        onError: (error: Error) => toast.error(`Gagal mengirim pesan: ${error.message}`),
    });

    const { mutate: updateMessage, isPending: isUpdating } = useMutation({
        mutationFn: async ({ messageId, newMessageText }: { messageId: string; newMessageText: string }) => {
            if (!student.access_code) throw new Error('Kode akses tidak valid.');
            const { data, error } = await supabase.rpc('update_parent_message', {
                student_id_param: student.id,
                access_code_param: student.access_code,
                message_id_param: messageId,
                new_message_param: newMessageText,
            });
            if (error) throw error;
            if (typeof data === 'boolean' && data === false) throw new Error('Pesan gagal diperbarui.');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', student.id] });
            toast.success('Pesan berhasil diperbarui.');
            setModalState({ type: 'closed', data: null });
        },
        onError: (error: Error) => toast.error(`Gagal memperbarui pesan: ${error.message}`),
    });

    const { mutate: deleteMessage, isPending: isDeleting } = useMutation({
        mutationFn: async (messageId: string) => {
            if (!student.access_code) throw new Error('Kode akses tidak valid.');
            const { data, error } = await supabase.rpc('delete_parent_message', {
                student_id_param: student.id,
                access_code_param: student.access_code,
                message_id_param: messageId,
            });
            if (error) throw error;
            if (typeof data === 'boolean' && data === false) throw new Error('Pesan gagal dihapus.');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portalData', student.id] });
            toast.success('Pesan berhasil dihapus.');
            setModalState({ type: 'closed', data: null });
        },
        onError: (error: Error) => toast.error(`Gagal menghapus pesan: ${error.message}`),
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [communications]);

    return (
        <>
            <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {communications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <SendIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>Belum ada pesan. Mulai percakapan dengan wali kelas.</p>
                        </div>
                    ) : communications.map((msg) => (
                        <div key={msg.id} className={`group flex items-start gap-3 ${msg.sender === 'parent' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'teacher' && <img src={teacher?.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" alt="Guru" />}
                            <div className={`relative max-w-md p-4 rounded-2xl text-sm shadow-sm ${msg.sender === 'parent' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'}`}>
                                {msg.attachment_url && (
                                    <div className="mb-3">
                                        {msg.attachment_type === 'image' ? (
                                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block">
                                                <img
                                                    src={msg.attachment_url}
                                                    alt="Attachment"
                                                    className="max-w-full rounded-lg max-h-48 object-cover hover:opacity-90 transition-opacity"
                                                />
                                            </a>
                                        ) : (
                                            <a
                                                href={msg.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-2 p-3 rounded-lg ${msg.sender === 'parent' ? 'bg-indigo-700/50 hover:bg-indigo-700/70' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'} transition-colors`}
                                            >
                                                <svg className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                                <span className="text-xs font-medium truncate">{msg.attachment_name || 'Dokumen'}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                <div className={`flex items-center gap-1 text-[10px] mt-2 opacity-80 ${msg.sender === 'parent' ? 'text-indigo-100 justify-end' : 'text-slate-400 justify-end'}`}>
                                    <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.sender === 'parent' && msg.is_read && <CheckCircleIcon className="w-3 h-3" />}
                                </div>
                                {msg.sender === 'parent' && (
                                    <div className="absolute top-0 -left-20 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-slate-600 dark:text-slate-300" onClick={() => setModalState({ type: 'edit', data: msg })}><PencilIcon className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-red-500" onClick={() => setModalState({ type: 'delete', data: msg })}><TrashIcon className="w-4 h-4" /></Button>
                                    </div>
                                )}
                            </div>
                            {msg.sender === 'parent' && <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 border border-indigo-200 dark:border-indigo-800"><UsersIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={(event) => { event.preventDefault(); if (newMessage.trim()) sendMessage(newMessage); }} className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                    <Input
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        placeholder="Ketik pesan untuk wali kelas..."
                        className="flex-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"><SendIcon className="w-5 h-5" /></Button>
                </form>
            </div>

            {modalState.type === 'edit' && modalState.data && (
                <Modal title="Edit Pesan" isOpen={true} onClose={() => setModalState({ type: 'closed', data: null })}>
                    <form onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const message = formData.get('message') as string;
                        updateMessage({ messageId: modalState.data!.id, newMessageText: message });
                    }}>
                        <textarea name="message" defaultValue={modalState.data.message} rows={5} className="w-full mt-1 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"></textarea>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed', data: null })}>Batal</Button>
                            <Button type="submit" disabled={isUpdating} className="bg-indigo-600 text-white hover:bg-indigo-700">{isUpdating ? 'Menyimpan...' : 'Simpan'}</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {modalState.type === 'delete' && modalState.data && (
                <Modal title="Hapus Pesan" isOpen={true} onClose={() => setModalState({ type: 'closed', data: null })}>
                    <p className="text-slate-600 dark:text-slate-300">Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed', data: null })}>Batal</Button>
                        <Button variant="destructive" onClick={() => deleteMessage(modalState.data!.id)} disabled={isDeleting}>{isDeleting ? 'Menghapus...' : 'Hapus'}</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};
