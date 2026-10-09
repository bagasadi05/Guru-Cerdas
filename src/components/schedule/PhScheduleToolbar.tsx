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
    const modes = [{ value: 'weekly', label: 'Mingguan', icon: CalendarDays }, { value: 'cards', label: 'Kartu', icon: LayoutGrid }, { value: 'table', label: 'Tabel', icon: List }] as const;
    // When the filters match nothing, the empty state carries the reset, so only one appears at a time.
    const showClearFilters = (domain.searchQuery !== '' || domain.statusFilter !== 'all' || domain.selectedMonth !== 'all')
        && domain.filteredSchedules.length > 0;

    return (
        <section aria-label="Pengaturan jadwal PH" className="space-y-4 border-y border-slate-200 py-4 dark:border-slate-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 grid-cols-2 gap-3 lg:max-w-xl">
                    <div className="space-y-1.5"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Kelas</p><CustomDropdown aria-label="Pilih kelas PH" value={domain.effectiveClassId} onChange={domain.handleSelectClass} options={domain.classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Pilih kelas" /></div>
                    <div className="space-y-1.5"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Semester</p><CustomDropdown aria-label="Pilih semester PH" value={domain.selectedSemesterId} onChange={domain.setSelectedSemesterId} options={domain.semesterOptions} placeholder="Pilih semester" /></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {domain.canAdd && <><Button type="button" variant="primary" onClick={() => domain.openAdd()} title="Tambah jadwal PH" className="min-h-11 gap-2 !px-3 !text-sm !bg-brand-700 hover:!bg-brand-800"><Plus className="h-4 w-4" aria-hidden />Tambah PH</Button><Button type="button" variant="outline" onClick={() => domain.setIsBatchOpen(true)} title="Tambahkan hingga 20 jadwal PH dalam satu pengisian" className="min-h-11 gap-2 !px-3 !text-sm"><Layers className="h-4 w-4" aria-hidden />Tambah Massal</Button></>}
                    <DropdownMenu><DropdownTrigger aria-label="Pilihan berbagi jadwal PH" className="!min-h-11 !min-w-11 !h-11 !w-11 !p-0 !rounded-xl"><MoreHorizontal className="h-5 w-5" /></DropdownTrigger><DropdownContent align="right">
                        <DropdownItem className="min-h-11" onClick={() => domain.setIsReportPreviewOpen(true)} disabled={!domain.effectiveClassId}><MessageSquare className="mr-2 h-4 w-4" />Pratinjau laporan WhatsApp</DropdownItem>
                        <DropdownItem className="min-h-11" onClick={() => domain.setIsWaModalOpen(true)} disabled={!domain.rawSchedules.length}><Share2 className="mr-2 h-4 w-4" />Salin jadwal untuk WhatsApp</DropdownItem>
                        <DropdownItem className="min-h-11" onClick={onPrint} disabled={!domain.rawSchedules.length}><Printer className="mr-2 h-4 w-4" />Cetak jadwal</DropdownItem>
                        <DropdownItem className="min-h-11" onClick={domain.handleExportIcs} disabled={!domain.rawSchedules.length}><Calendar className="mr-2 h-4 w-4" />Simpan ke kalender</DropdownItem>
                    </DropdownContent></DropdownMenu>
                </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                        <Input aria-label="Cari jadwal PH berdasarkan mapel atau materi" type="search" placeholder="Cari jadwal PH: mapel atau materi..." value={domain.searchQuery} onChange={(e) => domain.setSearchQuery(e.target.value)} className="min-h-11 bg-white pl-10 dark:bg-slate-900" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-36 shrink-0 sm:w-44">
                            <CustomDropdown aria-label="Filter bulan PH" value={domain.selectedMonth} onChange={domain.setSelectedMonth} options={[{ value: 'all', label: 'Semua bulan' }, ...domain.availableMonths]} placeholder="Pilih bulan" />
                        </div>
                        {domain.viewMode !== 'weekly' && <Button type="button" variant="ghost" className="min-h-11 shrink-0 gap-1.5" onClick={() => domain.setSortOrder(domain.sortOrder === 'asc' ? 'desc' : 'asc')} aria-label={`Urutan tanggal: ${domain.sortOrder === 'asc' ? 'terlama dahulu' : 'terbaru dahulu'}`}><ArrowUpDown className="h-4 w-4" aria-hidden />{domain.statusFilter === 'past' ? (domain.sortOrder === 'desc' ? 'Terbaru' : 'Terlama') : (domain.sortOrder === 'asc' ? 'Terdekat' : 'Terjauh')}</Button>}
                    </div>
                </div>

                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div role="group" aria-label="Filter status PH" className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
                        {statuses.map((status) => (
                            <button
                                key={status.value}
                                type="button"
                                aria-pressed={domain.statusFilter === status.value}
                                onClick={() => domain.setStatusFilter(status.value)}
                                className={`inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:focus-visible:ring-brand-300 sm:flex-row sm:gap-2 sm:px-3 ${
                                    domain.statusFilter === status.value
                                        ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-600 dark:bg-brand-600'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                                }`}
                            >
                                {status.label}
                                <span className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                                    domain.statusFilter === status.value
                                        ? 'bg-white text-brand-800'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                }`}>{status.count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {showClearFilters && (
                            <Button type="button" variant="ghost" className="min-h-11 text-sm" onClick={() => { domain.setSearchQuery(''); domain.setStatusFilter('all'); domain.setSelectedMonth('all'); }}>
                                Hapus filter
                            </Button>
                        )}
                        <div role="group" aria-label="Pilihan Tampilan PH" className="inline-flex max-w-full rounded-xl bg-white p-1 dark:bg-slate-900">
                            {modes.map((mode) => (
                                <button
                                    type="button"
                                    key={mode.value}
                                    aria-label={`Tampilan ${mode.label}`}
                                    aria-pressed={domain.viewMode === mode.value}
                                    onClick={() => domain.setViewMode(mode.value)}
                                    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                        domain.viewMode === mode.value
                                            ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200'
                                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <mode.icon className="h-4 w-4" aria-hidden />
                                    <span>{mode.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
