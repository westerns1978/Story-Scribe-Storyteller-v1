import { openDB, DBSchema } from 'idb';

interface StoryMediaDB extends DBSchema {
  media: {
    key: string;
    value: Blob;
  };
}

const DB_NAME = 'story-scribe-media';
const STORE_NAME = 'media';

// Initialize DB lazily and safely
let dbPromise: Promise<any> | null = null;

const getDB = async () => {
    if (!dbPromise) {
        try {
            dbPromise = openDB<StoryMediaDB>(DB_NAME, 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                },
            });
        } catch (e) {
            console.error("Failed to open IndexedDB:", e);
            return null;
        }
    }
    return dbPromise;
};

export const mediaStorageService = {
  async saveMedia(id: string, blob: Blob): Promise<void> {
    try {
        const db = await getDB();
        if (db) await db.put(STORE_NAME, blob, id);
    } catch (e) {
        console.warn("Failed to save media to IndexedDB", e);
    }
  },

  async getMedia(id: string): Promise<Blob | undefined> {
    try {
        const db = await getDB();
        if (!db) return undefined;
        return await db.get(STORE_NAME, id);
    } catch (e) {
        console.warn("Failed to get media from IndexedDB", e);
        return undefined;
    }
  },

  async deleteMedia(id: string): Promise<void> {
    try {
        const db = await getDB();
        if (db) await db.delete(STORE_NAME, id);
    } catch (e) {
        console.warn("Failed to delete media", e);
    }
  },
  
  async clearAll(): Promise<void> {
      try {
        const db = await getDB();
        if (db) await db.clear(STORE_NAME);
      } catch (e) {
          console.warn("Failed to clear media DB", e);
      }
  }
};

export const base64ToBlob = async (base64: string): Promise<Blob> => {
    try {
        const response = await fetch(base64);
        return await response.blob();
    } catch (e) {
        console.error("Base64 to Blob conversion failed", e);
        return new Blob([]);
    }
};

export const blobToUrl = (blob: Blob): string => {
    try {
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Blob to URL conversion failed", e);
        return '';
    }
};