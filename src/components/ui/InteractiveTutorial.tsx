/**
 * Interactive Tutorial System
 * 
 * Tutorial praktik langsung: user diarahkan ke halaman,
 * elemen di-highlight, dan diberi instruksi untuk melakukan aksi nyata.
 * 
 * Features:
 * - Navigate user to correct page
 * - Highlight target elements with spotlight
 * - Wait for user action before advancing
 * - Countdown timer for observe steps
 * - Progress tracking via localStorage
 * - Keyboard navigation (Escape, arrows)
 * - Celebration on completion
 */

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ChevronRight,
    ChevronLeft,
    MousePointerClick,
    Eye,
    Hand,
    CheckCircle2,
    SkipForward,
    GraduationCap,
    Target,
    Trophy,
    RotateCcw,
    Timer,
    Keyboard,
} from 'lucide-react';
import { Button } from './Button';

// ============================================
// TYPES
// ============================================

type StepAction =
    | 'observe'
    | 'click'
    | 'navigate'
    | 'scroll'
    | 'interact';

export interface GuidedStep {
    id: string;
    target?: string;
    route?: string;
    title: string;
    instruction: string;
    action: StepAction;
    autoAdvanceMs?: number;
    advanceOnTargetClick?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    waitFor?: string;
    /** Fallback instruction if target not found */
    fallbackInstruction?: string;
}

export interface TutorialFlow {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'dasar' | 'lanjutan';
    steps: GuidedStep[];
}

// ============================================
// TUTORIAL FLOWS DATA
// ============================================

