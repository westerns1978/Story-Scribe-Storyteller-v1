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
import ShareModal from './ShareModal';
import { generateNarration } from '../services/api';
import { decode, decodeAudioData } from '../utils/audioUtils';

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

const StorybookViewer: React.FC<StorybookViewerProps> = ({ isOpen, onClose, story, onShare, onSave, showToast }) => {
    const [activeView, setActiveView] = useState<View>('storybook');
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.4);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isNarrating, setIsNarrating] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    
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

    const hasStoryboard = useMemo(() => {
        if (!story) return false;
        const beats = story.storyboard?.story_beats || story.extraction?.storyboard?.story_beats;
        return !!(beats && beats.length > 0);
    }, [story]);

    const hasLocations = useMemo(() => {
        if (!story) return false;
        return !!(story.extraction?.locations?.length);
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
        showToast?.("Synthesizing expressive narration...", "success");

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
            showToast?.("Voice synthesis interrupted.", "error");
        }
    };

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(() => {});
            }
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
    }, [isOpen, story?.background_music_url]);

    if (!isOpen || !story) return null;

    const TabButton: React.FC<{ label: string; view: View; icon: React.ReactNode; disabled?: boolean }> = ({ label, view, icon, disabled }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center gap-3 px-5 py-2.5 text-[10px] font-black rounded-2xl transition-all duration-500 uppercase tracking-widest ${activeView === view ? 'bg-gemynd-oxblood text-white shadow-xl scale-105' : 'text-gemynd-ink/40 dark:text-white/30 hover:bg-black/5 hover:text-gemynd-oxblood'}`}
        >
            {icon}
            <span className="hidden lg:inline">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[150] flex items-center justify-center p-0 md:p-10 animate-fade-in" onClick={onClose}>
            <div className="w-full h-full max-w-7xl bg-[#0D0B0A] md:rounded-[4rem] shadow-2xl border border-white/10 flex flex-col relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {story.background_music_url && <audio ref={audioRef} src={story.background_music_url} loop />}
                
                <header className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 bg-black/40 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-5">
                        <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(168,45,45,0.4)]" alt="Logo"/>
                        <div>
                            <h2 className="text-2xl font-display font-black text-white tracking-tight leading-none">{story.storytellerName || 'Legacy Record'}</h2>
                            <p className="text-[10px] font-bold text-gemynd-red uppercase tracking-[0.4em] mt-1.5 opacity-60">WestFlow Secure Archive Node</p>
                        </div>
                    </div>
                    
                    <nav className="flex items-center gap-2 glass-tier-2 p-1.5 rounded-3xl border border-white/10">
                        <TabButton label="The Narrative" view="storybook" icon={<BookOpenIcon className="w-4 h-4"/>} />
                        <TabButton label="Director's Cut" view="memoryLane" icon={<FilmIcon className="w-4 h-4"/>} />
                        <TabButton label="Journey Map" view="map" icon={<MapIcon className="w-4 h-4"/>} />
                        <TabButton label="The Heirlooms" view="heirlooms" icon={<ArchiveBoxIcon className="w-4 h-4"/>} />
                    </nav>

                    <button onClick={onClose} className="hidden md:flex p-3 rounded-full hover:bg-white/10 text-white/20 hover:text-white transition-all">
                        <XMarkIcon className="w-7 h-7"/>
                    </button>
                </header>
                
                <main className="flex-1 overflow-hidden relative bg-[#0D0B0A]">
                    {activeView === 'storybook' && (
                        <div className="h-full overflow-y-auto p-12 lg:p-24 lg:pb-48 scroll-smooth scrollbar-hide">
                            <div className="max-w-4xl mx-auto space-y-48">
                                {storyPages.length > 0 ? (
                                    storyPages.map((page, index) => (
                                        <article key={index} className="text-center animate-appear group">
                                            <div className="inline-flex items-center gap-6 mb-12">
                                                <div className="h-px w-16 bg-white/10"></div>
                                                <h3 className="font-display text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">{page.title}</h3>
                                                <div className="h-px w-16 bg-white/10"></div>
                                            </div>
                                            
                                            {page.imageUrl && (
                                                <div className="my-20 rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/10 aspect-video bg-black group-hover:scale-[1.02] transition-transform duration-1000 ease-out">
                                                    <img src={page.imageUrl} className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-1000" alt="Artifact" />
                                                </div>
                                            )}
                                            
                                            <div className="font-serif text-2xl md:text-4xl leading-relaxed text-white/80 whitespace-pre-wrap italic font-light px-6 lg:px-20 drop-shadow-sm">
                                                {page.content}
                                            </div>
                                        </article>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full py-32 text-center opacity-30">
                                        <BookOpenIcon className="w-16 h-16 text-white mb-6" />
                                        <h3 className="text-2xl font-display font-bold text-white mb-2">Manuscript Awaiting Synthesis</h3>
                                        <p className="text-white font-serif italic text-lg">The story node contains no narrative data.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeView === 'memoryLane' && <MemoryLaneView story={story} />}
                    {activeView === 'map' && <MemoryMapView story={story} />}
                    {activeView === 'heirlooms' && <HeirloomsGallery artifacts={artifacts} />}
                </main>

                <footer className="p-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center bg-black/80 gap-6">
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                            {story.background_music_url && (
                                <>
                                    <button onClick={togglePlayback} className="text-gemynd-red transition-transform hover:scale-110">
                                        {isPlaying ? <PauseCircleIcon className="w-8 h-8"/> : <PlayCircleIcon className="w-8 h-8"/>}
                                    </button>
                                    <div className="w-px h-6 bg-white/10 mx-2"></div>
                                </>
                            )}
                            <button 
                                onClick={handleNarrate}
                                disabled={!story.narrative || isSynthesizing}
                                className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-white transition-all transform active:scale-95 shadow-lg ${isNarrating ? 'bg-gemynd-red' : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-20`}
                            >
                                {isSynthesizing ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : isNarrating ? (
                                    <StopIcon className="w-4 h-4" />
                                ) : (
                                    <SpeakerWaveIcon className="w-4 h-4" />
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest">{isSynthesizing ? 'Linking...' : isNarrating ? 'Stop Voice' : 'Narration'}</span>
                            </button>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => setIsShareModalOpen(true)} 
                            className="flex-1 md:flex-none px-12 py-5 bg-gemynd-oxblood hover:bg-gemynd-red text-white font-black rounded-3xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 text-xs uppercase tracking-widest"
                        >
                            <ShareIcon className="w-5 h-5" /> Share Legacy
                        </button>
                    </div>
                </footer>
            </div>

            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} story={story} showToast={showToast} />
        </div>
    );
};

export default StorybookViewer;
