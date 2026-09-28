import React from 'react';
import { CalendarIcon, ClipboardPenIcon, BookOpenIcon, ArrowRight, Sparkles, CheckCircle2, Clock } from 'lucide-react';

export type ScheduleSubMenuKey = 'mengajar' | 'ph' | 'jurnal';

interface ScheduleHubMenuProps {
  onSelectMenu: (key: ScheduleSubMenuKey) => void;
  scheduleCount: number;
  todayPhCount: number;
  classesCount: number;
}

export const ScheduleHubMenu: React.FC<ScheduleHubMenuProps> = ({
  onSelectMenu,
  scheduleCount,
  todayPhCount,
  classesCount,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Hub */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/60 border border-emerald-500/30 dark:border-emerald-500/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-2 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00d284] animate-pulse shrink-0" />
          <span>Menu Utama Jadwal & Agenda</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif">
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-slate-900 via-emerald-800 to-emerald-700 dark:from-white dark:via-emerald-100 dark:to-[#00d284] bg-clip-text text-transparent">
              Jadwal & Jurnal Mengajar
            </span>
            <span className="absolute left-0 bottom-0.5 sm:bottom-1 w-full h-[5px] sm:h-[6px] bg-emerald-500/20 dark:bg-emerald-500/30 rounded-full -z-0 blur-[1px]" />
          </span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl font-sans">
          Pilih agenda yang ingin Bapak/Ibu kelola: susun jadwal mengajar mingguan, jadwalkan ulangan harian (PH), atau isi catatan jurnal mengajar harian.
        </p>
      </div>

      {/* 3 Main Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {/* Card 1: Jadwal Mengajar */}
        <div
          onClick={() => onSelectMenu('mengajar')}
          className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-sm">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800/70">
                {scheduleCount > 0 ? `${scheduleCount} Jam Mengajar` : 'Jadwal Pelajaran'}
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Jadwal Mengajar
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Atur jam pelajaran di tiap kelas, pantau jadwal harian atau mingguan, dan hindari jam bentrok secara otomatis.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Tampilan Harian & Mingguan Mudah Dibaca</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Peringatan Otomatis Jika Jam Bentrok</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Bantuan AI untuk Periksa Beban Mengajar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Bisa Simpan ke Kalender HP & Cetak PDF</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3">
            <button
              type="button"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl sm:rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/30 active:scale-[0.99]"
            >
              <span>Buka Jadwal Mengajar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 2: Jadwal PH */}
        <div
          onClick={() => onSelectMenu('ph')}
          className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-sm">
                <ClipboardPenIcon className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800/70">
                {todayPhCount > 0 ? `${todayPhCount} PH Hari Ini` : 'Agenda Ulangan'}
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Jadwal PH
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Jadwalkan ulangan harian per kelas, catat materi yang diujikan, dan langsung masukkan nilai saat ulangan selesai.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Agenda Ulangan Harian Tertata Rapi</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Catat Bab & Kisi-kisi Materi Ujian</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Saring Berdasarkan Kelas & Bulan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Langsung Terhubung ke Input Nilai Siswa</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3">
            <button
              type="button"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/30 active:scale-[0.99]"
            >
              <span>Buka Jadwal PH</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 3: Jurnal Mengajar */}
        <div
          onClick={() => onSelectMenu('jurnal')}
          className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform shadow-sm">
                <BookOpenIcon className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-800/70">
                Catatan KBM Harian
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Jurnal Mengajar
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Catat materi yang diajarkan, absensi kelas, kejadian penting saat KBM, dan tindak lanjut untuk pertemuan berikutnya.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Catat Materi & Absensi dengan Praktis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Tulis Catatan Kejadian Penting di Kelas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Rekap Jurnal Mingguan & Bulanan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Otomatis Mengisi Data dari Jadwal Kelas</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3">
            <button
              type="button"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl sm:rounded-2xl bg-sky-600 group-hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all group-hover:shadow-lg group-hover:shadow-sky-500/30 active:scale-[0.99]"
            >
              <span>Buka Jurnal Mengajar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Footnote */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {classesCount > 0 ? `${classesCount} kelas aktif terdaftar.` : 'Data jadwal dan jurnal tersimpan otomatis.'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Tips: Bapak/Ibu juga bisa berpindah menu kapan saja lewat tab navigasi di bagian atas halaman.</span>
        </div>
      </div>
    </div>
  );
};
