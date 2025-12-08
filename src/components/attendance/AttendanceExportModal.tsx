import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AttendanceExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'pdf' | 'excel') => void;
    isExporting: boolean;
    exportMonth: string;
    setExportMonth: (month: string) => void;
}

export const AttendanceExportModal: React.FC<AttendanceExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    isExporting,
    exportMonth,
    setExportMonth
}) => {
    return (
        <Modal title="Export Laporan Absensi" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Pilih bulan dan tahun untuk mengekspor laporan absensi.</p>
                <div>
                    <label htmlFor="export-month" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bulan & Tahun</label>
                    <Input id="export-month" type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} className="h-12" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isExporting}>Batal</Button>
                    <Button type="button" variant="outline" onClick={() => onExport('excel')} disabled={isExporting} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                        {isExporting ? '...' : 'Excel (.xlsx)'}
                    </Button>
                    <Button type="button" onClick={() => onExport('pdf')} disabled={isExporting} className="bg-rose-600 hover:bg-rose-700 text-white">
                        {isExporting ? 'Mengekspor...' : 'PDF (.pdf)'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
