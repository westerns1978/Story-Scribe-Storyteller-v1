// services/imageEditService.ts
// ============================================
// Regenerate a single story scene image via mcp-orchestrator
// Applies a user modifier prompt on top of the original image prompt
// Returns the new image URL — caller updates story state locally
// ============================================

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

export interface ImageEditRequest {
  originalPrompt: string;   // the prompt that generated this image
  modifier: string;         // what the user wants changed
  beatTitle?: string;       // for context
  storytellerName?: string; // for grounding
}

export interface ImageEditResult {
  image_url: string;
  revised_prompt: string;
}

export async function regenerateSceneImage(
  req: ImageEditRequest,
  onProgress?: (msg: string) => void
): Promise<ImageEditResult> {
  onProgress?.('Crafting new scene…');

  // Build a refined prompt that preserves original intent but applies the modifier
  const refinedPrompt = buildRefinedPrompt(req);

  onProgress?.('Generating image…');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/mcp-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      agent: 'STORY_SCRIBE',
      tool: 'generate_image',
      params: {
        prompt: refinedPrompt,
        style: 'nostalgic',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Image generation failed: ${response.status} — ${err.slice(0, 200)}`);
  }

  const data = await response.json();

  onProgress?.('Done');

  // mcp-orchestrator generate_image returns { success, images: [{url, prompt_used}] }
  const imageUrl = data.image_url || data.url || data.images?.[0]?.url || data.images?.[0]?.image_url || '';
  if (!imageUrl) {
    throw new Error('No image URL in response: ' + JSON.stringify(data).slice(0, 200));
  }

  return {
    image_url: imageUrl,
    revised_prompt: refinedPrompt,
  };
}

function buildRefinedPrompt(req: ImageEditRequest): string {
  const { originalPrompt, modifier, beatTitle, storytellerName } = req;

  // Clean modifier
  const cleanModifier = modifier.trim();

  // Build a prompt that preserves cinematic heritage style
  // but applies the user's correction
  const parts = [
    originalPrompt,
    `IMPORTANT CORRECTION: ${cleanModifier}`,
  ];

  if (storytellerName) {
    parts.push(`Subject: ${storytellerName}`);
  }

  if (beatTitle) {
    parts.push(`Scene: ${beatTitle}`);
  }

  // Always enforce artistic style to avoid bad realism
  parts.push(
    'Style: painterly, cinematic, warm heritage tones, artistic interpretation — NOT photorealistic'
  );

  return parts.join('\n\n');
}
