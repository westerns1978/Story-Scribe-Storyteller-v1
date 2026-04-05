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
  autoPlay?: boolean;
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

  const storyBeats = beats.map((beat: any, i: number) => {
    const img = images.find((im: any) => im.index === i || im.image_index === i) || images[i];
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

const CinematicReveal: React.FC<CinematicRevealProps> = ({
  story, onRestart, narratorVoice = 'Kore', onShare, onViewShelf, onComplete,
  autoPlay = false,
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
  const [showTapOverlay, setShowTapOverlay] = useState(autoPlay);
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [musicPaused, setMusicPaused] = useState(false);

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
    const query = getMusicQueryForStory(story);
    findMusicFromSuggestion(query).then(tracks => {
      if (tracks[0]?.url) musicUrlRef.current = tracks[0].url;
    }).catch(() => {});
    if (musicRef.current) { musicRef.current.pause(); musicRef.current.src = ''; musicRef.current = null; }
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
    const beatAudio = (story as any).beatAudio || [];
    const cached = narratorVoice === 'Kore'
      ? beatAudio.find((b: any) => b.beat_index === sceneIdx || b.beat_index === sceneIdx - 1)
      : null;
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
    try {
      const result = await narrateText(text.slice(0, 800), narratorVoice);
      if (!result) return null;
      narrationCache.current[sceneIdx] = result;
      return result;
    } catch { return null; }
  }, [scenes, narratorVoice, story]);

  const playScene = useCallback(async (idx: number) => {
    if (idx >= totalScenes) {
      setAllDone(true); setIsPlaying(false); fadeMusic(0, 3000);
      if (onComplete) setTimeout(onComplete, 4000);
      return;
    }
    setCurrentScene(idx); setSceneProgress(0); setPreparingScene(false);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    setLoadingNarration(true);
    const narFetch = Promise.all([
      fetchNarration(idx),
      idx + 1 < totalScenes ? fetchNarration(idx + 1) : Promise.resolve(null),
    ]).catch(() => [null, null]);
    const [narResult] = await narFetch;
    setLoadingNarration(false);
    setNarrationReady(!!narResult);

    let sceneDuration = 9000;
    if (narResult) {
      if (musicRef.current && !musicRef.current.paused) fadeMusic(0.08, 800);
      let stopNarration: (() => void) | null = null;
      await new Promise<void>(resolve => {
        stopNarration = playAudioBuffer(narResult.audioBuffer, narResult.audioContext, { onEnded: resolve, gainValue: 1.0, skipGlobalTrack: true });
        activeAudioCtxRef.current = narResult.audioContext;
        sceneStartTimeRef.current = narResult.audioContext.currentTime;
        setTimeout(resolve, 60000);
      });
      activeAudioCtxRef.current = null;
      if (stopNarration) { try { (stopNarration as () => void)(); } catch {} }
      if (musicRef.current && !musicRef.current.paused) fadeMusic(0.25, 1000);
      sceneDuration = 2000;
    }

    const duration = narResult ? (narResult.audioBuffer.duration || 8) * 1000 + 2000 : sceneDuration;
    let elapsed = 0;
    progressTimerRef.current = setInterval(() => {
      elapsed += 100;
      setSceneProgress(Math.min(100, (elapsed / duration) * 100));
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
    (async () => {
      try {
        if (!musicUrlRef.current) {
          const tracks = await findMusicFromSuggestion(getMusicQueryForStory(story));
          if (tracks[0]?.url) musicUrlRef.current = tracks[0].url;
        }
        if (musicUrlRef.current && !musicRef.current) {
          const audio = new Audio(musicUrlRef.current);
          audio.loop = true; audio.volume = 0; audio.preload = 'auto';
          musicRef.current = audio;
          await audio.play();
          fadeMusic(0.25, 2000);
        }
      } catch (e) { console.warn('[CinematicReveal] Background music unavailable:', e); }
    })();
    playScene(0);
    isStartingRef.current = false;
  }, [playScene, fadeMusic, story, isPlaying]);

  const handleTapToStart = useCallback(() => {
    setShowTapOverlay(false);
    // Set scene 0 visible immediately so image starts loading
    setCurrentScene(0);
    // Small delay lets the image mount before audio/play logic fires
    setTimeout(() => handlePlay(), 150);
  }, [handlePlay]);

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
      musicRef.current?.pause();
    };
  }, []);

  const scene = scenes[currentScene] || { image: '', caption: (story as any).storytellerName, narration: '', beatTitle: '' };
  // Fallback image if scene has none — use first generated image
  const sceneImage = scene.image || (story.generatedImages?.[0]?.image_url) || '';
  const kbOrigin = getKBOrigin(currentScene);
  const storytellerName = (story as any).storytellerName || 'A Life Well Lived';

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
        <div style={{ position:'absolute', bottom:36, left:0, right:0, textAlign:'center', fontSize:9, fontWeight:700, letterSpacing:'0.4em', textTransform:'uppercase', color:'rgba(196,151,59,0.25)' }}>Wissums</div>
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
          <p className="text-white/50 font-serif italic text-lg">Preserved forever in the Wissums Archive.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => { setAllDone(false); setCurrentScene(0); setIsPlaying(false); }}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-full text-xs uppercase tracking-[0.3em] transition-all">Watch Again</button>
            <button onClick={onRestart}
              className="px-8 py-4 bg-heritage-burgundy text-white font-black rounded-full shadow-xl text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all">Preserve Another Story</button>
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
            style={{ transformOrigin:kbOrigin, animation:'kenBurns 12s ease-out forwards' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize:'150px' }} />
          <div className="absolute top-0 left-0 right-0 h-12 bg-black" />
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-black" />
          {scene.anchorPhoto?.url && (
            <div className="absolute z-20" style={{ bottom:52, right:14 }}>
              <div style={{ fontSize:7, fontWeight:900, letterSpacing:'.18em', color:'rgba(196,151,59,0.85)', fontFamily:'system-ui', textTransform:'uppercase', textAlign:'right', marginBottom:4 }}>{scene.anchorPhoto.caption || `The Real ${storytellerName}`}</div>
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
          <div className="absolute top-0 left-0 right-0 h-12 bg-black" />
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-black" />
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

      {/* Music controls */}
      {isPlaying && (
        <div className="absolute top-14 left-4 z-30 flex items-center gap-2 transition-opacity duration-500"
          style={{ opacity: showControls ? 1 : 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={handleMusicToggle}
            style={{ width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {musicPaused ? '♪' : '⏸'}
          </button>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>🔈</span>
          <input type="range" min={0} max={1} step={0.05} value={musicVolume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            style={{ width:72, accentColor:'rgba(196,151,59,0.8)', cursor:'pointer' }} />
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>🔊</span>
        </div>
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
            <p className="text-sm lg:text-base font-serif italic leading-relaxed"
              style={{ color:'rgba(255,255,255,0.92)', textShadow:'0 1px 20px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,0.9)', lineHeight:1.75 }}>
              {scene.narration}
            </p>
          </div>
        )}

        <h2 className="text-2xl lg:text-3xl font-display font-black text-white leading-tight tracking-tight"
          style={{ textShadow:'0 2px 20px rgba(0,0,0,0.8)' }}>{storytellerName}</h2>

        {isPlaying && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">{currentScene + 1} / {totalScenes}</span>
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
        @keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(0.85)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .animate-fade-in{animation:fadeInUp 0.4s ease-out forwards}
      `}</style>
    </div>
  );
};

export default CinematicReveal;
