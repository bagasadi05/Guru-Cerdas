import React, { useRef, useEffect, useState } from 'react';
import { CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { MessageSquareIcon, UsersIcon, CheckCircleIcon, PencilIcon, TrashIcon, SendIcon } from '../../Icons';
import { CommunicationRow } from './types';

interface CommunicationTabProps {
    communications: CommunicationRow[];
    userAvatarUrl?: string;
    onSendMessage: (message: string) => void;
    onEditMessage: (message: CommunicationRow) => void;
    onDeleteMessage: (id: string) => void;
    isOnline: boolean;
    isSending: boolean;
}

export const CommunicationTab: React.FC<CommunicationTabProps> = ({ communications, userAvatarUrl, onSendMessage, onEditMessage, onDeleteMessage, isOnline, isSending }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [communications]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[60vh]">
            <div className="p-6"><CardTitle className="flex items-center gap-2"><MessageSquareIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />Komunikasi dengan Orang Tua</CardTitle></div>
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 dark:bg-black/20">
                {communications.map(msg => (
                    <div key={msg.id} className={`group flex items-start gap-3 ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'parent' && <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0"><UsersIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" /></div>}
                        <div className={`relative max-w-md p-3 rounded-2xl text-sm ${msg.sender === 'teacher' ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'}`}>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            <div className={`flex items-center gap-1 text-xs mt-1 ${msg.sender === 'teacher' ? 'text-blue-100 dark:text-blue-200 justify-end' : 'text-gray-500 dark:text-gray-400 justify-end'}`}>
                                <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                {msg.sender === 'teacher' && msg.is_read && <CheckCircleIcon className="w-3.5 h-3.5" />}
                            </div>
                            {msg.sender === 'teacher' && isOnline && (
                                <div className="absolute top-0 -left-20 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-gray-200 dark:bg-black/30" onClick={() => onEditMessage(msg)}><PencilIcon className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-gray-200 dark:bg-black/30 text-red-600 dark:text-red-400" onClick={() => onDeleteMessage(msg.id)}><TrashIcon className="w-3.5 h-3.5" /></Button>
                                </div>
                            )}
                        </div>
                        {msg.sender === 'teacher' && <img src={userAvatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="Guru" />}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-2">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Ketik pesan..." className="flex-1" disabled={!isOnline || isSending} />
                <Button type="submit" size="icon" disabled={!isOnline || !newMessage.trim() || isSending}><SendIcon className="w-5 h-5" /></Button>
            </form>
        </div>
    );
};
