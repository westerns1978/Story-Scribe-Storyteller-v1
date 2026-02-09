import React, { useState, useEffect } from 'react';
import StorySessionPanel from './StorySessionPanel';
import { ActiveStory, QueueItem, StatusTracker, ProviderStat } from '../types';
import BookOpenIcon from './icons/BookOpenIcon';
import NarrativeToolbar from './NarrativeToolbar';
import VisualStoryboard from './VisualStoryboard';
import BoltIcon from './icons/BoltIcon';
import ExtractionOptionsPanel from './ExtractionOptionsPanel';
import MagicTouchPanel from './MagicTouchPanel';
import InspirationPanel from './InspirationPanel';
import CreativeAssets from './CreativeAssets';
import TimelineVisualizer from './TimelineVisualizer';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';

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
    onReorderBeats?: (oldIndex: number, newIndex: number) => void;
}

const NewStoryPanel: React.FC<NewStoryPanelProps> = (props) => {
    const [storytellerName, setStorytellerName] = useState(props.prefilledData?.name || '');
    const [visualStyle, setVisualStyle] = useState('Cinematic (Non-Linear)');
    const [extractionTier, setExtractionTier] = useState<'basic' | 'standard' | 'premium'>('standard');
    const [contextualNotes, setContextualNotes] = useState(props.prefilledData?.notes || '');
    const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
    const [manuscriptView, setManuscriptView] = useState<'edit' | 'intelligence'>('intelligence');

    const handleMagicWeave = (notes: string, name: string, narrStyle: string, cascade: boolean, artifacts: any[]) => {
        // Map Tier to narrative depth
        const tierStyles: Record<string, string> = {
            basic: 'Concise Summary',
            standard: 'Eloquent (Biographical)',
            premium: 'Cinematic (Non-Linear)'
        };
        props.onAnalyze(notes, name, tierStyles[extractionTier], cascade, artifacts, visualStyle);
    };

    if (!props.activeStory) {
        return (
            <div className="w-full max-w-6xl mx-auto space-y-12 animate-appear">
                <div className="text-center space-y-4">
                    <h2 className="text-5xl lg:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Legacy Weave</h2>
                    <p className="text-lg lg:text-xl text-slate-500 dark:text-white/40 font-serif italic">Select your depth of preservation.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    <div className="lg:col-span-4 glass-tier-1 p-10 rounded-[3.5rem] flex flex-col gap-10">
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-2">Legacy Subject</label>
                                <input
                                    type="text"
                                    placeholder="Enter Name"
                                    value={storytellerName}
                                    onChange={(e) => setStorytellerName(e.target.value)}
                                    className="w-full glass-tier-2 bg-black/5 dark:bg-white/5 rounded-2xl px-6 py-4 text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-gemynd-oxblood/20 outline-none border border-black/10 dark:border-white/10 font-serif italic"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-2">Extraction Intensity</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'basic', label: 'Essential', desc: 'Summary + 5 Visuals' },
                                        { id: 'standard', label: 'Legacy', desc: 'Narrative + 10 Visuals + Map' },
                                        { id: 'premium', label: 'Cinematic', desc: 'Full Production + Video' }
                                    ].map(tier => (
                                        <button 
                                            key={tier.id}
                                            onClick={() => setExtractionTier(tier.id as any)}
                                            className={`p-4 rounded-2xl border text-left transition-all group ${extractionTier === tier.id ? 'bg-gemynd-oxblood border-gemynd-oxblood shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                        >
                                            <p className={`text-[11px] font-black uppercase tracking-widest ${extractionTier === tier.id ? 'text-white' : 'text-slate-900 dark:text-white/60'}`}>{tier.label}</p>
                                            <p className={`text-[10px] font-medium ${extractionTier === tier.id ? 'text-white/60' : 'text-slate-400 dark:text-white/20'}`}>{tier.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <ExtractionOptionsPanel 
                                style="Eloquent (Biographical)" 
                                onStyleChange={() => {}} 
                                visualStyle={visualStyle}
                                onVisualStyleChange={setVisualStyle}
                                useMagicCascade={true} 
                                onUseMagicCascadeChange={() => {}} 
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-8 glass-tier-1 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col">
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
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">Active Production Node</p>
                    </div>
                </div>
                <button onClick={props.onFinalizeAndReveal} className="w-full md:w-auto px-10 py-5 bg-gemynd-oxblood text-white font-black rounded-2xl shadow-2xl haptic-tap transition-all text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                    <BookOpenIcon className="w-5 h-5" /> Materialize Legacy
                </button>
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
                <div className="lg:col-span-8 space-y-12">
                    <div className="glass-tier-1 rounded-[4rem] p-8 lg:p-16 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gemynd-oxblood/40 to-transparent" />
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                            <div>
                                <h3 className="text-3xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter">The Manuscript</h3>
                                <p className="text-slate-400 dark:text-white/10 text-[10px] font-bold uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                                    <SparklesIcon className="w-3 h-3 text-gemynd-agedGold" /> Synthesis Complete
                                </p>
                            </div>
                            <div className="flex glass-tier-2 p-1.5 rounded-2xl border border-black/5 dark:border-white/10">
                                <button onClick={() => setManuscriptView('intelligence')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${manuscriptView === 'intelligence' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Intelligence</button>
                                <button onClick={() => setManuscriptView('edit')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${manuscriptView === 'edit' ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>The Editor</button>
                            </div>
                        </div>

                        <NarrativeToolbar narrative={props.activeStory?.narrative || ''} onNarrativeChange={props.onNarrativeChange} showToast={props.showToast} narrationAudio={props.narrationAudio} onGenerateNarration={props.onGenerateNarration} />

                        <div className="mt-12 min-h-[400px]">
                            {manuscriptView === 'intelligence' ? (
                                <div className="font-serif text-2xl lg:text-4xl text-slate-700 dark:text-slate-200 leading-relaxed italic whitespace-pre-wrap px-4">{props.activeStory?.narrative}</div>
                            ) : (
                                <textarea
                                    value={props.activeStory?.narrative || ''}
                                    onChange={(e) => props.onNarrativeChange(e.target.value)}
                                    className="w-full glass-tier-2 bg-white/40 dark:bg-white/[0.03] rounded-[3rem] p-12 lg:p-20 font-serif text-2xl lg:text-3xl text-slate-800 dark:text-slate-200 leading-relaxed italic min-h-[800px] outline-none border border-black/5 dark:border-white/10 focus:ring-4 focus:ring-gemynd-oxblood/5 shadow-inner"
                                />
                            )}
                        </div>
                        
                        <div className="mt-12"><MagicTouchPanel onRefine={props.onRefineNarrative} isProcessing={props.status.refiningNarrative} /></div>
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

                <div className="lg:col-span-4 space-y-12">
                    <div className="glass-tier-1 rounded-[4rem] p-10 space-y-10 sticky top-10 shadow-2xl border-white/5">
                        <div className="flex items-center gap-4 border-b border-black/5 dark:border-white/5 pb-6">
                            <BoltIcon className="w-6 h-6 text-gemynd-oxblood" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-white/40">Archive Matrix</h4>
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