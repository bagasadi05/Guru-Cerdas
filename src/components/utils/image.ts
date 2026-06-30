import imageCompression from 'browser-image-compression';

export const optimizeImage = async (
    file: File,
    options: { maxWidth: number; quality: number }
): Promise<Blob> => {
    const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: options.maxWidth,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: options.quality,
    });
    return compressed;
};
