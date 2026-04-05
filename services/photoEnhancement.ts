import { getAiClient } from './api';

export type EnhancementStyle = 
  | 'pro_portrait' 
  | 'ink_sketch' 
  | 'cloud_spirit' 
  | 'coffee_dust' 
  | 'guler_noir' 
  | 'restore'
  | 'old_master'
  | 'emerald_vintage'
  | 'visionary_blueprint'
  | 'silver_daguerreotype';

export const STYLE_INFO: Record<EnhancementStyle, { name: string, icon: string, description: string, prompt: string, color: string, statusMsg: string }> = {
  restore: {
    name: 'Standard Restore',
    icon: '✨',
    description: 'General repair and colorization of faded memories.',
    prompt: 'Restore this photo to high quality. Repair scratches, adjust colors to look natural, and sharpen the image. Preserve original identity perfectly.',
    color: '#C97759',
    statusMsg: 'Repairing silver halides and color layers...'
  },
  pro_portrait: {
    name: 'Canon R5 Studio',
    icon: '📸',
    description: 'Professional 8K portrait with high-end studio lighting.',
    prompt: 'Transform this source memory into a professional 8K portrait. Replicate the clarity and color science of a Canon EOS R5 with an 85mm prime lens. Remove all noise while preserving 100% facial likeness. Match lighting to a high-end studio setup with subtle catchlights.',
    color: '#3B82F6',
    statusMsg: 'Calibrated studio lighting and 85mm lens logic...'
  },
  ink_sketch: {
    name: 'Calligraphy Ink',
    icon: '🖋️',
    description: 'Hyper-realistic monochrome ink on textured cream paper.',
    prompt: 'Render this subject as a hyper-realistic monochrome ink illustration. The subject is drawn in deep matte black ink on textured cream sketch paper. Include a realistic human hand holding a calligraphy pen to emphasize the artisan process. Dramatic chiaroscuro lighting.',
    color: '#1e293b',
    statusMsg: 'Sourcing deep matte black ink and textured paper...'
  },
  cloud_spirit: {
    name: 'Sky Silhouette',
    icon: '☁️',
    description: 'Likeness organically assembled into cloud formations.',
    prompt: 'An ultra-realistic sky scene where soft, natural cloud formations organically assemble into the clear silhouette of the person in the reference image. Vibrant blue sky above a recognizable landscape. High sunlit highlights on the clouds.',
    color: '#60a5fa',
    statusMsg: 'Weaving cloud structures into your silhouette...'
  },
  coffee_dust: {
    name: 'Mocha Impression',
    icon: '☕',
    description: 'Bas-relief impression in finely ground coffee powder.',
    prompt: 'Top-down tabletop photo. The face from the reference is formed as a pressed bas-relief impression in finely ground coffee powder. Include ultra-detailed micro-granules and a stainless-steel teaspoon. Softbox lighting with realistic shadows.',
    color: '#78350f',
    statusMsg: 'Sifting the coffee grounds for a perfect impression...'
  },
  guler_noir: {
    name: 'Istanbul Noir',
    icon: '🕯️',
    description: '1950s documentary film aesthetic in the style of Ara Güler.',
    prompt: 'Apply a 1950s documentary film aesthetic in the style of Ara Güler. High-contrast B&W, visible film grain, and moody window light. Set the subject in a nostalgic, dim café environment. Maintain exact facial features with a melancholy atmosphere.',
    color: '#000000',
    statusMsg: 'Applying 1950s documentary film grain...'
  },
  old_master: {
    name: 'The Old Master',
    icon: '🎨',
    description: '17th-century Baroque oil painting with thick brushstrokes.',
    prompt: 'Transform this image into a 17th-century Baroque oil painting. Use deep, rich earth tones—sienna, ochre, and umber. The subject should emerge from a dark background with dramatic "Rembrandt lighting." Maintain 100% likeness but with visible, thick oil brushstrokes and a subtle varnish crackle (craquelure) to the surface.',
    color: '#7c2d12',
    statusMsg: 'Mixing rich sienna and ochre oil pigments...'
  },
  emerald_vintage: {
    name: 'Emerald Coast',
    icon: '🏖️',
    description: 'High-fidelity 1960s Kodachrome Florida aesthetic.',
    prompt: 'Render this photo as a high-fidelity 1960s Kodachrome slide. Saturate the teals and oranges to mimic a vintage Florida vacation aesthetic (specifically the Navarre Beach/Gulf coast vibe). High sun, sharp shadows, and that iconic "National Geographic" film glow.',
    color: '#0d9488',
    statusMsg: 'Developing 1960s Kodachrome slide chemistry...'
  },
  visionary_blueprint: {
    name: 'Visionary Blueprint',
    icon: '📐',
    description: 'Technical cyanotype blueprint with Wissums specs.',
    prompt: 'Convert the subject into a technical architectural blueprint. The face is rendered using precise white cyanotype lines on a deep blueprint-blue background. Include subtle grid lines, drafting measurements, and "Wissums Technical Specifications" written in a clean architectural font in the corner.',
    color: '#1e3a8a',
    statusMsg: 'Plotting technical specifications and cyanotype lines...'
  },
  silver_daguerreotype: {
    name: 'Silver Heritage',
    icon: '💿',
    description: 'Ultra-heritage 1850s silver plate daguerreotype.',
    prompt: 'A hyper-realistic restoration of an 1850s silver plate daguerreotype. The image should have a reflective, metallic sheen with a range of silver and charcoal tones. Include minor authentic aging: soft edge-tarnishing and a mirror-like finish. Stoic and timeless.',
    color: '#475569',
    statusMsg: 'Polishing the silver plate for an 1850s exposure...'
  }
};

const SYSTEM_INSTRUCTION = `You are the Archive Artisan, the master of "Ultra-HD Heritage Restoration" for Wissums. You treat every image not as a file, but as a "Source Memory."
The Wissums Aesthetic:
Physicality: Results must look like they exist in the physical world (ink, coffee, film, paper).
Identity: Maintain 100% facial identity. We clarify history; we do not rewrite it.
Palette: Lean into warm, organic tones—terracotta, cream, sienna, and deep browns.
Format: Respect the classic 4:5 aspect ratio.`;

async function fileToBase64(file: File): Promise<{ data: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      resolve({ data, mimeType });
    };
    reader.onerror = error => reject(error);
  });
}

export async function enhancePhoto(
  file: File | string,
  style: EnhancementStyle,
  onProgress: (msg: string) => void
): Promise<{ imageData: string }> {
  let data: string;
  let mimeType: string;

  if (typeof file === 'string') {
    const match = file.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) throw new Error("Invalid image format");
    mimeType = match[1];
    data = match[2];
  } else {
    const res = await fileToBase64(file);
    data = res.data;
    mimeType = res.mimeType;
  }
  
  onProgress(STYLE_INFO[style].statusMsg);
  
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: STYLE_INFO[style].prompt }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      imageConfig: {
        aspectRatio: "4:5"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part?.inlineData) {
    return { imageData: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
  }

  throw new Error(response.text || "The Archive Artisan was unable to render this style.");
}

export async function saveEnhancedToVault(
  imageData: string,
  fileName: string,
  style: string
): Promise<string> {
  return imageData;
}