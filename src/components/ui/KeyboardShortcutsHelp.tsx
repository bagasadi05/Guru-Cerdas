import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { KeyboardIcon } from '../Icons';

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShortcutItem {
    keys: string[];
    description: string;
    category: 'navigation' | 'actions' | 'general';
}

const shortcuts: ShortcutItem[] = [
    // Navigation
    { keys: ['Tab'], description: 'Pindah ke input berikutnya', category: 'navigation' },
    { keys: ['Shift', 'Tab'], description: 'Pindah ke input sebelumnya', category: 'navigation' },
    { keys: ['Enter'], description: 'Pindah ke input berikutnya', category: 'navigation' },
    { keys: ['Escape'], description: 'Keluar dari input aktif', category: 'navigation' },
    { keys: ['↑'], description: 'Pindah ke baris atas', category: 'navigation' },
    { keys: ['↓'], description: 'Pindah ke baris bawah', category: 'navigation' },

    // Actions
    { keys: ['Ctrl', 'S'], description: 'Simpan semua nilai', category: 'actions' },
    { keys: ['Ctrl', 'I'], description: 'Buka import Excel', category: 'actions' },
    { keys: ['Ctrl', 'E'], description: 'Export template', category: 'actions' },
    { keys: ['Ctrl', 'Shift', 'F'], description: 'Fill semua nilai kosong', category: 'actions' },
    { keys: ['Ctrl', 'Shift', 'C'], description: 'Hapus semua nilai', category: 'actions' },

    // General
    { keys: ['F1'], description: 'Buka bantuan shortcut ini', category: 'general' },
    { keys: ['Ctrl', 'K'], description: 'Buka pencarian global', category: 'general' },
    { keys: ['Shift', '?'], description: 'Panel pintasan keyboard', category: 'general' },
];

const categoryLabels = {
    navigation: 'Navigasi',
    actions: 'Aksi',
    general: 'Umum',
};

const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => (
    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono font-medium text-gray-700 dark:text-gray-300 shadow-sm">
        {keyName}
    </span>
);

/**
 * Modal showing all available keyboard shortcuts
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
    isOpen,
    onClose,
}) => {
    const categories = ['navigation', 'actions', 'general'] as const;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pintasan Keyboard"
            icon={<KeyboardIcon className="w-6 h-6 text-brand-500" />}
        >
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {categories.map((category) => (
                    <div key={category}>
                        <h3 className="text-sm font-bold text-brand-500 uppercase tracking-wide mb-3">
                            {categoryLabels[category]}
                        </h3>
                        <div className="space-y-2">
                            {shortcuts
                                .filter((s) => s.category === category)
                                .map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <React.Fragment key={keyIndex}>
                                                    <KeyBadge keyName={key} />
                                                    {keyIndex < shortcut.keys.length - 1 && (
                                                        <span className="text-gray-400 text-xs mx-0.5">+</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}

                {/* Tips */}
                <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
                    <h4 className="font-bold text-brand-700 dark:text-brand-300 mb-2">💡 Tips</h4>
                    <ul className="text-sm text-brand-600 dark:text-brand-400 space-y-1">
                        <li>• Gunakan Tab untuk navigasi antar input nilai</li>
                        <li>• Tekan Ctrl+S untuk menyimpan tanpa klik tombol</li>
                        <li>• Tekan F1 kapan saja untuk melihat bantuan ini</li>
                    </ul>
                </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={onClose}>Tutup</Button>
            </div>
        </Modal>
    );
};

export default KeyboardShortcutsHelp;
