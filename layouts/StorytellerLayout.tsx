import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { Customer, ActiveStory, StatusTracker, AutomatedProgress, StoryArchiveItem } from '../types';
import { healthCheck, generateStoryWithMagic } from '../services/api';
import LeftSidebar from '../components/LeftSidebar';
import NewStoryPanel from '../components/NewStoryPanel';
import ArchivePanel from '../components/ArchivePanel';
import StorybookViewer from '../components/StorybookViewer';
import Toast from '../components/Toast';
import WelcomeView from '../components/WelcomeView';
import HamburgerIcon from '../components/icons/HamburgerIcon';
import { getArchivedStories, saveStory, deleteStory } from '../services/archiveService';
import DirectorsCutViewer from '../components/DirectorsCutViewer';
import StoryReveal from '../components/StoryReveal';
import MagicProgressOverlay from '../components/MagicProgressOverlay';
import { PhotoEnhancer } from '../components/PhotoEnhancer';
import PresentationViewer from '../components/PresentationViewer';
import MusicFinderModal from '../components/MusicFinderModal';
import { modernTheme } from '../components/presentationThemes';
import { usePersistentSession } from '../hooks/usePersistentSession';
import { enableElderlyMode } from '../utils/accessibility';

type View = 'welcome' | 'new-story' | 'archive' | 'restore-studio';
type ToastMessage = { id: number; message: string; type: 'success' | 'error' | 'warn' };

const VIEW_STORAGE_KEY = 'storyscribe_active_view';

