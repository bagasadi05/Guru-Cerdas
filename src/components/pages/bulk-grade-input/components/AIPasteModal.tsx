import React, { useState } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { useToast } from '../../../../hooks/useToast';
import { generateOpenRouterJson } from '../../../../services/openRouterService';
import { SparklesIcon } from '../../../Icons';
import { findStudentMatch } from '../../../../utils/studentMatcher';

interface Student {
    id: string;
    name: string;
}

interface AIPasteModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    onParseSuccess: (parsedScores: Record<string, string>) => void;
}

interface ReviewDataItem {
    studentName: string;
    score: string | number;
}

export const AIPasteModal: React.FC<AIPasteModalProps> = ({
    isOpen,
    onClose,
    students,
    onParseSuccess,
}) => {
    const toast = useToast();
    const [pasteData, setPasteData] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    const handleAiParse = async () => {
        if (!students || students.length === 0) {
            toast.warning('Daftar siswa kosong.');
            return;
        }
        if (!pasteData.trim()) {
            toast.warning('Tempelkan data nilai terlebih dahulu.');
            return;
        }
        setIsParsing(true);
        try {
            const studentNames = students.map(s => s.name);
            const systemInstruction = `Anda adalah asisten entri data. Tugas Anda adalah mencocokkan nama dari teks yang diberikan dengan daftar nama siswa yang ada dan mengekstrak nilainya. Hanya cocokkan nama yang ada di daftar. Abaikan nama yang tidak ada di daftar. Format output harus JSON yang valid.
            
            Format JSON yang diharapkan:
            [
                { "studentName": "Nama Siswa", "score": "85" }
            ]`;
            const prompt = `Daftar Siswa: ${JSON.stringify(studentNames)}\n\nTeks Nilai untuk Diproses:\n${pasteData}`;
            const parsedResults = await generateOpenRouterJson<ReviewDataItem[]>(prompt, systemInstruction);
            
            if (!Array.isArray(parsedResults)) {
                throw new Error('Format respon AI tidak valid (bukan list).');
            }

            const newScores: Record<string, string> = {};
            let matchedCount = 0;

            parsedResults.forEach(item => {
                const matchResult = findStudentMatch(item.studentName, students);
                if (matchResult.method !== 'none') {
                    newScores[matchResult.studentId] = String(item.score);
                    matchedCount++;
                }
            });

            onParseSuccess(newScores);
            setPasteData('');
            onClose();
            toast.success(`${matchedCount} dari ${parsedResults.length} nilai berhasil dicocokkan dan diisi.`);
        } catch (error: any) {
            console.error('AI Parsing Error:', error);
            const errMsg = error.message || '';
            if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) {
                toast.error('Gagal terhubung ke server AI. Periksa koneksi internet Anda.');
            } else if (errMsg.includes('rate') || errMsg.includes('limit') || errMsg.includes('429')) {
                toast.error('Batas permintaan AI tercapai. Coba lagi dalam beberapa saat.');
            } else {
                toast.error('Gagal memproses data. Pastikan format teks sesuai contoh.');
            }
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tempel Nilai via AI">
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tempelkan teks mentah berisi daftar nama dan nilai siswa (contoh dari WhatsApp atau Google Keep). AI akan mendeteksi nama secara pintar dan mengisi nilai ke tabel.
                </p>
                <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-400">
                    <strong className="block mb-1">Contoh format teks yang didukung:</strong>
                    • Budi dapet 90, Ani 85, Candra 77.5<br />
                    • No 1. Adi Setiawan nilai: 88<br />
                    • Dodi: 100, Eko Saputra: 95
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Teks Nilai Mentah</label>
                    <textarea
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                        placeholder="Contoh: Budi 85, Ani 90, Citra 75..."
                        rows={6}
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={onClose} disabled={isParsing}>
                        Batal
                    </Button>
                    <Button onClick={handleAiParse} disabled={isParsing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isParsing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Menganalisis...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Proses dengan AI
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
