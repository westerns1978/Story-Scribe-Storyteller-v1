import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ActiveStory } from '../../types';

// Inline icons
const FileSadIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
);
const ChevronLeftIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
);
const ChevronRightIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
);
const PlayIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M8 5v14l11-7z"/></svg>
);
const PauseIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
);

const BEAT_DURATION = 10000; // 10s per beat

const MemoryLaneView: React.FC<{ story: ActiveStory | null }> = ({ story }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const storyBeats = useMemo(() => {
    if (!story) return [];
    const beats = story.storyboard?.story_beats || (story.extraction as any)?.storyboard?.story_beats || [];
    return Array.isArray(beats) ? beats : [];
  }, [story]);

  // FIX: match on image_index OR index (handle both field names)
  const validImages = useMemo(() => {
    if (!story) return [];
    const imgs = story.generatedImages || [];
    return imgs.filter(img => img && img.image_url && !img.error);
  }, [story]);

  const getImageForBeat = useCallback((beatIndex: number) => {
    if (!validImages.length) return null;
    // Try image_index first, then index, then position fallback
    return (
      validImages.find(img => (img as any).image_index === beatIndex) ||
      validImages.find(img => (img as any).index === beatIndex) ||
      validImages[beatIndex % validImages.length] ||
      null
    );
  }, [validImages]);

  // Progress timer
  useEffect(() => {
    if (!isPlaying || storyBeats.length <= 1) return;
    setProgress(0);
    const startTime = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / BEAT_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        setCurrentIndex(prev => (prev + 1) % storyBeats.length);
      }
    }, 50);
    return () => clearInterval(tick);
  }, [currentIndex, isPlaying, storyBeats.length]);

  const goTo = (idx: number) => {
    setCurrentIndex(((idx % storyBeats.length) + storyBeats.length) % storyBeats.length);
    setProgress(0);
  };

  if (!story || storyBeats.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 bg-black">
        <FileSadIcon className="w-20 h-20 text-white/10 mb-6" />
        <h3 className="text-2xl font-display font-black text-white/60 uppercase tracking-tighter">No Scenes Yet</h3>
        <p className="text-white/30 mt-3 max-w-sm font-serif italic text-base leading-relaxed">
          Memory Lane appears once the story cascade has generated cinematic scenes.
        </p>
      </div>
    );
  }

  const currentBeat = storyBeats[currentIndex];
  const image = getImageForBeat(currentIndex);

  return (
    <div className="h-full w-full bg-black relative overflow-hidden select-none">
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1.0) translate(0%, 0%); }
          100% { transform: scale(1.12) translate(-1.5%, 1%); }
        }
        @keyframes beat-in {
          0%   { opacity: 0; transform: translateY(28px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        .kenburns-img { animation: kenburns ${BEAT_DURATION}ms ease-in-out forwards; }
        .beat-text    { animation: beat-in  ${BEAT_DURATION}ms ease-in-out forwards; }
      `}</style>

      {/* ── Background Image ── */}
      <div className="absolute inset-0 z-0 bg-black">
        {image && (
          <img
            key={`img-${currentIndex}`}
            src={image.image_url}
            className="w-full h-full object-cover kenburns-img opacity-75"
            alt=""
          />
        )}
        {/* Gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent via-40% to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      </div>

      {/* ── Beat Counter top-left ── */}
      <div className="absolute top-6 left-8 z-20 flex items-center gap-3">
        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/40">Scene</span>
        <span className="text-2xl font-display font-black text-white/90 tabular-nums">
          {String(currentIndex + 1).padStart(2, '0')}
          <span className="text-white/20 text-base"> / {String(storyBeats.length).padStart(2, '0')}</span>
        </span>
      </div>

      {/* ── Play/Pause ── */}
      <button
        onClick={() => setIsPlaying(p => !p)}
        className="absolute top-5 right-8 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all"
      >
        {isPlaying
          ? <PauseIcon className="w-4 h-4 text-white/80" />
          : <PlayIcon  className="w-4 h-4 text-white/80" />
        }
      </button>

      {/* ── Beat Text ── */}
      <div
        key={`text-${currentIndex}`}
        className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center px-8 lg:px-24 pointer-events-none beat-text"
      >
        <div className="max-w-4xl space-y-6">
          {currentBeat?.beat_title && (
            <h2 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter drop-shadow-2xl leading-none">
              {currentBeat.beat_title}
            </h2>
          )}
          {currentBeat?.narrative_chunk && (
            <>
              <div className="w-16 h-px bg-white/30 mx-auto" />
              <p className="text-xl md:text-2xl text-white/85 font-serif leading-relaxed italic drop-shadow-xl max-w-2xl mx-auto">
                "{currentBeat.narrative_chunk}"
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Prev / Next arrows ── */}
      <button
        onClick={() => goTo(currentIndex - 1)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:scale-110"
      >
        <ChevronLeftIcon className="w-5 h-5 text-white/70" />
      </button>
      <button
        onClick={() => goTo(currentIndex + 1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:scale-110"
      >
        <ChevronRightIcon className="w-5 h-5 text-white/70" />
      </button>

      {/* ── Progress bars ── */}
      <div className="absolute bottom-8 left-8 right-8 z-20 space-y-3">
        {/* Dot nav */}
        <div className="flex justify-center gap-2 mb-3">
          {storyBeats.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-500 ${
                i === currentIndex
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/25 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
        {/* Active beat progress bar */}
        <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full transition-none"
            style={{ width: `${isPlaying ? progress : (progress || 0)}%` }}
          />
        </div>
        {/* Visual focus subtitle */}
        {currentBeat?.visual_focus && (
          <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-white/30 truncate">
            {currentBeat.visual_focus}
          </p>
        )}
      </div>
    </div>
  );
};

export default MemoryLaneView;
