import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, FileText, Plus, RefreshCw, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTeachingJournals, useDeleteJournal } from '../../hooks/useTeachingJournals';
import { isTeachingJournalsBackendMissing } from '../../utils/journalBackend';
import { supabase } from '../../services/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomDropdown } from '../ui/CustomDropdown';
import { Skeleton } from '../ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import type { TeachingJournal, TeachingJournalFilters } from '../../types/teachingJournal';
import { JournalForm } from './journal/JournalForm';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { MarkdownText } from '../ui/MarkdownText';

const JournalRekapPanel = React.lazy(() =>
  import('./journal/JournalRekapPanel')
    .then((m) => ({ default: m.JournalRekapPanel }))
    .catch(() => ({
      default: () => (
        <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          Panel rekapitulasi belum tersedia.
        </div>
      ),
    }))
) as React.ComponentType<{ filters: TeachingJournalFilters }>;

interface ClassOption {
  id: string;
  name: string;
}

const formatIdDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const JurnalMengajarPage: React.FC = () => {
  const { user, userRole } = useAuth();
  const [filters, setFilters] = useState<TeachingJournalFilters>({});
  const [searchParams, setSearchParams] = useSearchParams();

  const isGlobalRole = userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'admin';
  const [showAllTeachers, setShowAllTeachers] = useState(false);

  // Subjects derived from a small free-text input (case-insensitive contains).
  const [subjectInput, setSubjectInput] = useState<string>('');
  // Use date-range mode (default), a specific single date, or a specific month.
  const [dateMode, setDateMode] = useState<'range' | 'single' | 'month'>('range');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>('');
  const [monthInput, setMonthInput] = useState<string>(''); // YYYY-MM

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<TeachingJournal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [prefillValues, setPrefillValues] = useState<{
    class_id?: string;
    subject?: string;
    date?: string;
    schedule_id?: string;
  } | undefined>(undefined);

  // 1) Active classes (all active classes in the school for journal entry & filter).
  const { data: classes = [] } = useQuery<ClassOption[]>({
    queryKey: ['classes', 'active_for_journal_filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .is('deleted_at', null)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return (data || []) as ClassOption[];
    },
  });

  // 2) Journals.
  const queryFilters = useMemo<TeachingJournalFilters>(() => {
    const next: TeachingJournalFilters = {};
    if (filters.classId) next.classId = filters.classId;
    if (subjectInput.trim()) next.subject = subjectInput.trim();

    if (dateMode === 'single' && singleDate) {
      next.date = singleDate;
    } else if (dateMode === 'month' && monthInput) {
      const [yStr, mStr] = monthInput.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
        const lastDay = new Date(y, m, 0).getDate();
        next.startDate = `${monthInput}-01`;
        next.endDate = `${monthInput}-${String(lastDay).padStart(2, '0')}`;
      }
    } else if (dateMode === 'range') {
      if (startDate) next.startDate = startDate;
      if (endDate) next.endDate = endDate;
    }
    return next;
  }, [filters.classId, subjectInput, dateMode, singleDate, monthInput, startDate, endDate]);

  const {
    data: journals = [],
    isLoading: loadingJournals,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeachingJournals(queryFilters);

  const deleteJournal = useDeleteJournal(() => {
    setDeletingId(null);
  });

  const backendMissing = isTeachingJournalsBackendMissing(error);

  // Build a class-id -> name map locally (no extra query, just from classes list).
  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classes) m.set(c.id, c.name);
    return m;
  }, [classes]);

  // Check for search params to prefill and open modal
  useEffect(() => {
    const classId = searchParams.get('classId');
    const subject = searchParams.get('subject');
    const date = searchParams.get('date');
    const scheduleId = searchParams.get('scheduleId');

    if (!classId && !subject && !date && !scheduleId) return;
    const timer = setTimeout(() => {
      setPrefillValues({
        class_id: classId || undefined,
        subject: subject || undefined,
        date: date || undefined,
        schedule_id: scheduleId || undefined,
      });
      // Clear query params so reloading doesn't pop it open again
      setSearchParams({}, { replace: true });
      setSelectedJournal(null);
      setIsFormOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  const handleResetFilters = () => {
    setFilters({});
    setSubjectInput('');
    setStartDate('');
    setEndDate('');
    setSingleDate('');
    setMonthInput('');
    setDateMode('range');
  };

  const handleOpenAdd = () => {
    setSelectedJournal(null);
    setPrefillValues(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (journal: TeachingJournal) => {
    setPrefillValues(undefined);
    setSelectedJournal(journal);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    deleteJournal.mutate(confirmDeleteId, {
      onError: () => setDeletingId(null),
      onSettled: () => setConfirmDeleteId(null),
    });
  };

  return (
    <div className="w-full min-h-full p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 lg:pb-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-xl opacity-50 dark:opacity-20 rounded-full" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent font-serif relative">
            Jurnal Mengajar
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 relative">
            Catat dan tinjau agenda KBM harian per kelas dan mata pelajaran.
          </p>
        </div>
        {!backendMissing && (
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Jurnal
          </Button>
        )}
      </header>

      {backendMissing ? (
        <div className="p-6 rounded-2xl bg-amber-50/80 dark:bg-indigo-950/20 border border-amber-200 dark:border-indigo-800/30 flex items-start gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-amber-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              Fitur Jurnal Mengajar Belum Aktif
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Fitur Jurnal Mengajar belum aktif. Silakan jalankan migrasi database di Supabase (`20260621100000_create_teaching_journals.sql`) untuk mengaktifkannya.
            </p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="jurnal-harian" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="jurnal-harian">Jurnal Harian</TabsTrigger>
          <TabsTrigger value="rekap">Rekapitulasi</TabsTrigger>
        </TabsList>

        <TabsContent value="jurnal-harian" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          
          {/* Modern Filter Section */}
          <div className="relative group rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
            <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl overflow-hidden">
              <button
                type="button"
                className="flex flex-row items-center justify-between p-5 cursor-pointer select-none w-full text-left"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                aria-expanded={isFilterExpanded}
                aria-label={isFilterExpanded ? 'Tutup filter' : 'Buka filter'}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100/50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Filter Jurnal</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
                      Saring berdasarkan kelas, mapel, & tanggal
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(filters.classId || subjectInput || startDate || singleDate || monthInput) && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                  <span
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-hidden="true"
                  >
                    <svg className={`w-5 h-5 transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </button>

              <div className={`transition-all duration-500 ease-in-out ${isFilterExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Kelas
                      </label>
                  <CustomDropdown
                    value={filters.classId ?? ''}
                    onChange={(val) =>
                      setFilters((prev) => ({
                        ...prev,
                        classId: val || undefined,
                      }))
                    }
                    options={[
                      { value: '', label: 'Semua kelas' },
                      ...classes.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>

                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Mata Pelajaran
                      </label>
                  <Input
                    placeholder="cth: Matematika"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    aria-label="Filter mata pelajaran"
                  />
                </div>

                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Mode Tanggal
                      </label>
                  <CustomDropdown
                    value={dateMode}
                    onChange={(val) => setDateMode(val as 'range' | 'single' | 'month')}
                    options={[
                      { value: 'range', label: 'Rentang tanggal' },
                      { value: 'single', label: 'Tanggal tunggal' },
                      { value: 'month', label: 'Pilih bulan' },
                    ]}
                  />
                </div>

                    {dateMode === 'range' ? (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Dari
                          </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        aria-label="Tanggal mulai"
                      />
                    </div>
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Sampai
                          </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        aria-label="Tanggal akhir"
                      />
                    </div>
                      </>
                    ) : dateMode === 'single' ? (
                      <div className="md:col-span-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Tanggal
                        </label>
                    <Input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      aria-label="Tanggal tunggal"
                    />
                      </div>
                    ) : (
                      <div className="md:col-span-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Bulan
                        </label>
                    <Input
                      type="month"
                      value={monthInput}
                      onChange={(e) => setMonthInput(e.target.value)}
                      aria-label="Filter bulan"
                    />
                      </div>
                    )}

                    <div className="md:col-span-12 flex items-end justify-end gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <Button
                        variant="outline"
                        onClick={handleResetFilters}
                        className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="Reset filter"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset Filter
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section aria-label="Daftar jurnal mengajar">
            {loadingJournals ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-5">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-1/4 rounded-full" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError && !backendMissing ? (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10 p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 mb-1">Gagal memuat jurnal</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 mb-4">{error instanceof Error ? error.message : String(error)}</p>
                <Button variant="outline" onClick={() => refetch()} className="rounded-xl border-rose-200 hover:bg-rose-100 text-rose-700 dark:border-rose-800 dark:hover:bg-rose-800 dark:text-rose-300">
                  <RefreshCw className="w-4 h-4 mr-2" /> Coba lagi
                </Button>
              </div>
            ) : journals.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-10 flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 shadow-inner">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Belum Ada Jurnal</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                  Tidak ada jurnal yang cocok dengan filter saat ini. Coba ubah filter atau tambah jurnal baru.
                </p>
                <Button onClick={handleOpenAdd} className="rounded-xl shadow-lg shadow-emerald-500/20">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Jurnal
                </Button>
              </div>
            ) : (
              <div className="space-y-4 relative" aria-busy={isFetching}>
                {/* Timeline connector line for visual polish */}
                <div className="absolute left-6 top-6 bottom-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block z-0" />
                
                {journals.map((j) => {
                  const className = j.class_id ? classMap.get(j.class_id) ?? 'Kelas tidak diketahui' : 'Tanpa kelas';
                  const activities = j.activities;
                  return (
                    <div key={j.id} className="relative z-10 flex flex-col md:flex-row gap-4 group">
                      {/* Timeline dot */}
                      <div className="hidden md:flex flex-col items-center mt-6">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950 shadow-sm" />
                      </div>
                      
                      <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
                        {/* Subtle decorative gradient */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                <Calendar className="w-3 h-3" />
                                {formatIdDate(j.date)}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                {className}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                {j.subject}
                              </span>
                              {typeof j.meeting_number === 'number' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                  Pertemuan ke-{j.meeting_number}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                              {j.topic}
                            </h3>
                            {activities && (
                              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                <MarkdownText text={activities} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {j.attachment_url && (
                              <a
                                href={j.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-colors"
                                aria-label="Buka lampiran"
                                title="Buka lampiran"
                              >
                                <FileText className="w-4 h-4" />
                              </a>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg"
                              onClick={() => handleOpenEdit(j)}
                              aria-label="Edit Jurnal"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                              onClick={() => handleDelete(j.id)}
                              disabled={deleteJournal.isPending && deletingId === j.id}
                              aria-label="Hapus Jurnal"
                            >
                              {deleteJournal.isPending && deletingId === j.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </motion.div>
        </TabsContent>

        <TabsContent value="rekap">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {isGlobalRole && (
            <div className="flex items-center gap-2 mb-4 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
              <label className="text-sm font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center gap-2 w-full">
                <input 
                  type="checkbox" 
                  checked={showAllTeachers} 
                  onChange={(e) => setShowAllTeachers(e.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4"
                />
                Tampilkan Rekap Jurnal Seluruh Guru (Mode Supervisi)
              </label>
            </div>
          )}
          <React.Suspense
            fallback={
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            }
          >
            <JournalRekapPanel filters={{ ...queryFilters, allTeachers: showAllTeachers }} />
          </React.Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
      )}

      <JournalForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPrefillValues(undefined);
        }}
        journal={selectedJournal}
        classes={classes}
        prefillValues={prefillValues}
      />

      <ConfirmationDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Hapus Jurnal Mengajar"
        message="Apakah Anda yakin ingin menghapus jurnal mengajar ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        isPending={deleteJournal.isPending}
      />
    </div>
  );
};

export default JurnalMengajarPage;
