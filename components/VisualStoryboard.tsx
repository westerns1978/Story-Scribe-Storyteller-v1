import React, { useRef, useEffect, useState } from 'react';
import { Storyboard, GeneratedImage, StoryBeat } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ImageIcon from './icons/ImageIcon';
import SparklesIcon from './icons/SparklesIcon';
import WriteIcon from './icons/WriteIcon';
import WandIcon from './icons/WandIcon';
import ClapperboardIcon from './icons/ClapperboardIcon';
import VideoCameraIcon from './icons/VideoCameraIcon';
import { generateLivingPortrait } from '../services/api';
import Loader2Icon from './icons/Loader2Icon';

interface VisualStoryboardProps {
  storyboard: Storyboard;
  generatedImages: GeneratedImage[];
  currentBeatIndex: number;
  onBeatClick: (index: number) => void;
  onImageUpdated?: (index: number, newUrl: string, isVideo?: boolean) => void;
  onReorderBeats?: (oldIndex: number, newIndex: number) => void;
}

const VisualStoryboard: React.FC<VisualStoryboardProps> = ({ 
  storyboard, 
  generatedImages, 
  currentBeatIndex, 
  onBeatClick, 
  onImageUpdated,
  onReorderBeats
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentBeatIndex]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleAnimate = async (index: number) => {
      const image = generatedImages.find(img => img.index === index);
      if (!image?.image_url || animatingIndex !== null) return;

      setAnimatingIndex(index);
      try {
          const videoUrl = await generateLivingPortrait(image.image_url, storyboard.story_beats[index].visual_focus);
          if (onImageUpdated) {
              onImageUpdated(index, videoUrl, true);
          }
      } catch (err: any) {
          console.error("Living Portrait synthesis failure", err);
          const isKeyError = err.message?.includes("Requested entity was not found") || err.message?.includes("API key");
          const errorMsg = isKeyError 
            ? "Synthesis node rejected credentials. Re-authenticate via the AI Studio key dialog to unlock video production."
            : "Directorial uplink failed: The Artisan was unable to animate this scene at this time.";
          
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { message: errorMsg, type: 'error' } 
          }));
          
          if (!isKeyError) alert(errorMsg);
      } finally {
          setAnimatingIndex(null);
      }
  };

  const handleMove = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!onReorderBeats) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < storyboard.story_beats.length) {
      onReorderBeats(index, newIndex);
    }
  };

  if (!storyboard?.story_beats || storyboard.story_beats.length === 0) {
    return (
      <div className="p-8 text-center bg-white/5 border border-white/10 rounded-[2.5rem] italic text-white/40">
        The cinematic storyboard is awaiting agent synthesis...
      </div>
    );
  }

  const safeImages = generatedImages || [];
  const activeBeat = storyboard.story_beats[currentBeatIndex] || storyboard.story_beats[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="text-2xl lg:text-4xl font-display font-black text-heritage-ink tracking-tight">Cinematic Storyboard</h3>
            <p className="text-[10px] font-bold text-heritage-inkMuted uppercase tracking-[0.4em] mt-1">Directorial Sequence</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
              <SparklesIcon className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Artisan Active</span>
          </div>
      </div>
      
      <div className="relative group bg-heritage-parchment/40 border border-heritage-parchment rounded-[2rem] p-6">
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-heritage-cream/90 backdrop-blur shadow-lg hover:bg-heritage-burgundy hover:text-white rounded-full text-heritage-ink opacity-0 group-hover:opacity-100 transition-all border border-heritage-parchment"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        
        <div
          ref={scrollContainerRef}
          className="flex space-x-8 overflow-x-auto pb-6 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {storyboard.story_beats.map((beat, index) => {
            // FIX: Match image by its property index, NOT the loop index, to allow for reordering
            const image = safeImages.find(img => img.index === beat.image_index);
            const isActive = index === currentBeatIndex;
            const isGenerating = image?.error === 'pending';
            const isAnimating = animatingIndex === index;
            const hasVideo = !!image?.video_url;
            const isFailed = image && !image.success && !isGenerating;

            return (
              <button
                key={index}
                ref={isActive ? activeItemRef : null}
                onClick={() => onBeatClick(index)}
                className={`flex-shrink-0 w-80 group/card rounded-[2.5rem] overflow-hidden transition-all duration-700 transform hover:-translate-y-3 focus:outline-none relative ${
                  isActive ? 'ring-4 ring-gemynd-oxblood shadow-2xl scale-105' : 'ring-1 ring-white/10 hover:ring-white/30'
                }`}
              >
                {/* Reorder Controls */}
                {onReorderBeats && (
                    <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300 z-30">
                        <div 
                            onClick={(e) => handleMove(e, index, 'up')}
                            className={`p-2 bg-black/60 backdrop-blur-md rounded-xl text-white border border-white/10 transition-all ${index === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gemynd-oxblood hover:scale-110 active:scale-95'}`}
                            title="Move Earlier"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </div>
                        <div 
                            onClick={(e) => handleMove(e, index, 'down')}
                            className={`p-2 bg-black/60 backdrop-blur-md rounded-xl text-white border border-white/10 transition-all ${index === storyboard.story_beats.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gemynd-oxblood hover:scale-110 active:scale-95'}`}
                            title="Move Later"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </div>
                    </div>
                )}

                <div className="aspect-video bg-[#0a0807] relative">
                  {hasVideo ? (
                      <video src={image.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : image?.image_url && !isGenerating && !isFailed ? (
                    <img src={image.image_url} alt={beat?.beat_title || ''} className="w-full h-full object-cover transition-all duration-1000 group-hover/card:scale-110 group-hover/card:brightness-110" />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-3 p-4 ${isFailed ? 'bg-red-500/10' : 'bg-slate-900/50'}`}>
                      {isGenerating ? (
                          <div className="flex flex-col items-center gap-3 animate-pulse">
                            <div className="relative">
                                <Loader2Icon className="w-10 h-10 text-gemynd-oxblood/30 border-t-gemynd-oxblood rounded-full animate-spin" />
                                <SparklesIcon className="w-5 h-5 text-gemynd-agedGold absolute -top-1 -right-1 animate-bounce" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-center text-gemynd-oxblood/80">Painting...</span>
                          </div>
                      ) : isFailed ? (
                          <div className="text-center space-y-2">
                             <ImageIcon className="w-10 h-10 mx-auto text-red-500/40" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-red-500/60">Node Broken</span>
                             <p className="text-[8px] text-red-500/30 uppercase tracking-tighter">Tap to retry uplink</p>
                          </div>
                      ) : (
                          <>
                            <ImageIcon className="w-12 h-12 opacity-10" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-center text-white/20">Awaiting Artist</span>
                          </>
                      )}
                    </div>
                  )}
                   
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                   
                   {!hasVideo && image?.image_url && !isGenerating && !isFailed && (
                       <div 
                         onClick={(e) => { e.stopPropagation(); handleAnimate(index); }}
                         className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-gemynd-oxblood hover:text-white"
                         title="Generate Living Portrait"
                       >
                           {isAnimating ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <VideoCameraIcon className="w-5 h-5" />}
                       </div>
                   )}

                   <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-left pointer-events-none">
                     <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Production Node {index + 1}</p>
                     <p className="text-sm font-bold truncate tracking-tight">{beat?.beat_title || ''}</p>
                   </div>
                </div>
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-heritage-cream/90 backdrop-blur shadow-lg hover:bg-heritage-burgundy hover:text-white rounded-full text-heritage-ink opacity-0 group-hover:opacity-100 transition-all border border-heritage-parchment"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      {activeBeat && (
        <div className="obsidian-card rounded-[3.5rem] p-8 lg:p-12 border border-white/5 animate-appear relative overflow-hidden group/details bg-black/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gemynd-oxblood/5 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center text-gemynd-oxblood border border-white/10 shadow-lg shadow-black/40">
                  <span className="font-display font-black text-2xl">{currentBeatIndex + 1}</span>
              </div>
              <div>
                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Manuscript Inspector</h4>
                  <h3 className="text-3xl lg:text-4xl font-display font-black text-white tracking-tighter">{activeBeat.beat_title || 'Untitled Beat'}</h3>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/40">
                      <WriteIcon className="w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Script Node</span>
                  </div>
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 min-h-[160px] group-hover/details:border-white/10 transition-colors">
                      <p className="text-lg font-serif italic text-slate-300 leading-relaxed">
                          "{activeBeat.narrative_chunk || 'Awaiting script nodes...'}"
                      </p>
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex items-center gap-3 text-blue-400/60">
                      <WandIcon className="w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Artisan Blueprint</span>
                  </div>
                  <div className="bg-blue-500/5 p-8 rounded-[2.5rem] border border-blue-500/10 min-h-[160px] group-hover/details:border-blue-500/20 transition-colors">
                      <p className="text-base text-blue-100/70 leading-relaxed font-medium">
                          {activeBeat.visual_focus || 'Standard cinematic composition.'}
                      </p>
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex items-center gap-3 text-amber-500/60">
                      <ClapperboardIcon className="w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Directorial Logic</span>
                  </div>
                  <div className="bg-amber-500/5 p-8 rounded-[2.5rem] border border-amber-500/10 min-h-[160px] group-hover/details:border-amber-500/20 transition-colors">
                      <p className="text-base text-amber-100/70 leading-relaxed font-medium">
                          {activeBeat.directors_notes || 'Focus on emotional resonance.'}
                      </p>
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualStoryboard;