import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import ErrorBoundary from './components/ErrorBoundary';
import { Customer, ActiveStory, StoryArchiveItem, NeuralAsset } from './types';
import { generateStoryWithMagic } from './services/api';
import { LandingGate } from './components/LandingGate';
import { CinematicSplash } from './components/CinematicSplash'; // kept for reference, unused
import { usePersistentSession } from './hooks/usePersistentSession';
import { checkElderlyMode, enableElderlyMode } from './utils/accessibility';
import { saveStory, getArchivedStories, loadStory as loadStoryFromVault } from './services/archiveService';
import Loader2Icon from './components/icons/Loader2Icon';

// Storyteller Flow Screens
import { WelcomeScreen } from './pages/storyteller/WelcomeScreen';
import { GatheringScreen } from './pages/storyteller/GatheringScreen';
import { ConnieFullScreen } from './pages/storyteller/ConnieFullScreen';
import { YourStoryScreen } from './pages/storyteller/YourStoryScreen';
import ProgressOverlay from './components/ProgressOverlay';
import { StoriesShelf } from './pages/storyteller/StoriesShelf';

// Admin Mode (legacy)
import { StorytellerLayout } from './layouts/StorytellerLayout';
import ConnieChatWidget from './components/ConnieChatWidget';

type StorytellerPhase = 'welcome' | 'gathering' | 'connie' | 'creating' | 'story' | 'shelf' | 'admin';

interface GatheredMaterial {
  transcript: string;
  artifacts: NeuralAsset[];
  importedTexts: { name: string; content: string }[];
}

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

  const [phase, setPhase] = useState<StorytellerPhase>('welcome');
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('en');
  const [narratorVoice, setNarratorVoice] = useState<'Kore' | 'Fenrir'>('Kore');
  const [petMode, setPetMode] = useState(false);
  const [savedStories, setSavedStories] = useState<{ sessionId: string; storytellerName: string; savedAt: string }[]>([]);
  const [fullSavedStories, setFullSavedStories] = useState<StoryArchiveItem[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [material, setMaterial] = useState<GatheredMaterial>({
    transcript: '',
    artifacts: [],
    importedTexts: [],
  });
  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [progressStage, setProgressStage] = useState(0);

  const [adminActiveView, setAdminActiveView] = useState<string>('welcome');
  const [adminConnieOpen, setAdminConnieOpen] = useState(false);

  useEffect(() => {
    if (checkElderlyMode()) enableElderlyMode();
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
      // Load saved stories for the shelf
      try {
        setStoriesLoading(true);
        const archived = await getArchivedStories();
        setFullSavedStories(archived);
        setSavedStories(archived.map(s => ({
          sessionId: s.sessionId || s.id,
          storytellerName: s.storytellerName || s.name || 'Unknown',
          savedAt: s.savedAt || new Date().toISOString(),
        })));
      } catch (e) {
        console.warn('Could not load saved stories', e);
      } finally {
        setStoriesLoading(false);
      }
      setIsInitialized(true);
    };
    initializeApp();
  }, []);

  const handleLogin = (c: Customer) => login(c);
  const handleLogout = () => { logout(); window.location.href = '/'; };

  const handleBegin = useCallback((name: string, lang: string, voice: 'Kore' | 'Fenrir' = 'Kore', isPet: boolean = false) => {
    setSubject(name || '');
    setLanguage(lang || 'en');
    setNarratorVoice(voice);
    setPetMode(isPet);
    setMaterial({ transcript: '', artifacts: [], importedTexts: [] });
    setActiveStory(null);
    setPhase('gathering');
  }, []);

  const handleTalkToConnie = useCallback(() => {
    setMaterial({ transcript: '', artifacts: [], importedTexts: [] });
    setActiveStory(null);
    setPhase('connie');
  }, []);

  const handleUploadMemories = useCallback(() => {
    setMaterial({ transcript: '', artifacts: [], importedTexts: [] });
    setActiveStory(null);
    setPhase('gathering');
  }, []);

  const handleViewStory = useCallback(async (sessionId: string) => {
    try {
      const story = await loadStoryFromVault(sessionId);
      if (story) {
        setActiveStory(story);
        setSubject(story.storytellerName || '');
        setPhase('story');
      }
    } catch (e) {
      console.error("Failed to load story:", e);
    }
  }, []);

  const handleConnieFinish = useCallback((data: { transcript: string }) => {
    setMaterial(prev => ({ ...prev, transcript: data.transcript }));
    if (!subject) {
      const nameMatch = data.transcript.match(/(?:about|remember|name is|called)\s+([A-Z][a-z]+ ?[A-Z]?[a-z]*)/);
      if (nameMatch) setSubject(nameMatch[1].trim());
    }
    setPhase('gathering');
  }, [subject]);

  const handleAddPhotos = useCallback((assets: NeuralAsset[]) => {
    setMaterial(prev => ({ ...prev, artifacts: [...prev.artifacts, ...assets] }));
  }, []);

  const handleAddText = useCallback((name: string, content: string) => {
    setMaterial(prev => ({ ...prev, importedTexts: [...prev.importedTexts, { name, content }] }));
  }, []);

  const handleRemoveArtifact = useCallback((id: string) => {
    setMaterial(prev => ({ ...prev, artifacts: prev.artifacts.filter(a => a.id !== id) }));
  }, []);

  const handleRemoveText = useCallback((index: number) => {
    setMaterial(prev => ({ ...prev, importedTexts: prev.importedTexts.filter((_, i) => i !== index) }));
  }, []);

  const handleCreateStory = useCallback(async (photoAnalysis?: { era?: string; description?: string; subject_description?: string; suggested_style?: string } | null, narrativeStyle?: string, musicQuery?: string, imagePalette?: string, isPet?: boolean, verifiedPhotoFacts?: string[]) => {
    setPhase('creating');
    setProgressStage(0);
    try {
      const allText = [
        material.transcript,
        ...material.importedTexts.map(t => `[Document: ${t.name}]\n${t.content}`)
      ].filter(Boolean).join('\n\n---\n\n');

      if (!allText.trim()) {
        alert("Please add at least one memory — talk to your companion, upload photos, or add a document.");
        setPhase('gathering');
        return;
      }

      const storyName = subject.trim() || 'Someone Special';
      const artifactData = material.artifacts.map(a => ({
        data: '',
        mimeType: a.file_type || 'image/jpeg',
        extractedText: '',
      }));

      // Build photo grounding context — passed to edge function to anchor AI images
      // to the real person's era, ethnicity, and appearance
      const photoGrounding = photoAnalysis ? {
        era: photoAnalysis.era,
        subject_description: photoAnalysis.subject_description || photoAnalysis.description,
        suggested_style: photoAnalysis.suggested_style,
      } : undefined;

      // Real uploaded photos — passed to cascade so Gemini can match each
      // to its nearest story beat by era, producing anchor_photo per beat
      const uploadedPhotos = material.artifacts
        .filter(a => a.public_url && a.file_type?.startsWith('image/'))
        .map(a => ({
          url: a.public_url!,
          era: a.metadata?.era || a.metadata?.estimated_era || '',
          facts: a.metadata?.verifiedFacts || [],
        }));

      const response = await generateStoryWithMagic(
        allText, storyName, narrativeStyle || "Cinematic (Non-Linear)",
        (step) => {
          if (step === 'agent_scribe') setProgressStage(0);
          if (step === 'agent_cartographer') setProgressStage(1);
          if (step === 'agent_illustrator') setProgressStage(2);
          if (step === 'agent_director') setProgressStage(3);
        },
        artifactData, narrativeStyle || "Cinematic (Non-Linear)", photoGrounding,
        musicQuery, imagePalette, language, isPet || petMode,
        verifiedPhotoFacts, uploadedPhotos
      );

      const newStory: ActiveStory = {
        sessionId: response.session_id,
        storytellerName: storyName,
        narrative: response.narrative,
        extraction: response.extraction,
        generatedImages: response.images || [],
        savedAt: new Date().toISOString(),
        storyboard: response.storyboard,
        musicQuery: response.suggested_music_query || musicQuery || undefined,
        imagePalette: imagePalette || undefined,
        // Merge user's uploaded photos (material.artifacts) with AI-extracted artifacts
        // User photos have public_url + file_type set — these power the Band of Brothers anchor
        artifacts: [
          ...material.artifacts.filter(a => a.public_url && a.file_type?.startsWith('image/')),
          ...(response.artifacts || response.extraction?.artifacts || []),
        ],
        beatAudio: response.beat_audio || [],
        petMode: isPet || false,
        uploadedPhotos, // real photos with era — for per-beat anchor grounding
      };

      try {
        await saveStory({ ...newStory, id: newStory.sessionId, name: storyName, savedAt: new Date().toISOString() } as StoryArchiveItem);
        // Wait 2s for edge function to finish committing to Supabase before refreshing shelf
        const archived = await getArchivedStories(2000);
        setFullSavedStories(archived);
        setSavedStories(archived.map(s => ({
          sessionId: s.sessionId || s.id,
          storytellerName: s.storytellerName || s.name || 'Unknown',
          savedAt: s.savedAt || new Date().toISOString(),
        })));
      } catch (saveErr) {
        console.warn("[Archive] Auto-save skipped:", saveErr);
      }

      setActiveStory(newStory);
      if (response.extraction?.storyteller?.name) setSubject(response.extraction.storyteller.name);
      setTimeout(() => setPhase('story'), 1500);
    } catch (error: any) {
      console.error("The Magic Cascade failed:", error);
      alert(`Story creation encountered an issue: ${error.message}\n\nPlease try again.`);
      setPhase('gathering');
    }
  }, [material, subject]);


  const handleRefineNarrative = useCallback(async (instruction: string) => {
    if (!activeStory) return;
    try {
      const refinedText = [
        activeStory.narrative,
        ...( activeStory.extraction ? [`[Context: ${JSON.stringify(activeStory.extraction.storyteller || {})}]`] : [])
      ].join('\n\n');

      const response = await generateStoryWithMagic(
        refinedText,
        activeStory.storytellerName,
        instruction,
        () => {},
        [],
        instruction,
        undefined,
        activeStory.musicQuery,
        activeStory.imagePalette
      );

      setActiveStory(prev => prev ? {
        ...prev,
        narrative: response.narrative || prev.narrative,
        storyboard: response.storyboard || prev.storyboard,
      } : prev);
    } catch (err: any) {
      console.error('[MagicTouch] Refine failed:', err);
      alert('Magic Touch encountered an issue: ' + err.message);
    }
  }, [activeStory]);

  const handleRestart = useCallback(() => {
    setActiveStory(null);
    setMaterial({ transcript: '', artifacts: [], importedTexts: [] });
    setSubject('');
    setPhase('welcome');
  }, []);

  const handleRefreshShelf = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const archived = await getArchivedStories();
      setFullSavedStories(archived);
      setSavedStories(archived.map(s => ({
        sessionId: s.sessionId || s.id,
        storytellerName: s.storytellerName || s.name || 'Unknown',
        savedAt: s.savedAt || new Date().toISOString(),
      })));
    } catch (e) {
      console.warn('Shelf refresh failed:', e);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  const runAdminCascade = async (data: {
    transcript: string; storytellerName: string;
    artifacts?: { data: string; mimeType: string; description: string }[];
  }) => {
    setSubject(data.storytellerName);
    setMaterial(prev => ({ ...prev, transcript: data.transcript }));
    setPhase('creating'); setProgressStage(0); setAdminConnieOpen(false);
    try {
      const mappedArtifacts = (data.artifacts || []).map(a => ({ data: a.data, mimeType: a.mimeType, type: 'image' }));
      const response = await generateStoryWithMagic(
        data.transcript, data.storytellerName, "Eloquent (Biographical)",
        (step) => {
          if (step === 'agent_cartographer') setProgressStage(1);
          if (step === 'agent_illustrator') setProgressStage(2);
          if (step === 'agent_director') setProgressStage(3);
        }, mappedArtifacts, "Cinematic (Non-Linear)"
      );
      const newStory: ActiveStory = {
        sessionId: response.session_id, storytellerName: data.storytellerName,
        narrative: response.narrative, extraction: response.extraction,
        generatedImages: response.images || [], savedAt: new Date().toISOString(),
        storyboard: response.storyboard, artifacts: response.artifacts || [],
      };
      await saveStory({ ...newStory, id: newStory.sessionId, name: data.storytellerName, savedAt: new Date().toISOString() } as StoryArchiveItem);
      setActiveStory(newStory);
      setTimeout(() => setPhase('story'), 1500);
    } catch (error) {
      console.error("Admin cascade failed:", error);
      setPhase('admin');
      alert("Story creation encountered an issue.");
    }
  };

  if (isLoadingShared) return <LoadingScreen message="Uplinking Shared Legacy..." />;
  if (!isInitialized) return null;

  // Share link — show story publicly, no auth required
  if (sharedStory) {
    return (
      <ErrorBoundary>
        <YourStoryScreen
          story={sharedStory}
          narratorVoice={narratorVoice}
          onRestart={() => window.location.href = '/'}
          onViewShelf={undefined}
          onReorderBeats={undefined}
          isSharedView={true}
        />
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated || !user) {
    return <LandingGate onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          {phase === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <WelcomeScreen
                onBegin={handleBegin}
                onLogout={handleLogout}
                onTalkToConnie={handleTalkToConnie}
                onUploadMemories={handleUploadMemories}
                onViewStory={handleViewStory}
                onViewShelf={() => setPhase('shelf')}
                savedStories={savedStories}
                storiesLoading={storiesLoading}
                onLogoTap={() => { let t = (window as any).__adminTap = ((window as any).__adminTap || 0) + 1; if (t >= 5) { (window as any).__adminTap = 0; setPhase('admin'); } }}
                activeStoryName={activeStory?.storytellerName}
                onReturnToStory={activeStory ? () => setPhase('story') : undefined}
              />
            </motion.div>
          )}
          {phase === 'gathering' && (
            <motion.div key="gathering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <GatheringScreen
                subject={subject || 'a loved one'}
                material={material}
                onTalk={() => setPhase('connie')}
                onPhotos={handleAddPhotos}
                onText={handleAddText}
                onRemoveArtifact={handleRemoveArtifact}
                onRemoveText={handleRemoveText}
                onCreate={handleCreateStory}
                onExit={handleRestart}
                petMode={petMode}
              />
            </motion.div>
          )}
          {phase === 'connie' && (
            <motion.div key="connie" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ConnieFullScreen
                subject={subject || 'someone special'}
                storytellerName={user?.name || user?.email || undefined}
                onFinish={handleConnieFinish}
                onBack={() => setPhase(material.transcript ? 'gathering' : 'welcome')}
                onRequestPhotos={() => {
                  handleConnieFinish({ transcript: '' });
                  setTimeout(() => setPhase('gathering'), 100);
                }}
                onCreateStory={(subjectName) => {
                  if (subjectName && !subject) setSubject(subjectName);
                  setPhase('gathering');
                }}
              />
            </motion.div>
          )}
          {phase === 'creating' && (
            <motion.div key="creating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ProgressOverlay stage={progressStage} />
            </motion.div>
          )}
          {phase === 'story' && activeStory && (
            <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <YourStoryScreen
                story={activeStory}
                narratorVoice={narratorVoice}
                onRestart={handleRestart}
                onViewShelf={() => setPhase('shelf')}
                onBack={() => setPhase('welcome')}
                onRefineNarrative={handleRefineNarrative}
              />
            </motion.div>
          )}
          {phase === 'shelf' && (
            <motion.div key="shelf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <StoriesShelf
                stories={fullSavedStories}
                onSelectStory={(sessionId) => handleViewStory(sessionId)}
                onNewStory={() => { setPhase('welcome'); }}
                onBack={() => setPhase(activeStory ? 'story' : 'welcome')}
                onRefresh={handleRefreshShelf}
                isRefreshing={storiesLoading}
              />
            </motion.div>
          )}
          {phase === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <StorytellerLayout
                onLogout={handleLogout} isAdmin={user.is_admin}
                activeView={adminActiveView} onViewChange={setAdminActiveView}
                onOpenConnie={() => setAdminConnieOpen(true)} prefilledData={null}
                initialStagedArtifacts={[]} activeStory={activeStory} onStoryChange={setActiveStory}
              />
              <ConnieChatWidget
                isOpen={adminConnieOpen} onToggle={() => setAdminConnieOpen(!adminConnieOpen)}
                onConversationEnd={runAdminCascade}
                onExecuteCommand={(cmd, args) => {
                  if (cmd === 'navigateTo' && args.view) {
                    setAdminActiveView(args.view);
                    if (args.view !== 'new-story') setAdminConnieOpen(false);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
};

export default App;
