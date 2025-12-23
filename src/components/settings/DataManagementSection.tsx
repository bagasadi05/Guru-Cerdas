import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { DatabaseIcon, DownloadCloudIcon, UploadCloudIcon, AlertTriangleIcon, CheckCircleIcon, RefreshCwIcon, FileTextIcon, InfoIcon, CalendarIcon, LockIcon } from '../Icons';
import { Unlock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { exportBackup, importBackup, validateBackup, downloadBackup, ValidationResult } from '../../services/backupService';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { getCurrentSemester } from '../../utils/semesterUtils';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Switch } from '../ui/Switch';

const DataManagementSection: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentSemester = getCurrentSemester();

    // Semester Lock Settings
    const { settings, updateSettings, isUpdating } = useUserSettings();

    const handleSemesterLockToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ semester_1_locked: e.target.checked });
    };

    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);
        try {
            const blob = await exportBackup(user.id);
            const date = new Date().toISOString().split('T')[0];
            downloadBackup(blob, `portal_guru_backup_${date}.json`);
            toast.success("Backup data berhasil diunduh.");
        } catch (error: any) {
            console.error(error);
            toast.error(`Gagal mencadangkan data: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        try {
            const json = await file.text();
            const data = JSON.parse(json);
            const result = validateBackup(data);

            setValidationResult(result);
            setPendingFile(file);
            setIsPreviewModalOpen(true);
        } catch (error: any) {
            toast.error(`File tidak valid: ${error.message}`);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmImport = async () => {
        if (!pendingFile || !user) return;

        setIsImporting(true);
        setIsPreviewModalOpen(false);

        try {
            await importBackup(pendingFile, user.id);
            toast.success("Data berhasil dipulihkan! Halaman akan dimuat ulang.");
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
            console.error(error);
            toast.error(`Gagal memulihkan data: ${error.message}`);
        } finally {
            setIsImporting(false);
            setPendingFile(null);
            setValidationResult(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <DatabaseIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Data</h2>
                    <p className="text-slate-500 dark:text-slate-400">Cadangkan dan pulihkan database aplikasi Anda.</p>
                </div>
            </div>

            {/* Semester Settings Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Pengaturan Semester</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Kelola periode akademik dan penguncian data.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* School Name Input */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 gap-4">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Sekolah</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Nama sekolah yang akan ditampilkan di kop laporan dan export.
                            </p>
                        </div>
                        <input
                            type="text"
                            value={settings?.school_name || ''}
                            onChange={(e) => updateSettings({ school_name: e.target.value })}
                            disabled={isUpdating}
                            className="bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm max-w-xs w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="Contoh: MI AL IRSYAD KOTA MADIUN"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                Semester Saat Ini
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                                    {currentSemester.label}
                                </span>
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Periode aktif ditentukan secara otomatis berdasarkan tanggal hari ini.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Kunci Data Semester 1 (Ganjil)</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                                Jika diaktifkan, data absensi dan pelanggaran di Semester 1 tidak dapat diubah atau dihapus.
                                Berguna saat sudah memasuki Semester 2.
                            </p>
                        </div>
                        <Switch
                            checked={settings?.semester_1_locked ?? false}
                            onChange={handleSemesterLockToggle}
                            disabled={isUpdating}
                        />
                    </div>

                    {settings?.semester_1_locked && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm animate-in fade-in slide-in-from-top-2">
                            <Unlock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block mb-1">Mode Arsip Aktif</span>
                                Data Semester 1 saat ini berstatus <strong>Read-Only</strong>. Guru tidak dapat mengedit atau menghapus data lama.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Card */}
                <Card className="border-indigo-100 dark:border-indigo-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <DownloadCloudIcon className="w-24 h-24 text-indigo-600" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                            <DownloadCloudIcon className="w-5 h-5" />
                            Cadangkan Data (Backup)
                        </CardTitle>
                        <CardDescription>
                            Unduh seluruh data siswa, kelas, nilai, dan laporan ke dalam file JSON.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl mb-4 border border-indigo-100 dark:border-indigo-800">
                            <ul className="text-sm text-indigo-800 dark:text-indigo-300 space-y-2">
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4" /> Data Siswa & Kelas</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4" /> Rekap Nilai & Absensi</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4" /> Catatan & Laporan</li>
                            </ul>
                        </div>
                        <Button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 h-10 font-medium"
                        >
                            {isExporting ? <RefreshCwIcon className="w-4 h-4 animate-spin mr-2" /> : <DownloadCloudIcon className="w-4 h-4 mr-2" />}
                            {isExporting ? 'Memproses...' : 'Unduh Backup (.json)'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Restore Card */}
                <Card className="border-amber-100 dark:border-amber-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <UploadCloudIcon className="w-24 h-24 text-amber-600" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <UploadCloudIcon className="w-5 h-5" />
                            Pulihkan Data (Restore)
                        </CardTitle>
                        <CardDescription>
                            Pulihkan data dari file backup yang sebelumnya diunduh.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl mb-4 border border-amber-100 dark:border-amber-800">
                            <div className="flex gap-2 items-start text-sm text-amber-800 dark:text-amber-300">
                                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>Tindakan ini akan menggabungkan data dari file backup. Pastikan versi backup sesuai.</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            variant="outline"
                            className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 h-10 font-medium"
                        >
                            {isImporting ? <RefreshCwIcon className="w-4 h-4 animate-spin mr-2" /> : <UploadCloudIcon className="w-4 h-4 mr-2" />}
                            {isImporting ? 'Memulihkan...' : 'Pilih File Backup'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
                <p>Data backup disimpan dalam format JSON. Jangan ubah isi file secara manual untuk menghindari kerusakan data.</p>
            </div>

            {/* Validation Preview Modal */}
            <Modal
                isOpen={isPreviewModalOpen}
                onClose={() => { setIsPreviewModalOpen(false); setPendingFile(null); setValidationResult(null); }}
                title="Preview Restore Data"
            >
                {validationResult && (
                    <div className="space-y-4">
                        {/* Validation Status */}
                        <div className={`p-4 rounded-xl ${validationResult.isValid ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                            <div className="flex items-center gap-2">
                                {validationResult.isValid ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                                )}
                                <span className={`font-medium ${validationResult.isValid ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                    {validationResult.isValid ? 'File backup valid' : 'File backup tidak valid'}
                                </span>
                            </div>
                        </div>

                        {/* Errors */}
                        {validationResult.errors.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</p>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                                    {validationResult.errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warnings */}
                        {validationResult.warnings.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Peringatan:</p>
                                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                                    {validationResult.warnings.map((warning, i) => (
                                        <li key={i}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Preview */}
                        {validationResult.preview && validationResult.preview.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Data yang akan dipulihkan:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {validationResult.preview.map((item) => (
                                        <div key={item.table} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{item.table.replace('_', ' ')}</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => { setIsPreviewModalOpen(false); setPendingFile(null); setValidationResult(null); }}
                                className="flex-1"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleConfirmImport}
                                disabled={!validationResult.isValid || isImporting}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isImporting ? 'Memulihkan...' : 'Pulihkan Data'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DataManagementSection;
