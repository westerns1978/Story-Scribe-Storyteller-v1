import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveStory } from '../types';
import { findMusicFromSuggestion, toneToMusicQuery } from '../services/musicService';
import { narrateText, playAudioBuffer } from '../services/narrationService';

interface CinematicRevealProps {
  story: ActiveStory;
  onRestart: () => void;
  onShare?: () => void;
  onViewShelf?: () => void;
  onComplete?: () => void;
  narratorVoice?: 'Kore' | 'Fenrir';
}

// ── Derive music query from story tone/mood via musicService ──────────────────
function getMusicQueryForStory(story: ActiveStory): string {
  const tone = (story.extraction?.emotional_journey?.overall_tone || '').toLowerCase();
  const mq   = ((story as any).musicQuery || '').toLowerCase();
  return toneToMusicQuery(tone || mq || 'nostalgic');
}



// ── Ken Burns — randomized origin per image for authentic documentary feel ────
const KB_ORIGINS = [
  'center center', 'top left', 'top right', 'bottom left', 'bottom right',
  'center top', 'center bottom', '30% 40%', '70% 30%', '40% 70%',
];

function getKBOrigin(index: number): string {
  return KB_ORIGINS[index % KB_ORIGINS.length];
}



// ── Build scenes from story data ───────────────────────────────────────────────
interface Scene {
  image: string;
  caption: string;
  narration: string;
  beatTitle: string;
  anchorPhoto?: { url: string; era?: string; caption?: string };
}

function buildScenes(story: ActiveStory): Scene[] {
  const beats = story.storyboard?.story_beats || [];
  const images = story.generatedImages || [];
  const realPhotos = (story as any).realAnchorPhotos || [];

  const storyBeats = beats.map((beat: any, i: number) => {
    const img = images.find((im: any) => im.index === i || im.image_index === i)
      || images[i];
    // Use real uploaded photo as anchor if cascade assigned one, or attach first real photo
    const anchorPhoto = beat.anchor_photo || (realPhotos[0] ? {
      url: realPhotos[0].public_url,
      caption: `The Real ${(story as any).storytellerName || 'Subject'}`,
    } : null);
    return {
      image: img?.image_url || '',
      caption: beat.beat_title || `Chapter ${i + 1}`,
      narration: beat.narrative_chunk || '',
      beatTitle: beat.beat_title || '',
      anchorPhoto,
    };
  }).filter(s => s.narration);

  // Prepend real photo opening scene if we have one
  if (realPhotos.length > 0 && realPhotos[0].public_url) {
    const name = (story as any).storytellerName || 'them';
    const openingScene: Scene = {
      image: realPhotos[0].public_url,
      caption: `The Real ${name}`,
      narration: `This is ${name}. Before the story — the real face, the real smile. Everything that follows is their legacy.`,
      beatTitle: `The Real ${name}`,
      anchorPhoto: null,
    };
    return [openingScene, ...storyBeats];
  }

  return storyBeats;
}

// ── Main component ─────────────────────────────────────────────────────────────
const CinematicReveal: React.FC<CinematicRevealProps> = ({
  story, onRestart, narratorVoice = 'Kore', onShare, onViewShelf, onComplete,
}) => {
  const scenes = buildScenes(story);
  const totalScenes = Math.max(scenes.length, 1);

  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [narrationReady, setNarrationReady] = useState(false);
  const [loadingNarration, setLoadingNarration] = useState(false);
  const [preparingScene, setPreparingScene] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [showNarrationText, setShowNarrationText] = useState(false);
  const narrationTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [musicPaused, setMusicPaused] = useState(false);
  const [availableTracks, setAvailableTracks] = useState<{ url: string; title?: string }[]>([]);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Active narration source — kept so we can stop it on pause/skip
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioCtxRef = useRef<AudioContext | null>(null);
  const pausedAtRef = useRef<number>(0);
  const sceneStartTimeRef = useRef<number>(0);

  // Show narration text as soon as scene starts playing, hide when scene advances
  // Text stays visible for the full duration of narration — no hard timer cutoff
  useEffect(() => {
    if (!isPlaying) { setShowNarrationText(false); return; }
    setShowNarrationText(false);
    if (narrationTextTimerRef.current) clearTimeout(narrationTextTimerRef.current);
    // Fade in after 0.6s — gives Ken Burns animation a moment to settle
    narrationTextTimerRef.current = setTimeout(() => setShowNarrationText(true), 600);
    return () => { if (narrationTextTimerRef.current) clearTimeout(narrationTextTimerRef.current); };
  }, [currentScene, isPlaying]);

  // Music URL fetched async from musicService on mount — stored in ref
  const musicUrlRef = useRef<string>('');
  useEffect(() => {
    // Pre-fetch music URL via musicService (Kevin MacLeod curated tracks, no API key)
    const query = getMusicQueryForStory(story);
    findMusicFromSuggestion(query).then(tracks => {
      if (tracks.length > 0) {
        musicUrlRef.current = tracks[0].url;
        setAvailableTracks(tracks.slice(0, 5)); // keep up to 5 tracks for selection
      }
    }).catch(() => { /* silent — music is non-critical */ });
    // Clean up audio when story changes
    if (musicRef.current) { musicRef.current.pause(); musicRef.current.src = ''; musicRef.current = null; }
  }, [story]);

  const fadeMusic = useCallback((targetVol: number, ms = 1500) => {
    if (!musicRef.current) return;
    const audio = musicRef.current;
    // Scale target by user's chosen volume — never exceed their preference
    const scaledTarget = targetVol * musicVolume / 0.25;
    const clampedTarget = Math.max(0, Math.min(musicVolume, scaledTarget));
    const startVol = audio.volume;
    const step = (clampedTarget - startVol) / (ms / 50);
    const interval = setInterval(() => {
      audio.volume = Math.max(0, Math.min(1, audio.volume + step));
      if (Math.abs(audio.volume - clampedTarget) < 0.02) {
        audio.volume = clampedTarget;
        clearInterval(interval);
      }
    }, 50);
  }, [musicVolume]);

  // Handle user volume changes
  const handleVolumeChange = useCallback((vol: number) => {
    setMusicVolume(vol);
    if (musicRef.current) musicRef.current.volume = vol;
  }, []);

  // Handle user pause/resume of music
  const handleMusicToggle = useCallback(() => {
    if (!musicRef.current) return;
    if (musicPaused) {
      musicRef.current.play().catch(() => {});
      setMusicPaused(false);
    } else {
      musicRef.current.pause();
      setMusicPaused(true);
    }
  }, [musicPaused]);

  // Switch to a different track
  const handleTrackChange = useCallback((idx: number) => {
    if (!availableTracks[idx]) return;
    setCurrentTrackIdx(idx);
    musicUrlRef.current = availableTracks[idx].url;
    if (musicRef.current) {
      const wasPlaying = !musicRef.current.paused;
      const vol = musicRef.current.volume;
      musicRef.current.pause();
      musicRef.current.src = availableTracks[idx].url;
      musicRef.current.volume = vol;
      if (wasPlaying) musicRef.current.play().catch(() => {});
    }
    setShowMusicPanel(false);
  }, [availableTracks]);

  // narrationCache now stores { audioBuffer, audioContext } objects
  const narrationCache = useRef<Record<number, { audioBuffer: AudioBuffer; audioContext: AudioContext }>>({});

  const fetchNarration = useCallback(async (sceneIdx: number): Promise<{ audioBuffer: AudioBuffer; audioContext: AudioContext } | null> => {
    // Check in-memory cache first
    if (narrationCache.current[sceneIdx]) return narrationCache.current[sceneIdx];

    // ── CHECK PRE-BAKED BEAT AUDIO (generated at story creation time) ────────
    // Only use pre-baked audio if it matches the selected narratorVoice (Kore default)
    // Pre-baked is always generated with 'Kore' — if user picked 'Fenrir', skip and use live TTS
    const beatAudio = (story as any).beatAudio || [];
    const cached = narratorVoice === 'Kore'
      ? beatAudio.find((b: any) => b.beat_index === sceneIdx || b.beat_index === sceneIdx - 1)
      : null;
    if (cached?.audio_base64) {
      try {
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        // Convert PCM base64 to AudioBuffer
        const binary = atob(cached.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        // PCM s16le → float32
        const samples = bytes.length / 2;
        const float32 = new Float32Array(samples);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < samples; i++) {
          float32[i] = view.getInt16(i * 2, true) / 32768.0;
        }
        const audioBuffer = audioCtx.createBuffer(1, samples, 24000);
        audioBuffer.getChannelData(0).set(float32);
        const result = { audioBuffer, audioContext: audioCtx };
        narrationCache.current[sceneIdx] = result;
        console.log(`[CinematicReveal] Using pre-baked audio for scene ${sceneIdx}`);
        return result;
      } catch (e) {
        console.warn('[CinematicReveal] Pre-baked audio decode failed, falling back to live TTS:', e);
      }
    }

    // ── LIVE TTS FALLBACK ────────────────────────────────────────────────────
    const text = scenes[sceneIdx]?.narration;
    if (!text) return null;
    try {
      const result = await narrateText(text.slice(0, 800), narratorVoice);
      if (!result) return null;
      narrationCache.current[sceneIdx] = result;
      return result;
    } catch { return null; }
  }, [scenes, narratorVoice, story]);

  const playScene = useCallback(async (idx: number) => {
    if (idx >= totalScenes) {
      setAllDone(true);
      setIsPlaying(false);
      fadeMusic(0, 3000);
      if (onComplete) setTimeout(onComplete, 4000); // auto-advance to details after 4s
      return;
    }

    setCurrentScene(idx);
    setSceneProgress(0);
    setPreparingScene(false); // Scene is now showing — clear the preparing overlay
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    // ── SHOW SCENE IMMEDIATELY — don't block on TTS ─────────────────────────
    // Scene image and text appear instantly. Audio joins when ready.
    // This eliminates the 20-30s blank wait Scott and Derek experienced.

    // Kick off TTS fetch + next scene prefetch in background — non-blocking
    setLoadingNarration(true);
    const narFetch = Promise.all([
      fetchNarration(idx),
      idx + 1 < totalScenes ? fetchNarration(idx + 1) : Promise.resolve(null),
    ]).catch(() => [null, null]);

    // Give the scene a short head start to appear visually before audio
    // If TTS arrives quickly (pre-baked) it plays almost immediately
    // If it's a live API call, scene has already been showing for the wait time
    const VISUAL_HEAD_START = 600; // ms — scene shows, then audio joins
    await new Promise(r => setTimeout(r, VISUAL_HEAD_START));

    const [narResult] = await narFetch;
    setLoadingNarration(false);
    setNarrationReady(!!narResult);

    let sceneDuration = 9000; // fallback — scene shows for 9s with text if no audio

    if (narResult) {
      // Duck music, play narration
      if (musicRef.current && !musicRef.current.paused) fadeMusic(0.08, 800);
      let stopNarration: (() => void) | null = null;
      await new Promise<void>(resolve => {
        stopNarration = playAudioBuffer(narResult.audioBuffer, narResult.audioContext, {
          onEnded: resolve,
          gainValue: 1.0,
        });
        activeAudioCtxRef.current = narResult.audioContext;
        sceneStartTimeRef.current = narResult.audioContext.currentTime;
        setTimeout(resolve, 60000); // safety timeout
      });
      activeAudioCtxRef.current = null;
      if (stopNarration) { try { (stopNarration as () => void)(); } catch {} }
      if (musicRef.current && !musicRef.current.paused) fadeMusic(0.25, 1000);
      sceneDuration = 2000; // short pause after narration before next scene
    }

    // Progress bar animation
    const duration = narResult ? (narResult.audioBuffer.duration || 8) * 1000 + 2000 : sceneDuration;
    let elapsed = 0;
    const tick = 100;
    progressTimerRef.current = setInterval(() => {
      elapsed += tick;
      setSceneProgress(Math.min(100, (elapsed / duration) * 100));
    }, tick);

    sceneTimerRef.current = setTimeout(() => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      playScene(idx + 1);
    }, sceneDuration);

  }, [totalScenes, fetchNarration, fadeMusic]);

  const handlePlay = useCallback(async () => {
    setIsPlaying(true);
    setIsPaused(false);
    setShowControls(false);
    setPreparingScene(false); // Start immediately — don't block on TTS

    // Attempt background music via musicService — failure is completely silent
    (async () => {
      try {
        if (!musicUrlRef.current) {
          const query = getMusicQueryForStory(story);
          const tracks = await findMusicFromSuggestion(query);
          if (tracks[0]?.url) musicUrlRef.current = tracks[0].url;
        }
        if (musicUrlRef.current && !musicRef.current) {
          const audio = new Audio(musicUrlRef.current);
          audio.loop = true;
          audio.volume = 0;
          audio.preload = 'auto';
          musicRef.current = audio;
          await audio.play();
          fadeMusic(0.25, 2000);
        }
      } catch (e) {
        console.warn('[CinematicReveal] Background music unavailable (silent):', e);
      }
    })();

    // Start narration immediately — does NOT wait for music
    playScene(0);
  }, [playScene, fadeMusic, story]);

  const handlePause = useCallback(() => {
    if (!isPlaying || isPaused) return;
    // Suspend active audio context
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.suspend(); } catch {}
    }
    // Pause music
    if (musicRef.current) musicRef.current.pause();
    // Pause scene timer
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPaused(true);
    setShowControls(true);
  }, [isPlaying, isPaused]);

  const handleResume = useCallback(() => {
    if (!isPlaying || !isPaused) return;
    // Resume audio context
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.resume(); } catch {}
    }
    // Resume music
    if (musicRef.current) musicRef.current.play().catch(() => {});
    setIsPaused(false);
  }, [isPlaying, isPaused]);

  const handleStop = useCallback(() => {
    // Stop narration
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.close(); } catch {}
      activeAudioCtxRef.current = null;
    }
    // Stop music
    if (musicRef.current) { musicRef.current.pause(); musicRef.current.src = ''; musicRef.current = null; }
    // Clear timers
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentScene(0);
    setSceneProgress(0);
    setAllDone(false);
    setShowControls(true);
  }, []);

  const handleSkipNext = useCallback(() => {
    if (!isPlaying) return;
    // Stop current narration and advance
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.close(); } catch {}
      activeAudioCtxRef.current = null;
    }
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPaused(false);
    playScene(currentScene + 1);
  }, [isPlaying, currentScene, playScene]);

  const handleSkipPrev = useCallback(() => {
    if (!isPlaying || currentScene === 0) return;
    if (activeAudioCtxRef.current) {
      try { activeAudioCtxRef.current.close(); } catch {}
      activeAudioCtxRef.current = null;
    }
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPaused(false);
    playScene(currentScene - 1);
  }, [isPlaying, currentScene, playScene]);

  // Auto-hide controls after 3s of playing
  useEffect(() => {
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [isPlaying, currentScene]);

  useEffect(() => {
    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      musicRef.current?.pause();
    };
  }, []);

  const scene = scenes[currentScene] || { image: '', caption: story.storytellerName, narration: '', beatTitle: '' };
  const kbOrigin = getKBOrigin(currentScene);
  const storytellerName = story.storytellerName || 'A Life Well Lived';

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="h-full w-full bg-[#0D0B0A] flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,46,59,0.15)_0%,transparent_70%)]" />
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          <div className="text-6xl">🕯️</div>
          <h2 className="text-4xl font-display font-black text-white tracking-tight">
            The story of <span className="text-heritage-warmGold">{storytellerName}</span>
          </h2>
          <p className="text-white/50 font-serif italic text-lg">Preserved forever in the Gemynd Archive.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setAllDone(false); setCurrentScene(0); setIsPlaying(false); }}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-full text-xs uppercase tracking-[0.3em] transition-all"
            >
              Watch Again
            </button>
            <button
              onClick={onRestart}
              className="px-8 py-4 bg-heritage-burgundy text-white font-black rounded-full shadow-xl text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all"
            >
              Preserve Another Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full relative overflow-hidden bg-black"
      onClick={() => { if (isPlaying) setShowControls(p => !p); }}
    >
      {/* ── Ken Burns image layer ─────────────────────────────────────────────── */}
      {scene.image ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            key={`${currentScene}-img`}
            src={scene.image}
            alt={scene.caption}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transformOrigin: kbOrigin,
              animation: 'kenBurns 12s ease-out forwards',
            }}
          />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
          {/* Bottom gradient for text */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          {/* Film grain */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px',
          }} />
          {/* Letterbox bars */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-black" />
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-black" />
          {/* ── Real photo anchor inset ────────────────────────────────────── */}
          {scene.anchorPhoto?.url && (
            <div className="absolute z-20" style={{ bottom: 52, right: 14 }}>
              <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.18em',
                color: 'rgba(196,151,59,0.85)', fontFamily: 'system-ui',
                textTransform: 'uppercase', textAlign: 'right', marginBottom: 4 }}>
                {scene.anchorPhoto.caption || `The Real ${story.storytellerName}`}
              </div>
              <div style={{ width: 88, height: 88, borderRadius: 8, overflow: 'hidden',
                border: '1.5px solid rgba(196,151,59,0.55)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.75)' }}>
                <img src={scene.anchorPhoto.url} alt="Real photo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              {scene.anchorPhoto.era && (
                <div style={{ fontSize: 7, color: 'rgba(245,236,215,0.35)',
                  fontFamily: 'system-ui', letterSpacing: '.1em', textAlign: 'right', marginTop: 3 }}>
                  {scene.anchorPhoto.era}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Fallback: rich dark background with ambient glow
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #2C1F0E 0%, #0D0B0A 100%)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-heritage-warmGold/10 font-display font-black text-[12vw] text-center leading-none px-8">
              {storytellerName}
            </div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-12 bg-black" />
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-black" />
        </div>
      )}

      {/* ── Progress rail ─────────────────────────────────────────────────────── */}
      <div className="absolute top-12 left-0 right-0 z-30 px-4 flex gap-1">
        {scenes.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-none rounded-full"
              style={{
                width: i < currentScene ? '100%' : i === currentScene ? `${sceneProgress}%` : '0%',
                transition: i === currentScene ? 'none' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Scene info overlay ────────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-10 z-20 px-8 pb-6 space-y-4 transition-opacity duration-500"
        style={{ opacity: isPlaying ? (showControls ? 1 : 0) : 1 }}
      >
        {/* Beat title */}
        {scene.beatTitle && isPlaying && (
          <div key={`${currentScene}-title`} className="animate-fade-in">
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-heritage-warmGold/70">
              {scene.beatTitle}
            </span>
          </div>
        )}

        {/* Narrative text — fades in then fades out */}
        {scene.narration && isPlaying && (
          <div
            key={`${currentScene}-narration`}
            className="max-w-2xl transition-all duration-700"
            style={{
              opacity: showNarrationText ? 1 : 0,
              transform: showNarrationText ? 'translateY(0)' : 'translateY(8px)',
            }}
          >
            <p
              className="text-sm lg:text-base font-serif italic leading-relaxed"
              style={{
                color: 'rgba(255,255,255,0.92)',
                textShadow: '0 1px 20px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)',
                lineHeight: 1.75,
              }}
            >
              {scene.narration}
            </p>
          </div>
        )}

        {/* Name */}
        <h2 className="text-2xl lg:text-3xl font-display font-black text-white leading-tight tracking-tight"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          {storytellerName}
        </h2>

        {/* Playback controls — shown while playing */}
        {isPlaying && (
          <div className="flex flex-col items-center gap-3">
            {/* Scene counter + loading */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">
                {currentScene + 1} / {totalScenes}
              </span>
              {loadingNarration && (
                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest animate-pulse">
                  · preparing…
                </span>
              )}
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-4">
              {/* Skip prev */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSkipPrev(); }}
                disabled={currentScene === 0}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: currentScene === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                  fontSize: 14, cursor: currentScene === 0 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >⏮</button>

              {/* Pause / Resume */}
              <button
                onClick={(e) => { e.stopPropagation(); isPaused ? handleResume() : handlePause(); }}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(196,151,59,0.15)',
                  border: '1px solid rgba(196,151,59,0.4)',
                  color: 'rgba(196,151,59,0.9)',
                  fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{isPaused ? '▶' : '⏸'}</button>

              {/* Skip next */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSkipNext(); }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >⏭</button>

              {/* Stop */}
              <button
                onClick={(e) => { e.stopPropagation(); handleStop(); }}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 11, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >■</button>
            </div>
          </div>
        )}

        {/* Play button (pre-play state) */}
        {!isPlaying && !preparingScene && (
          <div className="pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); handlePlay(); }}
              className="flex items-center gap-4 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-full hover:bg-white/20 active:scale-95 transition-all text-xs uppercase tracking-[0.3em]"
            >
              <span className="text-xl">▶</span>
              Watch {storytellerName}'s Story
            </button>
            <p className="text-white/30 text-[9px] mt-3 font-serif italic">
              {narratorVoice === 'Fenrir' ? '🎙️ His voice narrates' : '🎙️ Her voice narrates'} · 
              {' '}{scenes.length} chapters
            </p>
          </div>
        )}

        {/* Preparing overlay — shown during TTS fetch before first scene */}
        {preparingScene && (
          <div className="pt-2 animate-fade-in">
            <div className="flex items-center gap-4 px-8 py-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
              {/* Pulsing dots */}
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map(delay => (
                  <div
                    key={delay}
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'rgba(196,151,59,0.8)',
                      animation: `dotPulse 1.2s ease-in-out ${delay}ms infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">
                Preparing {storytellerName}'s story…
              </span>
            </div>
            <p className="text-white/25 text-[9px] mt-3 font-serif italic text-center">
              Generating voice narration — just a moment
            </p>
          </div>
        )}
      </div>

      {/* ── Music controls ────────────────────────────────────────────────────── */}
      {isPlaying && (
        <div
          className="absolute top-14 left-4 z-30 flex items-center gap-2 transition-opacity duration-500"
          style={{ opacity: showControls ? 1 : 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Music toggle */}
          <button
            onClick={handleMusicToggle}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={musicPaused ? 'Resume music' : 'Pause music'}
          >{musicPaused ? '♪' : '⏸'}</button>

          {/* Volume slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>🔈</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={musicVolume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              style={{ width: 72, accentColor: 'rgba(196,151,59,0.8)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>🔊</span>
          </div>

          {/* Track selector */}
          {availableTracks.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMusicPanel(p => !p)}
                style={{
                  padding: '4px 10px', borderRadius: 12,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(196,151,59,0.8)',
                  fontSize: 9, cursor: 'pointer',
                  fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >♫ Tracks</button>
              {showMusicPanel && (
                <div style={{
                  position: 'absolute', top: 38, left: 0,
                  background: 'rgba(10,8,12,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: 8, minWidth: 180,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {availableTracks.map((track, i) => (
                    <button
                      key={i}
                      onClick={() => handleTrackChange(i)}
                      style={{
                        padding: '7px 12px', borderRadius: 4, border: 'none',
                        background: i === currentTrackIdx ? 'rgba(196,151,59,0.2)' : 'transparent',
                        color: i === currentTrackIdx ? 'rgba(196,151,59,0.9)' : 'rgba(255,255,255,0.6)',
                        fontSize: 11, cursor: 'pointer', textAlign: 'left',
                        fontStyle: 'italic',
                      }}
                    >
                      {i === currentTrackIdx ? '▶ ' : '   '}{track.title || `Track ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Top controls (always visible on hover) ────────────────────────────── */}
      <div
        className="absolute top-14 right-4 z-30 flex gap-2 transition-opacity duration-500"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {onViewShelf && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewShelf(); }}
            className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white/60 hover:text-white border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors"
          >
            📚 All Stories
          </button>
        )}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="px-4 py-2 bg-heritage-burgundy/80 backdrop-blur-sm text-white hover:bg-heritage-burgundy border border-heritage-burgundy/40 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors"
          >
            ↗ Share
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRestart(); }}
          className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white/60 hover:text-white border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors"
        >
          ✕ Exit
        </button>
      </div>

      {/* Ken Burns CSS animation */}
      <style>{`
        @keyframes kenBurns {
          0% { transform: scale(1.0); }
          100% { transform: scale(1.25); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeInUp 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CinematicReveal;