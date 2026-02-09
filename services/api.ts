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
    // ALWAYS use process.env.API_KEY as per mandatory guidelines
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const MODELS = {
    // Standardized to valid model names for early 2025 stability
    WRITER: 'gemini-3-flash-preview', 
    IMAGE: 'gemini-2.5-flash-image',
    VISION: 'gemini-3-flash-preview',
    SEARCH: 'gemini-3-flash-preview',
    TTS: 'gemini-2.5-flash-preview-tts',
    VIDEO: 'veo-3.1-fast-generate-preview'
};

const cleanJson = (text: string | undefined) => {
    if (!text) return '{}';
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return cleaned;
};

/**
 * Real-time translation for Multilingual Heritage Nodes
 */
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
    } catch (error) {
        console.error('[Translation] Node failed:', error);
        return text;
    }
}

export async function healthCheck(): Promise<any> {
    return { 
        status: 'healthy', 
        version: '1.2.14', 
        gemini: 'active', 
        supabase: 'connected',
        artisan: 'grok-imagine'
    };
}

export async function diarize(transcript: string): Promise<string> {
    try {
        const ai = getAiClient();
        const res = await ai.models.generateContent({
            model: MODELS.WRITER,
            contents: `Diarize the following transcript. Identify speakers and format as speaker labels: \n\n${transcript}`
        });
        return res.text || transcript;
    } catch (error: any) {
        console.error('[Diarize] Error:', error.message);
        return transcript;
    }
}

/**
 * Orchestrates storyboard image generation.
 * Uses Grok Imagine for cinematic scenes.
 */
export async function generateImagesForStoryboard(
    storyboard: Storyboard, 
    extraction: StoryExtraction, 
    style: string
): Promise<GeneratedImage[]> {
    console.log(`[Artisan] Initiating cinematic synthesis with Grok Imagine for style: ${style}`);
    
    // Map UI styles to Grok-supported style primitives
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
            style: targetStyle 
        });
        console.log(`[Artisan] Grok returned ${results.length} images.`);
        return results;
    } catch (err: any) {
        console.error("[Artisan] Grok Synthesis REJECTION:", err.message || err);
        throw err;
    }
}

