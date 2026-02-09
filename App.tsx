import React, { useState, useEffect } from 'react';
import { StorytellerLayout } from './layouts/StorytellerLayout';
import { LandingGate } from './components/LandingGate';
import ErrorBoundary from './components/ErrorBoundary';
import { Customer, ActiveStory } from './types';
import { loadStoryFromVault } from './services/api';
import CinematicReveal from './components/CinematicReveal';
import Loader2Icon from './components/icons/Loader2Icon';
import { usePersistentSession } from './hooks/usePersistentSession';

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

  useEffect(() => {
    const initializeApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const storyId = params.get('story');
      
      // 1. PRIORITY: Shared Legacy Link (Public View)
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
      
      // 2. SESSION RESTORATION is handled by usePersistentSession hook
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

  if (isLoadingShared) return <LoadingScreen message="Uplinking Shared Legacy..." />;
  if (!isInitialized) return null;

  // PUBLIC SHARED VIEWER (Priority Bypass)
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

  // ACTIVE AUTHORIZED SESSION
  if (isAuthenticated && user) {
    return (
      <ErrorBoundary>
        <StorytellerLayout 
          onLogout={handleLogout} 
          isAdmin={user.is_admin} 
        />
      </ErrorBoundary>
    );
  }

  // THE SECURE ENTRY (iVALT + Demo Bypass Only)
  return <LandingGate onLogin={handleLogin} />;
}

export default App;