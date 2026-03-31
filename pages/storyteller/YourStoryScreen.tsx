import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ActiveStory } from '../../types';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import StorybookViewer from '../../components/StorybookViewer';
import TimelineVisualizer from '../../components/TimelineVisualizer';
import ImageGallery from '../../components/ImageGallery';
import ArrowPathIcon from '../../components/icons/ArrowPathIcon';
import Toast from '../../components/Toast';
import CinematicReveal from '../../components/CinematicReveal';
import VisualStoryboard from '../../components/VisualStoryboard';
import MemoryLaneView from '../../components/MemoryLaneView';
import MemoryMapView from '../../components/MemoryMapView';
import HeirloomsGallery from '../../components/HeirloomsGallery';
import MagicTouchPanel from '../../components/MagicTouchPanel';
import { DownloadMemoryBook } from '../../components/DownloadMemoryBook';
import TimeCapsuleModal from '../../components/TimeCapsuleModal';
import WritingAssistantPanel from '../../components/WritingAssistantPanel';
import InspirationPanel from '../../components/InspirationPanel';
import { ImageEditModal, SceneToEdit } from '../../components/ImageEditModal';
import { GenerateMovieButton } from '../../components/GenerateMovieButton';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

type DetailTab = 'overview' | 'memory-lane' | 'map' | 'heirlooms' | 'insights';

interface YourStoryScreenProps {
  story: ActiveStory;
  onRestart: () => void;
  narratorVoice?: 'Kore' | 'Fenrir';
  onViewShelf?: () => void;
  onBack?: () => void;
  onReorderBeats?: (oldIndex: number, newIndex: number) => void;
  isSharedView?: boolean;
  onRefineNarrative?: (instruction: string) => Promise<void>;
}

