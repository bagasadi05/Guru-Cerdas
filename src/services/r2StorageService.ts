import { supabase } from './supabase';

export type R2StorageFolder =
  | 'teaching_journals'
  | 'achievement_certificates'
  | 'violations'
  | 'student_avatars'
  | 'teacher_avatars';

interface UploadResponse {
  success: boolean;
  publicUrl: string;
  key: string;
  error?: string;
  code?: string;
}

const getFunctionErrorMessage = async (error: unknown): Promise<string> => {
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : null;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string; code?: string };
      if (payload.code === 'R2_CONFIGURATION_MISSING') {
        return 'Upload foto belum dikonfigurasi di server. Hubungi administrator untuk melengkapi konfigurasi Cloudflare R2.';
      }
      if (payload.error) return payload.error;
    } catch {
      // Fall through to the generic message below.
    }
  }

  return error instanceof Error ? error.message : 'Gagal menghubungi layanan upload foto.';
};

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
          // Running in a worker makes the library load its default jsDelivr
          // worker script, which is intentionally blocked by the app CSP.
          useWebWorker: false,
          initialQuality: 0.8,
        });
        fileToUpload = compressed;
      } catch (e) {
        console.warn('Image compression failed, uploading original:', e);
      }
    }

    // Validate the processed output, not the original camera file. This lets a
    // photo within the UI limit be resized/compressed before it reaches R2.
    if (fileToUpload.size > MAX_SIZES[folder]) {
      throw new Error(
        `File terlalu besar untuk ${folder} setelah dikompresi. Maksimal ${MAX_SIZES[folder] / 1024 / 1024}MB`
      );
    }

    // Upload through the Edge Function instead of a browser-to-R2 presigned
    // PUT. R2's S3 endpoint does not allow the local app origin by default,
    // which made the browser preflight request fail before the upload began.
    const uploadBody = new FormData();
    uploadBody.append('action', 'upload');
    uploadBody.append('folder', folder);
    uploadBody.append('file', fileToUpload, fileToUpload.name);

    const { data, error } = await supabase.functions.invoke<UploadResponse>('r2-storage', {
      body: uploadBody,
    });

    if (error) {
      throw new Error(await getFunctionErrorMessage(error));
    }

    if (!data?.success || !data?.publicUrl || !data?.key) {
      throw new Error(data?.error || 'Gagal mengunggah file ke layanan penyimpanan.');
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
      throw new Error(await getFunctionErrorMessage(error));
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to delete file from storage.');
    }
  }
}

export const r2StorageService = new R2StorageService();
export default r2StorageService;
