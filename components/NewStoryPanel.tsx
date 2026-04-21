import React, { useState, useEffect, useRef } from 'react';
import { ActiveStory, QueueItem, StatusTracker, ProviderStat } from '../types';
import { formatDisplayName } from '../utils/nameUtils';
import BookOpenIcon from './icons/BookOpenIcon';
import NarrativeToolbar from './NarrativeToolbar';
import VisualStoryboard from './VisualStoryboard';
import BoltIcon from './icons/BoltIcon';
import MagicTouchPanel from './MagicTouchPanel';
import InspirationPanel from './InspirationPanel';
import CreativeAssets from './CreativeAssets';
import TimelineVisualizer from './TimelineVisualizer';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';
import ImageIcon from './icons/ImageIcon';
import DocumentScannerModal from './DocumentScannerModal';
import Loader2Icon from './icons/Loader2Icon';
import ShareIcon from './icons/ShareIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import { fileToBase64 } from '../utils/fileUtils';
import { extractTextFromDocument } from '../services/api';

interface NewStoryPanelProps {
    queue: QueueItem[];
    setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
    onAnalyze: (combinedText: string, storytellerName: string, style: string, useCascade: boolean, artifacts?: any[], visualStyle?: string, isQuick?: boolean) => void;
    status: StatusTracker;
    imageGenerationProgress: string | null;
    videoGenerationProgress: number | null;
    onClearSession: () => void;
    activeStory: ActiveStory | null;
    onGenerateImages: (style: string) => void;
    onGenerateVideoFromPrompt: (prompt: string) => void;
    onRetryImage: (imageIndex: number) => void;
    generationStats: ProviderStat[] | null;
    totalCost: number;
    onRefineNarrative: (instruction: string) => void;
    onNarrativeChange: (newNarrative: string) => void;
    onOpenMusicFinder: () => void;
    onFinalizeAndReveal: () => void;
    onOpenConnie: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'warn') => void;
    narrationAudio: { url: string | null; isLoading: boolean };
    onGenerateNarration: (voice: string) => void;
    onOpenDirectorsCut: () => void;
    onOpenPresentation: () => void;
    initialData: { storytellerName: string; combinedText: string } | null;
    onInitialDataLoaded: () => void;
    onAnimateImage: (index: number, imageUrl: string) => void;
    animatingImageIndex: number | null;
    credits: number;
    onOpenScanner: () => void;
    onOpenEnhancer: (file: File | string) => void;
    prefilledData?: { name: string, notes: string } | null;
    onImageUpdated?: (index: number, newUrl: string) => void;
    onReorderBeats?: (oldIndex: number, newIndex: number) => void;
}

