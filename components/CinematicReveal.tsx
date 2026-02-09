import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ActiveStory } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import ShareIcon from './icons/ShareIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import GlobeAmericasIcon from './icons/GlobeAmericasIcon';
import StorybookViewer from './StorybookViewer';
import { translateContent } from '../services/api';

interface CinematicRevealProps {
  story: ActiveStory;
  onRestart: () => void;
}

type Phase = 'gate' | 'title' | 'journey' | 'whisper' | 'finale';

const CinematicReveal: React.FC<CinematicRevealProps> = ({ story, onRestart }) => {
  const [phase, setPhase] = useState<Phase>('gate');
  const [hasStarted, setHasStarted] = useState(false);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [isShared, setIsShared] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedNarrative, setTranslatedNarrative] = useState<Record<number, string>>({});
  const [isStorybookOpen, setIsStorybookOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const storyBeats = useMemo(() => {
    return story?.storyboard?.story_beats || [];
  }, [story]);

  const evocativeNarrations = useMemo(() => {
      const items = (story?.extraction?.timeline || [])
        .map(t => (t as any).evocative_narration)
        .filter(Boolean);
      return items.length > 0 ? items : [
        "The memories play like an old film in my mind...",
        "I can still hear the echoes of that time...",
        "Some moments carry more weight than others...",
        "It's a beautiful thing, to be remembered."
      ];
  }, [story]);

  const storyUrl = useMemo(() => {
    if (!story?.sessionId) return '';
    return `${window.location.origin}?story=${story.sessionId}`;
  }, [story?.sessionId]);

  const ambientTrack = useMemo(() => {
    if (story?.background_music_url) return story.background_music_url;
    return 'https://www.bensound.com/bensound-music/bensound-memories.mp3'; 
  }, [story]);

  const handleGateEntry = () => {
      setPhase('title');
      if (audioRef.current) {
          audioRef.current.volume = 0;
          audioRef.current.play().then(() => {
              let vol = 0;
              const swell = setInterval(() => {
                  if (vol < 0.4) {
                      vol += 0.05;
                      if (audioRef.current) audioRef.current.volume = vol;
                  } else {
                      clearInterval(swell);
                  }
              }, 200);
          }).catch(e => console.warn("Audio node blocked", e));
      }
  };

  const handleStart = () => {
    setHasStarted(true);
    const timer = setTimeout(() => setPhase('journey'), 4000);
    return () => clearTimeout(timer);
  };

  const handleShare = async () => {
    if (!storyUrl) return;
    try {
        await navigator.clipboard.writeText(storyUrl);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 3000);
    } catch (e) {
        console.error("Family uplink node failed:", e);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setTargetLanguage(lang);
    if (lang === 'English') return;

    setIsTranslating(true);
    try {
        const currentBeatText = storyBeats[currentBeatIndex]?.narrative_chunk;
        if (currentBeatText) {
            const translation = await translateContent(currentBeatText, lang);
            setTranslatedNarrative(prev => ({ ...prev, [currentBeatIndex]: translation }));
        }
    } catch (e) {
        console.error("Translation failure");
    } finally {
        setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (phase === 'journey' && storyBeats.length > 0) {
      if (currentBeatIndex < storyBeats.length) {
        const timer = setTimeout(() => {
          if ((currentBeatIndex + 1) % 3 === 0 && currentBeatIndex < storyBeats.length - 1) {
              setPhase('whisper');
          } else if (currentBeatIndex === storyBeats.length - 1) {
            setPhase('finale');
          } else {
            setCurrentBeatIndex(prev => prev + 1);
          }
        }, 8500); 
        return () => clearTimeout(timer);
      }
    } else if (phase === 'whisper') {
        const timer = setTimeout(() => {
            setPhase('journey');
            setCurrentBeatIndex(prev => prev + 1);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [phase, currentBeatIndex, storyBeats.length]);

  const currentBeat = storyBeats[currentBeatIndex] || null;
  const currentImage = useMemo(() => {
    if (!story?.generatedImages || story.generatedImages.length === 0) return null;
    return story.generatedImages.find(img => img.index === currentBeatIndex) || story.generatedImages[0];
  }, [story?.generatedImages, currentBeatIndex]);

  const displayNarrative = useMemo(() => {
    if (targetLanguage === 'English') return currentBeat?.narrative_chunk;
    return translatedNarrative[currentBeatIndex] || currentBeat?.narrative_chunk;
  }, [currentBeatIndex, translatedNarrative, targetLanguage, currentBeat]);

  if (phase === 'gate') {
      return (
        <div className="fixed inset-0 bg-black z-[600] flex flex-col items-center justify-center p-12 text-center animate-fade-in cursor-pointer" onClick={handleGateEntry}>
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-gemynd-oxblood/30 blur-3xl rounded-full animate-pulse" />
                <img 
                    src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
                    className="w-24 relative z-10 opacity-80" 
                    alt="Logo"
                />
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-black text-white/90 mb-4 tracking-tighter drop-shadow-2xl">
              {story.storytellerName}'s Legacy
            </h2>
            <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.8em] animate-pulse">
              Tap to enter the journey
            </p>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black z-[300] overflow-hidden flex flex-col font-sans select-none animate-fade-in">
      <audio ref={audioRef} src={ambientTrack} loop />
      
      <style>{`
        @keyframes ken-burns {
          0% { transform: scale(1) translate(0,0); }
          100% { transform: scale(1.15) translate(-1%, -1%); }
        }
        .animate-ken-burns { animation: ken-burns 15s ease-out forwards; }
        
        @keyframes text-float {
          0% { opacity: 0; transform: translateY(20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-text-float { animation: text-float 8.5s ease-in-out forwards; }
      `}</style>

      {/* Hero Background Layer */}
      <div className="absolute inset-0 z-0 bg-black">
        {currentImage && currentImage.image_url && (
          <div key={currentBeatIndex} className="absolute inset-0 animate-fade-in">
            <img 
              src={currentImage.image_url} 
              className={`w-full h-full object-cover animate-ken-burns brightness-[0.4] transition-all duration-[3s] ${phase === 'whisper' ? 'scale-110 blur-sm brightness-[0.2]' : ''}`} 
              alt="Scene" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60"></div>
          </div>
        )}
      </div>

      {/* Multilingual Selector */}
      {hasStarted && phase === 'journey' && (
        <div className="absolute top-8 left-8 z-[350] flex items-center gap-4 animate-fade-in">
            <div className="flex bg-black/40 backdrop-blur-md rounded-full border border-white/10 p-1">
                {['English', 'Spanish', 'Mandarin'].map(lang => (
                    <button 
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${targetLanguage === lang ? 'bg-gemynd-agedGold text-black' : 'text-white/40 hover:text-white'}`}
                    >
                        {lang === 'Mandarin' ? '中文' : lang}
                    </button>
                ))}
            </div>
            {isTranslating && (
                <div className="flex items-center gap-2 text-gemynd-agedGold animate-pulse">
                    <GlobeAmericasIcon className="w-4 h-4 animate-spin" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Translating...</span>
                </div>
            )}
        </div>
      )}

      {/* Phase Renderers */}
      {phase === 'title' && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 animate-fade-in">
          <img 
            src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
            className="w-16 mb-12 opacity-80" 
            alt="Logo" 
          />
          <h1 className="text-6xl lg:text-9xl font-display font-black text-white tracking-tighter leading-none mb-6">
            The Legacy of <br/>
            <span className="text-gemynd-agedGold">{story.storytellerName}</span>
          </h1>
          <div className="w-24 h-0.5 bg-white/10 mx-auto mb-12"></div>
          
          {!hasStarted && (
              <button 
                onClick={handleStart}
                className="px-12 py-5 bg-white text-black font-black rounded-full text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 haptic-tap"
              >
                  <SparklesIcon className="w-4 h-4" />
                  Reveal the Archive
              </button>
          )}
        </div>
      )}

      {phase === 'journey' && currentBeat && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-10 lg:px-40">
          <div key={currentBeatIndex} className="max-w-5xl space-y-10 animate-text-float">
            <h2 className="text-5xl lg:text-7xl font-display font-black text-white tracking-tighter drop-shadow-2xl">
              {currentBeat.beat_title}
            </h2>
            <p className="text-2xl lg:text-5xl font-serif italic text-white/90 leading-relaxed drop-shadow-xl">
              "{displayNarrative}"
            </p>
          </div>
        </div>
      )}

      {phase === 'whisper' && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-10 lg:px-40 animate-fade-in">
           <p className="text-3xl lg:text-5xl font-serif italic text-white/40 leading-relaxed max-w-4xl drop-shadow-2xl">
              "{evocativeNarrations[Math.floor(currentBeatIndex / 3) % evocativeNarrations.length]}"
           </p>
        </div>
      )}

      {phase === 'finale' && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 animate-fade-in">
          <div className="mb-16">
            <div className="w-24 h-24 bg-gemynd-agedGold/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-gemynd-agedGold/30 shadow-2xl">
              <SparklesIcon className="w-12 h-12 text-gemynd-agedGold" />
            </div>
            <h2 className="text-6xl lg:text-9xl font-display font-black text-white mb-4 tracking-tighter">
              Legacy Secured.
            </h2>
            <p className="text-xl font-serif italic text-white/40">Secure archive materialised at the Lexington Node.</p>
          </div>

          <div className="space-y-4 w-full max-w-md relative">
            <button 
              onClick={handleShare}
              className={`w-full py-7 rounded-full font-black text-[11px] uppercase tracking-[0.5em] transition-all transform active:scale-95 flex items-center justify-center gap-4 shadow-2xl ${
                isShared 
                ? 'bg-green-600 text-white shadow-green-900/40' 
                : 'bg-gemynd-agedGold text-black'
              }`}
            >
              {isShared ? 'Link Secured ✨' : 'Share with Family'}
            </button>
            
            <button 
              onClick={() => setIsStorybookOpen(true)}
              className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-full transition-all text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 haptic-tap"
            >
              <BookOpenIcon className="w-4 h-4" />
              Read Full Manuscript
            </button>

            <button 
                onClick={onRestart}
                className="mt-12 py-2 text-[9px] font-black uppercase text-white/20 tracking-[0.4em] hover:text-white transition-colors"
            >
                End Scribe Session
            </button>
          </div>
        </div>
      )}

      {/* Progress Rail */}
      {hasStarted && (phase === 'journey' || phase === 'whisper') && (
        <div className="absolute bottom-16 left-20 right-20 flex gap-3 h-1 z-20">
          {storyBeats.map((_, i) => (
            <div 
              key={i} 
              className={`h-full flex-1 rounded-full transition-all duration-[8500ms] ${
                i < currentBeatIndex ? 'bg-gemynd-agedGold/40' : 
                i === currentBeatIndex ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/5'
              }`}
            />
          ))}
        </div>
      )}

      {isStorybookOpen && (
          <StorybookViewer 
            isOpen={isStorybookOpen} 
            onClose={() => setIsStorybookOpen(false)} 
            story={story as any} 
          />
      )}
    </div>
  );
};

export default CinematicReveal;