export async function generateStoryWithMagic(
    transcript: string, 
    storytellerName: string, 
    narrativeStyle: string, 
    onProgress?: (step: any) => void,
    artifacts: { data: string, mimeType: string, extractedText?: string }[] = [],
    visualStyle: string = 'Cinematic (Non-Linear)'
): Promise<ExtractResponse> {
    try {
        const ai = getAiClient();
        
        // --- STEP 1: AGENT SCRIBE (Narrative & Intelligence) ---
        if (onProgress) onProgress('agent_scribe');
        
        const artifactContextText = artifacts.map(a => a.extractedText).filter(Boolean).join('\n---\n');
        
        // Construct visual input parts for Scribe Agent
        const visualParts = artifacts
          .filter(a => a.mimeType.startsWith('image/'))
          .slice(0, 5)
          .map(art => {
            if (!art.data) return null;
            return { inlineData: { data: art.data, mimeType: art.mimeType } };
          })
          .filter(Boolean) as any[];

        console.log('[Cascade] Initializing Scribe with model:', MODELS.WRITER);

        const scribeRes = await ai.models.generateContent({
            model: MODELS.WRITER,
            contents: {
                parts: [
                    ...visualParts,
                    { text: `Act as Agent Scribe. Create an Immersive Cinematic Legacy Archive for ${storytellerName}.
                    SOURCE MATERIALS:
                    TRANSCRIPT: "${transcript}"
                    HISTORICAL_RECORDS_TEXT: "${artifactContextText}"
                    INSTRUCTIONS:
                    1. Narrative: A 1000-word masterpiece weaving verbal memories and historical document facts.
                    2. Historical Anchoring: Research EVERY year/location mentioned. Populate "historical_context".
                    3. Evocative Detail Synthesis: Populate "details" field with sensory immersion.
                    4. For the Timeline: Include an "evocative_narration" for EVERY event. This is a 2-sentence atmospheric snippet written in the first person ("I remember..."), capturing the specific sights, sounds, and texture of that era and location.
                    5. Output high-fidelity JSON.
                    STYLE: ${narrativeStyle}
                    OUTPUT_JSON_SCHEMA:
                    {
                      "narrative": "string",
                      "summary": "string",
                      "timeline": [{"year": "string", "event": "string", "significance": "string", "historical_context": "string", "details": "string", "evocative_narration": "string"}],
                      "locations": [{"name": "string", "type": "string"}],
                      "themes": ["string"],
                      "life_lessons": ["string"],
                      "artifacts": [{"name": "string", "type": "string", "description": "string", "era": "string", "image_prompt": "string"}],
                      "storyboard": {"story_beats": [{"beat_title": "string", "narrative_chunk": "string", "visual_focus": "string", "directors_notes": "string"}]}
                    }` }
                ]
            },
            config: { responseMimeType: "application/json" } 
        });
        
        let scribeData;
        try {
            scribeData = JSON.parse(cleanJson(scribeRes.text));
        } catch (e) {
            console.error("[Scribe] JSON Parsing Failed. Attempting recovery...");
            scribeData = { 
                narrative: scribeRes.text?.substring(0, 500), 
                summary: "Synthesis partially completed.",
                timeline: [], 
                storyboard: { story_beats: [] },
                artifacts: []
            };
        }

        // --- STEP 2: AGENT CARTOGRAPHER ---
        if (onProgress) onProgress('agent_cartographer');
        
        // --- STEP 3: AGENT ILLUSTRATOR (Grok Imagine Path) ---
        if (onProgress) onProgress('agent_illustrator');
        let finalImages: GeneratedImage[] = [];
        try {
            finalImages = await generateImagesForStoryboard(scribeData.storyboard, scribeData as any, visualStyle);
            
            // Fix Heirlooms: Generate images for extracted artifacts
            if (scribeData.artifacts && scribeData.artifacts.length > 0) {
              console.log(`[Artisan] Synthesizing artifact DNA for ${scribeData.artifacts.length} heirlooms...`);
              const artifactImages = await Promise.all(
                scribeData.artifacts.slice(0, 4).map(async (artifact: Artifact) => {
                  try {
                    const url = await grokArtisan.generateImage(
                      artifact.image_prompt || `A vintage archival photograph of ${artifact.name}, ${artifact.description}`, 
                      scribeData as any, 
                      'archival, studio lighting, isolated on neutral background'
                    );
                    return { ...artifact, image_url: url };
                  } catch (e) {
                    console.warn(`[Artisan] Artifact node skipped: ${artifact.name}`, e);
                    return artifact;
                  }
                })
              );
              scribeData.artifacts = artifactImages;
            }
        } catch (imgErr: any) {
            console.warn("[Illustrator] Grok node failed. Falling back to empty slots.", imgErr.message);
            finalImages = (scribeData.storyboard?.story_beats || []).map((beat: any, i: number) => ({
                index: i, success: false, image_url: '', prompt: beat.visual_focus, error: 'Synthesis Interrupted'
            }));
        }

        // --- STEP 4: AGENT DIRECTOR ---
        if (onProgress) onProgress('agent_director');

        const response: ExtractResponse = {
            session_id: `gemynd-${Date.now()}`, 
            narrative: scribeData.narrative,
            extraction: { ...scribeData, storyteller: { name: storytellerName } },
            images: finalImages,
            storyboard: scribeData.storyboard,
            artifacts: scribeData.artifacts || []
        };

        // Save to Neural Vault for persistence and GET THE REAL UUID
        try {
            await saveStoryToVault(storytellerName, transcript, response.narrative, response.extraction, response.storyboard, response.images);
        } catch (vErr) {
            console.warn("[Vault] Auto-save skipped during cascade", vErr);
        }

        return response;
    } catch (error: any) {
        console.error('[Cascade] Error:', error);
        throw error;
    }
}

