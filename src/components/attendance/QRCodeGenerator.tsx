import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DownloadIcon, CopyIcon, QrCodeIcon, RefreshCwIcon } from 'lucide-react';

interface QRCodeGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
    date: string;
    userId: string;
}

interface QRData {
    type: 'attendance';
    classId: string;
    date: string;
    userId: string;
    token: string;
    expiresAt: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    isOpen,
    onClose,
    classId,
    className,
    date,
    userId,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [token, setToken] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<Date>(new Date());
    const [timeLeft, setTimeLeft] = useState<string>('');

    // Generate a unique token for this QR session
    const generateToken = () => {
        const newToken = crypto.randomUUID().split('-').pop() || '';
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        setToken(newToken);
        setExpiresAt(expiry);
        return { token: newToken, expiry };
    };

    // Generate QR code
    const generateQR = async () => {
        const { token: newToken, expiry } = generateToken();

        const qrData: QRData = {
            type: 'attendance',
            classId,
            date,
            userId,
            token: newToken,
            expiresAt: expiry.toISOString(),
        };

        try {
            const url = await QRCode.toDataURL(JSON.stringify(qrData), {
                width: 300,
                margin: 2,
                color: {
                    dark: '#065f46',
                    light: '#ffffff',
                },
                errorCorrectionLevel: 'M',
            });
            setQrDataUrl(url);
        } catch (err) {
            console.error('Error generating QR code:', err);
        }
    };

    // Countdown timer
    useEffect(() => {
        if (!isOpen) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = expiresAt.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('Expired');
                generateQR(); // Auto-refresh when expired
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresAt, isOpen]);

    // Generate QR on open
    useEffect(() => {
        if (isOpen && classId) {
            generateQR();
        }
    }, [isOpen, classId, date]);

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `qr-absensi-${className}-${date}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const handleCopyLink = async () => {
        const attendanceLink = `${window.location.origin}/scan-absensi?token=${token}&class=${classId}&date=${date}`;
        await navigator.clipboard.writeText(attendanceLink);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="QR Code Absensi"
            icon={<QrCodeIcon className="w-5 h-5" />}
        >
            <div className="space-y-6">
                {/* QR Code Display */}
                <div className="flex flex-col items-center">
                    <div className="relative p-4 bg-white rounded-2xl shadow-lg">
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="QR Code Absensi"
                                className="w-64 h-64"
                            />
                        ) : (
                            <div className="w-64 h-64 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                                <span className="text-gray-400">Generating...</span>
                            </div>
                        )}

                        {/* Timer Badge */}
                        <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold ${timeLeft === 'Expired'
                                ? 'bg-red-500 text-white'
                                : 'bg-green-600 text-white'
                            }`}>
                            {timeLeft}
                        </div>
                    </div>

                    {/* Class Info */}
                    <div className="mt-4 text-center">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {className}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(date).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateQR}
                        className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                        <RefreshCwIcon className="w-4 h-4" />
                        <span className="text-xs">Refresh</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span className="text-xs">Download</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                        <CopyIcon className="w-4 h-4" />
                        <span className="text-xs">Copy Link</span>
                    </Button>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
                        Cara Penggunaan:
                    </h4>
                    <ol className="text-sm text-green-600 dark:text-green-400 space-y-1 list-decimal list-inside">
                        <li>Tampilkan QR ini di layar kelas</li>
                        <li>Siswa scan menggunakan aplikasi kamera</li>
                        <li>Absensi otomatis tercatat</li>
                        <li>QR berlaku selama 15 menit</li>
                    </ol>
                </div>
            </div>
        </Modal>
    );
};

export default QRCodeGenerator;
