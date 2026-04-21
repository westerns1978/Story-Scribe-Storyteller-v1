import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { StoryArchiveItem, GeneratedImage, StoryBeat, Artifact } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import ShareIcon from './icons/ShareIcon';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import StopIcon from './icons/StopIcon';
import { narrateText, playAudioBuffer } from '../services/narrationService';
import { formatDisplayName } from '../utils/nameUtils';

interface StorybookViewerProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | null;
    showToast?: (msg: string, type: 'success' | 'error' | 'warn') => void;
    narratorVoice?: string;
}

// ─── Page types ───────────────────────────────────────────────────────────────
type Page =
  | { kind: 'cover' }
  | { kind: 'dedication' }
  | { kind: 'beat'; beatIndex: number; paragraphStart: number; paragraphEnd: number }
  | { kind: 'timeline' }
  | { kind: 'heirlooms' }
  | { kind: 'colophon' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function splitNarrativeIntoParagraphs(narrative: string): string[] {
  return narrative
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);
}

function buildPages(story: StoryArchiveItem): Page[] {
  const pages: Page[] = [{ kind: 'cover' }, { kind: 'dedication' }];
  const paragraphs = splitNarrativeIntoParagraphs(story.narrative || '');
  const beats = story.storyboard?.story_beats || [];

  if (beats.length > 0) {
    const parasPerBeat = Math.max(1, Math.ceil(paragraphs.length / beats.length));
    beats.forEach((_, i) => {
      pages.push({
        kind: 'beat',
        beatIndex: i,
        paragraphStart: i * parasPerBeat,
        paragraphEnd: Math.min((i + 1) * parasPerBeat, paragraphs.length),
      });
    });
  } else if (paragraphs.length > 0) {
    // No storyboard — split into ~3-para spreads
    for (let i = 0; i < paragraphs.length; i += 3) {
      pages.push({ kind: 'beat', beatIndex: -1, paragraphStart: i, paragraphEnd: Math.min(i + 3, paragraphs.length) });
    }
  }

  if ((story.extraction?.timeline?.length || 0) > 0) pages.push({ kind: 'timeline' });
  if ((story.artifacts?.length || 0) > 0) pages.push({ kind: 'heirlooms' });
  pages.push({ kind: 'colophon' });
  return pages;
}

function getImageForBeat(beat: StoryBeat | null, images: GeneratedImage[], beatIndex?: number): GeneratedImage | null {
  if (!beat || images.length === 0) return null;
  // edge fn sets image.index (not beat.image_index which is never populated)
  if (typeof beatIndex === 'number') {
    const byIdx = images.find(img => (img as any).index === beatIndex || (img as any).image_index === beatIndex);
    if (byIdx?.image_url) return byIdx;
    const positional = images[beatIndex];
    if (positional?.image_url) return positional;
  }
  return images.find(img => img.image_url) || images[0] || null;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const PageTurnButton: React.FC<{
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled: boolean;
}> = ({ direction, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      group fixed top-1/2 -translate-y-1/2 z-[750]
      ${direction === 'prev' ? 'left-4 lg:left-10' : 'right-4 lg:right-10'}
      w-12 h-24 flex items-center justify-center
      transition-all duration-300
      ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-30 hover:opacity-100'}
    `}
    aria-label={direction === 'prev' ? 'Previous page' : 'Next page'}
  >
    <div className={`
      w-10 h-10 rounded-full border border-heritage-ink/30 bg-heritage-cream/80 backdrop-blur-sm
      flex items-center justify-center shadow-md
      group-hover:border-heritage-burgundy group-hover:bg-heritage-burgundy group-hover:text-white
      transition-all duration-200
    `}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {direction === 'prev'
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        }
      </svg>
    </div>
  </button>
);

const PageIndicator: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[750] flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-500 ${
          i === current
            ? 'w-6 h-1.5 bg-heritage-burgundy'
            : 'w-1.5 h-1.5 bg-heritage-ink/20'
        }`}
      />
    ))}
  </div>
);

