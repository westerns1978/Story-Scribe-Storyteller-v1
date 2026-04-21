import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveStory } from '../types';
import { BRAND, isWissums } from '../utils/brandUtils';
import { formatDisplayNameOrDefault } from '../utils/nameUtils';
import { findMusicFromSuggestion, toneToMusicQuery } from '../services/musicService';
import { narrateText, playAudioBuffer, stopAllAudio, getNarrationFailureStreak, getLastNarrationFailure } from '../services/narrationService';

interface CinematicRevealProps {
  story: ActiveStory;
  onRestart: () => void;
  onShare?: () => void;
  onViewShelf?: () => void;
  onComplete?: () => void;
  narratorVoice?: string;
  autoPlay?: boolean;
  /** Skip tap-to-start entirely and begin playback automatically after mount. */
  autoStart?: boolean;
}

function getMusicQueryForStory(story: ActiveStory): string {
  const tone = (story.extraction?.emotional_journey?.overall_tone || '').toLowerCase();
  const mq   = ((story as any).musicQuery || '').toLowerCase();
  return toneToMusicQuery(tone || mq || 'nostalgic');
}

const KB_ORIGINS = [
  'center center', 'top left', 'top right', 'bottom left', 'bottom right',
  'center top', 'center bottom', '30% 40%', '70% 30%', '40% 70%',
];

function getKBOrigin(index: number): string {
  return KB_ORIGINS[index % KB_ORIGINS.length];
}

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
  // One canonical display form for every scene/caption derived from the name.
  const displayName = formatDisplayNameOrDefault((story as any).storytellerName, 'Subject');

  const storyBeats = beats.map((beat: any, i: number) => {
    const img = images.find((im: any) => im.index === i || im.image_index === i) || images[i];
    const anchorPhoto = beat.anchor_photo || (realPhotos[0] ? {
      url: realPhotos[0].public_url,
      caption: `The Real ${displayName}`,
    } : null);
    return {
      image: img?.image_url || '',
      caption: beat.beat_title || `Chapter ${i + 1}`,
      narration: beat.narrative_chunk || '',
      beatTitle: beat.beat_title || '',
      anchorPhoto,
    };
  }).filter(s => s.narration);

  if (realPhotos.length > 0 && realPhotos[0].public_url) {
    const openingScene: Scene = {
      image: realPhotos[0].public_url,
      caption: `The Real ${displayName}`,
      narration: `This is ${displayName}. Before the story — the real face, the real smile. Everything that follows is their legacy.`,
      beatTitle: `The Real ${displayName}`,
      anchorPhoto: null,
    };
    return [openingScene, ...storyBeats];
  }

  return storyBeats;
}

