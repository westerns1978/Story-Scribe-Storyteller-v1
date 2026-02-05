import React, { useState, useEffect } from 'react';
import { MusicTrack } from '../types';
import { findMusicFromSuggestion } from '../services/musicService';
import XMarkIcon from './icons/XMarkIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';

interface MusicFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    storyThemes: string[];
    onSelectTrack: (url: string) => void;
}

const MusicFinderModal: React.FC<MusicFinderModalProps> = ({ isOpen, onClose, storyThemes, onSelectTrack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            const initialSearchTerm = storyThemes.join(', ');
            setSearchTerm(initialSearchTerm);
            if (initialSearchTerm) {
              handleSearch(initialSearchTerm);
            }
        } else {
            // Reset state on close
            setTracks([]);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen, storyThemes.join(',')]); // Use join to create a stable dependency

    const handleSearch = async (query: string) => {
        if (!query) return;
        setIsLoading(true);
        setError(null);
        setTracks([]);
        try {
            const results = await findMusicFromSuggestion(query);
            setTracks(results);
            if (results.length === 0) {
                setError("No tracks found for your search. Try different keywords.");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to find music.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MusicNoteIcon /> Find Background Music
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="flex gap-2">
                         <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="e.g., cinematic, hopeful, piano"
                            className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-lg px-3 py-2"
                        />
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                            {isLoading ? '...' : 'Search'}
                        </button>
                    </form>
                </div>
                <main className="flex-1 overflow-y-auto p-4">
                    {isLoading && (
                        <div className="text-center p-8 text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center h-full">
                           <svg className="animate-spin h-8 w-8 text-brand-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p>Searching for music...</p>
                        </div>
                    )}
                    {error && !isLoading && (
                         <div className="text-center p-8 text-amber-600 dark:text-amber-500 bg-amber-500/10 rounded-lg h-full flex flex-col items-center justify-center">
                            <h4 className="font-semibold mb-2">Search Failed</h4>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                     {!isLoading && !error && tracks.length === 0 && (
                         <div className="text-center p-8 text-slate-500 dark:text-slate-400 h-full flex flex-col items-center justify-center">
                            <MusicNoteIcon className="w-12 h-12 text-slate-500 mb-4"/>
                            <h4 className="font-semibold">Ready to find music</h4>
                            <p className="text-sm max-w-sm">Use the search bar above to find background music based on themes from the story.</p>
                         </div>
                    )}
                    {tracks.length > 0 && (
                        <div className="space-y-3">
                            {tracks.map(track => (
                                <div key={track.id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                                   <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{track.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">by {track.artist}  ·  {formatDuration(track.duration)}</p>
                                        </div>
                                        <button onClick={() => onSelectTrack(track.url)} className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md">Select</button>
                                   </div>
                                    <audio src={track.url} controls className="w-full h-8" />
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MusicFinderModal;