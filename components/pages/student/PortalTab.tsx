import React, { useState } from 'react';
import { CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CopyIcon, CopyCheckIcon, Share2Icon, PrinterIcon, SparklesIcon, KeyRoundIcon } from '../../Icons';
import { StudentWithClass } from './types';
import { useToast } from '../../../hooks/useToast';

interface PortalTabProps {
    student: StudentWithClass;
    onGenerateCode: () => void;
    isOnline: boolean;
    isGenerating: boolean;
}

export const PortalTab: React.FC<PortalTabProps> = ({ student, onGenerateCode, isOnline, isGenerating }) => {
    const [copied, setCopied] = useState(false);
    const toast = useToast();

    const handleCopyAccessCode = () => {
        if (!student.access_code) return;
        navigator.clipboard.writeText(student.access_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        if (navigator.share && student.access_code) {
            navigator.share({
                title: `Akses Portal Siswa - ${student.name}`,
                text: `Gunakan kode akses ${student.access_code} untuk melihat perkembangan ${student.name} di portal siswa.`,
                url: window.location.origin,
            })
                .then(() => console.log('Successful share'))
                .catch((error) => console.log('Error sharing', error));
        } else {
            toast.info("Fitur berbagi tidak didukung di browser ini. Silakan salin kodenya secara manual.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6">
            <CardTitle>Akses Portal Orang Tua</CardTitle>
            <CardDescription>Bagikan kode akses ini kepada orang tua atau wali siswa.</CardDescription>
            <div className="flex justify-center mt-6">
                {student.access_code ? (
                    <div className="w-full max-w-md p-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-600 dark:to-purple-700 shadow-xl text-indigo-900 dark:text-white text-center">
                        <p className="font-semibold">Kode Akses untuk {student.name}</p>
                        <div className="my-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-indigo-200 dark:border-white/20">
                            <p className="text-4xl font-mono font-bold tracking-[0.3em]">{student.access_code}</p>
                        </div>
                        <p className="text-xs text-indigo-700 dark:text-indigo-200 mb-6">Kode ini unik dan bersifat rahasia. Gunakan untuk masuk ke portal siswa.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Button onClick={handleCopyAccessCode} variant="outline" className="bg-white/50 dark:bg-white/10 border-indigo-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 backdrop-blur-sm col-span-2 sm:col-span-1 text-indigo-900 dark:text-white">{copied ? <CopyCheckIcon className="w-4 h-4 mr-2 text-green-500 dark:text-green-400" /> : <CopyIcon className="w-4 h-4 mr-2" />}{copied ? 'Disalin!' : 'Salin'}</Button>
                            <Button onClick={handleShare} variant="outline" className="bg-white/50 dark:bg-white/10 border-indigo-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 backdrop-blur-sm text-indigo-900 dark:text-white"><Share2Icon className="w-4 h-4 mr-2" />Bagikan</Button>
                            <Button onClick={handlePrint} variant="outline" className="bg-white/50 dark:bg-white/10 border-indigo-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 backdrop-blur-sm text-indigo-900 dark:text-white"><PrinterIcon className="w-4 h-4 mr-2" />Cetak Slip</Button>
                            <Button onClick={onGenerateCode} variant="outline" className="bg-white/50 dark:bg-white/10 border-indigo-200 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/20 backdrop-blur-sm text-indigo-900 dark:text-white" disabled={!isOnline || isGenerating}>Buat Baru</Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4 py-8">
                        <KeyRoundIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" />
                        <p className="text-gray-900 dark:text-white">Siswa ini belum memiliki kode akses portal.</p>
                        <Button onClick={onGenerateCode} disabled={!isOnline || isGenerating}>
                            <SparklesIcon className="w-4 h-4 mr-2" /> Buat Kode Akses
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
