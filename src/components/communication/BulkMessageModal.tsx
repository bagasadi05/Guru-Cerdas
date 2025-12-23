import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
    UsersIcon,
    SendIcon,
    CheckIcon,
    AlertCircleIcon,
    SearchIcon,
    FileTextIcon,
    ChevronDownIcon
} from '../Icons';
import { MESSAGE_TEMPLATES, TEMPLATE_CATEGORIES, MessageTemplate, applyTemplate } from '../../data/messageTemplates';
import { getStudentAvatar } from '../../utils/avatarUtils';

interface Student {
    id: string;
    name: string;
    class_id: string;
    avatar_url?: string;
    gender?: string;
}

interface Class {
    id: string;
    name: string;
}

interface BulkMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    classes: Class[];
    onSendBulkMessage: (studentIds: string[], message: string) => Promise<void>;
    isOnline: boolean;
}

type SelectionMode = 'all' | 'class' | 'custom';

export const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
    isOpen,
    onClose,
    students,
    classes,
    onSendBulkMessage,
    isOnline
}) => {
    const [message, setMessage] = useState('');
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('all');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<MessageTemplate['category'] | 'all'>('all');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Get recipients based on selection mode
    const recipients = useMemo(() => {
        switch (selectionMode) {
            case 'all':
                return students;
            case 'class':
                return students.filter(s => s.class_id === selectedClassId);
            case 'custom':
                return students.filter(s => selectedStudentIds.has(s.id));
            default:
                return [];
        }
    }, [selectionMode, students, selectedClassId, selectedStudentIds]);

    // Filter students for custom selection
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const query = searchQuery.toLowerCase();
        return students.filter(s => s.name.toLowerCase().includes(query));
    }, [students, searchQuery]);

    // Get filtered templates
    const filteredTemplates = useMemo(() => {
        if (selectedCategory === 'all') return MESSAGE_TEMPLATES;
        return MESSAGE_TEMPLATES.filter(t => t.category === selectedCategory);
    }, [selectedCategory]);

    const handleToggleStudent = (studentId: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setSelectedStudentIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.size === filteredStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const handleSelectTemplate = (template: MessageTemplate) => {
        // Apply template without student name (will be generic)
        const msg = template.message.replace(/\{\{nama_siswa\}\}/g, '[Nama Siswa]');
        setMessage(msg);
        setShowTemplates(false);
    };

    const handleSend = async () => {
        if (!message.trim() || recipients.length === 0) return;

        setIsSending(true);
        setError(null);

        try {
            await onSendBulkMessage(recipients.map(r => r.id), message);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                // Reset state
                setMessage('');
                setSelectionMode('all');
                setSelectedStudentIds(new Set());
                setSuccess(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Gagal mengirim pesan');
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        if (!isSending) {
            onClose();
            setMessage('');
            setError(null);
            setSuccess(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Kirim Pesan ke Orang Tua">
            <div className="space-y-6">
                {/* Success State */}
                {success ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Pesan Terkirim!
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Pesan berhasil dikirim ke {recipients.length} wali murid
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Selection Mode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Kirim Ke
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectionMode('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectionMode === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <UsersIcon className="w-4 h-4 inline-block mr-2" />
                                    Semua Siswa ({students.length})
                                </button>
                                <button
                                    onClick={() => setSelectionMode('class')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectionMode === 'class'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Per Kelas
                                </button>
                                <button
                                    onClick={() => setSelectionMode('custom')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectionMode === 'custom'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Pilih Manual
                                </button>
                            </div>
                        </div>

                        {/* Class Selection */}
                        {selectionMode === 'class' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Pilih Kelas
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={e => setSelectedClassId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                >
                                    <option value="">-- Pilih Kelas --</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name} ({students.filter(s => s.class_id === cls.id).length} siswa)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Custom Selection */}
                        {selectionMode === 'custom' && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Pilih Siswa ({selectedStudentIds.size} dipilih)
                                    </label>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {selectedStudentIds.size === filteredStudents.length ? 'Batalkan Semua' : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="relative mb-2">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Cari siswa..."
                                        className="pl-9"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredStudents.map(student => (
                                        <label
                                            key={student.id}
                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.has(student.id)}
                                                onChange={() => handleToggleStudent(student.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <img
                                                src={getStudentAvatar(student.avatar_url, student.gender, student.id)}
                                                alt={student.name}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                            <span className="text-sm text-gray-900 dark:text-white">{student.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recipients Preview */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <UsersIcon className="w-4 h-4" />
                                <span>
                                    Akan dikirim ke <strong className="text-gray-900 dark:text-white">{recipients.length}</strong> wali murid
                                </span>
                            </div>
                        </div>

                        {/* Template Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                <FileTextIcon className="w-4 h-4" />
                                <span>Gunakan Template</span>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                            </button>

                            {showTemplates && (
                                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-60 overflow-hidden">
                                    <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                                        <button
                                            onClick={() => setSelectedCategory('all')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            Semua
                                        </button>
                                        {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label }]) => (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedCategory(key as MessageTemplate['category'])}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${selectedCategory === key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="max-h-40 overflow-y-auto">
                                        {filteredTemplates.map(template => (
                                            <button
                                                key={template.id}
                                                onClick={() => handleSelectTemplate(template)}
                                                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                                            >
                                                <span className="font-medium text-sm text-gray-900 dark:text-white">{template.title}</span>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{template.message.substring(0, 60)}...</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Pesan
                            </label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Tulis pesan untuk wali murid..."
                                className="w-full h-32 px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                disabled={isSending}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Gunakan [Nama Siswa] untuk placeholder nama
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isSending}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={!isOnline || !message.trim() || recipients.length === 0 || isSending}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                            >
                                {isSending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <SendIcon className="w-4 h-4 mr-2" />
                                        Kirim ke {recipients.length} Wali
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default BulkMessageModal;
