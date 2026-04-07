import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import ErrorBoundary from './components/ErrorBoundary';
import { Customer, ActiveStory, StoryArchiveItem, NeuralAsset } from './types';
import { generateStoryWithMagic } from './services/api';
import { WissumsLanding } from './components/WissumsLanding';
import StoryLoadingCinema from './components/StoryLoadingCinema';
import { usePersistentSession } from './hooks/usePersistentSession';
import { checkElderlyMode, enableElderlyMode } from './utils/accessibility';
import { saveStory, getArchivedStories, loadStory as loadStoryFromVault } from './services/archiveService';
import { createCheckoutSession, verifyPayment, Tier } from './services/stripeService';
import Loader2Icon from './components/icons/Loader2Icon';

// Storyteller Flow Screens
import { WelcomeScreen } from './pages/storyteller/WelcomeScreen';
import { TributeContributePage } from './pages/storyteller/TributeContributePage';
import GatheringScreen from './pages/storyteller/GatheringScreen';
import { ConnieFullScreen } from './pages/storyteller/ConnieFullScreen';
import { YourStoryScreen } from './pages/storyteller/YourStoryScreen';
import { StoriesShelf } from './pages/storyteller/StoriesShelf';

// Admin Mode (legacy)
import { StorytellerLayout } from './layouts/StorytellerLayout';
import ConnieChatWidget from './components/ConnieChatWidget';

type StorytellerPhase = 'landing' | 'welcome' | 'gathering' | 'connie' | 'creating' | 'story' | 'shelf' | 'admin';

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
  const [tributeStoryId, setTributeStoryId] = useState<string | null>(null);
  const [tributeSubject, setTributeSubject] = useState<string>('');

  // ── Stripe / tier state ────────────────────────────────────────────────────
  const [paidTier, setPaidTier] = useState<Tier | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [phase, setPhase] = useState<StorytellerPhase>('landing');
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('en');
  const [narratorVoice, setNarratorVoice] = useState<'Kore' | 'Fenrir'>('Kore');
  const [petMode, setPetMode] = useState(true); // Always pet mode in Wissums
  const [persona, setPersona] = useState<'curator' | 'keeper' | 'pet'>('pet');
  const [savedStories, setSavedStories] = useState<{ sessionId: string; storytellerName: string; savedAt: string }[]>([]);
  const [fullSavedStories, setFullSavedStories] = useState<StoryArchiveItem[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [material, setMaterial] = useState<GatheredMaterial>({
    transcript: '',
    artifacts: [],
    importedTexts: [],
  });
  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [storyFromShelf, setStoryFromShelf] = useState(false);
  const [progressStage, setProgressStage] = useState(0);

  const [adminActiveView, setAdminActiveView] = useState<string>('welcome');
  const [adminConnieOpen, setAdminConnieOpen] = useState(false);

  useEffect(() => {
    if (checkElderlyMode()) enableElderlyMode();
    const initializeApp = async () => {
      const params = new URLSearchParams(window.location.search);

      // ── PAYMENT RETURN — Stripe redirects back here ────────────────────
      const paymentStatus = params.get('payment');
      const stripeSessionId = params.get('session_id');
      if (paymentStatus === 'success' && stripeSessionId) {
        window.history.replaceState({}, '', '/');
        setIsCheckingPayment(true);
        try {
          const result = await verifyPayment(stripeSessionId);
          if (result.paid && result.tier) {
            setPaidTier(result.tier);
            if (result.petName) setSubject(result.petName);
            // Auto-login as guest and go to welcome
            login({
              id: `wissums-${Date.now()}`, name: result.petName || 'Pet Parent',
              email: 'customer@wissums.com', org_id: '71077b47-66e8-4fd9-90e7-709773ea6582', is_admin: false,
            });
            setPhase('welcome');
          } else {
            console.warn('[Payment] Not verified — showing landing');
          }
        } catch (e) {
          console.error('[Payment] Verification failed:', e);
        } finally {
          setIsCheckingPayment(false);
        }
      } else if (paymentStatus === 'cancelled') {
        window.history.replaceState({}, '', '/');
      }

      // ── Check for stored tier in session ────────────────────────────────
      try {
        const storedTier = sessionStorage.getItem('wissums_tier');
        if (storedTier === 'basic' || storedTier === 'premium') {
          setPaidTier(storedTier);
        }
      } catch {}

      // ── TRIBUTE LINK ────────────────────────────────────────────────────
      const tributeId = params.get('tribute');
      const tributeFor = params.get('for');
      if (tributeId) {
        window.history.replaceState({}, '', window.location.pathname);
        setTributeStoryId(tributeId);
        setTributeSubject(tributeFor ? decodeURIComponent(tributeFor) : 'this pet');
        setIsInitialized(true);
        return;
      }

      // ── SHARE LINK — supports /story/:id paths AND legacy ?story= query ──
      const pathMatch = window.location.pathname.match(/^\/story\/(.+)/);
      const storyId = pathMatch ? pathMatch[1] : params.get('story');
      if (storyId) {
        // Keep the clean /story/:id URL so it's bookmarkable; only strip query-param variant
        if (!pathMatch) window.history.replaceState({}, '', window.location.pathname);
        setIsLoadingShared(true);
        try {
          const story = await loadStoryFromVault(storyId);
          if (story) setSharedStory(story);
          else console.warn('[Share] Story not found:', storyId);
        } catch (e) {
          console.error('[Share] Resolution failed', e);
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

  // ── Persist tier in session storage ────────────────────────────────────────
  useEffect(() => {
    if (paidTier) sessionStorage.setItem('wissums_tier', paidTier);
  }, [paidTier]);

  // ── Stripe checkout handler ────────────────────────────────────────────────
  const handleSelectTier = useCallback(async (tier: Tier) => {
    setCheckoutLoading(true);
    try {
      const { checkoutUrl } = await createCheckoutSession(tier);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error('[Checkout] Failed:', err);
      alert('Payment setup failed. Please try again.');
      setCheckoutLoading(false);
    }
  }, []);

  const handleLogin = (c: Customer) => login(c);
  const handleLogout = () => { logout(); setPaidTier(null); sessionStorage.removeItem('wissums_tier'); window.location.href = '/'; };

  const handleBegin = useCallback((name: string, lang: string, voice: 'Kore' | 'Fenrir' = 'Kore', isPet: boolean = true, selectedPersona: 'curator' | 'keeper' | 'pet' = 'pet') => {
    setSubject(name || '');
    setLanguage(lang || 'en');
    setNarratorVoice(voice);
    setPetMode(true);
    setPersona(selectedPersona);
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
        setStoryFromShelf(true);
        setSubject(story.storytellerName || '');
        setPhase('story');
      }
    } catch (e) {
      console.error('Failed to load story:', e);
    }
  }, []);

  const handleConnieFinish = useCallback((data: { transcript: string }) => {
    setMaterial(prev => ({ ...prev, transcript: data.transcript }));
    if (!subject) {
      const nameMatch = data.transcript.match(/(?:about|named?|called)\s+([A-Z][a-z]+ ?[A-Z]?[a-z]*)/);
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

  const handleCreateStory = useCallback(async (
    photoAnalysis?: { era?: string; description?: string; subject_description?: string; suggested_style?: string } | null,
    narrativeStyle?: string,
    musicQuery?: string,
    imagePalette?: string,
    isPet?: boolean,
    verifiedPhotoFacts?: string[]
  ) => {
    setPhase('creating');
    setProgressStage(0);
    try {
      const allText = [
        material.transcript,
        ...material.importedTexts.map(t => `[Document: ${t.name}]\n${t.content}`)
      ].filter(Boolean).join('\n\n---\n\n');

      if (!allText.trim()) {
        alert('Please share at least one memory \u2014 talk to Connie, upload photos, or add a description.');
        setPhase('gathering');
        return;
      }

      const storyName = subject.trim() || 'Your Pet';
      const artifactData = material.artifacts.map(a => ({
        data: '',
        mimeType: a.file_type || 'image/jpeg',
        extractedText: '',
      }));

      const photoGrounding = photoAnalysis ? {
        era: photoAnalysis.era,
        subject_description: photoAnalysis.subject_description || photoAnalysis.description,
        suggested_style: photoAnalysis.suggested_style,
      } : undefined;

      const uploadedPhotos = material.artifacts
        .filter(a => a.public_url && a.file_type?.startsWith('image/'))
        .map(a => ({
          url: a.public_url!,
          era: a.metadata?.era || a.metadata?.estimated_era || '',
          facts: a.metadata?.verifiedFacts || [],
        }));

      const response = await generateStoryWithMagic(
        allText, storyName, narrativeStyle || 'Cinematic (Non-Linear)',
        (step) => {
          if (step === 'agent_scribe') setProgressStage(0);
          if (step === 'agent_cartographer') setProgressStage(1);
          if (step === 'agent_illustrator') setProgressStage(2);
          if (step === 'agent_director') setProgressStage(3);
        },
        artifactData, narrativeStyle || 'Cinematic (Non-Linear)', photoGrounding,
        musicQuery, imagePalette, language, true, // always pet mode
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
        artifacts: [
          ...material.artifacts.filter(a => a.public_url && a.file_type?.startsWith('image/')),
          ...(response.artifacts || response.extraction?.artifacts || []),
        ],
        beatAudio: response.beat_audio || [],
        petMode: true,
        uploadedPhotos,
      };

      try {
        await saveStory({ ...newStory, id: newStory.sessionId, name: storyName, savedAt: new Date().toISOString() } as StoryArchiveItem);
        const archived = await getArchivedStories(2000);
        setFullSavedStories(archived);
        setSavedStories(archived.map(s => ({
          sessionId: s.sessionId || s.id,
          storytellerName: s.storytellerName || s.name || 'Unknown',
          savedAt: s.savedAt || new Date().toISOString(),
        })));
      } catch (saveErr) {
        console.warn('[Archive] Auto-save skipped:', saveErr);
      }

      setActiveStory(newStory);
      setStoryFromShelf(false);
      setTimeout(() => setPhase('story'), 1500);
    } catch (error: any) {
      console.error('Story creation failed:', error);
      alert(`Story creation encountered an issue: ${error.message}\n\nPlease try again.`);
      setPhase('gathering');
    }
  }, [material, subject, language]);

  const handleRefineNarrative = useCallback(async (instruction: string) => {
    if (!activeStory) return;
    try {
      const refinedText = [
        activeStory.narrative,
        ...(activeStory.extraction ? [`[Context: ${JSON.stringify(activeStory.extraction.storyteller || {})}]`] : [])
      ].join('\n\n');

      const response = await generateStoryWithMagic(
        refinedText, activeStory.storytellerName, instruction,
        () => {}, [], instruction, undefined,
        activeStory.musicQuery, activeStory.imagePalette
      );

      setActiveStory(prev => prev ? {
        ...prev,
        narrative: response.narrative || prev.narrative,
        storyboard: response.storyboard || prev.storyboard,
      } : prev);
    } catch (err: any) {
      console.error('[Refine] Failed:', err);
      alert('Story refinement encountered an issue: ' + err.message);
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

  const handleShareStory = useCallback(async (story: ActiveStory) => {
    const shareUrl = story.share_url || `${window.location.origin}/story/${story.sessionId}`;
    const shareTitle = `${story.storytellerName}'s Story`;
    const shareText = `Check out ${story.storytellerName}'s story on Wissums!`;

    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, text: shareText, url: shareUrl }); return; }
      catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      return shareUrl;
    } catch {
      window.prompt('Copy this link to share:', shareUrl);
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
        data.transcript, data.storytellerName, 'Eloquent (Biographical)',
        (step) => {
          if (step === 'agent_cartographer') setProgressStage(1);
          if (step === 'agent_illustrator') setProgressStage(2);
          if (step === 'agent_director') setProgressStage(3);
        }, mappedArtifacts, 'Cinematic (Non-Linear)'
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
      console.error('Admin cascade failed:', error);
      setPhase('admin');
      alert('Story creation encountered an issue.');
    }
  };

  // Extract name from URL for personalised loading screen
  const pendingName = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('name') || undefined;
    } catch { return undefined; }
  })();

  // Minimum 5s splash for share links
  const [minSplashDone, setMinSplashDone] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 5000);
    return () => clearTimeout(t);
  }, []);
  if (isLoadingShared || (!minSplashDone && sharedStory)) return <StoryLoadingCinema storytellerName={sharedStory?.storytellerName || pendingName} />;
  if (isCheckingPayment) return <LoadingScreen message="Verifying payment..." />;
  if (!isInitialized) return null;

  // ── Share link — show story publicly, no auth required ────────────────────
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
          autoPlayCinematic={true}
          onShare={() => handleShareStory(sharedStory)}
        />
      </ErrorBoundary>
    );
  }

  // ── Tribute contribution view — no auth needed ────────────────────────
  if (tributeStoryId) {
    return (
      <ErrorBoundary>
        <TributeContributePage
          storyId={tributeStoryId}
          storySubject={tributeSubject}
          onDone={() => window.location.href = '/'}
        />
      </ErrorBoundary>
    );
  }

  // ── Landing page — shown before payment ────────────────────────────────────
  if (!paidTier && phase === 'landing') {
    return <WissumsLanding onSelectTier={handleSelectTier} isLoading={checkoutLoading} />;
  }

  // ── If no paid tier and somehow past landing, redirect to landing ──────────
  if (!paidTier && !isAuthenticated) {
    return <WissumsLanding onSelectTier={handleSelectTier} isLoading={checkoutLoading} />;
  }

  // Auto-login as guest if paid but not authenticated
  if (paidTier && !isAuthenticated) {
    login({
      id: `wissums-${Date.now()}`, name: 'Pet Parent',
      email: 'customer@wissums.com', org_id: '71077b47-66e8-4fd9-90e7-709773ea6582', is_admin: false,
    });
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
                onLogoTap={() => {
                  let t = (window as any).__adminTap = ((window as any).__adminTap || 0) + 1;
                  if (t >= 5) { (window as any).__adminTap = 0; setPhase('admin'); }
                }}
                activeStoryName={activeStory?.storytellerName}
                onReturnToStory={activeStory ? () => setPhase('story') : undefined}
              />
            </motion.div>
          )}
          {phase === 'landing' && paidTier && (
            <motion.div key="redirect-welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {/* Auto-redirect to welcome once paid */}
              {(() => { setPhase('welcome'); return null; })()}
            </motion.div>
          )}
          {phase === 'gathering' && (
            <motion.div key="gathering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <GatheringScreen
                subject={subject || 'your pet'}
                material={material}
                persona={persona}
                onTalk={() => setPhase('connie')}
                onPhotos={handleAddPhotos}
                onText={handleAddText}
                onRemoveArtifact={handleRemoveArtifact}
                onRemoveText={handleRemoveText}
                onCreate={handleCreateStory}
                onExit={handleRestart}
                petMode={true}
              />
            </motion.div>
          )}
          {phase === 'connie' && (
            <motion.div key="connie" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ConnieFullScreen
                subject={subject || 'your pet'}
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
              <StoryLoadingCinema storytellerName={subject || 'Your Pet'} progressStage={progressStage} />
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
                onShare={() => handleShareStory(activeStory)}
                autoPlayCinematic={!storyFromShelf}
                paidTier={paidTier}
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
                onLogout={handleLogout} isAdmin={user?.is_admin || false}
                activeView={adminActiveView} onViewChange={setAdminActiveView}
                onOpenConnie={() => setAdminConnieOpen(true)} prefilledData={null}
                initialStagedArtifacts={[]} activeStory={activeStory} onStoryChange={setActiveStory}
              />
              <ConnieChatWidget
                isOpen={adminConnieOpen}
                onToggle={() => setAdminConnieOpen(!adminConnieOpen)}
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
