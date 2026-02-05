
import { supabase } from './supabaseClient';
import { NeuralAsset } from '../types';

const APP_NAME = 'storyscribe';
const STORAGE_BUCKET = 'gemynd-files';

export const storageService = {
  checkConnection: async () => {
    try {
      const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
      if (error) return { status: 'offline', message: 'UPLINK_RESTRICTED' };
      return { status: 'healthy', message: 'UPLINK_STABLE' };
    } catch (e: any) {
      return { status: 'offline', message: 'GRID_FAILURE' };
    }
  },

  uploadFile: async (file: File, dnaMetadata: any = {}) => {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${cleanName}`;
    
    // 1. Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    // 3. Save metadata to database (Universal WestFlow Spec)
    const { data: dbData, error: dbError } = await supabase
      .from('file_metadata')
      .insert({
        file_name: file.name,
        storage_path: fileName,
        bucket: STORAGE_BUCKET,
        file_type: file.type,
        file_size: file.size,
        public_url: publicUrl,
        tags: dnaMetadata.tags || [],
        metadata: {
            ...dnaMetadata,
            dna_extracted: !!dnaMetadata.title,
            app_origin: APP_NAME
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
        console.warn("METADATA_COMMIT_FAILED:", dbError.message);
        // Fallback for UI continuity
        return {
            id: `temp-${timestamp}`,
            file_name: file.name,
            public_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
            metadata: dnaMetadata
        } as unknown as NeuralAsset;
    }

    return dbData as unknown as NeuralAsset;
  },

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
          uploaded_at: row.created_at
      })) as unknown as NeuralAsset[];
    } catch (e: any) {
      console.error("LOAD_FILES_FAILED:", e.message);
      return [];
    }
  },

  deleteFile: async (asset: any) => {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([asset.storage_path || asset.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('file_metadata')
      .delete()
      .eq('id', asset.id);
    
    if (dbError) throw dbError;
    
    return { success: true };
  }
};