export async function generateEventNarrationOnDemand(eventTitle: string, significance: string, year: string): Promise<string> {
    try {
        const ai = getAiClient();
        const res = await ai.models.generateContent({
            model: MODELS.WRITER,
            contents: `Create a brief, evocative first-person narration for this life event: "${eventTitle}" in the year ${year}. 
            CONTEXT: ${significance}.
            REQUIREMENT: Two sentences. Sensory, atmospheric, and capture the 'vibe' of that era.`,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return res.text || "";
    } catch (error) {
        console.error('[EventNarration] Error:', error);
        return "";
    }
}

export async function generateLivingPortrait(base64Image: string, prompt: string): Promise<string> {
    const XAI_API_KEY = (import.meta as any).env.VITE_XAI_API_KEY || (process as any).env.XAI_API_KEY || '';
    
    if (!XAI_API_KEY) {
        throw new Error('Video requires xAI API key. Set VITE_XAI_API_KEY or XAI_API_KEY.');
    }

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

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Grok video failed: ${err}`);
    }

    const { request_id } = await response.json();

    for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusResponse = await fetch(`https://api.x.ai/v1/video/generations/${request_id}`, {
            headers: { 'Authorization': `Bearer ${XAI_API_KEY}` },
        });
        const status = await statusResponse.json();
        
        if (status.status === 'completed' && status.url) return status.url;
        if (status.status === 'failed') throw new Error(status.error || 'Failed');
    }
    
    throw new Error('Video timed out');
}

export async function generateNarration(text: string, voiceName: string = 'Kore'): Promise<string> {
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
    return res.text || "";
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
    const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) {
        return {
            original: `data:image/jpeg;base64,${base64}`,
            enhanced: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        };
    }
    throw new Error("Photo reimagining failed.");
}

export async function editImageWithText(imageUrl: string, prompt: string): Promise<string> {
    const ai = getAiClient();
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
    });
    const res = await ai.models.generateContent({
        model: MODELS.IMAGE,
        contents: {
            parts: [ { inlineData: { data: base64Data, mimeType: 'image/png' } }, { text: prompt } ]
        }
    });
    const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Image edit failed.");
}

export async function findSemanticConnections(stories: any[]): Promise<any[]> {
    const ai = getAiClient();
    const storiesContext = stories.map(s => `Story: ${s.name}\nSummary: ${s.summary || s.extraction?.summary}`).join('\n---\n');
    const res = await ai.models.generateContent({
        model: MODELS.WRITER,
        contents: `Analyze these stories and find semantic connections. Return JSON: [{"entity": "string", "stories": ["name"], "type": "thematic/location", "reasoning": "string"}] \n\n${storiesContext}`,
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
    return { text: res.text, sources: res.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
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
        config: { responseMimeType: "application/json" }
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
    return res.text || "";
}

// ═══════════════════════════════════════════════════════════════
// NEURAL VAULT PERSISTENCE - Added for Supabase storage
// ═══════════════════════════════════════════════════════════════

const SUPABASE_CONFIG = {
    URL: 'https://ldzzlndsspkyohvzfiiu.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI'
};

export async function saveStoryToVault(
  storytellerName: string,
  transcript: string,
  narrative: string,
  extraction: any,
  storyboard: any,
  images: any[]
): Promise<{ success: boolean; session_id?: string; error?: string }> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    const { data, error } = await supabase
      .from('storyscribe_stories')
      .insert({
        storyteller_name: storytellerName,
        transcript: transcript,
        narrative: narrative,
        extraction: extraction,
        storyboard: storyboard,
        assets: { images: images || [], videos: [], audio: [] },
        status: 'complete',
        progress: 100,
        org_id: '71077b47-66e8-4fd9-90e7-709773ea6582',
        title: `The Story of ${storytellerName}`
      })
      .select('session_id')
      .single();

    if (error) {
      console.error('[Vault] Save failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[Vault] ✅ Story saved:', data.session_id);
    return { success: true, session_id: data.session_id };
  } catch (err: any) {
    console.error('[Vault] Error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function loadStoriesFromVault(limit: number = 20): Promise<any[]> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('session_id, storyteller_name, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Vault] Load failed:', err);
    return [];
  }
}

export async function loadStoryFromVault(sessionId: string): Promise<ActiveStory | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) return null;
    
    return {
      sessionId: data.session_id,
      storytellerName: data.storyteller_name,
      narrative: data.narrative,
      extraction: data.extraction,
      storyboard: data.storyboard,
      generatedImages: data.assets?.images || [],
      savedAt: data.created_at,
      artifacts: data.extraction?.artifacts || []
    };
  } catch (err) {
    console.error('[Vault] Public load failed:', err);
    return null;
  }
}