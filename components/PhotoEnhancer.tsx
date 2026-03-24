import React, { useState, useEffect } from 'react';
import {
  enhancePhoto,
  EnhancementStyle,
  STYLE_INFO
} from '../services/photoEnhancement';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';
import ImageIcon from './icons/ImageIcon';
import CheckIcon from './icons/CheckIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import Loader2Icon from './icons/Loader2Icon';

interface PhotoEnhancerProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoEnhanced: (originalUrl: string, enhancedPhotos: Record<string, string>) => void;
  initialFile?: File | string | null;
}

// ── All 10 styles grouped into visual categories ──────────────────────────
const STYLE_GROUPS: { label: string; styles: EnhancementStyle[] }[] = [
  {
    label: 'Restoration',
    styles: ['restore', 'pro_portrait'],
  },
  {
    label: 'Fine Art',
    styles: ['ink_sketch', 'old_master', 'silver_daguerreotype'],
  },
  {
    label: 'Atmosphere',
    styles: ['guler_noir', 'emerald_vintage', 'coffee_dust'],
  },
  {
    label: 'Dreamscape',
    styles: ['cloud_spirit', 'visionary_blueprint'],
  },
];

// Flat ordered list for iteration
const ALL_STYLES = STYLE_GROUPS.flatMap(g => g.styles);

