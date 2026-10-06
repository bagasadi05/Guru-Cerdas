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
    return (
        <section aria-label="Pengaturan jadwal PH" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 grid-cols-2 gap-3 lg:max-w-xl">
                    <div className="space-y-1.5"><p className="text-sm font-medium text-slate-600 dark:text-slate-300">Kelas</p><CustomDropdown aria-label="Pilih kelas PH" value={domain.effectiveClassId} onChange={domain.handleSelectClass} options={domain.classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Pilih kelas" /></div>
                    <div className="space-y-1.5"><p className="text-sm font-medium text-slate-600 dark:text-slate-300">Semester</p><CustomDropdown aria-label="Pilih semester PH" value={domain.selectedSemesterId} onChange={domain.setSelectedSemesterId} options={domain.semesterOptions} placeholder="Pilih semester" /></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {domain.canManage && <><Button type="button" variant="primary" onClick={() => domain.openAdd()} className="min-h-11 gap-2 !px-3 !text-sm !bg-brand-700 hover:!bg-brand-800"><Plus className="h-4 w-4" />Tambah PH</Button><Button type="button" variant="outline" onClick={() => domain.setIsBatchOpen(true)} className="min-h-11 gap-2 !px-3 !text-sm"><Layers className="h-4 w-4" />Beberapa PH</Button></>}
                    <DropdownMenu><DropdownTrigger aria-label="Pilihan berbagi jadwal PH" className="!min-h-11 !min-w-11 !h-11 !w-11 !p-0 !rounded-xl"><MoreHorizontal className="h-5 w-5" /></DropdownTrigger><DropdownContent align="right">
                        <DropdownItem className="min-h-11" onClick={() => domain.setIsReportPreviewOpen(true)} disabled={!domain.effectiveClassId}><MessageSquare className="mr-2 h-4 w-4" />Pratinjau laporan WhatsApp</DropdownItem>
                        <DropdownItem className="min-h-11" onClick={() => domain.setIsWaModalOpen(true)} disabled={!domain.rawSchedules.length}><Share2 className="mr-2 h-4 w-4" />Salin jadwal untuk WhatsApp</DropdownItem>
                        <DropdownItem className="min-h-11" onClick={onPrint} disabled={!domain.rawSchedules.length}><Printer className="mr-2 h-4 w-4" />Cetak jadwal</DropdownItem>
                        <DropdownItem className="min-h-11" onClick={domain.handleExportIcs} disabled={!domain.rawSchedules.length}><Calendar className="mr-2 h-4 w-4" />Simpan ke kalender</DropdownItem>
                    </DropdownContent></DropdownMenu>
                </div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_116px] items-center gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[minmax(0,1fr)_200px] dark:border-slate-800">
                <div className="relative"><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input aria-label="Cari jadwal PH" type="search" placeholder="Cari mapel atau materi…" value={domain.searchQuery} onChange={(e) => domain.setSearchQuery(e.target.value)} className="min-h-11 pl-10" /></div>
                <CustomDropdown aria-label="Filter bulan PH" value={domain.selectedMonth} onChange={domain.setSelectedMonth} options={[{ value: 'all', label: 'Semua bulan' }, ...domain.availableMonths]} placeholder="Pilih bulan" />
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div role="group" aria-label="Filter status PH" className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">{statuses.map((status) => <button key={status.value} type="button" aria-pressed={domain.statusFilter === status.value} onClick={() => domain.setStatusFilter(status.value)} className={`inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-sm sm:flex-row sm:gap-2 sm:px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${domain.statusFilter === status.value ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{status.label}<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{status.count}</span></button>)}</div>
                <div className="flex flex-wrap items-center gap-2">
                    {domain.viewMode !== 'weekly' && <Button type="button" variant="ghost" className="min-h-11 gap-1.5" onClick={() => domain.setSortOrder(domain.sortOrder === 'asc' ? 'desc' : 'asc')} aria-label={domain.sortOrder === 'asc' ? 'Urutan: Tanggal Terdekat' : 'Urutan: Tanggal Terjauh'}><ArrowUpDown className="h-4 w-4" />{domain.sortOrder === 'asc' ? 'Terdekat' : 'Terjauh'}</Button>}
                    <div role="group" aria-label="Pilihan Tampilan PH" className="inline-flex max-w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{modes.map((mode) => <button type="button" key={mode.value} aria-label={`Tampilan ${mode.label}`} aria-pressed={domain.viewMode === mode.value} onClick={() => domain.setViewMode(mode.value)} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${domain.viewMode === mode.value ? 'bg-white text-brand-800 shadow-sm dark:bg-slate-700 dark:text-brand-200' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}><mode.icon className="h-4 w-4" /><span>{mode.label}</span></button>)}</div>
                </div>
            </div>
        </section>
    );
}