const NewStoryPanel: React.FC<NewStoryPanelProps> = (props) => {
    const [storytellerName, setStorytellerName] = useState(props.prefilledData?.name || '');
    const [contextualNotes, setContextualNotes] = useState(props.prefilledData?.notes || '');
    const [quickArtifacts, setQuickArtifacts] = useState<{data: string, mimeType: string, name: string}[]>([]);
    const [photoDescriptions, setPhotoDescriptions] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
    const [manuscriptView, setManuscriptView] = useState<'edit' | 'intelligence'>('intelligence');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (props.prefilledData) {
            if (props.prefilledData.name) setStorytellerName(props.prefilledData.name);
            if (props.prefilledData.notes) setContextualNotes(props.prefilledData.notes);
        }
    }, [props.prefilledData]);

    useEffect(() => {
        const handleConniePhoto = (e: any) => {
            const base64 = e.detail.base64;
            setQuickArtifacts(prev => [...prev, { data: base64, mimeType: 'image/jpeg', name: 'Captured by Connie' }]);
        };
        const handleConnieTrigger = (e: any) => {
            if (e.detail.name) setStorytellerName(e.detail.name);
            handleCreateStory();
        };

        window.addEventListener('connie-photo-captured', handleConniePhoto);
        window.addEventListener('connie-trigger-create', handleConnieTrigger);
        return () => {
            window.removeEventListener('connie-photo-captured', handleConniePhoto);
            window.removeEventListener('connie-trigger-create', handleConnieTrigger);
        };
    }, [contextualNotes, storytellerName, quickArtifacts]);

    const handleQuickFileUpload = async (files: FileList) => {
        setIsUploading(true);
        const fileArr = Array.from(files);
        for (const file of fileArr) {
            try {
                const base64 = await fileToBase64(file);
                setQuickArtifacts(prev => [...prev, { data: base64, mimeType: file.type, name: file.name }]);
                
                if (file.type === 'application/pdf') {
                    const extracted = await extractTextFromDocument(base64, file.type);
                    if (extracted) {
                        setContextualNotes(prev => prev + (prev ? '\n\n' : '') + extracted);
                    }
                } else if (file.type.startsWith('image/')) {
                    const extracted = await extractTextFromDocument(base64, file.type);
                    if (extracted) {
                        setPhotoDescriptions(prev => [...prev, extracted]);
                    }
                } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                    const text = await file.text();
                    if (text) {
                        setContextualNotes(prev => prev + (prev ? '\n\n' : '') + text);
                    }
                }
            } catch (err) {
                props.showToast(`Upload failed: ${file.name}`, 'error');
            }
        }
        setIsUploading(false);
    };

    const handleCreateStory = () => {
        if (!storytellerName.trim()) {
            props.showToast("Please enter who this story is about.", "warn");
            return;
        }
        if (!contextualNotes.trim() && quickArtifacts.length === 0) {
            props.showToast("Please provide some memories or artifacts.", "warn");
            return;
        }

        const artifactsPayload = quickArtifacts.map(a => ({
            data: a.data,
            mimeType: a.mimeType
        }));

        // Default to Standard Narrative / Cinematic style for production path
        props.onAnalyze(
            contextualNotes, 
            storytellerName, 
            "Eloquent (Biographical)", 
            true, 
            artifactsPayload, 
            "Cinematic (Non-Linear)", 
            true
        );
    };

    const handleClearLocalSession = () => {
        setQuickArtifacts([]);
        setPhotoDescriptions([]);
        setContextualNotes('');
        setStorytellerName('');
        props.onClearSession();
    };

    if (!props.activeStory) {
        return (
            <div className="w-full max-w-4xl mx-auto space-y-12 animate-appear pb-32">
                {/* Header Information */}
                <div className="text-center space-y-4">
                    <div className="inline-block p-4 bg-white/5 border border-white/10 rounded-[2rem] shadow-xl mb-4">
                        <BookOpenIcon className="w-8 h-8 text-gemynd-agedGold" />
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase">Initialize Preservation</h2>
                    <p className="text-lg font-serif italic text-slate-500 dark:text-white/40 max-w-2xl mx-auto">Follow the production path to weave a lifetime of memories into a cinematic legacy.</p>
                </div>

                <div className="space-y-12">
                    {/* Step 1: Identification */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-gemynd-oxblood text-white rounded-full flex items-center justify-center font-black shadow-lg text-sm">1</div>
                            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">The Legacy Subject</h3>
                        </div>
                        <div className="bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-[2rem] p-8 shadow-inner transition-all">
                            <label className="text-[10px] font-black text-gemynd-agedGold uppercase tracking-[0.5em] mb-4 block ml-2">Who are we remembering?</label>
                            <input
                                type="text"
                                placeholder="Enter Full Name"
                                value={storytellerName}
                                onChange={(e) => setStorytellerName(e.target.value)}
                                className="w-full bg-transparent text-2xl lg:text-3xl text-slate-900 dark:text-white outline-none font-serif italic placeholder:text-slate-200 dark:placeholder:text-white/5 transition-all"
                            />
                        </div>
                    </section>

                    {/* Step 2: Collection */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-gemynd-oxblood text-white rounded-full flex items-center justify-center font-black shadow-lg text-sm">2</div>
                            <h3 className="text-xl font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">Gather Memories</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button 
                                onClick={props.onOpenConnie} 
                                className="flex-1 bg-gemynd-oxblood hover:bg-gemynd-red text-white p-8 rounded-[2.5rem] text-lg font-black uppercase tracking-widest flex flex-col items-center justify-center gap-4 transition-all shadow-[0_20px_50px_rgba(150,45,45,0.2)] active:scale-95 group"
                            >
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <MicrophoneIcon className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <span>Talk with Connie</span>
                                    <p className="text-[9px] opacity-40 lowercase mt-1 font-serif italic tracking-widest">Voice & Vision Interview</p>
                                </div>
                            </button>
                            
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); handleQuickFileUpload(e.dataTransfer.files); }}
                                className="min-h-[200px] border-2 border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] rounded-[2.5rem] flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white/60 dark:hover:bg-white/[0.05] hover:border-gemynd-agedGold/30 transition-all group shadow-inner relative"
                            >
                                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleQuickFileUpload(e.target.files)} />
                                {isUploading ? (
                                    <Loader2Icon className="w-10 h-10 text-gemynd-agedGold" />
                                ) : (
                                    <>
                                        <DocumentArrowUpIcon className="w-12 h-12 text-slate-300 dark:text-white/10 group-hover:text-gemynd-agedGold group-hover:scale-110 transition-all duration-700 mb-4" />
                                        <p className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Drop photos or files</p>
                                        <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest mt-2">JPG, PNG, PDF or Text</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <textarea
                                value={contextualNotes}
                                onChange={(e) => setContextualNotes(e.target.value)}
                                placeholder="Paste transcripts or ancestral memories here..."
                                className="w-full min-h-[240px] bg-white/40 dark:bg-white/[0.02] border border-black/5 dark:border-white/10 rounded-[2rem] p-8 text-lg text-slate-800 dark:text-white/80 font-serif italic leading-relaxed focus:border-gemynd-agedGold/30 outline-none transition-all shadow-inner"
                            />
                            <div className="absolute top-6 right-8 flex gap-2">
                                <button 
                                    onClick={() => setIsScannerOpen(true)}
                                    className="p-3 bg-white/80 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gemynd-agedGold hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <ImageIcon className="w-4 h-4" /> Scan
                                </button>
                            </div>
                        </div>

                        {quickArtifacts.length > 0 && (
                            <div className="space-y-4 animate-appear">
                                <label className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-2 block">Gathered Artifacts ({quickArtifacts.length})</label>
                                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
                                    {quickArtifacts.map((art, i) => (
                                        <div key={i} className="flex-shrink-0 w-28 aspect-square rounded-[1.5rem] bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/10 overflow-hidden relative group shadow-lg">
                                            {art.mimeType.startsWith('image/') ? (
                                                <img src={`data:${art.mimeType};base64,${art.data}`} className="w-full h-full object-cover opacity-80" alt="Preview" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><BoltIcon className="w-8 h-8 text-gemynd-agedGold/20" /></div>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setQuickArtifacts(prev => prev.filter((_, idx) => idx !== i)); }}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white shadow-xl opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 3: Synthesis */}
                    <div className="pt-6">
                        <button
                            onClick={handleCreateStory}
                            disabled={props.status.extracting || (!storytellerName.trim())}
                            className={`w-full py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] transition-all duration-700 flex items-center justify-center gap-5 group relative border-2 ${
                                props.status.extracting ? 'bg-white/5 text-gemynd-agedGold/40 border-white/5 cursor-not-allowed' : 
                                !storytellerName.trim() ? 'bg-white/5 text-slate-300 dark:text-white/10 border-white/5 cursor-not-allowed' :
                                'bg-gemynd-agedGold text-black border-gemynd-agedGold shadow-[0_30px_70px_rgba(212,175,55,0.3)] active:scale-95 hover:scale-[1.01]'
                            }`}
                        >
                            {props.status.extracting ? (
                                <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <SparklesIcon className="w-6 h-6 group-hover:rotate-12 transition-transform duration-700" />
                            )}
                            <span>{props.status.extracting ? 'Connie is weaving legacy...' : 'Initialize Legacy Weave'}</span>
                        </button>
                    </div>
                </div>

                <DocumentScannerModal 
                    isOpen={isScannerOpen} 
                    onClose={() => setIsScannerOpen(false)} 
                    onScanComplete={(text) => setContextualNotes(prev => prev + (prev ? '\n\n' : '') + text)} 
                />
            </div>
        );
    }

    // STUDIO VIEW (Once story is active)
    return (
        <div className="w-full max-w-7xl mx-auto space-y-10 animate-appear">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
                <div className="text-left w-full md:w-auto">
                    <h2 className="text-3xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-1">{formatDisplayName(props.activeStory?.storytellerName)}</h2>
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">Active Production Node</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    <button 
                        onClick={async () => {
                            const url = `${window.location.origin}?story=${props.activeStory?.sessionId}`;
                            await navigator.clipboard.writeText(url);
                            props.showToast("Story link copied! Share it with family.", "success");
                        }}
                        className="px-5 py-4 bg-gemynd-agedGold text-black font-black rounded-xl shadow-lg haptic-tap text-[10px] uppercase tracking-[0.2em] flex items-center gap-3"
                    >
                        <ShareIcon className="w-4 h-4" /> Share Story
                    </button>
                    <button onClick={handleClearLocalSession} className="px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white/40 hover:text-white transition-all">New Story</button>
                    <button onClick={props.onFinalizeAndReveal} className="flex-1 md:flex-none px-8 py-4 bg-gemynd-oxblood text-white font-black rounded-xl shadow-lg haptic-tap transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-4">
                        <BookOpenIcon className="w-4 h-4" /> Materialize Legacy
                    </button>
                </div>
            </header>

            {props.activeStory?.extraction?.timeline && props.activeStory.extraction.timeline.length > 0 && (
                <section className="animate-appear">
                    <TimelineVisualizer 
                        timeline={props.activeStory.extraction.timeline} 
                        images={props.activeStory.generatedImages || []} 
                    />
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    <div className="glass-tier-1 rounded-[3rem] p-8 lg:p-12 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gemynd-oxblood/40 to-transparent" />
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                            <div>
                                <h3 className="text-2xl lg:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter">The Manuscript</h3>
                                <p className="text-slate-400 dark:text-white/10 text-[10px] font-bold uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                                    <SparklesIcon className="w-3 h-3 text-gemynd-agedGold" /> Synthesis Complete
                                </p>
                            </div>
                            <div className="flex glass-tier-2 p-1 rounded-xl border border-black/5 dark:border-white/10">
                                <button onClick={() => setManuscriptView('intelligence')} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manuscriptView === 'intelligence' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Intelligence</button>
                                <button onClick={() => setManuscriptView('edit')} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manuscriptView === 'edit' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>The Editor</button>
                            </div>
                        </div>

                        <NarrativeToolbar narrative={props.activeStory?.narrative || ''} onNarrativeChange={props.onNarrativeChange} showToast={props.showToast} narrationAudio={props.narrationAudio} onGenerateNarration={props.onGenerateNarration} />

                        <div className="mt-10 min-h-[400px]">
                            {manuscriptView === 'intelligence' ? (
                                <div className="font-serif text-xl lg:text-2xl text-slate-700 dark:text-slate-200 leading-relaxed italic whitespace-pre-wrap px-4">{props.activeStory?.narrative}</div>
                            ) : (
                                <textarea
                                    value={props.activeStory?.narrative || ''}
                                    onChange={(e) => props.onNarrativeChange(e.target.value)}
                                    className="w-full glass-tier-2 bg-white/40 dark:bg-white/[0.03] rounded-[2.5rem] p-10 lg:p-14 font-serif text-xl lg:text-2xl text-slate-800 dark:text-slate-200 leading-relaxed italic min-h-[600px] outline-none border border-black/5 dark:border-white/10 focus:ring-4 focus:ring-gemynd-oxblood/5 shadow-inner"
                                />
                            )}
                        </div>
                        
                        <div className="mt-10"><MagicTouchPanel onRefine={props.onRefineNarrative} isProcessing={props.status.refiningNarrative} /></div>
                    </div>

                    {(props.activeStory?.storyboard || props.activeStory?.extraction?.storyboard) && (
                        <VisualStoryboard 
                            storyboard={props.activeStory.storyboard || props.activeStory.extraction?.storyboard!}
                            generatedImages={props.activeStory.generatedImages || []}
                            currentBeatIndex={selectedBeatIndex}
                            onBeatClick={setSelectedBeatIndex}
                            onImageUpdated={props.onImageUpdated}
                            onReorderBeats={props.onReorderBeats}
                        />
                    )}
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <div className="glass-tier-1 rounded-[3rem] p-8 space-y-10 sticky top-10 shadow-2xl border-white/5">
                        <div className="flex items-center gap-4 border-b border-black/5 dark:border-white/5 pb-6">
                            <BoltIcon className="w-5 h-5 text-gemynd-oxblood" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-white/40">Archive Matrix</h4>
                        </div>
                        {props.activeStory && (
                            <CreativeAssets 
                                activeStory={props.activeStory} status={props.status}
                                imageGenerationProgress={props.imageGenerationProgress} videoGenerationProgress={props.videoGenerationProgress}
                                onGenerateNarrative={() => {}} isGeneratingNarrative={false}
                                onGenerateImages={props.onGenerateImages} onOpenDirectorsCut={props.onOpenDirectorsCut}
                                generationStats={props.generationStats} totalCost={0}
                                onRetryImage={props.onRetryImage} onAnimateImage={props.onAnimateImage}
                                animatingImageIndex={null} credits={props.credits}
                                onOpenMusicFinder={props.onOpenMusicFinder}
                            />
                        )}
                    </div>
                    {props.activeStory?.extraction && <InspirationPanel extraction={props.activeStory.extraction} />}
                </div>
            </div>
        </div>
    );
};

export default NewStoryPanel;