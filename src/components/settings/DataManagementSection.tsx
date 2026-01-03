import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { DownloadCloudIcon, UploadCloudIcon, AlertTriangleIcon, CheckCircleIcon, RefreshCwIcon, DatabaseIcon } from '../Icons';
import { useAuth } from '../../hooks/useAuth';
import { exportBackup, importBackup, validateBackup, downloadBackup, ValidationResult } from '../../services/backupService';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { useUserSettings } from '../../hooks/useUserSettings';
import { Input } from '../ui/Input';
import { SaveIcon } from '../Icons';

const DataManagementSection: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { schoolName, kkm, updateSettings, isUpdating } = useUserSettings();
    const [localSchoolName, setLocalSchoolName] = useState(schoolName);
    const [localKkm, setLocalKkm] = useState(kkm);
    const [hasChanges, setHasChanges] = useState(false);

    // Sync local state when hook data loads
    React.useEffect(() => {
        setLocalSchoolName(schoolName);
        setLocalKkm(kkm);
    }, [schoolName, kkm]);

    const handleSchoolSettingSave = () => {
        updateSettings({ school_name: localSchoolName, kkm: localKkm }, {
            onSuccess: () => setHasChanges(false)
        });
    };

    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);
        try {
            const blob = await exportBackup(user.id);
            const date = new Date().toISOString().split('T')[0];
            downloadBackup(blob, `portal_guru_backup_${date}.json`);
            toast.success("Backup data berhasil diunduh.");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            {/* Semester Settings Card Removed - Moved to Academic Tab */}
            {/* School Name & KKM could be moved to General Settings or kept here?
                Let's keep them here for now or distinct General Settings if we have one.
                Actually userSettings hook handles school name. Maybe we should keep School Name/KKM here?
                Or maybe create a General section.
                Wait, if I remove the card, where does the user set School Name?
                The prompt said "Implementing Semester System", not refactoring general settings.
                But Data Management usually isn't for School Name.
                "Account" has profile.
                Maybe a "General" tab is better.
                For now, I'll keep School Name and KKM but in a separate "General Configuration" card if I remove Semester Settings.
                But wait, I will just remove the semester locking part and keep School Name / KKM in a "Konfigurasi Sekolah" card.
            */}

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <DatabaseIcon className="w-5 h-5 text-slate-500" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Konfigurasi Sekolah</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Pengaturan umum sekolah dan KKM.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Sekolah</label>
                            <Input
                                value={localSchoolName}
                                onChange={(e) => {
                                    setLocalSchoolName(e.target.value);
                                    setHasChanges(true);
                                }}
                                placeholder="Masukkan nama sekolah"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nilai KKM Default</label>
                            <Input
                                type="number"
                                value={localKkm}
                                onChange={(e) => {
                                    setLocalKkm(Number(e.target.value));
                                    setHasChanges(true);
                                }}
                                placeholder="75"
                                min={0}
                                max={100}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSchoolSettingSave}
                            disabled={!hasChanges || isUpdating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isUpdating ? <RefreshCwIcon className="w-4 h-4 animate-spin mr-2" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                            Simpan Perubahan
                        </Button>
                    </div>
                </div>
            </div>

            {/* Re-writing the card content to only keep School Name and KKM, removing Semester parts */}

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
