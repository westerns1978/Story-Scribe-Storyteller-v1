import React, {useState, useCallback, useEffect} from 'react';
import { Artifact } from '../../types';

// Inline icons
const SparklesIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
);

interface HeirloomsGalleryProps {
  artifacts: Artifact[];
}

// Evocative placeholder art styles for artifacts without images
const HEIRLOOM_STYLES = [
  'warm sepia oil painting, museum quality, dramatic chiaroscuro lighting',
  'vintage daguerreotype photograph, aged paper texture, vignette edges',
  'watercolor illustration, soft golden tones, antique feel',
  'detailed pencil sketch, aged parchment background, museum catalog style',
  'hand-tinted vintage photograph, soft warm palette, 1940s aesthetic',
];

const ArtifactCard: React.FC<{ item: Artifact; index: number }> = ({ item, index }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(item.image_url || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [failed, setFailed] = useState(false);

  const generateImage = useCallback(async () => {
    if (isGenerating || imgUrl || failed) return;
    setIsGenerating(true);
    try {
      const prompt = item.image_prompt ||
        `${item.name}, ${item.type}, circa ${item.era || 'vintage era'}. ${item.description}. ${HEIRLOOM_STYLES[index % HEIRLOOM_STYLES.length]}.`;

      const MCP_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co/functions/v1/mcp-orchestrator';
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
      const resp = await fetch(MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          agent: 'STORY_SCRIBE',
          tool: 'generate_image',
          params: {
            prompt,
            style: 'cinematic',
            visual_dna: 'antique, heirloom, museum quality, warm lighting, detailed texture',
            story_context: { era: item.era || 'vintage', mood: 'nostalgic', location: 'family home' }
          }
        })
      });
      const result = await resp.json();
      const url = result?.images?.[0]?.url || result?.image_url || result?.url;
      if (url) {
        setImgUrl(url);
      } else {
        throw new Error('No image returned');
      }
    } catch {
      setFailed(true);
    } finally {
      setIsGenerating(false);
    }
  }, [item, index, imgUrl, isGenerating, failed]);

  // Auto-trigger generation on mount if no image
  useEffect(() => {
    if (!imgUrl && !failed) {
      // Always try to generate — stagger to avoid rate limits
      const timer = setTimeout(generateImage, index * 800);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line

  return (
    <div
      className="group flex flex-col animate-fade-in"
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Image frame */}
      <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.7)]">

        {/* Type badge */}
        <div className="absolute top-4 right-4 z-20">
          <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.25em] bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {item.type || 'Artifact'}
          </span>
        </div>

        {imgUrl ? (
          <img
            src={imgUrl}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[2s]"
            alt={item.name}
            onError={() => { setImgUrl(null); setFailed(true); }}
          />
        ) : (
          /* Placeholder — richly styled, not just a grey box */
          <div
            className="w-full h-full flex flex-col items-center justify-center relative"
            style={{
              background: `radial-gradient(ellipse at 30% 30%, rgba(196,151,59,0.15), rgba(0,0,0,0.9))`,
            }}
          >
            {/* Decorative texture lines */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg, transparent, transparent 20px,
                  rgba(196,151,59,0.3) 20px, rgba(196,151,59,0.3) 21px
                )`
              }}
            />
            {isGenerating ? (
              <div className="relative z-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-2 border-heritage-warmGold/30 border-t-heritage-warmGold animate-spin mx-auto" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-heritage-warmGold/40">
                  Visualizing...
                </p>
              </div>
            ) : (
              <div className="relative z-10 text-center space-y-4 p-8">
                <SparklesIcon className="w-10 h-10 text-heritage-warmGold/30 mx-auto" />
                {!failed && (
                  <button
                    onClick={generateImage}
                    className="text-[9px] font-black uppercase tracking-[0.3em] text-heritage-warmGold/50 hover:text-heritage-warmGold border border-heritage-warmGold/20 hover:border-heritage-warmGold/50 px-4 py-2 rounded-full transition-all"
                  >
                    Visualize This Heirloom
                  </button>
                )}
                {failed && (
                  <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                    Image unavailable
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Text below card */}
      <div className="mt-6 space-y-3 px-2">
        <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
          <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase leading-tight">
            {item.name}
          </h3>
          {item.era && (
            <span className="text-heritage-warmGold font-mono font-bold text-xs tracking-[0.15em] flex-shrink-0 ml-3">
              {item.era}
            </span>
          )}
        </div>
        <p className="text-base text-white/55 leading-relaxed font-serif italic group-hover:text-white/80 transition-all duration-700">
          "{item.description}"
        </p>
      </div>
    </div>
  );
};

const HeirloomsGallery: React.FC<HeirloomsGalleryProps> = ({ artifacts }) => {
  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 bg-[#0a0807]">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border border-heritage-warmGold/10 flex items-center justify-center">
            <SparklesIcon className="w-10 h-10 text-heritage-warmGold/20" />
          </div>
        </div>
        <h3 className="text-2xl font-display font-black text-white/60 tracking-tighter uppercase">
          No Heirlooms Identified
        </h3>
        <p className="text-white/25 mt-4 max-w-sm font-serif italic text-base leading-relaxed">
          Heirlooms appear when the story references significant physical objects — photographs, letters, jewelry, keepsakes. Mention them in the story to unlock this collection.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#080605] overflow-y-auto scroll-viewport">
      <div className="max-w-5xl mx-auto px-8 py-16 space-y-20">

        {/* Header */}
        <header className="text-center">
          <span className="text-heritage-warmGold font-black tracking-[0.5em] uppercase text-[9px] mb-4 block">
            The Heritage Collection
          </span>
          <h2 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter">
            Heirlooms.
          </h2>
          <div className="w-16 h-px bg-heritage-warmGold/20 mx-auto mt-6" />
          <p className="text-white/30 font-serif italic text-sm mt-4">
            {artifacts.length} {artifacts.length === 1 ? 'artifact' : 'artifacts'} identified in this legacy
          </p>
        </header>

        {/* Grid */}
        <div className={`grid gap-12 lg:gap-16 pb-24 ${artifacts.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
          {artifacts.map((item, index) => (
            <ArtifactCard key={index} item={item} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeirloomsGallery;
