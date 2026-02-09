import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StoryArchiveItem } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import { generatePages } from '../utils/storybookUtils';
import BookOpenIcon from './icons/BookOpenIcon';
import FilmIcon from './icons/FilmIcon';
import MapIcon from './icons/MapIcon';
import PlayCircleIcon from './icons/PlayCircleIcon';
import PauseCircleIcon from './icons/PauseCircleIcon';
import ShareIcon from './icons/ShareIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import MemoryLaneView from './MemoryLaneView';
import MemoryMapView from './MemoryMapView';
import HeirloomsGallery from './HeirloomsGallery'; 
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import StopIcon from './icons/StopIcon';
import { generateNarration } from '../services/api';
import { decode, decodeAudioData } from '../utils/audioUtils';
import ErrorBoundary from './ErrorBoundary';

interface StorybookViewerProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | null;
    onSave?: (story: StoryArchiveItem) => void;
    onDownloadPdf?: (story: StoryArchiveItem) => void;
    onShare?: (story: StoryArchiveItem) => void;
    showToast?: (msg: string, type: 'success' | 'error' | 'warn') => void;
}

type View = 'storybook' | 'memoryLane' | 'map' | 'heirlooms';

const StorybookViewer: React.FC<StorybookViewerProps> = ({ isOpen, onClose, story, showToast }) => {
    const [activeView, setActiveView] = useState<View>('storybook');
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume] = useState(0.4);
    const [isNarrating, setIsNarrating] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const narrationContextRef = useRef<AudioContext | null>(null);
    const narrationSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const storyPages = useMemo(() => {
        if (!story) return [];
        return generatePages(story);
    }, [story]);
    
    const artifacts = useMemo(() => {
        if (!story) return [];
        return story.artifacts || story.extraction?.artifacts || [];
    }, [story]);

    const stopNarration = () => {
        if (narrationSourceRef.current) {
            try { narrationSourceRef.current.stop(); } catch(e) {}
            narrationSourceRef.current = null;
        }
        setIsNarrating(false);
        setIsSynthesizing(false);
    };

    const handleNarrate = async () => {
        if (isNarrating || isSynthesizing) {
            stopNarration();
            return;
        }
        if (!story?.narrative) return;

        setIsSynthesizing(true);
        try {
            const base64Audio = await generateNarration(story.narrative, 'Kore');
            if (!narrationContextRef.current) {
                narrationContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioData = decode(base64Audio);
            const buffer = await decodeAudioData(audioData, narrationContextRef.current, 24000, 1);
            const source = narrationContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(narrationContextRef.current.destination);
            source.onended = () => setIsNarrating(false);
            narrationSourceRef.current = source;
            source.start(0);
            setIsNarrating(true);
            setIsSynthesizing(false);
        } catch (err) {
            setIsSynthesizing(false);
            showToast?.("Narration failure", "error");
        }
    };

    const handleShareLegacy = async () => {
        const url = `${window.location.origin}?story=${story?.sessionId || 'unknown'}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        } catch (e) {
            showToast?.('Uplink failed', 'error');
        }
    };

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play().catch(() => {});
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setActiveView('storybook');
            if (story?.background_music_url && audioRef.current) {
                audioRef.current.volume = volume;
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
        } else {
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
            stopNarration();
        }
    }, [isOpen, story?.background_music_url, volume]);

    if (!isOpen || !story) return null;

    const TabButton: React.FC<{ label: string; view: View; icon: React.ReactNode }> = ({ label, view, icon }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center gap-2 px-3 lg:px-5 py-2 text-[9px] font-black rounded-xl transition-all duration-300 uppercase tracking-widest ${activeView === view ? 'bg-gemynd-oxblood text-white shadow-lg shadow-black/40' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[500] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="w-full h-full max-w-7xl bg-gemynd-mahogany md:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 flex flex-col relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {story.background_music_url && <audio ref={audioRef} src={story.background_music_url} loop />}
                
                <header className="p-6 md:p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-black/40 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                        <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-10 h-10" alt="Logo"/>
                        <div className="hidden sm:block">
                            <h2 className="text-xl font-display font-black text-white tracking-tight leading-none">{story.storytellerName}</h2>
                            <p className="text-[9px] font-black text-gemynd-agedGold uppercase tracking-widest mt-2">Lexington Vault Archive</p>
                        </div>
                    </div>
                    
                    <nav className="flex items-center gap-1.5 lg:gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                        <TabButton label="Manuscript" view="storybook" icon={<BookOpenIcon className="w-4 h-4"/>} />
                        <TabButton label="Living Film" view="memoryLane" icon={<FilmIcon className="w-4 h-4"/>} />
                        <TabButton label="Spatial Map" view="map" icon={<MapIcon className="w-4 h-4"/>} />
                        <TabButton label="Artifacts" view="heirlooms" icon={<ArchiveBoxIcon className="w-4 h-4"/>} />
                    </nav>

                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all transform active:scale-95 haptic-tap"><XMarkIcon className="w-6 h-6"/></button>
                </header>
                
                <main className="flex-1 overflow-hidden relative">
                    <ErrorBoundary>
                        {activeView === 'storybook' && (
                            <div className="h-full overflow-y-auto p-10 lg:p-32 lg:pb-64 scroll-viewport">
                                <div className="max-w-3xl mx-auto space-y-48">
                                    {storyPages.map((page, index) => (
                                        <article key={index} className="text-center animate-fade-in group">
                                            <h3 className="font-display text-4xl lg:text-7xl font-black text-white tracking-tighter mb-12 group-hover:text-gemynd-agedGold transition-colors duration-700">{page.title}</h3>
                                            {page.imageUrl && (
                                                <div className="my-20 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10 aspect-video bg-black group-hover:scale-[1.03] transition-all duration-[2s]">
                                                    <img src={page.imageUrl} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000" alt="Artifact" />
                                                </div>
                                            )}
                                            <div className="font-serif text-xl lg:text-3xl leading-relaxed text-white/70 italic whitespace-pre-wrap font-light">
                                                {page.content}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeView === 'memoryLane' && <MemoryLaneView story={story} />}
                        {activeView === 'map' && <MemoryMapView story={story} />}
                        {activeView === 'heirlooms' && <HeirloomsGallery artifacts={artifacts} />}
                    </ErrorBoundary>
                </main>

                <footer className="p-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center bg-black/80 gap-6">
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/10 shadow-inner">
                            {story.background_music_url && (
                                <button onClick={togglePlayback} className="text-gemynd-agedGold transition-transform active:scale-90 hover:scale-110">
                                    {isPlaying ? <PauseCircleIcon className="w-10 h-10"/> : <PlayCircleIcon className="w-10 h-10"/>}
                                </button>
                            )}
                            <button 
                                onClick={handleNarrate}
                                disabled={isSynthesizing}
                                className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-white transition-all active:scale-95 shadow-xl ${isNarrating ? 'bg-gemynd-red' : 'bg-amber-600 hover:bg-amber-500'} disabled:opacity-30`}
                            >
                                {isSynthesizing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (isNarrating ? <StopIcon className="w-4 h-4" /> : <SpeakerWaveIcon className="w-4 h-4" />)}
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{isNarrating ? 'Stop' : 'Voice Narration'}</span>
                            </button>
                         </div>
                    </div>
                    
                    <button 
                        onClick={handleShareLegacy} 
                        className="w-full sm:w-auto px-12 py-6 bg-gemynd-oxblood hover:bg-gemynd-red text-white font-black rounded-3xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] haptic-tap border border-white/5"
                    >
                        <ShareIcon className="w-5 h-5" /> 
                        {copyFeedback ? 'Link Secured ✨' : 'Share with Family'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default StorybookViewer;