export const StorytellerLayout: React.FC<{ 
  onLogout: () => void; 
  isAdmin?: boolean;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onOpenConnie: () => void;
  prefilledData?: { name: string; notes: string } | null;
  initialStagedArtifacts?: any[];
  activeStory: ActiveStory | null;
  onStoryChange: (story: ActiveStory | null) => void;
}> = ({ 
  onLogout, isAdmin, activeView, onViewChange, onOpenConnie, 
  prefilledData: externalPrefilled, initialStagedArtifacts, 
  activeStory, onStoryChange 
}) => {
  const { user } = usePersistentSession();
  
  const [internalView, setInternalViewState] = useState<View>(() => {
    const saved = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (saved && ['welcome', 'new-story', 'archive', 'restore-studio'].includes(saved)) {
      return saved as View;
    }
    return 'welcome';
  });

  const currentView = (activeView as View) || internalView;

  const setView = useCallback((newView: string) => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setInternalViewState(newView as View);
    }
    sessionStorage.setItem(VIEW_STORAGE_KEY, newView);
  }, [onViewChange]);

  const [stagedArtifacts, setStagedArtifacts] = useState<any[]>(initialStagedArtifacts || []);
  const [archivedStories, setArchivedStories] = useState<StoryArchiveItem[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(true);
  const [status, setStatus] = useState<StatusTracker>({ 
      extracting: false, generatingImages: false, generatingVideo: false, 
      downloadingPdf: false, refiningNarrative: false, generatingPresentation: false 
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [automatedProgress, setAutomatedProgress] = useState<AutomatedProgress>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMusicFinderOpen, setIsMusicFinderOpen] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  
  const [isStorybookOpen, setIsStorybookOpen] = useState(false);
  const [isDirectorsCutOpen, setIsDirectorsCutOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [storyForModal, setStoryForModal] = useState<StoryArchiveItem | ActiveStory | null>(null);
  const [narrationAudio] = useState<{ url: string | null; isLoading: boolean }>({ url: null, isLoading: false });
  const [prefilledData, setPrefilledData] = useState<{ name: string; notes: string } | null>(externalPrefilled || null);

  useEffect(() => {
    if (externalPrefilled) setPrefilledData(externalPrefilled);
  }, [externalPrefilled]);

  useEffect(() => {
    if (initialStagedArtifacts) setStagedArtifacts(initialStagedArtifacts);
  }, [initialStagedArtifacts]);

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
    enableElderlyMode();
  }, [loadArchive]);

  const processStoryData = async (combinedText: string, name: string, style: string, cascade: boolean, artifacts: any[], visualStyle?: string, isQuick: boolean = false) => {
      setStatus(s => ({ ...s, extracting: true }));
      setAutomatedProgress('agent_scribe');
      
      try {
          const allArtifacts = [...artifacts, ...stagedArtifacts];
          const response = await generateStoryWithMagic(combinedText, name, style, (step) => setAutomatedProgress(step), allArtifacts, visualStyle);
          
          const newStory: ActiveStory = {
            sessionId: response.session_id,
            storytellerName: name,
            narrative: response.narrative,
            extraction: response.extraction,
            generatedImages: response.images || [],
            savedAt: null,
            storyboard: response.storyboard,
            artifacts: response.artifacts || response.extraction?.artifacts || [],
          };

          onStoryChange(newStory);
          setAutomatedProgress('complete');
          setStagedArtifacts([]); 

          await saveStory({ ...newStory, id: newStory.sessionId, name: name, savedAt: new Date().toISOString() } as StoryArchiveItem);

          setTimeout(() => { 
              setAutomatedProgress(null); 
              setShowReveal(true);
              setView('new-story');
              loadArchive();
              setPrefilledData(null);
          }, 1500);
      } catch (error: any) { 
          showToast(`Neural Link Failure: ${error.message}`, 'error');
          setAutomatedProgress(null);
      } finally { 
          setStatus(s => ({ ...s, extracting: false })); 
      }
  };

  // Listen for automated triggers from Global Connie
  useEffect(() => {
    const handleTrigger = (e: any) => {
      const { name, transcript, artifacts } = e.detail;
      processStoryData(transcript, name, "Eloquent (Biographical)", true, artifacts || [], "Cinematic (Non-Linear)", true);
    };
    window.addEventListener('connie-trigger-cascade', handleTrigger);
    return () => window.removeEventListener('connie-trigger-cascade', handleTrigger);
  }, [stagedArtifacts]);

  const handleStageArtifact = (artifact: any) => {
    setStagedArtifacts(prev => [...prev, artifact]);
    showToast("Artifact secured for story.", "success");
  };

  if (!user) return null;

  return (
    <div className="h-full w-full flex flex-col lg:flex-row relative bg-heritage-cream overflow-hidden">
      <MagicProgressOverlay progress={automatedProgress} />
      {showReveal && activeStory && (
        <StoryReveal 
          storyData={activeStory} 
          onComplete={() => {
            setShowReveal(false);
            setStoryForModal(activeStory);
            setIsStorybookOpen(true);
          }} 
        />
      )}
      
      <nav className={`fixed inset-y-0 left-0 w-72 h-full z-[200] lg:relative lg:translate-x-0 transition-transform duration-500 ease-in-out bg-white ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <LeftSidebar 
              currentView={currentView} 
              setView={(v) => { setView(v); setIsSidebarOpen(false); }} 
              customer={user as Customer}
              onLogout={onLogout}
          />
      </nav>

      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full px-5 py-6 lg:py-10 pb-32 lg:pb-24 animate-fade-in">
            {currentView === 'welcome' && <WelcomeView onStartRestoration={() => setView('restore-studio')} onStartStory={() => setView('new-story')} tier={user.tier} />}
            
            {currentView === 'restore-studio' && (
              <PhotoEnhancer 
                isOpen={true} 
                onClose={() => setView('welcome')} 
                onPhotoEnhanced={(orig, enhanced: Record<string, string>) => {
                    const firstStyle = Object.values(enhanced)[0];
                    if (typeof firstStyle === 'string') {
                        handleStageArtifact({ data: firstStyle.split(',')[1], mimeType: 'image/png', type: 'image' });
                    }
                }} 
              />
            )}
            
            {currentView === 'new-story' && (
              <NewStoryPanel 
                  queue={[]} setQueue={() => {}} 
                  onAnalyze={processStoryData} 
                  status={status} imageGenerationProgress={null} videoGenerationProgress={null} 
                  onClearSession={() => { onStoryChange(null); setStagedArtifacts([]); setPrefilledData(null); }} 
                  activeStory={activeStory}
                  onGenerateImages={() => {}} onGenerateVideoFromPrompt={() => {}} 
                  onRetryImage={async () => {}}
                  generationStats={null} totalCost={0} onRefineNarrative={() => {}}
                  onNarrativeChange={(n) => onStoryChange(activeStory ? {...activeStory, narrative: n} : null)}
                  onOpenMusicFinder={() => setIsMusicFinderOpen(true)} 
                  onFinalizeAndReveal={() => setIsStorybookOpen(true)}
                  onOpenConnie={onOpenConnie}
                  onOpenScanner={() => {}} onOpenEnhancer={() => {}} 
                  showToast={showToast}
                  narrationAudio={narrationAudio} 
                  onGenerateNarration={() => {}}
                  onOpenDirectorsCut={() => setIsDirectorsCutOpen(true)} 
                  onOpenPresentation={() => setIsPresentationOpen(true)}
                  initialData={null} onInitialDataLoaded={() => {}} onAnimateImage={() => {}}
                  animatingImageIndex={null} credits={(user as Customer).credits.stories}
                  prefilledData={prefilledData}
                  onImageUpdated={(idx, url) => onStoryChange(activeStory ? {...activeStory, generatedImages: activeStory.generatedImages.map(img => img.index === idx ? {...img, image_url: url} : img)} : null)}
                  onReorderBeats={() => {}}
                />
            )}
            
            {currentView === 'archive' && (
              <ArchivePanel 
                stories={archivedStories} 
                isLoading={isArchiveLoading} 
                onViewStorybook={(s) => { setStoryForModal(s); setIsStorybookOpen(true); }} 
                onDelete={async (id) => { if(confirm("Permanently archive this story?")) { await deleteStory(id); loadArchive(); } }} 
                onExportGedcom={() => {}} 
                onFindConnections={() => {}} 
                onSuggestTopics={() => {}} 
              />
            )}
          </div>
        </main>
      </div>

      <ErrorBoundary>
        <StorybookViewer isOpen={isStorybookOpen} onClose={() => setIsStorybookOpen(false)} story={storyForModal as any || activeStory as any} showToast={showToast} />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <DirectorsCutViewer isOpen={isDirectorsCutOpen} onClose={() => setIsDirectorsCutOpen(false)} story={storyForModal as any || activeStory as any} />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <PresentationViewer isOpen={isPresentationOpen} onClose={() => setIsPresentationOpen(false)} story={storyForModal as any || activeStory as any} theme={modernTheme} />
      </ErrorBoundary>
      
      <MusicFinderModal isOpen={isMusicFinderOpen} onClose={() => setIsMusicFinderOpen(false)} storyThemes={activeStory?.extraction?.themes || []} onSelectTrack={(url) => { if (activeStory) onStoryChange({ ...activeStory, background_music_url: url }); setIsMusicFinderOpen(false); }} />
      
      <div className="fixed bottom-6 left-6 z-[250] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(it => it.id !== t.id))} />)}
      </div>
      
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-[300] p-4 bg-heritage-burgundy text-white rounded-2xl shadow-xl active:scale-95 transition-all"
      >
        <HamburgerIcon />
      </button>
    </div>
  );
};