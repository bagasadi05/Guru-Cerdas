import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useToast } from '../../../hooks/useToast';
import { PencilIcon, SendIcon, TrashIcon, UsersIcon } from '../../Icons';
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
    const _latestMessage = communications[communications.length - 1];
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
            <div className="flex h-[68vh] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all duration-300">
                {/* A. Chat Header */}
                <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_30%),linear-gradient(135deg,#f5f7ff_0%,#ffffff_60%,#f8fafc_100%)] p-4 dark:border-slate-850 dark:bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.1),transparent_32%),linear-gradient(135deg,#1e293b_0%,#0f172a_100%)] sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={teacher?.avatar_url}
                                className="h-12 w-12 rounded-[18px] border border-white/80 object-cover shadow-sm dark:border-white/10 bg-slate-100"
                                alt="Guru"
                            />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-300">Wali Kelas Anda</p>
                                <h3 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">{teacher?.full_name || 'Wali Kelas'}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-450">Konsultasi perkembangan belajar {student.name}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex">
                            <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 text-center shadow-sm dark:border-white/5 dark:bg-white/5">
                                <p className="text-base font-black text-slate-900 dark:text-white">{communications.length}</p>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Pesan</p>
                            </div>
                            <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 text-center shadow-sm dark:border-white/5 dark:bg-white/5">
                                <p className="text-base font-black text-rose-600 dark:text-rose-350">{unreadTeacherMessages}</p>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Pesan Baru</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* B. Slider Kapsul Pesan Cepat (Quick Prompts pills) */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2.5 px-4 bg-slate-50/50 border-b border-slate-100 dark:bg-slate-950/20 dark:border-slate-800/40">
                    <div className="flex gap-2 whitespace-nowrap">
                        {quickPrompts.map((prompt) => (
                            <button
                                key={prompt}
                                type="button"
                                onClick={() => setNewMessage(prompt)}
                                className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-amber-400 hover:border-slate-300 dark:hover:bg-slate-800 border border-slate-200/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 dark:bg-slate-900 dark:border-slate-800"
                            >
                                💬 {prompt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* C. Conversation Thread List */}
                <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-950/5">
                    {communications.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm dark:bg-slate-800">
                                <SendIcon className="h-7 w-7 text-emerald-500" />
                            </div>
                            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum ada obrolan.</p>
                            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                Ketuk salah satu kapsul pesan cepat di atas untuk memulai konsultasi dengan wali kelas.
                            </p>
                        </div>
                    ) : (
                        communications.map((msg) => {
                            const isParent = msg.sender === 'parent';
                            return (
                                <div key={msg.id} className={`group flex items-start gap-2.5 ${isParent ? 'justify-end' : 'justify-start'}`}>
                                    {/* Teacher Avatar */}
                                    {!isParent && (
                                        <img 
                                            src={teacher?.avatar_url} 
                                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-200 mt-1 shadow-sm" 
                                            alt="Guru" 
                                        />
                                    )}

                                    {/* Chat Bubble Box */}
                                    <div className="relative max-w-[72%] group/bubble">
                                        <div className={`p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${
                                            isParent 
                                                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-sm shadow-emerald-600/5' 
                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/40 dark:border-slate-700/40 shadow-slate-900/5'
                                        }`}>
                                            {/* File/Image Attachment */}
                                            {msg.attachment_url && (
                                                <div className="mb-2.5 rounded-xl overflow-hidden border border-black/5">
                                                    {msg.attachment_type === 'image' ? (
                                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block relative overflow-hidden group/img bg-slate-100">
                                                            <img
                                                                src={msg.attachment_url}
                                                                alt="Attachment"
                                                                className="max-w-full rounded-lg max-h-48 object-cover hover:scale-[1.03] transition-transform duration-300"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <a
                                                            href={msg.attachment_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-2.5 p-3 rounded-lg text-xs font-semibold ${
                                                                isParent 
                                                                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                                                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-600/80 text-slate-800 dark:text-white'
                                                            } transition-colors`}
                                                        >
                                                            <svg className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                            </svg>
                                                            <span className="truncate">{msg.attachment_name || 'Lampiran Dokumen'}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                                            
                                            {/* Micro Timestamp & Read Checks */}
                                            <div className={`flex items-center gap-1.5 text-[9px] mt-2 font-bold justify-end ${isParent ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                                <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isParent && msg.is_read && (
                                                    <span className="text-[10px] select-none text-emerald-350">✔✔</span>
                                                )}
                                                {isParent && !msg.is_read && (
                                                    <span className="text-[10px] select-none opacity-60">✔</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Edit/Delete Overlay triggers for Parent Message */}
                                        {isParent && (
                                            <div className="absolute top-1/2 -translate-y-1/2 -left-18 flex items-center gap-1.5 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 ease-out scale-90 group-hover/bubble:scale-100">
                                                <button 
                                                    type="button"
                                                    title="Ubah pesan"
                                                    className="h-7 w-7 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all"
                                                    onClick={() => setModalState({ type: 'edit', data: msg })}
                                                >
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    type="button"
                                                    title="Hapus pesan"
                                                    className="h-7 w-7 rounded-xl bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all"
                                                    onClick={() => setModalState({ type: 'delete', data: msg })}
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Parent Avatar */}
                                    {isParent && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-200 dark:from-indigo-950 dark:to-indigo-900 border border-indigo-200 dark:border-indigo-850 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                            <UsersIcon className="w-3.5 h-3.5 text-indigo-650 dark:text-indigo-350" />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* D. Message Input Controls */}
                <form 
                    onSubmit={(event) => { event.preventDefault(); if (newMessage.trim()) sendMessage(newMessage); }} 
                    className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-850 dark:bg-slate-900/40"
                >
                    <Input
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        placeholder="Ketik pesan untuk wali kelas..."
                        className="flex-1 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 rounded-2xl shadow-sm pl-4 text-sm"
                        disabled={isSending}
                    />
                    <Button 
                        type="submit" 
                        size="icon" 
                        disabled={isSending || !newMessage.trim()} 
                        className="h-11 w-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 flex items-center justify-center active:scale-95 transition-all"
                    >
                        <SendIcon className="w-4.5 h-4.5" />
                    </Button>
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
                        <textarea name="message" defaultValue={modalState.data.message} rows={5} className="w-full mt-1 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"></textarea>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setModalState({ type: 'closed', data: null })}>Batal</Button>
                            <Button type="submit" disabled={isUpdating} className="bg-emerald-600 text-white hover:bg-emerald-700">{isUpdating ? 'Menyimpan...' : 'Simpan'}</Button>
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
