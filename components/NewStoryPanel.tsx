import React, { useState, useEffect } from 'react';
import StorySessionPanel from './StorySessionPanel';
import { ActiveStory, QueueItem, StatusTracker, ProviderStat } from '../types';
import BookOpenIcon from './icons/BookOpenIcon';
import NarrativeToolbar from './NarrativeToolbar';
import VisualStoryboard from './VisualStoryboard';
import BoltIcon from './icons/BoltIcon';
import ClockIcon from './icons/ClockIcon';
import MapPinIcon from './icons/MapPinIcon';
import ExtractionOptionsPanel from './ExtractionOptionsPanel';
import MagicTouchPanel from './MagicTouchPanel';
import InspirationPanel from './InspirationPanel';
import CreativeAssets from './CreativeAssets';
import TimelineVisualizer from './TimelineVisualizer';

interface NewStoryPanelProps {
    queue: QueueItem[];
    setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
    onAnalyze: (combinedText: string, storytellerName: string, style: string, useCascade: boolean, artifacts?: { data: string, mimeType: string }[], visualStyle?: string) => void;
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
}

const NewStoryPanel: React.FC<NewStoryPanelProps> = (props) => {
    const [storytellerName, setStorytellerName] = useState(props.prefilledData?.name || '');
    const [storyStyle, setStoryStyle] = useState('Eloquent (Biographical)');
    const [visualStyle, setVisualStyle] = useState('Cinematic (Non-Linear)');
    const [useMagicCascade, setUseMagicCascade] = useState(true);
    const [contextualNotes, setContextualNotes] = useState(props.prefilledData?.notes || '');
    const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
    const [manuscriptView, setManuscriptView] = useState<'edit' | 'intelligence'>('intelligence');

    useEffect(() => {
        if (props.prefilledData) {
            setStorytellerName(props.prefilledData.name);
            setContextualNotes(props.prefilledData.notes);
        }
    }, [props.prefilledData]);

    const handleMagicWeave = (notes: string, name: string, narrStyle: string, cascade: boolean, artifacts: any[]) => {
        props.onAnalyze(notes, name, narrStyle, cascade, artifacts, visualStyle);
    };

    if (!props.activeStory) {
        return (
            <div className="w-full max-w-5xl mx-auto space-y-10 lg:space-y-16 animate-appear">
                <div className="text-center space-y-3">
                    <h2 className="text-4xl lg:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase">Legacy Production</h2>
                    <p className="text-base lg:text-xl text-slate-500 dark:text-white/40 font-serif italic">Initialize neural synthesis protocol.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    <div className="lg:col-span-5 glass-tier-1 p-8 lg:p-10 rounded-[3rem] flex flex-col order-2 lg:order-1">
                        <h3 className="text-lg font-display font-black text-slate-900 dark:text-white flex items-center gap-4 mb-8 uppercase tracking-widest">
                            <span className="w-8 h-8 rounded-xl bg-gemynd-oxblood text-white flex items-center justify-center text-[10px] font-black shadow-lg">01</span>
                            Protocol Settings
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-2">Legacy Subject</label>
                                <input
                                    type="text"
                                    placeholder="Enter Name"
                                    value={storytellerName}
                                    onChange={(e) => setStorytellerName(e.target.value)}
                                    className="w-full glass-tier-2 bg-black/5 dark:bg-white/5 rounded-2xl px-6 py-4 text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-gemynd-oxblood/20 outline-none border border-black/10 dark:border-white/10"
                                />
                            </div>
                            <ExtractionOptionsPanel 
                                style={storyStyle} 
                                onStyleChange={setStoryStyle} 
                                visualStyle={visualStyle}
                                onVisualStyleChange={setVisualStyle}
                                useMagicCascade={useMagicCascade} 
                                onUseMagicCascadeChange={setUseMagicCascade} 
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-7 glass-tier-1 rounded-[3rem] overflow-hidden order-1 lg:order-2 shadow-2xl min-h-[450px]">
                        <StorySessionPanel 
                            onAnalyze={handleMagicWeave}
                            isLoading={props.status.extracting}
                            onClearSession={props.onClearSession}
                            onOpenConnie={props.onOpenConnie}
                            contextualNotes={contextualNotes}
                            onContextualNotesChange={setContextualNotes}
                            storytellerName={storytellerName}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-12 animate-appear">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
                <div className="text-left w-full md:w-auto">
                    <h2 className="text-3xl lg:text-6xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-1">{props.activeStory?.storytellerName}</h2>
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">Active Production Node</p>
                    </div>
                </div>
                <button onClick={props.onFinalizeAndReveal} className="w-full md:w-auto px-8 py-4 bg-gemynd-oxblood text-white font-black rounded-2xl shadow-2xl haptic-tap transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                    <BookOpenIcon className="w-5 h-5" /> Reveal Legacy
                </button>
            </header>

            {/* Enhanced Chronology View */}
            {props.activeStory?.extraction?.timeline && props.activeStory.extraction.timeline.length > 0 && (
                <section className="animate-appear">
                    <TimelineVisualizer 
                        timeline={props.activeStory.extraction.timeline} 
                        images={props.activeStory.generatedImages || []} 
                    />
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="lg:col-span-8 space-y-12">
                    <div className="glass-tier-1 rounded-[3.5rem] p-6 lg:p-12 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                            <div>
                                <h3 className="text-2xl lg:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight">Manuscript</h3>
                                <p className="text-slate-400 dark:text-white/10 text-[9px] font-bold uppercase tracking-widest mt-1">Status: SYNTHESIZED</p>
                            </div>
                            <div className="flex glass-tier-2 p-1 rounded-xl w-full md:w-auto border border-black/5 dark:border-white/10">
                                <button onClick={() => setManuscriptView('intelligence')} className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manuscriptView === 'intelligence' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Intelligence</button>
                                <button onClick={() => setManuscriptView('edit')} className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manuscriptView === 'edit' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Editor</button>
                            </div>
                        </div>

                        <NarrativeToolbar narrative={props.activeStory?.narrative || ''} onNarrativeChange={props.onNarrativeChange} showToast={props.showToast} narrationAudio={props.narrationAudio} onGenerateNarration={props.onGenerateNarration} />

                        <div className="mt-10 min-h-[300px]">
                            {manuscriptView === 'intelligence' ? (
                                <div className="font-serif text-lg lg:text-3xl text-slate-700 dark:text-slate-200 leading-relaxed italic whitespace-pre-wrap px-2">{props.activeStory?.narrative}</div>
                            ) : (
                                <textarea
                                    value={props.activeStory?.narrative || ''}
                                    onChange={(e) => props.onNarrativeChange(e.target.value)}
                                    className="w-full glass-tier-2 bg-white/40 dark:bg-white/5 rounded-[2.5rem] p-10 font-serif text-lg lg:text-2xl text-slate-800 dark:text-slate-200 leading-relaxed italic min-h-[600px] outline-none border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-gemynd-oxblood/10"
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
                        />
                    )}
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <div className="glass-tier-1 rounded-[3.5rem] p-8 space-y-8 sticky top-10 shadow-2xl">
                        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-5">
                            <BoltIcon className="w-5 h-5 text-gemynd-oxblood" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Neural Asset Forge</h4>
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