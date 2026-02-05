
import React, { useState, useEffect, useCallback, useRef } from 'react';
import LeftSidebar from '../components/LeftSidebar';
import NewStoryPanel from '../components/NewStoryPanel';
import ArchivePanel from '../components/ArchivePanel';
import StorybookViewer from '../components/StorybookViewer';
import Toast from '../components/Toast';
import WelcomeView from '../components/WelcomeView';
import HamburgerIcon from '../components/icons/HamburgerIcon';
import BoltIcon from '../components/icons/BoltIcon';
import PlusIcon from '../components/icons/PlusIcon';
import ArchiveBoxIcon from '../components/icons/ArchiveBoxIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import HomeIcon from '../components/icons/HomeIcon';
import CameraIcon from '../components/icons/CameraIcon';
import BookOpenIcon from '../components/icons/BookOpenIcon';
import { getArchivedStories, saveStory, deleteStory } from '../services/archiveService';
import { healthCheck, generateStoryWithMagic, generateNarration } from '../services/api';
import { findMusicFromSuggestion } from '../services/musicService';
import { ActiveStory, StoryArchiveItem, StatusTracker, AutomatedProgress, Customer } from '../types';
import DirectorsCutViewer from '../components/DirectorsCutViewer';
import ConnieChatWidget from '../components/ConnieChatWidget';
import StoryReveal from '../components/StoryReveal';
import MagicProgressOverlay from '../components/MagicProgressOverlay';
import { PhotoEnhancer } from '../components/PhotoEnhancer';
import { PricingModal } from '../components/PricingModal';
import PresentationViewer from '../components/PresentationViewer';
import MusicFinderModal from '../components/MusicFinderModal';
import { createWavBlobUrl } from '../utils/audioUtils';

type View = 'welcome' | 'new-story' | 'archive' | 'restore-studio';
type ToastMessage = { id: number; message: string; type: 'success' | 'error' | 'warn' };

const VIEW_ORDER: View[] = ['welcome', 'archive', 'restore-studio', 'new-story'];

