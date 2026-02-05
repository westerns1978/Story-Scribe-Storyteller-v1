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
import StoryImage from './StoryImage';
import Loader2Icon from './icons/Loader2Icon';

interface VisualStoryboardProps {
  storyboard: Storyboard;
  generatedImages: GeneratedImage[];
  currentBeatIndex: number;
  onBeatClick: (index: number) => void;
  onImageUpdated?: (index: number, newUrl: string, isVideo?: boolean) => void;
}

const VisualStoryboard: React.FC<VisualStoryboardProps> = ({ storyboard, generatedImages, currentBeatIndex, onBeatClick, onImageUpdated }) => {
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
          const msg = err.message?.includes("Requested entity was not found") 
            ? "Production Key Uplink Required. Please re-authenticate via the AI Studio key dialog."
            : "Video synthesis node interrupted. Ensure you have an active video production key.";
          alert(msg);
      } finally {
          setAnimatingIndex(null);
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
            <h3 className="text-2xl lg:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight">Cinematic Storyboard</h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-[0.4em] mt-1">Directorial Sequence</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
              <SparklesIcon className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Artisan Active</span>
          </div>
      </div>
      
      <div className="relative group obsidian-card p-8 rounded-[3.5rem] border border-white/5 bg-black/40">
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-black/60 backdrop-blur shadow-2xl hover:bg-black rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        
        <div
          ref={scrollContainerRef}
          className="flex space-x-8 overflow-x-auto pb-6 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {storyboard.story_beats.map((beat, index) => {
            const image = safeImages.find(img => img.index === index);
            const isActive = index === currentBeatIndex;
            const isGenerating = image?.error === 'pending';
            const isAnimating = animatingIndex === index;
            const hasVideo = !!image?.video_url;

            return (
              <button
                key={index}
                ref={isActive ? activeItemRef : null}
                onClick={() => onBeatClick(index)}
                className={`flex-shrink-0 w-80 group/card rounded-[2.5rem] overflow-hidden transition-all duration-700 transform hover:-translate-y-3 focus:outline-none ${
                  isActive ? 'ring-4 ring-gemynd-oxblood shadow-2xl scale-105' : 'ring-1 ring-white/10 hover:ring-white/30'
                }`}
              >
                <div className="aspect-video bg-[#0a0807] relative">
                  {hasVideo ? (
                      <video src={image.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : image?.image_url && !isGenerating ? (
                    <img src={image.image_url} alt={beat?.beat_title || ''} className="w-full h-full object-cover transition-all duration-1000 group-hover/card:scale-110 group-hover/card:brightness-110" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-3 p-4 bg-slate-900/50">
                      {isGenerating ? (
                          <div className="flex flex-col items-center gap-3 animate-pulse">
                            <div className="relative">
                                <Loader2Icon className="w-10 h-10 text-gemynd-oxblood/30 border-t-gemynd-oxblood rounded-full animate-spin" />
                                <SparklesIcon className="w-5 h-5 text-gemynd-agedGold absolute -top-1 -right-1 animate-bounce" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-center text-gemynd-oxblood/80">Painting Beat {index + 1}...</span>
                          </div>
                      ) : (
                          <>
                            <ImageIcon className="w-12 h-12 opacity-10" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-center">Awaiting Artist</span>
                          </>
                      )}
                    </div>
                  )}
                   
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                   
                   {!hasVideo && image?.image_url && !isGenerating && (
                       <div 
                         onClick={(e) => { e.stopPropagation(); handleAnimate(index); }}
                         className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-gemynd-oxblood hover:text-white"
                         title="Generate Living Portrait"
                       >
                           {isAnimating ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <VideoCameraIcon className="w-5 h-5" />}
                       </div>
                   )}

                   <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-left">
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
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-black/60 backdrop-blur shadow-2xl hover:bg-black rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
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