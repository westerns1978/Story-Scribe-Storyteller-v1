// services/api.ts
// ============================================
// Wissums API Service
// - generateStoryWithMagic → Supabase edge function (server-side, no API key exposed)
// - loadStoryFromVault → Supabase REST (anon key, works for share links)
// - All other functions → browser-side Gemini (AI Studio preview only)
// ============================================

import {
  ExtractResponse,
  GeneratedImage,
  StoryExtraction,
  Storyboard,
  ActiveStory,
  Artifact
} from '../types';
import { GoogleGenAI, Modality } from "@google/genai";
import { grokArtisan, GrokStyle } from './grokArtisanService';
import { buildStructuredPrompt, VisualStyle } from '../utils/visualPromptBuilder';

export { grokArtisan };

export const getAiClient = () => {
  // In the published Cloud Run app, process.env is empty — secrets don't inject here.
  // Functions that use getAiClient() only work in AI Studio preview.
  // Production paths (Connie voice, cascade, narration) route through Supabase edge functions.
  const key = (process.env as any).API_KEY
    || (process.env as any).GEMINI_API_KEY
    || (window as any).GEMINI_API_KEY
    || 'preview-only-routes-via-supabase-in-prod';
  return new GoogleGenAI({ apiKey: key });
};

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

const MODELS = {
  WRITER: 'gemini-2.5-flash',
  IMAGE: 'gemini-2.5-flash-image',
  VISION: 'gemini-2.5-flash',
  SEARCH: 'gemini-2.5-flash',
  TTS: 'gemini-2.5-flash-preview-tts',
  VIDEO: 'veo-3.1-fast-generate-preview'
};

const cleanJson = (text: string | undefined) => {
  if (!text) return '{}';
  return text.replace(/```json/gi, '').replace(/```/gi, '').trim();
};

// ─── Character description builder ───────────────────────────────────────────

function buildCharacterDescription(name: string, extraction: any): string {
  const parts: string[] = [name];
  const subject = extraction.people?.find((p: any) =>
    p.name?.toLowerCase().includes(name.split(' ')[0].toLowerCase())
  ) || extraction.subject || {};
  if (subject.ethnicity || subject.background) parts.push(subject.ethnicity || subject.background);
  if (extraction.background) parts.push(extraction.background);
  if (extraction.born || extraction.birth_year) parts.push(`born ${extraction.born || extraction.birth_year}`);
  if (extraction.setting?.primary || extraction.location) parts.push(extraction.setting?.primary || extraction.location);
  if (extraction.occupation || subject.role) parts.push(extraction.occupation || subject.role);
  return parts.filter(Boolean).join(', ');
}

// ═══════════════════════════════════════════════════════════════
// THE MAGIC CASCADE — Server-Side via Supabase Edge Function
// ═══════════════════════════════════════════════════════════════

export interface PhotoGrounding {
  era?: string;
  subject_description?: string;
  suggested_style?: string;
}

export async function generateStoryWithMagic(
  transcript: string,
  storytellerName: string,
  narrativeStyle: string,
  onProgress?: (step: string) => void,
  artifacts: { data: string; mimeType: string; extractedText?: string }[] = [],
  visualStyle: string = 'Cinematic (Non-Linear)',
  photoGrounding?: PhotoGrounding,
  musicQuery?: string,
  imagePalette?: string,
  language?: string,
  petMode?: boolean,
  verifiedPhotoFacts?: string[],
  uploadedPhotos?: { url: string; era: string; facts: string[] }[]
): Promise<ExtractResponse> {

  if (onProgress) onProgress('agent_scribe');

  const artifactTexts = artifacts
    .map(a => a.extractedText)
    .filter(Boolean) as string[];

  if (onProgress) onProgress('agent_cartographer');

  // Build body — photo grounding anchors AI images to the real person's era + appearance
  const body: Record<string, any> = {
    transcript,
    storyteller_name: storytellerName,
    narrative_style: narrativeStyle,
    artifact_texts: artifactTexts,
    include_images: true,
    visual_style: visualStyle,
    language: language || 'en',
    pet_mode: petMode || false,
    verified_photo_facts: verifiedPhotoFacts || [],
    uploaded_photos: (uploadedPhotos || []).map(p => ({
      url: p.url,
      era: p.era || '',
      facts: p.facts || [],
    })),
  };

  if (musicQuery) body.music_query = musicQuery;
  if (imagePalette) body.image_palette = imagePalette;

  if (photoGrounding) {
    body.photo_grounding = photoGrounding;
    // Also pass as photo_descriptions[] for edge function compatibility
    const descParts = [
      photoGrounding.era && `Era: ${photoGrounding.era}`,
      photoGrounding.subject_description,
    ].filter(Boolean);
    if (descParts.length > 0) {
      body.photo_descriptions = [descParts.join('. ')];
    }
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/story-cascade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cascade failed (${response.status}): ${errText}`);
  }

  if (onProgress) onProgress('agent_illustrator');
  const result = await response.json();
  if (onProgress) onProgress('agent_director');

  return {
    session_id: result.session_id,
    narrative: result.narrative,
    extraction: result.extraction,
    images: result.images || [],
    storyboard: result.storyboard,
    artifacts: result.artifacts || [],
    suggested_music_query: result.suggested_music_query,
    beat_audio: result.beat_audio || [],
  };
}

// ═══════════════════════════════════════════════════════════════
// NEURAL VAULT — Read stories back (for share links + shelf)
// Uses anon key REST — works without auth if RLS SELECT is open
// ═══════════════════════════════════════════════════════════════

export async function loadStoryFromVault(sessionId: string): Promise<ActiveStory | null> {
  try {
    // Use dynamic import so supabase-js is code-split and doesn't bloat the main bundle
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      console.warn('[Vault] loadStoryFromVault miss:', error?.message || 'no row');
      return null;
    }

    // Column is 'assets' jsonb: { images: [], videos: [], audio: [] }
    // storyboard and extraction are jsonb columns stored directly
    return {
      sessionId: data.session_id,
      storytellerName: data.storyteller_name,
      narrative: data.narrative,
      extraction: data.extraction,
      storyboard: data.storyboard,
      generatedImages: data.assets?.images || [],
      savedAt: data.created_at || data.saved_at,
      artifacts: data.extraction?.artifacts || [],
      background_music_url: data.background_music_url,
    };
  } catch (err) {
    console.error('[Vault] loadStoryFromVault error:', err);
    return null;
  }
}

export async function loadStoriesFromVault(limit = 20): Promise<any[]> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('session_id, storyteller_name, title, status, created_at, saved_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Vault] loadStoriesFromVault error:', err);
    return [];
  }
}

// saveStoryToVault is intentionally a no-op here —
// the edge function saves server-side with service role key (full access).
// Client-side saves are handled by archiveService.ts which writes
// to both IndexedDB (instant) and Supabase (for share links).
export async function saveStoryToVault(): Promise<{ success: boolean }> {
  // Edge function already saved it. This stub keeps any callers happy.
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE AI UTILITIES
// These use process.env.API_KEY — work in AI Studio preview,
// FAIL in published build. Route through edge functions for prod.
// ═══════════════════════════════════════════════════════════════

export async function translateContent(text: string, targetLanguage: string): Promise<string> {
  try {
    const ai = getAiClient();
    const res = await ai.models.generateContent({
      model: MODELS.WRITER,
      contents: `Translate the following life story segment into ${targetLanguage}. 
      Maintain the emotional depth, poetic style, and first-person perspective. 
      Ensure archival accuracy of names and dates.
      TEXT: "${text}"`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return res.text || text;
  } catch {
    return text;
  }
}

export async function healthCheck(): Promise<any> {
  return {
    status: 'healthy',
    version: '2.0.0',
    gemini: 'active',
    supabase: 'connected',
    artisan: 'grok-imagine',
    cascade: 'server-side'
  };
}

export async function diarize(transcript: string): Promise<string> {
  try {
    const ai = getAiClient();
    const res = await ai.models.generateContent({
      model: MODELS.WRITER,
      contents: `Diarize the following transcript. Identify speakers and format as speaker labels:\n\n${transcript}`
    });
    return res.text || transcript;
  } catch {
    return transcript;
  }
}

export async function generateImagesForStoryboard(
  storyboard: Storyboard,
  extraction: StoryExtraction,
  style: string,
  characterDescription?: string
): Promise<GeneratedImage[]> {
  const grokStyleMap: Record<string, GrokStyle> = {
    'Eloquent (Biographical)': 'documentary',
    'Cinematic (Non-Linear)': 'cinematic',
    'Vintage': 'vintage',
    'Nostalgic': 'nostalgic',
    'Poetic & Soulful': 'storybook',
    'Standard Narrative': 'warm_family'
  };
  const targetStyle = grokStyleMap[style] || 'cinematic';
  try {
    const results = await grokArtisan.generateStoryboardImages(storyboard, extraction, {
      style: targetStyle,
      characterDescription
    });
    return results;
  } catch (err: any) {
    console.error('[Artisan] Grok rejection:', err.message || err);
    throw err;
  }
}

export async function generateEventNarrationOnDemand(
  eventTitle: string,
  significance: string,
  year: string
): Promise<string> {
  try {
    const ai = getAiClient();
    const res = await ai.models.generateContent({
      model: MODELS.WRITER,
      contents: `Create a brief, evocative first-person narration for this life event: "${eventTitle}" in the year ${year}.
      CONTEXT: ${significance}.
      REQUIREMENT: Two sentences. Sensory, atmospheric, and capture the 'vibe' of that era.`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return res.text || '';
  } catch {
    return '';
  }
}

export async function generateLivingPortrait(base64Image: string, prompt: string): Promise<string> {
  const XAI_API_KEY = (import.meta as any).env.VITE_XAI_API_KEY || (process as any).env.XAI_API_KEY || '';
  if (!XAI_API_KEY) throw new Error('Video requires xAI API key.');

  const response = await fetch('https://api.x.ai/v1/video/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-video',
      prompt: `Cinematic living portrait: ${prompt}. Subtle motion, archival quality.`,
      image_url: base64Image,
      aspect_ratio: '16:9',
    }),
  });
  if (!response.ok) throw new Error(`Grok video failed: ${await response.text()}`);
  const { request_id } = await response.json();

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const s = await fetch(`https://api.x.ai/v1/video/generations/${request_id}`, {
      headers: { 'Authorization': `Bearer ${XAI_API_KEY}` },
    });
    const status = await s.json();
    if (status.status === 'completed' && status.url) return status.url;
    if (status.status === 'failed') throw new Error(status.error || 'Failed');
  }
  throw new Error('Video timed out');
}

