import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CameraIcon, TrashIcon, XCircleIcon, CheckIcon, AlertCircleIcon } from '../Icons';
import { Button } from './Button';
import { Modal } from './Modal';

// Icons needed but might not exist - using available ones
const RotateCwIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
    </svg>
);

const CropIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
);

export interface ImageUploadConfig {
    maxFileSize?: number; // in MB, default 5MB
    maxWidth?: number; // default 800px
    maxHeight?: number; // default 800px
    quality?: number; // 0-1, default 0.85
    aspectRatio?: number; // width/height, e.g. 1 for square
    allowedTypes?: string[]; // default ['image/jpeg', 'image/png', 'image/webp']
    circularCrop?: boolean; // default false
}

interface ImageUploaderProps {
    currentImageUrl?: string;
    onUpload: (file: File) => Promise<void>;
    onDelete?: () => Promise<void>;
    config?: ImageUploadConfig;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    label?: string;
    showDeleteButton?: boolean;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

const DEFAULT_CONFIG: Required<ImageUploadConfig> = {
    maxFileSize: 5, // 5MB
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    aspectRatio: 1,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    circularCrop: false
};

const SIZE_CLASSES = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
};

/**
 * ImageUploader Component
 * 
 * A comprehensive image upload component with:
 * - Preview before upload
 * - Crop/resize functionality
 * - File size validation
 * - Loading indicators
 * - Delete option
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({
    currentImageUrl,
    onUpload,
    onDelete,
    config = {},
    disabled = false,
    size = 'md',
    className = '',
    label = 'Upload Foto',
    showDeleteButton = true
}) => {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Crop state
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const cropContainerRef = useRef<HTMLDivElement>(null);

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const validateFile = (file: File): string | null => {
        // Check file type
        if (!mergedConfig.allowedTypes.includes(file.type)) {
            return `Tipe file tidak didukung. Gunakan: ${mergedConfig.allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
        }

        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > mergedConfig.maxFileSize) {
            return `Ukuran file terlalu besar. Maksimal ${mergedConfig.maxFileSize}MB (file Anda: ${fileSizeMB.toFixed(2)}MB)`;
        }

        return null;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Create preview and open crop modal
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setSelectedFile(file);
        setShowCropModal(true);
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }

            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setSelectedFile(file);
            setShowCropModal(true);
            setZoom(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
        }
    };

    // Mouse/touch handlers for crop dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const processAndUpload = async () => {
        if (!selectedFile || !previewUrl) return;

        setIsLoading(true);
        setError(null);

        try {
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = previewUrl;
            });

            // Calculate output dimensions
            const outputSize = Math.min(mergedConfig.maxWidth, mergedConfig.maxHeight);
            canvas.width = outputSize;
            canvas.height = outputSize / mergedConfig.aspectRatio;

            // Apply transformations
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            // Calculate source area based on position
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom;
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = (canvas.width - scaledWidth) / 2 + position.x;
            const offsetY = (canvas.height - scaledHeight) / 2 + position.y;

            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            ctx.restore();

            // Convert to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Failed to create blob'));
                    },
                    'image/jpeg',
                    mergedConfig.quality
                );
            });

            // Create file from blob
            const processedFile = new File([blob], selectedFile.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg'
            });

            await onUpload(processedFile);
            setShowCropModal(false);
            setSelectedFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }
        } catch (err: any) {
            setError(err.message || 'Gagal memproses gambar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;

        setIsLoading(true);
        setError(null);

        try {
            await onDelete();
        } catch (err: any) {
            setError(err.message || 'Gagal menghapus foto');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelCrop = () => {
        setShowCropModal(false);
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    return (
        <>
            <div className={`relative ${className}`}>
                {/* Main Upload Area */}
                <div
                    className={`
                        relative group ${SIZE_CLASSES[size]} 
                        rounded-full overflow-hidden
                        border-4 border-white dark:border-slate-800
                        shadow-lg transition-all duration-300
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
                    `}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* Current Image or Placeholder */}
                    {currentImageUrl ? (
                        <img
                            src={currentImageUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                            <CameraIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className={`
                        absolute inset-0 bg-black/50 flex flex-col items-center justify-center
                        transition-opacity duration-300
                        ${disabled ? 'hidden' : 'opacity-0 group-hover:opacity-100'}
                    `}>
                        <CameraIcon className="w-6 h-6 text-white mb-1" />
                        <span className="text-xs text-white font-medium">{label}</span>
                    </div>

                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
                            <span className="text-xs text-white">Mengunggah...</span>
                        </div>
                    )}
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={mergedConfig.allowedTypes.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled || isLoading}
                />

                {/* Delete Button */}
                {showDeleteButton && currentImageUrl && onDelete && !isLoading && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        disabled={disabled}
                        className="absolute -top-1 -right-1 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                        title="Hapus foto"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* Error Message */}
                {error && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                            <AlertCircleIcon className="w-3 h-3" />
                            <span className="max-w-[200px] truncate">{error}</span>
                        </div>
                    </div>
                )}

                {/* File Size Info */}
                <div className="text-center mt-2 text-xs text-slate-400 dark:text-slate-500">
                    Maks. {mergedConfig.maxFileSize}MB
                </div>
            </div>

            {/* Crop Modal */}
            <Modal
                isOpen={showCropModal}
                onClose={handleCancelCrop}
                title="Edit Foto"
            >
                <div className="space-y-6">
                    {/* Preview Area */}
                    <div
                        ref={cropContainerRef}
                        className="relative w-full h-80 bg-slate-900 rounded-2xl overflow-hidden cursor-move"
                        onMouseDown={handleMouseDown}
                    >
                        {previewUrl && (
                            <div
                                className="absolute inset-0 flex items-center justify-center"
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`
                                }}
                            >
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain pointer-events-none"
                                    draggable={false}
                                />
                            </div>
                        )}

                        {/* Crop Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Dark overlay with circular cutout */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className={`
                                        w-64 h-64 border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]
                                        ${mergedConfig.circularCrop ? 'rounded-full' : 'rounded-lg'}
                                    `}
                                />
                            </div>
                        </div>

                        {/* Drag instruction */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                            Seret untuk mengatur posisi
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {/* Zoom Control */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
                            <button
                                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Perkecil"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <button
                                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Perbesar"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        {/* Rotation Control */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
                            <button
                                onClick={() => setRotation(rotation - 90)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Putar kiri"
                            >
                                <RotateCwIcon className="w-4 h-4 transform -scale-x-100" />
                            </button>
                            <span className="text-sm font-medium w-10 text-center">{rotation}°</span>
                            <button
                                onClick={() => setRotation(rotation + 90)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Putar kanan"
                            >
                                <RotateCwIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={() => {
                                setZoom(1);
                                setRotation(0);
                                setPosition({ x: 0, y: 0 });
                            }}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Selected File Info */}
                    {selectedFile && (
                        <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <span>{selectedFile.name}</span>
                            <span>•</span>
                            <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            variant="outline"
                            onClick={handleCancelCrop}
                            disabled={isLoading}
                        >
                            <XCircleIcon className="w-4 h-4 mr-2" />
                            Batal
                        </Button>
                        <Button
                            onClick={processAndUpload}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Mengunggah...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="w-4 h-4 mr-2" />
                                    Simpan & Unggah
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ImageUploader;
