import React from 'react';
import {
    Search,
    X,
    ChevronRight,
    GraduationCap,
    MessageCircle,
    BookOpen,
    Phone,
    Mail,
    Smartphone,
    ExternalLink,
} from 'lucide-react';
import type { GuideCategory, SimpleGuide, FAQItem } from '../types';
import { categoryTabs } from '../data/helpGuidesData';

interface HelpHomeViewProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
    searchInputRef: React.RefObject<HTMLInputElement>;
    activeCategory: GuideCategory;
    onSelectCategory: (cat: GuideCategory) => void;
    filteredGuides: SimpleGuide[];
    filteredFaqs: FAQItem[];
    expandedFaq: string | null;
    onToggleFaq: (faqId: string) => void;
    onSelectGuide: (guide: SimpleGuide) => void;
    onCloseCenter: () => void;
}

export const HelpHomeView: React.FC<HelpHomeViewProps> = ({
    searchQuery,
    onSearchChange,
    onClearSearch,
    searchInputRef,
    activeCategory,
    onSelectCategory,
    filteredGuides,
    filteredFaqs,
    expandedFaq,
    onToggleFaq,
    onSelectGuide,
    onCloseCenter,
}) => {
    const appVersion = '2.5.0';
    const supportLinkClasses = 'flex items-center gap-3 rounded-2xl p-3 transition-colors';
    const supportPanelClasses = 'rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50';

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Cari panduan... (tekan / untuk fokus)"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    aria-label="Cari panduan"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        aria-label="Hapus pencarian panduan"
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                    >
                        <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
                {categoryTabs.map((tab) => (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={() => onSelectCategory(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                            activeCategory === tab.id
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tutorial Interactive Banner */}
            {!searchQuery && activeCategory === 'semua' && (
                <button
                    type="button"
                    onClick={() => {
                        onCloseCenter();
                        document.dispatchEvent(new CustomEvent('open-tutorial-picker'));
                    }}
                    className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left group border border-brand-400/20 cursor-pointer"
                >
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors shadow-inner">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-white">
                        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                            Tutorial Praktik Interaktif
                            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">
                                Baru
                            </span>
                        </h3>
                        <p className="text-white/80 text-sm">
                            Belajar langsung dengan simulasi step-by-step di halaman asli.
                        </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                </button>
            )}

            {/* Welcome Message */}
            {!searchQuery && activeCategory === 'semua' && (
                <div className="text-center p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
                    <div className="text-4xl mb-3">👋</div>
                    <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-2">
                        Selamat Datang, Bapak/Ibu Guru!
                    </h3>
                    <p className="text-amber-700 dark:text-amber-500">
                        Pilih panduan di bawah ini untuk belajar menggunakan aplikasi.
                        <br />
                        Semua langkah dijelaskan dengan <strong>bahasa yang mudah</strong>.
                    </p>
                </div>
            )}

            {/* FAQ Section */}
            {(activeCategory === 'faq' || activeCategory === 'semua') && (
                <div className="space-y-3">
                    {activeCategory === 'semua' && (
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-brand-500" />
                            Pertanyaan Umum
                        </h3>
                    )}
                    <div className="space-y-2">
                        {filteredFaqs.slice(0, activeCategory === 'semua' ? 3 : undefined).map((faq) => (
                            <div
                                key={faq.id}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
                            >
                                <button
                                    type="button"
                                    onClick={() => onToggleFaq(faq.id)}
                                    className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                >
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {faq.question}
                                    </span>
                                    <ChevronRight
                                        className={`w-5 h-5 text-slate-400 transition-transform ${
                                            expandedFaq === faq.id ? 'rotate-90' : ''
                                        }`}
                                    />
                                </button>
                                {expandedFaq === faq.id && (
                                    <div className="px-4 pb-4 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {activeCategory === 'semua' && filteredFaqs.length > 3 && (
                        <button
                            type="button"
                            onClick={() => onSelectCategory('faq')}
                            className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline cursor-pointer"
                        >
                            Lihat semua FAQ →
                        </button>
                    )}
                </div>
            )}

            {/* Guide Cards */}
            {activeCategory !== 'faq' && filteredGuides.length > 0 && (
                <div className="space-y-3">
                    {activeCategory === 'semua' && (
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-brand-500" />
                            Panduan Lengkap
                        </h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredGuides.map((guide) => (
                            <button
                                type="button"
                                key={guide.id}
                                onClick={() => onSelectGuide(guide)}
                                className={`p-6 rounded-2xl ${guide.bgColor} border-2 border-transparent hover:border-current transition-all text-left group hover:shadow-lg hover:-translate-y-1 cursor-pointer`}
                            >
                                <div className={`${guide.color} mb-4`}>{guide.icon}</div>
                                <h3 className={`font-bold ${guide.color} text-lg mb-2`}>
                                    {guide.title}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    {guide.steps.length} langkah mudah
                                </p>
                                <div className="flex items-center gap-1 mt-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                    <span className="text-sm font-medium">Mulai Belajar</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* No Results */}
            {searchQuery &&
                filteredGuides.length === 0 &&
                (activeCategory !== 'faq' || filteredFaqs.length === 0) && (
                    <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Tidak ada hasil untuk "{searchQuery}"</p>
                        <p className="text-sm mt-1">Coba kata kunci lain atau cek ejaan</p>
                    </div>
                )}

            {/* Contact Support */}
            <div className={`p-6 ${supportPanelClasses}`}>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Butuh Bantuan Lebih Lanjut?
                </h3>
                <div className="space-y-3 text-slate-600 dark:text-slate-400">
                    <a
                        href="https://wa.me/6281234567890?text=Halo%2C%20saya%20butuh%20bantuan%20menggunakan%20Portal%20Guru"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${supportLinkClasses} bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30`}
                    >
                        <MessageCircle className="w-5 h-5 text-emerald-500" />
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            Chat WhatsApp Support
                        </span>
                        <ExternalLink className="w-4 h-4 ml-auto text-emerald-500" />
                    </a>
                    <p className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <span>support@portalguru.com</span>
                    </p>
                    <p className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-purple-500" />
                        <span>Versi Aplikasi: {appVersion}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
