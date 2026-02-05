import React, { useState, useEffect } from 'react';
import { 
  enhancePhoto, 
  EnhancementStyle,
  STYLE_INFO 
} from '../services/photoEnhancement';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';
import DownloadIcon from './icons/DownloadIcon';
import ImageIcon from './icons/ImageIcon';
import Loader2Icon from './icons/Loader2Icon';
import EyeIcon from './icons/EyeIcon';
import { UserTier } from '../types';

interface PhotoEnhancerProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoEnhanced: (originalUrl: string, enhancedPhotos: Record<string, string>) => void;
  tier?: UserTier;
  onUpgradeRequested?: () => void;
  initialFile?: File | string | null;
}

export const PhotoEnhancer: React.FC<PhotoEnhancerProps> = ({ 
  isOpen, 
  onClose, 
  onPhotoEnhanced, 
  tier = 'free',
  onUpgradeRequested,
  initialFile
}) => {
  const [originalPhoto, setOriginalPhoto] = useState<File | string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<EnhancementStyle[]>([]);
  const [enhancedImages, setEnhancedImages] = useState<Map<EnhancementStyle, string>>(new Map());
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{url: string, name: string} | null>(null);

  useEffect(() => {
      if (isOpen && initialFile) {
          setOriginalPhoto(initialFile);
          if (typeof initialFile === 'string') {
              setOriginalPreview(initialFile);
          } else {
              setOriginalPreview(URL.createObjectURL(initialFile));
          }
          setEnhancedImages(new Map());
          setSelectedStyles(['pro_portrait']);
      }
  }, [isOpen, initialFile]);

  if (!isOpen) return null;

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalPhoto(file);
      setOriginalPreview(URL.createObjectURL(file));
      setEnhancedImages(new Map());
      setSelectedStyles(['pro_portrait']);
    }
  };

  const toggleStyle = (style: EnhancementStyle) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleEnhance = async () => {
    if (!originalPhoto || selectedStyles.length === 0) return;

    setIsEnhancing(true);
    const newEnhancedMap = new Map(enhancedImages);
    const vaultUrls: Record<string, string> = {};

    try {
      for (const style of selectedStyles) {
        const result = await enhancePhoto(originalPhoto, style, (msg) => setCurrentProgress(msg));
        newEnhancedMap.set(style, result.imageData);
        setEnhancedImages(new Map(newEnhancedMap));
        vaultUrls[style] = result.imageData;
      }
      setCurrentProgress('✨ Complete!');
      onPhotoEnhanced(originalPreview || '', vaultUrls);
    } catch (error: any) {
      setCurrentProgress(`❌ Failed`);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col h-full">
        <header className="p-4 lg:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-xl sticky top-0 z-30 rounded-t-3xl">
            <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-gemynd-gold" />
                <div>
                    <h2 className="text-lg lg:text-xl font-display font-bold text-white leading-none">Restore Studio</h2>
                    <p className="text-[8px] font-black text-gemynd-gold uppercase tracking-widest mt-1">Archive Node Active</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><XMarkIcon className="w-5 h-5" /></button>
        </header>

        <main className="flex-1 bg-black/20 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            {!originalPhoto ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                    <label className="w-full max-w-sm aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5 hover:border-gemynd-gold/50 transition-all cursor-pointer p-8">
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <ImageIcon className="w-12 h-12 text-white/20 mb-4" />
                        <span className="text-xl font-display font-bold text-white mb-2">Upload Memory</span>
                        <span className="text-[10px] uppercase font-black text-white/30 tracking-widest leading-relaxed">Select a historical artifact for restoration</span>
                    </label>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row w-full h-full lg:overflow-hidden">
                    {/* Controls Sidebar - Moves to Top/Vertical on mobile */}
                    <div className="w-full lg:w-80 p-6 lg:p-8 bg-black/40 lg:border-r border-white/5 flex flex-col h-auto lg:h-full gap-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest">Target Artifact</h3>
                                <button onClick={() => setOriginalPhoto(null)} className="text-[9px] font-black text-gemynd-gold uppercase underline">Replace</button>
                            </div>
                            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-w-[120px] lg:max-w-none">
                                <img src={originalPreview!} className="w-full h-auto" alt="Original" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[300px] lg:max-h-none">
                            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Style Matrix</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {(Object.entries(STYLE_INFO) as [EnhancementStyle, any][]).map(([style, info]) => (
                                    <button 
                                        key={style}
                                        onClick={() => toggleStyle(style)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${selectedStyles.includes(style) ? 'bg-gemynd-gold text-black border-gemynd-gold shadow-lg' : 'bg-white/5 border-white/5 text-white/60'}`}
                                    >
                                        <span className="text-xl">{info.icon}</span>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[10px] font-black uppercase leading-tight truncate">{info.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-4">
                            <button 
                                onClick={handleEnhance}
                                disabled={isEnhancing || selectedStyles.length === 0}
                                className="w-full py-5 bg-gemynd-red text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-[0.3em] disabled:opacity-20"
                            >
                                {isEnhancing ? 'Processing...' : 'Restore Memory'}
                            </button>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 p-6 lg:p-12 overflow-y-auto">
                        {enhancedImages.size === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-10 py-12">
                                <ImageIcon className="w-20 h-20 mb-4" />
                                <p className="font-serif italic text-xl">Choose your restoration visions to begin.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-10 pb-20">
                                {Array.from(enhancedImages.entries()).map(([style, data]) => (
                                    <div key={style} className="obsidian-card rounded-3xl p-4 border border-white/5 group relative">
                                        <div className="aspect-[4/5] rounded-2xl overflow-hidden relative">
                                            <img src={data} className="w-full h-full object-cover" alt={style} />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={() => setPreviewImage({url: data, name: STYLE_INFO[style].name})} className="p-3 bg-white text-black rounded-full"><EyeIcon className="w-5 h-5" /></button>
                                                <a href={data} download={`Gemynd_${style}.png`} className="p-3 bg-gemynd-red text-white rounded-full"><DownloadIcon className="w-5 h-5" /></a>
                                            </div>
                                        </div>
                                        <div className="mt-4 px-2">
                                            <h4 className="text-[10px] font-black text-gemynd-gold uppercase tracking-widest mb-1">{STYLE_INFO[style].name}</h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>

        {previewImage && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                <img src={previewImage.url} className="max-h-[80vh] w-auto rounded-2xl shadow-2xl mb-6" alt="Preview" />
                <button className="px-10 py-4 bg-gemynd-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Close Artifact</button>
            </div>
        )}
    </div>
  );
};