interface AdminLayoutProps {
  customer: Customer;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ customer, onLogout }) => {
  const [view, setView] = useState<View>('welcome');
  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [archivedStories, setArchivedStories] = useState<StoryArchiveItem[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(true);
  const [status, setStatus] = useState<StatusTracker>({ 
      extracting: false, generatingImages: false, generatingVideo: false, 
      downloadingPdf: false, refiningNarrative: false, generatingPresentation: false 
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [automatedProgress, setAutomatedProgress] = useState<AutomatedProgress>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConnieOpen, setIsConnieOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isMusicFinderOpen, setIsMusicFinderOpen] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [prefilledTestData, setPrefilledTestData] = useState<{ name: string, notes: string } | null>(null);
  
  const [isStorybookOpen, setIsStorybookOpen] = useState(false);
  const [isDirectorsCutOpen, setIsDirectorsCutOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [storyForModal, setStoryForModal] = useState<StoryArchiveItem | ActiveStory | null>(null);

  const [narrationAudio, setNarrationAudio] = useState<{ url: string | null; isLoading: boolean }>({ url: null, isLoading: false });

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const showToast = useCallback((message: string, type: ToastMessage['type']) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const loadArchive = useCallback(async () => {
    setIsArchiveLoading(true);
    try {
      const stories = await getArchivedStories();
      setArchivedStories(stories);
    } catch (error) { 
        console.error("Archive sync failure", error);
    } finally { setIsArchiveLoading(false); }
  }, []);

  useEffect(() => {
    healthCheck().catch(() => {});
    loadArchive();
  }, [loadArchive]);

  const handleGenerateNarration = async (voice: string) => {
      const textToNarrate = activeStory?.narrative || (storyForModal as StoryArchiveItem)?.narrative;
      if (!textToNarrate) return;
      
      setNarrationAudio(prev => ({ ...prev, isLoading: true }));
      try {
          const base64Audio = await generateNarration(textToNarrate, voice);
          const wavUrl = createWavBlobUrl(base64Audio, 24000);
          setNarrationAudio({ url: wavUrl, isLoading: false });
          showToast("Narration synthesized.", "success");
      } catch (err) {
          showToast("Narration failed.", "error");
          setNarrationAudio(prev => ({ ...prev, isLoading: false }));
      }
  };

  const processStoryData = async (combinedText: string, name: string, style: string, cascade: boolean, artifacts: any[], visualStyle: string = 'Cinematic (Non-Linear)') => {
      setStatus(s => ({ ...s, extracting: true }));
      setAutomatedProgress('agent_scribe');
      setNarrationAudio({ url: null, isLoading: false }); 
      
      try {
          const response = await generateStoryWithMagic(combinedText, name, style, (step) => {
              setAutomatedProgress(step);
          }, artifacts, visualStyle);
          
          const mood = response.extraction?.themes?.[0] || 'Nostalgic';
          const musicTracks = await findMusicFromSuggestion(mood);
          const selectedMusic = musicTracks.length > 0 ? musicTracks[0].url : null;

          const newStory: ActiveStory = {
            sessionId: response.session_id,
            storytellerName: name,
            narrative: response.narrative,
            extraction: response.extraction,
            generatedImages: response.images || [],
            background_music_url: selectedMusic || undefined,
            savedAt: null,
            storyboard: response.storyboard,
            artifacts: response.artifacts || response.extraction?.artifacts || [],
          };

          setActiveStory(newStory);
          setAutomatedProgress('complete');

          await saveStory({
              ...newStory,
              id: newStory.sessionId,
              name: name,
              savedAt: new Date().toISOString()
          } as StoryArchiveItem);

          setTimeout(() => { 
              setAutomatedProgress(null); 
              setShowReveal(true);
              setView('new-story');
              loadArchive();
          }, 1500);
      } catch (error: any) { 
          showToast(`Neural Link Failure: ${error.message}`, 'error');
          setAutomatedProgress(null);
      } finally { 
          setStatus(s => ({ ...s, extracting: false })); 
      }
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > 100) {
      const currentIndex = VIEW_ORDER.indexOf(view);
      if (distance > 100 && currentIndex < VIEW_ORDER.length - 1) setView(VIEW_ORDER[currentIndex + 1]);
      else if (distance < -100 && currentIndex > 0) setView(VIEW_ORDER[currentIndex - 1]);
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div 
      className="h-full w-full flex flex-col lg:flex-row relative bg-gemynd-linen dark:bg-gemynd-mahogany overflow-hidden"
      onTouchStart={e => { touchStartX.current = e.targetTouches[0].clientX; }}
      onTouchMove={e => { touchEndX.current = e.targetTouches[0].clientX; }}
      onTouchEnd={handleTouchEnd}
    >
      <MagicProgressOverlay progress={automatedProgress} />
      {showReveal && activeStory && <StoryReveal storyData={activeStory} onComplete={() => setShowReveal(false)} />}
      
      <nav className={`fixed inset-y-0 left-0 w-72 h-full z-[200] lg:relative lg:translate-x-0 transition-transform duration-500 ease-in-out glass-tier-1 lg:bg-white/5 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <LeftSidebar 
              currentView={view} 
              setView={(v) => { setView(v as View); setIsSidebarOpen(false); }} 
              onSettings={() => {}} onDebug={() => {}} onHelp={() => {}} 
              onOpenConnie={() => { setIsConnieOpen(true); setIsSidebarOpen(false); }}
              customer={customer}
              onLogout={onLogout}
          />
      </nav>

      {isSidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xl z-[190]" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between p-5 glass-tier-1 sticky top-0 z-[100] pt-[env(safe-area-inset-top,20px)] border-b transition-all duration-300">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gemynd-oxblood rounded-xl shadow-lg"><BoltIcon className="w-5 h-5 text-white" /></div>
                <span className="font-display font-black text-xs tracking-widest uppercase text-gemynd-ink dark:text-white/60">Gemynd</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-gemynd-oxblood/20 text-gemynd-oxblood transition-all duration-500 ${view === 'welcome' ? 'opacity-0' : 'opacity-100'}`}>{view.replace('-', ' ')}</div>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-gemynd-ink/5 dark:bg-white/5 rounded-xl border haptic-tap"><HamburgerIcon className="w-6 h-6 text-gemynd-ink dark:text-white/80" /></button>
            </div>
        </header>

        <main className="flex-1 scroll-viewport">
          <div className="max-w-6xl mx-auto w-full px-5 py-8 lg:py-16 pb-40 lg:pb-32 animate-fade-in">
            {view === 'welcome' && <WelcomeView onStartRestoration={() => setView('restore-studio')} onStartStory={() => setView('new-story')} tier={customer.tier} />}
            {view === 'restore-studio' && <PhotoEnhancer isOpen={true} onClose={() => setView('welcome')} onPhotoEnhanced={() => showToast('Memory restored.', 'success')} tier={customer.tier} onUpgradeRequested={() => setIsPricingOpen(true)} />}
            {view === 'new-story' && (
              <NewStoryPanel 
                  queue={[]} setQueue={() => {}} 
                  onAnalyze={processStoryData} 
                  status={status} imageGenerationProgress={null} videoGenerationProgress={null} 
                  onClearSession={() => { setActiveStory(null); setPrefilledTestData(null); setNarrationAudio({url: null, isLoading: false}); }} activeStory={activeStory}
                  onGenerateImages={() => {}} onGenerateVideoFromPrompt={() => {}} 
                  onRetryImage={async (idx) => {}}
                  generationStats={null} totalCost={0} onRefineNarrative={() => {}}
                  onNarrativeChange={(n) => setActiveStory(s => s ? {...s, narrative: n} : null)}
                  onOpenMusicFinder={() => setIsMusicFinderOpen(true)} 
                  onFinalizeAndReveal={() => setIsStorybookOpen(true)}
                  onOpenConnie={() => setIsConnieOpen(true)}
                  onOpenScanner={() => {}} onOpenEnhancer={() => {}} 
                  showToast={showToast}
                  narrationAudio={narrationAudio} 
                  onGenerateNarration={handleGenerateNarration}
                  onOpenDirectorsCut={() => setIsDirectorsCutOpen(true)} 
                  onOpenPresentation={() => setIsPresentationOpen(true)}
                  initialData={null} onInitialDataLoaded={() => {}} onAnimateImage={() => {}}
                  animatingImageIndex={null} credits={customer.credits.stories}
                  prefilledData={prefilledTestData}
                  onImageUpdated={(idx, url) => setActiveStory(s => s ? {...s, generatedImages: s.generatedImages.map(img => img.index === idx ? {...img, image_url: url} : img)} : null)}
                />
            )}
            {view === 'archive' && <ArchivePanel stories={archivedStories} isLoading={isArchiveLoading} onViewStorybook={(s) => { setStoryForModal(s); setIsStorybookOpen(true); }} onDelete={async (id) => { if(confirm("Archive this node?")) { await deleteStory(id); loadArchive(); } }} onExportGedcom={() => {}} onFindConnections={() => {}} onSuggestTopics={() => {}} />}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md glass-tier-1 rounded-[2.5rem] flex justify-around items-center p-3 z-[180] shadow-2xl border-white/20 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] transition-all duration-300">
            <DockItem label="Vault" icon={<ArchiveBoxIcon />} active={view === 'archive'} onClick={() => setView('archive')} />
            <DockItem label="Restore" icon={<SparklesIcon />} active={view === 'restore-studio'} onClick={() => setView('restore-studio')} />
            <div className="relative -top-8">
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col gap-4 items-center transition-all duration-500 ${isQuickActionOpen ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' : 'opacity-0 translate-y-8 pointer-events-none scale-50'}`}>
                 <button onClick={() => { setView('restore-studio'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-gemynd-oxblood group-hover:scale-110 transition-transform"><CameraIcon className="w-6 h-6" /></div><span className="text-[8px] font-black uppercase text-white tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">Restore</span></button>
                 <button onClick={() => { setView('new-story'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-gemynd-oxblood group-hover:scale-110 transition-transform"><BookOpenIcon className="w-6 h-6" /></div><span className="text-[8px] font-black uppercase text-white tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">Story</span></button>
              </div>
              <button onClick={() => setIsQuickActionOpen(!isQuickActionOpen)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 haptic-tap shadow-2xl ${isQuickActionOpen ? 'bg-white text-gemynd-oxblood rotate-45' : 'bg-gemynd-oxblood text-white'}`}><PlusIcon className="w-8 h-8" /></button>
            </div>
            <DockItem label="Connie" icon={<MicrophoneIcon />} active={isConnieOpen} onClick={() => setIsConnieOpen(true)} />
            <DockItem label="Home" icon={<HomeIcon />} active={view === 'welcome'} onClick={() => setView('welcome')} />
        </nav>
        {isQuickActionOpen && <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[170] transition-opacity duration-500" onClick={() => setIsQuickActionOpen(false)} />}
      </div>

      <ConnieChatWidget isOpen={isConnieOpen} setIsOpen={setIsConnieOpen} onConversationEnd={(d) => { setPrefilledTestData({ name: d.storytellerName, notes: d.transcript }); setView('new-story'); setIsConnieOpen(false); }} onExecuteCommand={() => {}} />
      <StorybookViewer isOpen={isStorybookOpen} onClose={() => setIsStorybookOpen(false)} story={storyForModal as any || activeStory as any} onSave={(s) => { saveStory(s as any); loadArchive(); }} onDownloadPdf={() => {}} onShare={() => {}} showToast={showToast} />
      <DirectorsCutViewer isOpen={isDirectorsCutOpen} onClose={() => setIsDirectorsCutOpen(false)} story={storyForModal as any || activeStory as any} />
      <PresentationViewer isOpen={isPresentationOpen} onClose={() => setIsPresentationOpen(false)} story={storyForModal as any || activeStory as any} />
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} onSelectTier={(t) => {}} />
      <MusicFinderModal isOpen={isMusicFinderOpen} onClose={() => setIsMusicFinderOpen(false)} storyThemes={activeStory?.extraction?.themes || []} onSelectTrack={(url) => { if (activeStory) setActiveStory({ ...activeStory, background_music_url: url }); setIsMusicFinderOpen(false); }} />
      <div className="fixed bottom-6 left-6 z-[250] flex flex-col gap-3 pointer-events-none">{toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(it => it.id !== t.id))} />)}</div>
    </div>
  );
}

const DockItem = ({ icon, active, onClick, label }: { icon: React.ReactElement, active: boolean, onClick: () => void, label: string }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all duration-300 ${active ? 'text-gemynd-oxblood dark:text-gemynd-agedGold' : 'text-gemynd-ink/40 dark:text-white/30'}`}>
        <div className={`p-2 rounded-xl transition-all ${active ? 'bg-gemynd-oxblood/10 scale-110' : 'active:scale-90'}`}>{React.cloneElement(icon, { className: "w-5 h-5" } as any)}</div>
        <span className="text-[9px] uppercase font-black tracking-widest">{label}</span>
    </button>
);
