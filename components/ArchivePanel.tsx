import React, { useState, useMemo } from 'react';
import { StoryArchiveItem } from '../types';
import BookOpenIcon from './icons/BookOpenIcon';
import TrashIcon from './icons/TrashIcon';
import MagnifyingGlassIcon from './icons/MagnifyingGlassIcon';
import SparklesIcon from './icons/SparklesIcon';
import GalaxyIcon from './icons/GalaxyIcon';
import ConnectionFinderModal from './ConnectionFinderModal';
import { LegacyGraph } from './LegacyGraph';

interface ArchivePanelProps {
    stories: StoryArchiveItem[];
    isLoading: boolean;
    onViewStorybook: (story: StoryArchiveItem) => void;
    onDelete: (storyId: string) => void;
    onExportGedcom: (story: StoryArchiveItem) => void;
    onFindConnections: () => void;
    onSuggestTopics: (story: StoryArchiveItem) => void;
}

const ArchivePanel: React.FC<ArchivePanelProps> = ({
    stories,
    isLoading,
    onViewStorybook,
    onDelete,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
    const [isGraphOpen, setIsGraphOpen] = useState(false);

    const filteredStories = useMemo(() => {
        if (!Array.isArray(stories)) return [];
        return stories.filter(s => 
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.storytellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.extraction?.themes.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [stories, searchTerm]);

    if (isLoading) return <div className="p-20 text-center animate-pulse text-gemynd-terracotta font-serif">Syncing with Wissums Vault...</div>;

    return (
        <div className="h-full flex flex-col space-y-6 lg:space-y-10">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-1">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-display font-bold text-gemynd-ink dark:text-white mb-2">The Legacy Vault</h2>
                    <p className="text-gemynd-terracotta font-serif italic text-sm lg:text-base">Every memory secured across the Lexington nodes.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <button 
                        onClick={() => setIsGraphOpen(true)}
                        className="px-6 py-3 bg-gemynd-mahogany dark:bg-white/5 border border-white/10 text-white font-bold rounded-2xl shadow-lg hover:bg-gemynd-oxblood transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                    >
                        <GalaxyIcon className="w-4 h-4 text-gemynd-agedGold" /> Family Constellation
                    </button>
                    <div className="relative flex-1 lg:w-80">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gemynd-terracotta/40" />
                        <input
                            type="text"
                            placeholder="Search names or themes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-gemynd-ink/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-gemynd-terracotta outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredStories.map(story => (
                    <div key={story.id} className="bg-white dark:bg-white/5 border border-gemynd-ink/5 rounded-[2.5rem] p-6 lg:p-8 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col justify-between hover:-translate-y-1">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-gemynd-linen dark:bg-white/5 rounded-2xl flex items-center justify-center text-gemynd-terracotta border border-gemynd-ink/5 group-hover:bg-gemynd-oxblood group-hover:text-white transition-colors">
                                    <BookOpenIcon className="w-7 h-7" />
                                </div>
                                <button onClick={() => onDelete(story.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                            <h3 className="text-2xl font-display font-bold text-gemynd-ink dark:text-white mb-1 leading-tight">{story.name}</h3>
                            <p className="text-sm text-gemynd-terracotta font-serif italic mb-6">{story.storytellerName}</p>
                            <div className="flex flex-wrap gap-2">
                                {story.extraction?.themes.slice(0, 3).map((t, i) => (
                                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-gemynd-linen dark:bg-white/5 border border-gemynd-ink/5 rounded-full text-gemynd-terracotta/60">{t}</span>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={() => onViewStorybook(story)}
                            className="mt-10 w-full py-5 bg-gemynd-linen dark:bg-white/5 border border-gemynd-ink/5 text-gemynd-ink dark:text-white font-bold rounded-2xl hover:bg-gemynd-oxblood hover:text-white transition-all text-[11px] uppercase tracking-widest shadow-sm"
                        >
                            Open Record
                        </button>
                    </div>
                ))}
            </main>

            <ConnectionFinderModal isOpen={isConnectionsOpen} onClose={() => setIsConnectionsOpen(false)} stories={stories} />
            <LegacyGraph isOpen={isGraphOpen} onClose={() => setIsGraphOpen(false)} stories={stories} onSelectStory={(s) => { onViewStorybook(s); setIsGraphOpen(false); }} />
        </div>
    );
};

export default ArchivePanel;