export const tutorialFlows: TutorialFlow[] = [
    {
        id: 'dashboard-tour',
        title: 'Jelajahi Dashboard',
        description: 'Kenali ringkasan data dan widget di halaman utama',
        icon: '🏠',
        category: 'dasar',
        steps: [
            {
                id: 'nav-dashboard',
                route: '/dashboard',
                title: 'Menuju Dashboard',
                instruction: 'Membuka halaman utama...',
                action: 'navigate',
            },
            {
                id: 'dashboard-stats',
                target: '[data-tutorial="dashboard-stats"], .grid.grid-cols-2, section:first-of-type .grid',
                title: 'Kartu Statistik',
                instruction: 'Ini kartu ringkasan kelas Anda: jumlah siswa, kehadiran, tugas aktif, dan nilai rata-rata. Klik salah satu untuk langsung ke halaman terkait.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 6000,
                fallbackInstruction: 'Perhatikan kartu-kartu statistik di bagian atas halaman Dashboard.',
            },
            {
                id: 'dashboard-ai',
                target: '[data-tutorial="ai-insight"], [class*="AIInsight"], [class*="ai-insight"]',
                title: 'Analisis AI Harian',
                instruction: 'AI menganalisis data kelas Anda dan memberikan rekomendasi: siswa yang perlu perhatian, tren kehadiran, dan saran tindakan.',
                action: 'observe',
                position: 'top',
                autoAdvanceMs: 6000,
                fallbackInstruction: 'Scroll ke bawah untuk melihat widget Analisis Cerdas Harian.',
            },
            {
                id: 'dashboard-attendance-chart',
                target: '[class*="AttendanceStats"], [class*="recharts-wrapper"], .recharts-responsive-container',
                title: 'Grafik Kehadiran',
                instruction: 'Grafik ini menunjukkan tren kehadiran mingguan. Hijau = hadir, merah = alpha. Arahkan kursor untuk detail angka.',
                action: 'observe',
                position: 'top',
                autoAdvanceMs: 5000,
            },
        ],
    },
    {
        id: 'absensi-practice',
        title: 'Praktik Isi Absensi',
        description: 'Langsung coba catat kehadiran siswa di halaman asli',
        icon: '📋',
        category: 'dasar',
        steps: [
            {
                id: 'go-absensi',
                target: '[href="/absensi"]',
                route: '/absensi',
                title: 'Buka Halaman Absensi',
                instruction: 'Klik menu "Absensi" di sidebar kiri untuk membuka halaman rekap kehadiran.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'select-class-absensi',
                target: '[data-tutorial="class-selector"], [data-tutorial="class-pill"]',
                title: 'Pilih Kelas',
                instruction: 'Klik salah satu tombol kelas (misal 3A, 3B) untuk memilih kelas yang ingin diabsen. Tanggal otomatis terisi hari ini.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'bottom',
                waitFor: '[data-tutorial="class-selector"]',
                fallbackInstruction: 'Cari tombol-tombol nama kelas (3A, 3B, 3C) di bagian atas halaman, lalu klik salah satu.',
            },
            {
                id: 'mark-hadir',
                target: '[data-tutorial="attendance-status-group"], button[aria-label="Hadir"]',
                title: 'Tandai Kehadiran',
                instruction: 'Klik tombol bulat H (Hadir), S (Sakit), I (Izin), atau A (Alpha) di samping nama siswa. Coba klik salah satu sekarang!',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'left',
                waitFor: '[data-tutorial="attendance-status-group"]',
                fallbackInstruction: 'Pilih kelas terlebih dahulu agar daftar siswa muncul, lalu klik tombol status kehadiran (H/S/I/A) di samping nama siswa.',
            },
            {
                id: 'save-absensi',
                target: '[data-tutorial="attendance-save"]',
                title: 'Simpan Data',
                instruction: 'Setelah menandai siswa, tombol "Simpan" muncul di bawah layar. Klik untuk menyimpan absensi. Data langsung tersinkronisasi.',
                action: 'observe',
                position: 'top',
                autoAdvanceMs: 6000,
                waitFor: '[data-tutorial="attendance-save"]',
                fallbackInstruction: 'Setelah menandai kehadiran minimal satu siswa, tombol Simpan akan muncul di bagian bawah halaman.',
            },
        ],
    },
    {
        id: 'siswa-practice',
        title: 'Kelola Data Siswa',
        description: 'Cari siswa, lihat profil, dan kelola data lengkap',
        icon: '👨‍🎓',
        category: 'dasar',
        steps: [
            {
                id: 'go-siswa',
                target: '[href="/siswa"]',
                route: '/siswa',
                title: 'Buka Data Siswa',
                instruction: 'Klik menu "Data Siswa" di sidebar untuk melihat daftar semua siswa.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'search-siswa',
                target: 'input[type="search"], input[placeholder*="Cari" i], input[placeholder*="cari" i], input[aria-label*="Cari" i]',
                title: 'Cari Nama Siswa',
                instruction: 'Ketik nama siswa di kotak pencarian ini. Coba ketik 2-3 huruf pertama nama salah satu siswa Anda.',
                action: 'interact',
                position: 'bottom',
                autoAdvanceMs: 7000,
                fallbackInstruction: 'Gunakan kotak pencarian di bagian atas untuk mencari siswa berdasarkan nama atau NIS.',
            },
            {
                id: 'click-siswa',
                target: 'table tbody tr, [class*="student"] a, [class*="card"] a, [class*="list-item"]',
                title: 'Buka Profil Siswa',
                instruction: 'Klik nama salah satu siswa untuk membuka halaman detail: profil lengkap, nilai, kehadiran, dan catatan.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'bottom',
                fallbackInstruction: 'Klik salah satu nama siswa dari daftar untuk melihat detail profilnya.',
            },
        ],
    },
    {
        id: 'jadwal-practice',
        title: 'Atur Jadwal Mengajar',
        description: 'Lihat jadwal mingguan dan tambah jadwal baru',
        icon: '📅',
        category: 'dasar',
        steps: [
            {
                id: 'go-jadwal',
                target: '[href="/jadwal"]',
                route: '/jadwal',
                title: 'Buka Jadwal',
                instruction: 'Klik menu "Jadwal" di sidebar untuk melihat jadwal mengajar mingguan.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'view-jadwal',
                target: 'table, [class*="schedule"], [class*="jadwal"], [class*="grid"]',
                title: 'Jadwal Mingguan',
                instruction: 'Ini jadwal mengajar Anda per hari. Setiap baris menunjukkan jam, mata pelajaran, dan kelas. Perhatikan jadwal hari ini.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
            },
            {
                id: 'add-jadwal',
                target: 'button[class*="add"], button[class*="tambah"], button[class*="create"], button:has(svg[class*="Plus"])',
                title: 'Tambah Jadwal Baru',
                instruction: 'Klik tombol "Tambah" untuk membuat jadwal baru. Isi hari, jam mulai-selesai, mata pelajaran, dan kelas.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
                fallbackInstruction: 'Cari tombol "+" atau "Tambah Jadwal" untuk menambahkan jadwal baru.',
            },
        ],
    },
    {
        id: 'tugas-practice',
        title: 'Buat & Kelola Tugas',
        description: 'Praktik membuat tugas/PR dan pantau pengumpulan',
        icon: '✅',
        category: 'dasar',
        steps: [
            {
                id: 'go-tugas',
                target: '[href="/tugas"]',
                route: '/tugas',
                title: 'Buka Manajemen Tugas',
                instruction: 'Klik menu "Tugas" di sidebar untuk membuka halaman manajemen tugas.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'view-tugas',
                target: '[class*="task"], [class*="tugas"], main > div',
                title: 'Daftar Tugas',
                instruction: 'Di sini semua tugas yang pernah dibuat. Perhatikan status (Aktif/Selesai) dan deadline masing-masing tugas.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
            },
            {
                id: 'create-tugas',
                target: 'button[class*="add"], button[class*="tambah"], button[class*="create"], button[class*="buat"]',
                title: 'Buat Tugas Baru',
                instruction: 'Klik tombol "Buat Tugas" untuk membuat tugas baru. Isi judul, deskripsi, pilih kelas, dan tentukan deadline.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
                fallbackInstruction: 'Cari tombol "Buat Tugas Baru" atau "+" di halaman ini.',
            },
        ],
    },
    {
        id: 'input-nilai-practice',
        title: 'Manajemen Nilai',
        description: 'Input nilai banyak siswa sekaligus dalam satu halaman',
        icon: '📝',
        category: 'dasar',
        steps: [
            {
                id: 'go-input',
                target: '[href="/input-massal"]',
                route: '/input-massal',
                title: 'Buka Manajemen Nilai',
                instruction: 'Klik menu "Manajemen Nilai" di sidebar untuk membuka halaman input nilai massal.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'select-mapel',
                target: 'select, [role="combobox"], [class*="select"]',
                title: 'Pilih Kelas & Mapel',
                instruction: 'Pilih kelas dan mata pelajaran dari dropdown. Setelah dipilih, tabel siswa akan muncul.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'bottom',
            },
            {
                id: 'input-nilai',
                target: 'input[type="number"], input[inputmode="numeric"], table input, [class*="grade"] input',
                title: 'Ketik Nilai Siswa',
                instruction: 'Ketik nilai (0-100) di kolom masing-masing siswa. Tekan Tab untuk pindah ke siswa berikutnya dengan cepat.',
                action: 'interact',
                position: 'right',
                autoAdvanceMs: 7000,
                fallbackInstruction: 'Isi nilai di kolom input yang tersedia untuk setiap siswa.',
            },
        ],
    },
    {
        id: 'brankas-practice',
        title: 'Gunakan Brankas Kelas',
        description: 'Upload dan kelola dokumen penting kelas',
        icon: '📁',
        category: 'lanjutan',
        steps: [
            {
                id: 'go-brankas',
                target: '[href="/brankas"]',
                route: '/brankas',
                title: 'Buka Brankas',
                instruction: 'Klik menu "Brankas Kelas" di sidebar untuk membuka penyimpanan dokumen.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'view-files',
                target: '[class*="file"], [class*="folder"], [class*="document"], main > div',
                title: 'Lihat Dokumen',
                instruction: 'Di sini semua file dan folder Anda tersimpan. Klik folder untuk membukanya, klik file untuk preview.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
            },
            {
                id: 'upload-file',
                target: 'button[class*="upload"], button[class*="tambah"], input[type="file"], [class*="dropzone"]',
                title: 'Upload File',
                instruction: 'Klik tombol "Upload" atau drag & drop file ke area ini. Mendukung PDF, Word, Excel, dan gambar.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
                fallbackInstruction: 'Cari tombol Upload atau area drag & drop untuk mengunggah file baru.',
            },
        ],
    },
    {
        id: 'analytics-practice',
        title: 'Baca Analytics & Grafik',
        description: 'Pahami statistik performa kelas dari grafik',
        icon: '📊',
        category: 'lanjutan',
        steps: [
            {
                id: 'go-analytics',
                target: '[href="/analytics"]',
                route: '/analytics',
                title: 'Buka Analytics',
                instruction: 'Klik menu "Analytics" di sidebar untuk melihat statistik dan grafik performa.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'analytics-tabs',
                target: '#tour-tabs, [class*="tab"], [role="tablist"]',
                title: 'Pilih Kategori',
                instruction: 'Gunakan tab di atas untuk beralih antara kategori analisis: Kehadiran, Nilai, Performa, dll. Coba klik salah satu.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'bottom',
            },
            {
                id: 'analytics-chart',
                target: '.recharts-responsive-container, [class*="chart"], svg[class*="recharts"]',
                title: 'Baca Grafik',
                instruction: 'Arahkan kursor ke grafik untuk melihat detail angka. Hijau = baik, kuning = perlu perhatian, merah = kritis.',
                action: 'observe',
                position: 'top',
                autoAdvanceMs: 6000,
                fallbackInstruction: 'Perhatikan grafik-grafik yang menampilkan tren data kelas Anda.',
            },
        ],
    },
    {
        id: 'ekskul-practice',
        title: 'Kelola Ekstrakurikuler',
        description: 'Daftarkan siswa dan catat kegiatan ekskul',
        icon: '🏆',
        category: 'lanjutan',
        steps: [
            {
                id: 'go-ekskul',
                target: '[href="/ekstrakurikuler"]',
                route: '/ekstrakurikuler',
                title: 'Buka Ekstrakurikuler',
                instruction: 'Klik menu "Ekstrakurikuler" di sidebar untuk mengelola kegiatan ekskul.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'view-ekskul',
                target: '[class*="card"], [class*="ekskul"], [class*="extracurricular"], main > div > div',
                title: 'Daftar Kegiatan',
                instruction: 'Semua kegiatan ekskul ditampilkan sebagai kartu. Klik salah satu untuk melihat detail anggota dan jadwal.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
            },
            {
                id: 'add-ekskul',
                target: 'button[class*="add"], button[class*="tambah"], button[class*="create"]',
                title: 'Tambah Kegiatan',
                instruction: 'Klik tombol "Tambah" untuk membuat kegiatan ekskul baru. Isi nama, jadwal, dan pembina kegiatan.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
            },
        ],
    },
    {
        id: 'pengaturan-practice',
        title: 'Atur Profil & Tampilan',
        description: 'Ubah profil, password, dan tema aplikasi',
        icon: '⚙️',
        category: 'lanjutan',
        steps: [
            {
                id: 'go-settings',
                target: '[href="/pengaturan"]',
                route: '/pengaturan',
                title: 'Buka Pengaturan',
                instruction: 'Klik menu "Pengaturan" di sidebar untuk mengatur profil dan preferensi.',
                action: 'click',
                advanceOnTargetClick: true,
                position: 'right',
            },
            {
                id: 'view-settings',
                target: 'form, [class*="profile"], [class*="setting"], [class*="tab"]',
                title: 'Pengaturan Profil',
                instruction: 'Di sini Anda bisa mengubah nama, foto, email, dan password. Jelajahi tab-tab yang tersedia.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
            },
            {
                id: 'theme-toggle',
                target: 'button[aria-label*="theme" i], button[aria-label*="tema" i], [class*="theme-toggle"], [class*="dark-mode"]',
                title: 'Ganti Tema',
                instruction: 'Coba klik toggle tema di header (ikon matahari/bulan) untuk beralih antara mode Terang dan Gelap.',
                action: 'observe',
                position: 'bottom',
                autoAdvanceMs: 5000,
                fallbackInstruction: 'Cari ikon matahari/bulan di header untuk mengganti tema tampilan.',
            },
        ],
    },
];