export const YourStoryScreen: React.FC<YourStoryScreenProps> = ({
  story, onRestart, narratorVoice = 'Kore', onViewShelf, onBack,
  onReorderBeats, isSharedView = false, onRefineNarrative,
}) => {
  const [viewMode, setViewMode] = useState<'cinematic' | 'details'>('cinematic');
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
  const [isRefining, setIsRefining] = useState(false);
  const [speakingQuote, setSpeakingQuote] = useState<number | null>(null);
  const [timeCapsuleYear, setTimeCapsuleYear] = useState<string | null>(null);
  const [timeCapsuleLocation, setTimeCapsuleLocation] = useState<string | undefined>(undefined);

  // ── Image editing state ───────────────────────────────────────────────────
  const [sceneToEdit, setSceneToEdit] = useState<SceneToEdit | null>(null);
  const [localImages, setLocalImages] = useState<typeof story.generatedImages>(
    story.generatedImages || []
  );

  // ── Narrative editing state ───────────────────────────────────────────────
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  // Sanitize narrative — recursively strip JSON wrapper if double/triple encoding occurred
  const sanitizeNarrative = (raw: string, depth = 0): string => {
    if (!raw || depth > 5) return raw || '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        // If parsed object has a narrative field, recurse into it
        if (parsed.narrative && typeof parsed.narrative === 'string') {
          return sanitizeNarrative(parsed.narrative, depth + 1);
        }
        // If the whole thing is the story object, stringify just the narrative
        if (typeof parsed === 'object' && !parsed.narrative) {
          return trimmed; // can't extract, return as-is
        }
      } catch { /* not JSON, use as-is */ }
    }
    return raw;
  };
  const [editedNarrative, setEditedNarrative] = useState(sanitizeNarrative(story.narrative || ''));
  const [narrativeSaved, setNarrativeSaved] = useState(false);

  // Sync narrative if story prop updates after mount (share link cold load)
  useEffect(() => {
    if (story.narrative) {
      setEditedNarrative(sanitizeNarrative(story.narrative));
    }
  }, [story.narrative]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warn') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const hasTimeline = useMemo(() => !!(story?.extraction?.timeline?.length), [story]);
  const hasStoryboard = useMemo(() => !!(story?.storyboard?.story_beats?.length), [story]);
  const hasImages = useMemo(() => !!(localImages?.filter(i => i.image_url).length), [localImages]);
  const hasBeats = useMemo(() => !!(story?.storyboard?.story_beats?.length), [story]);
  const hasInsights = useMemo(() => !!(
    story?.extraction?.key_quotes?.length ||
    story?.extraction?.emotional_journey?.overall_tone ||
    story?.extraction?.locations?.length
  ), [story]);
  const storytellerName = story?.storytellerName || 'Anonymous';

  // ── Real uploaded assets for grounding (Band of Brothers anchor) ──────────
  // These are the user's actual photos — shown FIRST before any AI imagery
  const realAssets = useMemo(() => {
    return (story.artifacts || []).filter(a =>
      a.file_type?.startsWith('image/') && a.public_url &&
      !a.id?.startsWith('restored-') // exclude AI-restored copies — show only originals
    ).slice(0, 3);
  }, [story.artifacts]);

  const handleShareWithFamily = async () => {
    const url = `${window.location.origin}?story=${story?.sessionId || 'unknown'}`;
    const shareData = { title: `${story?.storytellerName}'s Legacy Story`, text: `I preserved ${story?.storytellerName}'s life story with Story Scribe.`, url };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) { await navigator.share(shareData); showToast('Story shared!', 'success'); }
      else { await navigator.clipboard.writeText(url); setCopyFeedback(true); showToast('Share link copied!', 'success'); setTimeout(() => setCopyFeedback(false), 2500); }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        try { await navigator.clipboard.writeText(url); setCopyFeedback(true); showToast('Share link copied!', 'success'); setTimeout(() => setCopyFeedback(false), 2500); }
        catch { showToast('Could not share', 'error'); }
      }
    }
  };

  const narrateQuote = async (quote: string, index: number) => {
    if (speakingQuote === index) { setSpeakingQuote(null); return; }
    setSpeakingQuote(index);
    try {
      const { narrateText, playAudioBuffer } = await import('../../services/narrationService');
      const result = await narrateText(quote.slice(0, 300), narratorVoice || 'Kore');
      if (result) playAudioBuffer(result.audioBuffer, result.audioContext, { onEnded: () => setSpeakingQuote(null) });
    } catch { setSpeakingQuote(null); }
  };

  const handleRefine = async (instruction: string) => {
    if (!onRefineNarrative) return;
    setIsRefining(true);
    try { await onRefineNarrative(instruction); showToast('Story refined!', 'success'); }
    catch { showToast('Refinement failed', 'error'); }
    finally { setIsRefining(false); }
  };

  // ── Open image editor for a specific beat ────────────────────────────────
  const handleEditSceneImage = useCallback((beatIndex: number) => {
    const beat = story.storyboard?.story_beats?.[beatIndex];
    const currentImg = localImages?.[beatIndex];
    if (!beat) return;

    setSceneToEdit({
      beatIndex,
      beatTitle: beat.beat_title || beat.title || `Scene ${beatIndex + 1}`,
      originalPrompt: beat.image_prompt || beat.visual_description || beat.beat_title || '',
      currentImageUrl: currentImg?.image_url || '',
      storytellerName,
    });
  }, [story.storyboard, localImages, storytellerName]);

  // ── Accept a regenerated scene image ─────────────────────────────────────
  const handleImageEditSave = useCallback((
    beatIndex: number,
    newImageUrl: string,
    revisedPrompt: string
  ) => {
    setLocalImages(prev => {
      const updated = [...(prev || [])];
      if (updated[beatIndex]) {
        updated[beatIndex] = {
          ...updated[beatIndex],
          image_url: newImageUrl,
          revised_prompt: revisedPrompt,
        };
      } else {
        // pad if needed
        while (updated.length <= beatIndex) updated.push({} as any);
        updated[beatIndex] = { image_url: newImageUrl, revised_prompt: revisedPrompt } as any;
      }
      return updated;
    });
    showToast('Scene updated', 'success');
  }, [showToast]);

  // ── Save edited narrative ─────────────────────────────────────────────────
  const handleNarrativeSave = useCallback(() => {
    // Update local — in a future pass we can persist to Supabase
    setIsEditingNarrative(false);
    setNarrativeSaved(true);
    showToast('Narrative saved', 'success');
    setTimeout(() => setNarrativeSaved(false), 3000);
  }, [showToast]);

  if (!story) return null;

  // Build the story object with local image overrides for CinematicReveal
  const storyWithEdits = {
    ...story,
    generatedImages: localImages,
    narrative: editedNarrative || story.narrative,
    // Pass real assets for the Band of Brothers anchor sequence
    realAnchorPhotos: realAssets,
  };

  // ── Cinematic Mode ────────────────────────────────────────────────────────
  if (viewMode === 'cinematic') {
    return (
      <div className="h-full w-full relative">
        <CinematicReveal
          story={storyWithEdits as any}
          onRestart={onRestart}
          narratorVoice={narratorVoice}
          onShare={handleShareWithFamily}
          onViewShelf={onViewShelf}
          onComplete={() => setViewMode('details')}
        />
        <div className="fixed bottom-6 right-6 z-[400] flex flex-col gap-3 items-end">
          <button onClick={() => setViewMode('details')} className="px-6 py-3 bg-heritage-cream/90 backdrop-blur-md rounded-full text-[10px] font-black text-heritage-ink uppercase tracking-widest border border-heritage-parchment shadow-xl hover:bg-heritage-cream transition-all">View Details</button>
          {onViewShelf && <button onClick={onViewShelf} className="px-6 py-3 bg-heritage-burgundy/90 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-xl hover:bg-heritage-burgundy transition-all">📚 All Stories</button>}
        </div>
      </div>
    );
  }

  // ── Details Mode ──────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview' as DetailTab,    label: 'Story',       emoji: '📖', show: true },
    { id: 'memory-lane' as DetailTab, label: 'Memory Lane', emoji: '🎬', show: hasBeats },
    { id: 'map' as DetailTab,         label: 'Life Map',    emoji: '🗺️', show: hasTimeline },
    { id: 'heirlooms' as DetailTab,   label: 'Heirlooms',   emoji: '🏺', show: true },
    { id: 'insights' as DetailTab,    label: 'Insights',    emoji: '✦',  show: hasInsights },
  ].filter(t => t.show);

  return (
    <div className="h-full w-full flex flex-col bg-heritage-cream overflow-hidden">

      {/* Tab Bar */}
      <div className="flex-shrink-0 bg-heritage-cream border-b border-heritage-parchment px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => setViewMode('cinematic')} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-heritage-warmGold hover:text-heritage-ink transition-colors">▶ Re-watch Movie</button>
          <h2 className="text-sm font-display font-black text-heritage-ink tracking-tight truncate max-w-[160px]">
            {storytellerName}'s {(story as any).petMode ? 'Tribute' : 'Legacy'}
          </h2>
          <div className="flex items-center gap-2">
            {onViewShelf && <button onClick={onViewShelf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-heritage-burgundy hover:bg-heritage-burgundy hover:text-white transition-all border border-heritage-burgundy/40">📚 Archive</button>}
            <button onClick={handleShareWithFamily} className="text-[9px] font-black uppercase tracking-widest text-heritage-inkMuted hover:text-heritage-burgundy transition-colors">
              {copyFeedback ? '✓' : <ShareIcon className="w-3.5 h-3.5 inline" />}
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all border-b-2 ${activeTab === tab.id ? 'text-heritage-burgundy border-heritage-burgundy bg-white/60' : 'text-heritage-inkMuted border-transparent hover:text-heritage-ink hover:bg-white/30'}`}>
              <span>{tab.emoji}</span><span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`flex-1 ${activeTab === 'overview' ? 'overflow-y-auto scroll-viewport' : 'overflow-hidden'}`}>

        {activeTab === 'overview' && (
          <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-10 pb-32">

            {/* ── Real Photo Anchor (Band of Brothers) ───────────────────── */}
            {realAssets.length > 0 && (
              <section style={{
                background: 'rgba(8,6,4,0.96)',
                borderRadius: '1.5rem',
                padding: '28px',
                border: '1px solid rgba(196,151,59,0.15)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent, rgba(196,151,59,0.4), transparent)',
                }} />
                <div style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: '.5em',
                  textTransform: 'uppercase', color: 'rgba(196,151,59,0.4)',
                  fontFamily: 'system-ui', marginBottom: 16, textAlign: 'center',
                }}>
                  The Real {storytellerName}
                </div>
                <div style={{
                  display: 'flex', gap: 12, justifyContent: 'center',
                }}>
                  {realAssets.map((asset, i) => (
                    <div key={i} style={{
                      flex: 1, maxWidth: 160,
                      borderRadius: 12, overflow: 'hidden',
                      border: '1px solid rgba(196,151,59,0.2)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                      <img
                        src={asset.public_url}
                        alt={`${storytellerName} — real photo ${i + 1}`}
                        style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ))}
                </div>
                <p style={{
                  fontFamily: 'Georgia, serif', fontStyle: 'italic',
                  fontSize: 12, color: 'rgba(245,236,215,0.3)',
                  textAlign: 'center', marginTop: 14, lineHeight: 1.5,
                }}>
                  These are the real photographs that anchor {storytellerName}'s story.
                  Everything that follows is their cinematic interpretation.
                </p>
              </section>
            )}

            {/* ── Narrative with inline edit ─────────────────────────────── */}
            {(story.narrative || editedNarrative) && (
              <section className="bg-heritage-linen rounded-[2rem] p-8 lg:p-12 shadow-lg border border-heritage-parchment relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-heritage-burgundy opacity-10" />

                {/* Edit / Save controls */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end',
                  marginBottom: 12, gap: 8,
                }}>
                  {!isEditingNarrative ? (
                    <button
                      onClick={() => { setIsEditingNarrative(true); setEditedNarrative(story.narrative || ''); }}
                      style={{
                        fontSize: 9, fontWeight: 900, letterSpacing: '.3em',
                        textTransform: 'uppercase', color: 'rgba(139,46,59,0.5)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'system-ui',
                      }}
                    >
                      ✏ Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleNarrativeSave}
                        style={{
                          fontSize: 9, fontWeight: 900, letterSpacing: '.3em',
                          textTransform: 'uppercase', color: '#4ade80',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'system-ui',
                        }}
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={() => { setIsEditingNarrative(false); setEditedNarrative(story.narrative || ''); }}
                        style={{
                          fontSize: 9, fontWeight: 900, letterSpacing: '.3em',
                          textTransform: 'uppercase', color: 'rgba(248,113,113,0.6)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'system-ui',
                        }}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                </div>

                {isEditingNarrative ? (
                  <textarea
                    value={editedNarrative}
                    onChange={e => setEditedNarrative(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(139,46,59,0.2)',
                      borderRadius: 12, padding: '16px',
                      fontFamily: 'Georgia, serif', fontSize: '1.1rem',
                      fontStyle: 'italic', lineHeight: 1.8,
                      color: 'rgba(30,20,10,0.85)',
                      outline: 'none', resize: 'vertical',
                      minHeight: 300,
                    }}
                  />
                ) : (
                  <div className="prose prose-lg font-serif text-heritage-ink/80 italic leading-relaxed whitespace-pre-wrap">
                    {sanitizeNarrative(editedNarrative || story.narrative || "").replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n")}
                  </div>
                )}

                {narrativeSaved && (
                  <div style={{
                    position: 'absolute', bottom: 16, right: 16,
                    fontSize: 10, color: '#4ade80',
                    fontFamily: 'system-ui', fontWeight: 900,
                    letterSpacing: '.2em', textTransform: 'uppercase',
                  }}>
                    ✓ Saved
                  </div>
                )}
              </section>
            )}

            {onRefineNarrative && <MagicTouchPanel onRefine={handleRefine} isProcessing={isRefining} />}

            {/* ── Cinematic Sequence with edit buttons ───────────────────── */}
            {hasStoryboard && (
              <section className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight">Cinematic Sequence</h3>
                  <div className="w-8 h-0.5 bg-heritage-burgundy/20 mx-auto mt-2" />
                  <p style={{
                    fontSize: 9, fontWeight: 900, letterSpacing: '.25em',
                    textTransform: 'uppercase', color: 'rgba(139,46,59,0.4)',
                    fontFamily: 'system-ui', marginTop: 6,
                  }}>
                    Tap any scene image to edit it
                  </p>
                </div>

                {/* Scene grid with edit overlay */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {story.storyboard!.story_beats.map((beat: any, i: number) => {
                    const img = localImages?.[i];
                    return (
                      <div
                        key={i}
                        onClick={() => handleEditSceneImage(i)}
                        style={{
                          position: 'relative', borderRadius: 12,
                          overflow: 'hidden', cursor: 'pointer',
                          border: selectedBeatIndex === i
                            ? '2px solid rgba(196,151,59,0.6)'
                            : '1px solid rgba(255,255,255,0.06)',
                          background: '#1a1208',
                          transition: 'all .2s',
                          aspectRatio: '4/3',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget.querySelector('.edit-overlay') as HTMLElement).style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget.querySelector('.edit-overlay') as HTMLElement).style.opacity = '0';
                        }}
                      >
                        {img?.image_url ? (
                          <img
                            src={img.image_url}
                            alt={beat.beat_title || `Scene ${i + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ color: 'rgba(245,236,215,0.15)', fontSize: 24 }}>✦</span>
                          </div>
                        )}

                        {/* Real photo anchor badge */}
                        {beat.anchor_photo?.url && (
                          <div
                            title={beat.anchor_photo.caption || 'Real photo'}
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute', top: 6, right: 6,
                              width: 34, height: 34, borderRadius: 6,
                              overflow: 'hidden',
                              border: '1.5px solid rgba(196,151,59,0.65)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                              cursor: 'default',
                            }}
                          >
                            <img src={beat.anchor_photo.url} alt="Real"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {/* Beat title */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '20px 10px 8px',
                          background: 'linear-gradient(to top, rgba(8,6,4,0.9), transparent)',
                        }}>
                          <div style={{
                            fontSize: 9, fontWeight: 900, color: 'rgba(245,236,215,0.7)',
                            fontFamily: 'system-ui', letterSpacing: '.1em',
                            textTransform: 'uppercase',
                          }}>
                            {beat.beat_title || `Scene ${i + 1}`}
                          </div>
                        </div>

                        {/* Edit overlay */}
                        <div className="edit-overlay" style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(8,6,4,0.65)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: 0, transition: 'opacity .2s',
                        }}>
                          <div style={{
                            padding: '8px 14px', borderRadius: 100,
                            background: 'rgba(196,151,59,0.2)',
                            border: '1px solid rgba(196,151,59,0.4)',
                            fontSize: 10, fontWeight: 900,
                            letterSpacing: '.2em', textTransform: 'uppercase',
                            color: '#C4973B', fontFamily: 'system-ui',
                          }}>
                            ✏ Edit Scene
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <VisualStoryboard
                  storyboard={story.storyboard!}
                  generatedImages={localImages || []}
                  currentBeatIndex={selectedBeatIndex}
                  onBeatClick={setSelectedBeatIndex}
                  onReorderBeats={onReorderBeats}
                />
              </section>
            )}

            {/* Timeline with Time Capsule buttons */}
            {hasTimeline && (
              <section className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight">Life Chronology</h3>
                  <div className="w-8 h-0.5 bg-heritage-burgundy/20 mx-auto mt-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-heritage-inkMuted/40 mt-1">
                    Hover any event · tap 🕰️ to see what the world looked like that year
                  </p>
                </div>
                <div className="space-y-2">
                  {story.extraction!.timeline.map((event: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 bg-heritage-linen/60 border border-heritage-parchment rounded-2xl px-5 py-4 group hover:border-heritage-burgundy/30 transition-all">
                      <div className="flex-shrink-0 pt-0.5">
                        <span className="text-heritage-burgundy font-mono font-black text-base tracking-tighter">{event.year}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-black text-heritage-ink text-sm leading-snug">{event.event}</p>
                        {event.significance && <p className="text-heritage-inkMuted font-serif italic text-xs mt-1 leading-relaxed">"{event.significance}"</p>}
                      </div>
                      <button
                        onClick={() => { setTimeCapsuleYear(event.year); setTimeCapsuleLocation(story.extraction?.locations?.[0]?.name); }}
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-heritage-burgundy/10"
                        title={`What was happening in ${event.year}?`}
                        style={{ border: '1px solid rgba(139,46,59,0.2)' }}
                      >
                        <span className="text-sm">🕰️</span>
                      </button>
                    </div>
                  ))}
                </div>
                <TimelineVisualizer timeline={story.extraction!.timeline} images={localImages || []} />
              </section>
            )}

            {hasImages && (
              <section className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight">Visual Archive</h3>
                  <div className="w-8 h-0.5 bg-heritage-burgundy/20 mx-auto mt-2" />
                </div>
                <ImageGallery images={localImages.filter(i => i.image_url)} />
              </section>
            )}

            {story.extraction?.key_quotes && story.extraction.key_quotes.length > 0 && (
              <section className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight">Their Own Words</h3>
                  <div className="w-8 h-0.5 bg-heritage-burgundy/20 mx-auto mt-2" />
                </div>
                <motion.div className="space-y-4" variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  {story.extraction.key_quotes.slice(0, 3).map((quote: string, i: number) => {
                    const cleanQuote = quote.replace(/^["""]+|["""]+$/g, '').trim();
                    return (
                      <motion.div key={i} className="relative group" variants={itemVariants}>
                        <blockquote className="bg-heritage-linen border-l-4 border-heritage-burgundy/30 px-8 py-6 pr-16 rounded-r-2xl font-serif italic text-heritage-ink/70 text-lg leading-relaxed">{cleanQuote}</blockquote>
                        <button onClick={() => narrateQuote(cleanQuote, i)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-40 group-hover:opacity-100" style={{ background: speakingQuote === i ? 'rgba(139,46,59,0.15)' : 'rgba(139,46,59,0.06)', border: '1px solid rgba(139,46,59,0.2)' }}>
                          {speakingQuote === i ? <span className="text-heritage-burgundy text-[10px] font-black animate-pulse">■</span> : <span className="text-heritage-burgundy text-[10px]">♪</span>}
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </section>
            )}

            {story.extraction?.life_lessons && story.extraction.life_lessons.length > 0 && (
              <section className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight">Life Lessons</h3>
                  <div className="w-8 h-0.5 bg-heritage-burgundy/20 mx-auto mt-2" />
                </div>
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  {story.extraction.life_lessons.map((lesson: string, i: number) => (
                    <motion.div key={i} className="bg-heritage-linen/60 border border-heritage-parchment rounded-2xl px-6 py-4 text-sm font-serif italic text-heritage-ink/70 leading-relaxed" variants={itemVariants}>
                      <span className="text-heritage-burgundy/50 font-black not-italic mr-2">{i + 1}.</span>{lesson}
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button onClick={() => setIsViewerOpen(true)} className="px-10 py-5 bg-heritage-burgundy text-white font-black rounded-full shadow-2xl flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"><BookOpenIcon className="w-4 h-4" /> Open Storybook</button>
              <DownloadMemoryBook story={{ ...story, generatedImages: localImages, narrative: editedNarrative || story.narrative } as any} />
              <GenerateMovieButton story={story} />
              <button onClick={handleShareWithFamily} className="px-10 py-5 bg-heritage-cream border border-heritage-ink/10 text-heritage-ink font-black rounded-full shadow-sm flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:bg-heritage-linen transition-all"><ShareIcon className="w-4 h-4" />{copyFeedback ? 'Link Copied!' : 'Share with Family'}</button>
            </div>

            <div className="pt-4 pb-8">
              {isSharedView ? (
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-px bg-heritage-parchment mx-auto" />
                  <p className="text-base font-serif italic text-heritage-inkMuted leading-relaxed max-w-xs mx-auto">This story was lovingly preserved with Story Scribe.</p>
                  <a href="/" className="inline-flex items-center gap-3 px-10 py-4 bg-heritage-burgundy text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-heritage-burgundy/90 transition-all shadow-xl">✦ Begin Preserving Your Story</a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {onViewShelf && <button onClick={onViewShelf} className="flex items-center gap-3 px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95" style={{ background: 'linear-gradient(135deg, #2C1F0E, #1A1208)', color: '#C4973B', border: '1px solid rgba(196,151,59,0.3)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>📚 View All Preserved Stories</button>}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {onBack && <button onClick={onBack} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-heritage-inkMuted/40 hover:text-heritage-oxblood transition-colors">← Home</button>}
                    <button onClick={onRestart} className="inline-flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-heritage-inkMuted/40 hover:text-heritage-oxblood transition-colors group"><ArrowPathIcon className="w-3 h-3 transition-transform group-hover:rotate-180" />Start a new session</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'memory-lane' && <div className="h-full w-full"><MemoryLaneView story={story as any} /></div>}
        {activeTab === 'map' && <div className="h-full w-full"><MemoryMapView story={story as any} /></div>}
        {activeTab === 'heirlooms' && <div className="h-full w-full"><HeirloomsGallery artifacts={story.artifacts || []} /></div>}
        {activeTab === 'insights' && (
          <div className="h-full w-full overflow-y-auto bg-heritage-cream">
            <div className="max-w-2xl mx-auto p-6 lg:p-10">
              <div className="text-center mb-8">
                <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight">Story Insights</h3>
                <div className="w-8 h-0.5 bg-heritage-burgundy/20 mx-auto mt-2" />
                <p className="text-[9px] font-black uppercase tracking-widest text-heritage-inkMuted/40 mt-2">AI-extracted themes, tone, and characters</p>
              </div>
              {story.extraction && (
                <div className="bg-heritage-linen border border-heritage-parchment rounded-[2rem] overflow-hidden shadow-sm mb-4 p-6">
                  <InspirationPanel extraction={story.extraction as any} />
                </div>
              )}
              <div className="bg-heritage-linen border border-heritage-parchment rounded-[2rem] overflow-hidden shadow-sm">
                <WritingAssistantPanel storyData={{ storybook: { extraction: {
                  ...story.extraction,
                  family: story.extraction?.family || story.extraction?.people || [],
                } } } as any} />
              </div>
            </div>
          </div>
        )}
      </div>

      <StorybookViewer isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} story={{ ...story, generatedImages: localImages } as any} showToast={showToast} narratorVoice={narratorVoice} />

      <TimeCapsuleModal
        isOpen={!!timeCapsuleYear}
        onClose={() => setTimeCapsuleYear(null)}
        year={timeCapsuleYear || ''}
        location={timeCapsuleLocation}
      />

      {/* Image Edit Modal */}
      {sceneToEdit && (
        <ImageEditModal
          scene={sceneToEdit}
          onSave={handleImageEditSave}
          onClose={() => setSceneToEdit(null)}
        />
      )}

      <div className="fixed bottom-6 left-6 z-[250] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(it => it.id !== t.id))} />)}
      </div>
    </div>
  );
};
