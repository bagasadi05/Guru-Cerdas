import { ClipboardPenIcon } from '../../../Icons';
import { InputMode } from '../types';
import { inputCards, exportCards } from '../constants';

export const Step1_ModeSelection: React.FC<{ handleModeSelect: (mode: InputMode) => void }> = ({ handleModeSelect }) => (
    <div className="w-full max-w-7xl mx-auto space-y-12 animate-fade-in-up pb-12">
        <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-10 md:p-14 shadow-2xl shadow-green-500/20">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-emerald-500/30 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-green-500/30 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left z-10">
                <div className="flex-shrink-0 group">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-3xl flex items-center justify-center border border-white/30 shadow-lg ring-1 ring-white/30 backdrop-blur-md group-hover:scale-105 transition-transform duration-500">
                        <ClipboardPenIcon className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                    </div>
                </div>
                <div className="flex-1 space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight font-serif drop-shadow-sm">
                        Pusat Input Cerdas
                    </h1>
                    <p className="text-lg md:text-xl text-green-100 leading-relaxed max-w-3xl mx-auto md:mx-0 font-light tracking-wide">
                        Efisiensi tingkat lanjut untuk pengelolaan data akademik. Pilih modul aksi untuk memulai proses massal.
                    </p>
                </div>
            </div>
        </header>

        {/* Input Section */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white px-2 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-green-500 rounded-full"></span>
                Input & Kelola Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {inputCards.map((card, index) => (
                    <div key={card.mode} onClick={() => handleModeSelect(card.mode)}
                        className="group relative overflow-hidden bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-500/50 hover:shadow-xl hover:shadow-green-500/10 dark:hover:shadow-green-500/20 shadow-sm"
                        style={{ animationDelay: `${index * 100}ms` }}>

                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 dark:from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 flex flex-col items-start space-y-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/30 rounded-xl flex items-center justify-center border border-green-200 dark:border-green-800/50 group-hover:scale-110 transition-transform duration-500">
                                <card.icon className="w-7 h-7 text-green-600 dark:text-green-300 group-hover:text-green-700 dark:group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 tracking-wide">{card.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{card.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Export Section */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white px-2 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-blue-500 rounded-full"></span>
                Laporan & Ekspor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {exportCards.map((card, index) => (
                    <div key={card.mode} onClick={() => handleModeSelect(card.mode)}
                        className="group relative overflow-hidden bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 shadow-sm"
                        style={{ animationDelay: `${(index + inputCards.length) * 100}ms` }}>

                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 dark:from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 flex flex-col items-start space-y-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/30 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-800/50 group-hover:scale-110 transition-transform duration-500">
                                <card.icon className="w-7 h-7 text-blue-600 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 tracking-wide">{card.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{card.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    </div>
);
