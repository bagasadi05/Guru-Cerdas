import { CalendarDays, LayoutGrid, List, Plus, Search, ArrowUpDown, Share2, Printer, Calendar, MoreHorizontal, MessageSquare, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomDropdown } from '../ui/CustomDropdown';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '../ui/DropdownMenu';
import type { usePhScheduleDomain } from './engine/usePhScheduleDomain';

interface Props {
    domain: ReturnType<typeof usePhScheduleDomain>;
    onPrint: () => void;
}

export function PhScheduleToolbar({ domain, onPrint }: Props) {
    const statuses = [
        { value: 'all', label: 'Semua', count: domain.statusCounts.all },
        { value: 'today', label: 'Hari ini', count: domain.statusCounts.today },
        { value: 'upcoming', label: 'Mendatang', count: domain.statusCounts.upcoming },
        { value: 'past', label: 'Lewat', count: domain.statusCounts.past },
    ] as const;

    const modes = [
        { value: 'weekly', label: 'Mingguan', icon: CalendarDays },
        { value: 'cards', label: 'Kartu', icon: LayoutGrid },
        { value: 'table', label: 'Tabel', icon: List },
    ] as const;

    const showClearFilters =
        (domain.searchQuery !== '' ||
            domain.statusFilter !== 'all' ||
            domain.selectedMonth !== 'all' ||
            domain.selectedSubject !== 'all') &&
        domain.filteredSchedules.length > 0;

    return (
        <section aria-label="Pengaturan jadwal ASH" className="space-y-2.5 sm:space-y-3.5 border-y border-slate-200 py-3 dark:border-slate-800">
            {/* ROW 1: Context (Class & Semester) & Primary Actions */}
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Class & Semester Pickers */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                    <div className="min-w-0 sm:w-56">
                        <CustomDropdown
                            aria-label="Pilih kelas ASH"
                            value={domain.effectiveClassId}
                            onChange={domain.handleSelectClass}
                            options={[...domain.classes].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' })).map((c) => ({ value: c.id, label: c.name }))}
                            placeholder="Pilih kelas"
                        />
                    </div>
                    <div className="min-w-0 sm:w-44">
                        <CustomDropdown
                            aria-label="Pilih semester ASH"
                            value={domain.selectedSemesterId}
                            onChange={domain.setSelectedSemesterId}
                            options={domain.semesterOptions}
                            placeholder="Pilih semester"
                        />
                    </div>
                </div>

                {/* Right: Action Buttons — full width on mobile so + Tambah ASH stretches cleanly */}
                <div className="flex w-full sm:w-auto items-center gap-2">
                    {domain.canAdd && (
                        <>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => domain.openAdd()}
                                title="Tambah jadwal ASH"
                                className="min-h-11 flex-1 sm:flex-initial justify-center gap-1.5 !px-3.5 !text-sm !bg-brand-700 hover:!bg-brand-800 text-white font-semibold rounded-xl shadow-xs"
                            >
                                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                                <span>Tambah ASH</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => domain.setIsBatchOpen(true)}
                                title="Tambahkan hingga 20 jadwal ASH dalam satu pengisian"
                                className="hidden sm:inline-flex min-h-11 gap-1.5 !px-3 !text-sm rounded-xl font-medium"
                            >
                                <Layers className="h-4 w-4 shrink-0" aria-hidden />
                                <span>Tambah Massal</span>
                            </Button>
                        </>
                    )}
                    <DropdownMenu>
                        <DropdownTrigger
                            aria-label="Pilihan berbagi jadwal ASH"
                            className="!min-h-11 !min-w-11 !h-11 !w-11 !p-0 !rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </DropdownTrigger>
                        <DropdownContent align="right" className="w-64 rounded-2xl p-1">
                            {domain.canAdd && (
                                <DropdownItem className="min-h-11 rounded-xl sm:hidden" onClick={() => domain.setIsBatchOpen(true)}>
                                    <Layers className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                                    <span>Tambah massal</span>
                                </DropdownItem>
                            )}
                            <DropdownItem className="min-h-11 rounded-xl" onClick={() => domain.setIsReportPreviewOpen(true)} disabled={!domain.effectiveClassId}>
                                <MessageSquare className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span>Pratinjau laporan WhatsApp</span>
                            </DropdownItem>
                            <DropdownItem className="min-h-11 rounded-xl" onClick={() => domain.setIsWaModalOpen(true)} disabled={!domain.rawSchedules.length}>
                                <Share2 className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span>Salin jadwal untuk WhatsApp</span>
                            </DropdownItem>
                            <DropdownItem className="min-h-11 rounded-xl" onClick={onPrint} disabled={!domain.rawSchedules.length}>
                                <Printer className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span>Cetak jadwal</span>
                            </DropdownItem>
                            <DropdownItem className="min-h-11 rounded-xl" onClick={domain.handleExportIcs} disabled={!domain.rawSchedules.length}>
                                <Calendar className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span>Simpan ke kalender</span>
                            </DropdownItem>
                        </DropdownContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* ROW 2: Integrated Filter & View Bar */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 p-2 sm:p-2.5">
                {/* Left: Status Filter Pills (Horizontal scroll on mobile) */}
                <div role="group" aria-label="Filter status ASH" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {statuses.map((status) => (
                        <button
                            key={status.value}
                            type="button"
                            aria-pressed={domain.statusFilter === status.value}
                            onClick={() => domain.setStatusFilter(status.value)}
                            className={`inline-flex min-h-10 sm:min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-brand-300 ${
                                domain.statusFilter === status.value
                                    ? 'border-brand-700 bg-brand-700 text-white shadow-xs dark:border-brand-600 dark:bg-brand-600'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span>{status.label}</span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums font-bold ${
                                domain.statusFilter === status.value
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>{status.count}</span>
                        </button>
                    ))}
                </div>

                {/* Right: Search + Subject Filter + View Mode */}
                <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
                    {/* Search & View Mode paired row */}
                    <div className="flex w-full sm:w-auto flex-1 items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:max-w-xs">
                            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <Input
                                aria-label="Cari jadwal ASH berdasarkan mapel atau materi"
                                type="search"
                                placeholder="Cari mapel / materi..."
                                value={domain.searchQuery}
                                onChange={(e) => domain.setSearchQuery(e.target.value)}
                                className="min-h-10 sm:min-h-11 bg-white pl-9 text-xs sm:text-sm rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        {/* View Mode Toggle sits right beside Search on mobile */}
                        <div role="group" aria-label="Pilihan Tampilan ASH" className="inline-flex shrink-0 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-900">
                            {modes.map((mode) => (
                                <button
                                    type="button"
                                    key={mode.value}
                                    aria-label={`Tampilan ${mode.label}`}
                                    aria-pressed={domain.viewMode === mode.value}
                                    onClick={() => domain.setViewMode(mode.value)}
                                    className={`inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                        domain.viewMode === mode.value
                                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    <mode.icon className="h-4 w-4" aria-hidden />
                                    <span className="hidden sm:inline">{mode.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject Filter Dropdown (available across Weekly, Cards, and Table views when >1 subject) */}
                    {domain.availableSubjects.length > 1 && (
                        <div className="min-w-0 w-full sm:w-44">
                            <CustomDropdown
                                aria-label="Filter mata pelajaran ASH"
                                value={domain.selectedSubject}
                                onChange={domain.setSelectedSubject}
                                options={[
                                    { value: 'all', label: 'Semua Mapel' },
                                    ...domain.availableSubjects.map((sub) => ({ value: sub, label: sub })),
                                ]}
                                placeholder="Pilih mapel"
                            />
                        </div>
                    )}

                    {/* Month Dropdown & Sort (only when in Cards/Table view or when Month filter is active) */}
                    {(domain.viewMode !== 'weekly' || domain.selectedMonth !== 'all') && domain.availableMonths.length > 0 && (
                        <div className="flex w-full sm:w-auto items-center gap-2">
                            <div className="min-w-0 flex-1 sm:w-36">
                                <CustomDropdown
                                    aria-label="Filter bulan ASH"
                                    value={domain.selectedMonth}
                                    onChange={domain.setSelectedMonth}
                                    options={[{ value: 'all', label: 'Semua bulan' }, ...domain.availableMonths]}
                                    placeholder="Pilih bulan"
                                />
                            </div>
                            {domain.viewMode !== 'weekly' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-10 sm:min-h-11 shrink-0 gap-1.5 rounded-xl text-xs sm:text-sm font-medium"
                                    onClick={() => domain.setSortOrder(domain.sortOrder === 'asc' ? 'desc' : 'asc')}
                                    aria-label={`Urutan tanggal: ${domain.sortOrder === 'asc' ? 'terlama dahulu' : 'terbaru dahulu'}`}
                                >
                                    <ArrowUpDown className="h-4 w-4" aria-hidden />
                                    <span>{domain.statusFilter === 'past' ? (domain.sortOrder === 'desc' ? 'Terbaru' : 'Terlama') : (domain.sortOrder === 'asc' ? 'Terdekat' : 'Terjauh')}</span>
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Clear Filters */}
                    {showClearFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="min-h-10 sm:min-h-11 text-xs sm:text-sm text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl"
                            onClick={() => {
                                domain.setSearchQuery('');
                                domain.setStatusFilter('all');
                                domain.setSelectedMonth('all');
                                domain.setSelectedSubject('all');
                            }}
                        >
                            Hapus filter
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