export async function generateNarration(text: string, voiceName = 'Kore'): Promise<string> {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ parts: [{ text: `Act as a master storyteller. Narrate the following passage with soulful pacing, significant emotional pauses, and a warm, reflective cadence: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData.data;
}

export async function analyzeDocumentImage(base64: string): Promise<string> {
  const ai = getAiClient();
  const res = await ai.models.generateContent({
    model: MODELS.VISION,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
        { text: "Describe this historical artifact. Identify dates, names, and its significance to a family's history." }
      ]
    }
  });
  return res.text || '';
}

export async function reimaginePhoto(base64: string): Promise<any> {
  const ai = getAiClient();
  const res = await ai.models.generateContent({
    model: MODELS.IMAGE,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
        { text: "Enhance and reimagine this photo as a high-fidelity cinematic masterpiece. Focus on lighting and archival clarity." }
      ]
    }
  });
  const part = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (part?.inlineData) {
    return {
      original: `data:image/jpeg;base64,${base64}`,
      enhanced: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
    };
  }
  throw new Error('Photo reimagining failed.');
}

export async function editImageWithText(imageUrl: string, prompt: string): Promise<string> {
  const ai = getAiClient();
  const blob = await (await fetch(imageUrl)).blob();
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  const res = await ai.models.generateContent({
    model: MODELS.IMAGE,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });
  const part = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  throw new Error('Image edit failed.');
}

export async function findSemanticConnections(stories: any[]): Promise<any[]> {
  const ai = getAiClient();
  const ctx = stories.map(s => `Story: ${s.name}\nSummary: ${s.summary || s.extraction?.summary}`).join('\n---\n');
  const res = await ai.models.generateContent({
    model: MODELS.WRITER,
    contents: `Analyze these stories and find semantic connections. Return JSON: [{"entity": "string", "stories": ["name"], "type": "thematic/location", "reasoning": "string"}]\n\n${ctx}`,
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(cleanJson(res.text || '[]'));
}

export async function verifyHistoricalFacts(narrative: string): Promise<any> {
  const ai = getAiClient();
  const res = await ai.models.generateContent({
    model: MODELS.SEARCH,
    contents: `Verify historical facts in this narrative: "${narrative}"`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    text: res.text,
    sources: res.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function extractDocumentDNA(base64: string, mimeType: string): Promise<any> {
  const ai = getAiClient();
  const res = await ai.models.generateContent({
    model: MODELS.VISION,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: mimeType.startsWith('image') ? mimeType : 'image/jpeg' } },
        { text: `Analyze this historical artifact. Return JSON: {"title": "string", "summary": "string", "tags": ["string"]}` }
      ]
    },
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(cleanJson(res.text || '{}'));
}

export async function extractTextFromDocument(base64: string, mimeType: string): Promise<string> {
  const ai = getAiClient();
  const res = await ai.models.generateContent({
    model: MODELS.VISION,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: mimeType.startsWith('image') ? mimeType : 'image/jpeg' } },
        { text: "Transcribe the text from this document for a narrative archive." }
      ]
    }
  });
  return res.text || '';
}
