
// This utility constructs high-fidelity JSON prompts for Gemini Image Generation
// based on the user's "Pro-Level" prompt engineering techniques.

export type VisualStyle = 
  | 'Aurora Scanline' 
  | 'Ink Masterpiece' 
  | 'Coffee Relief' 
  | 'Istanbul Nostalgia' 
  | 'Cloud Scape'
  | 'Cinematic'
  | 'Realistic'
  | 'Watercolor';

export const buildStructuredPrompt = (context: string, style: VisualStyle): string => {
  const baseStructure = {
    model: "gemini-3-pro-image-preview",
    task: "generate_image",
    subject: {
      main: context.substring(0, 100), // Brief subject from narrative
      attributes: {}
    },
    environment: {},
    style: {},
    technical: {
      quality: "maximum",
      resolution: "4K"
    }
  };

  switch (style) {
    case 'Ink Masterpiece':
      return JSON.stringify({
        ...baseStructure,
        priority: {
          primary: "Hyper-realistic monochrome ink portrait illustration",
          secondary: "Studio-lit artistic scene emphasizing craftsmanship"
        },
        style: {
          artistic: "hyper-realistic monochrome ink illustration rendered in 3D photorealistic style",
          mood: "intimate, focused, artisanal",
          color_palette: "strict black ink on textured white paper"
        },
        composition: {
          foreground: "Realistic human hand holding a calligraphy pen hovering just above",
          midground: `Detailed ink drawing of: ${context}`,
          background: "Softly blurred studio surface with ink bottle"
        },
        materials_and_textures: {
          paper: "Textured white sketch paper with visible grain",
          ink: "Deep matte black ink with subtle sheen"
        },
        constraints: {
          color_restriction: "monochrome black ink only",
          no_cartoon: true
        }
      }, null, 2);

    case 'Coffee Relief':
      return JSON.stringify({
        ...baseStructure,
        subject: {
          subject_type: "Bas-relief impression in finely ground coffee",
          visual_signature: {
            material_type: "Finely ground coffee powder",
            texture_detail: "Ultra-detailed micro-granules, clumps, scattered dust"
          },
          inventory: {
            objects_present: ["Coffee grounds mound with image impression", "Stainless-steel teaspoon"],
            objects_absent: ["No text/logos", "No cups"]
          }
        },
        environment: {
          setting_type: "Indoor Studio Tabletop",
          background_surface: "Warm neutral beige surface"
        },
        style: {
          lighting: "Softbox upper-left, soft realistic shadows",
          camera: "Top-Down, f/5.6 aperture, sharp focus"
        },
        context_injection: context
      }, null, 2);

    case 'Istanbul Nostalgia':
      return JSON.stringify({
        ...baseStructure,
        style: {
          photographer_reference: "Ara Güler",
          mood: "loneliness, melancholy, quiet contemplation",
          aesthetic: "high-contrast black and white, visible film grain, 1950s-1970s atmosphere",
          lighting: "dim, moody, chiaroscuro"
        },
        environment: {
          location: "Old Istanbul café, wooden table, smoky air",
          details: "worn textures, glass tea cups, fading wall paint"
        },
        subject: {
          description: context,
          expression: "lost in thought, looking away"
        },
        technical: {
          aspect_ratio: "3:2",
          depth_of_field: "shallow"
        }
      }, null, 2);

    case 'Cloud Scape':
      return JSON.stringify({
        ...baseStructure,
        subject: {
          main: "Natural cloud formations organically assembling into a silhouette",
          silhouette_content: context
        },
        environment: {
          sky: "Vibrant blue, high altitude",
          ground: "Recognizable nature landscape below to ground the scene"
        },
        style: {
          mood: "calm, optimistic, peaceful",
          lighting: "crisp daylight, sunlit highlights",
          realism: "ultra-realistic, soft edges, no hard cartoons"
        }
      }, null, 2);

    case 'Aurora Scanline':
    default:
      // Fallback to the original Aurora style but structured
      return JSON.stringify({
        ...baseStructure,
        style: {
          aesthetic: "Cinematic, Atmospheric, Nostalgic",
          lighting: "Golden hour, volumetric rays, cinematic lighting",
          color_grading: "Warm, rich tones, Kodak Portra 400 feel"
        },
        subject: {
          description: context,
          focus: "Emotional resonance and storytelling"
        }
      }, null, 2);
  }
};
