import { supabase } from './supabase';

/**
 * Folder types corresponding to whitelisted folders in r2-storage Edge Function.
 */
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

/**
 * Service to handle secure direct uploads to Cloudflare R2 via Supabase Edge Function.
 */
class R2StorageService {
  /**
   * Upload a file to Cloudflare R2 using a secure presigned PUT URL.
   * 
   * @param file The File object to upload.
   * @param folder The folder namespace.
   * @returns Object containing publicUrl and key.
   */
  async uploadFile(
    file: File,
    folder: R2StorageFolder
  ): Promise<{ publicUrl: string; key: string }> {
    // 1. Invoke r2-storage Edge Function to get the presigned PUT URL
    const { data, error } = await supabase.functions.invoke<PresignResponse>('r2-storage', {
      body: {
        action: 'presign',
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        folder,
      },
    });

    if (error) {
      throw new Error(`Failed to request presigned upload URL: ${error.message}`);
    }

    if (!data?.success || !data?.uploadUrl || !data?.publicUrl) {
      throw new Error(data?.error || 'Failed to retrieve presigned URL from storage service.');
    }

    // 2. Perform the direct HTTP PUT upload to Cloudflare R2
    const uploadResponse = await fetch(data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
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

  /**
   * Delete a file from Cloudflare R2 by its path key or public URL.
   * 
   * @param params Object containing key or publicUrl.
   */
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
