/**
 * Simple Help Guide for Senior Teachers
 * 
 * Fitur bantuan yang sangat sederhana dan mudah dipahami
 * dengan gambar besar, teks jelas, dan langkah-langkah simple
 */

import React, { useState } from 'react';
import {
    HelpCircle,
    X,
    ChevronRight,
    ChevronLeft,
    CheckCircle,
    ClipboardCheck,
    Users,
    BookOpen,
    Calendar,
    Phone,
    Mail,
    Lightbulb,
    Star,
    ZoomIn,
    ZoomOut
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface SimpleGuide {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    steps: {
        title: string;
        description: string;
        tip?: string;
        image?: string; // URL ke gambar tutorial
    }[];
}

// ============================================
// GUIDE DATA - Bahasa yang sangat sederhana
// ============================================

const simpleGuides: SimpleGuide[] = [
    {
        id: 'absensi',
        title: '📋 Cara Isi Absensi',
        icon: <ClipboardCheck className="w-8 h-8" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        steps: [
            {
                title: '1️⃣ Buka Menu Absensi',
                description: 'Klik tulisan "Rekap Absensi" di sebelah kiri layar. Ada gambar kalender di sebelahnya.',
                tip: 'Kalau pakai HP, tekan tombol menu (☰) dulu di pojok kiri atas.'
            },
            {
                title: '2️⃣ Pilih Kelas',
                description: 'Di bagian atas, ada kotak pilihan. Klik dan pilih kelas yang mau diabsen. Contoh: "Kelas 7A"',
                tip: 'Tanggal otomatis hari ini. Tidak perlu diubah.'
            },
            {
                title: '3️⃣ Tandai Kehadiran',
                description: 'Untuk setiap nama siswa, klik tombol:\n• H = Hadir (hijau)\n• I = Izin (biru)\n• S = Sakit (kuning)\n• A = Alpha/Tidak hadir (merah)',
                tip: 'Klik tombol "H" untuk siswa yang hadir.'
            },
            {
                title: '4️⃣ Selesai!',
                description: 'Data otomatis tersimpan. Anda bisa lihat rekap kehadiran di bawahnya.',
                tip: 'Salah pilih? Klik tombol lain untuk mengubahnya.'
            }
        ]
    },
    {
        id: 'siswa',
        title: '👨‍🎓 Cara Lihat Data Siswa',
        icon: <Users className="w-8 h-8" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        steps: [
            {
                title: '1️⃣ Buka Menu Siswa',
                description: 'Klik tulisan "Data Siswa" di sebelah kiri layar. Ada gambar orang-orang di sebelahnya.',
            },
            {
                title: '2️⃣ Cari Nama Siswa',
                description: 'Di bagian atas ada kotak pencarian. Ketik nama siswa yang dicari.',
                tip: 'Contoh: Ketik "Budi" untuk mencari siswa bernama Budi.'
            },
            {
                title: '3️⃣ Klik Nama Siswa',
                description: 'Klik nama siswa yang muncul untuk melihat data lengkapnya: nilai, kehadiran, dan informasi lainnya.',
            },
            {
                title: '4️⃣ Selesai!',
                description: 'Anda bisa lihat semua data siswa di halaman ini.',
            }
        ]
    },
    {
        id: 'nilai',
        title: '📝 Cara Input Nilai',
        icon: <BookOpen className="w-8 h-8" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        steps: [
            {
                title: '1️⃣ Buka Input Nilai',
                description: 'Klik tulisan "Input Cepat" di menu sebelah kiri.',
            },
            {
                title: '2️⃣ Pilih Kelas dan Mapel',
                description: 'Pilih kelas (contoh: 7A) dan mata pelajaran (contoh: Matematika).',
            },
            {
                title: '3️⃣ Isi Nilai',
                description: 'Ketik nilai di kotak sebelah nama siswa. Contoh: 85',
                tip: 'Nilai 0-100. Tekan tombol Tab untuk pindah ke siswa berikutnya.'
            },
            {
                title: '4️⃣ Simpan',
                description: 'Klik tombol "Simpan" di bagian bawah.',
                tip: 'Tunggu sampai muncul tulisan "Tersimpan".'
            }
        ]
    },
    {
        id: 'jadwal',
        title: '📅 Cara Lihat Jadwal',
        icon: <Calendar className="w-8 h-8" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        steps: [
            {
                title: '1️⃣ Buka Menu Jadwal',
                description: 'Klik tulisan "Jadwal" di sebelah kiri layar.',
            },
            {
                title: '2️⃣ Lihat Jadwal Hari Ini',
                description: 'Di Dashboard (beranda), jadwal hari ini sudah terlihat di sebelah kanan.',
            },
            {
                title: '3️⃣ Tambah Jadwal Baru',
                description: 'Klik tombol "+ Tambah Jadwal" untuk menambah jadwal baru.',
                tip: 'Isi hari, jam mulai, jam selesai, mata pelajaran, dan kelas.'
            }
        ]
    },
    {
        id: 'tugas',
        title: '📚 Cara Buat Tugas',
        icon: <ClipboardCheck className="w-8 h-8" />,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        steps: [
            {
                title: '1️⃣ Buka Menu Tugas',
                description: 'Klik menu "Tugas" atau "Tugas & PR" di sebelah kiri.',
                image: '/images/tutorials/create-task.png'
            },
            {
                title: '2️⃣ Klik Tambah Tugas',
                description: 'Tekan tombol "+ Buat Tugas Baru" di pojok kanan atas.',
            },
            {
                title: '3️⃣ Isi Detail Tugas',
                description: 'Tulis Judul Tugas (misal: "PR Matematika Bab 1") dan deskripsinya. Jangan lupa pilih kelas dan tanggal pengumpulan.',
                tip: 'Anda bisa melampirkan file soal jika ada.',
                image: '/images/tutorials/create-task.png'
            },
            {
                title: '4️⃣ Simpan',
                description: 'Klik tombol "Simpan Tugas" untuk mengirim ke siswa.',
            }
        ]
    },
    {
        id: 'laporan',
        title: '📊 Cara Cetak Rapot',
        icon: <CheckCircle className="w-8 h-8" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        steps: [
            {
                title: '1️⃣ Masuk ke Data Siswa',
                description: 'Pilih kelas yang ingin dicetak rapotnya di menu "Data Siswa".',
                image: '/images/tutorials/attendance.png'
            },
            {
                title: '2️⃣ Pilih Siswa',
                description: 'Klik nama siswa untuk membuka profilnya.',
            },
            {
                title: '3️⃣ Klik Tombol Cetak',
                description: 'Di halaman profil siswa, cari tombol "Cetak Rapot" di bagian atas atau bawah.',
            },
            {
                title: '4️⃣ Simpan PDF',
                description: 'Rapot akan terbuka. Anda bisa download sebagai PDF atau langsung print.',
                tip: 'Pastikan semua nilai sudah diisi sebelum mencetak.'
            }
        ]
    },
    {
        id: 'pengaturan',
        title: '⚙️ Pengaturan & Profil',
        icon: <Users className="w-8 h-8" />, // Using generic user icon
        color: 'text-slate-600',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        steps: [
            {
                title: '1️⃣ Buka Pengaturan',
                description: 'Klik menu "Pengaturan" (gambar gerigi) di paling bawah menu kiri.',
            },
            {
                title: '2️⃣ Ubah Profil',
                description: 'Anda bisa ganti Foto, Nama, dan Password di sini.',
            },
            {
                title: '3️⃣ Mode Gelap/Terang',
                description: 'Ingin tampilan lebih nyaman di mata? Aktifkan "Mode Gelap".',
            },
            {
                title: '4️⃣ Simpan Perubahan',
                description: 'Jangan lupa klik tombol Simpan jika sudah selesai mengubah data.',
            }
        ]
    }
];

// ============================================
// MAIN COMPONENT
// ============================================

interface SimpleHelpCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SimpleHelpCenter: React.FC<SimpleHelpCenterProps> = ({
    isOpen,
    onClose
}) => {
    const [selectedGuide, setSelectedGuide] = useState<SimpleGuide | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    const fontSizeClass = {
        normal: 'text-base',
        large: 'text-lg',
        xlarge: 'text-xl'
    }[fontSize];

    const handleNextStep = () => {
        if (selectedGuide && currentStep < selectedGuide.steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSelectGuide = (guide: SimpleGuide) => {
        setSelectedGuide(guide);
        setCurrentStep(0);
    };

    const handleBack = () => {
        setSelectedGuide(null);
        setCurrentStep(0);
    };

    const increaseFontSize = () => {
        if (fontSize === 'normal') setFontSize('large');
        else if (fontSize === 'large') setFontSize('xlarge');
    };

    const decreaseFontSize = () => {
        if (fontSize === 'xlarge') setFontSize('large');
        else if (fontSize === 'large') setFontSize('normal');
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${fontSizeClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {selectedGuide ? (
                                <button
                                    onClick={handleBack}
                                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                                    aria-label="Kembali"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            ) : (
                                <div className="p-2 rounded-xl bg-white/20">
                                    <HelpCircle className="w-6 h-6" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {selectedGuide ? selectedGuide.title : '📚 Pusat Bantuan'}
                                </h2>
                                <p className="text-white/80 text-sm">
                                    {selectedGuide
                                        ? `Langkah ${currentStep + 1} dari ${selectedGuide.steps.length}`
                                        : 'Panduan mudah untuk Bapak/Ibu Guru'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Font Size Controls */}
                            <button
                                onClick={decreaseFontSize}
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                aria-label="Perkecil teks"
                                disabled={fontSize === 'normal'}
                            >
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <button
                                onClick={increaseFontSize}
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                aria-label="Perbesar teks"
                                disabled={fontSize === 'xlarge'}
                            >
                                <ZoomIn className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedGuide ? (
                        // Guide Selection
                        <div className="space-y-6">
                            {/* Welcome Message */}
                            <div className="text-center p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
                                <div className="text-4xl mb-3">👋</div>
                                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-2">
                                    Selamat Datang, Bapak/Ibu Guru!
                                </h3>
                                <p className="text-amber-700 dark:text-amber-500">
                                    Pilih panduan di bawah ini untuk belajar menggunakan aplikasi.
                                    <br />Semua langkah dijelaskan dengan <strong>bahasa yang mudah</strong>.
                                </p>
                            </div>

                            {/* Guide Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {simpleGuides.map((guide) => (
                                    <button
                                        key={guide.id}
                                        onClick={() => handleSelectGuide(guide)}
                                        className={`p-6 rounded-2xl ${guide.bgColor} border-2 border-transparent hover:border-current transition-all text-left group hover:shadow-lg hover:-translate-y-1`}
                                    >
                                        <div className={`${guide.color} mb-4`}>
                                            {guide.icon}
                                        </div>
                                        <h3 className={`font-bold ${guide.color} text-lg mb-2`}>
                                            {guide.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                            {guide.steps.length} langkah mudah
                                        </p>
                                        <div className="flex items-center gap-1 mt-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                            <span className="text-sm font-medium">Mulai Belajar</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Contact Support */}
                            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Phone className="w-5 h-5" />
                                    Butuh Bantuan Lebih Lanjut?
                                </h3>
                                <div className="space-y-3 text-gray-600 dark:text-gray-400">
                                    <p className="flex items-center gap-3">
                                        <Phone className="w-5 h-5 text-green-500" />
                                        <span>Hubungi Admin Sekolah</span>
                                    </p>
                                    <p className="flex items-center gap-3">
                                        <Mail className="w-5 h-5 text-blue-500" />
                                        <span>Email: support@portaguru.com</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Step-by-Step Guide
                        <div className="space-y-6">
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2">
                                {selectedGuide.steps.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`flex-1 h-3 rounded-full transition-all ${index <= currentStep
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Current Step */}
                            <div className={`p-8 rounded-3xl ${selectedGuide.bgColor} border-2 ${selectedGuide.color.replace('text-', 'border-')}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${selectedGuide.color} bg-white dark:bg-gray-800 shadow-lg flex-shrink-0`}>
                                        {currentStep + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`text-2xl font-bold ${selectedGuide.color} mb-4`}>
                                            {selectedGuide.steps[currentStep].title}
                                        </h3>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-lg">
                                            {selectedGuide.steps[currentStep].description}
                                        </p>
                                    </div>
                                </div>

                                {/* Tip Box */}
                                {selectedGuide.steps[currentStep].tip && (
                                    <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-amber-300 dark:border-amber-600 flex items-start gap-3">
                                        <Lightbulb className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold text-amber-700 dark:text-amber-400">💡 Tips: </span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {selectedGuide.steps[currentStep].tip}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Tutorial Image */}
                                {selectedGuide.steps[currentStep].image && (
                                    <div className="mt-6">
                                        <button
                                            onClick={() => setEnlargedImage(selectedGuide.steps[currentStep].image!)}
                                            className="w-full relative group rounded-2xl overflow-hidden shadow-md border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all"
                                        >
                                            <img
                                                src={selectedGuide.steps[currentStep].image}
                                                alt="Panduan visual"
                                                className="w-full h-auto max-h-64 object-contain bg-slate-50 dark:bg-slate-900"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                    <ZoomIn className="w-4 h-4" />
                                                    Perbesar Gambar
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Completion Message */}
                            {currentStep === selectedGuide.steps.length - 1 && (
                                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-300 dark:border-green-700 text-center">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">
                                        🎉 Selamat! Anda sudah selesai belajar!
                                    </h3>
                                    <p className="text-green-600 dark:text-green-500">
                                        Silakan coba langsung di aplikasi. Semangat!
                                    </p>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between gap-4 pt-4">
                                <button
                                    onClick={handlePrevStep}
                                    disabled={currentStep === 0}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Kembali
                                </button>

                                {currentStep < selectedGuide.steps.length - 1 ? (
                                    <button
                                        onClick={handleNextStep}
                                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-colors font-semibold shadow-lg"
                                    >
                                        Lanjut
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-colors font-semibold shadow-lg"
                                    >
                                        <Star className="w-5 h-5" />
                                        Selesai
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tekan tombol <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-bold">?</kbd> kapan saja untuk membuka bantuan ini
                    </p>
                </div>
            </div>

            {/* Image Modal (Lightbox) */}
            {enlargedImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setEnlargedImage(null)}
                >
                    <button
                        onClick={() => setEnlargedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={enlargedImage}
                        alt="Panduan diperbesar"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-50 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

// ============================================
// FLOATING HELP BUTTON
// ============================================

interface FloatingHelpButtonProps {
    onClick: () => void;
}

export const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-2xl shadow-indigo-500/30 flex items-center justify-center hover:scale-110 transition-transform group"
            aria-label="Buka Pusat Bantuan"
        >
            <HelpCircle className="w-7 h-7" />

            {/* Tooltip */}
            <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Butuh Bantuan?
            </div>

            {/* Pulse Animation */}
            <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20" />
        </button>
    );
};
