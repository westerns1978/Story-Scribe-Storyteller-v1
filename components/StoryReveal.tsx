import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ActiveStory } from '../types';

interface StoryRevealProps {
  storyData: ActiveStory;
  onComplete: () => void;
}

const StoryReveal: React.FC<StoryRevealProps> = ({ storyData, onComplete }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const revealItems = useMemo(() => {
    const items = [];
    const validImages = (storyData.generatedImages || []).filter(img => img.success && img.image_url);
    const keyQuotes = storyData.extraction?.key_quotes || [];
    
    if (validImages.length > 0 && keyQuotes.length > 0) {
      items.push({ image: validImages[0].image_url, text: `"${keyQuotes[0]}"` });
    }
    if (validImages.length > 1 && storyData.extraction?.timeline?.[0]?.event) {
        items.push({ image: validImages[1].image_url, text: String(storyData.extraction.timeline[0].event) });
    }
    
    // Final item is always the storyteller's name
    items.push({ 
        image: validImages.length > 2 ? validImages[2].image_url : (validImages[0]?.image_url || null), 
        text: typeof storyData.storytellerName === 'string' ? storyData.storytellerName : 'A Story Unveiled', 
        isName: true 
    });
    
    return items;
  }, [storyData]);

  useEffect(() => {
    // Cinematic Volume Swell
    if (storyData.background_music_url && audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(e => console.warn("Ambiance node blocked by browser policy", e));
        
        let vol = 0;
        const swellInterval = setInterval(() => {
            if (vol < 0.6) {
                vol += 0.05;
                if (audioRef.current) audioRef.current.volume = vol;
            } else {
                clearInterval(swellInterval);
            }
        }, 800);

        return () => clearInterval(swellInterval);
    }
  }, [storyData.background_music_url]);

  useEffect(() => {
    if (currentItemIndex < revealItems.length - 1) {
      const timer = setTimeout(() => {
        setCurrentItemIndex(prev => prev + 1);
      }, 5000); // Slower, more epic pace
      return () => clearTimeout(timer);
    } 
  }, [currentItemIndex, revealItems.length]);
  
  const currentItem = revealItems[currentItemIndex];
  const isLastItem = currentItemIndex === revealItems.length - 1;

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in">
      {storyData.background_music_url && (
          <audio ref={audioRef} src={storyData.background_music_url} loop />
      )}
      
      <style>{`
        @keyframes reveal-zoom {
            0% { transform: scale(1.0) rotate(0deg); filter: brightness(0.4); }
            100% { transform: scale(1.15) rotate(0.5deg); filter: brightness(1); }
        }
        .animate-reveal-zoom {
            animation: reveal-zoom 15s ease-out forwards;
        }
        .reveal-gradient {
            background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.9) 100%);
        }
      `}</style>

      {revealItems.map((item, index) => (
        item.image && (
          <div 
            key={index}
            className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
            style={{ 
                zIndex: index, 
                opacity: index === currentItemIndex ? 1 : 0
            }}
          >
            <img 
                src={item.image} 
                alt="Memory Fragment" 
                className={`w-full h-full object-cover ${index === currentItemIndex ? 'animate-reveal-zoom' : ''}`}
            />
          </div>
        )
      ))}
      
      <div className="absolute inset-0 reveal-gradient z-10"></div>
      
      <div key={currentItemIndex} className="relative z-20 text-center px-10 max-w-4xl animate-fade-in-up">
        {currentItem.isName ? (
          <div className="flex flex-col items-center gap-12">
              <span className="text-amber-500 font-mono text-[10px] font-bold uppercase tracking-[0.8em] animate-pulse">Legacy Materialized</span>
              <h1 className="text-7xl md:text-9xl font-display font-black text-white tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                {currentItem.text}
              </h1>
              {isLastItem && (
                  <button 
                    onClick={onComplete}
                    className="group px-16 py-6 bg-white/10 hover:bg-white text-white hover:text-black border border-white/40 rounded-full font-black text-xs tracking-[0.4em] uppercase transition-all transform active:scale-95 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]"
                  >
                      Explore the Archive
                  </button>
              )}
          </div>
        ) : (
          <div className="space-y-8">
              <div className="w-16 h-1 bg-amber-500 mx-auto opacity-60"></div>
              <p className="text-3xl md:text-6xl text-white/90 font-serif leading-tight italic drop-shadow-[0_10px_20px_rgba(0,0,0,1)] px-6">
                {currentItem.text}
              </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-30 px-32">
          {revealItems.map((_, idx) => (
              <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-[2000ms] ${idx <= currentItemIndex ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-white/10'}`} />
          ))}
      </div>
    </div>
  );
}

export default StoryReveal;