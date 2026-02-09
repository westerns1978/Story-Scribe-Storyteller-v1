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

  const handleEnhance = async () => {
    if (!originalPhoto || selectedStyles.length === 0) return;
    setIsEnhancing(true);
    const newEnhancedMap = new Map(enhancedImages);
    try {
      for (const style of selectedStyles) {
        const result = await enhancePhoto(originalPhoto, style, (msg) => setCurrentProgress(msg));
        newEnhancedMap.set(style, result.imageData);
        setEnhancedImages(new Map(newEnhancedMap));
      }
      setCurrentProgress('Synthesis Ready');
    } catch (error: any) {
      setCurrentProgress(`Node Error`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAdd = (style: EnhancementStyle) => {
    const data = enhancedImages.get(style);
    if (data) {
        onPhotoEnhanced(originalPreview!, { [style]: data });
        setAddedToStory(prev => new Set(prev).add(style));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col bg-[#0D0B0A] text-white animate-fade-in relative">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl z-20">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gemynd-oxblood rounded-2xl shadow-lg">
                    <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-display font-black tracking-tight">Restore Studio</h2>
                    <p className="text-[10px] font-bold text-gemynd-agedGold uppercase tracking-[0.4em] mt-1">Heritage Artisan node</p>
                </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><XMarkIcon className="w-6 h-6 text-white/60" /></button>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
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
                    <div className="w-full lg:w-96 p-8 bg-black/60 border-r border-white/5 overflow-y-auto space-y-12">
                        <section>
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-6">Source Material</h3>
                            <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative group aspect-[4/5] bg-slate-900">
                                <img src={originalPreview!} className="w-full h-full object-cover grayscale-[0.3]" alt="Source" />
                                <button onClick={() => setOriginalPhoto(null)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-widest">Replace Memory</button>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">Artisan Directives</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {(['restore', 'pro_portrait', 'guler_noir'] as EnhancementStyle[]).map(style => (
                                    <button 
                                        key={style}
                                        onClick={() => setSelectedStyles([style])}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedStyles.includes(style) ? 'bg-gemynd-oxblood border-gemynd-oxblood text-white shadow-lg' : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]'}`}
                                    >
                                        <span className="text-lg">{STYLE_INFO[style].icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black uppercase tracking-widest">{STYLE_INFO[style].name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <button 
                            onClick={handleEnhance}
                            disabled={isEnhancing}
                            className="w-full py-6 bg-white text-black font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all text-[11px] uppercase tracking-[0.4em] disabled:opacity-20 flex items-center justify-center gap-3 haptic-tap"
                        >
                            {isEnhancing ? (
                                <>
                                    <Loader2Icon className="w-4 h-4 animate-spin" />
                                    {currentProgress || 'Synthesizing...'}
                                </>
                            ) : 'Materialize Vision'}
                        </button>
                    </div>

                    <div className="flex-1 p-12 lg:p-24 overflow-y-auto bg-[#050404]">
                        {enhancedImages.size === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                <SparklesIcon className="w-24 h-24 mb-6" />
                                <p className="font-serif italic text-2xl max-w-md leading-relaxed">The Artisan node is awaiting instructions to begin visual synthesis.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-32">
                                {Array.from(enhancedImages.entries()).map(([style, data]) => (
                                    <div key={style} className="space-y-6 animate-appear group/artifact">
                                        <div className="aspect-[4/5] rounded-[3.5rem] overflow-hidden border border-white/10 relative bg-black shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                                            <img src={data} className="w-full h-full object-cover transition-transform duration-[6s] group-hover/artifact:scale-110" alt={style} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                                            <div className="absolute bottom-10 left-10 right-10">
                                                <h4 className="font-display font-black text-3xl mb-2 tracking-tight">{STYLE_INFO[style].name}</h4>
                                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{STYLE_INFO[style].description}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleAdd(style)}
                                            disabled={addedToStory.has(style)}
                                            className={`w-full py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl haptic-tap ${addedToStory.has(style) ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-gemynd-oxblood text-white hover:bg-[#B33535] active:scale-95'}`}
                                        >
                                            {addedToStory.has(style) ? <><CheckIcon className="w-4 h-4"/> Saved to Story Bin</> : <><BookOpenIcon className="w-4 h-4"/> Add to Story Creation</>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    </div>
  );
};