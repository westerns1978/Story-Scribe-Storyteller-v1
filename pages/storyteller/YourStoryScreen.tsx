import React, { useState, useCallback, useMemo } from 'react';
import { ActiveStory } from '../../types';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import StorybookViewer from '../../components/StorybookViewer';
import TimelineVisualizer from '../../components/TimelineVisualizer';
import ImageGallery from '../../components/ImageGallery';
import ArrowPathIcon from '../../components/icons/ArrowPathIcon';
import Toast from '../../components/Toast';
import CinematicReveal from '../../components/CinematicReveal';
import VisualStoryboard from '../../components/VisualStoryboard';

interface YourStoryScreenProps {
  story: ActiveStory;
  onRestart: () => void;
  onReorderBeats?: (oldIndex: number, newIndex: number) => void;
}

export const YourStoryScreen: React.FC<YourStoryScreenProps> = ({ story, onRestart, onReorderBeats }) => {
  const [viewMode, setViewMode] = useState<'cinematic' | 'details'>('cinematic');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warn') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const hasTimeline = useMemo(() => !!(story?.extraction?.timeline && story.extraction.timeline.length > 0), [story]);
  const hasStoryboard = useMemo(() => !!(story?.storyboard?.story_beats && story.storyboard.story_beats.length > 0), [story]);
  const storytellerName = story?.storytellerName || 'Anonymous';

  const handleShareWithFamily = async () => {
    const url = `${window.location.origin}?story=${story?.sessionId || 'unknown'}`;
    try {
        await navigator.clipboard.writeText(url);
        setCopyFeedback(true);
        showToast('Family share link copied to clipboard!', 'success');
        setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
        showToast('Could not copy link', 'error');
    }
  };

  if (!story) return null;

  if (viewMode === 'cinematic') {
    return (
      <div className="h-full w-full">
        <CinematicReveal story={story} onRestart={onRestart} />
        <button 
          onClick={() => setViewMode('details')}
          className="fixed top-6 left-6 z-[400] px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black text-white/40 uppercase tracking-widest border border-white/10 transition-all"
        >
          View Details
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gemynd-linen overflow-y-auto animate-fade-in p-6 lg:p-12 scroll-viewport relative">
      <div className="max-w-4xl mx-auto space-y-12 pb-32">
        <header className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gemynd-oxblood/10 blur-2xl rounded-full animate-pulse"></div>
              <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-full h-full object-contain relative z-10" alt="Logo" />
          </div>
          <h1 className="text-3xl lg:text-5xl font-display font-black text-gemynd-ink tracking-tighter">
            The Legacy of <br/><span className="text-gemynd-oxblood">{storytellerName}</span>
          </h1>
          <p className="text-base lg:text-lg font-serif italic text-gemynd-ink/50">Synthesized and secured in the Gemynd Vault.</p>
          <button 
            onClick={() => setViewMode('cinematic')}
            className="mt-6 px-6 py-2 bg-gemynd-agedGold/10 hover:bg-gemynd-agedGold/20 rounded-full text-[9px] font-black text-gemynd-agedGold uppercase tracking-widest border border-gemynd-agedGold/20 transition-all"
          >
            Re-watch Movie
          </button>
        </header>

        {hasStoryboard && (
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-display font-black text-gemynd-ink uppercase tracking-tight">The Cinematic Sequence</h3>
              <div className="w-10 h-0.5 bg-gemynd-oxblood/20 mx-auto mt-2" />
            </div>
            <VisualStoryboard 
              storyboard={story.storyboard!}
              generatedImages={story.generatedImages || []}
              currentBeatIndex={selectedBeatIndex}
              onBeatClick={setSelectedBeatIndex}
              onReorderBeats={onReorderBeats}
            />
          </section>
        )}

        {story.narrative && (
          <section className="bg-white rounded-[2.5rem] p-10 lg:p-14 shadow-xl border border-gemynd-softPeach relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gemynd-oxblood opacity-10" />
            <div className="prose prose-lg font-serif text-gemynd-ink/80 italic leading-relaxed whitespace-pre-wrap">
              {story.narrative}
            </div>
          </section>
        )}

        {hasTimeline && (
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-display font-black text-gemynd-ink uppercase tracking-tight">Life Chronology</h3>
              <div className="w-10 h-0.5 bg-gemynd-oxblood/20 mx-auto mt-2" />
            </div>
            <TimelineVisualizer 
              timeline={story.extraction!.timeline} 
              images={story.generatedImages || []} 
            />
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button 
            onClick={() => setIsViewerOpen(true)}
            className="px-10 py-5 bg-gemynd-oxblood text-white font-black rounded-full shadow-2xl flex items-center justify-center gap-4 text-xs uppercase tracking-widest transform hover:scale-[1.02] active:scale-95 transition-all"
          >
            <BookOpenIcon className="w-4 h-4" /> Open Storybook
          </button>
          <button 
            onClick={handleShareWithFamily}
            className="px-10 py-5 bg-white border border-gemynd-ink/10 text-gemynd-ink font-black rounded-full shadow-sm flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:bg-gemynd-linen transition-all"
          >
            <ShareIcon className="w-4 h-4" /> 
            {copyFeedback ? 'Link Copied!' : 'Share with Family'}
          </button>
        </div>

        <div className="pt-8 text-center">
           <button 
             onClick={onRestart}
             className="inline-flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-gemynd-ink/30 hover:text-gemynd-oxblood transition-colors group"
           >
             <ArrowPathIcon className="w-3 h-3 transition-transform group-hover:rotate-180" />
             Start a new session
           </button>
        </div>
      </div>

      <StorybookViewer 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        story={story as any} 
        showToast={showToast}
      />

      <div className="fixed bottom-6 left-6 z-[250] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(it => it.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};