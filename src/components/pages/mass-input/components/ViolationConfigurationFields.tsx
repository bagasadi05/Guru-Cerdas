import { useState } from 'react';
import { Check, ChevronDown, Search, ListFilter } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { violationList, type ViolationItem } from '../../../../services/violations.data';

interface Props {
    selectedCode: string;
    onSelect: (code: string) => void;
    date: string;
    onDateChange: (date: string) => void;
    notes: string;
    onNotesChange: (notes: string) => void;
    frequentViolations: ViolationItem[];
}

const fieldLabel = 'block text-sm font-semibold text-slate-700 dark:text-slate-200';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

function ViolationOption({ item, selected, onSelect, compact = false }: { item: ViolationItem; selected: boolean; onSelect: () => void; compact?: boolean }) {
    return (
        <button type="button" aria-pressed={selected} onClick={onSelect} title={item.description}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${focusRing} ${selected
                ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
            <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-slate-950' : 'border-slate-300 dark:border-slate-500'}`}>
                {selected && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-5">{compact ? item.description.split(' / ')[0] : item.description}</span>
            <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums ${selected ? 'bg-brand-100 text-brand-800 dark:bg-brand-800 dark:text-brand-100' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{item.points} poin</span>
        </button>
    );
}

export function ViolationConfigurationFields({ selectedCode, onSelect, date, onDateChange, notes, onNotesChange, frequentViolations }: Props) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const selected = violationList.find(item => item.code === selectedCode);
    const query = search.trim().toLocaleLowerCase('id');
    const filtered = violationList.filter(item => item.description.toLocaleLowerCase('id').includes(query) || item.code.toLowerCase().includes(query));
    const closePicker = () => { setPickerOpen(false); setSearch(''); };
    const choose = (code: string) => { onSelect(code); closePicker(); };

    return <>
        <fieldset className="min-w-0 space-y-3">
            <legend className={fieldLabel}>Jenis pelanggaran</legend>
            {frequentViolations.length > 0 && <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sering dicatat</p>
                <div className="space-y-2">{frequentViolations.map(item => <ViolationOption key={item.code} item={item} compact selected={selectedCode === item.code} onSelect={() => onSelect(item.code)} />)}</div>
            </div>}
            {selected && <div role="status" className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300"><Check className="h-3.5 w-3.5" aria-hidden="true" />Pelanggaran dipilih · {selected.points} poin</p>
                <p className="text-sm leading-5 text-slate-800 dark:text-slate-100">{selected.description}</p>
            </div>}
            <button type="button" aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={() => setPickerOpen(true)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-700 hover:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${focusRing}`}>
                <span className="flex items-center gap-2"><ListFilter className="h-4 w-4 shrink-0" aria-hidden="true" />{selected ? 'Ganti jenis pelanggaran' : 'Lihat semua pelanggaran'}</span>
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
        </fieldset>
        <div className="space-y-2">
            <label htmlFor="violation-date" className={fieldLabel}>Tanggal kejadian</label>
            <Input id="violation-date" type="date" value={date} onChange={event => onDateChange(event.target.value)} className="h-12 min-w-0 rounded-xl border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:[color-scheme:dark]" />
        </div>
        <div className="space-y-2">
            <label htmlFor="violation-notes" className={fieldLabel}>Keterangan <span className="font-normal text-slate-500 dark:text-slate-400">(opsional)</span></label>
            <textarea id="violation-notes" value={notes} onChange={event => onNotesChange(event.target.value)} rows={3}
                placeholder="Contoh: Terlambat 15 menit karena macet."
                className="block min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400" />
        </div>
        <Modal isOpen={pickerOpen} onClose={closePicker} title="Pilih jenis pelanggaran" icon={<ListFilter className="h-5 w-5" />} maxWidth="max-w-2xl">
            <div className="space-y-4">
                <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input type="search" aria-label="Cari jenis pelanggaran" placeholder="Cari nama atau kode pelanggaran…" value={search} onChange={event => setSearch(event.target.value)} autoFocus={isDesktop} className="h-12 pl-10" />
                </div>
                <p role="status" className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} jenis pelanggaran</p>
                <div className="max-h-[55vh] space-y-5 overflow-y-auto p-1">
                    {!filtered.length && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Tidak ada hasil. Coba nama atau kode lain.</p>}
                    {['Ringan', 'Sedang', 'Berat'].map(category => {
                        const items = filtered.filter(item => item.category === category);
                        return items.length ? <section key={category} className="space-y-2" aria-label={`Pelanggaran ${category}`}>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{category} <span className="font-normal text-slate-500 dark:text-slate-400">({items.length})</span></h4>
                            {items.map(item => <ViolationOption key={item.code} item={item} selected={selectedCode === item.code} onSelect={() => choose(item.code)} />)}
                        </section> : null;
                    })}
                </div>
            </div>
        </Modal>
    </>;
}
