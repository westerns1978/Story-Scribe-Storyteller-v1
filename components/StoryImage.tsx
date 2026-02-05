import React, { useState, useEffect } from 'react';
import BrokenImageIcon from './icons/BrokenImageIcon';
import ProviderBadge from './ProviderBadge';
import SparklesIcon from './icons/SparklesIcon';
import Loader2Icon from './icons/Loader2Icon';

interface StoryImageProps {
    src: string;
    alt: string;
    provider?: string;
    scene?: string;
}

const StoryImage: React.FC<StoryImageProps> = ({ src, alt, provider, scene }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Specific "Generating" or "Loading" state
    const isGenerating = !src || src === 'generating' || src.includes('placeholder');

    if (isGenerating) {
         return (
            <div className="w-full h-full bg-gemynd-linen/50 dark:bg-white/5 rounded-2xl flex flex-col items-center justify-center p-8 aspect-square border border-gemynd-ink/5 dark:border-white/10 relative overflow-hidden group">
                {/* Cinematic Aura Effect */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gemynd-oxblood/10 blur-[40px] rounded-full animate-pulse"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 blur-[60px] rounded-full animate-breathe"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white dark:bg-black/40 rounded-full flex items-center justify-center shadow-xl border border-gemynd-ink/5 dark:border-white/5 mb-6 group-hover:scale-110 transition-transform duration-700">
                        <SparklesIcon className="w-8 h-8 text-gemynd-oxblood dark:text-gemynd-agedGold animate-pulse" />
                    </div>
                    <div className="space-y-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gemynd-oxblood dark:text-gemynd-agedGold">Synthesizing Vision</p>
                        <p className="text-xs text-gemynd-ink/40 dark:text-white/30 italic font-serif max-w-[140px] leading-relaxed">The Artisan is painting this scene into history...</p>
                    </div>
                </div>

                {/* Progress bar decoration */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gemynd-linen dark:bg-white/5">
                    <div className="h-full bg-gemynd-oxblood/20 animate-infinite-scroll w-1/3"></div>
                </div>

                <style>{`
                    @keyframes infinite-scroll {
                        from { transform: translateX(-100%); }
                        to { transform: translateX(300%); }
                    }
                    .animate-infinite-scroll {
                        animation: infinite-scroll 2s ease-in-out infinite;
                    }
                    @keyframes breathe {
                        0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
                        50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
                    }
                    .animate-breathe {
                        animation: breathe 4s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="w-full h-full bg-gemynd-linen dark:bg-white/5 rounded-2xl flex flex-col items-center justify-center p-8 aspect-square border border-red-500/20">
                <BrokenImageIcon className="w-12 h-12 text-red-500/40 mb-4" />
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60">Node Error</p>
                    <p className="text-xs text-slate-400 font-serif italic">Artifact data unreadable.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-slate-900 aspect-square shadow-xl transition-all duration-700 hover:shadow-2xl">
            {/* Smooth transition from loading to image */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gemynd-linen dark:bg-white/5 flex flex-col items-center justify-center z-10 animate-pulse transition-opacity duration-1000">
                    <div className="relative">
                        <Loader2Icon className="w-8 h-8 text-gemynd-oxblood/20 dark:text-white/20 animate-spin" />
                        <SparklesIcon className="w-4 h-4 text-gemynd-oxblood dark:text-gemynd-agedGold absolute -top-1 -right-1 animate-pulse" />
                    </div>
                </div>
            )}
            
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-all duration-[2000ms] ${isLoaded ? 'scale-100 opacity-100' : 'scale-110 opacity-0'} group-hover:scale-105 group-hover:brightness-110`}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                loading="lazy"
            />
            
            {/* Cinematic Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {provider && <ProviderBadge provider={provider} />}
            
            {scene && (
                <div className="absolute bottom-4 left-4 right-4 text-center opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-2 group-hover:translate-y-0">
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-md">{scene}</p>
                </div>
            )}
        </div>
    );
};

export default StoryImage;