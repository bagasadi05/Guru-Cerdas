import React, { createContext, useCallback, useState } from 'react';
import { useFocusTrap, useHighContrast, useKeyboardNavigation, useReducedMotion } from './shared';

interface LiveRegionContextValue {
    announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

export const LiveRegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');

    const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
        if (politeness === 'assertive') {
            setAssertiveMessage('');
            setTimeout(() => setAssertiveMessage(message), 50);
        } else {
            setPoliteMessage('');
            setTimeout(() => setPoliteMessage(message), 50);
        }
    }, []);

    return (
        <LiveRegionContext.Provider value={{ announce }}>
            {children}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {politeMessage}
            </div>
            <div aria-live="assertive" aria-atomic="true" className="sr-only">
                {assertiveMessage}
            </div>
        </LiveRegionContext.Provider>
    );
};

interface HighContrastToggleProps {
    className?: string;
}

export const HighContrastToggle: React.FC<HighContrastToggleProps> = ({ className = '' }) => {
    const { isHighContrast, toggle } = useHighContrast();

    return (
        <button
            onClick={toggle}
            aria-pressed={isHighContrast}
            className={`rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
            title={isHighContrast ? 'Matikan kontras tinggi' : 'Aktifkan kontras tinggi'}
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" fill={isHighContrast ? 'currentColor' : 'none'} />
                <path d="M12 2a10 10 0 0 1 0 20" fill={isHighContrast ? 'white' : 'currentColor'} strokeWidth="0" />
            </svg>
            <span className="sr-only">
                {isHighContrast ? 'Kontras tinggi aktif' : 'Kontras tinggi nonaktif'}
            </span>
        </button>
    );
};

export interface KeyboardShortcut {
    keys: string[];
    description: string;
    category?: string;
}

const defaultShortcuts: KeyboardShortcut[] = [
    { keys: ['Alt', '1'], description: 'Pergi ke Dashboard', category: 'Navigasi' },
    { keys: ['Alt', '2'], description: 'Pergi ke Siswa', category: 'Navigasi' },
    { keys: ['Alt', '3'], description: 'Pergi ke Absensi', category: 'Navigasi' },
    { keys: ['Alt', '4'], description: 'Pergi ke Tugas', category: 'Navigasi' },
    { keys: ['Alt', '5'], description: 'Pergi ke Jadwal', category: 'Navigasi' },
    { keys: ['Ctrl', 'S'], description: 'Simpan perubahan', category: 'Aksi' },
    { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'Aksi' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'Aksi' },
    { keys: ['Ctrl', 'F'], description: 'Cari', category: 'Aksi' },
    { keys: ['Escape'], description: 'Tutup modal/cancel', category: 'Aksi' },
    { keys: ['Tab'], description: 'Pindah ke elemen berikutnya', category: 'Aksesibilitas' },
    { keys: ['Shift', 'Tab'], description: 'Pindah ke elemen sebelumnya', category: 'Aksesibilitas' },
    { keys: ['Enter'], description: 'Aktifkan elemen terfokus', category: 'Aksesibilitas' },
    { keys: ['Space'], description: 'Toggle checkbox/toggle', category: 'Aksesibilitas' },
    { keys: ['Arrow Keys'], description: 'Navigasi dalam daftar/menu', category: 'Aksesibilitas' },
    { keys: ['?'], description: 'Tampilkan pintasan keyboard', category: 'Bantuan' },
    { keys: ['Ctrl', '/'], description: 'Tampilkan bantuan', category: 'Bantuan' }
];

interface KeyboardShortcutsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts?: KeyboardShortcut[];
}

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
    isOpen,
    onClose,
    shortcuts = defaultShortcuts
}) => {
    const containerRef = useFocusTrap(isOpen);
    const { onKeyDown } = useKeyboardNavigation({
        onEscape: onClose
    });

    React.useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', onKeyDown as EventListener);
        }
        return () => document.removeEventListener('keydown', onKeyDown as EventListener);
    }, [isOpen, onKeyDown]);

    if (!isOpen) return null;

    const grouped = shortcuts.reduce<Record<string, KeyboardShortcut[]>>((accumulator, shortcut) => {
        const category = shortcut.category || 'Lainnya';
        if (!accumulator[category]) {
            accumulator[category] = [];
        }
        accumulator[category].push(shortcut);
        return accumulator;
    }, {});

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div
                ref={containerRef}
                className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            >
                <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                            <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="shortcuts-title" className="text-lg font-semibold text-slate-900 dark:text-white">Pintasan Keyboard</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gunakan pintasan untuk navigasi cepat</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Tutup"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-6">
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{category}</h3>
                                <div className="space-y-2">
                                    {items.map((shortcut, index) => (
                                        <div
                                            key={`${category}-${index}`}
                                            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, keyIndex) => (
                                                    <React.Fragment key={`${shortcut.description}-${key}-${keyIndex}`}>
                                                        <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                            {key}
                                                        </kbd>
                                                        {keyIndex < shortcut.keys.length - 1 && <span className="text-slate-400">+</span>}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                        Tekan <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-700">?</kbd> kapan saja untuk menampilkan panel ini
                    </p>
                </div>
            </div>
        </div>
    );
};

export const AccessibilitySettingsPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { isHighContrast, toggle: toggleContrast } = useHighContrast();
    const reducedMotion = useReducedMotion();
    const containerRef = useFocusTrap(isOpen);

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="a11y-settings-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
            <div ref={containerRef} className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 id="a11y-settings-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Pengaturan Aksesibilitas
                        </h2>
                        <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Kontras Tinggi</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Meningkatkan kontras warna untuk visibilitas lebih baik</p>
                            </div>
                            <button
                                role="switch"
                                aria-checked={isHighContrast}
                                onClick={toggleContrast}
                                className={`relative h-6 w-11 rounded-full transition-colors ${isHighContrast ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isHighContrast ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Kurangi Animasi</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {reducedMotion ? 'Diaktifkan oleh pengaturan sistem' : 'Mengikuti pengaturan sistem Anda'}
                                </p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                                reducedMotion
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                                {reducedMotion ? 'Aktif' : 'Nonaktif'}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                            <h3 className="mb-2 font-medium text-slate-900 dark:text-white">Pintasan Keyboard</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Tekan <kbd className="rounded border bg-white px-1.5 py-0.5 text-xs dark:bg-slate-700">?</kbd> untuk melihat semua pintasan keyboard yang tersedia.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
