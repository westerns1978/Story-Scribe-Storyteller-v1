// services/storageService.ts
// ============================================
// Wissums asset storage — Supabase Storage + file_metadata table
// Now user-aware: all uploads tagged with user_id when available
// getUserAssets() retrieves all files for a signed-in user
// ============================================

import { supabase } from './supabaseClient';
import { NeuralAsset } from '../types';

const APP_NAME = 'storyscribe';
const STORAGE_BUCKET = 'gemynd-files';

// ─── Get current user_id from active session (non-blocking) ──────────────────

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export const storageService = {

  checkConnection: async () => {
    try {
      const { error } = await supabase.storage.getBucket(STORAGE_BUCKET);
      if (error) return { status: 'offline', message: 'UPLINK_RESTRICTED' };
      return { status: 'healthy', message: 'UPLINK_STABLE' };
    } catch {
      return { status: 'offline', message: 'GRID_FAILURE' };
    }
  },

  // ─── Upload a file, tagging it with user_id + optional session_id ───────────

  uploadFile: async (
    file: File,
    dnaMetadata: Record<string, any> = {},
    sessionId?: string
  ): Promise<NeuralAsset> => {
    const userId = await getCurrentUserId();
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Path: user_id/session_id/timestamp-filename  (or global/ if no user)
    const prefix = userId
      ? sessionId
        ? `${userId}/${sessionId}`
        : `${userId}`
      : 'global';
    const storagePath = `${prefix}/${timestamp}-${cleanName}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    // 3. Save metadata — include user_id and session_id for retrieval
    const { data: dbData, error: dbError } = await supabase
      .from('file_metadata')
      .insert({
        file_name: file.name,
        storage_path: storagePath,
        bucket: STORAGE_BUCKET,
        file_type: file.type,
        file_size: file.size,
        public_url: publicUrl,
        user_id: userId,
        session_id: sessionId ?? null,
        tags: dnaMetadata.tags || [],
        metadata: {
          ...dnaMetadata,
          dna_extracted: !!dnaMetadata.title,
          app_origin: APP_NAME,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.warn('[storageService] Metadata commit failed:', dbError.message);
      // Graceful fallback — still return usable asset
      return {
        id: `temp-${timestamp}`,
        file_name: file.name,
        public_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        metadata: dnaMetadata,
      } as unknown as NeuralAsset;
    }

    return { ...dbData, uploaded_at: dbData.created_at } as unknown as NeuralAsset;
  },

  // ─── Load all files for the current signed-in user ───────────────────────────

  getUserAssets: async (userId?: string): Promise<NeuralAsset[]> => {
    try {
      const uid = userId ?? await getCurrentUserId();
      if (!uid) return [];

      const { data, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('user_id', uid)
        .eq('bucket', STORAGE_BUCKET)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        uploaded_at: row.created_at,
      })) as unknown as NeuralAsset[];
    } catch (e: any) {
      console.error('[storageService] getUserAssets failed:', e.message);
      return [];
    }
  },

  // ─── Load assets for a specific story session ────────────────────────────────

  getSessionAssets: async (sessionId: string): Promise<NeuralAsset[]> => {
    try {
      const { data, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('session_id', sessionId)
        .eq('bucket', STORAGE_BUCKET)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        uploaded_at: row.created_at,
      })) as unknown as NeuralAsset[];
    } catch (e: any) {
      console.error('[storageService] getSessionAssets failed:', e.message);
      return [];
    }
  },

  // ─── Global load (admin/legacy use) ──────────────────────────────────────────

  loadFiles: async (limit = 50): Promise<NeuralAsset[]> => {
    try {
      const { data, error } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('bucket', STORAGE_BUCKET)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        uploaded_at: row.created_at,
      })) as unknown as NeuralAsset[];
    } catch (e: any) {
      console.error('[storageService] loadFiles failed:', e.message);
      return [];
    }
  },

  // ─── Delete ───────────────────────────────────────────────────────────────────

  deleteFile: async (asset: any): Promise<{ success: boolean }> => {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([asset.storage_path || asset.file_path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from('file_metadata')
      .delete()
      .eq('id', asset.id);

    if (dbError) throw dbError;

    return { success: true };
  },
};
