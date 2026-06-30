import { supabase } from './supabase';

export type R2StorageFolder =
  | 'teaching_journals'
  | 'achievement_certificates'
  | 'violations'
  | 'student_avatars'
  | 'teacher_avatars';

interface PresignResponse {
  success: boolean;
  uploadUrl: string;
  publicUrl: string;
  key: string;
  error?: string;
}

const MAX_SIZES: Record<R2StorageFolder, number> = {
  student_avatars: 2 * 1024 * 1024,
  teacher_avatars: 2 * 1024 * 1024,
  violations: 5 * 1024 * 1024,
  achievement_certificates: 5 * 1024 * 1024,
  teaching_journals: 5 * 1024 * 1024,
};

const ALLOWED_TYPES: Record<R2StorageFolder, string[]> = {
  student_avatars: ['image/jpeg', 'image/png', 'image/webp'],
  teacher_avatars: ['image/jpeg', 'image/png', 'image/webp'],
  violations: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  achievement_certificates: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  teaching_journals: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

class R2StorageService {
  async uploadFile(
    file: File,
    folder: R2StorageFolder
  ): Promise<{ publicUrl: string; key: string }> {
    // --- Size validation ---
    if (file.size > MAX_SIZES[folder]) {
      throw new Error(
        `File terlalu besar untuk ${folder}. Maksimal ${MAX_SIZES[folder] / 1024 / 1024}MB`
      );
    }

    // --- Type validation ---
    const allowed = ALLOWED_TYPES[folder];
    if (!allowed.includes(file.type)) {
      throw new Error(
        `Tipe file ${file.type} tidak diizinkan untuk ${folder}. Hanya: ${allowed.join(', ')}`
      );
    }

    // --- Client-side image compression for image uploads ---
    let fileToUpload = file;
    if (file.type.startsWith('image/') && folder !== 'teaching_journals') {
      try {
        const { default: imageCompression } = await import('browser-image-compression');
        const maxWidth = folder === 'violations' || folder === 'achievement_certificates' ? 1200 : 800;
        const compressed = await imageCompression(file, {
          maxSizeMB: folder === 'violations' ? 2 : 1,
          maxWidthOrHeight: maxWidth,
          useWebWorker: true,
          initialQuality: 0.8,
        });
        fileToUpload = compressed;
      } catch (e) {
        console.warn('Image compression failed, uploading original:', e);
      }
    }

    // 1. Get presigned PUT URL
    const { data, error } = await supabase.functions.invoke<PresignResponse>('r2-storage', {
      body: {
        action: 'presign',
        filename: fileToUpload.name,
        contentType: fileToUpload.type || 'application/octet-stream',
        folder,
      },
    });

    if (error) {
      throw new Error(`Failed to request presigned upload URL: ${error.message}`);
    }

    if (!data?.success || !data?.uploadUrl || !data?.publicUrl) {
      throw new Error(data?.error || 'Failed to retrieve presigned URL from storage service.');
    }

    // 2. Upload
    const uploadResponse = await fetch(data.uploadUrl, {
      method: 'PUT',
      body: fileToUpload,
      headers: {
        'Content-Type': fileToUpload.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Cloudflare R2 upload failed with status ${uploadResponse.status}`);
    }

    return {
      publicUrl: data.publicUrl,
      key: data.key,
    };
  }

  async deleteFile(params: { key?: string; publicUrl?: string }): Promise<void> {
    const { data, error } = await supabase.functions.invoke<{ success: boolean; error?: string }>('r2-storage', {
      body: {
        action: 'delete',
        ...params,
      },
    });

    if (error) {
      throw new Error(`Failed to invoke storage delete service: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to delete file from storage.');
    }
  }
}

export const r2StorageService = new R2StorageService();
export default r2StorageService;
