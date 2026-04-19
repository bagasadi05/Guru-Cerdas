import React, { useEffect, useMemo, useRef, useState } from 'react';
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

    const unreadTeacherMessages = useMemo(() => (
        communications.filter((message) => message.sender === 'teacher' && !message.is_read).length
    ), [communications]);
    const latestMessage = communications[communications.length - 1];
    const quickPrompts = [
        'Mohon info perkembangan belajar anak saya minggu ini.',
        'Apakah ada tugas yang perlu kami dampingi di rumah?',
        'Terima kasih, informasinya sudah kami terima.',
    ];

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
            <div className="flex h-[68vh] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_30%),linear-gradient(135deg,#eef2ff_0%,#ffffff_60%,#f8fafc_100%)] p-4 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.16),transparent_32%),linear-gradient(135deg,#111827_0%,#0f172a_100%)] sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={teacher?.avatar_url}
                                className="h-12 w-12 rounded-2xl border border-white/70 object-cover shadow-sm dark:border-white/10"
                                alt="Guru"
                            />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Komunikasi Wali Kelas</p>
                                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{teacher?.full_name || 'Wali Kelas'}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Percakapan terkait perkembangan {student.name}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex">
                            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm dark:bg-white/10">
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{communications.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-300">Total pesan</p>
                            </div>
                            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm dark:bg-white/10">
                                <p className="text-lg font-bold text-rose-600 dark:text-rose-200">{unreadTeacherMessages}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-300">Belum dibaca</p>
                            </div>
                        </div>
                    </div>
                    {latestMessage && (
                        <div className="mt-4 rounded-2xl border border-white/70 bg-white/75 p-3 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                            Pesan terakhir: <span className="font-semibold text-slate-900 dark:text-white">{latestMessage.sender === 'teacher' ? 'Guru' : 'Wali'}</span> - {latestMessage.message}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                    {quickPrompts.map((prompt) => (
                        <button
                            key={prompt}
                            type="button"
                            onClick={() => setNewMessage(prompt)}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                    {communications.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                <SendIcon className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada pesan.</p>
                            <p className="mt-1 max-w-sm text-sm">Gunakan contoh pesan di atas untuk memulai percakapan dengan wali kelas.</p>
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
                <form onSubmit={(event) => { event.preventDefault(); if (newMessage.trim()) sendMessage(newMessage); }} className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
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
