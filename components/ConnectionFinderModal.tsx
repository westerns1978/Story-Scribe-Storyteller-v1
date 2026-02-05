
import React, { useState, useEffect } from 'react';
import { StoryArchiveItem } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import LinkIcon from './icons/LinkIcon';
import { findSemanticConnections } from '../services/api';

interface ConnectionFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    stories: StoryArchiveItem[];
}

interface Connection {
    entity: string;
    stories: string[];
    type: string;
    reasoning?: string;
}

const ConnectionFinderModal: React.FC<ConnectionFinderModalProps> = ({ isOpen, onClose, stories }) => {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && stories.length >= 2) {
            setIsLoading(true);
            findSemanticConnections(stories)
                .then(conns => setConnections(conns))
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, stories]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LinkIcon className="w-6 h-6" />Semantic Connection Finder
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p className="text-slate-500">Analyzing story themes with AI...</p>
                        </div>
                    ) : connections.length > 0 ? (
                        <div className="space-y-4">
                            {connections.map((conn, index) => (
                                <div key={index} className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-bold text-lg text-brand-600 dark:text-brand-400 capitalize">{conn.entity}</h3>
                                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{conn.type}</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 italic">"{conn.reasoning}"</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {conn.stories.map((storyName, i) => (
                                            <span key={i} className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300">{storyName}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center text-slate-500 dark:text-slate-400 h-full flex flex-col justify-center items-center">
                            <h3 className="text-lg font-semibold">No Deep Connections Found</h3>
                            <p className="mt-1 text-sm">No strong thematic overlaps found between these stories yet.</p>
                         </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ConnectionFinderModal;
