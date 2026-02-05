import React, { useState } from 'react';
import { ActiveStory } from '../../types';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import ShareModal from '../../components/ShareModal';
import StorybookViewer from '../../components/StorybookViewer';
import TimelineVisualizer from '../../components/TimelineVisualizer';
import ImageGallery from '../../components/ImageGallery';
import ArrowPathIcon from '../../components/icons/ArrowPathIcon';

interface YourStoryScreenProps {
  story: ActiveStory;
  onRestart: () => void;
}

export const YourStoryScreen: React.FC<YourStoryScreenProps> = ({ story, onRestart }) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const hasTimeline = story.extraction?.timeline && story.extraction.timeline.length > 0;
  const hasImages = story.generatedImages && story.generatedImages.length > 0;

  return (
    <div className="h-full w-full bg-gemynd-linen overflow-y-auto animate-fade-in p-8 lg:p-20 scroll-viewport relative">
      <div className="max-w-4xl mx-auto space-y-16 pb-32">
        <header className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-gemynd-oxblood/10 blur-2xl rounded-full animate-pulse"></div>
              <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-full h-full object-contain relative z-10" alt="Logo" />
          </div>
          <h1 className="text-4xl lg:text-7xl font-display font-black text-gemynd-ink tracking-tighter">
            The Legacy of <br/><span className="text-gemynd-oxblood">{story.storytellerName}</span>
          </h1>
          <p className="text-lg font-serif italic text-gemynd-ink/50">Synthesized and secured in the Gemynd Vault.</p>
        </header>

        {/* Primary Narrative Section */}
        <section className="bg-white rounded-[3rem] p-10 lg:p-20 shadow-xl border border-gemynd-softPeach relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gemynd-oxblood opacity-10" />
          <div className="prose prose-xl font-serif text-gemynd-ink/80 italic leading-relaxed whitespace-pre-wrap">
            {story.narrative}
          </div>
        </section>

        {/* Interactive Chronology */}
        {hasTimeline && (
          <section className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-display font-black text-gemynd-ink uppercase tracking-tight">Life Chronology</h3>
              <div className="w-12 h-0.5 bg-gemynd-oxblood/20 mx-auto mt-2" />
            </div>
            <TimelineVisualizer 
              timeline={story.extraction!.timeline} 
              images={story.generatedImages || []} 
            />
          </section>
        )}

        {/* Visual Artifacts */}
        {hasImages && (
          <section className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-display font-black text-gemynd-ink uppercase tracking-tight">Visual Artifacts</h3>
              <div className="w-12 h-0.5 bg-gemynd-oxblood/20 mx-auto mt-2" />
            </div>
            <div className="bg-white rounded-[3rem] p-8 border border-gemynd-softPeach shadow-sm">
                <ImageGallery images={story.generatedImages} />
            </div>
          </section>
        )}

        {/* Main Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button 
            onClick={() => setIsViewerOpen(true)}
            className="px-12 py-6 bg-gemynd-oxblood text-white font-black rounded-full shadow-2xl flex items-center justify-center gap-4 text-xs uppercase tracking-widest transform hover:scale-[1.02] active:scale-95 transition-all"
          >
            <BookOpenIcon className="w-5 h-5" /> Open Storybook
          </button>
          <button 
            onClick={() => setIsShareOpen(true)}
            className="px-12 py-6 bg-white border border-gemynd-ink/10 text-gemynd-ink font-black rounded-full shadow-sm flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:bg-gemynd-linen transition-all"
          >
            <ShareIcon className="w-5 h-5" /> Share with Family
          </button>
        </div>

        <div className="pt-10 text-center">
           <button 
             onClick={onRestart}
             className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gemynd-ink/30 hover:text-gemynd-oxblood transition-colors group"
           >
             <ArrowPathIcon className="w-4 h-4 transition-transform group-hover:rotate-180" />
             Add more to this legacy
           </button>
        </div>
      </div>

      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        story={story} 
      />
      
      <StorybookViewer 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        story={story as any} 
      />
    </div>
  );
};