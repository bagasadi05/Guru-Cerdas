import React, { useRef, useEffect, useState, useMemo } from 'react';
import { CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { MessageSquareIcon, UsersIcon, CheckCircleIcon, PencilIcon, TrashIcon, SendIcon, SearchIcon, FileTextIcon, ChevronDownIcon, XCircleIcon } from '../../Icons';
import { CommunicationRow } from './types';
import { MESSAGE_TEMPLATES, TEMPLATE_CATEGORIES, MessageTemplate, applyTemplate } from '../../../data/messageTemplates';

// Paperclip Icon (not in Icons.tsx)
const PaperclipIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
);

interface AttachmentData {
    file: File;
    preview: string;
    type: 'image' | 'document';
}

interface CommunicationTabProps {
    communications: CommunicationRow[];
    userAvatarUrl?: string;
    studentName?: string;
    onSendMessage: (message: string, attachment?: { file: File; type: 'image' | 'document' }) => void;
    onEditMessage: (message: CommunicationRow) => void;
    onDeleteMessage: (id: string) => void;
    isOnline: boolean;
    isSending: boolean;
}

type FilterType = 'all' | 'parent' | 'teacher';

export const CommunicationTab: React.FC<CommunicationTabProps> = ({
    communications,
    userAvatarUrl,
    studentName = 'Siswa',
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    isOnline,
    isSending
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [showTemplates, setShowTemplates] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<MessageTemplate['category'] | 'all'>('all');
    const [showSearch, setShowSearch] = useState(false);
    const [attachment, setAttachment] = useState<AttachmentData | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(communications.length);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter and search messages
    const filteredCommunications = useMemo(() => {
        return communications.filter(msg => {
            // Apply sender filter
            if (filter !== 'all' && msg.sender !== filter) return false;

            // Apply search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                return (msg.message || '').toLowerCase().includes(query);
            }

            return true;
        });
    }, [communications, filter, searchQuery]);

    // Get filtered templates
    const filteredTemplates = useMemo(() => {
        if (selectedCategory === 'all') return MESSAGE_TEMPLATES;
        return MESSAGE_TEMPLATES.filter(t => t.category === selectedCategory);
    }, [selectedCategory]);

    // Only auto-scroll when NEW messages are added (not on initial load/tab switch)
    useEffect(() => {
        if (communications.length > prevLengthRef.current && messagesEndRef.current) {
            // Scroll only within the container, not the entire page
            const container = messagesEndRef.current.parentElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
        prevLengthRef.current = communications.length;
    }, [communications.length]);

    // Close template menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
                setShowTemplates(false);
            }
        };

        if (showTemplates) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showTemplates]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() || attachment) {
            onSendMessage(newMessage, attachment ? { file: attachment.file, type: attachment.type } : undefined);
            setNewMessage('');
            setAttachment(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Ukuran file maksimal 10MB');
            return;
        }

        const isImage = file.type.startsWith('image/');
        const preview = isImage ? URL.createObjectURL(file) : '';

        setAttachment({
            file,
            preview,
            type: isImage ? 'image' : 'document'
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = () => {
        if (attachment?.preview) {
            URL.revokeObjectURL(attachment.preview);
        }
        setAttachment(null);
    };

    const handleSelectTemplate = (template: MessageTemplate) => {
        // Apply template with student name
        const message = applyTemplate(template, { nama_siswa: studentName });
        setNewMessage(message);
        setShowTemplates(false);
    };

    const formatMessageDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else if (isYesterday) {
            return `Kemarin, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquareIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        Komunikasi dengan Orang Tua
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                            title="Cari pesan"
                        >
                            <SearchIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                {showSearch && (
                    <div className="flex items-center gap-2 mt-3 animate-fade-in">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari pesan..."
                                className="pl-9 h-9 text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                    <XCircleIcon className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value as FilterType)}
                            className="h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                            <option value="all">Semua</option>
                            <option value="parent">Dari Orang Tua</option>
                            <option value="teacher">Dari Guru</option>
                        </select>
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{communications.length} pesan total</span>
                    {searchQuery && (
                        <span className="text-blue-600 dark:text-blue-400">
                            {filteredCommunications.length} hasil ditemukan
                        </span>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 min-h-[200px] max-h-[450px] overflow-y-auto space-y-4 p-4 bg-gray-50 dark:bg-black/20">
                {filteredCommunications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        {searchQuery || filter !== 'all' ? (
                            <>
                                <SearchIcon className="w-12 h-12 mb-2 opacity-50" />
                                <p className="text-sm">Tidak ada pesan yang cocok</p>
                                <button
                                    onClick={() => { setSearchQuery(''); setFilter('all'); }}
                                    className="text-xs text-blue-600 dark:text-blue-400 mt-2 hover:underline"
                                >
                                    Reset filter
                                </button>
                            </>
                        ) : (
                            <>
                                <MessageSquareIcon className="w-12 h-12 mb-2 opacity-50" />
                                <p className="text-sm">Belum ada pesan</p>
                                <p className="text-xs">Mulai percakapan dengan mengirim pesan</p>
                            </>
                        )}
                    </div>
                ) : (
                    filteredCommunications.map(msg => (
                        <div key={msg.id} className={`group flex items-start gap-3 ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'parent' && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <UsersIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </div>
                            )}
                            <div className={`relative max-w-md p-3 rounded-2xl text-sm ${msg.sender === 'teacher' ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'}`}>
                                {/* Attachment Display */}
                                {msg.attachment_url && (
                                    <div className="mb-2">
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
                                                className={`flex items-center gap-2 p-2 rounded-lg ${msg.sender === 'teacher' ? 'bg-blue-700/50 hover:bg-blue-700/70' : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'} transition-colors`}
                                            >
                                                <FileTextIcon className="w-5 h-5 flex-shrink-0" />
                                                <span className="text-xs truncate">{msg.attachment_name || 'Dokumen'}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                <div className={`flex items-center gap-1 text-xs mt-1 ${msg.sender === 'teacher' ? 'text-blue-100 dark:text-blue-200 justify-end' : 'text-gray-500 dark:text-gray-400 justify-end'}`}>
                                    <span>{formatMessageDate(msg.created_at)}</span>
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
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-gray-900">
                {/* Template Selector */}
                <div className="relative mb-3" ref={templateMenuRef}>
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        disabled={!isOnline}
                    >
                        <FileTextIcon className="w-4 h-4" />
                        <span>Gunakan Template</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Template Dropdown */}
                    {showTemplates && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-up max-h-80 overflow-hidden">
                            {/* Category Tabs */}
                            <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    Semua
                                </button>
                                {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label }]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCategory(key as MessageTemplate['category'])}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${selectedCategory === key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Template List */}
                            <div className="max-h-52 overflow-y-auto">
                                {filteredTemplates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full bg-${TEMPLATE_CATEGORIES[template.category].color}-500`} />
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">{template.title}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{template.message.substring(0, 80)}...</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Attachment Preview */}
                    {attachment && (
                        <div className="relative inline-block">
                            {attachment.type === 'image' ? (
                                <div className="relative">
                                    <img
                                        src={attachment.preview}
                                        alt="Preview"
                                        className="h-20 w-auto rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveAttachment}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <XCircleIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <FileTextIcon className="w-5 h-5 text-gray-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                                        {attachment.file.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveAttachment}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <XCircleIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Input Row */}
                    <div className="flex items-end gap-2">
                        {/* Attach Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!isOnline || isSending}
                            className="p-3 rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            title="Lampirkan file"
                        >
                            <PaperclipIcon className="w-5 h-5" />
                        </button>

                        {/* Message Input */}
                        <div className="flex-1">
                            <textarea
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Ketik pesan..."
                                className="w-full min-h-[44px] max-h-32 px-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                disabled={!isOnline || isSending}
                                rows={newMessage.split('\n').length > 3 ? 4 : Math.max(1, newMessage.split('\n').length)}
                            />
                        </div>

                        {/* Send Button */}
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!isOnline || (!newMessage.trim() && !attachment) || isSending}
                            className="h-11 w-11 rounded-full"
                        >
                            {isSending ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <SendIcon className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