// ============================================
// PROGRESS TRACKING
// ============================================

const STORAGE_KEY = 'tutorial_progress';

function getCompletedFlows(): string[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function markFlowCompleted(flowId: string) {
    const completed = getCompletedFlows();
    if (!completed.includes(flowId)) {
        completed.push(flowId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
}

export function resetTutorialProgress() {
    localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// CONTEXT
// ============================================

interface TutorialContextValue {
    isActive: boolean;
    currentFlow: TutorialFlow | null;
    currentStepIndex: number;
    completedFlows: string[];
    startFlow: (flowId: string) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipFlow: () => void;
    endFlow: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export const useInteractiveTutorial = () => {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error('useInteractiveTutorial must be used within InteractiveTutorialProvider');
    return ctx;
};

// ============================================
// PROVIDER
// ============================================

interface InteractiveTutorialProviderProps {
    children: React.ReactNode;
    onNavigate: (path: string) => void;
}

export const InteractiveTutorialProvider: React.FC<InteractiveTutorialProviderProps> = ({
    children,
    onNavigate,
}) => {
    const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedFlows, setCompletedFlows] = useState<string[]>(getCompletedFlows);

    const startFlow = useCallback((flowId: string) => {
        const flow = tutorialFlows.find(f => f.id === flowId);
        if (flow) {
            setCurrentFlow(flow);
            setCurrentStepIndex(0);
        }
    }, []);

    const nextStep = useCallback(() => {
        if (!currentFlow) return;
        if (currentStepIndex < currentFlow.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            // Flow completed
            markFlowCompleted(currentFlow.id);
            setCompletedFlows(getCompletedFlows());
            setCurrentFlow(null);
            setCurrentStepIndex(0);
        }
    }, [currentFlow, currentStepIndex]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex]);

    const skipFlow = useCallback(() => {
        setCurrentFlow(null);
        setCurrentStepIndex(0);
    }, []);

    const endFlow = useCallback(() => {
        if (currentFlow) {
            markFlowCompleted(currentFlow.id);
            setCompletedFlows(getCompletedFlows());
        }
        setCurrentFlow(null);
        setCurrentStepIndex(0);
    }, [currentFlow]);

    // Handle navigation
    const currentStep = currentFlow?.steps[currentStepIndex];
    useEffect(() => {
        if (!currentStep) return;
        if (currentStep.route && currentStep.action === 'navigate') {
            onNavigate(currentStep.route);
            const timer = setTimeout(nextStep, 600);
            return () => clearTimeout(timer);
        } else if (currentStep.route) {
            onNavigate(currentStep.route);
        }
    }, [currentStep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keyboard shortcuts
    useEffect(() => {
        if (!currentFlow) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') skipFlow();
            else if (e.key === 'ArrowRight') nextStep();
            else if (e.key === 'ArrowLeft') prevStep();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [currentFlow, nextStep, prevStep, skipFlow]);

    const value: TutorialContextValue = {
        isActive: !!currentFlow,
        currentFlow,
        currentStepIndex,
        completedFlows,
        startFlow,
        nextStep,
        prevStep,
        skipFlow,
        endFlow,
    };

    return (
        <TutorialContext.Provider value={value}>
            {children}
            {currentFlow && currentStep && currentStep.action !== 'navigate' && (
                <TutorialOverlay
                    step={currentStep}
                    stepIndex={currentStepIndex}
                    totalSteps={currentFlow.steps.length}
                    flowTitle={currentFlow.title}
                    isLastStep={currentStepIndex === currentFlow.steps.length - 1}
                    onNext={nextStep}
                    onPrev={prevStep}
                    onSkip={skipFlow}
                    onEnd={endFlow}
                />
            )}
        </TutorialContext.Provider>
    );
};

// ============================================
// OVERLAY COMPONENT
// ============================================

interface TutorialOverlayProps {
    step: GuidedStep;
    stepIndex: number;
    totalSteps: number;
    flowTitle: string;
    isLastStep: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    onEnd: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    step,
    stepIndex,
    totalSteps,
    flowTitle,
    isLastStep,
    onNext,
    onPrev,
    onSkip,
    onEnd,
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [targetFound, setTargetFound] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const observerRef = useRef<MutationObserver | null>(null);
    const clickListenerRef = useRef<(() => void) | null>(null);
    const hasScrolledRef = useRef(false);
    const rafRef = useRef<number | null>(null);

    // Find target element
    const findTarget = useCallback(() => {
        if (!step.target) {
            setTargetRect(null);
            setTargetFound(false);
            return false;
        }

        const selectors = step.target.split(',').map(s => s.trim());
        let element: Element | null = null;

        for (const selector of selectors) {
            try {
                element = document.querySelector(selector);
                if (element) break;
            } catch { /* skip invalid */ }
        }

        if (element) {
            const rect = element.getBoundingClientRect();
            // Only update if element is visible
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect(rect);
                setTargetFound(true);

                // Scroll into view only ONCE per step, and never for fixed/sticky
                // elements (their position is relative to the viewport, so trying to
                // center them causes the page to scroll endlessly).
                if (!hasScrolledRef.current) {
                    const pos = window.getComputedStyle(element).position;
                    const isPinned = pos === 'fixed' || pos === 'sticky';
                    const offscreen = rect.top < 80 || rect.bottom > window.innerHeight - 20;
                    if (!isPinned && offscreen) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    hasScrolledRef.current = true;
                }

                // Attach click listener for advanceOnTargetClick
                if (step.advanceOnTargetClick && !clickListenerRef.current) {
                    const handler = () => {
                        setTimeout(onNext, 200);
                    };
                    element.addEventListener('click', handler, { once: true });
                    clickListenerRef.current = () => element?.removeEventListener('click', handler);
                }
                return true;
            }
        }

        setTargetFound(false);
        setTargetRect(null);
        return false;
    }, [step.target, step.advanceOnTargetClick, onNext]);

    // Setup: find target, observe DOM, handle resize
    useEffect(() => {
        clickListenerRef.current = null;
        hasScrolledRef.current = false;
        
        const countTimer = setTimeout(() => {
            setCountdown(null);
        }, 0);

        // Throttled re-scan using requestAnimationFrame to avoid layout thrash
        const scheduleFind = () => {
            if (rafRef.current !== null) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                findTarget();
            });
        };

        // Delay to let page render after navigation
        const initTimer = setTimeout(findTarget, 600);

        // Observe DOM for lazy-loaded content (childList only; attributes cause
        // excessive triggering during animations)
        observerRef.current = new MutationObserver(scheduleFind);
        observerRef.current.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('resize', scheduleFind);
        window.addEventListener('scroll', scheduleFind, true);

        return () => {
            clearTimeout(countTimer);
            clearTimeout(initTimer);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            observerRef.current?.disconnect();
            window.removeEventListener('resize', scheduleFind);
            window.removeEventListener('scroll', scheduleFind, true);
            if (clickListenerRef.current) clickListenerRef.current();
        };
    }, [step.id, findTarget]);

    // Auto-advance with countdown
    useEffect(() => {
        if (!step.autoAdvanceMs) return;

        const totalSeconds = Math.ceil(step.autoAdvanceMs / 1000);
        
        const cTimer = setTimeout(() => {
            setCountdown(totalSeconds);
        }, 0);

        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev === null || prev <= 1) return null;
                return prev - 1;
            });
        }, 1000);

        autoAdvanceRef.current = setTimeout(onNext, step.autoAdvanceMs);

        return () => {
            clearTimeout(cTimer);
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [step.id, step.autoAdvanceMs, onNext]);

    const getActionIcon = () => {
        switch (step.action) {
            case 'click': return <MousePointerClick className="w-4 h-4" />;
            case 'observe': return <Eye className="w-4 h-4" />;
            case 'interact': return <Hand className="w-4 h-4" />;
            case 'scroll': return <Target className="w-4 h-4" />;
            default: return <Eye className="w-4 h-4" />;
        }
    };

    const getActionColor = () => {
        switch (step.action) {
            case 'click': return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30';
            case 'observe': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
            case 'interact': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
            default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/30';
        }
    };

    const getActionLabel = () => {
        switch (step.action) {
            case 'click': return '👆 Klik elemen yang berkedip';
            case 'observe': return '👀 Perhatikan area yang ditandai';
            case 'interact': return '✍️ Coba ketik atau interaksi';
            case 'scroll': return '📜 Scroll untuk melihat';
            default: return '';
        }
    };

    // Tooltip positioning
    const getTooltipStyle = (): React.CSSProperties => {
        if (!targetRect) {
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        const tw = 350;
        const th = 220;
        const gap = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let top = 0, left = 0;

        const pos = step.position || 'bottom';
        switch (pos) {
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + targetRect.width / 2 - tw / 2;
                break;
            case 'top':
                top = targetRect.top - th - gap;
                left = targetRect.left + targetRect.width / 2 - tw / 2;
                break;
            case 'right':
                top = targetRect.top + targetRect.height / 2 - th / 2;
                left = targetRect.right + gap;
                break;
            case 'left':
                top = targetRect.top + targetRect.height / 2 - th / 2;
                left = targetRect.left - tw - gap;
                break;
            default:
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        // Fallback if off-screen
        if (left + tw > vw - 12) left = vw - tw - 12;
        if (left < 12) left = 12;
        if (top + th > vh - 12) top = targetRect.top - th - gap;
        if (top < 12) top = 12;

        return { top, left };
    };

    const progress = ((stepIndex + 1) / totalSteps) * 100;
    const displayInstruction = !targetFound && step.fallbackInstruction
        ? step.fallbackInstruction
        : step.instruction;

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none" role="dialog" aria-modal="true" aria-label="Tutorial interaktif">
            {targetRect && targetFound ? (
                <>
                    {/* Spotlight: the box-shadow creates the dark overlay AND the bright cutout in one element */}
                    <div
                        className="absolute pointer-events-none transition-all duration-500 ease-out"
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            borderRadius: '14px',
                            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
                        }}
                    />

                    {/* Glowing animated ring around the target */}
                    <div
                        className={`absolute pointer-events-none rounded-2xl transition-all duration-500 ease-out tutorial-spotlight-ring tutorial-ring-${step.action}`}
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                        }}
                    />

                    {/* Animated pointer hint for click/interact actions */}
                    {(step.action === 'click' || step.action === 'interact') && (
                        <div
                            className="absolute pointer-events-none z-10 tutorial-hand-pointer"
                            style={{
                                top: targetRect.bottom - 4,
                                left: targetRect.left + targetRect.width / 2 - 12,
                            }}
                        >
                            <MousePointerClick className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="rgba(99,102,241,0.9)" />
                        </div>
                    )}

                    {/* Clickable transparent area over target so user can interact with it */}
                    <div
                        className="absolute pointer-events-auto cursor-pointer"
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                        }}
                    />
                </>
            ) : (
                /* No target found yet: light dim that lets user interact with the page
                   so they can perform the action needed for the target to appear.
                   pointer-events-none means clicks pass through to the page. */
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(15, 23, 42, 0.35)' }} />
            )}


            {/* Tooltip Card */}
            <div
                className="absolute w-[350px] max-w-[calc(100vw-24px)] pointer-events-auto transition-all duration-500 ease-out"
                style={getTooltipStyle()}
            >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/20 border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{tutorialFlows.find(f => f.title === flowTitle)?.icon || '📖'}</span>
                            <span className="text-white/90 text-xs font-semibold truncate">{flowTitle}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-white/60 text-xxs font-mono">{stepIndex + 1}/{totalSteps}</span>
                            <button
                                onClick={onSkip}
                                className="p-1 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                                aria-label="Tutup tutorial (Esc)"
                                title="Tutup (Esc)"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        {/* Step title & instruction */}
                        <div className="flex items-start gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getActionColor()}`}>
                                {getActionIcon()}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{step.title}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{displayInstruction}</p>
                            </div>
                        </div>

                        {/* Action hint badge */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 mb-3">
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{getActionLabel()}</span>
                            {countdown !== null && (
                                <span className="flex items-center gap-1 text-xxs text-slate-400 font-mono">
                                    <Timer className="w-3 h-3" />
                                    {countdown}s
                                </span>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onPrev}
                                disabled={stepIndex === 0}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Kembali
                            </button>

                            <div className="flex items-center gap-2">
                                {step.advanceOnTargetClick && (
                                    <button
                                        onClick={onNext}
                                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        <SkipForward className="w-3 h-3" />
                                        Lewati
                                    </button>
                                )}
                                {!step.advanceOnTargetClick && (
                                    <Button
                                        onClick={isLastStep ? onEnd : onNext}
                                        size="sm"
                                        className="text-xs px-3 py-1.5 h-auto min-w-0"
                                    >
                                        {isLastStep ? (
                                            <>
                                                <Trophy className="w-3.5 h-3.5 mr-1" />
                                                Selesai!
                                            </>
                                        ) : (
                                            <>
                                                Lanjut
                                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Keyboard hint */}
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-center gap-3 text-xxs text-slate-400">
                            <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> ← → navigasi</span>
                            <span>Esc tutup</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Completion celebration */}
            {isLastStep && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-bold">Langkah terakhir! 🎉</span>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

// ============================================
// TUTORIAL PICKER
// ============================================

interface TutorialPickerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialPicker: React.FC<TutorialPickerProps> = ({ isOpen, onClose }) => {
    const { startFlow, completedFlows } = useInteractiveTutorial();
    const [filter, setFilter] = useState<'semua' | 'dasar' | 'lanjutan'>('semua');

    const handleStart = (flowId: string) => {
        onClose();
        setTimeout(() => startFlow(flowId), 250);
    };

    const handleReset = () => {
        resetTutorialProgress();
        window.location.reload();
    };

    const filteredFlows = tutorialFlows.filter(f => filter === 'semua' || f.category === filter);
    const completedCount = completedFlows.length;
    const totalCount = tutorialFlows.length;

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Pilih Tutorial Praktik"
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Tutorial Praktik</h2>
                                <p className="text-white/70 text-xs">Belajar langsung di halaman asli</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            aria-label="Tutup"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress summary */}
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2">
                        <div className="flex-1">
                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-500"
                                    style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-xs font-medium text-white/80">{completedCount}/{totalCount} selesai</span>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="px-4 pt-3 pb-2 flex gap-2 border-b border-slate-100 dark:border-slate-700">
                    {(['semua', 'dasar', 'lanjutan'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filter === tab
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            {tab === 'semua' ? 'Semua' : tab === 'dasar' ? '⭐ Dasar' : '🚀 Lanjutan'}
                        </button>
                    ))}
                </div>

                {/* Tutorial list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {filteredFlows.map((flow) => {
                        const isCompleted = completedFlows.includes(flow.id);
                        return (
                            <button
                                key={flow.id}
                                onClick={() => handleStart(flow.id)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left group ${
                                    isCompleted
                                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : flow.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isCompleted ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-white'}`}>
                                        {flow.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{flow.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-xxs text-slate-400 font-medium">{flow.steps.length} langkah</span>
                                    {isCompleted ? (
                                        <span className="text-xxs text-emerald-500 font-medium flex items-center gap-0.5">
                                            <RotateCcw className="w-2.5 h-2.5" /> Ulangi
                                        </span>
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <p className="text-xxs text-slate-400 flex items-center gap-1.5">
                        <MousePointerClick className="w-3 h-3" />
                        Praktik langsung di halaman asli
                    </p>
                    {completedCount > 0 && (
                        <button
                            onClick={handleReset}
                            className="text-xxs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset progress
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InteractiveTutorialProvider;