export const PhotoEnhancer: React.FC<PhotoEnhancerProps> = ({
  isOpen,
  onClose,
  onPhotoEnhanced,
  initialFile
}) => {
  const [originalPhoto, setOriginalPhoto] = useState<File | string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<EnhancementStyle[]>(['restore']);
  const [enhancedImages, setEnhancedImages] = useState<Map<EnhancementStyle, string>>(new Map());
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string>('');
  const [currentStyleProcessing, setCurrentStyleProcessing] = useState<EnhancementStyle | null>(null);
  const [addedToStory, setAddedToStory] = useState<Set<EnhancementStyle>>(new Set());

  useEffect(() => {
    if (isOpen && initialFile) {
      setOriginalPhoto(initialFile);
      if (typeof initialFile === 'string') setOriginalPreview(initialFile);
      else setOriginalPreview(URL.createObjectURL(initialFile));
    }
  }, [isOpen, initialFile]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalPhoto(file);
      setOriginalPreview(URL.createObjectURL(file));
      setEnhancedImages(new Map());
      setAddedToStory(new Set());
    }
  };

  const toggleStyle = (style: EnhancementStyle) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.length === 1 ? prev  // keep at least 1 selected
          : prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const handleEnhance = async () => {
    if (!originalPhoto || selectedStyles.length === 0) return;
    setIsEnhancing(true);
    const newMap = new Map(enhancedImages);

    try {
      for (const style of selectedStyles) {
        setCurrentStyleProcessing(style);
        setCurrentProgress(STYLE_INFO[style].statusMsg);
        const result = await enhancePhoto(originalPhoto, style, (msg) => setCurrentProgress(msg));
        newMap.set(style, result.imageData);
        setEnhancedImages(new Map(newMap));
      }
      setCurrentProgress('Synthesis Complete');
    } catch (error: any) {
      setCurrentProgress('Node Error — check console');
      console.error('[PhotoEnhancer]', error);
    } finally {
      setIsEnhancing(false);
      setCurrentStyleProcessing(null);
    }
  };

  const handleAdd = (style: EnhancementStyle) => {
    const data = enhancedImages.get(style);
    if (data) {
      onPhotoEnhanced(originalPreview!, { [style]: data });
      setAddedToStory(prev => new Set(prev).add(style));
    }
  };

  const handleAddAll = () => {
    const result: Record<string, string> = {};
    enhancedImages.forEach((data, style) => { result[style] = data; });
    if (Object.keys(result).length > 0) {
      onPhotoEnhanced(originalPreview!, result);
      setAddedToStory(new Set(Array.from(enhancedImages.keys())));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col bg-[#0D0B0A] text-white animate-fade-in relative">

      {/* Header */}
      <header className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gemynd-oxblood rounded-2xl shadow-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-black tracking-tight">Restore Studio</h2>
            <p className="text-[10px] font-bold text-gemynd-agedGold uppercase tracking-[0.4em] mt-1">
              Archive Artisan · {ALL_STYLES.length} Styles Available
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <XMarkIcon className="w-6 h-6 text-white/60" />
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* ── No photo uploaded ── */}
        {!originalPhoto ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <label className="w-full max-w-lg aspect-video border-2 border-dashed border-white/10 bg-white/[0.02] rounded-[3.5rem] hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col items-center justify-center p-12 group">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <ImageIcon className="w-16 h-16 text-white/10 group-hover:scale-110 transition-transform mb-6" />
              <h3 className="text-3xl font-display font-black mb-2">Initialize Artifact</h3>
              <p className="text-sm text-white/30 font-serif italic">Select a faded memory for neural restoration</p>
            </label>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">

            {/* ── Left sidebar: photo + style selector ── */}
            <div className="w-full lg:w-96 p-8 bg-black/60 border-r border-white/5 overflow-y-auto space-y-10 flex-shrink-0">

              {/* Source photo */}
              <section>
                <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">Source Material</h3>
                <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative group aspect-[4/5] bg-slate-900">
                  <img src={originalPreview!} className="w-full h-full object-cover grayscale-[0.3]" alt="Source" />
                  <button
                    onClick={() => { setOriginalPhoto(null); setEnhancedImages(new Map()); setAddedToStory(new Set()); }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-widest"
                  >
                    Replace Memory
                  </button>
                </div>
              </section>

              {/* Style selector — all 10, grouped */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
                    Artisan Directives
                  </h3>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                    {selectedStyles.length} selected
                  </span>
                </div>

                {STYLE_GROUPS.map(group => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">{group.label}</p>
                    {group.styles.map(style => {
                      const isSelected = selectedStyles.includes(style);
                      const isProcessing = currentStyleProcessing === style && isEnhancing;
                      const isDone = enhancedImages.has(style);
                      return (
                        <button
                          key={style}
                          onClick={() => toggleStyle(style)}
                          disabled={isEnhancing}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left relative ${
                            isSelected
                              ? 'bg-gemynd-oxblood border-gemynd-oxblood text-white shadow-lg'
                              : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05] hover:border-white/10'
                          }`}
                        >
                          <span
                            className="text-xl flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ backgroundColor: STYLE_INFO[style].color + '22', color: STYLE_INFO[style].color }}
                          >
                            {STYLE_INFO[style].icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black uppercase tracking-widest truncate">{STYLE_INFO[style].name}</p>
                            <p className="text-[9px] opacity-60 mt-0.5 truncate">{STYLE_INFO[style].description}</p>
                          </div>
                          {/* Status indicators */}
                          {isProcessing && (
                            <Loader2Icon className="w-4 h-4 animate-spin flex-shrink-0 text-white/60" />
                          )}
                          {isDone && !isProcessing && (
                            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                              <CheckIcon className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          {isSelected && !isDone && !isProcessing && (
                            <div className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </section>

              {/* Synthesize CTA */}
              <button
                onClick={handleEnhance}
                disabled={isEnhancing || selectedStyles.length === 0}
                className="w-full py-6 bg-white text-black font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all text-[11px] uppercase tracking-[0.4em] disabled:opacity-20 flex items-center justify-center gap-3 haptic-tap"
              >
                {isEnhancing ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    <span className="truncate max-w-[160px]">{currentProgress || 'Synthesizing...'}</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    {`Materialize ${selectedStyles.length} Vision${selectedStyles.length !== 1 ? 's' : ''}`}
                  </>
                )}
              </button>
            </div>

            {/* ── Right panel: results grid ── */}
            <div className="flex-1 p-12 lg:p-16 overflow-y-auto bg-[#050404]">
              {enhancedImages.size === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <SparklesIcon className="w-24 h-24 mb-6" />
                  <p className="font-serif italic text-2xl max-w-md leading-relaxed">
                    Select one or more directives, then press Materialize.
                  </p>
                </div>
              ) : (
                <>
                  {/* Add All button if multiple results */}
                  {enhancedImages.size > 1 && (
                    <div className="flex justify-end mb-8">
                      <button
                        onClick={handleAddAll}
                        className="px-8 py-4 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black rounded-2xl text-[11px] uppercase tracking-widest hover:bg-emerald-600/30 transition-all flex items-center gap-3"
                      >
                        <BookOpenIcon className="w-4 h-4" />
                        Add All {enhancedImages.size} to Story
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-32">
                    {Array.from(enhancedImages.entries()).map(([style, data]) => (
                      <div key={style} className="space-y-6 animate-appear group/artifact">
                        <div className="aspect-[4/5] rounded-[3.5rem] overflow-hidden border border-white/10 relative bg-black shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                          <img
                            src={data}
                            className="w-full h-full object-cover transition-transform duration-[6s] group-hover/artifact:scale-110"
                            alt={STYLE_INFO[style].name}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 pointer-events-none" />
                          {/* Style color accent bar */}
                          <div
                            className="absolute top-0 left-0 w-full h-1 opacity-60"
                            style={{ backgroundColor: STYLE_INFO[style].color }}
                          />
                          <div className="absolute bottom-10 left-10 right-10">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{STYLE_INFO[style].icon}</span>
                              <h4 className="font-display font-black text-2xl tracking-tight">{STYLE_INFO[style].name}</h4>
                            </div>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{STYLE_INFO[style].description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAdd(style)}
                          disabled={addedToStory.has(style)}
                          className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl haptic-tap ${
                            addedToStory.has(style)
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gemynd-oxblood text-white hover:bg-[#B33535] active:scale-95'
                          }`}
                        >
                          {addedToStory.has(style)
                            ? <><CheckIcon className="w-4 h-4" /> Saved to Story Bin</>
                            : <><BookOpenIcon className="w-4 h-4" /> Add to Story</>
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};
