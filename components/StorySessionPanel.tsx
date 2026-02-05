import React, { useState, useRef } from 'react';
import TrashIcon from './icons/TrashIcon';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';
import SparklesIcon from './icons/SparklesIcon';
import FilePdfIcon from './icons/FilePdfIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import { prepareArtifactForAi } from '../utils/fileUtils';

interface StagedNode {
    id: string;
    file: File;
    data: string;
    mimeType: string;
    extractedText?: string;
    status: 'syncing' | 'ready' | 'error';
}

interface StorySessionPanelProps {
    onAnalyze: (combinedText: string, name: string, style: string, cascade: boolean, artifacts: any[]) => void;
    isLoading: boolean;
    onClearSession: () => void;
    onOpenConnie: () => void;
    contextualNotes: string;
    onContextualNotesChange: (notes: string) => void;
    storytellerName: string;
}

const StorySessionPanel: React.FC<StorySessionPanelProps> = ({
    onAnalyze, isLoading, onClearSession, onOpenConnie,
    contextualNotes, onContextualNotesChange, storytellerName
}) => {
    const [stagedNodes, setStagedNodes] = useState<StagedNode[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList) => {
        const newNodes: StagedNode[] = [];
        for (const file of Array.from(files)) {
            const node: StagedNode = {
                id: Math.random().toString(36).substr(2, 9),
                file,
                data: '',
                mimeType: file.type,
                status: 'syncing'
            };
            setStagedNodes(prev => [...prev, node]);

            try {
                const artifact = await prepareArtifactForAi(file);
                setStagedNodes(prev => prev.map(n => n.id === node.id ? {
                    ...n,
                    data: artifact.data,
                    extractedText: artifact.extractedText,
                    status: 'ready'
                } : n));
            } catch (err) {
                setStagedNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'error' } : n));
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    };

    const isReady = storytellerName.trim().length > 0 && (contextualNotes.trim().length > 0 || stagedNodes.length > 0);

    return (
        <div className="flex flex-col h-full p-6 lg:p-10 bg-black/5 dark:bg-white/[0.02]">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-gemynd-gold shadow-[0_0_15px_#EAB308]"></span>
                        The Neural Stage
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-[0.4em] mt-1 ml-6">Harmonizing Memories</p>
                </div>
                <div className="flex gap-3">
                     <button onClick={onOpenConnie} className="p-4 bg-white/20 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white active:bg-gemynd-gold/20 active:border-gemynd-gold/40 transition-all shadow-sm">
                        <MicrophoneIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => { setStagedNodes([]); onClearSession(); }} className="p-4 bg-white/20 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl text-slate-400 active:bg-red-500/20 active:text-red-500 transition-all shadow-sm">
                        <TrashIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="flex-1 space-y-10">
                {/* Mobile-Friendly Upload Zone */}
                <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative min-h-[200px] rounded-[2.5rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 gap-4 group cursor-pointer ${
                        isDragging ? 'border-gemynd-gold bg-gemynd-gold/10 scale-[1.02]' : 'border-black/10 dark:border-white/10 bg-white/10 dark:bg-white/[0.03] hover:border-black/30 dark:hover:border-white/30 hover:bg-white/20 dark:hover:bg-white/[0.05]'
                    }`}
                >
                    <div className="w-14 h-14 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 dark:text-white/30 group-hover:text-gemynd-gold transition-colors shadow-inner">
                        <DocumentArrowUpIcon className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Upload Historical Artifacts</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mt-2">Tap to browse files or camera</p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                </div>

                {/* Staged Artifact Nodes */}
                {stagedNodes.length > 0 && (
                    <div className="animate-appear">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.4em] mb-4 ml-2">Context Nodes ({stagedNodes.length})</h4>
                        <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
                            {stagedNodes.map(node => (
                                <div key={node.id} className="w-32 flex-shrink-0 bg-white/50 dark:bg-white/[0.04] p-4 rounded-3xl border border-black/5 dark:border-white/10 relative shadow-lg">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setStagedNodes(prev => prev.filter(n => n.id !== node.id)); }}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white dark:border-black"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="aspect-square rounded-2xl bg-black/10 dark:bg-black/40 flex items-center justify-center mb-3 overflow-hidden border border-black/5 dark:border-white/5 relative">
                                        {node.status === 'syncing' ? (
                                            <div className="w-6 h-6 border-2 border-gemynd-gold border-t-transparent rounded-full animate-spin"></div>
                                        ) : node.mimeType.startsWith('image/') ? (
                                            <img src={`data:${node.mimeType};base64,${node.data}`} className="w-full h-full object-cover opacity-80" alt="Node" />
                                        ) : (
                                            <FilePdfIcon className="w-10 h-10 text-gemynd-gold/60" />
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-500 dark:text-white/50 truncate font-mono text-center tracking-tight">{node.file.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Narrative Input */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.4em] px-2">Narrative Core</h4>
                    <textarea
                        value={contextualNotes}
                        onChange={(e) => onContextualNotesChange(e.target.value)}
                        placeholder="Paste transcripts or ancestral memories here..."
                        className="w-full min-h-[220px] lg:min-h-[350px] bg-white/40 dark:bg-white/[0.02] rounded-[2.5rem] p-8 lg:p-12 text-slate-900 dark:text-white font-serif italic text-xl lg:text-3xl focus:ring-2 focus:ring-gemynd-gold/20 outline-none border border-black/5 dark:border-white/5 transition-all shadow-inner leading-relaxed placeholder:text-slate-300 dark:placeholder:text-white/5"
                    />
                </div>
            </div>

            <button
                onClick={() => onAnalyze(contextualNotes, storytellerName, "Eloquent (Biographical)", true, stagedNodes)}
                disabled={isLoading || !isReady}
                className={`w-full mt-10 py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] transition-all duration-700 flex items-center justify-center gap-5 group relative border-2 ${
                    isLoading ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : 
                    !isReady ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' :
                    'bg-gemynd-red text-white border-gemynd-red shadow-[0_20px_60px_rgba(168,45,45,0.4)] active:scale-95 hover:shadow-red-500/20'
                }`}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                    <SparklesIcon className="w-6 h-6 group-hover:rotate-12 transition-transform duration-500" />
                )}
                <span>{isLoading ? 'Synthesizing...' : 'Initialize Legacy Weave'}</span>
            </button>
        </div>
    );
};

export default StorySessionPanel;