const CinematicReveal: React.FC<CinematicRevealProps> = ({
  story, onRestart, narratorVoice = 'Aoede', onShare, onViewShelf, onComplete,
  autoPlay = false, autoStart = false,
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
  // When autoStart is true we skip the tap overlay entirely
  const [showTapOverlay, setShowTapOverlay] = useState(autoPlay && !autoStart);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [musicPaused, setMusicPaused] = useState(false);
  // Audio state for the top-left speaker indicator + failure banner
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'failed'>('idle');
  const [showAudioFailBanner, setShowAudioFailBanner] = useState(false);
  // Latched once we've confirmed narration is down for multiple scenes in a row
  // (quota, billing cap, model deprecation, etc.). Swaps the tap-to-retry banner
  // for a passive "Narration unavailable" indicator since retrying won't help.
  const [narrationUnavailable, setNarrationUnavailable] = useState(false);
  const [narrationFailKind, setNarrationFailKind] = useState<string>('');
  const audioStartedRef = useRef(false);
  const audioFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "Preparing {Name}'s story..." bridge between tap-to-begin and scene 0
  const [showPreparingBridge, setShowPreparingBridge] = useState(false);

  const narrationTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAudioCtxRef = useRef<AudioContext | null>(null);
  const isStartingRef = useRef(false);
  const sceneStartTimeRef = useRef<number>(0);
  const musicUrlRef = useRef<string>('');
  const narrationCache = useRef<Record<number, { audioBuffer: AudioBuffer; audioContext: AudioContext }>>({});

  useEffect(() => {
    if (!isPlaying) { setShowNarrationText(false); return; }
    setShowNarrationText(false);
    if (narrationTextTimerRef.current) clearTimeout(narrationTextTimerRef.current);
    narrationTextTimerRef.current = setTimeout(() => setShowNarrationText(true), 600);
    return () => { if (narrationTextTimerRef.current) clearTimeout(narrationTextTimerRef.current); };
  }, [currentScene, isPlaying]);

  useEffect(() => {
    // Preload music URL + <audio> element on mount so autostart has zero cold-start delay.
    const query = getMusicQueryForStory(story);
    findMusicFromSuggestion(query).then(tracks => {
      if (tracks[0]?.url) {
        musicUrlRef.current = tracks[0].url;
        // Eagerly construct the audio element so the network fetch begins NOW,
        // long before the user (or autostart timer) calls handlePlay.
        if (!musicRef.current) {
          try {
            const audio = new Audio(tracks[0].url);
            audio.loop = true;
            audio.volume = 0;
            audio.preload = 'auto';
            musicRef.current = audio;
          } catch {}
        }
      }
    }).catch(() => {});
    return () => {
      if (musicRef.current) { try { musicRef.current.pause(); } catch {} musicRef.current.src = ''; musicRef.current = null; }
    };
  }, [story]);

  const fadeMusic = useCallback((targetVol: number, ms = 1500) => {
    if (!musicRef.current) return;
    const audio = musicRef.current;
    const scaledTarget = Math.min(musicVolume, targetVol);
    const startVol = audio.volume;
    const step = (scaledTarget - startVol) / (ms / 50);
    const interval = setInterval(() => {
      audio.volume = Math.max(0, Math.min(1, audio.volume + step));
      if (Math.abs(audio.volume - scaledTarget) < 0.02) { audio.volume = scaledTarget; clearInterval(interval); }
    }, 50);
  }, [musicVolume]);

  const handleVolumeChange = useCallback((vol: number) => {
    setMusicVolume(vol);
    if (musicRef.current) musicRef.current.volume = vol;
  }, []);

  const handleMusicToggle = useCallback(() => {
    if (!musicRef.current) return;
    if (musicPaused) { musicRef.current.play().catch(() => {}); setMusicPaused(false); }
    else { musicRef.current.pause(); setMusicPaused(true); }
  }, [musicPaused]);

  const fetchNarration = useCallback(async (sceneIdx: number): Promise<{ audioBuffer: AudioBuffer; audioContext: AudioContext } | null> => {
    if (narrationCache.current[sceneIdx]) return narrationCache.current[sceneIdx];

    // ── Check narration_audio from Supabase (pre-generated by edge function) ──
    const narrationAudio = (story as any).narration_audio || [];
    const preGenerated = narrationAudio.find((n: any) => n.beat_index === sceneIdx);
    if (preGenerated?.audio_base64) {
      try {
        console.log(`[CinematicReveal] Using pre-generated narration for scene ${sceneIdx}`);
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const binary = atob(preGenerated.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const samples = bytes.length / 2;
        const float32 = new Float32Array(samples);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < samples; i++) float32[i] = view.getInt16(i * 2, true) / 32768.0;
        const audioBuffer = audioCtx.createBuffer(1, samples, 24000);
        audioBuffer.getChannelData(0).set(float32);
        const result = { audioBuffer, audioContext: audioCtx };
        narrationCache.current[sceneIdx] = result;
        return result;
      } catch (e) { console.warn('[CinematicReveal] Pre-generated narration decode failed:', e); }
    }

    // ── Fallback: check beatAudio (inline from story creation) ──
    const beatAudio = (story as any).beatAudio || [];
    const cached = beatAudio.find((b: any) => b.beat_index === sceneIdx || b.beat_index === sceneIdx - 1);
    if (cached?.audio_base64) {
      try {
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const binary = atob(cached.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const samples = bytes.length / 2;
        const float32 = new Float32Array(samples);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < samples; i++) float32[i] = view.getInt16(i * 2, true) / 32768.0;
        const audioBuffer = audioCtx.createBuffer(1, samples, 24000);
        audioBuffer.getChannelData(0).set(float32);
        const result = { audioBuffer, audioContext: audioCtx };
        narrationCache.current[sceneIdx] = result;
        return result;
      } catch (e) { console.warn('[CinematicReveal] Pre-baked audio decode failed:', e); }
    }
    const text = scenes[sceneIdx]?.narration;
    if (!text) return null;
    // ── Circuit breaker ──────────────────────────────────────────────────
    // If narrateText has failed 2+ times in a row, the edge function is
    // almost certainly capped/down. Stop piling on calls that will just
    // return 502 and burn quota — short-circuit and return null so the
    // scene advances silently under the "Narration unavailable" pill.
    // The streak resets to 0 on the first successful call, so this
    // naturally lifts as soon as the service recovers.
    if (getNarrationFailureStreak() >= 2) {
      const last = getLastNarrationFailure();
      console.warn(
        `[CinematicReveal] Skipping fetchNarration(${sceneIdx}) — circuit breaker open (streak=${getNarrationFailureStreak()}, lastKind=${last?.kind || 'n/a'})`
      );
      return null;
    }
    try {
      const result = await narrateText(text.slice(0, 800), narratorVoice);
      if (!result) return null;
      narrationCache.current[sceneIdx] = result;
      return result;
    } catch { return null; }
  }, [scenes, narratorVoice, story]);

  // ── Pre-fetch narration for scenes 0 and 1 on mount ──────────────────────
  // Eliminates the 20-30s startup delay when user clicks play
  const scenesReady = scenes.length > 0;
  useEffect(() => {
    if (!scenesReady) return;
    console.log('[CinematicReveal] Pre-fetching scene 0 narration...');
    fetchNarration(0).then(result => {
      console.log('[CinematicReveal] Scene 0 narration pre-fetch', result ? 'CACHED ✓' : 'FAILED ✗');
    }).catch(() => {
      console.log('[CinematicReveal] Scene 0 narration pre-fetch FAILED ✗');
    });
    if (scenes.length > 1) {
      console.log('[CinematicReveal] Pre-fetching scene 1 narration...');
      fetchNarration(1).then(result => {
        console.log('[CinematicReveal] Scene 1 narration pre-fetch', result ? 'CACHED ✓' : 'FAILED ✗');
      }).catch(() => {
        console.log('[CinematicReveal] Scene 1 narration pre-fetch FAILED ✗');
      });
    }
  }, [scenesReady, fetchNarration]);

  const playScene = useCallback(async (idx: number) => {
    if (idx >= totalScenes) {
      setAllDone(true); setIsPlaying(false); fadeMusic(0, 3000);
      if (onComplete) setTimeout(onComplete, 4000);
      return;
    }

    // Global singleton in narrationService handles stopping previous audio
    stopAllAudio();

    setCurrentScene(idx); setSceneProgress(0); setPreparingScene(false);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    setLoadingNarration(true);
    // Fire the NEXT scene's fetch as fire-and-forget so current scene
    // playback is never gated on loading scene N+1.
    if (idx + 1 < totalScenes) { fetchNarration(idx + 1).catch(() => {}); }
    const narResult = await fetchNarration(idx).catch(() => null);
    setLoadingNarration(false);
    setNarrationReady(!!narResult);

    const MIN_SCENE_MS = 8000;
    let sceneDuration = MIN_SCENE_MS;
    if (narResult) {
      if (musicRef.current && !musicRef.current.paused) fadeMusic(0.08, 800);
      // Ensure the AudioContext is running before we schedule (safety net — the
      // gesture primer already did this, but a suspended context here would
      // silently fail). resume() is a no-op if already running.
      try { await narResult.audioContext.resume(); } catch {}
      await new Promise<void>(resolve => {
        playAudioBuffer(narResult.audioBuffer, narResult.audioContext, { onEnded: resolve, gainValue: 1.0 });
        activeAudioCtxRef.current = narResult.audioContext;
        sceneStartTimeRef.current = narResult.audioContext.currentTime;
        // Mark audio as actually playing — cancels the 5s failure timer.
        audioStartedRef.current = true;
        setAudioState('playing');
        setShowAudioFailBanner(false);
        // Narration just succeeded — clear the unavailable latch so the
        // indicator disappears. narrationService already reset its streak.
        setNarrationUnavailable(false);
        setNarrationFailKind('');
        if (audioFailTimerRef.current) { clearTimeout(audioFailTimerRef.current); audioFailTimerRef.current = null; }
        setTimeout(resolve, 60000);
      });
      activeAudioCtxRef.current = null;
      if (musicRef.current && !musicRef.current.paused) fadeMusic(0.15, 1000);
      // Ensure minimum 8s per scene even if narration is shorter
      const narDurationMs = (narResult.audioBuffer.duration || 8) * 1000;
      sceneDuration = Math.max(MIN_SCENE_MS, narDurationMs + 2000);
    } else {
      // No narration available — mark failed so the banner appears sooner.
      setAudioState('failed');
      // Check the global failure streak maintained by narrationService.
      // 2+ successive failures = service-level issue (quota/billing/model),
      // latch the "unavailable" state and suppress the tap-to-retry banner
      // since another tap won't fix it. One-off failures still show the
      // retry banner as before.
      const streak = getNarrationFailureStreak();
      if (streak >= 2) {
        setNarrationUnavailable(true);
        setShowAudioFailBanner(false);
        const last = getLastNarrationFailure();
        if (last?.kind) setNarrationFailKind(last.kind);
      } else {
        setShowAudioFailBanner(true);
      }
      if (audioFailTimerRef.current) { clearTimeout(audioFailTimerRef.current); audioFailTimerRef.current = null; }
    }

    let elapsed = 0;
    progressTimerRef.current = setInterval(() => {
      elapsed += 100;
      setSceneProgress(Math.min(100, (elapsed / sceneDuration) * 100));
    }, 100);
    sceneTimerRef.current = setTimeout(() => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      playScene(idx + 1);
    }, sceneDuration);
  }, [totalScenes, fetchNarration, fadeMusic, onComplete]);

  const handlePlay = useCallback(async () => {
    if (isStartingRef.current || isPlaying) return;
    isStartingRef.current = true;
    setIsPlaying(true); setIsPaused(false); setShowControls(false); setPreparingScene(false);
    // Audio indicator → loading. Arm a 5s timer; if still not playing, show banner.
    setAudioState('loading');
    setShowAudioFailBanner(false);
    audioStartedRef.current = false;
    if (audioFailTimerRef.current) clearTimeout(audioFailTimerRef.current);
    audioFailTimerRef.current = setTimeout(() => {
      if (!audioStartedRef.current) {
        setAudioState('failed');
        setShowAudioFailBanner(true);
      }
    }, 5000);
    // ── Music: start in parallel with narration (no await) ──
    //     The <audio> element was created on mount in the preload useEffect,
    //     so here we just fire .play() and fade in — zero cold-start cost.
    (async () => {
      try {
        // Fallback: if preload hadn't resolved yet, quickly fetch + construct now.
        if (!musicRef.current) {
          if (!musicUrlRef.current) {
            const tracks = await findMusicFromSuggestion(getMusicQueryForStory(story));
            if (tracks[0]?.url) musicUrlRef.current = tracks[0].url;
          }
          if (musicUrlRef.current) {
            const audio = new Audio(musicUrlRef.current);
            audio.loop = true; audio.volume = 0; audio.preload = 'auto';
            musicRef.current = audio;
          }
        }
        if (musicRef.current) {
          // Don't await — let music catch up to narration, they start together.
          musicRef.current.play().catch(() => {});
          // Gentle 3-second swell to 0.4 — present under narration without masking it.
          fadeMusic(0.4, 3000);
        }
      } catch (e) { console.warn('[CinematicReveal] Background music unavailable:', e); }
    })();
    // Narration: fire immediately, in parallel with music.
    playScene(0);
    isStartingRef.current = false;
  }, [playScene, fadeMusic, story, isPlaying]);

  const handleTapToStart = useCallback(() => {
    // ── CRITICAL: unlock audio SYNCHRONOUSLY on the user gesture ─────────────
    // Browsers bind the autoplay permission to the exact call-stack frame of
    // a user gesture. Anything awaited or deferred past this point loses it.
    //
    // (a) Create a fresh AudioContext right here — this one is born "running",
    //     not suspended, because it was created on the gesture.
    // (b) Resume every AudioContext already in narrationCache (those were
    //     created during the mount pre-fetch, so they're suspended). Browsers
    //     unlock ALL AudioContexts for the origin once any one is resumed on
    //     a gesture, but we call resume() on each to be explicit.
    // (c) Prime the <audio> music element: call .play() once inside the
    //     gesture so subsequent fire-and-forget .play() calls succeed.
    try {
      const primer = new AudioContext({ sampleRate: 24000 });
      // .resume() is a Promise — we don't await it, but kicking it off on the
      // gesture frame is what the browser cares about.
      primer.resume().catch(() => {});
      // Keep the primer attached so cached contexts share the unlocked state
      // (also gives handlePause something to suspend even before narration).
      activeAudioCtxRef.current = primer;
    } catch {}
    Object.values(narrationCache.current).forEach(entry => {
      try { entry.audioContext.resume(); } catch {}
    });
    if (musicRef.current) {
      // Fire play() synchronously to register the gesture on the <audio> element.
      // Volume is already 0 from the preload, so this is silent until fadeMusic.
      try { musicRef.current.play().catch(() => {}); } catch {}
    }

    setShowTapOverlay(false);
    // Preload scene 0 image behind the bridge screen
    setCurrentScene(0);
    // Show the "Preparing {Name}'s story..." bridge for a beat of anticipation.
    // This is quiet theater — the audio is already unlocked above, so we can
    // afford ~1.6s of cinematic breathing room before the first scene appears.
    setShowPreparingBridge(true);
    setTimeout(() => {
      setShowPreparingBridge(false);
      handlePlay();
    }, 1600);
  }, [handlePlay]);

  // ── Auto-start: fire handlePlay automatically (demo mode / share links) ──
  // MUST come AFTER handlePlay is declared to avoid TDZ (temporal dead zone).
  // Fires once on mount. Uses refs to stay resilient to handlePlay recreation.
  //
  // Delay is intentionally small: one paint frame is enough for the scene-0
  // image to mount and begin loading. Music + narration then fire in parallel,
  // giving photo + voice + music within ~1 second of the URL loading.
  const autoStartFiredRef = useRef(false);
  const handlePlayRef = useRef(handlePlay);
  useEffect(() => { handlePlayRef.current = handlePlay; }, [handlePlay]);
  useEffect(() => {
    if (!autoStart || autoStartFiredRef.current) return;
    autoStartFiredRef.current = true;
    // 100ms — enough for the first scene image to mount, no more.
    const t = setTimeout(() => handlePlayRef.current(), 100);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = useCallback(() => {
    if (!isPlaying || isPaused) return;
    if (activeAudioCtxRef.current) { try { activeAudioCtxRef.current.suspend(); } catch {} }
    if (musicRef.current) musicRef.current.pause();
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPaused(true); setShowControls(true);
  }, [isPlaying, isPaused]);

  const handleResume = useCallback(() => {
    if (!isPlaying || !isPaused) return;
    if (activeAudioCtxRef.current) { try { activeAudioCtxRef.current.resume(); } catch {} }
    if (musicRef.current) musicRef.current.play().catch(() => {});
    setIsPaused(false);
  }, [isPlaying, isPaused]);

  const handleStop = useCallback(() => {
    stopAllAudio();
    if (activeAudioCtxRef.current) { try { activeAudioCtxRef.current.close(); } catch {} activeAudioCtxRef.current = null; }
    if (musicRef.current) { musicRef.current.pause(); musicRef.current.src = ''; musicRef.current = null; }
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPlaying(false); setIsPaused(false); setCurrentScene(0);
    setSceneProgress(0); setAllDone(false); setShowControls(true);
  }, []);

  const handleSkipNext = useCallback(() => {
    if (!isPlaying) return;
    if (activeAudioCtxRef.current) { try { activeAudioCtxRef.current.close(); } catch {} activeAudioCtxRef.current = null; }
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPaused(false); playScene(currentScene + 1);
  }, [isPlaying, currentScene, playScene]);

  const handleSkipPrev = useCallback(() => {
    if (!isPlaying || currentScene === 0) return;
    if (activeAudioCtxRef.current) { try { activeAudioCtxRef.current.close(); } catch {} activeAudioCtxRef.current = null; }
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setIsPaused(false); playScene(currentScene - 1);
  }, [isPlaying, currentScene, playScene]);

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
      if (audioFailTimerRef.current) clearTimeout(audioFailTimerRef.current);
      musicRef.current?.pause();
    };
  }, []);

  // ── Retry audio from the failure banner — same gesture-unlock protocol ──
  const handleRetryAudio = useCallback(() => {
    try {
      const primer = new AudioContext({ sampleRate: 24000 });
      primer.resume().catch(() => {});
      activeAudioCtxRef.current = primer;
    } catch {}
    Object.values(narrationCache.current).forEach(entry => {
      try { entry.audioContext.resume(); } catch {}
    });
    if (musicRef.current) { try { musicRef.current.play().catch(() => {}); } catch {} }
    setShowAudioFailBanner(false);
    setAudioState('loading');
    audioStartedRef.current = false;
    // Re-play from the current scene (not scene 0 — user is already watching)
    const resumeIdx = currentScene;
    // Clear cache for this scene so we re-fetch with a gesture-bound context
    delete narrationCache.current[resumeIdx];
    if (isPlaying) {
      // Already in the play loop — just let the next playScene call pick it up
      stopAllAudio();
      playScene(resumeIdx);
    } else {
      handlePlay();
    }
  }, [currentScene, isPlaying, playScene, handlePlay]);

  const scene = scenes[currentScene] || { image: '', caption: (story as any).storytellerName, narration: '', beatTitle: '' };
  // Fallback image if scene has none — use first generated image
  const sceneImage = scene.image || (story.generatedImages?.[0]?.image_url) || '';
  const kbOrigin = getKBOrigin(currentScene);
  // Single canonical display form for every scene overlay. Strips birth-year
  // suffixes, normalizes casing (Title Case with particle/Mc/apostrophe/roman-
  // numeral handling). See utils/nameUtils.ts.
  const storytellerName = formatDisplayNameOrDefault((story as any).storytellerName, 'A Life Well Lived');

  // ── Tap-to-start overlay ───────────────────────────────────────────────────
  if (showTapOverlay) {
    const bgImage = scenes[0]?.image || '';
    return (
      <div onClick={handleTapToStart} style={{ position:'fixed', inset:0, zIndex:999, background:'#08060A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden' }}>
        <style>{`
          @keyframes kb-tap{0%{transform:scale(1.0)}100%{transform:scale(1.08)}}
          @keyframes tap-fade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
          @keyframes pulse-ring{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.12);opacity:1}}
        `}</style>
        {bgImage && (
          <div style={{ position:'absolute', inset:'-5%', animation:'kb-tap 10s ease-out forwards' }}>
            <img src={bgImage} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'sepia(30%) brightness(0.35) contrast(1.1)' }} alt="" />
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 15%, rgba(4,2,8,0.9) 100%)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(8,4,2,0.6) 0%, transparent 30%, transparent 65%, rgba(4,2,8,0.95) 100%)' }} />
        <div style={{ position:'relative', zIndex:10, textAlign:'center', padding:'0 32px', animation:'tap-fade 1s ease both' }}>
          <div style={{ width:88, height:88, borderRadius:'50%', border:'1.5px solid rgba(196,151,59,0.5)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', animation:'pulse-ring 2s ease-in-out infinite', background:'rgba(196,151,59,0.1)' }}>
            <span style={{ fontSize:32, color:'rgba(196,151,59,0.9)', marginLeft:5 }}>▶</span>
          </div>
          <p style={{ fontFamily:'Georgia,"Times New Roman",serif', fontStyle:'italic', fontSize:'clamp(20px,4vw,28px)', fontWeight:400, color:'rgba(245,236,215,0.9)', lineHeight:1.4, marginBottom:14 }}>
            Watch {storytellerName}'s Story
          </p>
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.35em', textTransform:'uppercase', color:'rgba(196,151,59,0.5)' }}>
            Tap anywhere to begin
          </p>
        </div>
        <div style={{ position:'absolute', bottom:36, left:0, right:0, textAlign:'center', fontSize:9, fontWeight:700, letterSpacing:'0.4em', textTransform:'uppercase', color:'rgba(196,151,59,0.25)' }}>{BRAND.name}</div>
      </div>
    );
  }

  // ── Preparing bridge: 1.6s of quiet anticipation between tap and scene 0 ──
  // Dark screen, storyteller's name fades in with gold glow, animated gold line
  // expands under the name, "Preparing {Name}'s story..." caption rises last.
  // No spinners — the theater lights are coming up, not a progress bar.
  if (showPreparingBridge) {
    return (
      <div style={{
        position:'fixed', inset:0, zIndex:999,
        background:'radial-gradient(ellipse at center, #1A0F07 0%, #08060A 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'0 24px', overflow:'hidden',
      }}>
        <style>{`
          @keyframes bridgeLine{0%{width:0;opacity:0}30%{opacity:.9}100%{width:72px;opacity:.9}}
          @keyframes bridgeName{0%{opacity:0;letter-spacing:.08em;filter:blur(4px)}60%{filter:blur(0)}100%{opacity:1;letter-spacing:-0.01em;filter:blur(0)}}
          @keyframes bridgeCaption{0%,30%{opacity:0;transform:translateY(8px)}100%{opacity:.7;transform:none}}
          @keyframes bridgeBgPulse{0%,100%{opacity:.35}50%{opacity:.55}}
        `}</style>
        {/* Subtle gold haze behind name */}
        <div style={{
          position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
          width:'80vw', maxWidth:640, height:320,
          background:'radial-gradient(ellipse at center, rgba(196,151,59,0.18) 0%, transparent 70%)',
          animation:'bridgeBgPulse 3s ease-in-out infinite',
          pointerEvents:'none',
        }} />

        <h1 style={{
          fontFamily:'"Playfair Display", Georgia, serif',
          fontWeight:700,
          fontSize:'clamp(36px, 9vw, 72px)',
          color:'#F5ECD7',
          textAlign:'center',
          lineHeight:1.05,
          margin:0,
          textShadow:'0 0 30px rgba(196,151,59,0.35), 0 0 80px rgba(196,151,59,0.15)',
          animation:'bridgeName 1.2s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {storytellerName}
        </h1>

        <div style={{
          height:1,
          background:'linear-gradient(to right, transparent, rgba(196,151,59,0.8), transparent)',
          margin:'28px 0 22px',
          animation:'bridgeLine 1s cubic-bezier(0.16,1,0.3,1) 0.6s both',
        }} />

        <p style={{
          fontFamily:'Georgia, "Times New Roman", serif',
          fontStyle:'italic',
          fontSize:'clamp(13px, 3.2vw, 16px)',
          color:'rgba(196,151,59,0.75)',
          textAlign:'center',
          margin:0,
          letterSpacing:'0.02em',
          animation:'bridgeCaption 1.4s ease 0.3s both',
        }}>
          Preparing {storytellerName}'s story…
        </p>
      </div>
    );
  }

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="h-full w-full bg-[#0D0B0A] flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,46,59,0.15)_0%,transparent_70%)]" />
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          <div className="text-6xl">🕯️</div>
          <h2 className="text-4xl font-display font-black text-white tracking-tight">
            The story of <span className="text-heritage-warmGold">{storytellerName}</span>
          </h2>
          <p className="text-white/50 font-serif italic text-lg">Preserved forever in the {BRAND.name} Archive.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => { setAllDone(false); setCurrentScene(0); setIsPlaying(false); }}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-full text-xs uppercase tracking-[0.3em] transition-all">Watch Again</button>
            {onShare && (
              <button onClick={onShare}
                className="px-8 py-4 bg-heritage-warmGold/20 hover:bg-heritage-warmGold/30 text-heritage-warmGold font-black rounded-full text-xs uppercase tracking-[0.3em] border border-heritage-warmGold/30 transition-all">
                ↗ Share This Story
              </button>
            )}
            <button onClick={onRestart}
              className="px-8 py-4 bg-heritage-burgundy text-white font-black rounded-full shadow-xl text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all">
              {isWissums ? "Create your pet's story →" : 'Preserve another story →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, width: "100%", height: "100%", overflow: "hidden", background: "#0D0B0A" }} onClick={() => { if (isPlaying) setShowControls(p => !p); }}>

      {sceneImage ? (
        <div className="absolute inset-0 overflow-hidden">
          <img key={`${currentScene}-img`} src={sceneImage} alt={scene.caption}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transformOrigin:kbOrigin, animation:'sceneCrossfade 0.9s ease both, kenBurns 12s ease-out forwards' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize:'150px' }} />
          {/* Cinematic edge vignettes — replace hard letterbox bars for full-bleed mobile */}
          <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none" style={{ background:'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)' }} />
          {scene.anchorPhoto?.url && (
            <div className="absolute z-20" style={{ bottom:52, right:14 }}>
              <div style={{ fontSize:7, fontWeight:900, letterSpacing:'.18em', color:'rgba(196,151,59,0.85)', fontFamily:'system-ui', textAlign:'right', marginBottom:4 }}>
                {scene.anchorPhoto.caption ? (
                  <span style={{ textTransform:'uppercase' }}>{scene.anchorPhoto.caption}</span>
                ) : (
                  <><span style={{ textTransform:'uppercase' }}>The Real </span><span>{storytellerName}</span></>
                )}
              </div>
              <div style={{ width:88, height:88, borderRadius:8, overflow:'hidden', border:'1.5px solid rgba(196,151,59,0.55)', boxShadow:'0 4px 18px rgba(0,0,0,0.75)' }}>
                <img src={scene.anchorPhoto.url} alt="Real photo" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at center, #2C1F0E 0%, #0D0B0A 100%)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-heritage-warmGold/10 font-display font-black text-[12vw] text-center leading-none px-8">{storytellerName}</div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none" style={{ background:'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)' }} />
        </div>
      )}

      {/* Tap-to-advance zones: left = prev, right = next */}
      {isPlaying && (
        <>
          <div className="absolute top-12 bottom-10 left-0 z-15" style={{ width: '30%' }}
            onClick={e => { e.stopPropagation(); if (currentScene > 0) handleSkipPrev(); }} />
          <div className="absolute top-12 bottom-10 right-0 z-15" style={{ width: '30%' }}
            onClick={e => { e.stopPropagation(); handleSkipNext(); }} />
        </>
      )}

      {/* Centered play button — visible when not playing */}
      {!isPlaying && !preparingScene && !allDone && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" onClick={e => { e.stopPropagation(); handlePlay(); }} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, animation: 'fadeInUp 0.5s ease-out' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              border: '1.5px solid rgba(196,151,59,0.5)',
              background: 'rgba(196,151,59,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse-ring 2s ease-in-out infinite',
            }}>
              <span style={{ fontSize: 32, color: 'rgba(196,151,59,0.9)', marginLeft: 5 }}>▶</span>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)' }}>
              Tap to play
            </p>
          </div>
        </div>
      )}

      {/* Progress rail */}
      <div className="absolute top-12 left-0 right-0 z-30 px-4 flex gap-1">
        {scenes.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: i < currentScene ? '100%' : i === currentScene ? `${sceneProgress}%` : '0%' }} />
          </div>
        ))}
      </div>

      {/* Audio state indicator — always visible while experience is active */}
      {(isPlaying || audioState === 'loading') && (
        <div
          className="absolute top-14 left-4 z-40"
          onClick={e => { e.stopPropagation(); if (audioState === 'failed') handleRetryAudio(); }}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'6px 12px', borderRadius:999,
            background: audioState === 'failed' ? 'rgba(139,46,59,0.85)' : 'rgba(0,0,0,0.55)',
            border: `1px solid ${audioState === 'playing' ? 'rgba(196,151,59,0.7)' : audioState === 'loading' ? 'rgba(196,151,59,0.4)' : 'rgba(255,255,255,0.2)'}`,
            color: audioState === 'playing' ? 'rgba(196,151,59,1)' : 'rgba(255,255,255,0.85)',
            cursor: audioState === 'failed' ? 'pointer' : 'default',
            transition: 'all 400ms ease',
            backdropFilter: 'blur(8px)',
          }}>
          <style>{`@keyframes audio-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}`}</style>
          <span style={{
            fontSize: 16,
            animation: audioState === 'loading' ? 'audio-pulse 1.2s ease-in-out infinite' : 'none',
            filter: audioState === 'failed' ? 'grayscale(1)' : 'none',
          }}>
            {audioState === 'failed' ? '🔇' : '🔊'}
          </span>
          {audioState === 'failed' && (
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase' }}>
              Tap to hear
            </span>
          )}
        </div>
      )}

      {/* Music controls */}
      {isPlaying && (
        <div className="absolute top-14 right-4 z-30 flex items-center gap-2 transition-opacity duration-500"
          style={{
            opacity: showControls ? 1 : 0,
            padding:'6px 12px', borderRadius:999,
            background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.12)',
          }}
          onClick={e => e.stopPropagation()}>
          <button onClick={handleMusicToggle}
            style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.85)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {musicPaused ? '♪' : '⏸'}
          </button>
          <span style={{ fontSize:16, color:'rgba(196,151,59,0.9)', lineHeight:1 }} title="Music volume">🔊</span>
          <input type="range" min={0} max={1} step={0.05} value={musicVolume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            style={{ width:88, accentColor:'rgba(196,151,59,0.9)', cursor:'pointer' }} />
        </div>
      )}

      {/* Persistent "Narration unavailable" indicator — shown when the
          narration service has failed on 2+ scenes in a row, meaning retry
          is unlikely to help (usually hit spending cap / quota). Sits below
          the audio state pill so it doesn't overlap. Passive, no tap handler. */}
      {narrationUnavailable && isPlaying && (
        <div
          className="absolute top-28 left-4 z-40"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(20,10,10,0.7)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'system-ui', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}
          title={narrationFailKind ? `Narration failure: ${narrationFailKind}` : 'Narration unavailable'}
        >
          <span style={{ fontSize: 14, filter: 'grayscale(1)' }}>🔇</span>
          <span>Narration unavailable</span>
        </div>
      )}

      {/* Audio failure banner + full-screen tap-to-retry layer */}
      {showAudioFailBanner && !narrationUnavailable && (
        <>
          {/* Invisible full-screen layer catches "tap anywhere" — sits above scene
              controls but below the visible banner. Gesture-bound retry. */}
          <div
            onClick={e => { e.stopPropagation(); handleRetryAudio(); }}
            className="absolute inset-0"
            style={{ cursor:'pointer', background:'transparent', zIndex:45 }}
          />
          {/* Visible banner — gentle, bottom-centered */}
          <div
            onClick={e => { e.stopPropagation(); handleRetryAudio(); }}
            className="absolute z-50"
            style={{
              left:'50%', bottom: 120, transform:'translateX(-50%)',
              padding:'14px 28px', borderRadius:999,
              background:'rgba(139,46,59,0.92)',
              border:'1px solid rgba(196,151,59,0.5)',
              color:'#F5ECD7', fontFamily:'Georgia,"Times New Roman",serif', fontStyle:'italic',
              fontSize:14, cursor:'pointer', boxShadow:'0 10px 40px rgba(0,0,0,0.5)',
              backdropFilter:'blur(10px)', animation:'fadeInUp 0.6s ease-out',
              display:'flex', alignItems:'center', gap:12, maxWidth:'90vw',
            }}>
            <span style={{ fontSize:18 }}>🔊</span>
            <span>Tap anywhere to hear {storytellerName}'s story narrated</span>
          </div>
        </>
      )}

      {/* Scene overlay */}
      <div className="absolute inset-x-0 bottom-10 z-20 px-8 pb-6 space-y-4 transition-opacity duration-500"
        style={{ opacity: isPlaying ? (showControls ? 1 : 0) : 1 }}>

        {scene.beatTitle && isPlaying && (
          <div key={`${currentScene}-title`} className="animate-fade-in">
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-heritage-warmGold/70">{scene.beatTitle}</span>
          </div>
        )}

        {scene.narration && isPlaying && (
          <div key={`${currentScene}-narration`} className="max-w-2xl transition-all duration-700"
            style={{ opacity: showNarrationText ? 1 : 0, transform: showNarrationText ? 'translateY(0)' : 'translateY(8px)' }}>
            <p className="text-base sm:text-lg lg:text-xl font-serif italic leading-relaxed"
              style={{ color:'rgba(255,255,255,0.95)', textShadow:'0 1px 20px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,0.9)', lineHeight:1.7 }}>
              {scene.narration}
            </p>
          </div>
        )}

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black leading-tight tracking-tight"
          style={{
            color:'#F5ECD7',
            textShadow:'0 2px 24px rgba(0,0,0,0.95), 0 0 40px rgba(196,151,59,0.25), 0 0 80px rgba(196,151,59,0.12)',
            letterSpacing:'-0.01em',
          }}>{storytellerName}</h2>

        {isPlaying && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Scene {currentScene + 1} of {totalScenes}</span>
              {loadingNarration && <span className="text-white/40 text-[9px] font-black uppercase tracking-widest animate-pulse">· preparing…</span>}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={e => { e.stopPropagation(); handleSkipPrev(); }} disabled={currentScene === 0}
                style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color: currentScene === 0 ? 'rgba(255,255,255,0.2)':'rgba(255,255,255,0.7)', fontSize:14, cursor: currentScene === 0 ? 'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>⏮</button>
              <button onClick={e => { e.stopPropagation(); isPaused ? handleResume() : handlePause(); }}
                style={{ width:48, height:48, borderRadius:'50%', background:'rgba(196,151,59,0.15)', border:'1px solid rgba(196,151,59,0.4)', color:'rgba(196,151,59,0.9)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {isPaused ? '▶' : '⏸'}
              </button>
              <button onClick={e => { e.stopPropagation(); handleSkipNext(); }}
                style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>⏭</button>
              <button onClick={e => { e.stopPropagation(); handleStop(); }}
                style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>■</button>
            </div>
          </div>
        )}

        {!isPlaying && !preparingScene && (
          <div className="pt-2">
            <button onClick={e => { e.stopPropagation(); handlePlay(); }}
              className="flex items-center gap-4 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-full hover:bg-white/20 active:scale-95 transition-all text-xs uppercase tracking-[0.3em]">
              <span className="text-xl">▶</span>Watch {storytellerName}'s Story
            </button>
            <p className="text-white/30 text-[9px] mt-3 font-serif italic">
              {narratorVoice === 'Fenrir' ? '🎙️ His voice narrates' : '🎙️ Her voice narrates'} · {scenes.length} chapters
            </p>
          </div>
        )}

        {preparingScene && (
          <div className="pt-2 animate-fade-in">
            <div className="flex items-center gap-4 px-8 py-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
              <div className="flex gap-1.5 items-center">
                {[0,150,300].map(delay => (
                  <div key={delay} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(196,151,59,0.8)', animation:`dotPulse 1.2s ease-in-out ${delay}ms infinite` }} />
                ))}
              </div>
              <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Preparing {storytellerName}'s story…</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating share CTA — appears after first beat completes */}
      {isPlaying && currentScene > 0 && onShare && (
        <div style={{ position: 'absolute', bottom: 172, right: 16, zIndex: 35, animation: 'fadeInUp 0.6s ease-out' }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); onShare(); }}
            style={{
              padding: '9px 16px',
              background: 'rgba(139,46,59,0.85)',
              border: '1px solid rgba(196,151,59,0.3)',
              borderRadius: 24,
              color: 'white',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}>
            ↗ Share this story
          </button>
        </div>
      )}

      {/* Top controls */}
      <div className="absolute top-14 right-4 z-30 flex gap-2 transition-opacity duration-500" style={{ opacity: showControls ? 1 : 0 }}>
        {onViewShelf && (
          <button onClick={e => { e.stopPropagation(); onViewShelf(); }}
            className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white/60 hover:text-white border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors">
            📚 All Stories
          </button>
        )}
        {onShare && (
          <button onClick={e => { e.stopPropagation(); onShare(); }}
            className="px-4 py-2 bg-heritage-burgundy/80 backdrop-blur-sm text-white hover:bg-heritage-burgundy border border-heritage-burgundy/40 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors">
            ↗ Share
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onRestart(); }}
          className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white/60 hover:text-white border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors">
          ✕ Exit
        </button>
      </div>

      <style>{`
        @keyframes kenBurns{0%{transform:scale(1.0)}100%{transform:scale(1.25)}}
        @keyframes sceneCrossfade{0%{opacity:0}100%{opacity:1}}
        @keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(0.85)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-ring{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.12);opacity:1}}
        @keyframes bridgeLine{0%{width:0;opacity:0}30%{opacity:.9}100%{width:72px;opacity:.9}}
        @keyframes bridgeName{0%{opacity:0;letter-spacing:.08em;filter:blur(4px)}60%{filter:blur(0)}100%{opacity:1;letter-spacing:.02em;filter:blur(0)}}
        @keyframes bridgeCaption{0%,30%{opacity:0;transform:translateY(8px)}100%{opacity:.7;transform:none}}
        .animate-fade-in{animation:fadeInUp 0.4s ease-out forwards}
      `}</style>
    </div>
  );
};

export default CinematicReveal;
