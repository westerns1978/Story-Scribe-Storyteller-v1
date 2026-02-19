import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StoryArchiveItem, GeneratedImage, StoryBeat } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import ShareIcon from './icons/ShareIcon';
import DownloadIcon from './icons/DownloadIcon';
import GlobeAmericasIcon from './icons/GlobeAmericasIcon';
import MapPinIcon from './icons/MapPinIcon';
import PlayCircleIcon from './icons/PlayCircleIcon';
import PauseCircleIcon from './icons/PauseCircleIcon';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import StopIcon from './icons/StopIcon';
import { generateNarration } from '../services/api';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface StorybookViewerProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | null;
    showToast?: (msg: string, type: 'success' | 'error' | 'warn') => void;
}

type TabId = 'story' | 'gallery' | 'timeline' | 'map';

const StorybookViewer: React.FC<StorybookViewerProps> = ({ isOpen, onClose, story, showToast }) => {
    const [activeTab, setActiveTab] = useState<TabId>('story');
    const [isNarrating, setIsNarrating] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [copyFeedback, setCopyFeedback] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const narrationContextRef = useRef<AudioContext | null>(null);
    const narrationSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const formattedDate = useMemo(() => {
        if (!story?.savedAt) return '';
        return new Date(story.savedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }, [story?.savedAt]);

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

    const handleShare = async () => {
        const url = `${window.location.origin}?story=${story?.sessionId || 'unknown'}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
            showToast?.('Legacy link copied to clipboard', 'success');
        } catch (e) {
            showToast?.('Copy failed', 'error');
        }
    };

    useEffect(() => {
        if (isOpen) {
            setActiveTab('story');
            if (story?.background_music_url && audioRef.current) {
                audioRef.current.volume = 0.3;
                audioRef.current.play().catch(() => {});
            }
        } else {
            if (audioRef.current) audioRef.current.pause();
            stopNarration();
        }
    }, [isOpen, story?.background_music_url]);

    if (!isOpen || !story) return null;

    // --- Sub-renderers for Tab Content ---

    const StoryView = () => {
        const paragraphs = story.narrative?.split('\n\n').filter(p => p.trim()) || [];
        const images = story.generatedImages || [];
        // Extract beats that have specific image indices
        const beats = story.storyboard?.story_beats || [];

        return (
            <div className="max-w-3xl mx-auto animate-appear stagger-delay-2">
                <div className="bg-white rounded-3xl p-8 md:p-20 shadow-warm border border-heritage-parchment relative overflow-hidden">
                    {/* Background Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
                    
                    <style>{`
                        .drop-cap::first-letter {
                            font-size: 4.5rem;
                            font-weight: 700;
                            color: #8B2E3B; /* Heritage Burgundy */
                            float: left;
                            line-height: 0.8;
                            padding-right: 16px;
                            padding-top: 8px;
                            font-family: 'Crimson Pro', serif;
                        }
                    `}</style>

                    <div className="relative z-10">
                        {paragraphs.map((para, idx) => {
                            // Logic: Place a beat image after every 2 paragraphs
                            const showImage = idx > 0 && idx % 2 === 0;
                            const imageIdx = Math.floor(idx / 2) - 1;
                            const beat = beats[imageIdx];
                            const image = images.find(img => img.index === beat?.image_index);

                            return (
                                <React.Fragment key={idx}>
                                    <p className={`text-heritage-ink font-serif text-[1.15rem] leading-[1.85] mb-8 ${idx === 0 ? 'drop-cap' : ''}`}>
                                        {para}
                                    </p>
                                    {showImage && image && (
                                        <div className="my-16 group">
                                            <div className="rounded-2xl overflow-hidden border border-heritage-parchment shadow-md bg-heritage-linen aspect-video relative">
                                                <img 
                                                  src={image.image_url} 
                                                  alt={beat.beat_title} 
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" 
                                                />
                                            </div>
                                            <div className="mt-4 p-4 bg-heritage-linen/30 rounded-xl text-center">
                                                <p className="text-heritage-inkSoft italic text-sm font-serif">{beat.beat_title}</p>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const GalleryView = () => {
        const allImages = [
            ...(story.generatedImages || []).filter(img => img.success && img.image_url),
            ...(story.artifacts || []).map(a => ({ image_url: a.image_url, prompt: a.name }))
        ];

        return (
            <div className="max-w-5xl mx-auto animate-appear stagger-delay-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allImages.map((img, i) => (
                        <button 
                            key={i} 
                            onClick={() => setExpandedImage(img.image_url || '')}
                            className="aspect-square rounded-2xl overflow-hidden border border-heritage-parchment shadow-sm hover:shadow-warm-lg hover:-translate-y-1 transition-all duration-500 bg-white group"
                        >
                            <img src={img.image_url} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const TimelineView = () => {
        const timeline = [...(story.extraction?.timeline || [])].sort((a, b) => parseInt(a.year) - parseInt(b.year));

        return (
            <div className="max-w-3xl mx-auto animate-appear stagger-delay-2">
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[31px] md:left-1/2 top-0 bottom-0 w-px bg-heritage-warmGold/40" />
                    
                    <div className="space-y-16">
                        {timeline.map((event, i) => (
                            <div key={i} className={`relative flex flex-col md:flex-row items-start ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                {/* Center Dot */}
                                <div className="absolute left-[28px] md:left-1/2 md:-translate-x-1/2 w-2 h-2 rounded-full bg-heritage-warmGold border-[4px] border-heritage-cream shadow-sm z-10 mt-2" />

                                {/* Year Indicator */}
                                <div className="md:w-1/2 flex items-start justify-start md:justify-end px-12 md:px-16">
                                    <div className={`text-2xl font-display font-bold text-heritage-warmGold tracking-tighter ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                                        {event.year}
                                    </div>
                                </div>
                                
                                {/* Event Content */}
                                <div className="md:w-1/2 pl-12 md:px-16 mt-1 md:mt-0">
                                    <div className="space-y-2">
                                        <h4 className="font-display font-bold text-xl text-heritage-ink leading-tight">{event.event}</h4>
                                        <p className="text-heritage-inkSoft text-base leading-relaxed font-serif italic opacity-70">{event.significance}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const MapView = () => {
        const locations = story.extraction?.locations || [];
        return (
            <div className="max-w-5xl mx-auto animate-appear stagger-delay-2 h-[600px]">
                <div className="w-full h-full bg-heritage-linen rounded-[3rem] border border-heritage-parchment shadow-inner overflow-hidden relative flex items-center justify-center p-12 text-center">
                    <div className="absolute inset-0 opacity-[0.07] pointer-events-none grayscale">
                         <GlobeAmericasIcon className="w-full h-full text-heritage-ink" />
                    </div>
                    
                    <div className="relative z-10 max-w-xl space-y-10">
                        <div className="flex flex-wrap justify-center gap-4">
                            {locations.map((loc, i) => (
                                <div key={i} className="px-8 py-4 bg-white rounded-full border border-heritage-parchment shadow-warm flex items-center gap-4 animate-appear" style={{animationDelay: `${i * 150}ms`}}>
                                    <MapPinIcon className="w-5 h-5 text-heritage-burgundy" />
                                    <span className="text-base font-bold text-heritage-ink">{loc.name}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-lg text-heritage-inkMuted font-serif italic leading-relaxed">
                            Spatial memory nodes preserved in the Lexington archive.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[600] flex flex-col items-center overflow-hidden animate-fade-in" style={{ background: 'rgba(253, 246, 236, 0.98)', backdropFilter: 'blur(12px)' }}>
            
            {story.background_music_url && <audio ref={audioRef} src={story.background_music_url} loop />}

            {/* Close Button Top Right */}
            <button 
                onClick={onClose} 
                className="absolute top-8 right-8 z-50 p-4 bg-white/50 hover:bg-white rounded-full border border-heritage-parchment text-heritage-ink transition-all shadow-sm hover:scale-110 active:scale-95 haptic-tap"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>

            <div className="w-full h-full max-w-7xl flex flex-col pt-16 pb-12">
                {/* Header Staggered Stagger 0 */}
                <header className="px-6 md:px-12 text-center flex flex-col items-center animate-fade-in-up">
                    <div className="mb-8 opacity-20 hover:opacity-40 transition-opacity">
                        <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-14 grayscale" alt="Heritage Logo"/>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-display font-light text-heritage-ink tracking-tight mb-4">
                        {story.storytellerName}
                    </h1>
                    <p className="text-heritage-inkMuted font-serif italic text-lg opacity-60">
                        Preserved on {formattedDate}
                    </p>
                </header>

                {/* Tab Bar Stagger 1 */}
                <nav className="flex justify-center my-12 px-6 animate-fade-in-up stagger-delay-1">
                    <div className="bg-white p-2 rounded-2xl shadow-warm border border-heritage-parchment flex items-center gap-2">
                        {[
                            { id: 'story', label: 'Story', icon: '📖' },
                            { id: 'gallery', label: 'Gallery', icon: '🖼️' },
                            { id: 'timeline', label: 'Timeline', icon: '⏳' },
                            { id: 'map', label: 'Map', icon: '🗺️' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as TabId)}
                                className={`flex items-center gap-3 px-8 py-3.5 min-h-[48px] rounded-xl text-sm font-bold tracking-tight transition-all duration-500 ${
                                    activeTab === t.id 
                                        ? 'bg-heritage-warmGold text-white shadow-md' 
                                        : 'text-heritage-inkSoft hover:bg-heritage-linen'
                                }`}
                            >
                                <span className="text-xl">{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main Content Area Scrollable */}
                <main className="flex-1 overflow-y-auto px-6 pb-20 scroll-viewport scrollbar-hide">
                    <div key={activeTab} className="transition-all duration-1000">
                        {activeTab === 'story' && <StoryView />}
                        {activeTab === 'gallery' && <GalleryView />}
                        {activeTab === 'timeline' && <TimelineView />}
                        {activeTab === 'map' && <MapView />}
                    </div>

                    {/* Bottom Share Bar Actions */}
                    <div className="mt-24 flex flex-col items-center gap-8 animate-appear stagger-delay-3 pb-24">
                        <div className="w-12 h-px bg-heritage-parchment opacity-40" />
                        <div className="flex flex-wrap justify-center gap-6">
                            <button 
                                onClick={handleShare}
                                className="px-10 py-5 bg-white border border-heritage-parchment text-heritage-inkSoft font-bold rounded-[1.5rem] shadow-sm hover:shadow-warm-lg hover:bg-heritage-linen transition-all flex items-center gap-4 text-sm haptic-tap"
                            >
                                <ShareIcon className="w-5 h-5 text-heritage-warmGold" />
                                {copyFeedback ? 'Link Secured ✨' : 'Share with Family'}
                            </button>
                            <button 
                                onClick={() => showToast?.("Digital Print engine initializing...", "success")}
                                className="px-10 py-5 bg-white border border-heritage-parchment text-heritage-inkSoft font-bold rounded-[1.5rem] shadow-sm hover:shadow-warm-lg hover:bg-heritage-linen transition-all flex items-center gap-4 text-sm haptic-tap"
                            >
                                <DownloadIcon className="w-5 h-5 text-heritage-burgundy" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </main>

                {/* Bottom Fixed Control HUD */}
                <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[700] animate-fade-in-up stagger-delay-4">
                    <div className="bg-heritage-ink p-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-2 border border-white/10">
                        <button 
                            onClick={handleNarrate}
                            disabled={isSynthesizing}
                            className={`flex items-center gap-4 px-10 py-4 rounded-full text-white font-bold transition-all duration-700 ${isNarrating ? 'bg-heritage-warmGold shadow-inner' : 'bg-heritage-ink hover:bg-white/10'} disabled:opacity-50`}
                        >
                            {isSynthesizing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                isNarrating ? <StopIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />
                            )}
                            <span className="text-xs uppercase tracking-widest leading-none mt-0.5">
                                {isSynthesizing ? 'Preparing Voice...' : isNarrating ? 'Pause Audio' : 'Begin Voice Narration'}
                            </span>
                        </button>
                    </div>
                </footer>
            </div>

            {/* Expansion Lightbox */}
            {expandedImage && (
                <div className="fixed inset-0 z-[1000] bg-[#050404]/98 flex flex-col items-center justify-center p-8 animate-fade-in" onClick={() => setExpandedImage(null)}>
                    <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-all p-4 hover:scale-110">
                        <XMarkIcon className="w-12 h-12" />
                    </button>
                    <div className="max-w-full max-h-[85vh] relative group">
                        <img src={expandedImage} className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10" alt="Expanded artifact" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    </div>
                </div>
            )}

            <style>{`
                .stagger-delay-1 { animation-delay: 200ms; }
                .stagger-delay-2 { animation-delay: 400ms; }
                .stagger-delay-3 { animation-delay: 600ms; }
                .stagger-delay-4 { animation-delay: 800ms; }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in-up { opacity: 0; animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default StorybookViewer;