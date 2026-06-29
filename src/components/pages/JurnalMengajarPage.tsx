import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, FileText, Plus, RefreshCw, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTeachingJournals, useDeleteJournal } from '../../hooks/useTeachingJournals';
import { isTeachingJournalsBackendMissing } from '../../utils/journalBackend';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../../hooks/useToast';
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

  // 1) Active classes (for filter dropdown).
  const { data: classes = [] } = useQuery<ClassOption[]>({
    queryKey: ['classes', 'active_for_journal_filter', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .is('deleted_at', null)
        .eq('is_archived', false)
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return (data || []) as ClassOption[];
    },
    enabled: !!user,
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

    if (classId || subject || date || scheduleId) {
      setTimeout(() => {
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
    }
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white font-serif">
            Jurnal Mengajar
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Catat dan tinjau agenda KBM harian per kelas dan mata pelajaran.
          </p>
        </div>
        {!backendMissing && (
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl shadow-lg shadow-emerald-500/20"
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

        <TabsContent value="jurnal-harian" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-2xl">
            <CardHeader 
              className="flex flex-row items-center justify-between gap-2 cursor-pointer md:cursor-default"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Filter</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
                  Saring daftar jurnal berdasarkan kelas, mata pelajaran, dan rentang tanggal.
                </p>
              </div>
              <button 
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={isFilterExpanded ? 'Tutup filter' : 'Buka filter'}
              >
                <svg className={`w-5 h-5 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </CardHeader>
            <CardContent className={`${isFilterExpanded ? 'block' : 'hidden'} md:block`}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Kelas
                  </label>
                  <Select
                    value={filters.classId ?? ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        classId: e.target.value || undefined,
                      }))
                    }
                    aria-label="Filter kelas"
                  >
                    <option value="">Semua kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Mode Tanggal
                  </label>
                  <Select
                    value={dateMode}
                    onChange={(e) => setDateMode(e.target.value as 'range' | 'single' | 'month')}
                    aria-label="Mode filter tanggal"
                  >
                    <option value="range">Rentang tanggal</option>
                    <option value="single">Tanggal tunggal</option>
                    <option value="month">Pilih bulan</option>
                  </Select>
                </div>

                {dateMode === 'range' ? (
                  <>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
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
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
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

                <div className="md:col-span-6 flex items-end justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="rounded-xl"
                    aria-label="Reset filter"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <section aria-label="Daftar jurnal mengajar">
            {loadingJournals ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Card key={i} className="rounded-2xl">
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError && !backendMissing ? (
              <Card className="rounded-2xl border-rose-200 dark:border-rose-900/40">
                <CardContent className="p-6">
                  <div className="text-rose-600 dark:text-rose-300 text-sm">
                    Gagal memuat jurnal: {error instanceof Error ? error.message : String(error)}
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
                      <RefreshCw className="w-4 h-4 mr-2" /> Coba lagi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : journals.length === 0 ? (
              <EmptyState
                variant="card"
                className="rounded-2xl"
                icon={<BookOpen className="w-8 h-8" />}
                title="Belum Ada Jurnal"
                description="Tidak ada jurnal yang cocok dengan filter saat ini. Coba ubah filter atau tambah jurnal baru."
                actionLabel="Tambah Jurnal"
                onAction={handleOpenAdd}
              />
            ) : (
              <div className="space-y-3" aria-busy={isFetching}>
                {journals.map((j) => {
                  const className = j.class_id ? classMap.get(j.class_id) ?? 'Kelas tidak diketahui' : 'Tanpa kelas';
                  const activities = j.activities;
                  return (
                    <Card key={j.id} className="rounded-2xl">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatIdDate(j.date)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {className}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{j.subject}</span>
                              {typeof j.meeting_number === 'number' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>Pertemuan ke-{j.meeting_number}</span>
                                </>
                              )}
                            </div>
                            <h3 className="mt-1.5 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                              {j.topic}
                            </h3>
                            {activities && (
                              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                <MarkdownText text={activities} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {j.attachment_url ? (
                              <a
                                href={j.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 transition-colors"
                                aria-label="Buka lampiran"
                                title="Buka lampiran"
                              >
                                <FileText className="w-3.5 h-3.5" /> Lampiran
                              </a>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60"
                                aria-label="Tanpa lampiran"
                                title="Tanpa lampiran"
                              >
                                <FileText className="w-3.5 h-3.5" /> Tanpa lampiran
                              </span>
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
                      </CardContent>
                    </Card>
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
