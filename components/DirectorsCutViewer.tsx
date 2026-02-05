import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StoryArchiveItem, GeneratedImage, StoryBeat } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import InfoIcon from './icons/InfoIcon';

interface DirectorsCutViewerProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | null;
}

const KEN_BURNS_VARIANTS = [
  'animate-ken-burns-zoom-in',
  'animate-ken-burns-zoom-out',
  'animate-ken-burns-pan-left',
  'animate-ken-burns-pan-right',
  'animate-ken-burns-drift-up',
];

const DirectorsCutViewer: React.FC<DirectorsCutViewerProps> = ({ isOpen, onClose, story }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sceneDuration, setSceneDuration] = useState(12000); // Default 12s
    const [showNotes, setShowNotes] = useState(false);
    const timerRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // SAFE ACCESS TO STORY DATA
    const storyBeats = useMemo(() => {
        if (!story) return [];
        return story.storyboard?.story_beats || story.extraction?.storyboard?.story_beats || [];
    }, [story]);
    
    const images = useMemo(() => {
        if (!story) return [];
        return story.generatedImages || [];
    }, [story]);
    
    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        if (storyBeats.length > 0 && isPlaying) {
            timerRef.current = window.setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % storyBeats.length);
            }, sceneDuration);
        }
    }, [storyBeats.length, isPlaying, stopTimer, sceneDuration]);
    
    useEffect(() => {
        if (isOpen && storyBeats.length > 0) {
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
            setCurrentIndex(0);
        }
    }, [isOpen, storyBeats.length]);
    
    useEffect(() => {
        if (isPlaying) {
            startTimer();
        } else {
            stopTimer();
        }
        return stopTimer;
    }, [isPlaying, currentIndex, startTimer, stopTimer, sceneDuration]);

    const getKenBurnsClass = (index: number) => {
        return KEN_BURNS_VARIANTS[index % KEN_BURNS_VARIANTS.length];
    };

    if (!isOpen || !story || storyBeats.length === 0) return null;
    
    const currentBeat = storyBeats[currentIndex] || storyBeats[0];
    const currentImage = images.find(img => img.index === currentIndex);
    const hasVideo = !!currentImage?.video_url;

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col justify-center items-center overflow-hidden animate-fade-in" role="dialog" aria-label="Director's Cut Viewer">
            <style>{`
                @keyframes ken-burns-zoom-in {
                    0% { transform: scale(1.0) translate(0, 0); }
                    100% { transform: scale(1.2) translate(-2%, -2%); }
                }
                @keyframes ken-burns-zoom-out {
                    0% { transform: scale(1.25) translate(-3%, -3%); }
                    100% { transform: scale(1.0) translate(0, 0); }
                }
                @keyframes ken-burns-pan-left {
                    0% { transform: scale(1.15) translate(3%, 0); }
                    100% { transform: scale(1.15) translate(-3%, 0); }
                }
                @keyframes ken-burns-pan-right {
                    0% { transform: scale(1.15) translate(-3%, 0); }
                    100% { transform: scale(1.15) translate(3%, 0); }
                }
                @keyframes ken-burns-drift-up {
                    0% { transform: scale(1.1) translate(0, 3%); }
                    100% { transform: scale(1.15) translate(0, -3%); }
                }
                
                .animate-ken-burns-zoom-in { animation: ken-burns-zoom-in 15s ease-in-out forwards; }
                .animate-ken-burns-zoom-out { animation: ken-burns-zoom-out 15s ease-in-out forwards; }
                .animate-ken-burns-pan-left { animation: ken-burns-pan-left 15s ease-in-out forwards; }
                .animate-ken-burns-pan-right { animation: ken-burns-pan-right 15s ease-in-out forwards; }
                .animate-ken-burns-drift-up { animation: ken-burns-drift-up 15s ease-in-out forwards; }
                
                @keyframes text-reveal {
                    0% { opacity: 0; transform: translateY(30px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-text-reveal { animation: text-reveal 1.5s ease-out forwards; }
                .animate-text-reveal-delay { animation: text-reveal 1.5s ease-out 0.3s forwards; opacity: 0; }

                .letterbox::before,
                .letterbox::after {
                    content: '';
                    position: absolute;left: 0;
                    right: 0;
                    height: 8%;
                    background: black;
                    z-index: 30;
                }
                .letterbox::before { top: 0; }
                .letterbox::after { bottom: 0; }

                .scene-container {
                    transition: opacity 1.5s ease-in-out;
                }
                .progress-bar-fill { animation: progress-fill linear forwards; }
                @keyframes progress-fill {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>

            <div className="absolute inset-0 letterbox overflow-hidden">
                <div key={currentIndex} className="absolute inset-0 w-full h-full animate-fade-in scene-container">
                    {hasVideo ? (
                        <video 
                            ref={videoRef} 
                            src={currentImage?.video_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : currentImage?.image_url ? (
                        <img 
                            src={currentImage.image_url} 
                            className={`w-full h-full object-cover ${getKenBurnsClass(currentIndex)}`} 
                            alt="Scene" 
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700 font-serif italic text-2xl">
                            Visualizing "{currentBeat?.beat_title || 'Scene'}"...
                        </div>
                    )}
                    {/* Cinematic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 z-10"></div>
                    
                    {/* Narrative Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-12 md:p-24 lg:p-32 z-20 pointer-events-none">
                        <div className="max-w-5xl mx-auto">
                            <div className="mb-4 flex items-center gap-3">
                                <span className="text-amber-500 font-mono font-bold tracking-[0.5em] uppercase text-xs animate-text-reveal">
                                    {currentIndex + 1} / {storyBeats.length}
                                </span>
                                {hasVideo && (
                                    <div className="px-2 py-0.5 bg-blue-600 rounded text-[8px] font-bold text-white uppercase tracking-widest shadow-lg animate-text-reveal">Living Portrait</div>
                                )}
                            </div>
                            <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-6 tracking-tighter drop-shadow-2xl animate-text-reveal">
                                {currentBeat?.beat_title || 'Untitled Beat'}
                            </h2>
                            <p className="text-xl md:text-3xl text-white/90 font-serif leading-relaxed italic drop-shadow-xl animate-text-reveal-delay">
                                "{currentBeat?.narrative_chunk || ''}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Directorial Insight Overlay */}
            {showNotes && currentBeat && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 md:p-20 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowNotes(false)}>
                    <div className="w-full max-w-4xl bg-slate-900/80 border border-white/10 p-10 md:p-20 rounded-[4rem] heirloom-shadow space-y-12" onClick={e => e.stopPropagation()}>
                        <header className="flex justify-between items-center border-b border-white/5 pb-8">
                            <div>
                                <p className="text-amber-500 font-mono text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Beat Production Specs</p>
                                <h3 className="text-3xl font-display font-bold text-white tracking-tight">{currentBeat.beat_title}</h3>
                            </div>
                            <button onClick={() => setShowNotes(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 transition-all">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </header>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Visual Focus
                                </h4>
                                <p className="text-lg text-slate-300 leading-relaxed font-serif italic">
                                    "{currentBeat.visual_focus || 'Awaiting artist specifications...'}"
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Director's Notes
                                </h4>
                                <p className="text-lg text-slate-300 leading-relaxed font-serif italic">
                                    "{currentBeat.directors_notes || 'Natural movement and emotional resonance.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Top Bar Navigation */}
            <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-40 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                    <span>Pace:</span>
                    <div className="flex bg-white/5 p-1 rounded-lg gap-1 border border-white/10">
                        <button onClick={() => setSceneDuration(8000)} className={`px-3 py-1 rounded-md transition-colors ${sceneDuration === 8000 ? 'bg-amber-500 text-black' : 'hover:bg-white/10'}`}>Fast</button>
                        <button onClick={() => setSceneDuration(12000)} className={`px-3 py-1 rounded-md transition-colors ${sceneDuration === 12000 ? 'bg-amber-500 text-black' : 'hover:bg-white/10'}`}>Normal</button>
                        <button onClick={() => setSceneDuration(18000)} className={`px-3 py-1 rounded-md transition-colors ${sceneDuration === 18000 ? 'bg-amber-500 text-black' : 'hover:bg-white/10'}`}>Slow</button>
                    </div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowNotes(!showNotes)}
                        className={`p-3 rounded-full backdrop-blur-md transition-all border border-white/20 flex items-center gap-3 px-6 ${showNotes ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <InfoIcon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Director's Notes</span>
                    </button>
                    <button onClick={onClose} className="p-3 rounded-full bg-white/10 hover:bg-gemynd-red text-white backdrop-blur-md transition-all border border-white/20">
                        <XMarkIcon className="w-8 h-8"/>
                    </button>
                </div>
            </div>
            
            {/* Controls Bar */}
            <div className="absolute bottom-12 left-0 right-0 z-40 px-10 md:px-20">
                <div className="max-w-6xl mx-auto">
                    <div className="w-full h-1 bg-white/10 rounded-full mb-10 overflow-hidden">
                        {isPlaying && (
                            <div 
                                key={`${currentIndex}-${sceneDuration}`}
                                className="h-full bg-amber-500 origin-left progress-bar-fill shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                style={{ animationDuration: `${sceneDuration}ms` }}
                            />
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <button onClick={() => setCurrentIndex(prev => (prev - 1 + storyBeats.length) % storyBeats.length)} className="p-4 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <ArrowLeftIcon className="w-10 h-10"/>
                        </button>
                        
                        <button onClick={() => setIsPlaying(!isPlaying)} className="p-6 bg-white rounded-full text-slate-900 shadow-2xl hover:scale-110 transition-transform active:scale-95">
                            {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                        </button>

                        <button onClick={() => setCurrentIndex(prev => (prev + 1) % storyBeats.length)} className="p-4 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <ArrowRightIcon className="w-10 h-10"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Film Grain Layer */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] film-grain z-[35]"></div>
        </div>
    );
};

export default DirectorsCutViewer;