// ─── Individual page layouts ───────────────────────────────────────────────────

const CoverPage: React.FC<{ name: string; formattedDate: string }> = ({ name, formattedDate }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-heritage-ink">
    {/* Texture overlay */}
    <div className="absolute inset-0 opacity-5"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    />
    {/* Decorative rule */}
    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-px h-32 bg-heritage-warmGold/30" />
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-px h-32 bg-heritage-warmGold/30" />

    <div className="relative z-10 text-center px-12 space-y-8 animate-fade-in">
      <p className="text-[9px] font-black uppercase tracking-[0.5em] text-heritage-warmGold/60">
        A Legacy Preserved
      </p>
      <div className="w-16 h-px bg-heritage-warmGold/30 mx-auto" />
      <h1
        className="text-heritage-cream font-serif font-light leading-none"
        style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', letterSpacing: '-0.02em' }}
      >
        {name}
      </h1>
      <div className="w-16 h-px bg-heritage-warmGold/30 mx-auto" />
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-heritage-cream/30">
        {formattedDate}
      </p>
    </div>

    {/* Corner ornaments */}
    {[['top-8 left-8', ''], ['top-8 right-8', 'rotate-90'], ['bottom-8 right-8', 'rotate-180'], ['bottom-8 left-8', '-rotate-90']].map(([pos, rot], i) => (
      <div key={i} className={`absolute ${pos} ${rot} w-12 h-12 opacity-20`}>
        <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
          <path d="M0 0 L16 0 L16 2 L2 2 L2 16 L0 16 Z" fill="#C4973B" />
        </svg>
      </div>
    ))}
  </div>
);

const DedicationPage: React.FC<{ summary?: string; themes?: string[] }> = ({ summary, themes }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center bg-heritage-linen px-12 lg:px-24">
    <div className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, #2C2418 31px, #2C2418 32px)`,
      }}
    />
    <div className="relative z-10 text-center space-y-10 max-w-lg animate-fade-in">
      <div className="w-8 h-8 mx-auto opacity-20">
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" stroke="#2C2418" strokeWidth="1" />
          <path d="M16 8 L16 24 M8 16 L24 16" stroke="#2C2418" strokeWidth="1" />
        </svg>
      </div>
      {summary ? (
        <p className="font-serif text-xl leading-relaxed text-heritage-ink/70 italic">
          "{summary}"
        </p>
      ) : (
        <p className="font-serif text-xl leading-relaxed text-heritage-ink/50 italic">
          Every life contains multitudes. This is one of them.
        </p>
      )}
      {themes && themes.length > 0 && (
        <div className="space-y-2">
          <div className="w-8 h-px bg-heritage-parchment mx-auto" />
          <p className="text-[9px] uppercase tracking-[0.4em] text-heritage-inkMuted">
            {themes.slice(0, 3).join('  ·  ')}
          </p>
        </div>
      )}
    </div>
  </div>
);

