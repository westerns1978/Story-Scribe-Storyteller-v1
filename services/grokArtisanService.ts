
import { StoryExtraction, Storyboard, GeneratedImage } from '../types';

const MCP_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co/functions/v1/mcp-orchestrator';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

export type GrokStyle = 'cinematic' | 'vintage' | 'storybook' | 'nostalgic' | 'warm_family' | 'technicolor' | 'victorian' | 'documentary';

interface StoryContext {
    era: string;
    mood: string;
    location: string;
}

class GrokArtisanService {
    private async callOrchestrator(tool: string, params: any) {
        console.log(`[Artisan] Initiating ${tool} handshake...`);
        
        try {
            const response = await fetch(MCP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    agent: 'STORY_SCRIBE',
                    tool,
                    params
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error(`[Artisan] Node Rejection (${response.status}):`, errorData);
                throw new Error(`Artisan Uplink Failed: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            console.log(`[Artisan] Node Response Received:`, data.success ? 'SUCCESS' : 'FAILURE');
            return data;
        } catch (err: any) {
            console.error(`[Artisan] Transmission Error:`, err.message);
            throw err;
        }
    }

    public determineStyleAndContext(extraction: StoryExtraction): { style: GrokStyle; context: StoryContext } {
        const years = (extraction.timeline || [])
            .map(e => parseInt(String(e.year), 10))
            .filter(y => !isNaN(y) && y > 1800);
        
        const firstYear = years.length > 0 ? Math.min(...years) : 1950;
        const mood = extraction.emotional_journey?.overall_tone || extraction.themes?.[0] || 'nostalgic';
        const location = extraction.locations?.[0]?.name || 'Unknown Location';

        let style: GrokStyle = 'cinematic';
        let era = 'Modern Era';

        if (firstYear < 1910) {
            style = 'victorian';
            era = 'Victorian Era';
        } else if (firstYear < 1946) {
            style = 'vintage';
            era = 'Early 20th Century';
        } else if (firstYear < 1970) {
            style = 'technicolor';
            era = 'Mid-Century';
        } else if (firstYear < 1990) {
            style = 'nostalgic';
            era = 'Late 20th Century';
        } else {
            style = 'cinematic';
            era = 'Contemporary';
        }

        if (years.length > 0) {
            const decade = Math.floor(firstYear / 10) * 10;
            era = `${decade}s era`;
        }

        return { style, context: { era, mood, location } };
    }

    async generateImage(prompt: string, extraction: StoryExtraction, visualDna?: string): Promise<string> {
        const { style, context } = this.determineStyleAndContext(extraction);
        const result = await this.callOrchestrator('generate_image', {
            prompt,
            style,
            visual_dna: visualDna || 'Cinematic, high-quality, period appropriate',
            story_context: context
        });

        if (result.success && result.images?.[0]?.url) {
            return result.images[0].url;
        }
        throw new Error("Grok failed to visualize the scene.");
    }

    async generateStoryboardImages(
        storyboard: Storyboard, 
        extraction: StoryExtraction,
        overrides?: { style?: GrokStyle, era?: string, characterDescription?: string }
    ): Promise<GeneratedImage[]> {
        const { style, context } = this.determineStyleAndContext(extraction);
        
        const finalStyle = overrides?.style || style;
        const finalContext = {
            ...context,
            era: overrides?.era || context.era
        };

        const beats = (storyboard.story_beats || []).map((beat, idx) => ({
            beat_id: `beat_${idx}`,
            title: beat.beat_title,
            visual_prompt: beat.visual_focus
        }));

        if (beats.length === 0) {
            console.warn("[Artisan] No story beats found. Aborting Grok synthesis.");
            return [];
        }

        const result = await this.callOrchestrator('generate_storyboard', {
            beats,
            visual_dna: storyboard.visual_dna || 'vintage, grainy film stock, soft lighting',
            story_context: finalContext,
            style: finalStyle,
            character_description: overrides?.characterDescription
        });

        if (!result.success) {
            console.error("[Artisan] Grok Storyboard Node rejected payload:", result.error || 'Unknown Error');
            throw new Error(result.error || "Grok Storyboard Node Failed.");
        }

        // URL VALIDATION TELEMETRY
        if (result.images && result.images.length > 0) {
            const nullUrls = result.images.filter((img: any) => !img.image_url);
            if (nullUrls.length > 0) {
                console.warn(`[Artisan] Grok returned success but ${nullUrls.length} image URLs are missing.`, result);
            }
        }

        return result.images.map((img: any, idx: number) => ({
            index: idx,
            success: !!img.image_url,
            image_url: img.image_url,
            prompt: storyboard.story_beats[idx]?.visual_focus || 'Scene',
            provider: 'Grok Imagine',
            scene: storyboard.story_beats[idx]?.beat_title
        }));
    }

    async generateCover(storytellerName: string, extraction: StoryExtraction, visualDna?: string): Promise<string> {
        const { style } = this.determineStyleAndContext(extraction);
        const result = await this.callOrchestrator('generate_cover', {
            title: `The Legacy of ${storytellerName}`,
            storyteller_name: storytellerName,
            themes: extraction.themes || [],
            visual_dna: visualDna || 'Cinematic portrait, masterpiece',
            style
        });

        if (result.success && result.cover?.url) return result.cover.url;
        throw new Error("Grok failed to render the cover artifact.");
    }
}

export const grokArtisan = new GrokArtisanService();
