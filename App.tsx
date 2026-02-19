import React, { useState, useEffect, useCallback } from 'react';
import { StorytellerLayout } from './layouts/StorytellerLayout';
import { LandingGate } from './components/LandingGate';
import ErrorBoundary from './components/ErrorBoundary';
import { Customer, ActiveStory, StoryArchiveItem } from './types';
import { loadStoryFromVault, generateStoryWithMagic } from './services/api';
import CinematicReveal from './components/CinematicReveal';
import Loader2Icon from './components/icons/Loader2Icon';
import { usePersistentSession } from './hooks/usePersistentSession';
import { checkElderlyMode, enableElderlyMode } from './utils/accessibility';
import ConnieChatWidget from './components/ConnieChatWidget';
import ProgressOverlay from './components/ProgressOverlay';
import { saveStory } from './services/archiveService';

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-screen bg-[#0D0B0A] flex flex-col items-center justify-center">
    <Loader2Icon className="w-16 h-16 text-amber-500 mb-6" />
    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">{message}</p>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, user, login, logout } = usePersistentSession();
  const [isInitialized, setIsInitialized] = useState(false);
  const [sharedStory, setSharedStory] = useState<ActiveStory | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [activeView, setActiveView] = useState<string>('welcome');
  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  
  // Connie Global State
  const [connieOpen, setConnieOpen] = useState(false);
  const [prefilledData, setPrefilledData] = useState<{ name: string; notes: string } | null>(null);
  const [stagedArtifacts, setStagedArtifacts] = useState<any[]>([]);

  // Magic Cascade Progress State
  const [isCreating, setIsCreating] = useState(false);
  const [progressStage, setProgressStage] = useState(0);

  useEffect(() => {
    if (checkElderlyMode()) {
        enableElderlyMode();
    }
    
    const initializeApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const storyId = params.get('story');
      
      if (storyId) {
        setIsLoadingShared(true);
        try {
          const story = await loadStoryFromVault(storyId);
          if (story) setSharedStory(story);
        } catch (e) {
          console.error("Shared link resolution failed", e);
        } finally {
          setIsLoadingShared(false);
        }
      }
      setIsInitialized(true);
    };

    initializeApp();
  }, []);

  const handleLogin = (c: Customer) => {
    login(c);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const openConnie = () => {
    setConnieOpen(true);
  };

  /**
   * The Magic Cascade - Automated Story Crafting logic.
   * Feeds directly from Connie's interview results.
   */
  const runAutomatedStoryCrafting = async (data: { 
    transcript: string; 
    storytellerName: string; 
    artifacts?: {data: string, mimeType: string, description: string}[] 
  }) => {
    setIsCreating(true);
    setProgressStage(0); // Stage 1: Reading your story...
    setConnieOpen(false);

    try {
      const mappedArtifacts = (data.artifacts || []).map(a => ({ 
        data: a.data, 
        mimeType: a.mimeType, 
        type: 'image' 
      }));

      const response = await generateStoryWithMagic(
        data.transcript, 
        data.storytellerName, 
        "Eloquent (Biographical)", 
        (step) => {
          // Map Agent boundaries to our 4 warm progress stages
          if (step === 'agent_cartographer') setProgressStage(1);
          if (step === 'agent_illustrator') setProgressStage(2);
          if (step === 'agent_director') setProgressStage(3);
        }, 
        mappedArtifacts, 
        "Cinematic (Non-Linear)"
      );

      const newStory: ActiveStory = {
        sessionId: response.session_id,
        storytellerName: data.storytellerName,
        narrative: response.narrative,
        extraction: response.extraction,
        generatedImages: response.images || [],
        savedAt: null,
        storyboard: response.storyboard,
        artifacts: response.artifacts || response.extraction?.artifacts || [],
      };

      await saveStory({ ...newStory, id: newStory.sessionId, name: data.storytellerName, savedAt: new Date().toISOString() } as StoryArchiveItem);
      
      setActiveStory(newStory);
      setActiveView('new-story');
      
      // Artificial slight delay for the "Finishing touches" feel
      setTimeout(() => {
        setIsCreating(false);
      }, 1500);

    } catch (error) {
      console.error("The Magic Cascade failed:", error);
      setIsCreating(false);
      alert("We encountered an issue creating your story. Your conversation is saved in the vault.");
    }
  };

  if (isLoadingShared) return <LoadingScreen message="Uplinking Shared Legacy..." />;
  if (!isInitialized) return null;

  if (sharedStory) {
    return (
      <ErrorBoundary>
        <CinematicReveal 
          story={sharedStory} 
          onRestart={() => window.location.href = '/'} 
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="h-full w-full">
      {isAuthenticated && user && (
        <ErrorBoundary>
          <StorytellerLayout 
            onLogout={handleLogout} 
            isAdmin={user.is_admin} 
            activeView={activeView}
            onViewChange={setActiveView}
            onOpenConnie={openConnie}
            prefilledData={prefilledData}
            initialStagedArtifacts={stagedArtifacts}
            activeStory={activeStory}
            onStoryChange={setActiveStory}
          />
          
          <ConnieChatWidget 
            isOpen={connieOpen}
            onToggle={() => setConnieOpen(!connieOpen)}
            onConversationEnd={runAutomatedStoryCrafting}
            onExecuteCommand={(cmd, args) => {
              if (cmd === 'navigateTo' && args.view) {
                setActiveView(args.view);
                if (args.view !== 'new-story') setConnieOpen(false);
              }
            }}
          />

          {isCreating && <ProgressOverlay stage={progressStage} />}
        </ErrorBoundary>
      )}

      {!isAuthenticated && <LandingGate onLogin={handleLogin} />}
    </div>
  );
}

export default App;