const BeatPage: React.FC<{
  beat: StoryBeat | null;
  beatIndex: number;
  image: GeneratedImage | null;
  paragraphs: string[];
  isEven: boolean;
}> = ({ beat, beatIndex, image, paragraphs, isEven }) => {
  const hasImage = image?.success && image.image_url;
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={`relative w-full h-full flex ${isEven ? 'flex-row' : 'flex-row-reverse'} overflow-hidden animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.15)]`}
      style={{ background: '#FDF6EC' }}>

      {/* Image side */}
      {hasImage && (
        <div className="relative w-1/2 h-full flex-shrink-0 overflow-hidden">
          <img
            src={image!.image_url}
            alt={beat?.visual_focus || 'Story image'}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
            onLoad={() => setImgLoaded(true)}
          />
          {/* Gradient fade toward text */}
          <div className={`absolute inset-0 ${isEven
            ? 'bg-gradient-to-r from-transparent to-heritage-cream'
            : 'bg-gradient-to-l from-transparent to-heritage-cream'
          }`} style={{ opacity: 0.85 }} />
          {/* Scene label */}
          {beat?.visual_focus && (
            <div className={`absolute bottom-8 ${isEven ? 'left-6' : 'right-6'} z-10`}>
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-heritage-ink/30 max-w-[120px]">
                {beat.visual_focus}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Text side */}
      <div className={`
        relative flex flex-col justify-center
        ${hasImage ? 'w-1/2' : 'w-full max-w-2xl mx-auto'}
        px-10 lg:px-16 py-16 space-y-8 overflow-y-auto
      `}>
        {beat && beat.beat_title && (
          <div className="space-y-3">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-heritage-burgundy/60">
              Chapter {beatIndex + 1}
            </p>
            <h2
              className="font-serif font-light text-heritage-ink leading-tight"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
            >
              {beat.beat_title}
            </h2>
            <div className="w-8 h-px bg-heritage-burgundy/30" />
          </div>
        )}

        <div className="space-y-5">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="font-serif text-base lg:text-lg leading-[1.9] text-heritage-ink/80"
              style={{ textIndent: i === 0 ? 0 : '1.5em' }}
            >
              {para}
            </p>
          ))}
        </div>

        {beat?.themes && beat.themes.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {beat.themes.slice(0, 3).map((theme, i) => (
              <span key={i} className="text-[7px] font-black uppercase tracking-[0.3em] text-heritage-inkMuted/50 border border-heritage-parchment rounded-full px-3 py-1">
                {theme}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TimelinePage: React.FC<{ timeline: { year: string; event: string; significance?: string; historical_context?: string }[] }> = ({ timeline }) => (
  <div className="relative w-full h-full overflow-y-auto bg-heritage-ink flex flex-col items-center py-20 px-8 animate-fade-in">
    <div className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
      }}
    />
    <div className="relative z-10 w-full max-w-2xl">
      <div className="text-center mb-16 space-y-3">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-heritage-warmGold/50">A Life in Time</p>
        <h2 className="text-4xl font-serif font-light text-heritage-cream">Chronology</h2>
        <div className="w-8 h-px bg-heritage-warmGold/30 mx-auto" />
      </div>

      <div className="relative">
        {/* Central spine */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-heritage-warmGold/20" />

        <div className="space-y-10">
          {timeline.map((item, i) => (
            <div key={i} className={`flex items-start gap-6 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-1/2 ${i % 2 === 0 ? 'text-right pr-8' : 'pl-8'} space-y-1`}>
                <p className="text-heritage-warmGold font-black text-sm tracking-widest">{item.year}</p>
                <p className="text-heritage-cream/80 font-serif text-sm leading-relaxed">{item.event}</p>
                {item.historical_context && (
                  <p className="text-heritage-cream/30 text-[10px] italic leading-relaxed mt-1">{item.historical_context}</p>
                )}
              </div>
              {/* Dot on spine */}
              <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-heritage-warmGold bg-heritage-ink flex-shrink-0 mt-1" />
              <div className="w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const HeirloomsPage: React.FC<{ artifacts: Artifact[] }> = ({ artifacts }) => (
  <div className="relative w-full h-full overflow-y-auto bg-heritage-linen flex flex-col items-center py-20 px-8 animate-fade-in">
    <div className="relative z-10 w-full max-w-3xl">
      <div className="text-center mb-16 space-y-3">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-heritage-warmGold/60">What Remains</p>
        <h2 className="text-4xl font-serif font-light text-heritage-ink">Family Heirlooms</h2>
        <div className="w-8 h-px bg-heritage-burgundy/30 mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {artifacts.map((artifact, i) => (
          <div key={i} className="group relative bg-heritage-cream border border-heritage-parchment rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            {artifact.image_url && (
              <div className="relative h-44 overflow-hidden">
                <img src={artifact.image_url} alt={artifact.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-heritage-cream to-transparent opacity-80" />
              </div>
            )}
            <div className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg text-heritage-ink">{artifact.name}</h3>
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-heritage-inkMuted/40 border border-heritage-parchment rounded-full px-2 py-0.5">{artifact.era}</span>
              </div>
              <p className="font-serif text-sm leading-relaxed text-heritage-ink/60">{artifact.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ColophonPage: React.FC<{ name: string }> = ({ name }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center bg-heritage-cream px-12">
    <div className="text-center space-y-10 max-w-sm animate-fade-in">
      <div className="w-px h-24 bg-heritage-parchment mx-auto" />
      <div className="space-y-2">
        <p className="font-serif text-heritage-ink/40 italic text-lg">This story was preserved with care.</p>
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-heritage-inkMuted/30">The Legacy of {name}</p>
      </div>
      <div className="w-px h-16 bg-heritage-parchment mx-auto" />
      <div className="space-y-1">
        <p className="text-[7px] font-black uppercase tracking-[0.5em] text-heritage-inkMuted/30">Preserved by</p>
        <p className="font-serif text-heritage-ink/40 text-sm">Wissums · Wissums</p>
      </div>
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

const StorybookViewer: React.FC<StorybookViewerProps> = ({ isOpen, onClose, story, showToast, narratorVoice = 'Kore' }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [pageDirection, setPageDirection] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const narrationStopRef = useRef<(() => void) | null>(null);

  const pages = useMemo(() => (story ? buildPages(story) : []), [story]);
  const paragraphs = useMemo(() => splitNarrativeIntoParagraphs(story?.narrative || ''), [story?.narrative]);

  const formattedDate = useMemo(() => {
    if (!story?.savedAt) return '';
    return new Date(story.savedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [story?.savedAt]);

  // Reset to cover when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPageIndex(0);
      if (story?.background_music_url && audioRef.current) {
        audioRef.current.volume = 0.15;
        audioRef.current.play().catch(() => {});
      }
    } else {
      audioRef.current?.pause();
      stopNarration();
    }
  }, [isOpen]);

  const stopNarration = () => {
    try { narrationStopRef.current?.(); } catch {}
    narrationStopRef.current = null;
    setIsNarrating(false);
    setIsSynthesizing(false);
  };

  const handleNarrate = async () => {
    if (isNarrating || isSynthesizing) { stopNarration(); return; }
    if (!story?.narrative) return;
    setIsSynthesizing(true);
    try {
      const result = await narrateText(
        story.narrative.slice(0, 1200), // keep under TTS limit
        narratorVoice || 'Kore'
      );
      if (!result) throw new Error('No audio returned');
      const stopFn = playAudioBuffer(result.audioBuffer, result.audioContext, {
        onEnded: () => { setIsNarrating(false); narrationStopRef.current = null; },
      });
      narrationStopRef.current = stopFn;
      setIsNarrating(true);
      setIsSynthesizing(false);
    } catch {
      setIsSynthesizing(false);
      showToast?.('Voice synthesis is warming up — try again in a moment', 'info');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}?story=${story?.sessionId || 'unknown'}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      showToast?.('Legacy link copied', 'success');
    } catch { showToast?.('Copy failed', 'error'); }
  };

  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (isAnimating) return;
    const next = dir === 'next' ? currentPageIndex + 1 : currentPageIndex - 1;
    if (next < 0 || next >= pages.length) return;
    setPageDirection(dir === 'next' ? 'forward' : 'back');
    setIsAnimating(true);
    setCurrentPageIndex(next);
    setTimeout(() => setIsAnimating(false), 500);
  }, [currentPageIndex, pages.length, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate('next');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate('prev');
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, navigate, onClose]);

  // Touch/swipe
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 'next' : 'prev');
  };

  if (!isOpen || !story) return null;

  const currentPage = pages[currentPageIndex];
  const beat = currentPage.kind === 'beat' && currentPage.beatIndex >= 0
    ? (story.storyboard?.story_beats?.[currentPage.beatIndex] || null)
    : null;
  const image = beat ? getImageForBeat(beat, story.generatedImages || [], currentPage.beatIndex) : null;
  const beatParagraphs = currentPage.kind === 'beat'
    ? paragraphs.slice(currentPage.paragraphStart, currentPage.paragraphEnd)
    : [];

  return (
    <div
      className="fixed inset-0 z-[600] overflow-hidden animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {story.background_music_url && <audio ref={audioRef} src={story.background_music_url} loop />}

      {/* Page container */}
      <div
        key={currentPageIndex}
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: isAnimating ? 0 : 1 }}
      >
        {currentPage.kind === 'cover' && (
          <CoverPage name={formatDisplayName(story.storytellerName)} formattedDate={formattedDate} />
        )}
        {currentPage.kind === 'dedication' && (
          <DedicationPage summary={story.extraction?.summary} themes={story.extraction?.themes} />
        )}
        {currentPage.kind === 'beat' && (
          <BeatPage
            beat={beat}
            beatIndex={currentPage.beatIndex}
            image={image}
            paragraphs={beatParagraphs}
            isEven={currentPageIndex % 2 === 0}
          />
        )}
        {currentPage.kind === 'timeline' && story.extraction?.timeline && (
          <TimelinePage timeline={story.extraction.timeline} />
        )}
        {currentPage.kind === 'heirlooms' && story.artifacts && (
          <HeirloomsPage artifacts={story.artifacts} />
        )}
        {currentPage.kind === 'colophon' && (
          <ColophonPage name={formatDisplayName(story.storytellerName)} />
        )}
      </div>

      {/* Navigation */}
      <PageTurnButton direction="prev" onClick={() => navigate('prev')} disabled={currentPageIndex === 0} />
      <PageTurnButton direction="next" onClick={() => navigate('next')} disabled={currentPageIndex === pages.length - 1} />
      <PageIndicator current={currentPageIndex} total={pages.length} />

      {/* Top bar: close + actions */}
      <div className="fixed top-0 left-0 right-0 z-[750] flex items-center justify-between px-6 py-4 pointer-events-none">
        {/* Subtle page label */}
        <div className="pointer-events-auto">
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-heritage-inkMuted/30 select-none">
            {currentPageIndex + 1} / {pages.length}
          </span>
        </div>

        {/* Action cluster */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleNarrate}
            disabled={isSynthesizing}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest
              border transition-all duration-300 shadow-sm
              ${isNarrating
                ? 'bg-heritage-burgundy border-heritage-burgundy text-white'
                : 'bg-heritage-cream/90 border-heritage-parchment text-heritage-inkMuted hover:border-heritage-burgundy hover:text-heritage-burgundy'
              }
              disabled:opacity-40 backdrop-blur-sm
            `}
          >
            {isSynthesizing
              ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              : isNarrating ? <><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block mr-1" /><StopIcon className="w-3 h-3" /></> : <SpeakerWaveIcon className="w-3 h-3" />
            }
            {isSynthesizing ? 'Synthesizing…' : isNarrating ? 'Stop Narration' : 'Hear Story'}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border border-heritage-parchment bg-heritage-cream/90 text-heritage-inkMuted hover:border-heritage-warmGold hover:text-heritage-warmGold transition-all backdrop-blur-sm shadow-sm"
          >
            <ShareIcon className="w-3 h-3" />
            {copyFeedback ? 'Copied!' : 'Share'}
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border border-heritage-parchment bg-heritage-cream/90 text-heritage-inkMuted hover:border-heritage-ink hover:text-heritage-ink transition-all backdrop-blur-sm shadow-sm"
          >
            <XMarkIcon className="w-3 h-3" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorybookViewer;
