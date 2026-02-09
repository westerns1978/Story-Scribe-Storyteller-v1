import React, { useMemo, useState, useEffect } from 'react';
import { StoryArchiveItem } from '../types';
import FileSadIcon from './icons/FileSadIcon';
import InfoIcon from './icons/InfoIcon';
import XMarkIcon from './icons/XMarkIcon';

const MemoryLaneView: React.FC<{ story: StoryArchiveItem | null }> = ({ story }) => {
    // 1. Hook Initialization (Unconditional)
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showDirectorial, setShowDirectorial] = useState(false);

    // CRITICAL: Robust memoization with null safety
    const storyBeats = useMemo(() => {
        if (!story) return [];
        const beats = story.storyboard?.story_beats || story.extraction?.storyboard?.story_beats || [];
        return Array.isArray(beats) ? beats : [];
    }, [story]);

    const validImages = useMemo(() => {
        if (!story || !story.generatedImages) return [];
        return story.generatedImages.filter(img => img && img.image_url && !img.error);
    }, [story]);

    // 2. Lifecycle logic
    useEffect(() => {
        if (storyBeats.length <= 1) return;
        const timer = setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % storyBeats.length);
        }, 12000); 
        return () => clearTimeout(timer);
    }, [currentIndex, storyBeats.length]);
    
    // 3. Early return for UI only after hooks
    if (!story || storyBeats.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 bg-black/90">
                <FileSadIcon className="w-20 h-20 text-white/5 mb-8" />
                <h3 className="text-3xl font-display font-black text-white tracking-tighter uppercase">Director's Cut Pending</h3>
                <p className="text-white/40 mt-3 max-w-md font-serif italic text-lg leading-relaxed">
                    This cinematic stream requires a multi-beat storyboard. Trigger the Scribe agent to initialize synthesis.
                </p>
            </div>
        );
    }
    
    const currentBeat = storyBeats[currentIndex] || storyBeats[0];
    // Attempt to find image by index, fallback to modulo matching
    const image = validImages.find(img => img.index === currentIndex) || validImages[currentIndex % (validImages.length || 1)];

    return (
        <div className="h-full w-full bg-black relative overflow-hidden font-serif group/container animate-fade-in">
            <style>{`
                @keyframes kenburns-pan {
                    0% { transform: scale(1.0) translate(0%, 0%); opacity: 0.7; }
                    50% { opacity: 1; }
                    100% { transform: scale(1.15) translate(-1%, 1%); opacity: 0.8; }
                }
                @keyframes fade-sequence {
                    0% { opacity: 0; transform: translateY(20px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
                .animate-kenburns { animation: kenburns-pan 12s ease-in-out infinite alternate; }
                .animate-sequence { animation: fade-sequence 12s ease-in-out forwards; }
            `}</style>
            
            <div className="absolute inset-0 bg-black"></div>
            
            {image && (
                <div key={`img-${currentIndex}`} className="absolute inset-0 z-0 animate-fade-in">
                    {image.video_url ? (
                        <video src={image.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover brightness-75" />
                    ) : (
                        <img 
                            src={image.image_url} 
                            className="w-full h-full object-cover animate-kenburns brightness-75 grayscale-[0.2]" 
                            alt="Scene" 
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black"></div>
                </div>
            )}

            <div key={`text-${currentIndex}`} className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center p-12 lg:p-24 pointer-events-none">
                <div className="max-w-5xl animate-sequence">
                    <span className="text-gemynd-red font-mono font-bold tracking-[0.6em] uppercase text-[10px] mb-8 block opacity-80">
                        Production Beat {currentIndex + 1} // Archive Master
                    </span>
                    <h2 className="text-6xl md:text-9xl font-display font-black text-white tracking-tighter drop-shadow-2xl">
                        {String(currentBeat?.beat_title || 'Scene Title')}
                    </h2>
                    <div className="w-24 h-0.5 bg-gemynd-red/40 mx-auto mb-10"></div>
                    <p className="text-2xl md:text-4xl text-white/90 font-serif leading-[1.6] italic drop-shadow-xl">
                        "{String(currentBeat?.narrative_chunk || '')}"
                    </p>
                </div>
            </div>

            <div className={`absolute top-0 right-0 h-full w-full max-w-md glass-tier-1 border-l border-white/5 z-50 transition-all duration-700 transform ${showDirectorial ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-12 flex flex-col h-full space-y-12">
                    <header className="flex justify-between items-center border-b border-white/10 pb-8">
                        <div>
                            <h3 className="text-white font-display font-bold text-2xl tracking-tight leading-none uppercase">Metadata</h3>
                            <p className="text-[9px] text-gemynd-red font-black uppercase tracking-widest mt-2">Lexington Node Output</p>
                        </div>
                        <button onClick={() => setShowDirectorial(false)} className="p-3 bg-white/5 rounded-full"><XMarkIcon className="w-5 h-5 text-white/60"/></button>
                    </header>
                    
                    <div className="space-y-10">
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Visual Logic</h4>
                            <p className="text-lg text-white/80 leading-relaxed font-serif italic">
                                {currentBeat?.visual_focus || "Archival cinematic composition."}
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Director's Notes</h4>
                            <p className="text-lg text-white/80 leading-relaxed font-serif italic">
                                {currentBeat?.directors_notes || "Focus on temporal depth and identity."}
                            </p>
                        </section>
                    </div>
                </div>
            </div>

            <div className="absolute top-10 right-10 z-40">
                <button 
                    onClick={() => setShowDirectorial(true)}
                    className="flex items-center gap-4 px-6 py-3 bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-105 active:scale-95"
                >
                    <InfoIcon className="w-5 h-5 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">View Specs</span>
                </button>
            </div>

            <div className="absolute bottom-[10vh] left-20 right-20 flex gap-2 h-1 z-30">
                {storyBeats.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`flex-1 transition-all duration-1000 rounded-full ${idx === currentIndex ? 'bg-gemynd-red shadow-[0_0_15px_#A82D2D]' : 'bg-white/10'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default MemoryLaneView;