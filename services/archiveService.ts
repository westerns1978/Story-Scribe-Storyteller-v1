// services/archiveService.ts
// ============================================
// Supabase-first persistence with IndexedDB fallback.
// The edge function saves server-side via service role key.
// This service writes a SECOND copy so the client's saveStory()
// call in App.tsx also has the full story shape for the shelf.
//
// Column map (actual storyscribe_stories schema):
//   session_id        text  (primary key / unique)
//   storyteller_name  text
//   title             text
//   narrative         text
//   transcript        text
//   extraction        jsonb
//   storyboard        jsonb
//   assets            jsonb  { images: [], videos: [], audio: [] }  ← NOT generated_images
//   background_music_url text
//   org_id            text
//   status            text
//   saved_at          timestamptz
//   updated_at        timestamptz
//   created_at        timestamptz
// ============================================

import { StoryArchiveItem } from '../types';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

async function supabaseUpsert(story: StoryArchiveItem): Promise<boolean> {
  try {
    const rawId = story.sessionId || story.id || '';
    if (!rawId) {
      console.warn('[archiveService] No session_id — skipping upsert');
      return false;
    }
    // NOTE: background_music_url omitted — edge function saves it server-side
    const payload = {
      session_id: rawId,
      storyteller_name: story.storytellerName || story.name || 'Unknown',
      title: `The Legacy of ${story.storytellerName || story.name || 'Someone Special'}`,
      narrative: story.narrative || '',
      extraction: story.extraction ?? null,
      storyboard: story.storyboard ?? null,
      assets: { images: story.generatedImages || [], videos: [], audio: [] },
      org_id: '71077b47-66e8-4fd9-90e7-709773ea6582',
      status: 'complete',
      saved_at: story.savedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/storyscribe_stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('[archiveService] Upsert failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[archiveService] Upsert error:', e);
    return false;
  }
}

const DB_NAME = 'StoryScribeVault';
const DB_VERSION = 2;
const STORE_NAME = 'stories';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSave(story: StoryArchiveItem): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(story);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) {
    console.warn('[archiveService] IndexedDB save failed:', e);
  }
}

async function idbList(): Promise<StoryArchiveItem[]> {
  try {
    const db = await openDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveStory(story: StoryArchiveItem): Promise<void> {
  await idbSave(story);
  supabaseUpsert(story).then(ok => {
    if (!ok) console.warn('[archiveService] Remote sync failed — share links may not work');
  });
}

export async function getArchivedStories(retryDelayMs = 0): Promise<StoryArchiveItem[]> {
  if (retryDelayMs > 0) await new Promise(r => setTimeout(r, retryDelayMs));
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('session_id, storyteller_name, title, status, created_at, saved_at, narrative, extraction, storyboard, assets')
      .eq('org_id', '71077b47-66e8-4fd9-90e7-709773ea6582')
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.session_id,
        sessionId: row.session_id,
        name: row.storyteller_name || '',
        storytellerName: row.storyteller_name || '',
        narrative: row.narrative || '',
        extraction: row.extraction,
        storyboard: row.storyboard,
        generatedImages: row.assets?.images || [],
        artifacts: row.extraction?.artifacts || [],
        background_music_url: row.background_music_url,
        savedAt: row.saved_at || row.created_at,
      } as StoryArchiveItem));
    }
  } catch (e) {
    console.warn('[archiveService] Supabase list failed, using IndexedDB:', e);
  }
  return idbList();
}

export async function deleteStory(id: string): Promise<void> {
  // Delete from IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) {
    console.warn('[archiveService] IndexedDB delete failed:', e);
  }

  // Delete from Supabase
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/storyscribe_stories?session_id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    );
    if (!res.ok) console.warn('[archiveService] Supabase delete failed:', res.status);
  } catch (e) {
    console.warn('[archiveService] Supabase delete error:', e);
  }
}

export async function loadStory(sessionId: string): Promise<StoryArchiveItem | null> {
  // Try Supabase first (works cross-device, needed for share links)
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!error && data) {
      // Map storyboard beats to include image_index if missing
      const storyboard = data.storyboard;
      if (storyboard?.story_beats) {
        storyboard.story_beats = storyboard.story_beats.map((beat: any, i: number) => ({
          ...beat,
          image_index: beat.image_index ?? i,
        }));
      }

      return {
        id: data.session_id,
        sessionId: data.session_id,
        name: data.storyteller_name || '',
        storytellerName: data.storyteller_name || '',
        narrative: data.narrative || '',
        extraction: data.extraction,
        storyboard,
        generatedImages: data.assets?.images || [],
        beatAudio: data.assets?.audio || [],
        artifacts: data.extraction?.artifacts || [],
        background_music_url: data.background_music_url || '',
        savedAt: data.saved_at || data.created_at,
        // Fields not stored in DB — safe defaults
        musicQuery: data.extraction?.emotional_journey?.overall_tone || '',
        petMode: false,
        imagePalette: '',
      } as StoryArchiveItem;
    }
  } catch (e) {
    console.warn('[archiveService] Supabase loadStory failed:', e);
  }

  // Fall back to IndexedDB (this device only)
  try {
    const db = await openDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(sessionId);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return null;
  }
}
